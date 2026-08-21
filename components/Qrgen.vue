<script setup lang="ts">
/**
 * Qrgen.vue
 *
 * Text input, error-correction-level picker, margin / size sliders and
 * foreground / background color pickers. Live SVG preview is generated via
 * `useQrgen.toSvg`; downloads are produced as PNG (canvas) or SVG (inline
 * string). Empty input yields an empty preview without an error.
 */
import type { ErrorLevel } from '~/composables/useQrgen'
import { ERROR_LEVELS } from '~/composables/useQrgen'

const { t } = useI18n()
const { toSvg, toPngBlob } = useQrgen()

const text = ref('https://example.com')
const errorLevel = ref<ErrorLevel>('M')
const margin = ref(2)
const size = ref(512)
const fgColor = ref('#1f1b16')
const bgColor = ref('#ffffff')
const copied = ref(false)
const errorMessage = ref<string | null>(null)

const svgString = ref('')

const options = computed(() => ({
  text: text.value,
  errorLevel: errorLevel.value,
  margin: margin.value,
  size: size.value,
  fgColor: fgColor.value,
  bgColor: bgColor.value,
}))

const regenerate = async () => {
  errorMessage.value = null
  if (text.value.length === 0) {
    svgString.value = ''
    return
  }
  try {
    svgString.value = await toSvg(options.value)
  } catch (err) {
    errorMessage.value = (err as Error).message
    svgString.value = ''
  }
}

onMounted(regenerate)
watch(options, regenerate, { deep: true })

const copySvg = async () => {
  if (svgString.value.length === 0) return
  try {
    await navigator.clipboard.writeText(svgString.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const downloadSvg = () => {
  if (svgString.value.length === 0) return
  const blob = new Blob([svgString.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'qr.svg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const downloadPng = async () => {
  if (text.value.length === 0) return
  try {
    const blob = await toPngBlob(options.value)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    errorMessage.value = (err as Error).message
  }
}
</script>

<template>
  <div class="qrgen">
    <div class="card">
      <label class="field">
        <span>{{ t('qrgen.text') }}</span>
        <textarea
          v-model="text"
          class="text-input mono"
          spellcheck="false"
          :placeholder="t('qrgen.placeholder')"
          rows="3"
        />
      </label>
    </div>

    <div class="layout">
      <div class="preview-card">
        <div v-if="svgString.length > 0" class="preview" v-html="svgString" />
        <p v-else class="empty">{{ t('qrgen.empty') }}</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <div v-if="svgString.length > 0" class="preview-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="copySvg">
            {{ copied ? t('qrgen.actions.copied') : t('qrgen.actions.copySvg') }}
          </button>
          <button class="btn btn-sm" type="button" @click="downloadSvg">
            {{ t('qrgen.actions.downloadSvg') }}
          </button>
          <button class="btn btn-sm" type="button" @click="downloadPng">
            {{ t('qrgen.actions.downloadPng') }}
          </button>
        </div>
      </div>

      <div class="options-card card">
        <div class="row">
          <label class="field grow">
            <span>{{ t('qrgen.errorLevel.label') }}</span>
            <select v-model="errorLevel">
              <option v-for="lvl in ERROR_LEVELS" :key="lvl" :value="lvl">
                {{ t(`qrgen.errorLevel.${lvl}`) }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>{{ t('qrgen.size') }} (px)</span>
            <input
              v-model.number="size"
              type="number"
              min="64"
              max="2048"
              class="num-input"
            />
          </label>
          <label class="field">
            <span>{{ t('qrgen.margin') }}</span>
            <input
              v-model.number="margin"
              type="number"
              min="0"
              max="20"
              class="num-input"
            />
          </label>
        </div>

        <div class="row">
          <label class="field color-field">
            <span>{{ t('qrgen.fgColor') }}</span>
            <div class="color-row">
              <input v-model="fgColor" type="color" class="color-input" />
              <input v-model="fgColor" type="text" class="hex-input mono" maxlength="7" />
            </div>
          </label>
          <label class="field color-field">
            <span>{{ t('qrgen.bgColor') }}</span>
            <div class="color-row">
              <input v-model="bgColor" type="color" class="color-input" />
              <input v-model="bgColor" type="text" class="hex-input mono" maxlength="7" />
            </div>
          </label>
        </div>
        <p class="hint">{{ t('qrgen.errorLevelHint') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qrgen {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 180px;
}
.text-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  font-size: 0.88rem;
  resize: vertical;
  min-height: 4rem;
  white-space: pre-wrap;
}
.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 800px) {
  .layout {
    grid-template-columns: minmax(260px, 1fr) 1.4fr;
  }
}
.preview-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}
.preview {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.empty {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}
.preview-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
}
.options-card {
  gap: 0.85rem;
}
.row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field select,
.field input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.num-input {
  width: 5.5rem;
}
.color-field {
  flex: 1 1 180px;
}
.color-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.color-input {
  width: 2.4rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
.hex-input {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg, #fff);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.85rem;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
