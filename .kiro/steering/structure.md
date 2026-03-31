# Project Structure

```
itsbeeroclock/
├── frontend/src/
│   ├── contexts/        # BeerContext.tsx — beer catalogue shared state
│   ├── hooks/           # useBAC, useSession, useOnlineStatus, useClickOutside, useEscapeKey
│   ├── lib/             # api.ts (all API calls + offline queue), constants.ts, supabase.ts
│   ├── pages/           # Route-level components: Home, Profile, History, AddBeer, SignIn
│   ├── components/      # Reusable UI: Button, Card, Modal, BeerSelector, DrinkLog, etc.
│   ├── utils/           # calculations.ts (pure BAC math), storage.ts, image.ts, time.ts
│   └── types/           # drinks.ts (shared TypeScript types)
├── backend/
│   ├── cmd/api/         # Lambda production entrypoint
│   ├── cmd/local/       # Local dev server (simulates Lambda environment)
│   └── internal/api/    # handlers (*fn.go), router.go, response.go, keys.go, auth.go, s3.go
├── infra/cdk/           # AWS CDK stack
└── .env                 # Local environment variables (never committed)
```

## Key files

- `BeerContext.tsx` — beer catalogue, pagination, custom beer merging
- `api.ts` — all HTTP calls, offline queue, token refresh
- `useSession.ts` — local drinks array for current session
- `calculations.ts` — BAC math, standard drinks, time-to-sober (pure functions, easy to test)
- `constants.ts` — ALL storage keys and API routes. Add new keys here or the data purge breaks.
- `response.go` — ALL API responses must go through this
- `keys.go` — ALL DynamoDB PK/SK construction must go through this
- `router.go` — add new endpoints here as a Route struct
