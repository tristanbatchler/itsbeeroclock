---
paths:
  - "frontend/**/*"
---

# Frontend rules

## State

- React state is the source of truth, and writing to localStorage doesn't trigger a re-render. Update state, then write to localStorage, then sync to the cloud if needed. `handleToggleFavourite` in `BeerSelector.tsx` is the canonical example.
- Don't call setState directly in a `useEffect` body. To seed a form from async data, extract a child component and change its `key`, as `ProfileForm` does in `Profile.tsx`.
- Put state that reacts to an external change in the hook that owns the data, rather than adding a second effect. `useHistorySync` returns `archives` directly, so `History.tsx` keeps no copy.
- The beer catalogue and profile live in the Zustand store (`src/store/beerStore.ts`), and its actions are stable references. The app doesn't use React Context today. If you add it, wrap any function passed through it in `useCallback`, or effects depending on it will loop.

## Conventions

- Use `useClickOutside(ref, handler, isOpen)` and `useEscapeKey(handler, isOpen)` rather than a raw `useEffect` for those events.
- Wrap BAC and math-heavy components in `<ErrorBoundary>`.
- localStorage keys go in `STORAGE_KEYS` and API routes in `API_ROUTES`, both in `src/lib/constants.ts`. Never inline those strings. The one exception is `vite-ui-theme`, which `index.html` reads before the bundle loads.
- Use `lucide-react` for all icons.
- For notices, add a variant to `VARIANTS` in `ProfileNotice.tsx` rather than creating a new component.

## Intentional choices that look like mistakes

- Theme: `next-themes` was removed on purpose. An inline script in `index.html` applies the theme class before first paint to prevent FOUC, and `AppMenu.tsx` handles toggling. Don't re-add a theme library.
- Beer fetch: `useBeerInit` defers `api.getBeers()` with `requestIdleCallback` to keep it off the critical render path. Don't make it synchronous.
- Service worker: `vite-plugin-pwa` uses `injectRegister: false`, and `main.tsx` registers the worker after `window.load`. Don't re-enable auto-injection, because its synchronous script blocks first render.
- KaTeX: the JS runtime isn't shipped. `src/lib/latexPrerendered.ts` is generated, so don't edit it by hand. To change a formula, update `scripts/prerender-latex.ts`, run `npx tsx scripts/prerender-latex.ts`, and commit the output. Only `Profile.tsx` and `About.tsx` import the KaTeX CSS.

## Traps

- `saveBeers` writes the catalogue cache, and custom beers have their own storage key. Always call `saveBeers(beers.filter(b => !b.isCustom))`.
- The paginated catalogue must be fully loaded on mount. BAC needs every logged drink's beer in `allBeers`, or standard drinks show as 0.0 and the BAC card breaks.
- `useSessionChecker` runs whenever `drinks` changes, so its check has to stay fast and idempotent.
- `handlePurge` in `Profile.tsx` calls `localStorage.clear()` before signing out, so auth handlers can't write keys back. Keep that order.
