import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Star,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

import {
  getCustomBeers,
  getRecentBeerIds,
  addRecentBeer,
  getUserProfile,
} from "../utils/storage";

import { useBAC } from "../hooks/useBAC";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DrinkLog } from "../components/DrinkLog";
import { DrinkSizeSelector } from "../components/DrinkSizeSelector";
import { BeerSelector } from "../components/BeerSelector";
import { PrivacyNotice } from "../components/PrivacyNotice";
import { type DrinkSize, type Beer, type Drink } from "../types/drinks";
import { formatHours } from "../utils/time";

export function Home() {
  const { drinks, addDrink, removeDrink, clearSession, undoLast } =
    useSession();
  const [selectedSize, setSelectedSize] = useState<DrinkSize>("schooner");
  const [showBeerSelector, setShowBeerSelector] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { user } = useAuth();

  const profile = getUserProfile();
  const recentIds = getRecentBeerIds();
  const [allBeers, setAllBeers] = useState<Beer[]>([]);

  useEffect(() => {
    const fetchBeers = async () => {
      try {
        const beers = (await api.getBeers()) as Beer[];
        setAllBeers([...beers, ...getCustomBeers()]);
      } catch (err) {
        console.error("Failed to fetch beers:", err);
      }
    };

    fetchBeers();
  }, []);

  useEffect(() => {
    const syncLocalDrinks = async () => {
      if (user && drinks.length > 0 && profile?.optInHistory) {
        try {
          await api.syncDrinks(drinks);
          clearSession();
        } catch (err) {
          console.error("Failed to sync drinks:", err);
        }
      }
    };
    syncLocalDrinks();
  }, [user, drinks, profile?.optInHistory, clearSession]);

  const [selectedBeer, setSelectedBeer] = useState<Beer | null>(null);

  const recentBeers = recentIds
    .map((id: string) => allBeers.find((b) => b.id === id))
    .filter(Boolean) as Beer[];

  const handleAddDrink = async () => {
    if (!selectedBeer) return setShowBeerSelector(true);

    const drinkId = window.crypto.randomUUID();
    const timestamp = new Date().getTime();

    const drink: Drink = {
      id: drinkId,
      beerId: selectedBeer.id,
      size: selectedSize,
      timestamp: timestamp,
    };
    addDrink(drink);
    addRecentBeer(selectedBeer.id);

    setJustAdded(true);

    if (profile?.optInHistory) {
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

  const bacData = useBAC(drinks, allBeers, user ? profile : null);

  useEffect(() => {
    if (
      !profile?.optInHistory &&
      drinks.length > 0 &&
      bacData.currentBAC === 0
    ) {
      try {
        localStorage.removeItem("beeroclock_session");
      } catch (error) {
        console.error("Failed to clear session from localStorage.", error);
      }
    }
  }, [profile?.optInHistory, drinks.length, bacData.currentBAC]);

  return (
    <div className="space-y-6">
      <PrivacyNotice />
      {!profile && (
        <Card className="p-5 bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-800 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white p-2 rounded-xl">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Get the full experience
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Set up your profile to see BAC estimates.
              </p>
              <Link to="/profile">
                <Button size="sm" className="shadow-md">
                  Set Up Profile
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {profile && drinks.length > 0 && (
        <Card
          className={`p-5 border-2 shadow-xl ${bacData.canDrive ? "bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700" : "bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 border-red-400 dark:border-red-700"}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl ${bacData.canDrive ? "bg-green-500" : "bg-red-500"}`}
            >
              {bacData.canDrive ? (
                <CheckCircle2 className="size-6 text-white" strokeWidth={3} />
              ) : (
                <AlertTriangle className="size-6 text-white" strokeWidth={3} />
              )}
            </div>
            <div className="flex-1">
              <p
                className={`font-bold text-lg ${bacData.canDrive ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}
              >
                {bacData.canDrive ? "✓ Safe to drive" : "⚠️ Do NOT drive"}
              </p>
              <p
                className={`text-sm mt-1 ${bacData.canDrive ? "text-green-700 dark:text-green-200" : "text-red-700 dark:text-red-200"}`}
              >
                {bacData.canDrive
                  ? `Under limit (${bacData.currentBAC.toFixed(3)}% BAC)`
                  : `Wait ${formatHours(bacData.hoursUntilSober)} until ${bacData.soberTime?.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-linear-to-br from-card to-muted/30 shadow-xl border-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-primary/20 p-2 rounded-xl">
            <Plus className="size-5 text-primary" strokeWidth={3} />
          </div>
          <h2 className="font-bold text-lg">Quick Add Drink</h2>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
            What are you drinking?
          </p>
          <button
            onClick={() => setShowBeerSelector(true)}
            className="w-full p-4 bg-primary/10 hover:bg-primary/20 rounded-2xl flex items-center justify-between transition-all group border-2 border-transparent hover:border-primary/30"
          >
            <div className="text-left">
              <p className="font-bold text-lg">{selectedBeer?.name}</p>
              {selectedBeer?.brewery && (
                <p className="text-sm text-muted-foreground">
                  {selectedBeer.brewery}
                </p>
              )}
              <p className="text-sm font-semibold text-primary mt-1">
                {selectedBeer?.abv}% ABV
              </p>
            </div>
            <div className="bg-primary/20 group-hover:bg-primary/30 p-2 rounded-xl">
              <Star className="size-5 text-primary" />
            </div>
          </button>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">
            What size?
          </p>
          <DrinkSizeSelector
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />
        </div>

        <Button
          onClick={handleAddDrink}
          className="w-full h-16 text-lg shadow-xl hover:shadow-2xl transition-all"
          size="lg"
        >
          {justAdded ? (
            <>
              <CheckCircle2 className="size-6 mr-2" strokeWidth={3} /> Added!
            </>
          ) : (
            <>
              <Plus className="size-6 mr-2" strokeWidth={3} /> Add Drink
            </>
          )}
        </Button>
      </Card>

      {recentBeers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-muted p-1.5 rounded-lg">
              <Clock className="size-4 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-sm">Recently Had</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recentBeers.map((beer: Beer) => (
              <Card
                key={beer.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-102 border-2 ${selectedBeer?.id === beer.id ? "border-primary bg-primary/10" : "border-transparent"}`}
                onClick={() => setSelectedBeer(beer)}
              >
                <p className="font-semibold text-sm line-clamp-1">
                  {beer.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {beer.abv}% ABV
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {user && profile && drinks.length > 0 && (
        <Card className="p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Current BAC
              </p>
              <p
                key={bacData.currentBAC.toFixed(3)}
                className="text-3xl font-bold text-primary animate-pop"
              >
                {bacData.currentBAC.toFixed(3)}%
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Std Drinks
              </p>
              <p
                key={bacData.totalStandardDrinks.toFixed(1)}
                className="text-3xl font-bold text-primary animate-pop"
              >
                {bacData.totalStandardDrinks.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      )}
      <DrinkLog
        drinks={drinks}
        allBeers={allBeers}
        onUndo={undoLast}
        onRemoveDrink={removeDrink}
        onClear={clearSession}
      />
      {showBeerSelector && (
        <BeerSelector
          allBeers={allBeers}
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
