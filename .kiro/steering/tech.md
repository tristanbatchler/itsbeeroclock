# Tech Stack

## Frontend

- React 19, TypeScript, Vite, Tailwind CSS v4
- State: React Context + useState for local UI state. Zustand for the beer catalogue store (`src/store/beerStore.ts`). No other external state library.
- Auth UI: Supabase JS client
- Icons: lucide-react only

## Backend

- Go, AWS Lambda (provided.al2023, ARM64)
- Routing: internal declarative route table (not a persistent HTTP server)
- Local dev: custom Go HTTP adapter in cmd/local/main.go that wraps requests into APIGatewayProxyRequest structs
- Auth: Supabase JWTs verified locally via JWKS (ES256)

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

## Image storage

- User custom beer thumbnails: S3 under custom/{userId}/{beerId}/thumb.webp
- Thumbnails are generated client-side (Canvas API, 96×96 WebP) before upload
- Backend receives base64 data URL, decodes it, writes raw bytes to S3
