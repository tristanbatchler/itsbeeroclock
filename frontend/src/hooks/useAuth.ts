import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { type User } from "@supabase/supabase-js";
import { STORAGE_KEYS } from "../lib/constants";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Force a re-render of any components that use the token
      // by updating a timestamp if needed
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

  const signInWithApple = () =>
    supabase.auth.signInWithOAuth({ provider: "apple" });

  const signInWithMagicLink = (email: string) =>
    supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithApple,
    signInWithMagicLink,
    signOut,
  };
}
