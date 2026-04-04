import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBeerStore } from "../store/beerStore";
import { saveCustomBeer } from "../utils/storage";
import { api } from "../lib/api";
import { createThumbnail } from "../utils/image";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Camera, LogIn, ShieldAlert } from "lucide-react";
import type { Beer } from "../types/drinks";

export function AddBeer() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const addBeersToStore = useBeerStore((s) => s.addBeersToStore);

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
      image: thumbnail,
      isCustom: true,
    };

    // Save locally first so it's available immediately offline
    saveCustomBeer(newBeer);
    addBeersToStore([newBeer]);

    if (user) {
      try {
        const saved = await api.addCustomBeer(newBeer);
        // Swap local base64 for the permanent S3 URL if the upload succeeded
        if (saved.image && saved.image !== newBeer.image) {
          saveCustomBeer(saved);
          addBeersToStore([saved]);
        }
      } catch (err: unknown) {
        // NETWORK_ERROR_QUEUED means it's in the offline queue — that's fine.
        // Any other error is a real failure worth logging.
        if (err instanceof Error && err.message !== "NETWORK_ERROR_QUEUED") {
          console.error("Failed to sync custom beer to cloud:", err);
        }
      }
    }

    setSaving(false);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Checking sign-in status...</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-2 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Sign in required</h2>
              <p className="text-sm text-foreground/90 mt-2">
                Custom beers are account-based. Sign in to create and sync your custom beers across devices.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate("/sign-in")} className="w-full sm:w-auto">
                  <LogIn className="size-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="w-full sm:w-auto"
                >
                  Back to Tracker
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
        </div>
      </Card>
    </div>
  );
}