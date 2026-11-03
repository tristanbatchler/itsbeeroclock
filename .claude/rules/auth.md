---
paths:
  - "frontend/src/pages/SignIn.tsx"
  - "frontend/src/hooks/useAuth.ts"
  - "frontend/src/store/authStore.ts"
  - "frontend/src/lib/api.ts"
  - "backend/internal/api/auth.go"
  - "backend/internal/api/googleauthfn.go"
  - "backend/internal/api/sessionfn.go"
  - "backend/internal/api/response.go"
  - "backend/cmd/local/main.go"
---

# Auth rules

## Sign-in flow

- The backend runs Google's authorization code flow with PKCE, as a full-page redirect. No Google script runs on our pages, and the app contacts no Google domain until the user presses "Continue with Google".
- The only scope is `openid`. The user ID is Google's `sub`. Never store or log an email address, name or picture.
- `redirect_uri` comes from `APP_ORIGIN`, never from the request, because CloudFront replaces `Host` on `/api/*`.
- Logs record failure reasons only, never codes, tokens or cookie values. API Gateway data tracing stays off for the same reason.
- The installed iOS PWA doesn't attempt sign-in and shows a message about Safari, by decision. See `docs/specs/google-auth/design.md`.

## Sessions

- `boc_session` is an HS256 JWT in an `httpOnly` cookie, lasting 90 days and renewed by protected routes once it's over a day old.
- Sessions are stateless, so one can't be revoked server-side. Rotating `SESSION_SECRET` signs everyone out.
- **Cookies go in `MultiValueHeaders` only, through `withCookies`.** `defaultHeaders` is one map shared by every response, so writing a cookie there could send one user's session to the next request on a warm Lambda.
- `SameSite=Lax` is the CSRF protection, so no protected GET route may change state.

## Frontend

- JavaScript can't read or clear the session cookie. The Signed_In_Hint in localStorage only shows the signed-in UI offline, and grants no access.
- A failed session check must not sign anyone out. Only a 200 with `null` or a 401 does.
- `user` is an effect dependency in `useProfileInit`, `useCloudSync` and `useHistorySync`, so the store keeps the same object while the ID is unchanged.
- An expired session keeps the offline queue. Only a successful sign-out clears it.
- `api.clearUserData` is never queued. A failed purge reports an error, so it mustn't run later on its own.

## Dev_Login

`/api/dev/login` is registered by `cmd/local` only when `-prod` isn't passed, and never in the shared `routes` table. A test confirms that the Lambda's `Router` returns 404 for it.
