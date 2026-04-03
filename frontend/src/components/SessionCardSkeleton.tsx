export function SessionCardSkeleton() {
  return (
    <div className="rounded-3xl border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right space-y-1">
            <div className="h-7 w-10 rounded bg-muted" />
            <div className="h-2 w-14 rounded bg-muted" />
          </div>
          <div className="text-right space-y-1">
            <div className="h-7 w-10 rounded bg-muted" />
            <div className="h-2 w-14 rounded bg-muted" />
          </div>
          <div className="h-4 w-4 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
