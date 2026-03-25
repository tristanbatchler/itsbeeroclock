
import type { Beer, UserProfile } from '../types/drinks';

const PROFILE_KEY = 'beeroclock_profile';
const CUSTOM_BEERS_KEY = 'beeroclock_custom_beers';
const FAVORITE_IDS_KEY = 'beeroclock_favorite_ids';
const RECENT_IDS_KEY = 'beeroclock_recent_ids';

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
      if (parsed && (parsed.gender === 'male' || parsed.gender === 'female') && typeof parsed.weight === 'number') {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to parse profile from localStorage, returning null.", error);
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

// Favorites
export const getFavoriteIds = (): string[] => safeParse(FAVORITE_IDS_KEY, []);

export const toggleFavorite = (beerId: string) => {
  const favorites = getFavoriteIds();
  const newFavorites = favorites.includes(beerId)
    ? favorites.filter(id => id !== beerId)
    : [...favorites, beerId];
  localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(newFavorites));
};

// Recents
export const getRecentBeerIds = (): string[] => safeParse(RECENT_IDS_KEY, []);

export const addRecentBeer = (beerId: string) => {
  const recents = getRecentBeerIds();
  const newRecents = [beerId, ...recents.filter(id => id !== beerId)].slice(0, 10);
  localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(newRecents));
};