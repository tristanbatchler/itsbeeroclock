import { api } from "../lib/api";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { saveUserProfile, getFavouriteIds } from "../utils/storage";
import { useBeerStore } from "../store/beerStore";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { InfoTooltip } from "../components/InfoTooltip";
import "katex/dist/katex.min.css";
import { Modal } from "../components/Modal";
import { SignIn } from "./SignIn";
import { CheckCircle2, Beer as BeerIcon } from "lucide-react";
import type { UserProfile } from "../types/drinks";

// ── ProfileForm ───────────────────────────────────────────────────────────────

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  user: { id: string } | null;
  onSave: (profile: UserProfile) => void;
  onDeleteRequest: () => void;
}

function ProfileForm({ initialProfile, user, onSave, onDeleteRequest }: ProfileFormProps) {
  const [sex, setGender] = useState<"male" | "female">(
    initialProfile?.profileSetup ? (initialProfile.sex ?? "male") : "male",
  );
  const [weight, setWeight] = useState(
    initialProfile?.profileSetup ? (initialProfile.weight?.toString() ?? "") : "",
  );
  const [height, setHeight] = useState(
    initialProfile?.profileSetup ? (initialProfile.height?.toString() ?? "") : "",
  );
  const [age, setAge] = useState(
    initialProfile?.profileSetup ? (initialProfile.age?.toString() ?? "") : "",
  );
  const [optInHistory, setOptInHistory] = useState(
    initialProfile?.optInHistory ?? true,
  );
  const [shakeWeight, setShakeWeight] = useState(false);
  const [shakeHeight, setShakeHeight] = useState(false);
  const [shakeAge, setShakeAge] = useState(false);
  const [saved, setSaved] = useState(false);

  const shake = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 500);
  };

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age, 10);
    let invalid = false;
    if (isNaN(weightNum) || weightNum <= 0) { shake(setShakeWeight); invalid = true; }
    if (isNaN(heightNum) || heightNum <= 0) { shake(setShakeHeight); invalid = true; }
    if (isNaN(ageNum) || ageNum <= 0) { shake(setShakeAge); invalid = true; }
    if (invalid) return;

    const updated: UserProfile = {
      sex,
      weight: weightNum,
      height: heightNum,
      age: ageNum,
      optInHistory,
      favouriteBeerIds: getFavouriteIds(),
      profileSetup: true,
    };

    onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);

    if (user) {
      try {
        await api.updateProfile(updated);
      } catch {
        // silently fail — local state is already updated
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-sm font-medium text-foreground">Sex</label>
          <InfoTooltip label="Why do we ask for sex?">
            <p>
              If you identify as a sex different from the one you were assigned at birth,
              choose the one that reflects your{" "}
              <strong className="text-foreground">current physiology</strong>. This gives
              us the most accurate BAC estimate.
            </p>
            <p className="mt-1.5">
              On <strong className="text-foreground">HRT?</strong> Select the option that
              aligns with your current hormonal profile. HRT shifts body composition over
              time, but please try and place yourself to one side for the purpose of the
              limited model. Thank you for understanding.
            </p>
          </InfoTooltip>
        </div>
        <div className="flex gap-4">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                sex === g
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Weight (kg)</label>
        <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80"
          className={shakeWeight ? "animate-shake ring-2 ring-destructive" : ""} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Height (cm)</label>
        <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175"
          className={shakeHeight ? "animate-shake ring-2 ring-destructive" : ""} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Age (years)</label>
        <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="35"
          className={shakeAge ? "animate-shake ring-2 ring-destructive" : ""} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={optInHistory}
          onChange={(e) => setOptInHistory(e.target.checked)}
          className="size-5 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">Save my drinking history</span>
        <InfoTooltip label="Why save drinking history?">
          <p>
            Keeping this on lets you review your past sessions in the{" "}
            <strong className="text-foreground">History</strong> tab — useful for spotting
            patterns over time.
          </p>
          <p className="mt-1.5">
            Your data is stored securely and never sold. Read our{" "}
            <Link
              to="/privacy"
              className="underline hover:text-info font-semibold text-foreground"
            >
              Privacy Policy
            </Link>{" "}
            for the full details.
          </p>
        </InfoTooltip>
      </label>

      <div className="flex gap-3 mt-4">
        <Button onClick={handleSave} className="flex-1">
          {saved ? <><CheckCircle2 className="size-4 mr-2" /> Saved!</> : "Save Profile"}
        </Button>
        {user && (
          <Button variant="destructive" onClick={onDeleteRequest} className="shrink-0">
            Delete data
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────

export function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const profile = useBeerStore((s) => s.profile);
  const setProfile = useBeerStore((s) => s.setProfile);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showFirstSaveNotice, setShowFirstSaveNotice] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleSave = (updated: UserProfile) => {
    const isFirstSetup = !profile?.profileSetup;
    setProfile(updated);
    saveUserProfile(updated);
    if (isFirstSetup) setShowFirstSaveNotice(true);
  };

  const handlePurge = async () => {
    // Clear cloud data first
    if (user) {
      try {
        await api.clearUserData();
      } catch (err) {
        console.error("Failed to purge backend data", err);
      }
    }
    // Wipe localStorage before signing out so auth state change handlers
    // can't write anything back between the clear and the navigation.
    localStorage.clear();
    if (user) {
      try {
        await signOut();
      } catch (err) {
        console.error("Sign out failed", err);
      }
    }
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showFirstSaveNotice && (
        <div className="rounded-2xl border border-success/40 bg-success/10 p-5 flex items-start gap-3 animate-fade-in">
          <div className="bg-success p-2 rounded-xl shrink-0">
            <BeerIcon className="size-5 text-success-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground mb-1">You're all set!</p>
            <p className="text-sm text-muted-foreground mb-3">
              Your profile is saved. Head to the tracker to start logging drinks and see your BAC estimates.
            </p>
            <button
              onClick={() => navigate("/")}
              className="text-sm font-bold text-success underline underline-offset-2"
            >
              Go to tracker →
            </button>
          </div>
          <button
            onClick={() => setShowFirstSaveNotice(false)}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {!user ? (
        <SignIn />
      ) : (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Your Details</h2>
            <Button variant="ghost" size="sm" onClick={signOut} className="hover:bg-destructive hover:text-destructive-foreground">
              Sign Out
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Used to calculate accurate BAC estimates
          </p>
          <ProfileForm
            key={profile?.profileSetup ? "loaded" : "empty"}
            initialProfile={profile}
            user={user}
            onSave={handleSave}
            onDeleteRequest={() => { setDeleteConfirmText(""); setShowPurgeModal(true); }}
          />
        </Card>
      )}

      {user && (
        <Modal isOpen={showPurgeModal} onClose={() => setShowPurgeModal(false)} title="Delete all data?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently deletes all your drinks, profile, custom beers, and history — from this device and the cloud. It cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Type <span className="font-mono font-bold text-destructive">delete</span> to confirm
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete"
                className="font-mono"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPurgeModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirmText !== "delete"}
                onClick={handlePurge}
              >
                Delete everything
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
