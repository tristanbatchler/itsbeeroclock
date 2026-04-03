import { useState } from "react";
import type { Drink, Beer, DrinkSize } from "../types/drinks";
import { Repeat, Trash2, Undo2, X } from "lucide-react";
import { getDrinkDisplay } from "../utils/calculations";
import { formatRelativeTime } from "../utils/time";
import { Card } from "./Card";
import { Button } from "./Button";
import { CancelButton } from "./CancelButton";
import { Modal } from "./Modal";
import { DrinkSizeSelector } from "./DrinkSizeSelector";
import { BeerPlaceholder } from "./BeerPlaceholder";
import { beerThumbUrl } from "../utils/image";

interface Props {
  drinks: Drink[];
  allBeers: Beer[];
  onUndo: () => void;
  onRemoveDrink: (id: string) => void;
  onClear: () => void;
  onRepeat: (drink: Drink, newSize: DrinkSize) => void;
}

export function DrinkLog({
  drinks,
  allBeers,
  onUndo,
  onRemoveDrink,
  onClear,
  onRepeat,
}: Props) {
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [drinkToRepeat, setDrinkToRepeat] = useState<Drink | null>(null);
  const [repeatSize, setRepeatSize] = useState<DrinkSize | null>(null);

  const sortedDrinks = [...drinks].sort((a, b) => b.timestamp - a.timestamp);

  const handleOpenRepeat = (drink: Drink) => {
    setDrinkToRepeat(drink);
    setRepeatSize(drink.size);
  };

  const confirmRepeat = () => {
    if (drinkToRepeat && repeatSize) {
      onRepeat(drinkToRepeat, repeatSize);
      setDrinkToRepeat(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
        <h2 className="text-foreground font-bold text-xl uppercase tracking-tighter">
          History
        </h2>
        <div className="flex flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onUndo}
            className="text-[10px] font-black text-muted-foreground hover:text-primary-foreground uppercase tracking-widest"
            disabled={drinks.length === 0}
          >
            <Undo2 className="size-3 mr-1" />
            Undo previous
          </Button>
          <Button
            variant="ghost"
            onClick={() => setClearModalOpen(true)}
            className="text-[10px] font-black text-muted-foreground hover:text-destructive-foreground hover:bg-destructive uppercase tracking-widest"
            disabled={drinks.length === 0}
          >
            <X className="size-3 mr-1" />
            Clear all
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
        {sortedDrinks.map((drink) => {
          const display = getDrinkDisplay(drink, allBeers);
          const beer = allBeers.find((b) => b.id === drink.beerId);
          return (
            <Card
              key={drink.id}
              className="p-4 flex justify-between items-center border-l-4 border-primary animate-slide-in"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden mr-3">
                {beer?.image
                  ? <img
                      src={beerThumbUrl(beer.image)}
                      alt={beer.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  : beer
                    ? <BeerPlaceholder beer={beer} />
                    : null
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground leading-tight truncate">
                  {display.name}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
                  {display.size} · {formatRelativeTime(drink.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-right mr-2">
                  <div className="font-bold text-2xl text-foreground leading-none">
                    {display.standardDrinks.toFixed(1)}
                  </div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">
                    Std Drinks
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenRepeat(drink)}
                  aria-label="Repeat drink"
                  title="Repeat this drink"
                >
                  <Repeat className="size-4 text-muted-foreground hover:text-primary-foreground hover:rotate-180 transition-all duration-300" />
                </Button>

                <CancelButton
                  title="Remove drink"
                  onClick={() => onRemoveDrink(drink.id)}
                />
              </div>
            </Card>
          );
        })}
        {drinks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-xs italic">
            No drinks logged yet.
          </div>
        )}
      </div>

      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear Session?"
      >
        <div className="text-center">
          <div className="bg-destructive/10 p-5 rounded-full inline-flex items-center justify-center mb-5 border-4 border-destructive/20">
            <Trash2
              className="size-10 text-destructive"
              strokeWidth={2.5}
            />
          </div>

          <p className="text-lg font-bold text-foreground mb-2">
            Wipe your entire session?
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            This will permanently delete all drinks currently logged for
            tonight. <br />
            <strong className="text-destructive font-semibold mt-1 inline-block">
              This cannot be undone.
            </strong>
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setClearModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 shadow-lg shadow-destructive/30 border-0"
              onClick={() => {
                onClear();
                setClearModalOpen(false);
              }}
            >
              Wipe Session
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!drinkToRepeat}
        onClose={() => setDrinkToRepeat(null)}
        title="Another Round?"
      >
        <div className="text-center">
          <div className="bg-muted p-4 rounded-full inline-block mb-4">
            <Repeat className="size-8 text-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">
            Log another round of
          </p>
          <p className="text-2xl font-black text-foreground mb-6">
            {drinkToRepeat ? getDrinkDisplay(drinkToRepeat, allBeers).name : ""}
          </p>

          <div className="mb-8 text-left">
            <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide text-center">
              Change size?
            </p>
            <DrinkSizeSelector
              selectedSize={repeatSize}
              onSelectSize={(size) => setRepeatSize(size)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDrinkToRepeat(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={confirmRepeat}
            >
              Log It
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
