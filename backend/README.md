# Beer O'Clock — Backend

Go service running on AWS Lambda (ARM64, `provided.al2023`), fronted by API Gateway, with DynamoDB for storage and Google sign-in handled by the backend.

## Running locally

```bash
go mod tidy
go run cmd/local/main.go
```

This starts an HTTP server on `:8080` that wraps incoming requests into `APIGatewayProxyRequest` structs, simulating the Lambda environment. The frontend dev server proxies `/api/*` to it automatically.

Required `.env` values for local dev (see `.env.example`):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SESSION_SECRET=         # openssl rand -base64 32
APP_ORIGIN=             # http://localhost:5173
TABLE_NAME=              # from first CDK deploy output
S3_BUCKET=               # UploadsBucketName from first CDK deploy output
APP_DOMAIN_NAME=         # e.g. localhost:5173 (used to build image URLs)
CORS_ORIGIN=             # e.g. http://localhost:5173
```

## Building for Lambda

```bash
./build_lambda.sh
```

Produces `deployment.zip` which the CDK stack uploads to Lambda.

---

## Architecture

### Entrypoints

- `cmd/api/main.go` — production Lambda handler
- `cmd/local/main.go` — local HTTP server (simulates Lambda)
- `cmd/seed/main.go` — fills the beer catalogue, creating the table first on DynamoDB Local. Pass `-prod` to write to the real table
- `cmd/wipeusers/main.go` — deletes all user data and keeps the catalogue, for the Google sign-in cutover. A dry run unless passed `-execute`

### Request flow

```
CloudFront → API Gateway → Lambda → router.go → handler (*fn.go)
```

All routing is a declarative slice in `internal/api/router.go`. To add an endpoint, append a `Route` struct there.

### Auth

The backend runs Google's authorization code flow with PKCE, requesting only `openid`, and uses Google's `sub` as the user ID. No email address is stored.

| Route                       | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `/api/auth/google/start`    | Sets `boc_oauth` (state and verifier), redirects to Google |
| `/api/auth/google/callback` | Exchanges the code, sets `boc_session`, redirects      |
| `/api/auth/session`         | Returns `{ user: { id } }` or `{ user: null }`, always 200 |
| `/api/auth/signout`         | Expires `boc_session`                                  |

`boc_session` is an HS256 JWT in an `httpOnly` cookie signed with `SESSION_SECRET`. It lasts 90 days, and protected routes renew it once it's over a day old. Authenticated routes use `AuthenticatedApiProxyGatewayHandler`, which injects an `AuthContext` (containing `UserID`) into the handler.

Sessions are stateless, so a single session can't be revoked. Rotating `SESSION_SECRET` signs everyone out.

Set cookies with `withCookies`, never in `resp.Headers`. `defaultHeaders` is shared by every response, so a cookie written there could reach another user on a warm Lambda.

For local development, `cmd/local` also offers `GET /api/dev/login?user=alice`, which signs in as `dev-alice` without Google. The Lambda has no such route.

### S3 (custom beer thumbnails)

`internal/api/s3.go` handles thumbnail uploads. The Lambda writes to `UploadsBucket` (injected as `S3_BUCKET` env var by CDK) and returns a CloudFront URL (`https://{APP_DOMAIN_NAME}/custom/{userId}/{beerId}/thumb.webp`). The direct S3 URL is never returned — the bucket is private and only accessible via CloudFront OAC.

---

## Patterns

### Handlers

Declare handlers as variables, not functions:

```go
// correct
var AddDrinkHandler AuthenticatedApiProxyGatewayHandler = func(...) { ... }

// wrong
func AddDrinkHandler(...) { ... }
```

### Responses

Always use helpers from `internal/api/response.go`:

```go
JSONResponse(200, data)
ErrorResponse(400, "bad request")
SuccessResponse(map[string]bool{"success": true})
```

Never construct `events.APIGatewayProxyResponse` manually.

### DynamoDB keys

Never use raw strings or `fmt.Sprintf` for PK/SK values. Use `internal/api/keys.go`:

```go
UserPK(userID)
DrinkSK(timestamp, drinkID)
CustomBeerSK(beerID)
```

### Error handling

Never swallow errors:

```go
if err != nil {
    log.Printf("ContextName: description: %v", err)
    return ErrorResponse(http.StatusInternalServerError, "user-facing message")
}
```

---

## DynamoDB schema

Single-table design. All user data lives under `PK = USER#{userId}`.

| SK prefix                | Data                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| `PROFILE`                | User profile (weight, height, age, sex, optInHistory, profileSetup) |
| `DRINK#{timestamp}#{id}` | Individual drink log entry                                          |
| `CUSTOMBEER#{id}`        | User-uploaded custom beer                                           |
| `HISTORY#{timestamp}`    | Archived session                                                    |

### Profile record

`profileSetup` (bool) is always `false` on the default record returned by `GET /api/profile` for new users. It is forced to `true` by `UpdateProfileHandler` on any `PUT /api/profile`. The frontend uses this flag to gate BAC features and nag users who haven't set up their profile.

### GSIs

| Index | PK       | SK              | Purpose                                          |
| ----- | -------- | --------------- | ------------------------------------------------ |
| GSI1  | `GSI1PK` | `GSI1SK`        | Beer catalogue scan (`KeyCatalog = "CATALOGUE"`) |
| GSI2  | `PK`     | `Timestamp` (N) | Time-range queries on a user's drinks            |

For GSI2 queries, use `DrinkTimeRangeQuery()` from `keys.go`. Note: `Timestamp` is a DynamoDB reserved word — always alias it as `#ts` in expressions.

---

## Common gotchas

**CORS in local dev** — `cmd/local/main.go` reads `CORS_ORIGIN` from `.env`, defaulting to `http://localhost:5173`. If your frontend runs on a different port, update `.env`.

**No default HTTP client timeouts** — always set a timeout on external calls, such as the Google token exchange:

```go
&http.Client{Timeout: 5 * time.Second}
```

**`DeleteItem` always returns 200** — even if the item didn't exist. Use `ConditionExpression: attribute_exists(PK)` if you need to confirm existence. `DeleteDrinkHandler` does not currently do this.

**Single-table purges** — deleting a profile record does not delete drinks or custom beers. `ClearUserDataHandler` queries all items under the user's PK and batch-deletes them in chunks of 25 (DynamoDB batch limit).

**`S3_BUCKET` in local dev** — in production this is injected by CDK automatically. For local dev, set it in `.env` to the `UploadsBucketName` value from your CDK deploy output.

**Profile is never written on GET** — `GetProfileHandler` returns defaults with `profileSetup: false` for new users but does NOT write to DynamoDB. Only `UpdateProfileHandler` creates the record.
