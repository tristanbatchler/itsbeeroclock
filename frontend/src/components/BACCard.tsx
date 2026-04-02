import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Card } from "./Card";
import { formatHours } from "../utils/time";
import type { BACResult } from "../hooks/useBAC";
import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "../hooks/useClickOutside";

interface Props {
  bacData: BACResult;
}

export function BACCard({ bacData }: Props) {
  const safe = bacData.hasValidData && bacData.canDrive;
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const closeInfo = useCallback(() => setShowInfo(false), []);
  useClickOutside(infoRef, closeInfo, showInfo);

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
                  ? "Safe to drive"
                  : "Do NOT drive"
                : "Cannot calculate BAC (missing drink data)"}
            </p>
            {safe && (
              <div className="relative" ref={infoRef}>
                <button
                  type="button"
                  onClick={() => setShowInfo((v) => !v)}
                  className="text-success/60 hover:text-success transition-colors"
                  aria-label="More information about this estimate"
                >
                  <HelpCircle className="size-4" />
                </button>
                {showInfo && (
                  <div className="absolute right-0 top-6 z-10 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-3 shadow-lg text-xs text-muted-foreground">
                    <div className="absolute -top-1.5 right-2 size-3 rotate-45 border-l border-t border-border bg-card" />
                    <p>
                      Based on what you've logged, your estimated BAC is below the legal limit.
                      However, this is a <strong className="text-foreground">mathematical estimate</strong>.
                      Real BAC varies with food, hydration, and individual metabolism.
                    </p>
                    <p className="mt-1.5">
                      We strongly recommend confirming with a <strong className="text-foreground">breathalyser</strong> before
                      getting behind the wheel. When in doubt, don't drive.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className={`text-sm mt-1 ${safe ? "text-success" : "text-destructive"}`}>
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
