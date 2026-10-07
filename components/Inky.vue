<script setup lang="ts">
/**
 * Inky.vue
 *
 * Image/PDF dropzone, a preview canvas where dragging draws a box to
 * hide and tapping a box removes it, page navigation for PDFs, the
 * watermark controls (text, color, opacity, angle, and size, line
 * spacing and gap as slider-plus-number pairs) and the metadata form
 * (named fields plus free key/value rows). The preview is composed at
 * reduced size by `useInky.compose`; Download re-renders at full
 * resolution with `exportImage` / `exportPdf`.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Box, InkyMetadata, InkyWatermark } from '~/composables/useInky'
import { META_FIELDS, PREVIEW_LONG_SIDE } from '~/composables/useInky'

const { t } = useI18n()
const {
  loadImage,
  openPdf,
  renderPdfPage,
  imagePreview,
  compose,
  imageOutput,
  exportImage,
  exportPdf,
} = useInky()

type Source =
  | { kind: 'image'; file: File; bitmap: ImageBitmap }
  | { kind: 'pdf'; file: File; pdf: PDFDocumentProxy }

/** Drags shorter than this (in screen px) on both axes count as a tap. */
const TAP_PX = 6
/** Boxes thinner than this (in screen px) on either axis are discarded. */
const MIN_BOX_PX = 3

// shallowRef: pdf.js objects use private class fields, which throw when
// accessed through Vue's deep reactive proxies.
const source = shallowRef<Source | null>(null)
/**
 * The rendered page under the preview, tagged with its page index and
 * how many preview pixels one watermark size unit (pt or px) spans.
 */
const preview = shallowRef<{ canvas: HTMLCanvasElement; index: number; unitPx: number } | null>(null)
const pageIndex = ref(0)
const boxes = ref<Box[][]>([])
const draft = ref<Box | null>(null)
let dragStart: { x: number; y: number } | null = null
let renderToken = 0

const text = ref('')
const color = ref('#808080')
const size = ref(24)
const opacityPct = ref(35)
const rotation = ref(-30)
const lineSpacing = ref(2.5)
const gap = ref(2)

let customId = 0
const meta = reactive<InkyMetadata & { custom: { id: number; key: string; value: string }[] }>({
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  custom: [],
})

const isDragging = ref(false)
const isOpening = ref(false)
const isProcessing = ref(false)
const progressPage = ref(0)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const pageCount = computed(() =>
  source.value?.kind === 'pdf' ? source.value.pdf.numPages : 1,
)
const currentBoxes = computed(() => boxes.value[pageIndex.value] ?? [])
const totalBoxes = computed(() => boxes.value.reduce((n, page) => n + page.length, 0))

/** Number inputs yield '' while being edited; fall back instead of NaN. */
const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v)
  return v === '' || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(min, n))
}

const watermark = computed<InkyWatermark>(() => ({
  text: text.value,
  color: color.value,
  size: clamp(size.value, 1, 5000, 24),
  opacity: opacityPct.value / 100,
  rotation: rotation.value,
  lineSpacing: clamp(lineSpacing.value, 1, 20, 2.5),
  gap: clamp(gap.value, 0, 20, 2),
}))

/** Watermark size is in points for PDFs and pixels for images. */
const unit = computed(() => (source.value?.kind === 'pdf' ? 'pt' : 'px'))
const sizeMax = computed(() => {
  const s = source.value
  if (s?.kind !== 'image') return 144
  return Math.max(48, Math.round(Math.min(s.bitmap.width, s.bitmap.height) / 4))
})

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const subtitle = computed(() => {
  const s = source.value
  if (!s) return ''
  const size = formatBytes(s.file.size)
  return s.kind === 'image'
    ? `${s.bitmap.width}×${s.bitmap.height} · ${size}`
    : `${t('inky.pages', { n: s.pdf.numPages })} · ${size}`
})

const downloadLabel = computed(() => {
  if (!isProcessing.value) return t('inky.actions.download')
  if (progressPage.value > 0) {
    return t('inky.actions.processingPage', { page: progressPage.value, total: pageCount.value })
  }
  return t('inky.actions.processing')
})

const draftStyle = computed(() => {
  const d = draft.value
  if (!d) return {}
  return {
    left: `${d.x * 100}%`,
    top: `${d.y * 100}%`,
    width: `${d.w * 100}%`,
    height: `${d.h * 100}%`,
  }
})

