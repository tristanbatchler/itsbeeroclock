import { HelpCircle, X } from "lucide-react";
import { useState } from "react";

interface InfoTooltipProps {
  children: React.ReactNode;
  label?: string;
}

/**
 * A ? button that opens a centered bottom-sheet style popup.
 * Avoids all overflow issues by not using absolute positioning.
 */
export function InfoTooltip({ children, label = "More information" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={label}
      >
        <HelpCircle className="size-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl text-sm text-muted-foreground space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
