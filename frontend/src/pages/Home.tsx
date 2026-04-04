import { useSession } from "../hooks/useSession";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useBAC } from "../hooks/useBAC";
import { useCloudSync } from "../hooks/useCloudSync";
import { useDrinkActions } from "../hooks/useDrinkActions";
import { useBeerStore } from "../store/beerStore";
import { useSessionChecker } from "../hooks/useSessionChecker";
import { useRef, useState, useEffect } from "react";

import { Card } from "../components/Card";
import { DrinkLog } from "../components/DrinkLog";
import { DrinkLogger } from "../components/DrinkLogger";
import { BACCard } from "../components/BACCard";
import { BACStats } from "../components/BACStats";
import { BACGraph } from "../components/BACGraph";
import { PrivacyNotice } from "../components/PrivacyNotice";
import { ProfileNotice } from "../components/ProfileNotice";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useBACGraph } from "../hooks/useBACGraph";

export function Home() {
  const { drinks, addDrink, removeDrink, undoLast, clearSession, setAllDrinks } = useSession();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const allBeers = useBeerStore((s) => s.allBeers);
  const beersLoading = useBeerStore((s) => s.beersLoading);
  const profile = useBeerStore((s) => s.profile);

  const { isApiDown } = useCloudSync({ drinks, setAllDrinks, user, profile, isOnline });
  const { handleAddDrink, handleRemoveDrink, handleUndoLast, handleClearSession, handleRepeatDrink } =
    useDrinkActions({ drinks, profile, addDrink, removeDrink, undoLast, clearSession });

  useSessionChecker({ drinks, allBeers, profile, clearSession });

  const bacData = useBAC(drinks, allBeers, profile);
  const { snapshots, startTime, endTime } = useBACGraph(drinks, allBeers, profile);

  const profileReady = !!profile?.profileSetup;
  const drinkLogRef = useRef<HTMLDivElement>(null);

  // Keep drink UI visible briefly after the last drink is removed so it can fade out
  const [showDrinkUI, setShowDrinkUI] = useState(drinks.length > 0);
  const [fadingOut, setFadingOut] = useState(false);
  useEffect(() => {
    if (drinks.length > 0) {
      setShowDrinkUI(true);
      setFadingOut(false);
    } else if (showDrinkUI) {
      setFadingOut(true);
      const t = setTimeout(() => {
        setShowDrinkUI(false);
        setFadingOut(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [drinks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!beersLoading && allBeers.length === 0 && (isApiDown || !isOnline)) {
    return (
      <Card className="p-6 my-10 text-center">
        <p className="font-bold text-lg mb-2">No beers available offline.</p>
        <p className="text-muted-foreground mb-2">
          Please connect to the internet once to load the beer catalogue.
        </p>
        <p className="text-xs text-muted-foreground">
          Offline mode cannot show drink details or calculate BAC until beers
          are loaded at least once.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PrivacyNotice />

      {!user && drinks.length > 0 && <ProfileNotice variant="unauthenticated" />}

      {user && profile && !profile.profileSetup && <ProfileNotice variant="incomplete" />}

      {showDrinkUI && (
        <div
          className="space-y-6"
          style={{ transition: "opacity 0.3s ease-out", opacity: fadingOut ? 0 : 1 }}
        >
          {profileReady && (
            <ErrorBoundary>
              <BACCard bacData={bacData} />
            </ErrorBoundary>
          )}
        </div>
      )}

      <DrinkLogger onAdd={handleAddDrink} drinkLogRef={drinkLogRef} />

      {showDrinkUI && (
        <div
          className="space-y-6"
          style={{ transition: "opacity 0.3s ease-out", opacity: fadingOut ? 0 : 1 }}
        >

          <BACStats bacData={bacData} showBAC={profileReady} />

          <ErrorBoundary>
            <div ref={drinkLogRef}>
              <DrinkLog
                drinks={drinks}
                allBeers={allBeers}
                onUndo={handleUndoLast}
                onRemoveDrink={handleRemoveDrink}
                onClear={handleClearSession}
                onRepeat={handleRepeatDrink}
              />
            </div>
          </ErrorBoundary>

          {profileReady && (
            <ErrorBoundary>
              <BACGraph snapshots={snapshots} startTime={startTime} endTime={endTime} />
            </ErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
