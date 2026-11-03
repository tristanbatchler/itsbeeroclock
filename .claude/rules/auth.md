---
paths:
  - "frontend/src/components/Turnstile.tsx"
  - "frontend/src/pages/SignIn.tsx"
  - "frontend/src/pages/AuthCallback.tsx"
  - "frontend/src/lib/supabase.ts"
  - "frontend/src/hooks/useAuth.ts"
  - "backend/internal/api/auth.go"
  - "backend/internal/api/turnstile.go"
  - "backend/internal/api/sendmagiclink.go"
---

# Auth and Turnstile rules

## Sign-in flow

- OTP sends go through `POST /api/send-magic-link`, which verifies Turnstile server-side before calling the Supabase Admin API. This keeps `SUPABASE_SECRET_KEY` off the client.
- Public endpoints that trigger expensive work, such as sending email, must call `verifyTurnstile` before doing anything else.
- The OTP input has 6 cells hardcoded, and the length must match Supabase Dashboard → Auth → Providers → Email → Email OTP length.

## Turnstile

- Tokens are single-use. After a failed attempt, set `turnstileToken` to null so the widget re-challenges, and never retry with the same token.
- Invisible mode is set in the Cloudflare dashboard. Don't pass `size: "invisible"` to `turnstile.render()`, because it throws a `TurnstileError`.
- There is no local-dev bypass, so `.env` needs Cloudflare's test pair, and the two keys must be used together:

  ```
  CF_TURNSTILE_SITE_KEY=1x00000000000000000000AA
  CF_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
  ```

  The real site key on localhost gives error 110200 (hostname not allowed). The real secret with the test site key gives `invalid-input-response`.

## Known noise

The gotrue-js warning "Session as retrieved from URL was issued in the future" comes from clock skew and is cosmetic. It doesn't cause 401s. Those usually come from CloudFront stripping `Authorization`, as described in `.claude/rules/infra.md`.
