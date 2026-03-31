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

  const addBeersToStore = useCallback((newBeers: Beer[]) => {
    setAllBeers((prev) => {
      const beerMap = new Map(prev.map((b) => [b.id, b]));
      newBeers.forEach((newBeer) => {
        beerMap.set(newBeer.id, { ...beerMap.get(newBeer.id), ...newBeer });
      });
      const updated = Array.from(beerMap.values());
      saveBeers(updated.filter((b) => !b.isCustom));
      return updated;
    });
  }, []);


  useEffect(() => {
    const fetchInitialBeers = async () => {
      try {
        const data = await api.getBeers({ limit: 30 });
        if (data.beers) {
          addBeersToStore(data.beers);
        }
      } catch (err) {
        console.error("Failed to load beer catalogue, using local cache:", err);
      } finally {
        setBeersLoading(false);
      }
    };
    fetchInitialBeers();
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