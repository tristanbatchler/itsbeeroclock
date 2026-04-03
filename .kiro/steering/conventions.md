# Coding Conventions

## Frontend

### State management

- React state is the source of truth. Never read from localStorage to drive renders.
- Update state first → write to localStorage → sync to cloud if needed.
- See handleToggleFavourite in BeerSelector.tsx as the canonical example.

### Context and useCallback

- Any function passed through React Context MUST be wrapped in useCallback with a stable
  dependency array. Failing to do this causes infinite re-render loops.
- Zustand actions are stable by default — no useCallback needed for store actions.

### Custom hooks for DOM events

- Never write raw useEffect for click-outside or escape key handling.
- Use: useClickOutside(ref, handler, isOpen) and useEscapeKey(handler, isOpen)

### Avoiding setState in effects

- Do not call setState directly inside a useEffect body — the linter will flag it.
- To seed form state from async data (e.g. cloud profile arriving after mount), extract the
  form into a child component and use a `key` prop on it. When the key changes, React remounts
  the component with fresh initial state. See `ProfileForm` in `Profile.tsx` as the canonical example.
- For effects that genuinely react to external system changes (e.g. re-reading localStorage
  after a sync completes), move the state into the hook that owns the data instead of using
  a secondary effect. See `useHistorySync` returning `archives` directly.

### Error boundaries

- Wrap all BAC/math-heavy components in <ErrorBoundary>.
- Currently applied to DrinkLog, BACCard, and BACGraph in Home.tsx.

### Constants

- All localStorage keys live in lib/constants.ts as STORAGE_KEYS.
- All API route strings live in lib/constants.ts as API_ROUTES.
- Never hardcode these strings inline anywhere.

### Icons

- Use lucide-react exclusively. No other icon libraries.

### Theme

- No external theme library (next-themes has been removed).
- The inline script in `index.html` reads `localStorage.getItem('vite-ui-theme')` on page load and applies `dark` class before first paint — this prevents FOUC.
- `AppMenu.tsx` manages toggling: writes to `localStorage`, updates `document.documentElement.classList` directly.
- Storage key is `vite-ui-theme` (values: `'dark'`, `'light'`, `'system'` or null).

### KaTeX / formulas

- KaTeX JS runtime is NOT loaded in the browser. Formulas are pre-rendered to static HTML at build time by `scripts/prerender-latex.ts`.
- The output lives in `src/lib/latexPrerendered.ts` — do not edit it manually.
- The `Latex` component (`src/components/Latex.tsx`) takes a `formula` key and injects the pre-rendered HTML.
- `katex/dist/katex.min.css` is imported only in `Profile.tsx` so fonts/CSS only load when the Profile page is visited.
- If you add or change a formula: update `scripts/prerender-latex.ts`, re-run `npx tsx scripts/prerender-latex.ts`, and commit the updated `latexPrerendered.ts`.

### Notification/notice components

- Use `ProfileNotice` with a `variant` prop (`"unauthenticated"` | `"incomplete"`) rather than
  creating separate notice components. Add new variants to the `VARIANTS` map in `ProfileNotice.tsx`.

## Backend (Go)

### Handler declaration style

All handlers must be declared as variables, not functions:

```go
var AddDrinkHandler AuthenticatedApiProxyGatewayHandler = func(...) { ... }
```

Not:

```go
func AddDrinkHandler(...) { ... }
```

This is required for consistency with the router.go registration pattern.

### API responses

Always use helpers from internal/api/response.go:

```go
JSONResponse(statusCode, data)
ErrorResponse(statusCode, message)
SuccessResponse(data)
```

Never construct events.APIGatewayProxyResponse manually in a handler.

### DynamoDB keys

Never use raw strings or fmt.Sprintf for PK/SK values. Use internal/api/keys.go:

```go
UserPK(userID)
DrinkSK(timestamp, drinkID)
CustomBeerSK(beerID)
```

### Error handling

Never swallow errors:

```go
if err != nil {
    log.Printf("ContextualName: description: %v", err)
    return ErrorResponse(http.StatusInternalServerError, "user-facing message")
}
```

### Adding a new endpoint

1. Create backend/internal/api/yourfeaturefn.go
2. Add the route to the routes slice in router.go
3. Add the API route string to lib/constants.ts on the frontend

### Turnstile-protected endpoints

Public endpoints that trigger expensive operations (email sends, etc.) must verify a Turnstile
token before proceeding:

```go
if err := verifyTurnstile(body.TurnstileToken, clientIP(req.Headers, req.RequestContext.Identity.SourceIP)); err != nil {
    return ErrorResponse(http.StatusForbidden, "captcha verification failed")
}
```
