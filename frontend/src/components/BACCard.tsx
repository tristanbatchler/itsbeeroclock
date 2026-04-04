import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "./Card";
import { InfoTooltip } from "./InfoTooltip";
import { formatHours } from "../utils/time";
import type { BACResult } from "../hooks/useBAC";

interface Props {
  bacData: BACResult;
}

export function BACCard({ bacData }: Props) {
  const safe = bacData.hasValidData && bacData.canDrive;

  return (
    <Card
      className={`p-5 border-2 shadow-xl ${
        safe
          ? "bg-success/10 border-success"
          : "bg-destructive/10 border-destructive"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${safe ? "bg-success" : "bg-destructive"}`}>
          {safe ? (
            <CheckCircle2 className="size-6 text-success-foreground" strokeWidth={3} />
          ) : (
            <AlertTriangle className="size-6 text-destructive-foreground" strokeWidth={3} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className={`font-bold text-lg ${safe ? "text-success" : "text-destructive"}`}>
              {bacData.hasValidData
                ? bacData.canDrive
                  ? "Breathalyser encouraged"
                  : "Do NOT drive"
                : "Cannot calculate BAC (missing drink data)"}
            </p>
            {safe && (
              <InfoTooltip label="More information about this estimate" className="text-success/60 hover:text-success">
                <p>
                  Based on what you've logged, your estimated BAC is below the legal limit.
                  However, this is a <strong className="text-foreground">mathematical estimate</strong>.
                  Real BAC varies with food, hydration, and individual metabolism.
                </p>
                <p className="mt-1.5">
                  We strongly recommend confirming with a <strong className="text-foreground">breathalyser</strong> before
                  getting behind the wheel. When in doubt, don't drive.
                </p>
              </InfoTooltip>
            )}
          </div>
          <p className={`text-sm mt-1 ${safe ? "text-success" : "text-destructive"}`}>
            {bacData.hasValidData
              ? bacData.canDrive
                ? `Estimated under legal limit (${(bacData.currentBAC ?? 0).toFixed(3)}% BAC)`
                : `Wait ${formatHours(bacData.hoursUntilSober ?? 0)} until ${bacData.soberTime?.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
              : "Drink details are missing for some drinks. BAC cannot be shown."}
          </p>
        </div>
      </div>
    </Card>
  );
}
