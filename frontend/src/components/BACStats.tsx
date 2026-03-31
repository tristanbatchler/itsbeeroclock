import { Card } from "./Card";
import type { BACResult } from "../hooks/useBAC";

interface Props {
  bacData: BACResult;
}

/**
 * Two-stat grid showing current BAC percentage and total standard drinks.
 */
export function BACStats({ bacData }: Props) {
  return (
    <Card className="p-6 shadow-xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-muted/50 rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
            Current BAC
          </p>
          <p
            key={bacData.currentBAC !== null ? bacData.currentBAC.toFixed(3) : "0.000"}
            className="text-3xl font-bold text-primary-foreground animate-pop"
          >
            {bacData.currentBAC !== null ? bacData.currentBAC.toFixed(3) : "0.000"}%
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
  );
}
