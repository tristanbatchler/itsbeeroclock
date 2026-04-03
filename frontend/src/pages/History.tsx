import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useHistorySync } from "../hooks/useHistorySync";
import { useBeerStore } from "../store/beerStore";
import { SessionCard } from "../components/SessionCard";
import { SessionCardSkeleton } from "../components/SessionCardSkeleton";

// How many skeletons to show when we have no local archives yet
const SKELETON_COUNT = 3;

export function History() {
  const { user } = useAuth();
  const { profile, allBeers } = useBeerStore();
  const isOnline = useOnlineStatus();

  const { isSyncing, archives } = useHistorySync({
    user,
    profile,
    allBeers,
    isOnline,
  });

  // Still waiting on the first load with nothing to show yet
  const showSkeletons = isSyncing && archives.length === 0;

  // Syncing but we already have local data — overlay skeletons in place of
  // the real cards so the layout doesn't shift when remote data arrives
  const showOverlaySkeletons = isSyncing && archives.length > 0;

  return (
    <div className="p-4 space-y-3">
      {showSkeletons &&
        Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <SessionCardSkeleton key={i} />
        ))}

      {!isSyncing && archives.length === 0 && (
        <div className="text-center text-muted-foreground py-12 text-sm space-y-2">
          <p>No sessions recorded yet.</p>
          <p className="text-xs">
            Sessions appear here automatically once your estimated BAC returns
            to zero and you haven't logged a drink for at least two hours.
          </p>
        </div>
      )}

      {showOverlaySkeletons
        ? archives.map((archive) => (
            <SessionCardSkeleton key={archive.startTimestamp} />
          ))
        : archives.map((archive) => (
            <SessionCard
              key={archive.startTimestamp}
              archive={archive}
              allBeers={allBeers}
            />
          ))}
    </div>
  );
}
