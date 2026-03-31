This document outlines the architecture, patterns, and standards for the Beer O'Clock backend. The backend is a Go service designed to run on AWS Lambda, interfacing with API Gateway, DynamoDB, and Supabase (for JWT authentication).

## Architecture Overview

The application follows a serverless pattern. Instead of a persistent HTTP server, AWS Lambda executes our code per request via API Gateway.

- **Entrypoints:** `cmd/api/main.go` is the production entrypoint for AWS Lambda. `cmd/local/main.go` is a custom local development server that wraps standard HTTP requests into `events.APIGatewayProxyRequest` structs to simulate the Lambda environment locally.
- **Routing:** All routing is handled internally by a declarative route table in `internal/api/router.go`.
- **Data Store:** We use a single-table DynamoDB design.
- **Auth:** JWTs are issued by Supabase and verified locally using Supabase's public JWKS endpoint.

## Core Patterns and Best Practices

**1. Routing and Handlers**
Routes are defined in the `routes` slice within `internal/api/router.go`. To add a new endpoint, append a `Route` struct to this slice.
All handlers must conform to the `ApiProxyGatewayHandler` or `AuthenticatedApiProxyGatewayHandler` signature. We declare handlers as variables rather than standard functions to maintain consistency (e.g., `var AddDrinkHandler AuthenticatedApiProxyGatewayHandler = func(...)`).

**2. API Responses**
Always use the helper functions in `internal/api/response.go` (`JSONResponse`, `ErrorResponse`, `SuccessResponse`). These handle JSON marshaling and inject the required headers (like `Content-Type: application/json`). Do not manually construct `events.APIGatewayProxyResponse` structs in your handlers.

**3. DynamoDB Key Generation**
Do not use raw strings or `fmt.Sprintf` to construct partition keys (PK) or sort keys (SK). Use the centralized constants and helper functions in `internal/api/keys.go` (e.g., `UserPK(userID)` and `DrinkSK(timestamp, drinkID)`). This ensures schema consistency and makes refactoring easier.

**4. Error Handling**
Do not swallow errors. If a database operation or unmarshaling fails, log the internal error for debugging and return an appropriate HTTP status code to the client using `ErrorResponse(statusCode, message)`.

## Common Gotchas and Anti-Patterns

**1. Local Development CORS**
When running `cmd/local/main.go`, the server reads the `CORS_ORIGIN` environment variable to set headers. If this is not set in your `.env` file, it defaults to `http://localhost:5173`. If you are running the frontend on a different port, API requests will fail with CORS errors unless you update the local environment variable.

**2. Missing Timeouts on External Calls**
Never use the default HTTP client for external network calls (such as fetching the JWKS for auth verification). The default client has no timeout, which can cause the Lambda function to hang indefinitely and rack up AWS billing costs. Always specify a timeout (e.g., `&http.Client{Timeout: 5 * time.Second}`).

**3. Unverified Database Deletions**
DynamoDB's `DeleteItem` operation will return a 200 OK even if the item does not exist. If you need to ensure an item exists before deleting or modifying it, you must use a `ConditionExpression` (e.g., `attribute_exists(PK)`). See `deletedrinkfn.go` for the implementation.

**4. Incomplete Data Purges**
When deleting user data, remember that we use a single-table design. Deleting the user's profile record does not delete their associated data records. You must query all items matching the user's partition key and utilize `BatchWriteItem` to clear the data. See `ClearUserDataHandler` for the chunking logic required to handle DynamoDB's 25-item batch limit.