const renderPreview = () => {
  if (!canvasRef.value || !preview.value) return
  compose(
    canvasRef.value,
    preview.value.canvas,
    boxes.value[preview.value.index] ?? [],
    watermark.value,
    preview.value.unitPx,
  )
}

const loadPreview = async (index: number) => {
  const s = source.value
  if (!s) return
  if (s.kind === 'image') {
    const canvas = imagePreview(s.bitmap)
    preview.value = { canvas, index, unitPx: canvas.width / s.bitmap.width }
    return
  }
  // Page flips can overlap; only the latest one may land.
  const token = ++renderToken
  const { canvas, widthPt } = await renderPdfPage(s.pdf, index + 1, PREVIEW_LONG_SIDE)
  if (token === renderToken) preview.value = { canvas, index, unitPx: canvas.width / widthPt }
}

const goTo = async (index: number) => {
  if (index < 0 || index >= pageCount.value) return
  pageIndex.value = index
  try {
    await loadPreview(index)
  } catch {
    errorMessage.value = t('inky.errors.generic')
  }
}

const release = () => {
  const s = source.value
  if (s?.kind === 'image') s.bitmap.close()
  if (s?.kind === 'pdf') void s.pdf.destroy()
}

const clear = () => {
  release()
  renderToken++
  source.value = null
  preview.value = null
  boxes.value = []
  draft.value = null
  dragStart = null
  pageIndex.value = 0
  errorMessage.value = null
}

const loadFile = async (file: File) => {
  errorMessage.value = null
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf && !file.type.startsWith('image/')) {
    errorMessage.value = t('inky.errors.unsupported', { name: file.name })
    return
  }
  isOpening.value = true
  try {
    const next: Source = isPdf
      ? { kind: 'pdf', file, pdf: await openPdf(await file.arrayBuffer()) }
      : { kind: 'image', file, bitmap: await loadImage(file) }
    source.value = next
    boxes.value = Array.from({ length: pageCount.value }, () => [])
    pageIndex.value = 0
    // Pixels mean nothing across images of different resolutions, so
    // start each one at 4% of its short side, roughly 24 pt on A4.
    size.value =
      next.kind === 'pdf'
        ? 24
        : Math.max(8, Math.round(0.04 * Math.min(next.bitmap.width, next.bitmap.height)))
    await loadPreview(0)
  } catch (err) {
    clear()
    const msg = (err as Error).message
    if (msg === 'PASSWORD') errorMessage.value = t('inky.errors.password')
    else if (isPdf) errorMessage.value = t('inky.errors.invalidPdf', { name: file.name })
    else errorMessage.value = t('inky.errors.unsupported', { name: file.name })
  } finally {
    isOpening.value = false
  }
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

const onSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadFile(file)
  target.value = ''
}

const toPage = (e: PointerEvent): { x: number; y: number } => {
  const rect = canvasRef.value!.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  }
}

const onPointerDown = (e: PointerEvent) => {
  if (!canvasRef.value || !preview.value || isProcessing.value) return
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  dragStart = toPage(e)
  draft.value = { ...dragStart, w: 0, h: 0 }
}

const onPointerMove = (e: PointerEvent) => {
  if (!dragStart) return
  const p = toPage(e)
  draft.value = {
    x: Math.min(dragStart.x, p.x),
    y: Math.min(dragStart.y, p.y),
    w: Math.abs(p.x - dragStart.x),
    h: Math.abs(p.y - dragStart.y),
  }
}

const onPointerUp = () => {
  const start = dragStart
  const box = draft.value
  dragStart = null
  draft.value = null
  if (!start || !box || !canvasRef.value || !preview.value) return

  // Boxes belong to the page on screen, which can lag `pageIndex` while
  // the next page is still rendering.
  const page = boxes.value[preview.value.index]
  const rect = canvasRef.value.getBoundingClientRect()
  const wPx = box.w * rect.width
  const hPx = box.h * rect.height
  if (wPx < TAP_PX && hPx < TAP_PX) {
    const hit = page.findLastIndex(
      (b) => start.x >= b.x && start.x <= b.x + b.w && start.y >= b.y && start.y <= b.y + b.h,
    )
    if (hit >= 0) page.splice(hit, 1)
    return
  }
  if (wPx >= MIN_BOX_PX && hPx >= MIN_BOX_PX) page.push(box)
}

const onPointerCancel = () => {
  dragStart = null
  draft.value = null
}

const undo = () => {
  boxes.value[pageIndex.value]?.pop()
}

