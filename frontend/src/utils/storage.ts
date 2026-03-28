import type { Beer, UserProfile } from "../types/drinks";

const BEERS_CACHE_KEY = "beeroclock_beers";


export const saveBeers = (beers: Beer[]) => {
  localStorage.setItem(BEERS_CACHE_KEY, JSON.stringify(beers));
};

export const getCachedBeers = (): Beer[] => safeParse(BEERS_CACHE_KEY, []);

const PROFILE_KEY = "beeroclock_profile";
const CUSTOM_BEERS_KEY = "beeroclock_custom_beers";
const FAVORITE_IDS_KEY = "beeroclock_favourite_ids";

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
    const data = localStorage.getItem(PROFILE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (
        parsed &&
        (parsed.gender === "male" || parsed.gender === "female") &&
        typeof parsed.weight === "number"
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
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

// Custom Beers
export const getCustomBeers = (): Beer[] => safeParse(CUSTOM_BEERS_KEY, []);

export const saveCustomBeer = (beer: Beer) => {
  const beers = getCustomBeers();
  localStorage.setItem(CUSTOM_BEERS_KEY, JSON.stringify([...beers, beer]));
};

// Favourites
export const getFavouriteIds = (): string[] => safeParse(FAVORITE_IDS_KEY, []);

export const toggleFavourite = (beerId: string) => {
  const favourites = getFavouriteIds();
  const newFavourites = favourites.includes(beerId)
    ? favourites.filter((id) => id !== beerId)
    : [...favourites, beerId];
  localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(newFavourites));
};
