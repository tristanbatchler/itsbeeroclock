import type { Drink } from "../types/drinks";
import { getDrinkDisplay } from "../utils/calculations";
import { formatRelativeTime } from "../utils/time";
import { Card } from "./Card";
import { Button } from "./Button";
import { type Beer } from "../types/drinks";
import { CancelButton } from "./CancelButton";

interface Props {
  drinks: Drink[];
  allBeers: Beer[];
  onUndo: () => void;
  onRemoveDrink: (id: string) => void;
  onClear: () => void;
}

export function DrinkLog({
  drinks,
  allBeers,
  onUndo,
  onRemoveDrink,
  onClear,
}: Props) {
  const sortedDrinks = [...drinks].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
        <h2 className="text-primary font-bold text-xl uppercase tracking-tighter">
          History
        </h2>
        <div className="flex flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onUndo}
            className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest"
            disabled={drinks.length === 0}
          >
            [ Undo Last ]
          </Button>
          <Button
            variant="destructive"
            onClick={onClear}
            className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest"
            disabled={drinks.length === 0}
          >
            [ Clear All ]
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
        {sortedDrinks.map((drink) => {
          const display = getDrinkDisplay(drink, allBeers);
          return (
            <Card
              key={drink.id}
              className="p-4 flex justify-between items-center border-l-4 border-primary animate-slide-in"
            >
              <div>
                <div className="font-bold text-foreground leading-tight">
                  {display.name}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
                  {display.size} · {formatRelativeTime(drink.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-bold text-2xl text-primary">
                    {display.standardDrinks.toFixed(1)}
                  </div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">
                    Std Drinks
                  </div>
                </div>
                <CancelButton onClick={() => onRemoveDrink(drink.id)} />
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
    </div>
  );
}
