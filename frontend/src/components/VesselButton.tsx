import { DRINK_SIZES } from '../types/drinks';
import { Button } from './Button';

interface Props {
  vesselKey: keyof typeof DRINK_SIZES;
  onClick: () => void;
}

export function VesselButton({ vesselKey, onClick }: Props) {
  const ml = DRINK_SIZES[vesselKey];
  return (
    <Button variant="outline" onClick={onClick} className="flex flex-col items-center justify-center p-4 h-24">
      <span>{vesselKey}</span>
      <span className="text-xs text-muted-foreground">{ml}ml</span>
    </Button>
  );
}