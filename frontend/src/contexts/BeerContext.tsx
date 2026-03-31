import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react";
import type { Beer } from "../types/drinks";
import { getCachedBeers, getCustomBeers, saveBeers } from "../utils/storage";
import { api } from "../lib/api";

interface BeerContextType {
  allBeers: Beer[];
  setAllBeers: React.Dispatch<React.SetStateAction<Beer[]>>;
  beersLoading: boolean;
  addBeersToStore: (newBeers: Beer[]) => void;
}

const BeerContext = createContext<BeerContextType | undefined>(undefined);

export function BeerProvider({ children }: { children: ReactNode }) {
  const [allBeers, setAllBeers] = useState<Beer[]>(() => [
    ...getCachedBeers(),
    ...getCustomBeers(),
  ]);
  const [beersLoading, setBeersLoading] = useState(true);

  // Used by BeerSelector to append paginated results without losing existing state.
  // Wrapped in useCallback with empty deps — see "useCallback infinite loop trap" in README.
  const addBeersToStore = useCallback((newBeers: Beer[]) => {
    setAllBeers((prev) => {
      const existingIds = new Set(prev.map((b) => b.id));
      const uniqueNew = newBeers.filter((b) => !existingIds.has(b.id));
      const updated = [...prev, ...uniqueNew];
      // Only persist catalogue beers — custom beers live in their own storage key.
      saveBeers(updated.filter((b) => !b.isCustom));
      return updated;
    });
  }, []);

  // On mount, paginate through the full catalogue so every beer referenced in the
  // session drink log is resolvable immediately, regardless of which catalogue page it's on.
  useEffect(() => {
    const fetchAllBeers = async () => {
      try {
        let fetched: Beer[] = [];
        let lastKey: string | undefined;
        let hasMore = true;

        while (hasMore) {
          const data = await api.getBeers({ limit: 50, lastKey });
          fetched = [...fetched, ...(data.beers ?? [])];
          hasMore = data.hasMore ?? false;
          lastKey = data.lastKey ?? undefined;
        }

        // addBeersToStore merges with existing cache and custom beers — nothing is lost.
        addBeersToStore(fetched);
      } catch (err) {
        console.error("Failed to load beer catalogue, using local cache:", err);
        // Fallback is already in state from the useState initializer — nothing to do.
      } finally {
        setBeersLoading(false);
      }
    };

    fetchAllBeers();
  }, [addBeersToStore]);

  return (
    <BeerContext.Provider value={{ allBeers, setAllBeers, beersLoading, addBeersToStore }}>
      {children}
    </BeerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBeers = () => {
  const context = useContext(BeerContext);
  if (!context) throw new Error("useBeers must be used within a BeerProvider");
  return context;
};