# Beer O'Clock

Queensland drink tracker: React frontend, Go on AWS Lambda, DynamoDB, Supabase auth. Live at https://itsbeeroclock.au.
Setup and architecture for humans are in `README.md`, `frontend/README.md`, `backend/README.md` and `infra/cdk/README.md`.

## Commands

Run Go and Node through `mise exec --`, which uses the versions pinned in `mise.toml`. The bare `go` and `node` on this machine are newer, and the mismatch can fail with `compile: version ... does not match go tool version`.

- Frontend tests: `cd frontend && mise exec -- npm test`
- One test file: `cd frontend && mise exec -- npx vitest run src/utils/__tests__/calculations.test.ts`
- Typecheck: `cd frontend && mise exec -- npx tsc -b`
- Lint: `cd frontend && mise exec -- npm run lint`
- Backend check: `cd backend && mise exec -- go vet ./...` (there are no Go tests yet)
- Infra check: `cd infra/cdk && mise exec -- npx cdk diff` (`infra/cdk/test/` is only a placeholder). This needs admin credentials, so ask the user to run it.
- Local dev: `cd backend && mise exec -- go run cmd/local/main.go` (port 8080), then `cd frontend && mise exec -- npm run dev` (port 5173, proxies `/api/*` to the backend)

## Deploys

- Pushing to `master` deploys to production through GitHub Actions.
- `npm run deploy` runs `cdk deploy` with `--require-approval never`, and `infra/cdk/bin/cdk.ts` prefers `.env.prod` over `.env`.
- Don't push to `master` or deploy unless asked.

## Environment

All three packages read `.env` from the repo root. Production builds and CDK prefer `.env.prod`. Neither file is committed.

- Claude Code runs with `AWS_PROFILE=beeroclock-agent` here, set in `.claude/settings.json`. That profile is read-only and can't read DynamoDB items, so the local backend gets access errors on data routes.
- `TABLE_NAME` in the local `.env` is the production table, so don't run the local backend or seed script with other credentials.
- `.claude/settings.json` and `.claude/hooks/block-env-reads.sh` block Claude from reading `.env*`. Ask the user for any value you need.

## Product rules

- Logging the first drink takes under 5 seconds, and the app has to be usable while intoxicated.
- Every feature is opt-in by default.
- The app is built for Queenslanders, not a global market. Sizes are pot (285ml), schooner (425ml) and pint (570ml).

## Profile setup gate

This spans the frontend and backend:

- `GET /api/profile` returns defaults with `profileSetup: false` for new users and writes nothing to DynamoDB.
- Only `PUT /api/profile` creates the record, and it forces `profileSetup: true` whatever the client sends.
- The frontend gates BAC features on `profile.profileSetup === true`.
- Don't pre-fill profile form fields with defaults. Blank fields tell the user that setup is still needed.

## Specs

- Feature specs live in `docs/specs/<feature>/` as `requirements.md`, `design.md` and `tasks.md`. Run `/spec <feature>` to write a new one.
- Specs record intent at the time of writing, so the code wins if they disagree. The `notes-checkin` feature has shipped, but its `tasks.md` boxes were never ticked.
- `docs/specs/` is gitignored apart from `bac-graph`, so search it by explicit path.
