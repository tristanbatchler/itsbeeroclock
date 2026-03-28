import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useState } from "react";
import { CancelButton } from "./CancelButton";

const PRIVACY_DISMISSED_KEY = "beeroclock_privacy_dismissed";

export function PrivacyNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      const dismissed = window.localStorage.getItem(PRIVACY_DISMISSED_KEY);
      return !dismissed;
    } catch {
      // If localStorage is unavailable (e.g. private mode), always show
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(PRIVACY_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-2xl px-4 py-2 mt-2 mb-4 shadow-sm animate-fade-in">
      <Shield className="size-4 text-amber-600 dark:text-amber-200" />
      <span className="text-xs text-amber-900 dark:text-amber-100">
        We value your privacy.{" "}
        <Link
          to="/privacy"
          className="underline hover:text-amber-700 dark:hover:text-amber-300 font-semibold"
        >
          Read our Privacy Policy
        </Link>
      </span>
      <CancelButton onClick={handleDismiss} />
    </div>
  );
}
