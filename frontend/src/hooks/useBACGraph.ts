import { useState, useEffect, useMemo } from "react";
import type { Drink, Beer, UserProfile, BACSnapshot } from "../types/drinks";
import { computeBACCurve } from "../utils/calculations";

export interface BACGraphResult {
  snapshots: BACSnapshot[];
  startTime: number;
  endTime: number;
}

export function useBACGraph(
  drinks: Drink[],
  allBeers: Beer[],
  profile: UserProfile | null,
): BACGraphResult {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Refresh currentTime on every drink change so the graph is never stale
  // immediately after a drink is added (avoids startTime > endTime on first drink).
  useEffect(() => {
    setCurrentTime(Date.now());
  }, [drinks]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 300_000);
    return () => clearInterval(interval);
  }, []);

  const startTime =
    drinks.length > 0
      ? Math.min(...drinks.map((d) => d.timestamp))
      : currentTime;
  const endTime = currentTime;

  const snapshots = useMemo(
    () => computeBACCurve(drinks, allBeers, profile, startTime, endTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drinks, allBeers, profile, currentTime],
  );

  return { snapshots, startTime, endTime };
}
