import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useState } from "react";
import { NotificationCard } from "./NotificationCard";

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
    <NotificationCard
      icon={
        <div className="bg-amber-500 text-white p-2 rounded-xl">
          <Shield className="size-5" />
        </div>
      }
      title={"We value your privacy."}
      description={
        <>
          Read our{" "}
          <Link
            to="/privacy"
            className="underline hover:text-amber-700 dark:hover:text-amber-300 font-semibold"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </>
      }
      onDismiss={handleDismiss}
      colorClassName="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-800 mt-2 mb-4"
    />
  );
}
