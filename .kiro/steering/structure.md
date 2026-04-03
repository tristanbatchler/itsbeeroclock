# Project Structure

```
itsbeeroclock/
├── frontend/src/
│   ├── hooks/           # useBAC, useSession, useOnlineStatus, useClickOutside, useEscapeKey, useProfile, useHistorySync
│   ├── lib/             # api.ts (all API calls + offline queue), constants.ts, supabase.ts, latexPrerendered.ts
│   ├── pages/           # Route-level components: Home, Profile, History, AddBeer, SignIn
│   ├── components/      # Reusable UI: Button, Card, Modal, BeerSelector, DrinkLog, Turnstile, ProfileNotice, etc.
│   ├── store/           # beerStore.ts — Zustand store for beer catalogue + profile
│   ├── utils/           # calculations.ts (pure BAC math), storage.ts, image.ts, time.ts, sessionArchive.ts
│   └── types/           # drinks.ts (shared TypeScript types)
├── frontend/scripts/
│   ├── prerender-latex.ts   # Build-time KaTeX pre-renderer → src/lib/latexPrerendered.ts
│   └── generate-thumbs.ts   # Build-time WebP thumbnail generator for beer images
├── backend/
│   ├── cmd/api/         # Lambda production entrypoint
│   ├── cmd/local/       # Local dev server (simulates Lambda environment)
│   └── internal/api/    # handlers (*fn.go), router.go, response.go, keys.go, auth.go, s3.go, turnstile.go
├── infra/cdk/           # AWS CDK stack
└── .env                 # Local environment variables (never committed)
```

## Key files

- `beerStore.ts` — Zustand store: beer catalogue, profile, loading state. Profile lives here so Home and Profile share one instance.
- `api.ts` — all HTTP calls, offline queue, token refresh
- `useSession.ts` — local drinks array for current session
- `useProfile.ts` — fetches cloud profile on sign-in, writes to Zustand store and localStorage
- `useHistorySync.ts` — hydrates history from remote on sign-in, owns the `archives` state, POSTs new archives
- `calculations.ts` — BAC math, standard drinks, time-to-sober (pure functions, easy to test)
- `sessionArchive.ts` — session archiving, peak BAC, history read/write, merge logic
- `storage.ts` — localStorage helpers. `getUserProfile()` rejects profiles where `profileSetup !== true`.
- `constants.ts` — ALL storage keys and API routes. Add new keys here or the data purge breaks.
- `latexPrerendered.ts` — auto-generated pre-rendered KaTeX HTML. Do not edit manually.
- `AppMenu.tsx` — theme toggle (light/dark) via localStorage + classList. No external theme library.
- `Turnstile.tsx` — Cloudflare Turnstile widget (invisible, explicit rendering). Auto-passes when `CF_TURNSTILE_SITE_KEY` is unset (local dev).
- `ProfileNotice.tsx` — unified notice component for unauthenticated and incomplete-profile states.
- `SessionCardSkeleton.tsx` — skeleton placeholder for history cards during sync.
- `response.go` — ALL API responses must go through this
- `keys.go` — ALL DynamoDB PK/SK construction must go through this
- `router.go` — add new endpoints here as a Route struct
- `turnstile.go` — `verifyTurnstile()` helper for server-side Cloudflare verification
- `sendmagiclink.go` — `/api/send-magic-link` handler: verifies Turnstile then calls Supabase Admin API to send OTP
