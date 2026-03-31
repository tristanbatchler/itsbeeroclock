import { create } from "zustand";
import type { Beer, UserProfile } from "../types/drinks";
import {
  getCachedBeers,
  getCustomBeers,
  saveBeers,
  getUserProfile,
} from "../utils/storage";

interface BeerStore {
  allBeers: Beer[];
  beersLoading: boolean;
  addBeersToStore: (newBeers: Beer[]) => void;
  setAllBeers: (beers: Beer[]) => void;
  setBeersLoading: (loading: boolean) => void;
  // Profile lives here so Home and Profile pages share one instance.
  // BAC calculations always read the latest saved values without a re-fetch.
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
}

export const useBeerStore = create<BeerStore>((set) => ({
  allBeers: [...getCachedBeers(), ...getCustomBeers()],
  beersLoading: true,

  addBeersToStore: (newBeers: Beer[]) => {
    set((state) => {
      const beerMap = new Map(state.allBeers.map((b) => [b.id, b]));
      newBeers.forEach((newBeer) => {
        beerMap.set(newBeer.id, { ...beerMap.get(newBeer.id), ...newBeer });
      });
      const updated = Array.from(beerMap.values());
      saveBeers(updated.filter((b) => !b.isCustom));
      return { allBeers: updated };
    });
  },

  setAllBeers: (beers: Beer[]) => set({ allBeers: beers }),
  setBeersLoading: (loading: boolean) => set({ beersLoading: loading }),

  profile: getUserProfile(),
  setProfile: (profile) => set({ profile }),
}));
