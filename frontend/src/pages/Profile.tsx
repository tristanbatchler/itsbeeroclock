import { api } from "../lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  getUserProfile,
  saveUserProfile,
  getFavouriteIds,
} from "../utils/storage";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { SignIn } from "./SignIn";

export function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const existing = getUserProfile();

  const [gender, setGender] = useState<"male" | "female">(
    existing?.gender || "male",
  );
  const [weight, setWeight] = useState(existing?.weight?.toString() || "80");
  const [optInHistory, setOptInHistory] = useState(
    existing?.optInHistory ?? true,
  );

  const [showPurgeModal, setShowPurgeModal] = useState(false);

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) return;

    const profile = {
      gender,
      weight: weightNum,
      optInHistory,
      favouriteBeerIds: getFavouriteIds(),
    };

    saveUserProfile(profile);

    if (user) {
      try {
        await api.updateProfile(profile);
      } catch {
        // silently fail
      }
    }

    navigate("/");
  };

  const handlePurge = async () => {
    // Backend wipe (if logged in)
    if (user) {
      try {
        await api.clearUserData();
      } catch (err) {
        console.error("Failed to purge backend data", err);
      }

      try {
        await signOut();
      } catch (err) {
        console.error("Sign out failed", err);
      }
    }

    // Clear only app-specific storage
    const keys = [
      "beeroclock_session",
      "beeroclock_profile",
      "beeroclock_custom_beers",
      "beeroclock_favourite_ids",
      "beeroclock_beers",
      "beeroclock_privacy_dismissed",
      "beeroclock_unauth_notice_dismissed",
      "beeroclock_offline_queue",
    ];

    keys.forEach((key) => localStorage.removeItem(key));

    // Hard reset app
    window.location.href = "/";
  };

  useEffect(() => {
    if (!user) return;

    api
      .getProfile()
      .then((cloud) => {
        if (cloud) {
          setGender(cloud.gender as "male" | "female");
          setWeight(cloud.weight.toString());
          setOptInHistory(cloud.optInHistory);
          saveUserProfile(cloud); // ✅ keep local in sync (bug fix)
        }
      })
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!user ? (
        <SignIn />
      ) : (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Your Details
            </h2>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Used to calculate accurate BAC estimates
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Gender
              </label>
              <div className="flex gap-4">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`px-6 py-2 rounded-xl font-medium transition-all ${
                      gender === g
                        ? "bg-primary text-primary-foreground" // ✅ fixed typo
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Weight (kg)
              </label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="80"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={optInHistory}
                onChange={(e) => setOptInHistory(e.target.checked)}
                className="size-5 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">
                Save my drinking history
              </span>
            </label>

            <Button onClick={handleSave} className="w-full mt-4">
              Save Profile
            </Button>
          </div>
        </Card>
      )}

      {/* ✅ ALWAYS VISIBLE PURGE SECTION */}
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <h3 className="text-lg font-bold text-destructive mb-2">
          Danger Zone
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete all your data from this device
          {user && " and the cloud"}.
        </p>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowPurgeModal(true)}
        >
          Purge All Data
        </Button>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        title="Purge All Data?"
      >
        <div className="text-center">
          <p className="text-destructive font-bold mb-4">
            This will permanently delete:
          </p>

          <ul className="text-left text-sm space-y-1 mb-6">
            <li>• All drinks</li>
            <li>• Profile settings</li>
            <li>• Custom beers & favourites</li>
            <li>• All local app data</li>
          </ul>

          <p className="text-destructive text-xs mb-6">
            This cannot be undone.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPurgeModal(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              className="flex-1"
              onClick={handlePurge}
            >
              Yes, purge everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}