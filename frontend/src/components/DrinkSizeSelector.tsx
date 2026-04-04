import { DRINK_SIZES, DRINK_LABELS, type DrinkSize } from "../types/drinks";
import {
  PotIcon,
  SchonerIcon,
  PintIcon,
  CanIcon,
  BottleIcon,
} from "./BeerSizeIcons";

export type DrinkMode = "pub" | "home";

export const PUB_SIZES: DrinkSize[] = ["pot", "schooner", "pint"];
export const HOME_SIZES: DrinkSize[] = ["bottle330", "tinnie", "longneck"];
export const ALL_SIZES: DrinkSize[] = [...PUB_SIZES, ...HOME_SIZES];

interface Props {
  selectedSize: DrinkSize | null;
  onSelectSize: (size: DrinkSize) => void;
  mode?: DrinkMode; // omit to show all sizes (e.g. repeat modal)
}

const sizeIcons: Record<DrinkSize, React.ElementType> = {
  pot: PotIcon,
  schooner: SchonerIcon,
  pint: PintIcon,
  jug: PintIcon,
  tinnie: CanIcon,
  bottle330: BottleIcon,
  bottle375: BottleIcon,
  longneck: BottleIcon,
};

export function DrinkSizeSelector({ selectedSize, onSelectSize, mode }: Props) {
  const sizes = mode === "pub" ? PUB_SIZES : mode === "home" ? HOME_SIZES : ALL_SIZES;

  return (
    <div className="w-full bg-muted/40 p-1.5 rounded-2xl flex items-stretch border border-border/50 shadow-inner">
      {sizes.map((size) => {
        const ml = DRINK_SIZES[size];
        const label = DRINK_LABELS[size];
        const Icon = sizeIcons[size];
        const isActive = selectedSize === size;

        return (
          <button
            key={size}
            onClick={() => onSelectSize(size)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
              isActive
                ? "bg-card text-foreground shadow-md ring-1 ring-border/50 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Icon
              className={`size-6 mb-1 transition-colors ${isActive ? "text-primary-foreground" : "text-muted-foreground/50"}`}
            />
            <span className="font-bold text-sm leading-none">{label}</span>
            <span className="text-[10px] mt-1 font-medium text-muted-foreground">
              {ml}ml
            </span>
          </button>
        );
      })}
    </div>
  );
}
