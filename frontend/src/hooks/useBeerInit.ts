import { useEffect } from "react";
import { api } from "../lib/api";
import { useBeerStore } from "../store/beerStore";

/**
 * Runs once at app mount. Paginates through the full beer catalogue and loads
 * it into the Zustand store so BAC calculations work for any beer regardless
 * of which page it appears on.
 */
export function useBeerInit() {
  const addBeersToStore = useBeerStore((s) => s.addBeersToStore);
  const setBeersLoading = useBeerStore((s) => s.setBeersLoading);

  useEffect(() => {
    const fetchAllBeers = async () => {
      try {
        let lastKey: string | null = null;
        do {
          const data = await api.getBeers({ limit: 100, lastKey });
          if (data.beers) {
            addBeersToStore(data.beers);
          }
          lastKey = data.hasMore ? (data.lastKey ?? null) : null;
        } while (lastKey);
      } catch (err) {
        console.error("Failed to load beer catalogue, using local cache:", err);
      } finally {
        setBeersLoading(false);
      }
    };
    fetchAllBeers();
    // addBeersToStore and setBeersLoading are Zustand actions — stable references,
    // safe to include without causing re-runs.
  }, [addBeersToStore, setBeersLoading]);
}
