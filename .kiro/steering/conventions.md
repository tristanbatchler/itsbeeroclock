# Coding Conventions

## Frontend

### State management

- React state is the source of truth. Never read from localStorage to drive renders.
- Update state first → write to localStorage → sync to cloud if needed.
- See handleToggleFavourite in BeerSelector.tsx as the canonical example.

### Context and useCallback

- Any function passed through React Context MUST be wrapped in useCallback with a stable
  dependency array. Failing to do this causes infinite re-render loops.
- See addBeersToStore in BeerContext.tsx as the canonical example.

### Custom hooks for DOM events

- Never write raw useEffect for click-outside or escape key handling.
- Use: useClickOutside(ref, handler, isOpen) and useEscapeKey(handler, isOpen)

### Error boundaries

- Wrap all BAC/math-heavy components in <ErrorBoundary>.
- Currently applied to DrinkLog and the BAC card in Home.tsx.

### Constants

- All localStorage keys live in lib/constants.ts as STORAGE_KEYS.
- All API route strings live in lib/constants.ts as API_ROUTES.
- Never hardcode these strings inline anywhere.

### Icons

- Use lucide-react exclusively. No other icon libraries.

## Backend (Go)

### Handler declaration style

All handlers must be declared as variables, not functions:
var AddDrinkHandler AuthenticatedApiProxyGatewayHandler = func(...) { ... }
Not:
func AddDrinkHandler(...) { ... }
This is required for consistency with the router.go registration pattern.

### API responses

Always use helpers from internal/api/response.go:
JSONResponse(statusCode, data)
ErrorResponse(statusCode, message)
SuccessResponse()
Never construct events.APIGatewayProxyResponse manually in a handler.

### DynamoDB keys

Never use raw strings or fmt.Sprintf for PK/SK values. Use internal/api/keys.go:
UserPK(userID)
DrinkSK(timestamp, drinkID)
CustomBeerSK(beerID)

### Error handling

Never swallow errors. Pattern:
if err != nil {
log.Printf("ContextualName: description: %v", err)
return ErrorResponse(http.StatusInternalServerError, "user-facing message")
}

### Adding a new endpoint

1. Create backend/internal/api/yourfeaturefn.go
2. Add the route to the routes slice in router.go
3. Add the API route string to lib/constants.ts on the frontend
