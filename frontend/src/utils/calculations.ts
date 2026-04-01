import {
  DRINK_SIZES,
  DRINK_LABELS,
  type Drink,
  type UserProfile,
  type Beer,
  type BACSnapshot,
} from "../types/drinks";

export function calcStandardDrinks(ml: number, abvPercent: number): number {
  return (ml * (abvPercent / 100) * 0.789) / 10;
}

export function getStandardDrinks(drink: Drink, beer: Beer) {
  return calcStandardDrinks(DRINK_SIZES[drink.size], beer.abv);
}

export function getDrinkDisplay(drink: Drink, beers: Beer[]) {
  const beer = beers.find((b) => b.id === drink.beerId);
  return {
    size: drink.size in DRINK_LABELS ? DRINK_LABELS[drink.size] : drink.size,
    standardDrinks: beer ? getStandardDrinks(drink, beer) : 0,
    name: beer?.name ?? "Saved drink",
  };
}

export function calculateBAC(
  drinks: Drink[],
  profile: UserProfile | null,
  currentTime: number,
  getGramsAlcohol: (d: Drink) => number,
): number {
  if (!profile || drinks.length === 0) return 0;

  // Watson's formula for Total Body Water (litres)
  // Male:   TBW = 2.447 - (0.09516 × age) + (0.1074 × height) + (0.3362 × weight)
  // Female: TBW = -2.097 + (0.1069 × height) + (0.2466 × weight)
  const tbw =
    profile.sex === "male"
      ? 2.447 -
        0.09516 * profile.age +
        0.1074 * profile.height +
        0.3362 * profile.weight
      : -2.097 + 0.1069 * profile.height + 0.2466 * profile.weight;

  // Ledger method: each drink contributes independently.
  // Spike = (grams × 0.0806) / TBW  (blood is ~80.6% water)
  // Decay = 0.015% per hour from the moment that drink was consumed.
  const bac = drinks.reduce((sum, d) => {
    const grams = getGramsAlcohol(d);
    const hoursSince = (currentTime - d.timestamp) / 3_600_000;
    const spike = (grams * 0.0806) / tbw;
    return sum + Math.max(0, spike - 0.015 * hoursSince);
  }, 0);

  return Math.max(0, bac);
}

export function calculateTimeUntilSober(
  drinks: Drink[],
  profile: UserProfile | null,
  currentTime: number,
  getGramsAlcohol: (d: Drink) => number,
) {
  const bac = calculateBAC(drinks, profile, currentTime, getGramsAlcohol);
  const legalLimit = 0.05;

  if (bac <= legalLimit)
    return { canDrive: true, hoursUntilSober: 0, soberTime: null };

  const hours = (bac - legalLimit) / 0.015;
  const soberTime = new Date(currentTime + hours * 60 * 60 * 1000);

  return { canDrive: false, hoursUntilSober: hours, soberTime };
}

function makeGetGramsAlcohol(allBeers: Beer[]) {
  return (drink: Drink): number => {
    const beer = allBeers.find((b) => b.id === drink.beerId);
    if (!beer) return 0;
    return getStandardDrinks(drink, beer) * 10;
  };
}

export function computeBACCurve(
  drinks: Drink[],
  allBeers: Beer[],
  profile: UserProfile | null,
  startTime: number,
  endTime: number,
  intervalMs: number = 300_000,
): BACSnapshot[] {
  if (!profile || drinks.length === 0 || endTime < startTime) return [];

  const getGramsAlcohol = makeGetGramsAlcohol(allBeers);
  const snapshots: BACSnapshot[] = [];

  for (let t = startTime; t < endTime; t += intervalMs) {
    // Only include drinks that had been logged by time t
    const drinksAtT = drinks.filter((d) => d.timestamp <= t);
    snapshots.push({
      timestamp: t,
      bac: calculateBAC(drinksAtT, profile, t, getGramsAlcohol),
    });
  }

  // Always include endTime (deduped if it coincides with a regular tick)
  if (
    snapshots.length === 0 ||
    snapshots[snapshots.length - 1].timestamp !== endTime
  ) {
    const drinksAtEnd = drinks.filter((d) => d.timestamp <= endTime);
    snapshots.push({
      timestamp: endTime,
      bac: calculateBAC(drinksAtEnd, profile, endTime, getGramsAlcohol),
    });
  }

  return snapshots;
}
