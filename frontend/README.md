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

### Offline-first

The app queues failed mutations (POST, PUT, DELETE) in `localStorage` and replays them when connectivity returns. `useOnlineStatus` pings `/api/health` every 15 seconds (only when the tab is visible) rather than trusting `navigator.onLine`.

Key rule: **never read from `localStorage` to drive renders**. Update React state first, then persist as a side effect.

### BAC calculations

All BAC math lives in `src/utils/calculations.ts` as pure functions. The formula is Watson's TBW model + a per-drink ledger with 0.015%/hr linear decay. See the "How BAC is calculated" section in the app's Profile page for the full explanation.

`computeBACCurve` samples BAC at 5-minute intervals across a session. When computing a snapshot at time `t`, only drinks logged at or before `t` are included — this prevents future drinks from retroactively shifting the curve.

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
| `src/components/ErrorBoundary.tsx` | Wraps all BAC/math-heavy components                           |

---

## Common gotchas

**`useCallback` in Context** — any function passed through React Context must be wrapped in `useCallback` with a stable dependency array or you'll get infinite re-render loops.

**`localStorage` is not state** — writing to it does not trigger a re-render. Always update React state first.

**Session checker fires on every drink change** — `useSessionChecker` runs immediately when the `drinks` array changes. This is intentional (catches sessions that ended while offline) but means the check logic must be fast and idempotent.

**Custom beer images** — uploaded thumbnails are stored in the `UploadsBucket` S3 bucket and served via CloudFront at `https://{domain}/custom/{userId}/{beerId}/thumb.webp`. The local base64 data URL is used as a fallback until the cloud sync returns the permanent URL, which is then persisted back to `localStorage`.