const clearPage = () => {
  boxes.value[pageIndex.value]?.splice(0)
}

const addField = () => {
  meta.custom.push({ id: ++customId, key: '', value: '' })
}

const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const download = async () => {
  const s = source.value
  if (!s || isProcessing.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const baseName = s.file.name.replace(/\.[^/.]+$/, '')
    if (s.kind === 'image') {
      const blob = await exportImage(s.file, s.bitmap, boxes.value[0], watermark.value, meta)
      save(blob, `${baseName}-inky.${imageOutput(s.file).ext}`)
    } else {
      const bytes = await exportPdf(s.pdf, boxes.value, watermark.value, meta, (n) => {
        progressPage.value = n
      })
      save(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${baseName}-inky.pdf`)
    }
  } catch {
    errorMessage.value = t('inky.errors.generic')
  } finally {
    isProcessing.value = false
    progressPage.value = 0
  }
}

// `post` so the canvas exists when the first page lands right after load.
watch([preview, boxes, watermark], renderPreview, { deep: true, flush: 'post' })

onBeforeUnmount(release)
</script>

<template>
  <div class="inky">
    <div
      v-if="!source"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="!isOpening && fileInput?.click()"
    >
      <p>{{ isOpening ? t('inky.actions.opening') : t('inky.dropzone') }}</p>
      <p class="hint">{{ t('inky.dropzoneHint') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*,application/pdf,.pdf"
        hidden
        @change="onSelect"
      />
    </div>

    <template v-else>
      <div class="card">
        <header class="file-header">
          <div class="meta">
            <span class="name" :title="source.file.name">{{ source.file.name }}</span>
            <span class="sub">{{ subtitle }}</span>
          </div>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="isProcessing"
            @click="clear"
          >
            {{ t('inky.actions.change') }}
          </button>
        </header>
      </div>

      <div class="card">
        <h2 class="step">{{ t('inky.redact.title') }}</h2>
        <p class="hint">{{ t('inky.redact.hint') }}</p>

        <div class="preview-area">
          <div
            class="canvas-wrap"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
          >
            <canvas ref="canvasRef" class="preview" />
            <div v-if="draft" class="draft" :style="draftStyle" />
          </div>
        </div>

        <div v-if="source.kind === 'pdf'" class="pager">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :aria-label="t('inky.prevPage')"
            :disabled="pageIndex === 0"
            @click="goTo(pageIndex - 1)"
          >
            ‹
          </button>
          <span>{{ t('inky.pageOf', { page: pageIndex + 1, total: pageCount }) }}</span>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :aria-label="t('inky.nextPage')"
            :disabled="pageIndex >= pageCount - 1"
            @click="goTo(pageIndex + 1)"
          >
            ›
          </button>
        </div>

        <div class="toolbar">
          <span class="count">{{ t('inky.redact.count', { n: totalBoxes }) }}</span>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="currentBoxes.length === 0 || isProcessing"
            @click="undo"
          >
            {{ t('inky.redact.undo') }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="currentBoxes.length === 0 || isProcessing"
            @click="clearPage"
          >
            {{ source.kind === 'pdf' ? t('inky.redact.clearPage') : t('inky.redact.clearAll') }}
          </button>
        </div>
      </div>

      <div class="card">
        <h2 class="step">{{ t('inky.watermark.title') }}</h2>
        <label class="field">
          <span>{{ t('inky.watermark.text') }}</span>
          <input
            v-model="text"
            type="text"
            maxlength="120"
            :placeholder="t('inky.watermark.placeholder')"
          />
        </label>
        <p class="hint">{{ t('inky.watermark.tip') }}</p>

        <div class="row">
          <label class="field">
            <span>{{ t('inky.watermark.color') }}</span>
            <input v-model="color" type="color" class="color-input" />
          </label>
          <label class="field grow">
            <span>{{ t('inky.watermark.opacity') }} ({{ opacityPct }}%)</span>
            <input v-model.number="opacityPct" type="range" min="10" max="100" />
          </label>
          <label class="field grow">
            <span>{{ t('inky.watermark.rotation') }} ({{ rotation }}°)</span>
            <input v-model.number="rotation" type="range" min="-90" max="90" />
          </label>
        </div>
        <div class="row">
          <div class="field grow">
            <span>{{ t('inky.watermark.size') }} ({{ unit }})</span>
            <div class="range-num">
              <input
                v-model.number="size"
                type="range"
                min="4"
                :max="sizeMax"
                :aria-label="t('inky.watermark.size')"
              />
              <input
                v-model.number="size"
                type="number"
                min="1"
                step="any"
                class="num"
                :aria-label="t('inky.watermark.size')"
              />
            </div>
          </div>
          <div class="field grow">
            <span>{{ t('inky.watermark.lineSpacing') }} (×)</span>
            <div class="range-num">
              <input
                v-model.number="lineSpacing"
                type="range"
                min="1"
                max="8"
                step="0.1"
                :aria-label="t('inky.watermark.lineSpacing')"
              />
              <input
                v-model.number="lineSpacing"
                type="number"
                min="1"
                max="20"
                step="0.1"
                class="num"
                :aria-label="t('inky.watermark.lineSpacing')"
              />
            </div>
          </div>
          <div class="field grow">
            <span>{{ t('inky.watermark.spacing') }} (×)</span>
            <div class="range-num">
              <input
                v-model.number="gap"
                type="range"
                min="0"
                max="8"
                step="0.1"
                :aria-label="t('inky.watermark.spacing')"
              />
              <input
                v-model.number="gap"
                type="number"
                min="0"
                max="20"
                step="0.1"
                class="num"
                :aria-label="t('inky.watermark.spacing')"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="step">{{ t('inky.metadata.title') }}</h2>
        <p class="hint">{{ t('inky.metadata.hint') }}</p>
        <div class="meta-grid">
          <label v-for="f in META_FIELDS" :key="f" class="field">
            <span>{{ t(`inky.metadata.fields.${f}`) }}</span>
            <input
              v-model="meta[f]"
              type="text"
              maxlength="300"
              :placeholder="f === 'keywords' ? t('inky.metadata.keywordsPlaceholder') : ''"
            />
          </label>
        </div>

        <div class="field">
          <span>{{ t('inky.metadata.custom') }}</span>
          <div v-for="(row, i) in meta.custom" :key="row.id" class="custom-row">
            <input
              v-model="row.key"
              type="text"
              maxlength="79"
              :placeholder="t('inky.metadata.key')"
              :aria-label="t('inky.metadata.key')"
            />
            <input
              v-model="row.value"
              type="text"
              maxlength="500"
              :placeholder="t('inky.metadata.value')"
              :aria-label="t('inky.metadata.value')"
            />
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :aria-label="t('inky.metadata.remove')"
              :title="t('inky.metadata.remove')"
              @click="meta.custom.splice(i, 1)"
            >
              ✕
            </button>
          </div>
          <p v-if="meta.custom.length" class="hint">{{ t('inky.metadata.keyHint') }}</p>
          <div>
            <button class="btn btn-ghost btn-sm" type="button" @click="addField">
              {{ t('inky.metadata.add') }}
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <p class="hint">
          {{ source.kind === 'pdf' ? t('inky.pdfNote') : t('inky.imageNote') }}
        </p>
        <div class="actions">
          <button class="btn" type="button" :disabled="isProcessing" @click="download">
            {{ downloadLabel }}
          </button>
        </div>
      </div>
    </template>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.inky {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: background 0.15s, border-color 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.dropzone.active,
.dropzone:hover {
  background: var(--surface);
  border-color: var(--accent, #888);
}
.dropzone p {
  margin: 0;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.step {
  margin: 0;
  font-size: 1rem;
}
.hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 0.78rem;
  color: var(--muted);
}
.preview-area {
  display: flex;
  justify-content: center;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 0.75rem;
}
.canvas-wrap {
  position: relative;
  display: inline-block;
  max-width: 100%;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
  line-height: 0;
}
.preview {
  display: block;
  max-width: 100%;
  max-height: 36rem;
  height: auto;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
.draft {
  position: absolute;
  background: rgba(0, 0, 0, 0.45);
  border: 2px dashed var(--accent, #c75a3a);
  pointer-events: none;
}
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.count {
  flex: 1;
  font-size: 0.85rem;
  color: var(--muted);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 160px;
}
.field input[type='text'],
.field input.num {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  min-width: 0;
}
.range-num {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.range-num input[type='range'] {
  flex: 1;
  min-width: 0;
}
.range-num .num {
  width: 4.75rem;
  padding: 0.35rem 0.5rem;
}
.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem;
}
.custom-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  gap: 0.5rem;
  align-items: center;
}
.color-input {
  height: 2.6rem;
  width: 3.5rem;
  padding: 0.2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  cursor: pointer;
}
.row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.error {
  color: #b53a1f;
  margin: 0;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
