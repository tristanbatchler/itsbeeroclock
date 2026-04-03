import { Link } from "react-router-dom";
import { Sparkles, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { NotificationCard } from "./NotificationCard";
import { Button } from "./Button";
import { STORAGE_KEYS } from "../lib/constants";

type ProfileNoticeVariant = "unauthenticated" | "incomplete";

const VARIANTS: Record<
  ProfileNoticeVariant,
  {
    storageKey: string;
    icon: React.ReactNode;
    title: string;
    description: string;
  }
> = {
  unauthenticated: {
    storageKey: STORAGE_KEYS.UNAUTH_DISMISSED,
    icon: (
      <div className="bg-primary/20 text-primary p-2 rounded-xl">
        <Sparkles className="size-5" />
      </div>
    ),
    title: "Get the full experience",
    description:
      "You're tracking anonymously. Create a free account to unlock BAC insights, cross-device syncing, and more — completely optional.",
  },
  incomplete: {
    storageKey: STORAGE_KEYS.PROFILE_NOTICE_DISMISSED,
    icon: (
      <div className="bg-warning/20 text-warning p-2 rounded-xl">
        <UserRoundCog className="size-5" />
      </div>
    ),
    title: "Set up your profile for BAC tracking",
    description:
      "We need your weight, height, age, and sex to estimate your blood alcohol level. Without it, BAC features are disabled.",
  },
};

interface ProfileNoticeProps {
  variant: ProfileNoticeVariant;
}

export function ProfileNotice({ variant }: ProfileNoticeProps) {
  const config = VARIANTS[variant];

  const [visible, setVisible] = useState(() => {
    try {
      return !window.localStorage.getItem(config.storageKey);
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(config.storageKey, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <NotificationCard
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={
        <Link to="/profile">
          <Button size="sm" className="shadow-md">
            Set Up Profile
          </Button>
        </Link>
      }
      onDismiss={handleDismiss}
      colorClassName={
        variant === "incomplete"
          ? "bg-warning/5 border-warning/30"
          : "bg-muted/60 border-border"
      }
    />
  );
}
