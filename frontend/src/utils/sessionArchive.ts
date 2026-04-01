import { calculateBAC, getStandardDrinks } from "../utils/calculations";
import type { Drink, Beer, UserProfile, SessionArchive } from "../types/drinks";
import { STORAGE_KEYS } from "../lib/constants";

function getGramsAlcohol(allBeers: Beer[]) {
  return (drink: Drink): number => {
    const beer = allBeers.find((b) => b.id === drink.beerId);
    if (!beer) return 0;
    return getStandardDrinks(drink, beer) * 10;
  };
}

export function isSessionEnded(
  drinks: Drink[],
  profile: UserProfile | null,
  allBeers: Beer[],
  now: number,
): boolean {
  if (drinks.length === 0) return false;

  const lastDrink = drinks[drinks.length - 1];
  const elapsed = now - lastDrink.timestamp;
  if (elapsed <= 7_200_000) return false;

  const bac = calculateBAC(drinks, profile, now, getGramsAlcohol(allBeers));
  return bac === 0;
}

export function computePeakBAC(
  drinks: Drink[],
  allBeers: Beer[],
  profile: UserProfile | null,
): number {
  if (drinks.length === 0) return 0;
  return Math.max(
    0,
    ...drinks.map((_, i) =>
      calculateBAC(
        drinks.slice(0, i + 1),
        profile,
        drinks[i].timestamp,
        getGramsAlcohol(allBeers),
      ),
    ),
  );
}

export function archiveSession(
  drinks: Drink[],
  allBeers: Beer[],
  profile: UserProfile | null,
): SessionArchive {
  const timestamps = drinks.map((d) => d.timestamp);
  const startTimestamp = Math.min(...timestamps);
  const endTimestamp = Math.max(...timestamps) + 7_200_000;
  const durationMinutes = (endTimestamp - startTimestamp) / 60_000;

  const totalStandardDrinks = drinks.reduce((sum, drink) => {
    const beer = allBeers.find((b) => b.id === drink.beerId);
    return sum + (beer ? getStandardDrinks(drink, beer) : 0);
  }, 0);

  const peakBAC = computePeakBAC(drinks, allBeers, profile);

  return {
    startTimestamp,
    endTimestamp,
    durationMinutes,
    totalStandardDrinks,
    peakBAC,
    drinks,
  };
}

export function getHistory(): SessionArchive[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SessionArchive[];
  } catch {
    return [];
  }
}

export function saveHistory(archives: SessionArchive[]): void {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(archives));
}

export function prependArchive(archive: SessionArchive): void {
  const history = getHistory();
  const updated = [archive, ...history].slice(0, 50);
  saveHistory(updated);
}

export function mergeHistories(
  local: SessionArchive[],
  remote: SessionArchive[],
): SessionArchive[] {
  const map = new Map<number, SessionArchive>();
  for (const a of local) map.set(a.startTimestamp, a);
  for (const a of remote) map.set(a.startTimestamp, a);
  return Array.from(map.values()).sort(
    (a, b) => b.startTimestamp - a.startTimestamp,
  );
}
