---
paths:
  - "backend/**/*"
---

# Backend rules

## Handlers

- Declare handlers as variables, to match the route table in `router.go`:

  ```go
  var AddDrinkHandler AuthenticatedApiProxyGatewayHandler = func(...) { ... }
  ```

- Return responses through `JSONResponse`, `ErrorResponse` or `SuccessResponse` from `internal/api/response.go`. Never build `events.APIGatewayProxyResponse` by hand in a handler.
- Don't swallow errors. Log and return a user-facing message:

  ```go
  if err != nil {
      log.Printf("ContextualName: description: %v", err)
      return ErrorResponse(http.StatusInternalServerError, "user-facing message")
  }
  ```

- External HTTP calls need a client with a timeout, such as `&http.Client{Timeout: 5 * time.Second}`. The default client has none and can hang the Lambda.

## Adding an endpoint

1. Create `internal/api/yourfeaturefn.go`.
2. Add the route to the `routes` slice in `router.go`.
3. Add the route string to `API_ROUTES` in `frontend/src/lib/constants.ts`.

## DynamoDB

- Build PK and SK values with the helpers in `internal/api/keys.go`, never with raw strings or `fmt.Sprintf`.
- Query a user's drinks by time range with `DrinkTimeRangeQuery()` on `IndexDrinksByTime` (GSI2). `Timestamp` is a reserved word, so alias it as `#ts`.
- `DeleteItem` returns 200 even if the item didn't exist. Add `ConditionExpression: attribute_exists(PK)` when you need to know. `DeleteDrinkHandler` doesn't currently do this.
- Deleting a profile record leaves the user's other items behind. `ClearUserDataHandler` queries everything under the user's PK, deletes their custom beer thumbnails from S3, and batch-deletes in chunks of 25, the DynamoDB batch limit. Thumbnails go first, because their keys come from those items.
