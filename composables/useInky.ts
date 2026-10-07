/**
 * useInky
 *
 * Composable powering the Inky tool: hides sensitive areas of an image
 * or PDF behind solid boxes, stamps a repeated text watermark across
 * the whole page, so a copy shared for one purpose is useless for any
 * other, and writes whatever metadata the user typed into the result.
 *
 * Everything is flattened to pixels. For images that comes free with
 * the canvas re-encode, which also drops the original EXIF. For PDFs
 * every page is rendered with pdf.js and re-embedded as a JPEG with
 * pdf-lib. That is the point: a black rectangle drawn over a PDF's
 * vector content leaves the text underneath selectable and extractable,
 * so a redaction is only real once the page is an image. It also keeps
 * the watermark from being deleted as a separate object.
 *
 * Boxes are stored in page-relative units (0..1) and the watermark is
 * sized in the source's own units (PDF points or image pixels), which
 * callers convert with a pixels-per-unit factor, so the preview and the
 * full-resolution export compose identically at any scale.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib'
import piexif from 'piexifjs'

/** A hidden area, in page-relative units (0..1 of width and height). */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Watermark configuration; an empty `text` means no watermark. */
export interface InkyWatermark {
  text: string
  color: string
  /** Font size in the source's units: PDF points or image pixels. */
  size: number
  /** Opacity in `[0..1]`. */
  opacity: number
  /** Rotation in degrees; negative tilts the lines up to the right. */
  rotation: number
  /** Distance between rows, as a multiple of the font size. */
  lineSpacing: number
  /** Gap between repetitions along a row, as a multiple of the font size. */
  gap: number
}

/** The named metadata fields offered for every output format. */
export type MetaField = 'title' | 'author' | 'subject' | 'keywords' | 'creator'

export const META_FIELDS: MetaField[] = ['title', 'author', 'subject', 'keywords', 'creator']

/** Metadata written into the export; blank fields are skipped. */
export interface InkyMetadata extends Record<MetaField, string> {
  custom: { key: string; value: string }[]
}

/** A rasterized PDF page plus its size in PDF points. */
export interface RenderedPage {
  canvas: HTMLCanvasElement
  widthPt: number
  heightPt: number
}

/** Long side of each exported PDF page, in pixels (about 170 DPI on A4). */
const EXPORT_LONG_SIDE = 2000

/** Long side of the on-screen preview, in pixels. */
export const PREVIEW_LONG_SIDE = 1600

/** iOS Safari refuses to draw into canvases above 16,777,216 pixels. */
const MAX_CANVAS_PIXELS = 16_000_000

/** Where nuxt.config.ts serves pdf.js's cmaps, fonts, wasm and ICC files. */
const PDFJS_ASSETS = '/pdfjs/'

/** Info dictionary keys for the named fields. */
const PDF_KEYS: Record<MetaField, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
  creator: 'Creator',
}

/** PNG text keywords for the named fields (the spec's, plus Keywords). */
const PNG_KEYS: Record<MetaField, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Description',
  keywords: 'Keywords',
  creator: 'Software',
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

/** pdf.js is ~500 KB gzipped, so it's only fetched once a PDF is opened. */
const loadPdfjs = () =>
  (pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
    .then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
    .catch((err) => {
      pdfjsPromise = null
      throw err
    }))

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ENCODE_FAILED'))),
      type,
      quality,
    ),
  )

const drawBoxes = (ctx: CanvasRenderingContext2D, w: number, h: number, boxes: Box[]) => {
  ctx.fillStyle = '#000'
  for (const b of boxes) {
    // Round outward so anti-aliased edges never leave a sliver of
    // whatever is underneath.
    const x0 = Math.floor(b.x * w)
    const y0 = Math.floor(b.y * h)
    const x1 = Math.ceil((b.x + b.w) * w)
    const y1 = Math.ceil((b.y + b.h) * h)
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }
}

const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  wm: InkyWatermark,
  unitPx: number,
) => {
  const text = wm.text.trim()
  if (!text) return

  // The floor keeps a tiny size on a huge page from issuing millions of
  // fillText calls.
  const fontPx = Math.max(4, wm.size * unitPx)
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, wm.opacity))
  ctx.fillStyle = wm.color
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  ctx.textBaseline = 'middle'
  const stepX = ctx.measureText(text).width + Math.max(0, wm.gap) * fontPx
  const stepY = Math.max(1, wm.lineSpacing) * fontPx

  // Rotate the grid around the page center and tile a square as wide as
  // the page diagonal, so every corner is covered at any angle.
  const half = Math.hypot(w, h) / 2
  ctx.translate(w / 2, h / 2)
  ctx.rotate((wm.rotation * Math.PI) / 180)
  for (let y = -half, row = 0; y < half + stepY; y += stepY, row++) {
    // Staggered rows don't line up into clean columns that are easy to
    // mask out and inpaint.
    const offset = row % 2 ? stepX / 2 : 0
    for (let x = -half - offset; x < half; x += stepX) ctx.fillText(text, x, y)
  }
  ctx.restore()
}

