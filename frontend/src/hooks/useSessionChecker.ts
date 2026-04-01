import { useEffect, useRef } from "react";
import type { Drink, Beer, UserProfile } from "../types/drinks";
import {
  isSessionEnded,
  archiveSession,
  prependArchive,
} from "../utils/sessionArchive";

interface UseSessionCheckerOptions {
  drinks: Drink[];
  allBeers: Beer[];
  profile: UserProfile | null;
  clearSession: () => void;
}

export function useSessionChecker({
  drinks,
  allBeers,
  profile,
  clearSession,
}: UseSessionCheckerOptions): void {
  // Keep a stable ref to clearSession to avoid stale closure issues
  const clearSessionRef = useRef(clearSession);
  useEffect(() => {
    clearSessionRef.current = clearSession;
  });

  // Stable ref to the check function so the interval closure never goes stale
  const check = useRef(() => {});
  const drinksRef = useRef(drinks);
  const allBeersRef = useRef(allBeers);
  const profileRef = useRef(profile);

  useEffect(() => {
    drinksRef.current = drinks;
  });
  useEffect(() => {
    allBeersRef.current = allBeers;
  });
  useEffect(() => {
    profileRef.current = profile;
  });

  check.current = () => {
    const now = Date.now();
    if (
      !isSessionEnded(
        drinksRef.current,
        profileRef.current,
        allBeersRef.current,
        now,
      )
    ) {
      return;
    }
    const archive = archiveSession(
      drinksRef.current,
      allBeersRef.current,
      profileRef.current,
    );
    try {
      prependArchive(archive);
    } catch (err) {
      console.error(
        "useSessionChecker: failed to write archive to localStorage",
        err,
      );
      return;
    }
    clearSessionRef.current();
  };

  // 60-second polling interval — same cadence as useBAC
  useEffect(() => {
    const interval = setInterval(() => check.current(), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Immediate check whenever drinks change
  useEffect(() => {
    check.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drinks]);
}
