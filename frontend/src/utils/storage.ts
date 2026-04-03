import { STORAGE_KEYS } from "../lib/constants";
import type { Beer, UserProfile } from "../types/drinks";

export const saveBeers = (beers: Beer[]) => {
  localStorage.setItem(STORAGE_KEYS.BEERS_CACHE, JSON.stringify(beers));
};

export const getCachedBeers = (): Beer[] =>
  safeParse(STORAGE_KEYS.BEERS_CACHE, []);

const safeParse = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Profile
export const getUserProfile = (): UserProfile | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (data) {
      const parsed = JSON.parse(data);
      if (
        parsed &&
        (parsed.sex === "male" || parsed.sex === "female") &&
        typeof parsed.weight === "number" &&
        parsed.profileSetup === true
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(
      "Failed to parse profile from localStorage, returning null.",
      error,
    );
  }
  return null;
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
};

// Custom Beers
export const getCustomBeers = (): Beer[] =>
  safeParse(STORAGE_KEYS.CUSTOM_BEERS, []);

export const saveCustomBeer = (beer: Beer) => {
  const beers = getCustomBeers();
  const filtered = beers.filter((b) => b.id !== beer.id);
  localStorage.setItem(
    STORAGE_KEYS.CUSTOM_BEERS,
    JSON.stringify([...filtered, beer]),
  );
};

// Favourites
export const getFavouriteIds = (): string[] =>
  safeParse(STORAGE_KEYS.FAVOURITES, []);

export const toggleFavourite = (beerId: string) => {
  const favourites = getFavouriteIds();
  const newFavourites = favourites.includes(beerId)
    ? favourites.filter((id) => id !== beerId)
    : [...favourites, beerId];
  localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(newFavourites));
};
