import { useEffect } from "react";
import { type User } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { saveUserProfile } from "../utils/storage";
import { STORAGE_KEYS } from "../lib/constants";
import { useBeerStore } from "../store/beerStore";

/**
 * Side-effect hook — call once near the top of the component tree (Root.tsx).
 *
 * - Fetches the cloud profile on sign-in / reconnect and writes it to the
 *   Zustand store, keeping Home and Profile in sync automatically.
 * - Syncs favourites down to localStorage on the same fetch.
 * - Clears the store profile on sign-out.
 *
 * Components that need the profile read from:
 *   const profile = useBeerStore((s) => s.profile);
 */
export function useProfileInit(user: User | null, isOnline: boolean) {
  const setProfile = useBeerStore((s) => s.setProfile);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    if (!isOnline) return;

    api
      .getProfile()
      .then((cloudProfile) => {
        if (!cloudProfile) return;
        saveUserProfile(cloudProfile);
        setProfile(cloudProfile);

        if (cloudProfile.favouriteBeerIds) {
          localStorage.setItem(
            STORAGE_KEYS.FAVOURITES,
            JSON.stringify(cloudProfile.favouriteBeerIds),
          );
        }
      })
      .catch(console.error);
  }, [user, isOnline, setProfile]);
}
