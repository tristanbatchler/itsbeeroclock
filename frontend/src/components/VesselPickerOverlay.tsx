import type { Beer, DRINK_SIZES } from '../types/drinks';
import { VesselButton } from './VesselButton';

interface Props {
  beer: Beer;
  onSelect: (vessel: keyof typeof DRINK_SIZES) => void;
  onClose: () => void;
}

export function VesselPickerOverlay({ beer, onSelect, onClose }: Props) {
  const primaryVessels: (keyof typeof DRINK_SIZES)[] = ['pot', 'schooner', 'pint'];
  const packagedVessels: (keyof typeof DRINK_SIZES)[] = ['can440', 'bottle330', 'bottle375', 'longneck'];

  return (
    <div className="fixed inset-0 bg-background/98 z-50 flex justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-md flex flex-col px-6 py-8">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h2 className="font-bold text-2xl text-primary italic uppercase leading-none">Select Vessel</h2>
            <div className="text-sm text-muted-foreground font-mono mt-1">{beer.name}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-mono text-xs uppercase tracking-tighter">
            [ Cancel ]
          </button>
        </header>

        <div className="space-y-8">
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Poured</h3>
            <div className="grid grid-cols-3 gap-3">
              {primaryVessels.map(v => (
                <VesselButton key={v} vesselKey={v} onClick={() => onSelect(v)} />
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Packaged</h3>
            <div className="grid grid-cols-3 gap-3">
              {packagedVessels.map(v => (
                <VesselButton key={v} vesselKey={v} onClick={() => onSelect(v)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}