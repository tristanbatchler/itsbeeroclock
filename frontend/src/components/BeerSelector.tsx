import { useState, useEffect, useRef, useCallback } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { Link } from "react-router-dom";
import { Search, Star, Plus, Beer as BeerIcon } from "lucide-react";
import type { Beer } from "../types/drinks";
import { getFavouriteIds, toggleFavourite, getCachedBeers, getCustomBeers, getUserProfile } from "../utils/storage";
import { api } from "../lib/api";
import { Input } from "./Input";
import { Button } from "./Button";
import { Card } from "./Card";
import { CancelButton } from "./CancelButton";
import { BeerPlaceholder } from "./BeerPlaceholder";
import { useBeers } from "../contexts/BeerContext";


interface Props {
  onSelect: (beer: Beer) => void;
  onClose: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function thumbUrl(image: string): string {
  // If it's an S3 URL or a Base64 string, just use it directly!
  if (image.startsWith("http") || image.startsWith("data:")) {
    return image;
  }
  // Otherwise, process it as a local catalogue image
  const filename = image.split("/").pop()!;
  const base = filename.replace(/\.[^.]+$/, "");
  return `/beer_images/thumbs/${base}.webp`;
}

export function BeerSelector({ onSelect, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const { addBeersToStore } = useBeers();
  const [beers, setBeers] = useState<Beer[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<string[]>(getFavouriteIds());
  const [activeTab, setActiveTab] = useState<"all" | "favourites">("all");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const lastKeyRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose, true);

  const loadMore = useCallback(
    async (reset: boolean) => {
      if (isFetchingRef.current) return;
      if (!reset && !hasMoreRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);

      try {
        const data = await api.getBeers({
          limit: 30,
          lastKey: !reset ? lastKeyRef.current : undefined,
          search: debouncedSearch || undefined,
        });
        const newBeers: Beer[] = data.beers ?? [];

        const custom = reset ? getCustomBeers().filter((b) =>
          !debouncedSearch || 
          b.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          b.brewery?.toLowerCase().includes(debouncedSearch.toLowerCase())
        ) : [];
        setBeers((prev) => reset ? [...custom, ...newBeers] : [...prev, ...newBeers]);
        addBeersToStore(newBeers);

        lastKeyRef.current = data.lastKey ?? null;
        hasMoreRef.current = data.hasMore ?? false;
        setHasMore(data.hasMore ?? false);
      } catch (err) {
        console.error("Failed to load beers:", err);
        if (reset) {
          const cached = [...getCachedBeers(), ...getCustomBeers()];
          setBeers(cached);
          hasMoreRef.current = false;
          setHasMore(false);
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [debouncedSearch, addBeersToStore]
  );

  useEffect(() => {
    // Reset all pagination state when search changes, then load fresh
    lastKeyRef.current = null;
    hasMoreRef.current = true;
    isFetchingRef.current = false;
    loadMore(true);
  }, [debouncedSearch, loadMore]);
  // Note: loadMore is stable when debouncedSearch hasn't changed (useCallback with
  // [debouncedSearch] deps), so including it here does not cause extra fetches.

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore(false);
      },
      { rootMargin: "100px" }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleToggleFavourite = async (beerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavourite(beerId);
    const newFavs = getFavouriteIds();
    setFavouriteIds(newFavs);

    // Sync to cloud if user is logged in
    const profile = getUserProfile();
    if (profile) {
      try {
        await api.updateProfile({ ...profile, favouriteBeerIds: newFavs });
      } catch (err) {
        console.error("Failed to sync favourites", err);
      }
    }
  };

  const displayedBeers = beers.filter((b) =>
    activeTab === "favourites" ? favouriteIds.includes(b.id) : true
  );

  return (
    <div
      className="fixed inset-0 bg-background/80 dark:bg-background/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-border animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              <BeerIcon className="size-5 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Select a Beer</h2>
          </div>
          <CancelButton onClick={onClose} />
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border relative bg-muted/30">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            placeholder="Search beers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
            autoFocus
          />
        </div>

        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-border bg-muted/20">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
            className="flex-1"
          >
            All Beers
          </Button>
          <Button
            variant={activeTab === "favourites" ? "default" : "outline"}
            onClick={() => setActiveTab("favourites")}
            className="flex-1"
          >
            <Star className="size-4 mr-2" /> Favourites ({favouriteIds.length})
          </Button>
        </div>

        {/* Beer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-80">
          {displayedBeers.map((beer) => {
            const isFav = favouriteIds.includes(beer.id);
            return (
              <Card
                key={beer.id}
                className="p-4 cursor-pointer hover:border-primary/40 transition-all border-2 border-transparent group"
                onClick={() => onSelect(beer)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                    {beer.image
                      ? <img
                          src={thumbUrl(beer.image)}
                          alt={beer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      : <BeerPlaceholder beer={beer} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-base text-foreground truncate max-w-56">
                        {beer.name}
                      </p>
                      {beer.isCustom && (
                        <span className="text-xs bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-lg font-semibold">
                          Custom
                        </span>
                      )}
                    </div>
                    {beer.brewery && (
                      <p className="text-xs text-muted-foreground mb-0.5 truncate max-w-48">
                        {beer.brewery}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-muted-foreground mt-1">
                      {beer.abv}% ABV
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleToggleFavourite(beer.id, e)}
                    className="group-hover:bg-primary/10"
                  >
                    <Star
                      className={`size-6 transition-all ${isFav ? "fill-primary text-primary-foreground" : "text-muted-foreground"}`}
                    />
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Sentinel element — when this scrolls into view, the next page loads */}
          {hasMore && <div ref={observerTarget} className="h-1" />}

          {loading && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Loading more beers...
            </p>
          )}

          {displayedBeers.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <BeerIcon className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold mb-1">No beers found</p>
              {searchQuery && (
                <Link to="/add-beer" onClick={onClose}>
                  <Button variant="outline" className="mt-4">
                    <Plus className="size-4 mr-2" /> Add Custom Beer
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Add Custom Beer Button */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Link to="/add-beer" onClick={onClose}>
            <Button variant="outline" className="w-full">
              <Plus className="size-5 mr-2" /> Add Custom Beer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}