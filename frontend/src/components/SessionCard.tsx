import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SessionArchive, Beer } from "../types/drinks";
import { getDrinkDisplay } from "../utils/calculations";
import { Card } from "./Card";

interface SessionCardProps {
  archive: SessionArchive;
  allBeers?: Beer[];
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export function SessionCard({ archive, allBeers = [] }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground leading-tight">
            {formatDateTime(archive.startTimestamp)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wide">
            {formatDuration(archive.durationMinutes)}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="font-bold text-2xl text-primary-foreground leading-none">
              {archive.totalStandardDrinks.toFixed(1)}
            </div>
            <div className="text-[8px] text-muted-foreground uppercase font-black">
              Std Drinks
            </div>
          </div>

          <div className="text-right">
            <div className="font-bold text-2xl text-primary-foreground leading-none">
              {archive.peakBAC.toFixed(2)}
            </div>
            <div className="text-[8px] text-muted-foreground uppercase font-black">
              Peak BAC
            </div>
          </div>

          <div className="text-muted-foreground">
            {expanded
              ? <ChevronUp className="size-4" />
              : <ChevronDown className="size-4" />}
          </div>
        </div>
      </button>

      {/* Expanded drink list */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
          {archive.drinks.map((drink) => {
            const display = getDrinkDisplay(drink, allBeers);
            return (
              <div
                key={drink.id}
                className="flex items-center justify-between py-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground leading-tight truncate">
                    {display.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5 tracking-wide">
                    {display.size}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-bold text-lg text-primary-foreground leading-none">
                    {display.standardDrinks.toFixed(1)}
                  </div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">
                    Std
                  </div>
                </div>
              </div>
            );
          })}
          {archive.drinks.length === 0 && (
            <div className="text-xs text-muted-foreground italic text-center py-2">
              No drinks recorded.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
