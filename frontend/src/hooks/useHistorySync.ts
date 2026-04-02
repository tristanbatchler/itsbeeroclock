import { useState, useEffect, useRef } from "react";
import { type User } from "@supabase/supabase-js";
import { api, queueRequest } from "../lib/api";
import {
  getHistory,
  saveHistory,
  mergeHistories,
} from "../utils/sessionArchive";
import { type UserProfile } from "../types/drinks";
import { API_ROUTES } from "../lib/constants";

interface UseHistorySyncOptions {
  user: User | null;
  profile: UserProfile | null;
  isOnline: boolean;
  lastArchiveTimestamp: number | null;
}

export function useHistorySync({
  user,
  profile,
  isOnline,
  lastArchiveTimestamp,
}: UseHistorySyncOptions): { isSyncing: boolean } {
  const [isSyncing, setIsSyncing] = useState(false);
  const hasHydratedRef = useRef(false);

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
        const remoteArchives = ((await api.getHistory()) ?? []).map((a) => ({
          ...a,
          drinks:
            typeof a.drinks === "string" ? JSON.parse(a.drinks) : a.drinks,
        }));
        const merged = mergeHistories(getHistory(), remoteArchives);
        saveHistory(merged);
      } catch (err) {
        console.error("useHistorySync: hydration failed", err);
        hasHydratedRef.current = false; // allow retry on next reconnect
      } finally {
        setIsSyncing(false);
      }
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastArchiveTimestamp, isOnline, user, profile?.optInHistory]);

  return { isSyncing };
}
