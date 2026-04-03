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

Tests use Vitest + jsdom + Testing Library + fast-check (property-based tests). The test suite runs automatically after each completed agent task via a Kiro hook.

---

## Architecture

### State management

- **Beer catalogue + profile** — Zustand store (`src/store/beerStore.ts`). Profile lives here so Home and Profile pages share one instance without prop drilling.
- **Current session drinks** — `useSession` hook, backed by `localStorage`.
- **History archives** — owned by `useHistorySync`, which returns `{ isSyncing, archives }` directly. No secondary effect needed to re-read localStorage after sync.
- **Everything else** — local `useState`.

### Auth flow

Sign-in uses Supabase email OTP (6-digit code). The magic link send is proxied through `/api/send-magic-link` on the Go backend, which verifies a Cloudflare Turnstile token before calling the Supabase Admin API. This keeps the Supabase service role key server-side and gates email sending behind bot protection.

After sending, `SignIn.tsx` shows a 6-cell OTP input. On completion it calls `supabase.auth.verifyOtp()` directly. On success, `onAuthStateChange` fires and the app reacts automatically.

### Profile setup gate

A new user's profile is not written to DynamoDB until they explicitly save it. `GET /api/profile` returns `{ profileSetup: false }` for new users. The frontend:

- Hides BAC card, BAC graph, and BAC stats when `profile.profileSetup !== true`
- Shows `<ProfileNotice variant="incomplete">` to nag signed-in users who haven't set up their profile
- `getUserProfile()` in `storage.ts` rejects any cached profile where `profileSetup !== true`
- `ProfileForm` uses a `key` prop so it remounts with correct initial values when the cloud profile loads

### Turnstile

`Turnstile.tsx` uses explicit rendering (required for React SPAs). When `CF_TURNSTILE_SITE_KEY` is not set (local dev), it immediately calls `onSuccess("dev-bypass")` and renders nothing. In production it runs invisibly — no visible widget.

### Theme

Theme switching (light/dark) is managed without any external library. The inline script in `index.html` reads `localStorage` on page load to apply the correct class before first paint, preventing FOUC. The `AppMenu` component manages toggling via `localStorage` + `document.documentElement.classList`.

### Offline-first

The app queues failed mutations (POST, PUT, DELETE) in `localStorage` and replays them when connectivity returns. `useOnlineStatus` pings `/api/health` every 15 seconds (only when the tab is visible) rather than trusting `navigator.onLine`.

Key rule: **never read from `localStorage` to drive renders**. Update React state first, then persist as a side effect.

### Service worker

The service worker is registered manually in `main.tsx` after the `window.load` event to avoid blocking the initial render. `vite-plugin-pwa` is configured with `injectRegister: false` — it generates `sw.js` and `workbox-*.js` but does not inject a synchronous `<script>` tag into the HTML.

### BAC calculations

All BAC math lives in `src/utils/calculations.ts` as pure functions. The formula is Watson's TBW model + a per-drink ledger with 0.015%/hr linear decay. See the "How BAC is calculated" section in the app's Profile page for the full explanation.

`computeBACCurve` samples BAC at 5-minute intervals across a session. When computing a snapshot at time `t`, only drinks logged at or before `t` are included — this prevents future drinks from retroactively shifting the curve.

### KaTeX formulas

The Profile page displays BAC formula explanations using KaTeX. To avoid shipping the KaTeX JS runtime (~500 KB), formulas are **pre-rendered to static HTML at build time** by `scripts/prerender-latex.ts`. The output is committed to `src/lib/latexPrerendered.ts`. The `Latex` component simply injects the pre-rendered HTML. KaTeX CSS is imported only in `Profile.tsx`.

If you change a formula, re-run:

```bash
npx tsx scripts/prerender-latex.ts
```

### History skeletons

`History.tsx` uses `SessionCardSkeleton` instead of a spinner. When syncing with existing local archives, skeletons replace the real cards in-place so there's no layout shift when remote data arrives.

---

## Key files

| File                                     | Purpose                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `src/store/beerStore.ts`                 | Zustand store: beer catalogue, profile, loading state             |
| `src/lib/api.ts`                         | All HTTP calls, offline queue, token refresh                      |
| `src/hooks/useSession.ts`                | Local drinks array for the current session                        |
| `src/hooks/useProfile.ts`                | Fetches cloud profile on sign-in, syncs to Zustand + localStorage |
| `src/hooks/useHistorySync.ts`            | History hydration from remote, owns archives state                |
| `src/utils/calculations.ts`              | Pure BAC math (Watson formula, ledger method, curve sampling)     |
| `src/utils/sessionArchive.ts`            | Session archiving, peak BAC, history read/write, merge            |
| `src/utils/storage.ts`                   | localStorage helpers; getUserProfile rejects profileSetup=false   |
| `src/lib/constants.ts`                   | All storage keys and API routes                                   |
| `src/lib/latexPrerendered.ts`            | Auto-generated pre-rendered KaTeX HTML (do not edit manually)     |
| `src/components/Turnstile.tsx`           | Cloudflare Turnstile widget (invisible, explicit rendering)       |
| `src/components/ProfileNotice.tsx`       | Unified notice for unauthenticated + incomplete profile states    |
| `src/components/SessionCardSkeleton.tsx` | Skeleton placeholder for history cards during sync                |
| `src/components/ErrorBoundary.tsx`       | Wraps all BAC/math-heavy components                               |
| `src/components/AppMenu.tsx`             | Theme toggle (light/dark) via localStorage                        |
| `scripts/prerender-latex.ts`             | Build-time KaTeX pre-renderer                                     |
| `scripts/generate-thumbs.ts`             | Build-time WebP thumbnail generator for beer images               |

---

## Common gotchas

**Profile form seeding** — `ProfileForm` is a child component with a `key` prop. When the cloud profile loads after mount, changing the key remounts the form with correct initial values. Do not use `useEffect` + `setState` to sync form fields from async data.

**`localStorage` is not state** — writing to it does not trigger a re-render. Always update React state first.

**History archives live in the hook** — `useHistorySync` owns `archives` state and returns it. `History.tsx` does not maintain its own archives state or re-read localStorage after sync.

**Turnstile tokens are single-use** — after any error, set `turnstileToken` to null so the widget re-challenges. Never retry with the same token.

**Session checker fires on every drink change** — `useSessionChecker` runs immediately when the `drinks` array changes. The check logic must be fast and idempotent.

**KaTeX formulas are static** — `src/lib/latexPrerendered.ts` is auto-generated. Do not edit it manually.

**Beer fetch is deferred** — `useBeerInit` wraps `api.getBeers()` in `requestIdleCallback`. This is intentional for LCP performance. Do not make it synchronous.
