import { useSession } from "../hooks/useSession";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useBAC } from "../hooks/useBAC";
import { useCloudSync } from "../hooks/useCloudSync";
import { useDrinkActions } from "../hooks/useDrinkActions";
import { useBeerStore } from "../store/beerStore";

import { Card } from "../components/Card";
import { DrinkLog } from "../components/DrinkLog";
import { DrinkLogger } from "../components/DrinkLogger";
import { BACCard } from "../components/BACCard";
import { BACStats } from "../components/BACStats";
import { PrivacyNotice } from "../components/PrivacyNotice";
import { UnauthenticatedNotice } from "../components/UnauthenticatedNotice";
import { ErrorBoundary } from "../components/ErrorBoundary";

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

  const bacData = useBAC(drinks, allBeers, profile);

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

      {!user && drinks.length > 0 && <UnauthenticatedNotice />}

      {profile && drinks.length > 0 && (
        <ErrorBoundary>
          <BACCard bacData={bacData} />
        </ErrorBoundary>
      )}

      <DrinkLogger onAdd={handleAddDrink} />

      {profile && drinks.length > 0 && (
        <BACStats bacData={bacData} />
      )}

      {drinks.length > 0 && (
        <ErrorBoundary>
          <DrinkLog
            drinks={drinks}
            allBeers={allBeers}
            onUndo={handleUndoLast}
            onRemoveDrink={handleRemoveDrink}
            onClear={handleClearSession}
            onRepeat={handleRepeatDrink}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
