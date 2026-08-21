# Conventions

## Branding

- The site is **Cervantic**.
- The header brand is the literal **"Cervantic WebTools"** — Cervantic in
  the accent colour, WebTools in muted side by side, no separator. The
  second word is a sub-brand for the tools section; other sub-brands may
  exist in the future.
- Tools have one-word, distinctive names. Three styles in use:
  - **Cute diminutives**: Wordy, Hashy, Idkun, Combiny
  - **Office objects**: Stapler, Scissor, Padlock (planned)
  - **`<thing>pad` editors**: Jsonpad, Lorempad, Regexpad
- Pick a style that fits the tool; ask the user before committing to a name.

## Languages

The interface ships in 25 languages (`es` is the default; `en` is the
fallback). Every new string goes into all 25 locale files — typically by
writing a handful manually and farming the rest out to subagents in
parallel. See [`docs/i18n.md`](i18n.md) for the full list and the
practical details.

**The user writes in Spanish; conversations and code comments respond
in Spanish.** Documentation files in `docs/` and `README.md` are in
**English** so the project is approachable to outside contributors.

## Tool ordering on the landing page

Inside each category on `pages/index.vue`, tools are sorted
**alphabetically by translated name** at runtime. You don't need to
order them manually in the array; the sort handles it per language.

## Commits

The project uses short, conventional-ish commit messages:

```
<type>(<scope>): <imperative summary>

Optional body explaining the why or non-obvious decisions.
```

Examples from the history:

- `feat(stapler): unir varios PDFs en uno con pdf-lib`
- `feat(combiny): modo solo-descarga para evitar colapsar la UI`
- `fix(i18n): escapar @ en email con HTML entity para evitar parser de linked messages`
- `feat(brand): Cervantic WebTools`

**Rules:**

- Commit messages are in **Spanish** to match the user's working
  language. (Code, identifiers and docs in `docs/` stay in English.)
- **Never** add yourself as a co-author. No `Co-Authored-By` trailers.
- Commit + push to `dev` after any significant change. Don't batch
  unrelated features into one commit.
- Use `feat` for new functionality, `fix` for bug fixes, `docs` for
  documentation, `chore` for tooling/config. Scope is the tool name or
  area (`i18n`, `brand`, `home`, etc.).

## Git flow

| Branch | What it's for |
|---|---|
| `dev` | Default branch. All day-to-day work, all auto-pushes after each commit. |
| `main` | Production. Netlify watches it. Only receives merges from `dev`. |

**Merging to `main` is user-triggered, always.** Never merge without an
explicit "mergea" / "merge to main" from the user. When merging:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git merge --ff-only dev
git push origin main
git checkout dev
```

Always `--ff-only`. If a fast-forward isn't possible, something has
diverged — stop and figure out why before forcing anything.

## Code style

- **TypeScript** in script setup blocks. Avoid `any`.
- **No comments** describing what the code already says. Only explain
  *why* when the reason isn't obvious from reading the code. No
  multi-line docstrings on simple functions.
- **No new dependencies without asking.** Even small ones. List the
  options with size + licence and let the user pick.
- Prefer browser APIs (`Web Crypto`, `Canvas`, `Intl`, `crypto.randomUUID`)
  over polyfills or libraries.
- Don't add error handling for impossible cases. Trust internal calls
  and framework guarantees. Validate at boundaries only.
- Don't pre-design for hypothetical future tools. The next tool will
  tell you what the abstraction should look like.

## Per-tool checklist

Before considering a tool "done":

- [ ] Composable, component and page files exist.
- [ ] All 25 locales include `tools.<id>.{name,tagline,description}` plus
      every UI string.
- [ ] Entry added to `categoriesRaw` and `toolPaths` in `pages/index.vue`.
- [ ] Dev server loads `/<tool>` without console errors.
- [ ] Language switcher produces no leaked keys.
- [ ] Commit message follows the style above, no co-author trailer.

## Working with the user

When the user is iterating:

- **Suggest 3–4 named alternatives** before naming things (tools,
  categories, sub-brands). The user picks; we don't decide for them.
- **Confirm before installing libraries.** Even if it's obvious. State
  the size, the licence, and the alternative of doing it natively.
- **Explore freely, act with care.** Reads, greps, scaffolds = fine.
  Anything that affects shared state (renaming the repo, merging to
  `main`, force-pushing) gets explicit confirmation per action.
