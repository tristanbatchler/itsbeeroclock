import { DRINK_SIZES } from '../types/drinks';
import { calcStandardDrinks } from '../utils/calculations';

interface Props {
  beerName: string;
  brewery: string;
  abv: number;
  vesselKey: keyof typeof DRINK_SIZES;
  onClick: () => void;
}

export function QuickAddCard({ beerName, brewery, abv, vesselKey, onClick }: Props) {
  const ml = DRINK_SIZES[vesselKey];
  const std = calcStandardDrinks(ml, abv);

  return (
    <button
      onClick={onClick}
      className="flex flex-col p-4 bg-card border border-border rounded-lg 
                 text-left transition-all active:scale-[0.97] active:border-primary group"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🍺</span>
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">
          {vesselKey}
        </span>
      </div>
      
      <div className="flex-1">
        <div className="text-lg font-bold text-foreground leading-tight mb-0.5">{beerName}</div>
        <div className="text-xs text-muted-foreground font-medium mb-4">{brewery}</div>
      </div>

      <div className="flex justify-between items-end">
        <div className="text-[10px] text-muted-foreground uppercase font-bold leading-none mb-1">
          Standard-drinks
        </div>
        <div className="font-bold text-4xl text-primary leading-none">
          {std.toFixed(1)}
        </div>
      </div>
    </button>
  );
}