# Getting started

## Requirements

- **Node.js 20** (pinned via `.nvmrc`; locally any 20.x works).
- **npm** (the project ships a `package-lock.json`).

That's it. No databases, no environment variables, no API keys.

## Install and run

```bash
git clone <url-del-repositorio>
cd webtools
npm install
npm run dev
```

Open <http://localhost:3000>. Hot-reload works for `pages/`, `components/`,
`composables/`, locale JSON files and CSS.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Nuxt dev server (Vite) on port 3000. |
| `npm run build` | Builds the project for SSR. **We don't use this**; we ship a static SPA. |
| `npm run generate` | Static build. Output goes to `dist/` (configured in `nuxt.config.ts`). |
| `npm run preview` | Serves the built output for local verification. |
| `npm run postinstall` | Runs `nuxt prepare` automatically after `npm install`. |
| `npm run typecheck` | Runs `vue-tsc` against the whole project. |

## Building for production

```bash
npm run generate
```

Output: `dist/` — a fully static SPA. Vercel runs this automatically on
every push to `main`. Pushes to `dev` build too, but as previews: only
the production branch is served on the project's own domain.

The relevant config lives in `vercel.json` at the repo root:

```json
{
  "framework": null,
  "installCommand": "npm install",
  "buildCommand": "NITRO_PRESET=static npm run generate",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/200.html" }]
}
```

`NITRO_PRESET=static` is load-bearing. Without it Nitro autodetects its
`vercel` preset from the `VERCEL` env var and writes
`.vercel/output/config.json` declaring one override per prerendered
route, while `nuxt.config.ts` still sends the files to `dist`. Vercel
then serves an empty directory and 404s every path.

The rewrite is the SPA fallback. Vercel checks the filesystem first, so
it only catches paths that weren't prerendered.

## Deploying

You usually don't need to do anything manual. The flow is:

1. Work on the `dev` branch.
2. Push: `git push origin dev` — Vercel builds it as a preview.
3. When ready to release, fast-forward `dev` into `main` and push. This
   is what publishes to production:
   ```bash
   git checkout main
   git merge --ff-only dev
   git push origin main
   git checkout dev
   ```

See [`docs/conventions.md`](conventions.md) for the rules around when to
merge and how to write commits.

## Troubleshooting

**Dev server returns HTTP 500 with a Vite Node IPC error.**
There was a regression in `nuxt@3.21.x`. The project pins `nuxt` to
`~3.20.0` in `package.json` for this reason. If you bump it, retest the
dev server immediately.

**vue-i18n complains about `@`, `{}` or HTML in a message.**
See [`docs/i18n.md`](i18n.md) — there are three known traps and they all
have well-known workarounds.

**Tool routes 404 after a deploy.**
Hard-refresh the browser. The previous bundle is cached and tries to load
chunks that no longer exist.
