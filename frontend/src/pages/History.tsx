import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useHistorySync } from "../hooks/useHistorySync";
import { useBeerStore } from "../store/beerStore";
import { SessionCard } from "../components/SessionCard";
import { SessionCardSkeleton } from "../components/SessionCardSkeleton";
import { Link } from "react-router-dom";
import { History as HistoryIcon } from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

const SKELETON_COUNT = 3;

export function History() {
  const { user } = useAuth();
  const { profile, allBeers } = useBeerStore();
  const isOnline = useOnlineStatus();

  // Hook must be called unconditionally
  const { isSyncing, archives } = useHistorySync({
    user,
    profile,
    allBeers,
    isOnline,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <Card className="p-8 max-w-sm w-full text-center">
          <div className="bg-muted p-4 rounded-2xl inline-flex mb-4">
            <HistoryIcon className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to see your history</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your drinking history is saved to your account. Sign in to review past sessions and track your habits over time.
          </p>
          <Link to="/profile">
            <Button className="w-full">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const showSkeletons = isSyncing && archives.length === 0;
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
