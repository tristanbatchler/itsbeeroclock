import { useState, useEffect, useMemo } from "react";
import type { Drink, Beer, UserProfile } from "../types/drinks";
import {
  getStandardDrinks,
  calculateBAC,
  calculateTimeUntilSober,
} from "../utils/calculations";

export interface BACResult {
  totalStandardDrinks: number;
  currentBAC: number | null;
  canDrive: boolean;
  hoursUntilSober: number | null;
  soberTime: Date | null;
  hasValidData: boolean;
}

export function useBAC(
  drinks: Drink[],
  beers: Beer[],
  profile: UserProfile | null,
): BACResult {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const validDrinks = drinks.filter((d) =>
    beers.some((b) => b.id === d.beerId),
  );

  const totalStandardDrinks = useMemo(
    () =>
      validDrinks.reduce((sum, d) => {
        const beer = beers.find((b) => b.id === d.beerId);
        return sum + (beer ? getStandardDrinks(d, beer) : 0);
      }, 0),
    [validDrinks, beers],
  );

  const getGramsAlcohol = (d: Drink) => {
    const beer = beers.find((b) => b.id === d.beerId);
    return beer ? getStandardDrinks(d, beer) * 10 : 0;
  };

  const hasValidData = drinks.every((d) =>
    beers.some((b) => b.id === d.beerId),
  );
  const currentBAC = hasValidData
    ? calculateBAC(drinks, profile, currentTime, getGramsAlcohol)
    : null;
  const soberData = hasValidData
    ? calculateTimeUntilSober(drinks, profile, currentTime, getGramsAlcohol)
    : { canDrive: false, hoursUntilSober: null, soberTime: null };

  return { totalStandardDrinks, currentBAC, ...soberData, hasValidData };
}
