import { DRINK_SIZES, type DrinkSize } from '../types/drinks';
import { Button } from './Button';
import { PotIcon, SchonerIcon, PintIcon, CanIcon, BottleIcon } from './BeerSizeIcons';

interface Props {
  selectedSize: DrinkSize;
  onSelectSize: (size: DrinkSize) => void;
}

const BAR_SIZES: DrinkSize[] = ['pot', 'schooner', 'pint'];
const sizeIcons: Record<DrinkSize, React.ElementType> = {
  pot: PotIcon,
  schooner: SchonerIcon,
  pint: PintIcon,
  jug: PintIcon, // Placeholders
  tinnie: CanIcon,
  can440: CanIcon,
  bottle330: BottleIcon,
  bottle375: BottleIcon,
  longneck: BottleIcon,
};

export function DrinkSizeSelector({ selectedSize, onSelectSize }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-lg">
            <PintIcon className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-bold text-foreground/80">At the Bar</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {BAR_SIZES.map(size => {
            const ml = DRINK_SIZES[size];
            const label = size.charAt(0).toUpperCase() + size.slice(1);
            const Icon = sizeIcons[size];
            return (
              <Button
                key={size}
                variant={selectedSize === size ? 'default' : 'outline'}
                onClick={() => onSelectSize(size)}
                className={`flex flex-col h-auto py-4 gap-2 transition-all ${
                  selectedSize === size ? 'shadow-lg ring-2 ring-primary/20' : ''
                }`}
              >
                <Icon className="size-8" />
                <div>
                  <span className="font-bold text-base block">{label}</span>
                  <span className="text-xs opacity-80">{ml}ml</span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
      {/* Similar implementation for PACKAGE_SIZES can be mirrored here if needed! */}
    </div>
  );
}