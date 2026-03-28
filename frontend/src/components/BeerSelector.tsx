import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Plus, Beer as BeerIcon } from "lucide-react";
import type { Beer } from "../types/drinks";
import { getFavouriteIds, toggleFavourite } from "../utils/storage";
import { Input } from "./Input";
import { Button } from "./Button";
import { Card } from "./Card";
import { CancelButton } from "./CancelButton";

interface Props {
  allBeers: Beer[];
  onSelect: (beer: Beer) => void;
  onClose: () => void;
}

export function BeerSelector({ allBeers, onSelect, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const [searchQuery, setSearchQuery] = useState("");
  const [favouriteIds, setFavouriteIds] = useState<string[]>(getFavouriteIds());
  const [activeTab, setActiveTab] = useState<"all" | "favourites">("all");

  const filteredBeers = useMemo(() => {
    let beers = allBeers;
    if (activeTab === "favourites")
      beers = beers.filter((b) => favouriteIds.includes(b.id));
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      beers = beers.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.brewery?.toLowerCase().includes(query),
      );
    }
    return beers;
  }, [allBeers, favouriteIds, activeTab, searchQuery]);

  const handleToggleFavourite = (beerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavourite(beerId);
    setFavouriteIds(getFavouriteIds());
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-border animate-slide-in">
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              <BeerIcon className="size-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Select a Beer</h2>
          </div>
          <CancelButton onClick={onClose} />
        </div>

        <div className="p-4 border-b border-border relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            placeholder="Search beers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
            autoFocus
          />
        </div>

        {/* Simple Tab Implementation to avoid external dependencies */}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredBeers.map((beer) => {
            const isFav = favouriteIds.includes(beer.id);
            return (
              <Card
                key={beer.id}
                className="p-4 cursor-pointer hover:border-primary/30 transition-all border-2 border-transparent"
                onClick={() => onSelect(beer)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-base">{beer.name}</p>
                      {beer.isCustom && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-lg font-semibold">
                          Custom
                        </span>
                      )}
                    </div>
                    {beer.brewery && (
                      <p className="text-sm text-muted-foreground">
                        {beer.brewery}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-1">
                      {beer.abv}% ABV
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleToggleFavourite(beer.id, e)}
                  >
                    <Star
                      className={`size-6 transition-all ${isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                    />
                  </Button>
                </div>
              </Card>
            );
          })}

          {filteredBeers.length === 0 && (
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
