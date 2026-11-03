import { create } from "zustand";
import { API_ROUTES, STORAGE_KEYS } from "../lib/constants";

export interface AuthUser {
  id: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  /** Checks the session with the server. Called once from Root. */
  initAuth: () => Promise<void>;
  /** Ends the signed-in state, keeping local drinks and the offline queue. */
  setSignedOut: () => void;
}

/** The hint only lets the signed-in UI show while offline. It grants no access. */
function readSignedInHint(): AuthUser | null {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER) ?? "null",
    );
    return typeof stored?.id === "string" ? { id: stored.id } : null;
  } catch {
    return null;
  }
}

function removeOldSupabaseSessions() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") && key.includes("-auth-token")) {
      localStorage.removeItem(key);
    }
  }
}

// Bumped on sign-out, so a session check already in flight can't sign the user back in.
let signOutCount = 0;

// The hint is read here rather than in initAuth because child effects run first:
// useProfileInit would clear the profile if the first render looked signed out.
const initialUser = readSignedInHint();

export const useAuthStore = create<AuthState>((set, get) => {
  /** Keeps the same object for the same ID, because `user` is an effect dependency. */
  const setSignedIn = (id: string) => {
    localStorage.setItem(STORAGE_KEYS.SIGNED_IN_USER, JSON.stringify({ id }));
    set((state) =>
      state.user?.id === id
        ? { loading: false }
        : { user: { id }, loading: false },
    );
  };

  return {
    user: initialUser,
    loading: initialUser === null,

    initAuth: async () => {
      removeOldSupabaseSessions();

      const startedAt = signOutCount;
      const hint = readSignedInHint();
      if (hint) setSignedIn(hint.id);

      try {
        const response = await fetch(API_ROUTES.AUTH_SESSION);
        if (startedAt !== signOutCount) return;

        if (response.status === 401) {
          get().setSignedOut();
          return;
        }
        if (!response.ok) throw new Error(`status ${response.status}`);

        const { user } = (await response.json()) as { user?: AuthUser | null };
        if (startedAt !== signOutCount) return;

        if (user === null) {
          get().setSignedOut();
        } else if (typeof user?.id === "string") {
          setSignedIn(user.id);
        } else {
          throw new Error("unexpected response");
        }
      } catch (err) {
        // A failed check must not sign anyone out, so the hint stays as it is.
        console.error("Session check failed", err);
        set({ loading: false });
      }
    },

    setSignedOut: () => {
      signOutCount++;
      localStorage.removeItem(STORAGE_KEYS.SIGNED_IN_USER);
      set({ user: null, loading: false });
    },
  };
});
