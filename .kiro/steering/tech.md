# Tech Stack

## Frontend

- React 19, TypeScript, Vite, Tailwind CSS v4
- State: React Context + useState for local UI state. Zustand for the beer catalogue + profile store (`src/store/beerStore.ts`). No other external state library.
- Auth UI: Supabase JS client (`verifyOtp` for 6-digit OTP flow)
- Bot protection: Cloudflare Turnstile (invisible mode, explicit rendering) — `src/components/Turnstile.tsx`
- Icons: lucide-react only

## Backend

- Go, AWS Lambda (provided.al2023, ARM64)
- Routing: internal declarative route table (not a persistent HTTP server)
- Local dev: custom Go HTTP adapter in cmd/local/main.go that wraps requests into APIGatewayProxyRequest structs
- Auth: Supabase JWTs verified locally via JWKS (ES256)
- Bot protection: Cloudflare Turnstile server-side verification in `internal/api/turnstile.go`

## Database

- DynamoDB single-table design
- PK/SK patterns defined in internal/api/keys.go

### GSIs

| Name | Partition Key | Sort Key      | Purpose                                                                        |
| ---- | ------------- | ------------- | ------------------------------------------------------------------------------ |
| GSI1 | GSI1PK (S)    | GSI1SK (S)    | Beer catalogue scan (KeyCatalog = "CATALOGUE")                                 |
| GSI2 | PK (S)        | Timestamp (N) | Time-range queries on a user's drinks — use `DrinkTimeRangeQuery()` in keys.go |

To query a user's drinks between two epoch-ms timestamps, use GSI2:

```go
expr, vals := DrinkTimeRangeQuery(userID, fromMs, toMs)
dbClient.Query(ctx, &dynamodb.QueryInput{
    TableName:                 TableName(),
    IndexName:                 aws.String(IndexDrinksByTime),
    KeyConditionExpression:    aws.String(expr),
    ExpressionAttributeNames:  map[string]string{"#ts": "Timestamp"},
    ExpressionAttributeValues: vals,
})
```

Note: `Timestamp` is a DynamoDB reserved word — always alias it as `#ts`.

## Infrastructure

- AWS CDK (TypeScript) in infra/cdk/
- CloudFront → API Gateway → Lambda
- CloudFront → S3 for static frontend
- CRITICAL: CloudFront must forward the Authorization header to API Gateway.
  Use originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
  on the /api/\* behavior or authenticated requests will be silently stripped and return 401.

## Environment variables

| Variable                   | Used by         | Purpose                                            |
| -------------------------- | --------------- | -------------------------------------------------- |
| `SUPABASE_URL`             | Backend, CDK    | Supabase project URL                               |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend        | Supabase anon key                                  |
| `SUPABASE_SECRET_KEY`      | Backend         | Supabase service role key (send OTP via Admin API) |
| `TABLE_NAME`               | Backend, CDK    | DynamoDB table name                                |
| `S3_BUCKET`                | Backend, CDK    | Uploads bucket name                                |
| `APP_DOMAIN_NAME`          | Frontend, CDK   | Domain (e.g. itsbeeroclock.au)                     |
| `APP_SUPPORT_EMAIL`        | Frontend        | Support email shown in UI                          |
| `CORS_ORIGIN`              | Backend (local) | Allowed CORS origin for local dev                  |
| `CF_TURNSTILE_SITE_KEY`    | Frontend        | Cloudflare Turnstile site key (baked in at build)  |
| `CF_TURNSTILE_SECRET_KEY`  | Backend, CDK    | Cloudflare Turnstile secret key (Lambda env var)   |

## Image storage

- User custom beer thumbnails: S3 under custom/{userId}/{beerId}/thumb.webp
- Thumbnails are generated client-side (Canvas API, 96×96 WebP) before upload
- Backend receives base64 data URL, decodes it, writes raw bytes to S3