/**
 * Draw the boxes and then the watermark onto an already painted canvas.
 * `unitPx` is how many canvas pixels one watermark size unit spans.
 */
const stamp = (canvas: HTMLCanvasElement, boxes: Box[], wm: InkyWatermark, unitPx: number) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('NO_CONTEXT')
  drawBoxes(ctx, canvas.width, canvas.height, boxes)
  drawWatermark(ctx, canvas.width, canvas.height, wm, unitPx)
}

/** Copy `source` into a new canvas whose long side is at most `longSide`. */
const scaledCopy = (source: ImageBitmap, longSide: number): HTMLCanvasElement => {
  const scale = Math.min(1, longSide / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('NO_CONTEXT')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * PDF names and PNG keywords can't hold arbitrary Unicode (PNG also caps
 * keywords at 79), so keys become plain ASCII: accents are stripped
 * ("Título" → "Titulo") and other scripts dropped.
 */
const cleanKey = (key: string) =>
  key.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim().slice(0, 79)

/** Custom fields with a usable key and a non-blank value. */
const customEntries = (meta: InkyMetadata): [string, string][] =>
  meta.custom
    .map(({ key, value }): [string, string] => [cleanKey(key), value.trim()])
    .filter(([k, v]) => k && v)

/** Non-blank named fields under `names`, then the custom ones, in order. */
const metaEntries = (meta: InkyMetadata, names: Record<MetaField, string>): [string, string][] => [
  ...META_FIELDS.map((f): [string, string] => [names[f], meta[f].trim()]).filter(([, v]) => v),
  ...customEntries(meta),
]

const writePdfMetadata = (doc: PDFDocument, meta: InkyMetadata) => {
  const entries = metaEntries(meta, PDF_KEYS)
  if (!entries.length) return
  const info = doc.context.obj({})
  for (const [k, v] of entries) info.set(PDFName.of(k), PDFHexString.fromText(v))
  doc.context.trailerInfo.Info = doc.context.register(info)
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** An iTXt chunk: Latin-1 keyword, uncompressed UTF-8 text, no language. */
const pngTextChunk = (key: string, value: string): Uint8Array => {
  const text = new TextEncoder().encode(value)
  const body = new Uint8Array(4 + key.length + 5 + text.length)
  body.set([0x69, 0x54, 0x58, 0x74]) // "iTXt"
  body.set(Uint8Array.from(key, (c) => c.charCodeAt(0)), 4)
  // After the keyword: its null separator, compression flag and method,
  // and the empty language tag and translated keyword, each null-ended.
  body.set(text, 4 + key.length + 5)
  const chunk = new Uint8Array(body.length + 8)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, body.length - 4)
  chunk.set(body, 4)
  view.setUint32(chunk.length - 4, crc32(body))
  return chunk
}

const writePngMetadata = (blob: Blob, meta: InkyMetadata): Blob => {
  const entries = metaEntries(meta, PNG_KEYS)
  if (!entries.length) return blob
  // The 8-byte signature plus the 25-byte IHDR chunk, which must stay first.
  const afterIhdr = 33
  return new Blob(
    [
      blob.slice(0, afterIhdr),
      ...entries.map(([k, v]) => pngTextChunk(k, v) as BlobPart),
      blob.slice(afterIhdr),
    ],
    { type: 'image/png' },
  )
}

/** EXIF ASCII tags carry bytes; UTF-8 is what readers decode them as. */
const utf8Binary = (s: string) => Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join('')

/** Windows XP* tags are null-terminated UCS-2 little-endian byte arrays. */
const ucs2Bytes = (s: string) => {
  const out: number[] = []
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff, s.charCodeAt(i) >> 8)
  return [...out, 0, 0]
}

const writeJpegMetadata = async (blob: Blob, meta: InkyMetadata): Promise<Blob> => {
  const [title, author, subject, keywords, creator] = META_FIELDS.map((f) => meta[f].trim())
  const custom = customEntries(meta)
  const tags: Record<number, string | number[]> = {}
  const I = piexif.ImageIFD
  if (title || subject) tags[I.ImageDescription] = utf8Binary(title || subject)
  if (title) tags[I.XPTitle] = ucs2Bytes(title)
  if (author) {
    tags[I.Artist] = utf8Binary(author)
    tags[I.XPAuthor] = ucs2Bytes(author)
  }
  if (subject) tags[I.XPSubject] = ucs2Bytes(subject)
  if (keywords) tags[I.XPKeywords] = ucs2Bytes(keywords)
  if (creator) tags[I.Software] = utf8Binary(creator)
  // EXIF has no free-form fields, so custom pairs go in the comment.
  if (custom.length) tags[I.XPComment] = ucs2Bytes(custom.map(([k, v]) => `${k}: ${v}`).join('\n'))
  if (!Object.keys(tags).length) return blob

  const exif = piexif.dump({ '0th': tags } as unknown as Parameters<typeof piexif.dump>[0])
  const jpeg = Array.from(new Uint8Array(await blob.arrayBuffer()), (b) => String.fromCharCode(b)).join('')
  const out = piexif.insert(exif, jpeg)
  return new Blob([Uint8Array.from(out, (c) => c.charCodeAt(0))], { type: 'image/jpeg' })
}

