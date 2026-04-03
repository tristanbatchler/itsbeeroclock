# Beer O'Clock

Queensland's stupid-simple drink tracker. https://itsbeeroclock.au

## Core principles

- Log the first drink in under 5 seconds
- Must be usable while intoxicated
- Everything opt-in by default
- Built for Queenslanders — not the global market

## Queensland drink sizes

- Pot: 285ml
- Schooner: 425ml
- Pint: 570ml

## Standard drink calculation

`(ml × (abv / 100) × 0.789) / 10`
One Australian standard drink = 10g of alcohol.

## Auth

- Google SSO and email OTP (6-digit code) via Supabase
- Magic link send is proxied through `/api/send-magic-link` (Go Lambda) so Turnstile verification happens server-side before Supabase is called
- OTP length is configured in Supabase dashboard (Auth → Providers → Email → Email OTP length)

## Profile setup

- A user profile record is NOT written to DynamoDB until the user explicitly saves their profile
- `GET /api/profile` returns `{ profileSetup: false }` for new users — no DB write occurs
- `PUT /api/profile` sets `profileSetup: true` server-side regardless of what the client sends
- Frontend gates BAC features on `profile.profileSetup === true`
- `getUserProfile()` in storage.ts rejects any cached profile where `profileSetup !== true`

## Roadmap

### v0.1.0 (current)

Anonymous sessions, drink logging, beer catalogue, BAC estimates, offline-first sync, opt-in accounts, BAC graph, drinking history dashboard, OTP sign-in, Cloudflare Turnstile bot protection

### v0.2.0

Drinking history stats (average consumption, favourite beers, trends)

### v1.0.0

Optional AI session tips, UI polish based on user feedback
