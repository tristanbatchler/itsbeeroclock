import { api } from "../lib/api";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { saveUserProfile, getFavouriteIds } from "../utils/storage";
import { Latex } from "../components/Latex";
import { useBeerStore } from "../store/beerStore";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { InfoTooltip } from "../components/InfoTooltip";
import "katex/dist/katex.min.css";
import { Modal } from "../components/Modal";
import { SignIn } from "./SignIn";
import { STORAGE_KEYS } from "../lib/constants";
import type { UserProfile } from "../types/drinks";

// ── ProfileForm ───────────────────────────────────────────────────────────────

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  user: { id: string } | null;
  onSave: (profile: UserProfile) => void;
}

function ProfileForm({ initialProfile, user, onSave }: ProfileFormProps) {
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

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age, 10);
    if (isNaN(weightNum) || weightNum <= 0) return;
    if (isNaN(heightNum) || heightNum <= 0) return;
    if (isNaN(ageNum) || ageNum <= 0) return;

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
        <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Height (cm)</label>
        <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Age (years)</label>
        <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="35" />
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

      <Button onClick={handleSave} className="w-full mt-4">
        Save Profile
      </Button>
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

  const handleSave = (updated: UserProfile) => {
    setProfile(updated);
    saveUserProfile(updated);
    navigate("/profile");
  };

  const handlePurge = async () => {
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
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
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
          />
        </Card>
      )}

      {user && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-3">How BAC is calculated</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              We use <strong className="text-foreground">Watson's formula</strong> because it
              tends to be more accurate than other blood alcohol content estimation models,
              though it does require more detailed user information: sex, weight, height, and
              age. This allows us to personally tailor your BAC estimate to your unique body
              composition, rather than relying on flat averages.
            </p>
            <p className="text-foreground font-medium">The calculation happens in three steps:</p>
            <div className="space-y-2">
              <p className="font-medium text-foreground">1. Total body water (TBW)</p>
              <p>
                TBW is a measure of how much water is actually in your body, which differs based
                on your sex, age, height, and weight. Because alcohol dissolves in water and not
                fat, it's not enough to simply look at your weight; we need these other factors
                to map out your water content and get a solid baseline.
              </p>
              <p>
                The formulas for men and women use different statistical weights, calculated
                empirically by Dr. P.E. Watson in his original 1980 research:
              </p>
              <div className="overflow-x-auto py-1"><Latex formula="tbwFormula" /></div>
              <p>Where, for people identifying as female have:</p>
              <div className="overflow-x-auto py-1"><Latex formula="tbwFemale" /></div>
              <p>And all others have:</p>
              <div className="overflow-x-auto py-1"><Latex formula="tbwMale" /></div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">2. The alcohol jump</p>
              <p>
                The alcohol jump is the exact spike in your blood alcohol as you consume a
                drink. In Australia, one standard drink is defined as exactly 10 grams of ethanol.
              </p>
              <p>
                Because alcohol distributes itself evenly through all the water in your body,
                we calculate its concentration based on your TBW. But since we are looking for{" "}
                <em>Blood</em> Alcohol Content, we also have to account for the fact that human
                blood is about 80.6% water. When we run the math to convert those grams and
                litres into a standard BAC percentage, it gives us this clean formula:
              </p>
              <div className="overflow-x-auto py-1"><Latex formula="bacJump" /></div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">3. Metabolism</p>
              <p>
                Metabolism is where the liver processes the alcohol in your bloodstream. Unlike
                a lot of things your body processes, alcohol burns off at a fairly consistent,
                flat rate regardless of how much you've had. We use the commonly accepted
                average metabolic rate of 0.015% BAC per hour.
              </p>
              <p>
                Your BAC at any given moment is just the sum of all the spikes from the drinks
                you've logged, minus the steady amount your liver has cleared since your first drink:
              </p>
              <div className="overflow-x-auto py-1"><Latex formula="bacNow" /></div>
            </div>
            <hr className="border-border" />
            <p className="text-xs italic">
              <strong className="not-italic text-foreground">Disclaimer:</strong> While Watson's
              formula is a highly regarded mathematical model, everybody is different. Factors
              like food intake, genetics, and general liver health play a massive role in
              real-world alcohol metabolism. This calculation is a guide to help you track your
              night, and should <strong>never</strong> be used as a definitive test of whether
              you are legally or safely able to drive.
            </p>
          </div>
        </Card>
      )}

      {user && (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <h3 className="text-lg font-bold text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete all your data from this device and the cloud.
          </p>
          <Button variant="destructive" className="w-full" onClick={() => setShowPurgeModal(true)}>
            Purge All Data
          </Button>
        </Card>
      )}

      <Modal isOpen={showPurgeModal} onClose={() => setShowPurgeModal(false)} title="Purge All Data?">
        <div className="text-center">
          <p className="text-destructive font-bold mb-4">This will permanently delete:</p>
          <ul className="text-left text-sm space-y-1 mb-6">
            <li>• All drinks</li>
            <li>• Profile settings</li>
            <li>• Custom beers & favourites</li>
            <li>• All local app data</li>
          </ul>
          <p className="text-destructive text-xs mb-6">This cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowPurgeModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handlePurge}>
              Yes, purge everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