export const useInky = () => {
  /** Decode an image file. Throws if the browser can't decode it. */
  const loadImage = async (file: File): Promise<ImageBitmap> => await createImageBitmap(file)

  /**
   * Open a PDF with pdf.js. `data` is transferred to the worker, so the
   * caller's buffer is detached afterwards. Throws `PASSWORD` for
   * password-protected files and `INVALID_PDF` for anything unreadable.
   */
  const openPdf = async (data: ArrayBuffer): Promise<PDFDocumentProxy> => {
    const pdfjs = await loadPdfjs()
    try {
      return await pdfjs.getDocument({
        data: new Uint8Array(data),
        cMapUrl: `${PDFJS_ASSETS}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${PDFJS_ASSETS}standard_fonts/`,
        wasmUrl: `${PDFJS_ASSETS}wasm/`,
        iccUrl: `${PDFJS_ASSETS}iccs/`,
        isEvalSupported: false,
      }).promise
    } catch (err) {
      throw new Error((err as Error).name === 'PasswordException' ? 'PASSWORD' : 'INVALID_PDF')
    }
  }

  /** Rasterize page `pageNumber` (1-based) so its long side is `longSide` px. */
  const renderPdfPage = async (
    pdf: PDFDocumentProxy,
    pageNumber: number,
    longSide: number,
  ): Promise<RenderedPage> => {
    const page = await pdf.getPage(pageNumber)
    const natural = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({
      scale: longSide / Math.max(natural.width, natural.height),
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    page.cleanup()
    return { canvas, widthPt: natural.width, heightPt: natural.height }
  }

  /** Downscaled copy of an image for the live preview. */
  const imagePreview = (bitmap: ImageBitmap): HTMLCanvasElement =>
    scaledCopy(bitmap, PREVIEW_LONG_SIDE)

  /** Paint `base` into `target`, then the boxes and the watermark on top. */
  const compose = (
    target: HTMLCanvasElement,
    base: HTMLCanvasElement,
    boxes: Box[],
    wm: InkyWatermark,
    unitPx: number,
  ): void => {
    target.width = base.width
    target.height = base.height
    const ctx = target.getContext('2d')
    if (!ctx) throw new Error('NO_CONTEXT')
    ctx.drawImage(base, 0, 0)
    stamp(target, boxes, wm, unitPx)
  }

  /** Output type for an image: JPEG stays JPEG, everything else becomes PNG. */
  const imageOutput = (file: File): { mime: string; ext: string } =>
    file.type === 'image/jpeg' ? { mime: 'image/jpeg', ext: 'jpg' } : { mime: 'image/png', ext: 'png' }

  /**
   * Full-resolution export of an image, capped at {@link MAX_CANVAS_PIXELS}.
   * Metadata goes into EXIF for JPEG and iTXt chunks for PNG.
   */
  const exportImage = async (
    file: File,
    bitmap: ImageBitmap,
    boxes: Box[],
    wm: InkyWatermark,
    meta: InkyMetadata,
  ): Promise<Blob> => {
    const scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (bitmap.width * bitmap.height)))
    const canvas = scaledCopy(bitmap, Math.max(bitmap.width, bitmap.height) * scale)
    stamp(canvas, boxes, wm, canvas.width / bitmap.width)
    const { mime } = imageOutput(file)
    const blob = await encode(canvas, mime, 0.92)
    return mime === 'image/jpeg' ? await writeJpegMetadata(blob, meta) : writePngMetadata(blob, meta)
  }

  /**
   * Rebuild the PDF from rasterized pages. `boxesByPage[i]` holds page
   * i + 1's boxes. `onPage` fires before each page so the UI can show
   * progress. Nothing from the source document survives except pixels:
   * its text layer, metadata, attachments and scripts are all gone, and
   * the Info dictionary holds only what the user typed.
   */
  const exportPdf = async (
    pdf: PDFDocumentProxy,
    boxesByPage: Box[][],
    wm: InkyWatermark,
    meta: InkyMetadata,
    onPage: (page: number) => void,
  ): Promise<Uint8Array> => {
    // updateMetadata: false, or pdf-lib stamps its own Producer, Creator
    // and dates.
    const out = await PDFDocument.create({ updateMetadata: false })
    for (let n = 1; n <= pdf.numPages; n++) {
      onPage(n)
      const { canvas, widthPt, heightPt } = await renderPdfPage(pdf, n, EXPORT_LONG_SIDE)
      stamp(canvas, boxesByPage[n - 1] ?? [], wm, canvas.width / widthPt)
      const jpg = await encode(canvas, 'image/jpeg', 0.9)
      canvas.width = 0
      const image = await out.embedJpg(await jpg.arrayBuffer())
      out.addPage([widthPt, heightPt]).drawImage(image, {
        x: 0,
        y: 0,
        width: widthPt,
        height: heightPt,
      })
    }
    writePdfMetadata(out, meta)
    return await out.save()
  }

  return {
    loadImage,
    openPdf,
    renderPdfPage,
    imagePreview,
    compose,
    imageOutput,
    exportImage,
    exportPdf,
  }
}
