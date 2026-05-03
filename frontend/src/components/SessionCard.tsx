import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { SessionArchive, Beer, CheckInResponse } from "../types/drinks";
import { getDrinkDisplay } from "../utils/calculations";
import { Card } from "./Card";
import { BACGraph } from "./BACGraph";
import { BeerPlaceholder } from "./BeerPlaceholder";
import { beerThumbUrl } from "../utils/image";
import { ErrorBoundary } from "./ErrorBoundary";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { formatHours } from "../utils/time";

interface SessionCardProps {
  archive: SessionArchive;
  allBeers?: Beer[];
  onUpdateArchive?: (archive: SessionArchive) => Promise<void>;
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

export function SessionCard({ archive, allBeers = [], onUpdateArchive }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [checkInToDelete, setCheckInToDelete] = useState<CheckInResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCheckIn = async () => {
    if (!checkInToDelete || !archive.checkIns) return;
    setIsDeleting(true);
    try {
      const updatedArchive: SessionArchive = {
        ...archive,
        checkIns: archive.checkIns.filter((c) => c.id !== checkInToDelete.id),
      };
      if (onUpdateArchive) {
        await onUpdateArchive(updatedArchive);
      }
      setCheckInToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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
              <div className="font-bold text-2xl text-foreground leading-none">
                {archive.totalStandardDrinks.toFixed(1)}
              </div>
              <div className="text-[8px] text-muted-foreground uppercase font-black">
                Std Drinks
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-2xl text-foreground leading-none">
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
              const beer = allBeers.find((b) => b.id === drink.beerId);
              return (
                <div
                  key={drink.id}
                  className="flex items-center justify-between py-1 gap-3"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden">
                    {beer?.image
                      ? <img
                          src={beerThumbUrl(beer.image)}
                          alt={beer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      : beer
                        ? <BeerPlaceholder beer={beer} />
                        : null
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground leading-tight truncate">
                      {display.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5 tracking-wide">
                      {display.size}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-lg text-foreground leading-none">
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

            {archive.bacCurve?.some((s) => s.bac > 0) && (
              <ErrorBoundary>
                <BACGraph
                  snapshots={archive.bacCurve!}
                  startTime={archive.startTimestamp}
                  endTime={archive.endTimestamp}
                />
              </ErrorBoundary>
            )}

            {(archive.checkIns?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                  Notes Check-Ins
                </div>
                {archive.checkIns!.map((checkIn) => (
                  <div key={checkIn.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-foreground">
                        {new Date(checkIn.timestamp).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-destructive inline-flex items-center gap-1"
                        onClick={() => setCheckInToDelete(checkIn)}
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last drink gap: {checkIn.lastDrinkDeltaMs === null ? "N/A" : formatHours(checkIn.lastDrinkDeltaMs / 3_600_000)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Feelings: {checkIn.feelings.length > 0 ? checkIn.feelings.join(", ") : "Skipped"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Intoxication: {checkIn.intoxication ? checkIn.intoxication.replaceAll("_", " ") : "Skipped"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Water: {typeof checkIn.hadWater === "boolean" ? (checkIn.hadWater ? "Yes" : "No") : "Skipped"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Food: {typeof checkIn.hadFood === "boolean" ? (checkIn.hadFood ? "Yes" : "No") : "Skipped"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Social: {checkIn.socialContext ? checkIn.socialContext.replaceAll("_", " ") : "Skipped"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Time until 0.05 BAC: {checkIn.timeUntilSoberMs === null ? "N/A" : formatHours(checkIn.timeUntilSoberMs / 3_600_000)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sounds good: {typeof checkIn.timeUntilSoberConsent === "boolean" ? (checkIn.timeUntilSoberConsent ? "Yes" : "No") : "Skipped"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        isOpen={checkInToDelete !== null}
        onClose={() => setCheckInToDelete(null)}
        title="Delete check-in?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This deletes this check-in response from the archived session. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCheckInToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={deleteCheckIn}
              disabled={isDeleting}
            >
              Delete check-in
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
