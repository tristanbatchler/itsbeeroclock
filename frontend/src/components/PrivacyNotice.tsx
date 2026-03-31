import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useState } from "react";
import { NotificationCard } from "./NotificationCard";
import { STORAGE_KEYS } from "../lib/constants";


export function PrivacyNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEYS.PRIVACY_DISMISSED);
      return !dismissed;
    } catch {
      // If localStorage is unavailable (e.g. private mode), always show
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.PRIVACY_DISMISSED, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <NotificationCard
      icon={
        <div className="bg-primary text-primary-foreground p-2 rounded-xl">
          <Shield className="size-5" />
        </div>
      }
      title={"We value your privacy."}
      description={
        <>
          Read our{" "}
          <Link
            to="/privacy"
            className="underline hover:text-primary-foreground font-semibold"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </>
      }
      onDismiss={handleDismiss}
      colorClassName="bg-primary/5 border-primary/30 mt-2 mb-4"
    />
  );
}
