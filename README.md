# Cervantic · WebTools

Source code of **Cervantic** — a growing collection
of small web utilities that run **entirely in the browser**. No backend,
no uploads, no telemetry: files never leave the user's device.

**34 tools** across **7 categories**, available in **25 languages**.

## Philosophy

- **Privacy by construction.** If a tool needs a server to do its job, it
  doesn't belong here. Everything runs against `File`, `ArrayBuffer`,
  Canvas, Web Crypto, Web Audio and a handful of small client libraries.
- **One tool per page.** Each utility is a self-contained composable + UI
  component + thin page. Nothing shares state across tools.
- **i18n is not optional.** Every user-visible string is translated into
  all 25 locales before a tool ships. The contract is enforced in
  [`docs/conventions.md`](docs/conventions.md).
- **No build-time configuration.** Clone, `npm install`, `npm run dev`.

## Tools

| Category | Path | Tool | What it does |
|---|---|---|---|
| Image editing | `/convy` | Convy | Convert images between PNG, JPG and WebP |
| Image editing | `/metaimg` | Metaimg | Read, edit or strip EXIF metadata |
| Image editing | `/mochi` | Mochi | Resize images |
| Image editing | `/pixely` | Pixely | Pixelate an image (full or selected area) |
| Documents | `/albumy` | Albumy | Combine several images into a single PDF |
| Documents | `/markpdf` | Markpdf | Add a text watermark to PDF pages |
| Documents | `/metapdf` | Metapdf | Read and edit PDF metadata (title, author, dates…) |
| Documents | `/pdfspinner` | PdfSpinner | Rotate pages of a PDF |
| Documents | `/scissor` | Scissor | Extract pages from a PDF |
| Documents | `/stapler` | Stapler | Merge several PDFs into one |
| Documents | `/wordy` | Wordy | Word/character counter + reading time |
| Privacy | `/createpass` | Createpass | Generate strong passwords |
| Privacy | `/hashy` | Hashy | Hashes (SHA-1/256/384/512) + integrity check |
| Privacy | `/metaimg` | Metaimg | Read, edit or strip EXIF metadata |
| Generators | `/combiny` | Combiny | Combine fields into variants (emails, usernames…) |
| Generators | `/createpass` | Createpass | Generate strong passwords |
| Generators | `/idkun` | Idkun | UUID v4/v7/NIL, ULID, NanoID |
| Generators | `/lorempad` | Lorempad | Lorem ipsum generator |
| Generators | `/qrgen` | Qrgen | QR codes (SVG / PNG, customisable) |
| Development | `/codecpad` | Codecpad | Multi-format encoder (UTF-8, Base64, Base32, Hex, Base58) |
| Development | `/cronpad` | Cronpad | Explain cron expressions + preview next runs |
| Development | `/csvjson` | CsvJson | Convert between CSV and JSON |
| Development | `/diffy` | Diffy | Diff two texts (line / word / char) |
| Development | `/idkun` | Idkun | UUID v4/v7/NIL, ULID, NanoID |
| Development | `/jsonpad` | Jsonpad | Format and validate JSON |
| Development | `/jwtdecoder` | JwtDecoder | Decode JSON Web Tokens |
| Development | `/regexpad` | Regexpad | Test regex and replace text |
| Development | `/urlpad` | Urlpad | URL-encode / decode |
| Development | `/yamljson` | YamlJson | Convert between YAML and JSON |
| Design | `/colory` | Colory | Color picker, palette and WCAG contrast |
| Design | `/gradienty` | Gradienty | CSS gradient generator (linear, radial, conic) |
| Design | `/picky` | Picky | Color eyedropper from an image |
| Design | `/shadowy` | Shadowy | CSS box-shadow generator (multi-layer) |
| Design | `/unity` | Unity | CSS unit converter (px/rem/em/pt/%) |
| Calculators | `/basey` | Basey | Convert between number bases (BigInt) |
| Calculators | `/lapsy` | Lapsy | Time between two dates (live) |
| Calculators | `/timely` | Timely | Convert timestamps and dates |
| Legal | `/privacy` `/terms` `/cookies` | — | Legal pages |

A few tools intentionally appear under more than one category on the
landing page (e.g. `Metaimg` under both *Image editing* and *Privacy*).
The route is the same in both cases.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run generate # static build → dist/
```

Requires Node.js 20 (pinned in `netlify.toml`).

## Documentation

The `docs/` folder contains everything you need to start contributing or
to brief an LLM on the project:

- [`docs/getting-started.md`](docs/getting-started.md) — local setup,
  scripts, build, deploy, common gotchas.
- [`docs/architecture.md`](docs/architecture.md) — stack, folder layout,
  rationale behind the client-side-only constraint.
- [`docs/adding-a-tool.md`](docs/adding-a-tool.md) — step-by-step guide
  to add a new tool from scratch (composable + component + page +
  landing entry + 25 locales).
- [`docs/i18n.md`](docs/i18n.md) — the full locale list, vue-i18n
  pitfalls (the `@`, `{}` and HTML traps) and the parallel-translation
  workflow.
- [`docs/conventions.md`](docs/conventions.md) — naming, tool ordering,
  commit cadence, git flow, branding rules.

## Stack at a glance

- **Nuxt 3 + TypeScript** in SPA mode (`ssr: false`), static-generated
  to `dist/` via `nuxt generate`.
- **Vue 3** with the Composition API and file-based routing.
- **`@nuxtjs/i18n`** with 25 locales lazy-loaded
  (cs, da, de, el, en, es, fi, fr, hi, hu, id, it, ja, ko, nl, no, pl,
  pt, ro, ru, sv, th, tr, vi, zh). Default `es`, fallback `en`.
- **No runtime backend.** Browser APIs (Canvas, Web Crypto, File,
  Web Audio, `Intl`, `BigInt`) plus a handful of small client libraries:
  - `pdf-lib` — Stapler, Scissor, PdfSpinner, Albumy, Metapdf, Markpdf
  - `piexifjs` — Metaimg
  - `js-yaml` — YamlJson
  - `qrcode` — Qrgen
  - `diff` — Diffy
- **Netlify** auto-deploys from the `main` branch (`npm run generate` →
  `dist/`).

## Branches

| Branch | Role |
|---|---|
| `dev` | Default. All day-to-day work happens here. |
| `main` | Production. Netlify watches it. Only receives fast-forward merges from `dev`, by explicit request. |
