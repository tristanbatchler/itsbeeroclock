import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { NotificationCard } from "./NotificationCard";
import { Button } from "./Button";

const UNAUTH_NOTICE_DISMISSED_KEY = "beeroclock_unauth_notice_dismissed";

export function UnauthenticatedNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      const dismissed = window.localStorage.getItem(
        UNAUTH_NOTICE_DISMISSED_KEY,
      );
      return !dismissed;
    } catch {
      // If localStorage is unavailable (e.g. private mode), always show
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(UNAUTH_NOTICE_DISMISSED_KEY, "1");
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
          <Sparkles className="size-5" />
        </div>
      }
      title={"Get the full experience"}
      description={
        <>
          You are currently tracking your drinks anonymously, but creating a
          profile is quick, free, and can unlock personal BAC insights,
          cross-device syncing, and more! But don't worry, at the end of the
          day, it's completely optional.
        </>
      }
      action={
        <Link to="/profile">
          <Button size="sm" className="shadow-md">
            Set Up Profile
          </Button>
        </Link>
      }
      onDismiss={handleDismiss}
      colorClassName="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-800"
    />
  );
}
