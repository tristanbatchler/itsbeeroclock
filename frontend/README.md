# Beer O'Clock — Frontend

React 19 + TypeScript + Vite + Tailwind CSS v4. Offline-first, mobile-first, Queensland-first.

## Running locally

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to `http://localhost:8080` (the local Go backend). Make sure the backend is running first.

## Building for production

```bash
npm run build
```

The build pipeline runs in order:

1. `tsc -b` — TypeScript type check
2. `tsx scripts/prerender-latex.ts` — pre-renders KaTeX formulas to static HTML (eliminates KaTeX JS runtime from bundle)
3. `tsx scripts/generate-thumbs.ts` — generates WebP thumbnails for beer images
4. `vite build` — bundles and outputs to `dist/`

Output goes to `dist/`. The CDK stack picks this up automatically during `cdk deploy`.

## Running tests

```bash
npx vitest run
```

Tests use Vitest + jsdom + Testing Library + fast-check (property-based tests).

---

## Architecture

### State management

- **Beer catalogue** — Zustand store (`src/store/beerStore.ts`). Stable action references by default, no `useCallback` needed for store actions.
- **Current session drinks** — `useSession` hook, backed by `localStorage`.
- **Everything else** — local `useState` / `useReducer`.

React Context is used only for things that genuinely need to be shared across the whole tree without prop drilling.

### Theme

Theme switching (light/dark) is managed without any external library. The inline script in `index.html` reads `localStorage` on page load to apply the correct class before first paint, preventing FOUC. The `AppMenu` component manages toggling via a simple `localStorage` + `document.documentElement.classList` pattern.

### Offline-first

The app queues failed mutations (POST, PUT, DELETE) in `localStorage` and replays them when connectivity returns. `useOnlineStatus` pings `/api/health` every 15 seconds (only when the tab is visible) rather than trusting `navigator.onLine`.

Key rule: **never read from `localStorage` to drive renders**. Update React state first, then persist as a side effect.

### Service worker

The service worker is registered manually in `main.tsx` after the `window.load` event to avoid blocking the initial render. `vite-plugin-pwa` is configured with `injectRegister: false` — it generates `sw.js` and `workbox-*.js` but does not inject a synchronous `<script>` tag into the HTML.

### BAC calculations

All BAC math lives in `src/utils/calculations.ts` as pure functions. The formula is Watson's TBW model + a per-drink ledger with 0.015%/hr linear decay. See the "How BAC is calculated" section in the app's Profile page for the full explanation.

`computeBACCurve` samples BAC at 5-minute intervals across a session. When computing a snapshot at time `t`, only drinks logged at or before `t` are included — this prevents future drinks from retroactively shifting the curve.

### KaTeX formulas

The Profile page displays BAC formula explanations using KaTeX. To avoid shipping the KaTeX JS runtime (~500 KB) and its fonts to every user, formulas are **pre-rendered to static HTML at build time** by `scripts/prerender-latex.ts`. The output is committed to `src/lib/latexPrerendered.ts`. The `Latex` component simply injects the pre-rendered HTML — no KaTeX JS runs in the browser. KaTeX CSS (and its fonts) is imported only in `Profile.tsx` so it only loads when the Profile page is visited.

If you change a formula, re-run:

```bash
npx tsx scripts/prerender-latex.ts
```

### Bundle structure

| Chunk           | Contents                          | Size (gzip) |
| --------------- | --------------------------------- | ----------- |
| `index-*.js`    | React, app shell, hooks, contexts | ~81 KB      |
| `supabase-*.js` | `@supabase/supabase-js`           | ~51 KB      |
| `Home-*.js`     | Home page                         | ~10 KB      |
| `Profile-*.js`  | Profile page (no KaTeX JS)        | ~4 KB       |
| Other routes    | Lazy-loaded per page              | <3 KB each  |

### Custom hooks

Don't write raw `useEffect` for DOM events. Use:

- `useClickOutside(ref, handler, isOpen)`
- `useEscapeKey(handler, isOpen)`

### Constants

All `localStorage` keys live in `src/lib/constants.ts` as `STORAGE_KEYS`. All API route strings live there too as `API_ROUTES`. Never hardcode these inline — the "Purge All Data" function iterates `STORAGE_KEYS` to clear everything.

---

## Key files

| File                               | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `src/store/beerStore.ts`           | Zustand store: beer catalogue, profile, loading state         |
| `src/lib/api.ts`                   | All HTTP calls, offline queue, token refresh                  |
| `src/hooks/useSession.ts`          | Local drinks array for the current session                    |
| `src/utils/calculations.ts`        | Pure BAC math (Watson formula, ledger method, curve sampling) |
| `src/utils/sessionArchive.ts`      | Session archiving, peak BAC, history read/write               |
| `src/lib/constants.ts`             | All storage keys and API routes                               |
| `src/lib/latexPrerendered.ts`      | Auto-generated pre-rendered KaTeX HTML (do not edit manually) |
| `src/components/ErrorBoundary.tsx` | Wraps all BAC/math-heavy components                           |
| `src/components/AppMenu.tsx`       | Theme toggle (light/dark) via localStorage                    |
| `scripts/prerender-latex.ts`       | Build-time KaTeX pre-renderer                                 |
| `scripts/generate-thumbs.ts`       | Build-time WebP thumbnail generator for beer images           |

---

## Common gotchas

**`useCallback` in Context** — any function passed through React Context must be wrapped in `useCallback` with a stable dependency array or you'll get infinite re-render loops.

**`localStorage` is not state** — writing to it does not trigger a re-render. Always update React state first.

**Session checker fires on every drink change** — `useSessionChecker` runs immediately when the `drinks` array changes. This is intentional (catches sessions that ended while offline) but means the check logic must be fast and idempotent.

**Custom beer images** — uploaded thumbnails are stored in the `UploadsBucket` S3 bucket and served via CloudFront at `https://{domain}/custom/{userId}/{beerId}/thumb.webp`. The local base64 data URL is used as a fallback until the cloud sync returns the permanent URL, which is then persisted back to `localStorage`.

**KaTeX formulas are static** — `src/lib/latexPrerendered.ts` is auto-generated. Do not edit it manually. If you add or change a formula, update `scripts/prerender-latex.ts` and re-run it.

**Beer fetch is deferred** — `useBeerInit` wraps `api.getBeers()` in `requestIdleCallback` (with a `setTimeout(0)` fallback for Safari) so it does not run before first paint. This is intentional for LCP performance.
