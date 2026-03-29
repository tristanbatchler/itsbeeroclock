import { Beer as BeerIcon } from "lucide-react";

export function InitialLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="bg-primary/10 p-6 rounded-3xl animate-pulse">
        <BeerIcon className="size-16 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-xl font-semibold">Loading Beer O'Clock...</p>
        <p className="text-sm text-muted-foreground mt-1">
          Warming up the backend
        </p>
      </div>
    </div>
  );
}