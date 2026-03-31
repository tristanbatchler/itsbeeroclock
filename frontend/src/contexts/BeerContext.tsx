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
  const [allBeers, setAllBeers] = useState<Beer[]>(() => [...getCachedBeers(), ...getCustomBeers()]);
  const [beersLoading, setBeersLoading] = useState(true);

  useEffect(() => {
    api.getBeers()
      .then((data) => {
        const merged = [...(data.beers || []), ...getCustomBeers()];
        setAllBeers(merged);
        saveBeers(merged);
      })
      .catch(console.error)
      .finally(() => setBeersLoading(false));
  }, []);

  // Helper to allow BeerSelector to append new pages to the global store
  const addBeersToStore = useCallback((newBeers: Beer[]) => {
    setAllBeers(prev => {
      const existingIds = new Set(prev.map(b => b.id));
      const uniqueNew = newBeers.filter(b => !existingIds.has(b.id));
      const updated = [...prev, ...uniqueNew];
      saveBeers(updated);
      return updated;
    });
  }, []);

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