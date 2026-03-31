import { useState, useEffect, useRef } from "react";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Search,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

import { getUserProfile, saveUserProfile } from "../utils/storage";

import { useBAC } from "../hooks/useBAC";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DrinkLog } from "../components/DrinkLog";
import { DrinkSizeSelector } from "../components/DrinkSizeSelector";
import { BeerSelector } from "../components/BeerSelector";
import { PrivacyNotice } from "../components/PrivacyNotice";
import { UnauthenticatedNotice } from "../components/UnauthenticatedNotice";
import {
  type DrinkSize,
  type Beer,
  type Drink,
  type UserProfile,
} from "../types/drinks";
import { formatHours } from "../utils/time";
import { useBeers } from "../contexts/BeerContext";
import { STORAGE_KEYS } from "../lib/constants";
import { ErrorBoundary } from "../components/ErrorBoundary";

export function Home() {
  const {
    drinks,
    addDrink,
    removeDrink,
    clearSession,
    undoLast,
    setAllDrinks,
  } = useSession();

  // beersLoading now comes from useBeers context
  const [isApiDown, setIsApiDown] = useState(false);
  const [selectedSize, setSelectedSize] = useState<DrinkSize | null>(null);
  const [showBeerSelector, setShowBeerSelector] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [shakeBeer, setShakeBeer] = useState(false);
  const [shakeSize, setShakeSize] = useState(false);

  const { allBeers, beersLoading } = useBeers();

  const hasHydratedRef = useRef(false);
  const isOnline = useOnlineStatus();

  const { user } = useAuth();

  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(
    getUserProfile()
  );

  useEffect(() => {
    if (!user || !isOnline) return;

    api
      .getProfile()
      .then((cloudProfile) => {
        if (cloudProfile) {
          saveUserProfile(cloudProfile);
          setActiveProfile(cloudProfile);

          // Sync favorites down to this device
          if (cloudProfile.favouriteBeerIds) {
            localStorage.setItem(
              STORAGE_KEYS.FAVOURITES,
              JSON.stringify(cloudProfile.favouriteBeerIds),
            );
          }
        }
      })
      .catch(console.error);
  }, [user, isOnline]);

  useEffect(() => {
    if (!isOnline) {
      hasHydratedRef.current = false;
      return;
    }

    // Only run if we are online, the API is up, and we haven't already hydrated this session
    if (
      !isOnline ||
      !user ||
      !activeProfile?.optInHistory ||
      hasHydratedRef.current
    )
      return;

    const hydrateAndFlush = async () => {
      hasHydratedRef.current = true;

      try {
        // 1. Flush any queued requests first
        await api.processOfflineQueue();

        // 2. Fetch the latest from the server
        const serverDrinks = (await api.getDrinks()) || [];

        // 3. Find any local drinks that didn't make it to the server
        const serverIds = new Set(serverDrinks.map((d: Drink) => d.id));
        const localOnly = drinks.filter((d) => !serverIds.has(d.id));

        // 4. Merge them together and update the UI
        const merged = [...serverDrinks, ...localOnly].sort(
          (a, b) => b.timestamp - a.timestamp,
        );

        setAllDrinks(merged);
        setIsApiDown(false);
      } catch (err) {
        console.error("Hydration failed", err);
        setIsApiDown(true);
        hasHydratedRef.current = false; // Allow retry on next connection
      }
    };

    hydrateAndFlush();
    // We explicitly omit 'drinks' and 'setAllDrinks' to prevent infinite looping
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isApiDown, user, activeProfile?.optInHistory]);

  useEffect(() => {
    if (!isOnline || isApiDown) return;
    if (!user || !activeProfile?.optInHistory || drinks.length === 0) return;

    const timeout = setTimeout(() => {
      api.syncDrinks(drinks).catch(() => setIsApiDown(true));
    }, 300);

    return () => clearTimeout(timeout);
  }, [drinks, isOnline, isApiDown, user, activeProfile?.optInHistory]);

  useEffect(() => {
    if (!user) setActiveProfile(null);
  }, [user]);

  const [selectedBeer, setSelectedBeer] = useState<Beer | null>(null);

  let currentError = "";
  if (hasAttemptedSubmit) {
    if (!selectedBeer && !selectedSize) {
      currentError = "Please select a beer and size.";
    } else if (!selectedBeer) {
      currentError = "Please select a beer to log.";
    } else if (!selectedSize) {
      currentError = "Please select a drink size.";
    }
  }

  const handleAddDrink = async () => {
    if (!selectedBeer || !selectedSize) {
      setHasAttemptedSubmit(true);
      if (!selectedBeer) {
        setShakeBeer(true);
        setTimeout(() => setShakeBeer(false), 500);
      }
      if (!selectedSize) {
        setShakeSize(true);
        setTimeout(() => setShakeSize(false), 500);
      }
      return;
    }

    setHasAttemptedSubmit(false);

    const drinkId = window.crypto.randomUUID();
    const timestamp = new Date().getTime();

    const drink: Drink = {
      id: drinkId,
      beerId: selectedBeer.id,
      size: selectedSize,
      timestamp: timestamp,
    };
    addDrink(drink);
    setJustAdded(true);

    if (activeProfile?.optInHistory) {
      try {
        await api.addDrink({
          id: drinkId,
          beerId: selectedBeer.id,
          size: selectedSize,
          timestamp: timestamp,
        });
      } catch (err) {
        console.error("Failed to back up to cloud:", err);
      }
    }

    setTimeout(() => setJustAdded(false), 750);
  };

  const handleRemoveDrink = (id: string) => {
    const drink = drinks.find((d) => d.id === id);
    removeDrink(id);

    if (activeProfile?.optInHistory && drink) {
      api.deleteDrink(drink.id, drink.timestamp).catch(console.error);
    }
  };

  const handleUndoLast = () => {
    if (drinks.length === 0) return;

    const last = drinks[drinks.length - 1];
    undoLast();

    if (activeProfile?.optInHistory && last) {
      api.deleteDrink(last.id, last.timestamp).catch(console.error);
    }
  };

  const handleClearSession = () => {
    const all = [...drinks];
    clearSession();

    if (activeProfile?.optInHistory) {
      Promise.all(all.map((d) => api.deleteDrink(d.id, d.timestamp))).catch(
        console.error,
      );
    }
  };

  const handleRepeatDrink = async (drinkToCopy: Drink, newSize: DrinkSize) => {
    setHasAttemptedSubmit(false);
    setShakeBeer(false);
    setShakeSize(false);

    const beerToSelect = allBeers.find((b) => b.id === drinkToCopy.beerId);
    if (beerToSelect) setSelectedBeer(beerToSelect);
    setSelectedSize(newSize);

    const drinkId = window.crypto.randomUUID();
    const timestamp = new Date().getTime();

    const newDrink: Drink = {
      id: drinkId,
      beerId: drinkToCopy.beerId,
      size: newSize,
      timestamp: timestamp,
    };

    addDrink(newDrink);

    if (activeProfile?.optInHistory) {
      try {
        await api.addDrink(newDrink);
      } catch (err) {
        console.error("Failed to back up to cloud:", err);
      }
    }
  };

  const bacData = useBAC(drinks, allBeers, activeProfile);

  // Show warning if no beers loaded
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

      {activeProfile && drinks.length > 0 && (
        <ErrorBoundary>
          <Card
            className={`p-5 border-2 shadow-xl ${bacData.hasValidData && bacData.canDrive ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive"}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl ${bacData.hasValidData && bacData.canDrive ? "bg-primary" : "bg-destructive"}`}
              >
                {bacData.hasValidData ? (
                  bacData.canDrive ? (
                    <CheckCircle2 className="size-6 text-primary-foreground" strokeWidth={3} />
                  ) : (
                    <AlertTriangle
                      className="size-6 text-primary-foreground"
                      strokeWidth={3}
                    />
                  )
                ) : (
                  <AlertTriangle className="size-6 text-primary-foreground" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-bold text-lg ${bacData.hasValidData && bacData.canDrive ? "text-primary-foreground" : "text-destructive"}`}
                >
                  {bacData.hasValidData
                    ? bacData.canDrive
                      ? "✓ Safe to drive"
                      : "⚠️ Do NOT drive"
                    : "Cannot calculate BAC (missing drink data)"}
                </p>
                <p
                  className={`text-sm mt-1 ${bacData.hasValidData && bacData.canDrive ? "text-primary-foreground" : "text-destructive"}`}
                >
                  {bacData.hasValidData
                    ? bacData.canDrive
                      ? `Under limit (${(bacData.currentBAC ?? 0).toFixed(3)}% BAC)`
                      : `Wait ${formatHours(bacData.hoursUntilSober ?? 0)} until ${bacData.soberTime?.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
                    : "Drink details are missing for some drinks. BAC cannot be shown."}
                </p>
              </div>
            </div>
          </Card>
        </ErrorBoundary>
      )}

      <Card className="p-6 bg-card shadow-xl border-2">
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">
            What are you drinking?
          </p>

          <button
            onClick={() => setShowBeerSelector(true)}
            className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98] cursor-pointer text-left ${
              shakeBeer
                ? "animate-shake border-2 border-destructive border-dashed bg-destructive/10"
                : selectedBeer
                  ? "bg-card border-2 border-border hover:border-primary/80 hover:bg-primary/5 shadow-sm hover:shadow-md"
                  : "bg-primary/5 border-2 border-primary border-dashed hover:bg-primary/10 hover:border-primary/80"
            }`}
          >
            {!selectedBeer ? (
              <div className="flex items-center gap-4 w-full py-2">
                <div
                  className={`p-3 rounded-xl shadow-sm transition-colors ${
                    shakeBeer
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Search className="size-6" strokeWidth={2.5} />
                </div>
                <div>
                  <p
                    className={`font-black text-lg uppercase tracking-tight leading-none ${
                      shakeBeer
                        ? "text-destructive dark:text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    Choose your beer
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    Tap to browse catalogue
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 pr-4 border-r border-border/50">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary-foreground transition-colors leading-tight">
                    {selectedBeer.name}
                  </h3>
                  {selectedBeer.brewery && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedBeer.brewery}
                    </p>
                  )}
                  <p className="text-xs font-black text-primary-foreground mt-2 bg-primary/10 inline-block px-2 py-1 rounded-md tracking-wide">
                    {selectedBeer.abv}% ABV
                  </p>
                </div>

                <div className="bg-muted group-hover:bg-primary/10 px-3 py-2.5 rounded-xl transition-colors ml-4 shrink-0 flex items-center gap-1 border border-border group-hover:border-primary/60">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary-foreground">
                    Change
                  </span>
                  <ChevronRight
                    className="size-3 text-muted-foreground group-hover:text-primary-foreground"
                    strokeWidth={3}
                  />
                </div>
              </>
            )}
          </button>
        </div>

        <div className="mb-2">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">
            What size?
          </p>
          <div
            className={`transition-all rounded-2xl ${
              shakeSize
                ? "animate-shake ring-2 ring-destructive ring-offset-2 ring-offset-card"
                : ""
            }`}
          >
            <DrinkSizeSelector
              selectedSize={selectedSize}
              onSelectSize={(size) => setSelectedSize(size)}
            />
          </div>
        </div>

        <div className="h-6 mb-2 flex items-center justify-center">
          {currentError && (
            <p className="text-destructive font-semibold text-sm animate-fade-in flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-destructive" />
              {currentError}
            </p>
          )}
        </div>

        <Button
          onClick={handleAddDrink}
          className="w-full h-16 text-lg shadow-xl hover:shadow-2xl transition-all"
          size="lg"
        >
          {justAdded ? (
            <>
              <CheckCircle2 className="size-6 mr-2" strokeWidth={3} /> Logged!
            </>
          ) : (
            <>
              <Plus className="size-6 mr-2" strokeWidth={3} /> Log Drink
            </>
          )}
        </Button>
      </Card>

      {activeProfile && drinks.length > 0 && (
        <Card className="p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Current BAC
              </p>
              <p
                key={
                  bacData.currentBAC !== null
                    ? bacData.currentBAC.toFixed(3)
                    : "0.000"
                }
                className="text-3xl font-bold text-primary-foreground animate-pop"
              >
                {bacData.currentBAC !== null
                  ? bacData.currentBAC.toFixed(3)
                  : "0.000"}
                %
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Std Drinks
              </p>
              <p
                key={bacData.totalStandardDrinks.toFixed(1)}
                className="text-3xl font-bold text-primary-foreground animate-pop"
              >
                {bacData.totalStandardDrinks.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
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

      {showBeerSelector && (
        <BeerSelector
          onSelect={(beer: Beer) => {
            setSelectedBeer(beer);
            setShowBeerSelector(false);
          }}
          onClose={() => setShowBeerSelector(false)}
        />
      )}
    </div>
  );
}
