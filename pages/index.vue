<script setup lang="ts">
/**
 * pages/index.vue — landing page.
 *
 * Declarative catalog of categories and tools. `categoriesRaw` is the
 * editorial layout (some tools appear in multiple categories on purpose,
 * e.g. Metaimg lives under both Image editing and Privacy). `toolPaths`
 * is the route map. At render time tools are sorted alphabetically by
 * their translated name so the order respects the user's language.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()

const categoriesRaw = [
  { id: 'imageEdit', tools: ['mochi', 'metaimg', 'convy', 'pixely', 'brandy', 'croppy'] },
  { id: 'documents', tools: ['stapler', 'scissor', 'pdfspinner', 'albumy', 'metapdf', 'markpdf', 'wordy', 'inky'] },
  { id: 'privacy', tools: ['metaimg', 'createpass', 'hashy', 'inky'] },
  { id: 'generators', tools: ['createpass', 'idkun', 'combiny', 'lorempad', 'mdtably', 'qrgen', 'randy'] },
  { id: 'dev', tools: ['csvjson', 'jsonpad', 'regexpad', 'yamljson', 'urlpad', 'codecpad', 'jwtdecoder', 'diffy', 'cronpad', 'idkun'] },
  { id: 'design', tools: ['gradienty', 'shadowy', 'colory', 'picky', 'unity'] },
  { id: 'calculators', tools: ['timely', 'basey', 'lapsy', 'yieldy'] },
] as const

const toolPaths: Record<string, string> = {
  mochi: '/mochi',
  metaimg: '/metaimg',
  convy: '/convy',
  pixely: '/pixely',
  brandy: '/brandy',
  croppy: '/croppy',
  createpass: '/createpass',
  hashy: '/hashy',
  idkun: '/idkun',
  stapler: '/stapler',
  scissor: '/scissor',
  pdfspinner: '/pdfspinner',
  albumy: '/albumy',
  metapdf: '/metapdf',
  markpdf: '/markpdf',
  wordy: '/wordy',
  combiny: '/combiny',
  csvjson: '/csvjson',
  jsonpad: '/jsonpad',
  lorempad: '/lorempad',
  mdtably: '/mdtably',
  qrgen: '/qrgen',
  randy: '/randy',
  regexpad: '/regexpad',
  yamljson: '/yamljson',
  urlpad: '/urlpad',
  codecpad: '/codecpad',
  jwtdecoder: '/jwtdecoder',
  diffy: '/diffy',
  cronpad: '/cronpad',
  gradienty: '/gradienty',
  shadowy: '/shadowy',
  colory: '/colory',
  picky: '/picky',
  unity: '/unity',
  timely: '/timely',
  basey: '/basey',
  lapsy: '/lapsy',
  yieldy: '/yieldy',
  inky: '/inky',
}

const categories = computed(() =>
  categoriesRaw.map((cat) => ({
    id: cat.id,
    tools: [...cat.tools].sort((a, b) =>
      t(`tools.${a}.name`).localeCompare(t(`tools.${b}.name`), locale.value),
    ),
  })),
)

useHead({
  meta: [{ name: 'description', content: () => t('landing.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('landing.title') }}</h1>
      <p class="lead">{{ t('landing.description') }}</p>
    </header>

    <section
      v-for="cat in categories"
      :key="cat.id"
      class="category"
    >
      <h2 class="category-title">{{ t(`landing.categories.${cat.id}`) }}</h2>
      <div class="tool-grid">
        <ToolCard
          v-for="toolId in cat.tools"
          :key="toolId"
          :to="localePath(toolPaths[toolId])"
          :name="t(`tools.${toolId}.name`)"
          :tagline="t(`tools.${toolId}.tagline`)"
        />
      </div>
    </section>
  </section>
</template>

<style scoped>
.category {
  margin-top: 2rem;
}
.category:first-of-type {
  margin-top: 0;
}
.category-title {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
</style>
