import type { Beer, Drink, UserProfile, SessionArchive } from "../types/drinks";
import { STORAGE_KEYS } from "./constants";
import { supabase } from "./supabase";

const QUEUE_KEY = STORAGE_KEYS.OFFLINE_QUEUE;

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: string;
}

export function queueRequest(endpoint: string, options: RequestInit) {
  try {
    const queue: QueuedRequest[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]",
    );

    // If this is a DELETE, check if there's a pending POST for the same item.
    // If so, they cancel each other out. Just remove the POST and don't queue the DELETE.
    if (options.method === "DELETE") {
      const urlParams = new URLSearchParams(endpoint.split("?")[1]);
      const targetId = urlParams.get("id");

      const pendingPostIndex = queue.findIndex(
        (req) =>
          req.method === "POST" &&
          req.body &&
          JSON.parse(req.body).id === targetId,
      );

      if (pendingPostIndex !== -1) {
        queue.splice(pendingPostIndex, 1);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return; // They cancel out!
      }
    }

    // Otherwise, queue normally
    let body: string | undefined;
    if (options.body !== undefined) {
      body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    queue.push({
      id: crypto.randomUUID(),
      endpoint,
      method: options.method as string,
      body,
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to queue request", e);
  }
}

export async function processOfflineQueue() {
  const queue: QueuedRequest[] = JSON.parse(
    localStorage.getItem(QUEUE_KEY) || "[]",
  );
  if (queue.length === 0) return;

  const remaining: QueuedRequest[] = [];
  for (const req of queue) {
    try {
      // Pass TRUE to skipQueue
      await fetchWithAuth(
        req.endpoint,
        { method: req.method, body: req.body },
        true,
      );
    } catch (err) {
      // If it's a TypeError, we're likely still offline. Keep it in the queue.
      if (err instanceof TypeError) {
        remaining.push(req);
      } else {
        // It's a 4xx error (e.g., bad request). Drop it so it doesn't block the queue forever.
        console.error("Queued request failed permanently, dropping:", req);
      }
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

async function getAuthToken(): Promise<string | null> {
  try {
    // Force a fresh session check, not cached
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return null;
    }

    if (session?.access_token) {
      // Check if token is expired
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        const {
          data: { session: refreshed },
          error: refreshError,
        } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed) {
          console.log("Could not refresh token");
          return null;
        }
        return refreshed.access_token;
      }
      return session.access_token;
    }
    return null;
  } catch (err) {
    console.error("Failed to get auth token:", err);
    return null;
  }
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  skipQueue: boolean = false,
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    throw new Error("User is not authenticated");
  }

  const isMutation =
    options.method && ["POST", "PUT", "DELETE"].includes(options.method);
  let response: Response;

  try {
    response = await fetch(endpoint, { ...options, headers });
  } catch (err) {
    if (isMutation && err instanceof TypeError && !skipQueue) {
      queueRequest(endpoint, { ...options, headers });
      throw new Error("NETWORK_ERROR_QUEUED");
    }
    throw err; // If skipQueue is true, let the caller handle the standard fetch failure
  }

  if (!response.ok) {
    if (isMutation && response.status >= 500 && !skipQueue) {
      queueRequest(endpoint, { ...options, headers });
      throw new Error("NETWORK_ERROR_QUEUED");
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text);
}

export const api = {
  // Public
  health: () => fetch("/api/health"),
  getDrinks: () => fetchWithAuth<Drink[]>("/api/drinks"),

  // Protected (require auth)
  addDrink: (drink: {
    id: string;
    beerId: string;
    size: string;
    timestamp: number;
  }) => {
    return fetchWithAuth("/api/drinks", {
      method: "POST",
      body: JSON.stringify(drink),
    });
  },
  getBeers: (params?: {
    limit?: number;
    lastKey?: string | null;
    search?: string;
  }) => {
    let url = "/api/beers";
    const q: string[] = [];
    if (params?.limit) q.push(`limit=${params.limit}`);
    if (params?.lastKey)
      q.push(`lastKey=${encodeURIComponent(params.lastKey)}`);
    if (params?.search) q.push(`search=${encodeURIComponent(params.search)}`);
    if (q.length) url += `?${q.join("&")}`;
    return fetch(url).then((res) => res.json());
  },
  /** Fetch specific catalogue beers by ID. Used to resolve beers in a drink log
   *  without paginating the full catalogue. Max 100 IDs per call. */
  getBeersByIds: (ids: string[]): Promise<Beer[]> => {
    if (ids.length === 0) return Promise.resolve([]);
    const url = `/api/beers/batch?ids=${ids.map(encodeURIComponent).join(",")}`;
    return fetch(url).then((res) => res.json());
  },
  syncDrinks: (drinks: Drink[]) => {
    return fetchWithAuth("/api/sync", {
      method: "POST",
      body: JSON.stringify(drinks),
    });
  },
  deleteDrink: (id: string, timestamp: number) => {
    return fetchWithAuth(`/api/drinks?id=${id}&ts=${timestamp}`, {
      method: "DELETE",
    });
  },
  getProfile: () => fetchWithAuth<UserProfile>("/api/profile"),
  updateProfile: (profile: UserProfile) =>
    fetchWithAuth("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  processOfflineQueue,
  clearUserData: () => fetchWithAuth("/api/clear", { method: "DELETE" }),
  getCustomBeers: () => fetchWithAuth<Beer[]>("/api/custom-beers"),
  addCustomBeer: (beer: Beer): Promise<Beer> =>
    fetchWithAuth<Beer>("/api/custom-beers", {
      method: "POST",
      body: JSON.stringify(beer),
    }),
  getHistory: () => fetchWithAuth<SessionArchive[]>("/api/history"),
  saveHistory: (archive: SessionArchive) =>
    fetchWithAuth("/api/history", {
      method: "POST",
      body: JSON.stringify({
        ...archive,
        drinks: JSON.stringify(archive.drinks),
      }),
    }),
};
