<script setup lang="ts">
/**
 * Brandy.vue
 *
 * Image dropzone followed by a watermark editor with two kinds: text
 * (font, size as %, color, bold/italic) or image (second dropzone +
 * width as %). Shared controls: position (9 anchors + tiled), rotation,
 * opacity, margin / tile gap. Renders a live preview onto a canvas via
 * `useBrandy.renderToCanvas` and offers download in PNG / JPG / WebP.
 */
import type {
  OutputFormat,
  Position,
  TextWatermarkOptions,
  ImageWatermarkOptions,
  WatermarkKind,
} from '~/composables/useBrandy'
import { FONT_FAMILIES, FORMATS, POSITIONS } from '~/composables/useBrandy'

const { t } = useI18n()
const { loadBitmap, renderToCanvas, exportBlob, extFor } = useBrandy()

interface LoadedImage {
  file: File
  bitmap: ImageBitmap
  width: number
  height: number
  size: number
}

const base = ref<LoadedImage | null>(null)
const watermarkImg = ref<LoadedImage | null>(null)
const isDraggingBase = ref(false)
const isDraggingWm = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const baseInput = ref<HTMLInputElement | null>(null)
const wmInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const kind = ref<WatermarkKind>('text')

// Text options.
const text = ref('© Cervantic')
const fontSizePct = ref(6)
const fontFamily = ref<string>(FONT_FAMILIES[0])
const color = ref('#ffffff')
const bold = ref(true)
const italic = ref(false)

// Image-watermark options.
const widthPct = ref(25)

// Shared options.
const position = ref<Position>('bottomRight')
const rotation = ref(0)
const opacityPct = ref(70)
const margin = ref(40)
const tileGap = ref(60)

// Export options.
const format = ref<OutputFormat>('png')
const quality = ref(92)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const showQuality = computed(() => format.value === 'jpeg' || format.value === 'webp')

const render = () => {
  if (!base.value || !canvasRef.value) return
  try {
    if (kind.value === 'text') {
      const opts: TextWatermarkOptions = {
        kind: 'text',
        text: text.value,
        fontSizePct: fontSizePct.value,
        fontFamily: fontFamily.value,
        color: color.value,
        bold: bold.value,
        italic: italic.value,
        position: position.value,
        rotation: rotation.value,
        opacity: opacityPct.value / 100,
        margin: margin.value,
        tileGap: tileGap.value,
      }
      renderToCanvas(canvasRef.value, base.value.bitmap, opts)
    } else {
      const opts: ImageWatermarkOptions = {
        kind: 'image',
        widthPct: widthPct.value,
        position: position.value,
        rotation: rotation.value,
        opacity: opacityPct.value / 100,
        margin: margin.value,
        tileGap: tileGap.value,
      }
      renderToCanvas(
        canvasRef.value,
        base.value.bitmap,
        opts,
        watermarkImg.value?.bitmap,
      )
    }
  } catch (err) {
    errorMessage.value = (err as Error).message
  }
}

const loadBase = async (file: File) => {
  errorMessage.value = null
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('brandy.errors.notImage', { name: file.name })
    return
  }
  try {
    if (base.value) base.value.bitmap.close()
    const bitmap = await loadBitmap(file)
    base.value = {
      file,
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      size: file.size,
    }
    await nextTick()
    render()
  } catch {
    errorMessage.value = t('brandy.errors.notImage', { name: file.name })
  }
}

const loadWatermark = async (file: File) => {
  errorMessage.value = null
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('brandy.errors.notImage', { name: file.name })
    return
  }
  try {
    if (watermarkImg.value) watermarkImg.value.bitmap.close()
    const bitmap = await loadBitmap(file)
    watermarkImg.value = {
      file,
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      size: file.size,
    }
    render()
  } catch {
    errorMessage.value = t('brandy.errors.notImage', { name: file.name })
  }
}

const onDropBase = (event: DragEvent) => {
  isDraggingBase.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadBase(file)
}

