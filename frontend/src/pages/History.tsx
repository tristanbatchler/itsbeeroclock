import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useHistorySync } from "../hooks/useHistorySync";
import { useBeerStore } from "../store/beerStore";
import { getHistory } from "../utils/sessionArchive";
import { SessionCard } from "../components/SessionCard";
import type { SessionArchive } from "../types/drinks";

export function History() {
  const { user } = useAuth();
  const { profile, allBeers } = useBeerStore();
  const isOnline = useOnlineStatus();

  const [archives, setArchives] = useState<SessionArchive[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setArchives(getHistory());
  }, []);

  const lastArchiveTimestamp = archives[0]?.startTimestamp ?? null;

  const { isSyncing } = useHistorySync({
    user,
    profile,
    allBeers,
    isOnline,
    lastArchiveTimestamp,
  });

  // Re-read from localStorage after sync completes to pick up merged remote archives
  useEffect(() => {
    if (!isSyncing) {
      setArchives(getHistory());
    }
  }, [isSyncing]);

  return (
    <div className="p-4 space-y-3">
      {isSyncing && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isSyncing && archives.length === 0 && (
        <div className="text-center text-muted-foreground py-12 text-sm space-y-2">
          <p>No sessions recorded yet.</p>
          <p className="text-xs">
            Sessions appear here automatically once your estimated BAC returns to zero and you haven't logged a drink for at least two hours.
          </p>
        </div>
      )}

      {archives.map((archive) => (
        <SessionCard
          key={archive.startTimestamp}
          archive={archive}
          allBeers={allBeers}
        />
      ))}
    </div>
  );
}
