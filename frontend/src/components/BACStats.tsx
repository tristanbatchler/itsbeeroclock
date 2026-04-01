import { Card } from "./Card";
import type { BACResult } from "../hooks/useBAC";

interface Props {
  bacData: BACResult;
  /** When false, only the std drinks stat is shown (no profile = no BAC). */
  showBAC?: boolean;
}

/**
 * Stat card showing total standard drinks, and optionally current BAC.
 * Unauthenticated users see std drinks only — enough to self-calculate BAC.
 */
export function BACStats({ bacData, showBAC = true }: Props) {
  return (
    <Card className="p-6 shadow-xl">
      <div className={`grid gap-4 ${showBAC ? "grid-cols-2" : "grid-cols-1"}`}>
        {showBAC && (
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
        )}
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