const onSelectBase = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadBase(file)
  target.value = ''
}

const onDropWm = (event: DragEvent) => {
  isDraggingWm.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadWatermark(file)
}

const onSelectWm = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadWatermark(file)
  target.value = ''
}

const clearBase = () => {
  if (base.value) base.value.bitmap.close()
  base.value = null
  errorMessage.value = null
}

const clearWatermark = () => {
  if (watermarkImg.value) watermarkImg.value.bitmap.close()
  watermarkImg.value = null
  render()
}

const download = async () => {
  if (!base.value || !canvasRef.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const blob = await exportBlob(canvasRef.value, format.value, quality.value)
    const baseName = base.value.file.name.replace(/\.[^/.]+$/, '')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}-brandy.${extFor(format.value)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    errorMessage.value = t('brandy.errors.generic')
  } finally {
    isProcessing.value = false
  }
}

watch(
  [
    kind,
    text,
    fontSizePct,
    fontFamily,
    color,
    bold,
    italic,
    widthPct,
    position,
    rotation,
    opacityPct,
    margin,
    tileGap,
  ],
  render,
)
</script>

<template>
  <div class="brandy">
    <div
      v-if="!base"
      class="dropzone"
      :class="{ active: isDraggingBase }"
      @dragover.prevent="isDraggingBase = true"
      @dragleave.prevent="isDraggingBase = false"
      @drop.prevent="onDropBase"
      @click="baseInput?.click()"
    >
      <p>{{ t('brandy.dropzone.base') }}</p>
      <input
        ref="baseInput"
        type="file"
        accept="image/*"
        hidden
        @change="onSelectBase"
      />
    </div>

    <template v-else>
      <div class="card">
        <header class="file-header">
          <div class="meta">
            <span class="name" :title="base.file.name">{{ base.file.name }}</span>
            <span class="sub">
              {{ base.width }}×{{ base.height }} · {{ formatBytes(base.size) }}
            </span>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" @click="clearBase">
            {{ t('brandy.actions.change') }}
          </button>
        </header>
      </div>

      <div class="preview-card">
        <canvas ref="canvasRef" class="preview" />
      </div>

      <div class="card">
        <div class="kind-tabs">
          <button
            type="button"
            class="kind-tab"
            :class="{ active: kind === 'text' }"
            @click="kind = 'text'"
          >
            {{ t('brandy.kind.text') }}
          </button>
          <button
            type="button"
            class="kind-tab"
            :class="{ active: kind === 'image' }"
            @click="kind = 'image'"
          >
            {{ t('brandy.kind.image') }}
          </button>
        </div>

        <template v-if="kind === 'text'">
          <label class="field">
            <span>{{ t('brandy.text.text') }}</span>
            <input v-model="text" type="text" :placeholder="t('brandy.text.placeholder')" />
          </label>

          <div class="row">
            <label class="field grow">
              <span>{{ t('brandy.text.font') }}</span>
              <select v-model="fontFamily">
                <option v-for="f in FONT_FAMILIES" :key="f" :value="f">{{ f }}</option>
              </select>
            </label>
            <label class="field grow">
              <span>{{ t('brandy.text.size') }} ({{ fontSizePct }}%)</span>
              <input v-model.number="fontSizePct" type="range" min="2" max="40" />
            </label>
          </div>

          <div class="row">
            <label class="field">
              <span>{{ t('brandy.text.color') }}</span>
              <input v-model="color" type="color" class="color-input" />
            </label>
            <label class="toggle">
              <input v-model="bold" type="checkbox" />
              <span>{{ t('brandy.text.bold') }}</span>
            </label>
            <label class="toggle">
              <input v-model="italic" type="checkbox" />
              <span>{{ t('brandy.text.italic') }}</span>
            </label>
          </div>
        </template>

        <template v-else>
          <div
            v-if="!watermarkImg"
            class="wm-dropzone"
            :class="{ active: isDraggingWm }"
            @dragover.prevent="isDraggingWm = true"
            @dragleave.prevent="isDraggingWm = false"
            @drop.prevent="onDropWm"
            @click="wmInput?.click()"
          >
            <p>{{ t('brandy.dropzone.watermark') }}</p>
            <input
              ref="wmInput"
              type="file"
              accept="image/*"
              hidden
              @change="onSelectWm"
            />
          </div>
          <div v-else class="wm-row">
            <span class="name" :title="watermarkImg.file.name">{{ watermarkImg.file.name }}</span>
            <span class="sub">{{ watermarkImg.width }}×{{ watermarkImg.height }}</span>
            <button class="btn btn-ghost btn-sm" type="button" @click="clearWatermark">
              {{ t('brandy.actions.change') }}
            </button>
          </div>

          <label class="field">
            <span>{{ t('brandy.image.width') }} ({{ widthPct }}%)</span>
            <input v-model.number="widthPct" type="range" min="5" max="100" />
          </label>
        </template>

        <div class="row">
          <label class="field grow">
            <span>{{ t('brandy.shared.position') }}</span>
            <select v-model="position">
              <option v-for="p in POSITIONS" :key="p" :value="p">
                {{ t(`brandy.positions.${p}`) }}
              </option>
            </select>
          </label>
          <label class="field grow">
            <span>{{ t('brandy.shared.opacity') }} ({{ opacityPct }}%)</span>
            <input v-model.number="opacityPct" type="range" min="5" max="100" />
          </label>
        </div>

        <div class="row">
          <label class="field grow">
            <span>{{ t('brandy.shared.rotation') }} ({{ rotation }}°)</span>
            <input v-model.number="rotation" type="range" min="-180" max="180" />
          </label>
          <label v-if="position !== 'tiled'" class="field grow">
            <span>{{ t('brandy.shared.margin') }} ({{ margin }}px)</span>
            <input v-model.number="margin" type="range" min="0" max="400" />
          </label>
          <label v-else class="field grow">
            <span>{{ t('brandy.shared.tileGap') }} ({{ tileGap }}px)</span>
            <input v-model.number="tileGap" type="range" min="0" max="400" />
          </label>
        </div>

        <div class="row">
          <label class="field grow">
            <span>{{ t('brandy.format.label') }}</span>
            <select v-model="format">
              <option v-for="f in FORMATS" :key="f" :value="f">
                {{ t(`brandy.format.${f}`) }}
              </option>
            </select>
          </label>
          <label v-if="showQuality" class="field grow">
            <span>{{ t('brandy.format.quality') }} ({{ quality }})</span>
            <input v-model.number="quality" type="range" min="40" max="100" />
          </label>
        </div>

        <div class="actions">
          <button class="btn" type="button" :disabled="isProcessing" @click="download">
            {{ isProcessing ? t('brandy.actions.processing') : t('brandy.actions.download') }}
          </button>
        </div>
      </div>
    </template>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.brandy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.dropzone,
.wm-dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: background 0.15s, border-color 0.15s;
}
.dropzone.active,
.dropzone:hover,
.wm-dropzone.active,
.wm-dropzone:hover {
  background: var(--surface);
  border-color: var(--accent, #888);
}
.dropzone p,
.wm-dropzone p {
  margin: 0;
}
.wm-dropzone {
  padding: 1.2rem 1rem;
}
.wm-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.85rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex-wrap: wrap;
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
.preview-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.preview {
  max-width: 100%;
  max-height: 32rem;
  height: auto;
  display: block;
}
.kind-tabs {
  display: flex;
  gap: 0.3rem;
}
.kind-tab {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.kind-tab:hover {
  background: var(--surface);
}
.kind-tab.active {
  background: var(--accent, #c75a3a);
  color: #fff;
  border-color: var(--accent, #c75a3a);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 200px;
}
.field select,
.field input[type='text'],
.field input[type='range'] {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.field input[type='range'] {
  padding: 0;
}
.color-input {
  height: 2.6rem;
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
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
  padding-bottom: 0.55rem;
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
