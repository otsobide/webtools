<script setup lang="ts">
/**
 * Randy.vue
 *
 * Seeded PRNG playground. The seed + algorithm form a deterministic
 * source; the user picks an output kind (integers / floats / pick from
 * list) and a count, hits Generate and gets a copy-able list. A "🎲"
 * button fills the seed with crypto-strong random bytes for the user
 * who wants a fresh sequence; clicking Generate again with the same
 * seed reproduces the exact same output.
 */
import type { Algorithm } from '~/composables/useRandy'
import { ALGORITHMS, makeRng, randomSeed } from '~/composables/useRandy'

type Kind = 'integers' | 'floats' | 'pick'

const { t } = useI18n()
const { integers, floats, pick } = useRandy()

const seed = ref('cervantic')
const algorithm = ref<Algorithm>('mulberry32')
const kind = ref<Kind>('integers')

const intMin = ref(1)
const intMax = ref(100)
const intCount = ref(10)

const floatMin = ref(0)
const floatMax = ref(1)
const floatDecimals = ref(3)
const floatCount = ref(10)

const pickItemsText = ref('alpha\nbravo\ncharlie\ndelta\necho\nfoxtrot')
const pickCount = ref(3)
const pickWithReplacement = ref(false)

const output = ref<string[]>([])
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const pickItems = computed(() =>
  pickItemsText.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
)

const canGenerate = computed(() => {
  if (kind.value === 'pick') return pickItems.value.length > 0
  return true
})

const generate = () => {
  const rng = makeRng(seed.value, algorithm.value)
  if (kind.value === 'integers') {
    output.value = integers(rng, intMin.value, intMax.value, Math.max(1, intCount.value)).map(String)
    return
  }
  if (kind.value === 'floats') {
    output.value = floats(
      rng,
      floatMin.value,
      floatMax.value,
      floatDecimals.value,
      Math.max(1, floatCount.value),
    ).map(String)
    return
  }
  output.value = pick(
    rng,
    pickItems.value,
    Math.max(1, pickCount.value),
    pickWithReplacement.value,
  )
}

const rerollSeed = () => {
  seed.value = randomSeed()
  generate()
}

const outputText = computed(() => output.value.join('\n'))

const copy = async () => {
  if (output.value.length === 0) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  generate()
})
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="randy">
    <div class="card">
      <div class="row">
        <label class="field grow">
          <span>{{ t('randy.seed.label') }}</span>
          <div class="seed-input">
            <input
              v-model="seed"
              type="text"
              class="mono"
              spellcheck="false"
              autocomplete="off"
              :placeholder="t('randy.seed.placeholder')"
            />
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :title="t('randy.seed.randomTitle')"
              @click="rerollSeed"
            >
              🎲
            </button>
          </div>
        </label>

        <label class="field grow">
          <span>{{ t('randy.algorithm.label') }}</span>
          <select v-model="algorithm">
            <option v-for="a in ALGORITHMS" :key="a" :value="a">
              {{ t(`randy.algorithm.${a}`) }}
            </option>
          </select>
        </label>
      </div>
      <p class="hint">{{ t('randy.seed.hint') }}</p>
    </div>

    <div class="card">
      <div class="kind-tabs">
        <button
          v-for="k in (['integers', 'floats', 'pick'] as Kind[])"
          :key="k"
          type="button"
          class="kind-tab"
          :class="{ active: kind === k }"
          @click="kind = k"
        >
          {{ t(`randy.kind.${k}`) }}
        </button>
      </div>

      <template v-if="kind === 'integers'">
        <div class="row">
          <label class="field grow">
            <span>{{ t('randy.range.min') }}</span>
            <input v-model.number="intMin" type="number" />
          </label>
          <label class="field grow">
            <span>{{ t('randy.range.max') }}</span>
            <input v-model.number="intMax" type="number" />
          </label>
          <label class="field grow">
            <span>{{ t('randy.range.count') }}</span>
            <input v-model.number="intCount" type="number" min="1" max="10000" />
          </label>
        </div>
        <p class="hint">{{ t('randy.range.inclusive') }}</p>
      </template>

      <template v-else-if="kind === 'floats'">
        <div class="row">
          <label class="field grow">
            <span>{{ t('randy.range.min') }}</span>
            <input v-model.number="floatMin" type="number" step="any" />
          </label>
          <label class="field grow">
            <span>{{ t('randy.range.max') }}</span>
            <input v-model.number="floatMax" type="number" step="any" />
          </label>
        </div>
        <div class="row">
          <label class="field grow">
            <span>{{ t('randy.range.decimals') }}</span>
            <input v-model.number="floatDecimals" type="number" min="0" max="20" />
          </label>
          <label class="field grow">
            <span>{{ t('randy.range.count') }}</span>
            <input v-model.number="floatCount" type="number" min="1" max="10000" />
          </label>
        </div>
      </template>

      <template v-else>
        <label class="field">
          <span>{{ t('randy.pick.items') }} ({{ pickItems.length }})</span>
          <textarea
            v-model="pickItemsText"
            class="mono items-area"
            rows="6"
            spellcheck="false"
            :placeholder="t('randy.pick.placeholder')"
          />
        </label>
        <div class="row">
          <label class="field grow">
            <span>{{ t('randy.range.count') }}</span>
            <input v-model.number="pickCount" type="number" min="1" max="10000" />
          </label>
          <label class="toggle">
            <input v-model="pickWithReplacement" type="checkbox" />
            <span>{{ t('randy.pick.withReplacement') }}</span>
          </label>
        </div>
      </template>

      <div class="actions">
        <button class="btn" type="button" :disabled="!canGenerate" @click="generate">
          {{ t('randy.actions.generate') }}
        </button>
      </div>
    </div>

    <div v-if="output.length > 0" class="card">
      <header class="output-header">
        <span class="output-label">{{ t('randy.output.label', { n: output.length }) }}</span>
        <button type="button" class="btn btn-sm" @click="copy">
          {{ copied ? t('randy.output.copied') : t('randy.output.copy') }}
        </button>
      </header>
      <pre class="mono output">{{ outputText }}</pre>
    </div>
  </div>
</template>

<style scoped>
.randy {
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
.row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 180px;
}
.field input[type='text'],
.field input[type='number'],
.field select {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.seed-input {
  display: flex;
  gap: 0.4rem;
  align-items: stretch;
}
.seed-input input {
  flex: 1;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.items-area {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 6rem;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
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
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  padding-bottom: 0.55rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}
.output-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
}
.output {
  margin: 0;
  padding: 0.85rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
  white-space: pre;
  font-size: 0.9rem;
  line-height: 1.55;
  max-height: 24rem;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
