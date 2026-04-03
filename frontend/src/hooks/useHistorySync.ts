import { useState, useEffect, useRef } from "react";
import { type User } from "@supabase/supabase-js";
import { api, queueRequest } from "../lib/api";
import {
  getHistory,
  saveHistory,
  mergeHistories,
} from "../utils/sessionArchive";
import { computeBACCurve } from "../utils/calculations";
import {
  type UserProfile,
  type Beer,
  type SessionArchive,
} from "../types/drinks";
import { API_ROUTES } from "../lib/constants";

interface UseHistorySyncOptions {
  user: User | null;
  profile: UserProfile | null;
  allBeers: Beer[];
  isOnline: boolean;
}

export function useHistorySync({
  user,
  profile,
  allBeers,
  isOnline,
}: UseHistorySyncOptions): { isSyncing: boolean; archives: SessionArchive[] } {
  const [isSyncing, setIsSyncing] = useState(false);
  const [archives, setArchives] = useState<SessionArchive[]>(() =>
    getHistory(),
  );
  const lastArchiveTimestamp = archives[0]?.startTimestamp ?? null;
  const hasHydratedRef = useRef(false);
  // Stable refs so the hydration closure always sees current values without
  // re-triggering on every beer list / profile change.
  const allBeersRef = useRef(allBeers);
  const profileRef = useRef(profile);
  useEffect(() => {
    allBeersRef.current = allBeers;
  });
  useEffect(() => {
    profileRef.current = profile;
  });

  // Reset hydration flag when offline so we re-hydrate on reconnect
  useEffect(() => {
    if (!isOnline) {
      hasHydratedRef.current = false;
    }
  }, [isOnline]);

  // Hydrate on sign-in / reconnect: GET remote archives and merge with local
  useEffect(() => {
    if (!isOnline || !user || !profile?.optInHistory || hasHydratedRef.current)
      return;

    const hydrate = async () => {
      hasHydratedRef.current = true;
      setIsSyncing(true);
      try {
        const remoteArchives = ((await api.getHistory()) ?? []).map((a) => {
          const drinks =
            typeof a.drinks === "string" ? JSON.parse(a.drinks) : a.drinks;
          const bacCurve = a.bacCurve?.length
            ? a.bacCurve
            : computeBACCurve(
                drinks,
                allBeersRef.current,
                profileRef.current,
                a.startTimestamp,
                a.endTimestamp,
              );
          return { ...a, drinks, bacCurve };
        });
        const merged = mergeHistories(getHistory(), remoteArchives);
        saveHistory(merged);
        setArchives(merged);
      } catch (err) {
        console.error("useHistorySync: hydration failed", err);
        hasHydratedRef.current = false;
      } finally {
        setIsSyncing(false);
      }
    };

    hydrate();
  }, [isOnline, user, profile?.optInHistory]);

  // POST the latest archive whenever lastArchiveTimestamp changes
  useEffect(() => {
    if (!lastArchiveTimestamp || !isOnline || !user || !profile?.optInHistory)
      return;

    const postArchive = async () => {
      const archive = getHistory()[0];
      if (!archive) return;

      try {
        await api.saveHistory(archive);
      } catch (err) {
        if (err instanceof TypeError) {
          queueRequest(API_ROUTES.HISTORY, {
            method: "POST",
            body: JSON.stringify(archive),
          });
        } else {
          console.error("useHistorySync: failed to POST archive", err);
        }
      }
    };

    postArchive();
  }, [lastArchiveTimestamp, isOnline, user, profile?.optInHistory]);

  return { isSyncing, archives };
}
