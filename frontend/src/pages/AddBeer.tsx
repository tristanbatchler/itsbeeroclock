import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBeers } from "../contexts/BeerContext";
import { saveCustomBeer } from "../utils/storage";
import { api } from "../lib/api";
import { createThumbnail } from "../utils/image";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Camera } from "lucide-react";
import type { Beer } from "../types/drinks";

export function AddBeer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addBeersToStore } = useBeers();

  const [name, setName] = useState("");
  const [brewery, setBrewery] = useState("");
  const [abv, setAbv] = useState("5.0");
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setThumbnail(await createThumbnail(file));
    } catch (err) {
      console.error("Thumbnail generation failed:", err);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !abv) return;
    setSaving(true);

    const newBeer: Beer = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      brewery: brewery.trim() || "Custom",
      abv: parseFloat(abv),
      // Store the local base64 thumbnail so the beer renders correctly offline.
      // If cloud sync succeeds below, state is updated with the S3 URL.
      image: thumbnail,
      isCustom: true,
    };

    saveCustomBeer(newBeer);
    addBeersToStore([newBeer]);
    navigate("/");

    // Cloud sync is fire-and-forget after navigation. On success, swap the local
    // base64 image for the permanent S3 URL so subsequent renders use the CDN.
    if (user) {
      api.addCustomBeer(newBeer)
        .then((saved) => {
          if (saved.image && saved.image !== newBeer.image) {
            addBeersToStore([saved]);
          }
        })
        .catch((err) => console.error("Failed to sync custom beer to cloud:", err));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Add Custom Beer</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Photo (optional)
            </label>
            <label className="flex items-center gap-4 cursor-pointer">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {thumbnail ? (
                  <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="size-6 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {thumbnail ? "Tap to change photo" : "Tap to take or upload a photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="sr-only"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Beer Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Hazy IPA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Brewery (optional)
            </label>
            <Input
              value={brewery}
              onChange={(e) => setBrewery(e.target.value)}
              placeholder="Local Brew Co"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">ABV (%)</label>
            <Input
              type="number"
              step="0.1"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder="5.0"
            />
          </div>

          <Button
            onClick={handleSave}
            className="w-full mt-4"
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Save Beer"}
          </Button>

          {!user && (
            <p className="text-xs text-muted-foreground text-center">
              Sign in to save your custom beers across devices.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}