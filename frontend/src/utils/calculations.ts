import { DRINK_SIZES, DRINK_LABELS, type Drink, type UserProfile, type Beer } from '../types/drinks'; 


export function calcStandardDrinks(ml: number, abvPercent: number): number {
  return (ml * (abvPercent / 100) * 0.789) / 10;
}

export function getStandardDrinks(drink: Drink, beer: Beer) {
  return calcStandardDrinks(DRINK_SIZES[drink.size], beer.abv);
}

export function getDrinkDisplay(drink: Drink, beers: Beer[]) {
  const beer = beers.find(b => b.id === drink.beerId);
  return {
    name: drink.beerName,
    size: drink.size in DRINK_LABELS ? DRINK_LABELS[drink.size] : drink.size,
    standardDrinks: beer ? getStandardDrinks(drink, beer) : 0,
  };
}

export function calculateBAC(drinks: Drink[], profile: UserProfile | null, currentTime: number, getGramsAlcohol: (d: Drink) => number): number {
  if (!profile || drinks.length === 0) return 0;

  const r = profile.gender === 'male' ? 0.68 : 0.55;
  const weightGrams = profile.weight * 1000;
  const totalGramsAlcohol = drinks.reduce((sum, d) => sum + getGramsAlcohol(d), 0);

  const firstDrinkTime = Math.min(...drinks.map(d => d.timestamp));
  const hoursSinceStart = (currentTime - firstDrinkTime) / (1000 * 60 * 60);

  const rawBac = (totalGramsAlcohol / (weightGrams * r)) * 100;
  const finalBac = rawBac - (0.015 * hoursSinceStart);

  return Math.max(0, finalBac);
}

export function calculateTimeUntilSober(drinks: Drink[], profile: UserProfile | null, currentTime: number, getGramsAlcohol: (d: Drink) => number) {
  const bac = calculateBAC(drinks, profile, currentTime, getGramsAlcohol);
  const legalLimit = 0.05;

  if (bac <= legalLimit) return { canDrive: true, hoursUntilSober: 0, soberTime: null };

  const hours = (bac - legalLimit) / 0.015;
  const soberTime = new Date(currentTime + hours * 60 * 60 * 1000);

  return { canDrive: false, hoursUntilSober: hours, soberTime };
}