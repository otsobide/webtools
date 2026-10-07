/**
 * useInky
 *
 * Composable powering the Inky tool: hides sensitive areas of an image
 * or PDF behind solid boxes and stamps a repeated text watermark across
 * the whole page, so a copy shared for one purpose is useless for any
 * other.
 *
 * Everything is flattened to pixels. For images that comes free with
 * the canvas re-encode, which also drops EXIF. For PDFs every page is
 * rendered with pdf.js and re-embedded as a JPEG with pdf-lib. That is
 * the point: a black rectangle drawn over a PDF's vector content leaves
 * the text underneath selectable and extractable, so a redaction is
 * only real once the page is an image. It also keeps the watermark
 * from being deleted as a separate object.
 *
 * Boxes are stored in page-relative units (0..1) and the watermark is
 * sized against the page's shortest side, so the preview and the
 * full-resolution export compose identically at any scale.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

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
  /** Font size as a percentage of the page's shortest side. */
  sizePct: number
  /** Opacity in `[0..1]`. */
  opacity: number
  /** Rotation in degrees; negative tilts the lines up to the right. */
  rotation: number
  /** Extra gap between repetitions, as a percentage of the font size. */
  spacingPct: number
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
) => {
  const text = wm.text.trim()
  if (!text) return

  const fontPx = Math.max(6, (wm.sizePct / 100) * Math.min(w, h))
  const gap = (fontPx * wm.spacingPct) / 100
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, wm.opacity))
  ctx.fillStyle = wm.color
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  ctx.textBaseline = 'middle'
  const stepX = ctx.measureText(text).width + fontPx + gap
  const stepY = fontPx * 1.5 + gap

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

/** Draw the boxes and then the watermark onto an already painted canvas. */
const stamp = (canvas: HTMLCanvasElement, boxes: Box[], wm: InkyWatermark) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('NO_CONTEXT')
  drawBoxes(ctx, canvas.width, canvas.height, boxes)
  drawWatermark(ctx, canvas.width, canvas.height, wm)
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
  ): void => {
    target.width = base.width
    target.height = base.height
    const ctx = target.getContext('2d')
    if (!ctx) throw new Error('NO_CONTEXT')
    ctx.drawImage(base, 0, 0)
    stamp(target, boxes, wm)
  }

  /** Output type for an image: JPEG stays JPEG, everything else becomes PNG. */
  const imageOutput = (file: File): { mime: string; ext: string } =>
    file.type === 'image/jpeg' ? { mime: 'image/jpeg', ext: 'jpg' } : { mime: 'image/png', ext: 'png' }

  /** Full-resolution export of an image, capped at {@link MAX_CANVAS_PIXELS}. */
  const exportImage = async (
    file: File,
    bitmap: ImageBitmap,
    boxes: Box[],
    wm: InkyWatermark,
  ): Promise<Blob> => {
    const scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (bitmap.width * bitmap.height)))
    const canvas = scaledCopy(bitmap, Math.max(bitmap.width, bitmap.height) * scale)
    stamp(canvas, boxes, wm)
    return await encode(canvas, imageOutput(file).mime, 0.92)
  }

  /**
   * Rebuild the PDF from rasterized pages. `boxesByPage[i]` holds page
   * i + 1's boxes. `onPage` fires before each page so the UI can show
   * progress. Nothing from the source document survives except pixels,
   * so its text layer, metadata, attachments and scripts are all gone.
   */
  const exportPdf = async (
    pdf: PDFDocumentProxy,
    boxesByPage: Box[][],
    wm: InkyWatermark,
    onPage: (page: number) => void,
  ): Promise<Uint8Array> => {
    const out = await PDFDocument.create()
    for (let n = 1; n <= pdf.numPages; n++) {
      onPage(n)
      const { canvas, widthPt, heightPt } = await renderPdfPage(pdf, n, EXPORT_LONG_SIDE)
      stamp(canvas, boxesByPage[n - 1] ?? [], wm)
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
