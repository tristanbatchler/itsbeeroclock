Beer O'Clock is a drink tracker made for Queenslanders. The main goal is to keep things as simple as possible. If you can't log a pot, pint, or schooner in under 5 seconds at the pub, something's gone wrong.

The app uses React, Vite, Tailwind CSS, and Supabase. It's built to work offline first, so you can keep tracking drinks even if you have no reception. When you get back online, it syncs everything up in the background.

This README covers how the app is put together, some patterns we stick to, and a few things to watch out for if you're working on the codebase.

---

## Core Architecture & Patterns

### 1. Global State vs. Local State

We try to avoid "God Components." `Home.tsx` is the main dashboard, but it shouldn't be in charge of fetching or managing global data.

- **Shared Data:** We use React Context (`BeerContext.tsx`) for the beer catalogue. This keeps paginated beer searching (`BeerSelector.tsx`) separate from BAC calculations (`Home.tsx`), so BAC math doesn't break just because a beer hasn't rendered yet.
- **Keep Components Focused:** If a component is doing too much (UI, API calls, math), move the logic into a custom hook.

### 2. Offline-First Queue System

Pub internet is usually bad, so the app queues up changes (POST, DELETE, PUT) in `localStorage` if the API call fails.

- **Polling:** `useOnlineStatus.ts` checks if we're online. It doesn't just trust `navigator.onLine`—it pings `/api/health` every 15 seconds, but only if the tab is visible, to save battery.
- **Queue Flushing:** When you reconnect, `api.processOfflineQueue()` sends any pending requests. The queue tries to be smart and cancels out redundant requests (like logging and then deleting a drink before syncing).

### 3. Centralized Constants

- **No Magic Strings:** All storage keys, API routes, and env vars are in `lib/constants.ts`. If you add a new local storage key, put it there so the "Purge All Data" function can find it.

### 4. Custom Hooks for DOM Events

Don't write raw `useEffect` blocks for standard DOM events like clicking outside a modal or pressing Escape. Use the provided hooks:

- `useClickOutside(ref, handler, isOpen)`
- `useEscapeKey(handler, isOpen)`

---

## Common Gotchas

### 1. The `useCallback` Infinite Loop Trap

If you pass functions down through Context (like `addBeersToStore`), wrap them in `useCallback` with an empty dependency array. Otherwise, React will create a new function every render, and anything using it in a dependency array will re-render forever.

### 2. Trusting `localStorage` for State

Don't use `localStorage` as your state manager. Writing to it doesn't trigger a React re-render. Always update React state first, then write to `localStorage`, then sync to the cloud if needed. See `handleToggleFavourite` in `BeerSelector.tsx` for an example.

### 3. Dangerous Math

BAC calculations are important. If something goes wrong, the app shouldn't crash. We wrap math-heavy components (`DrinkLog` and the BAC Card) in `<ErrorBoundary>` so users see an error message instead of a blank screen.

---

## Key Files to Know

1. **`src/contexts/BeerContext.tsx`**: Handles loading and sharing beer data. Makes sure both `useBAC` and `BeerSelector` have what they need.
2. **`src/lib/api.ts`**: Handles API calls, token refresh, and the offline queue.
3. **`src/hooks/useSession.ts`**: Manages the local drinks array for the current session.
4. **`src/utils/calculations.ts`**: Pure functions for standard drinks, BAC, and time until sober. Easy to test.
5. **`index.html`**: Has a script in the `<head>` to prevent theme flash by checking local storage before React loads.
