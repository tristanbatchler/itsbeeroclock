import { useState } from "react";
import { Plus, AlertTriangle, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { type Beer, type Drink, type DrinkSize } from "../types/drinks";
import { Button } from "./Button";
import { Card } from "./Card";
import { DrinkSizeSelector } from "./DrinkSizeSelector";
import { BeerSelector } from "./BeerSelector";
import { BeerPlaceholder } from "./BeerPlaceholder";
import { beerThumbUrl } from "../utils/image";
import { STORAGE_KEYS } from "../lib/constants";

function getLastBeer(): Beer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_BEER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastBeer(beer: Beer) {
  localStorage.setItem(STORAGE_KEYS.LAST_BEER, JSON.stringify(beer));
}

interface Props {
  onAdd: (drink: Drink) => void;
}

/**
 * Self-contained drink logging card.
 * Owns beer/size selection, validation feedback, and the submit action.
 * Calls onAdd with a fully-formed Drink once the user confirms.
 */
export function DrinkLogger({ onAdd }: Props) {
  const [selectedBeer, setSelectedBeer] = useState<Beer | null>(getLastBeer);
  const [selectedSize, setSelectedSize] = useState<DrinkSize | null>(null);
  const [showBeerSelector, setShowBeerSelector] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [shakeBeer, setShakeBeer] = useState(false);
  const [shakeSize, setShakeSize] = useState(false);

  let currentError = "";
  if (hasAttemptedSubmit) {
    if (!selectedBeer && !selectedSize) currentError = "Please select a beer and size.";
    else if (!selectedBeer) currentError = "Please select a beer to log.";
    else if (!selectedSize) currentError = "Please select a drink size.";
  }

  const handleSubmit = () => {
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
    const drink: Drink = {
      id: window.crypto.randomUUID(),
      beerId: selectedBeer.id,
      size: selectedSize,
      timestamp: Date.now(),
    };
    onAdd(drink);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 750);
  };

  return (
    <>
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
                    shakeBeer ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Search className="size-6" strokeWidth={2.5} />
                </div>
                <div>
                  <p
                    className={`font-black text-lg uppercase tracking-tight leading-none ${
                      shakeBeer ? "text-destructive dark:text-destructive" : "text-foreground"
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
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden">
                  {selectedBeer.image
                    ? <img
                        src={beerThumbUrl(selectedBeer.image)}
                        alt={selectedBeer.name}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    : <BeerPlaceholder beer={selectedBeer} />
                  }
                </div>
                <div className="flex-1 px-4 border-r border-border/50">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {selectedBeer.name}
                  </h3>
                  {selectedBeer.brewery && (
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedBeer.brewery}</p>
                  )}
                  <p className="text-xs font-black text-primary mt-2 bg-primary/10 inline-block px-2 py-1 rounded-md tracking-wide">
                    {selectedBeer.abv}% ABV
                  </p>
                </div>
                <div className="bg-muted group-hover:bg-primary/10 px-3 py-2.5 rounded-xl transition-colors ml-4 shrink-0 flex items-center gap-1 border border-border group-hover:border-primary/60">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                    Change
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground group-hover:text-primary" strokeWidth={3} />
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
              shakeSize ? "animate-shake ring-2 ring-destructive ring-offset-2 ring-offset-card" : ""
            }`}
          >
            <DrinkSizeSelector selectedSize={selectedSize} onSelectSize={setSelectedSize} />
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
          onClick={handleSubmit}
          className="w-full h-16 text-lg shadow-xl hover:shadow-2xl transition-all"
          size="lg"
        >
          {justAdded ? (
            <><CheckCircle2 className="size-6 mr-2" strokeWidth={3} /> Logged!</>
          ) : (
            <><Plus className="size-6 mr-2" strokeWidth={3} /> Log Drink</>
          )}
        </Button>
      </Card>

      {showBeerSelector && (
        <BeerSelector
          onSelect={(beer) => {
            setSelectedBeer(beer);
            saveLastBeer(beer);
            setShowBeerSelector(false);
          }}
          onClose={() => setShowBeerSelector(false)}
        />
      )}
    </>
  );
}
