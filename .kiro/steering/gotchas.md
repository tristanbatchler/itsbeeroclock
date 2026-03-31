# Known Gotchas

## CloudFront strips Authorization headers (CRITICAL)

CloudFront does not forward the Authorization header to origins by default.
The /api/\* behavior in the CDK stack MUST include:
originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
Without this, every authenticated request returns 401 and nothing in your Go logs
will show it — because Lambda never receives the request at all.

## JWT clock skew warning from gotrue-js

You may see: "Session as retrieved from URL was issued in the future"
This is a cosmetic warning from the Supabase client library caused by clock skew
between the Supabase Mumbai region and the browser. It does not cause 401s on its own
and can be ignored. The 401s were caused by the CloudFront header stripping above.

## useCallback infinite loop trap

Functions passed through React Context that appear in useEffect dependency arrays
must be wrapped in useCallback with a stable dependency array. Failing to do this
causes infinite re-render loops.

Note: the beer catalogue store was migrated to Zustand (`src/store/beerStore.ts`).
Zustand actions are stable references by default, so this trap no longer applies
to `addBeersToStore`. It still applies to any functions passed through React Context.

## localStorage is not React state

Writing to localStorage does not trigger a re-render. Always update React state first,
then persist to localStorage as a side effect.

## DynamoDB DeleteItem always returns 200

DeleteItem returns 200 OK even if the item didn't exist. Use ConditionExpression:
attribute_exists(PK)
if you need to confirm the item existed. See deletedrinkfn.go.

## Single-table data purges

Deleting a user's profile record does NOT delete their drinks or custom beers.
ClearUserDataHandler queries all items under the user's PK and batch-deletes them.
The 25-item DynamoDB batch limit requires chunking — see ClearUserDataHandler for
the implementation.

## CORS in local dev

cmd/local/main.go reads CORS_ORIGIN from .env and defaults to http://localhost:5173.
If your frontend runs on a different port, update .env or API calls will fail.

## No default HTTP client timeouts

Never use the default http.Client for external calls (e.g. JWKS fetch).
Always set a timeout: &http.Client{Timeout: 5 \* time.Second}
The default client has no timeout and will cause Lambda to hang indefinitely.

## Custom beers in saveBeers

saveBeers in storage.ts persists catalogue beers to the API cache key.
Always filter before calling it: saveBeers(beers.filter(b => !b.isCustom))
Custom beers have their own storage key and must not pollute the catalogue cache.

## Beer catalogue pagination and BAC

BeerContext paginates through the full catalogue on mount so that every beer in the
session drink log resolves immediately regardless of which page it appears on.
BAC calculations depend on every drink's beer being present in allBeers.
If a beer is missing, standard drinks show as 0.0 and the BAC card breaks.
