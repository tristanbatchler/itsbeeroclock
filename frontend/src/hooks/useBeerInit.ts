import { useEffect } from "react";
import { api } from "../lib/api";
import { useBeerStore } from "../store/beerStore";

/**
 * Fetches the first page of the beer catalogue on mount and marks loading done.
 * The rest of the catalogue is loaded on demand as the user scrolls BeerSelector.
 * Beers referenced in a user's drink log are resolved separately via getBeersByIds
 * in useCloudSync after hydration.
 */
export function useBeerInit() {
  const addBeersToStore = useBeerStore((s) => s.addBeersToStore);
  const setBeersLoading = useBeerStore((s) => s.setBeersLoading);

  useEffect(() => {
    // Bug D fix: defer fetch until after first paint via requestIdleCallback (Safari fallback: setTimeout)
    const run = () => {
      api
        .getBeers({ limit: 30 })
        .then((data) => {
          if (data.beers) addBeersToStore(data.beers);
        })
        .catch((err) => {
          console.error(
            "Failed to load beer catalogue, using local cache:",
            err,
          );
        })
        .finally(() => {
          setBeersLoading(false);
        });
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(run);
    } else {
      setTimeout(run, 0);
    }
  }, [addBeersToStore, setBeersLoading]);
}
