import { useState, useEffect, useMemo } from 'react';
import type { Drink, Beer, UserProfile } from '../types/drinks';
import { getStandardDrinks, calculateBAC, calculateTimeUntilSober } from '../utils/calculations';

export function useBAC(drinks: Drink[], beers: Beer[], profile: UserProfile | null) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const totalStandardDrinks = useMemo(() => 
    drinks.reduce((sum, d) => {
      const beer = beers.find(b => b.id === d.beerId);
      return sum + (beer ? getStandardDrinks(d, beer) : 0);
    }, 0), [drinks, beers]
  );

  const getGramsAlcohol = (d: Drink) => {
    const beer = beers.find(b => b.id === d.beerId);
    return beer ? getStandardDrinks(d, beer) * 10 : 0;
  };

  const currentBAC = calculateBAC(drinks, profile, currentTime, getGramsAlcohol);
  const { canDrive, hoursUntilSober, soberTime } = calculateTimeUntilSober(drinks, profile, currentTime, getGramsAlcohol);

  return { totalStandardDrinks, currentBAC, canDrive, hoursUntilSober, soberTime };
}