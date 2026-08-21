# Adding a new tool

A tool is a **trio** of files plus locale strings plus one entry in the
catalog. The whole process is mechanical; this page walks through it
with a concrete example: a fictional **Slugify** tool that turns a
sentence into a URL slug.

## 0. Pick a name

Names follow loose conventions: cute diminutives (Wordy, Hashy, Idkun),
office tools (Stapler, Scissor), or `<thing>pad` editors (Jsonpad,
Lorempad, Regexpad). One word, easy to say, distinctive. Avoid generic
words ("Tool", "Converter").

Ask the user before deciding. **Don't commit to a name without
confirmation.** See [`docs/conventions.md`](conventions.md).

## 1. Create the composable

Pure logic. No Vue, no DOM, no `ref`. Just functions.

```ts
// composables/useSlugify.ts
export interface SlugifyOptions {
  separator: '-' | '_'
  lowercase: boolean
}

export const useSlugify = () => {
  const slugify = (text: string, opts: SlugifyOptions): string => {
    let s = text.normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    if (opts.lowercase) s = s.toLowerCase()
    s = s.replace(/[^a-zA-Z0-9]+/g, opts.separator)
    return s.replace(new RegExp(`^${opts.separator}+|${opts.separator}+$`, 'g'), '')
  }
  return { slugify }
}
```

Why a composable instead of a plain `.ts` module? Because Nuxt auto-imports
anything under `composables/`, so `useSlugify()` is available in any
component without an explicit `import`.

## 2. Create the component

UI state, events, computed values. Reads from the composable and from
i18n. No business logic that doesn't belong to the UI itself.

```vue
<!-- components/Slugify.vue -->
<script setup lang="ts">
const { t } = useI18n()
const { slugify } = useSlugify()

const input = ref('')
const separator = ref<'-' | '_'>('-')
const lowercase = ref(true)

const output = computed(() =>
  slugify(input.value, { separator: separator.value, lowercase: lowercase.value }),
)

const copy = async () => {
  if (output.value.length === 0) return
  await navigator.clipboard.writeText(output.value)
}
</script>

<template>
  <div class="slugify">
    <!-- inputs, output, buttons; use t('slugify.*') for every string -->
  </div>
</template>
```

Conventions inside the component:

- Use `const { t } = useI18n()` and `t('<tool>.foo')` for **every**
  user-visible string. Never hard-code in any language, not even English.
- Wrap controls in `<label class="field">` to get the shared styling.
- Wrap groups of controls in `<div class="card">` for the surface treatment.
- Use the global `.btn` / `.btn-ghost` / `.btn-sm` classes for buttons.
- Put tool-specific CSS in a **scoped** `<style scoped>` block.

## 3. Create the page

A thin wrapper. Sets the document title and renders the component.

```vue
<!-- pages/slugify.vue -->
<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.slugify.name')} · Cervantic`,
  meta: [{ name: 'description', content: () => t('tools.slugify.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.slugify.tagline') }}</h1>
      <p class="lead">{{ t('tools.slugify.description') }}</p>
    </header>

    <Slugify />
  </section>
</template>
```

That's it. Nuxt's file-based routing makes `/slugify` exist
automatically (and `/en/slugify`, `/pt/slugify`, etc.).

## 4. Add the translations

Open all **25** locale files in `i18n/locales/` and add two blocks. In
practice you write a handful by hand (typically `es`, `en`, `fr`, `de`,
`it`, `pt`, `ja`) and farm the rest out to subagents in parallel — see
[`docs/i18n.md`](i18n.md) for the workflow.

**The tool card metadata** (under `tools.<id>`):

```json
"slugify": {
  "name": "Slugify",
  "tagline": "Turn text into a URL slug",
  "description": "Removes accents, lowercases, and joins words with a separator."
}
```

**The UI strings** (top-level, alongside `mochi`, `hashy`, etc.):

```json
"slugify": {
  "input": "Text",
  "output": "Slug",
  "separator": "Separator",
  "lowercase": "Lowercase",
  "actions": {
    "copy": "Copy",
    "copied": "Copied!"
  }
}
```

Translate honestly. Keep keys identical across all 25 files — vue-i18n's
fallback chain points to `en`, so a missing key won't crash, but it will
visibly leak English into the affected locale.

If your strings contain `@`, `{}` or HTML, **read
[`docs/i18n.md`](i18n.md) first**. There are three traps and they all
have workarounds, but they need to be applied at write time, not later.

## 5. Register in the catalog

Edit `pages/index.vue`:

```ts
const categoriesRaw = [
  /* …existing categories… */
  { id: 'dev', tools: ['csvjson', 'jsonpad', 'regexpad', 'idkun', 'slugify'] },
]

const toolPaths: Record<string, string> = {
  /* …existing entries… */
  slugify: '/slugify',
}
```

The category id (`dev`, `documents`, etc.) must already exist in
`landing.categories.<id>` in every locale, or be added there too.

The order inside the `tools` array doesn't matter — at runtime each
category is re-sorted alphabetically by the **translated** tool name.

A tool can be listed in more than one category (e.g. Idkun is in both
`generators` and `dev`).

## 6. Smoke-test

```bash
npm run dev
```

Check that:

1. `/slugify` renders without console errors.
2. The card appears in the landing under the right category, in the
   right alphabetical slot.
3. Switching language updates **all** strings on the page (no leftover
   keys like `slugify.input` showing literally).
4. The page title in the browser tab is `Slugify · Cervantic`.

## 7. Commit and push

Commit format (see [`docs/conventions.md`](conventions.md)):

```
feat(slugify): turn text into URL slugs

Strips accents, lowercases optional, joins with `-` or `_`.
```

Push to `dev`. Don't merge to `main` unless the user asks.

## Things to avoid

- Adding new dependencies without asking. Even small ones change the
  bundle and the supply chain. List the options, the size, the licence,
  and let the user pick.
- Putting business logic in the component. If it doesn't touch refs or
  DOM, it belongs in the composable.
- Skipping locales. 25 languages is the contract — don't ship a tool
  with only Spanish and English.
- Hard-coding English in the page or component. Always go through `t()`.
- Designing for hypothetical future tools. Solve the current one; the
  next will tell you what the abstraction should look like.
