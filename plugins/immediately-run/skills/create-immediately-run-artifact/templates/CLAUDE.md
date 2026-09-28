# Working in this repo

A **report-style app**: an immediately.run app whose job is to be read. React +
TypeScript + MDX, transpiled in the browser by immediately.run (no build step
at runtime). It follows `new-project-template`'s rules; the ones that matter
here:

1. **`src/App.tsx` is the entry point.** immediately.run renders its default
   export. `src/main.tsx` is local-only. Never add `"main"` to
   `package.json` — the sandbox bundler would use it as the entry and skip the
   platform boot, and the page renders blank.
2. **Prose lives in `src/content/*.mdx`.** Edit the words there. Components
   are imported at the top of the MDX file.
3. **Structured, repeated records live in `src/data/*.ts`** as typed arrays
   (cards, table rows, stats, the contents list), rendered by a component.
   Don't write them out in MDX, and don't put prose paragraphs in a data file.
4. **One component per file, default-exported**; a component file exports only
   components (types are fine). `npm run lint` enforces it.
5. **Styles use the tokens in `src/index.css`** (`--bg`, `--panel`, `--ink`,
   `--accent`, …). `App.css` holds the layout.
6. **Images are imported** (`import shot from '../assets/x.jpg'`), which the
   bundler inlines. No base64 in source, no server paths.
7. **Theme follows the host** (`useHostTheme` → `<html data-theme>`); there is
   no in-app toggle.
8. **Links:** platform routes use `PlatformLink`; external sites use
   `ExternalLink` (it asks the host to open the tab). In-page `#id` links are
   plain anchors.
9. **Section ids are explicit** (`<Section id="…">`, listed in
   `src/data/sections.ts`). The host's MDX compiler and the local one generate
   heading ids differently, so never link to a heading slug.
10. **MDX is fragile**: a bare `<` or `{` in prose is parsed as JSX or an
    expression and fails the compile. Put code-like text in backticks.

## Verify before you're done

```bash
npm run build && npm run lint
npx @immediately-run/cli dev   # open the printed link; check desktop and ~390px wide
```

<!-- Keep the ONE paragraph below that matches the repo's visibility. -->
The repo is public: `.github/workflows/cache.yml` publishes the cache zip that
immediately.run loads it from.

The repo is private: no GitHub Pages cache (a Pages site would publish it).
immediately.run loads it through the GitHub API for a signed-in user.
