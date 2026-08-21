# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # postinstall runs `nuxt prepare`
npm run dev          # dev server on http://localhost:3000
npm run typecheck    # vue-tsc — the only static guardrail (no test suite exists)
npm run generate     # static build → dist/ (what Netlify runs)
npm run preview      # serve the built output
```

Node 20 (`.nvmrc`, `netlify.toml`). `npm run build` exists but is unused — the
project ships a static SPA, never SSR. There are no tests, no linter, no env
vars.

`nuxt` is pinned to `~3.20.0` on purpose: 3.21.x had a Vite Node IPC regression
that makes the dev server return 500. Retest the dev server immediately if you
bump it.

## Architecture

Nuxt 3 + Vue 3 SPA (`ssr: false`), statically generated, hosted on Netlify.
**There is no backend and never will be** — this is the load-bearing constraint.
Every tool runs entirely in the browser against `File`/`ArrayBuffer`, Canvas,
Web Crypto, `Intl`, `BigInt` plus a few small client libs (`pdf-lib`,
`piexifjs`, `js-yaml`, `qrcode`, `diff`). Any new tool proposal must answer
"can this run client-side?" first; if it needs a server, it doesn't belong here.

### Per-tool trio

Each tool is three files plus locale strings plus one catalog entry:

```
composables/use<Tool>.ts   pure logic — no Vue, no DOM, no refs (Nuxt auto-imports it)
components/<Tool>.vue      UI: refs, computed, events, all strings via t()
pages/<tool>.vue           thin route wrapper: useHead + <Tool />
```

Page titles follow `Cervantic · ${t('tools.<id>.name')}` (the example in
`docs/adding-a-tool.md` is stale on this point — copy `pages/yieldy.vue`).

Tools never share state. There is no Pinia/Vuex, no CSS framework — global
classes (`.card`, `.btn`, `.btn-ghost`, `.field`, `.dropzone`, `.tool-grid`)
and CSS variables live in `assets/css/main.css`; tool-specific CSS goes in a
scoped `<style>` block.

### Catalog

`pages/index.vue` holds the single source of truth: `categoriesRaw` (a tool may
appear in several categories on purpose) and `toolPaths`. Order inside a
category is computed at runtime by `localeCompare` on the translated name — do
not hand-sort the arrays.

### Naming gotcha

Eight early tools have components/composables that don't match their route id.
New tools should match (`pages/yieldy.vue` → `components/Yieldy.vue` →
`composables/useYieldy.ts`), but expect these when searching:

| route | component | composable |
|---|---|---|
| `createpass` | `PasswordGenerator.vue` | `usePasswordGenerator.ts` |
| `hashy` | `HashCalculator.vue` | `useHash.ts` |
| `idkun` | `IdGenerator.vue` | `useIdGenerator.ts` |
| `metaimg` | `MetaimgEditor.vue` | `useExif.ts` |
| `mochi` | `ImageResizer.vue` | `useImageResize.ts` |
| `scissor` | `PdfScissor.vue` | `usePdfSplit.ts` |
| `stapler` | `PdfStapler.vue` | `usePdfMerge.ts` |
| `wordy` | `WordyCounter.vue` | `useWordCount.ts` |

## i18n (the part that breaks builds)

25 locales in `i18n/locales/*.json`, default `es` (no URL prefix), fallback
`en`, `prefix_except_default`. Every user-visible string is translated into
**all 25** files before a tool ships — a key present only in `es.json` renders
as a raw key everywhere else. Each tool owns a top-level namespace matching its
route id, plus `tools.<id>.{name,tagline,description}` for the landing card.
(`dropzone`/`controls`/`actions`/`result`/`errors` are legacy shared keys from
the first tool; don't add to them.)

vue-i18n's compiler will take down the dev server on three patterns — all three
have happened here:

- **Bare `@`** (linked-message syntax). In plain strings use `{'@'}`; inside
  messages rendered with `v-html` use `&#64;`.
- **Literal `{` / `}`** — rewrite the sentence to avoid braces, or escape as
  `{ '{' }`.
- **HTML in messages** — allowed (`escapeHtml: false`, `strictMessage: false`
  for the legal pages) but such messages must be rendered with `v-html`, never
  `{{ t(...) }}`, and must never contain user-provided content.

Workflow: write the strings by hand for `es`, `en`, `fr`, `de`, `it`, `pt`,
`ja`, then translate the remaining 18 in parallel (batches of ~3 per subagent).

## Working agreements

- **The user writes in Spanish — reply in Spanish.** Commit messages are in
  Spanish too. Code, identifiers, code comments, `README.md` and `docs/` stay
  in English.
- **Never add a dependency without asking**, however small. Offer options with
  size and licence and let the user choose. Prefer browser APIs over libraries.
- **Never pick a tool name unilaterally.** Suggest 3–4 alternatives and let the
  user choose (styles in use: cute diminutives, office objects, `<thing>pad`).
- Commits: `<type>(<scope>): <imperative summary>` in Spanish, scope = tool name
  or area. **No `Co-Authored-By` trailers, ever.** Commit and push to `dev`
  after each significant change; don't batch unrelated work.
- `dev` is the working branch; `main` is production (Netlify watches it).
  **Merging to `main` only happens when the user explicitly asks**, and always
  `--ff-only`. If a fast-forward isn't possible, stop and investigate.
- Comment only *why*, not *what*. No docstrings on obvious functions. No error
  handling for impossible cases — validate at boundaries only. Don't build
  abstractions for hypothetical future tools.

## Further reading

`docs/` is the long form and is kept current: `architecture.md`,
`adding-a-tool.md` (worked example + per-tool checklist), `i18n.md`,
`conventions.md`, `getting-started.md`.
