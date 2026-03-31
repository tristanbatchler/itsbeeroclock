import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "./Card";
import { formatHours } from "../utils/time";
import type { BACResult } from "../hooks/useBAC";

interface Props {
  bacData: BACResult;
}

/**
 * Displays the drive/don't-drive status card with current BAC and sober time.
 */
export function BACCard({ bacData }: Props) {
  const safe = bacData.hasValidData && bacData.canDrive;

  return (
    <Card
      className={`p-5 border-2 shadow-xl ${safe ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${safe ? "bg-primary" : "bg-destructive"}`}>
          {bacData.hasValidData && bacData.canDrive ? (
            <CheckCircle2 className="size-6 text-primary-foreground" strokeWidth={3} />
          ) : (
            <AlertTriangle className="size-6 text-primary-foreground" strokeWidth={3} />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-bold text-lg ${safe ? "text-primary-foreground" : "text-destructive"}`}>
            {bacData.hasValidData
              ? bacData.canDrive
                ? "✓ Safe to drive"
                : "⚠️ Do NOT drive"
              : "Cannot calculate BAC (missing drink data)"}
          </p>
          <p className={`text-sm mt-1 ${safe ? "text-primary-foreground" : "text-destructive"}`}>
            {bacData.hasValidData
              ? bacData.canDrive
                ? `Under limit (${(bacData.currentBAC ?? 0).toFixed(3)}% BAC)`
                : `Wait ${formatHours(bacData.hoursUntilSober ?? 0)} until ${bacData.soberTime?.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
              : "Drink details are missing for some drinks. BAC cannot be shown."}
          </p>
        </div>
      </div>
    </Card>
  );
}
