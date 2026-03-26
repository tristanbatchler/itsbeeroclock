import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ 
    provider: 'google', 
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline', 
        prompt: 'consent',
      },
    },
  });
  const signInWithApple = () => supabase.auth.signInWithOAuth({ provider: 'apple' });
  const signInWithMagicLink = (email: string) => supabase.auth.signInWithOtp({ email });
  const signOut = () => supabase.auth.signOut();

  return { user, loading, signInWithGoogle, signInWithApple, signInWithMagicLink, signOut };
}