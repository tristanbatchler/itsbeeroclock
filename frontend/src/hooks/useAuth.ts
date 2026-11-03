import { API_ROUTES, STORAGE_KEYS } from "../lib/constants";
import { useAuthStore } from "../store/authStore";

function signInWithGoogle() {
  window.location.assign(API_ROUTES.GOOGLE_START);
}

/**
 * Only the backend can clear the httpOnly session cookie, so a failed request
 * throws and leaves everything signed in. On success, the queue goes too, so one
 * account's queued changes can't be sent under the next account.
 */
async function signOut() {
  const response = await fetch(API_ROUTES.SIGN_OUT, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Sign out failed with status ${response.status}`);
  }
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  useAuthStore.getState().setSignedOut();
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  return { user, loading, signInWithGoogle, signOut };
}
