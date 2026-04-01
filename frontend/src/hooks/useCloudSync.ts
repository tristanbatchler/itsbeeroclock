import { useState, useEffect, useRef } from "react";
import { type User } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { getCustomBeers, saveCustomBeer } from "../utils/storage";
import { type Drink, type UserProfile } from "../types/drinks";
import { useBeerStore } from "../store/beerStore";

interface UseCloudSyncOptions {
  drinks: Drink[];
  setAllDrinks: (drinks: Drink[]) => void;
  user: User | null;
  profile: UserProfile | null;
  isOnline: boolean;
}

/**
 * Handles all cloud sync side-effects for the current session:
 *
 * 1. On sign-in (or reconnect), flushes the offline queue then merges
 *    server drinks with any local-only drinks.
 * 2. Batch-fetches any catalogue beers referenced in the drink log that
 *    aren't already in the store (avoids paginating the full catalogue).
 * 3. Syncs custom beers from the server into the local store.
 * 4. Debounces a full sync of the current session to the server whenever
 *    the drinks array changes.
 *
 * Returns `isApiDown` so callers can surface an offline warning.
 */
export function useCloudSync({
  drinks,
  setAllDrinks,
  user,
  profile,
  isOnline,
}: UseCloudSyncOptions) {
  const [isApiDown, setIsApiDown] = useState(false);
  const hasHydratedRef = useRef(false);
  const addBeersToStore = useBeerStore((s) => s.addBeersToStore);

  // Keep a stable ref to setAllDrinks so the hydration closure never goes stale
  // without needing it in the effect's dependency array.
  const setAllDrinksRef = useRef(setAllDrinks);
  useEffect(() => {
    setAllDrinksRef.current = setAllDrinks;
  });

  // Reset hydration flag when we go offline so we re-hydrate on reconnect
  useEffect(() => {
    if (!isOnline) {
      hasHydratedRef.current = false;
      setIsApiDown(false);
    }
  }, [isOnline]);

  // Hydrate + flush offline queue on sign-in / reconnect.
  // isApiDown is intentionally excluded from deps: including it would cause a
  // tight retry loop (failure sets isApiDown → effect re-runs → failure again).
  // Retry is handled naturally by the user going offline then online again,
  // which resets hasHydratedRef via the effect above.
  useEffect(() => {
    if (!isOnline || !user || !profile?.optInHistory || hasHydratedRef.current)
      return;

    const hydrateAndFlush = async () => {
      hasHydratedRef.current = true;
      try {
        await api.processOfflineQueue();

        const serverDrinks = (await api.getDrinks()) || [];
        const serverIds = new Set(serverDrinks.map((d: Drink) => d.id));
        // Capture drinks via closure — safe here because we only read it once
        // at hydration time, not on every change.
        const localOnly = drinks.filter((d) => !serverIds.has(d.id));

        const serverCustomBeers = (await api.getCustomBeers()) || [];
        const localCustomIds = new Set(getCustomBeers().map((b) => b.id));
        serverCustomBeers.forEach((beer) => {
          if (!localCustomIds.has(beer.id)) saveCustomBeer(beer);
        });
        if (serverCustomBeers.length > 0) addBeersToStore(serverCustomBeers);

        const merged = [...serverDrinks, ...localOnly].sort(
          (a, b) => b.timestamp - a.timestamp,
        );
        setAllDrinksRef.current(merged);

        // Batch-fetch any catalogue beers referenced in the merged drink log
        // that aren't already in the store. This ensures BAC calculations work
        // without paginating the full catalogue on startup.
        const knownBeerIds = new Set(
          useBeerStore.getState().allBeers.map((b) => b.id),
        );
        const missingIds = [...new Set(merged.map((d) => d.beerId))].filter(
          (id) => !knownBeerIds.has(id),
        );

        if (missingIds.length > 0) {
          const fetched = await api.getBeersByIds(missingIds);
          if (fetched.length > 0) addBeersToStore(fetched);
        }

        setIsApiDown(false);
      } catch (err) {
        console.error("Hydration failed", err);
        setIsApiDown(true);
        hasHydratedRef.current = false; // allow retry on next reconnect
      }
    };

    hydrateAndFlush();
    // drinks intentionally omitted: we only want to hydrate once per sign-in,
    // not re-run every time a drink is added.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user, profile?.optInHistory]);

  // Debounced full sync whenever the session changes
  useEffect(() => {
    if (
      !isOnline ||
      isApiDown ||
      !user ||
      !profile?.optInHistory ||
      drinks.length === 0
    )
      return;

    const timeout = setTimeout(() => {
      api.syncDrinks(drinks).catch(() => setIsApiDown(true));
    }, 300);

    return () => clearTimeout(timeout);
  }, [drinks, isOnline, isApiDown, user, profile?.optInHistory]);

  return { isApiDown };
}
