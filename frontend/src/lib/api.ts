const QUEUE_KEY = 'beeroclock_offline_queue';

export interface QueuedRequest {
    id: string;
    endpoint: string;
    method: string;
    body?: string;
}

export function queueRequest(endpoint: string, options: RequestInit) {
    try {
        const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        let body: string | undefined;
        if (options.body !== undefined) {
            body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
        queue.push({
            id: crypto.randomUUID(),
            endpoint,
            method: options.method as string,
            body,
        });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Failed to queue request', e);
    }
}

export async function processOfflineQueue() {
    const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log('[OfflineQueue] Flushing', queue.length, 'requests:', queue);
    const remaining: QueuedRequest[] = [];
    for (const req of queue) {
        try {
            await fetchWithAuth(req.endpoint, { method: req.method, body: req.body });
            console.log('[OfflineQueue] Sent', req.method, req.endpoint);
        } catch (err) {
            if (err instanceof Error && err.message === 'NETWORK_ERROR_QUEUED') {
                remaining.push(req); // still offline, keep it
            } else {
                console.error('Queued request failed permanently, dropping:', req);
            }
        }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) {
        console.log('[OfflineQueue] All requests flushed.');
    } else {
        console.warn('[OfflineQueue] Some requests could not be sent:', remaining);
    }
}
import type { Drink, UserProfile } from "../types/drinks";
import { supabase } from "./supabase";

async function getAuthToken(): Promise<string | null> {
    try {
        // Force a fresh session check, not cached
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        
        if (session?.access_token) {
            // Check if token is expired
            const expiresAt = session.expires_at;
            if (expiresAt && expiresAt * 1000 < Date.now()) {
                const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError || !refreshed) {
                    console.log('Could not refresh token');
                    return null;
                }
                return refreshed.access_token;
            }
            return session.access_token;
        }
        return null;
    } catch (err) {
        console.error('Failed to get auth token:', err);
        return null;
    }
}

async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        throw new Error('User is not authenticated');
    }

    const isMutation = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method);
    let response: Response;

    try {
        response = await fetch(endpoint, { ...options, headers });
    } catch (err) {
        if (isMutation && err instanceof TypeError) {
            queueRequest(endpoint, { ...options, headers });
            throw new Error('NETWORK_ERROR_QUEUED');
        }
        throw err;
    }

    if (!response.ok) {
        if (isMutation && response.status >= 500) {
            queueRequest(endpoint, { ...options, headers });
            throw new Error('NETWORK_ERROR_QUEUED');
        }
        throw new Error(`Request failed with status ${response.status}`);
    }

    const text = await response.text();
    if (!text) return null as T;
    return JSON.parse(text);
}

export const api = {
    // Public
    health: () => fetch('/api/health'),
    getDrinks: () => fetchWithAuth<Drink[]>('/api/drinks'),

    // Protected (require auth)
    addDrink: (drink: { id: string; beerId: string; size: string; timestamp: number }) => {
        return fetchWithAuth('/api/drinks', {
            method: 'POST',
            body: JSON.stringify(drink),
        });
    },
    getBeers: () => fetch('/api/beers').then(res => res.json()),
    syncDrinks: (drinks: Drink[]) => {
        return fetchWithAuth('/api/sync', {
            method: 'POST',
            body: JSON.stringify(drinks),
        });
    },
    deleteDrink: (id: string, timestamp: number) => {
        return fetchWithAuth(`/api/drinks?id=${id}&ts=${timestamp}`, {
            method: 'DELETE',
        });
    },
    getProfile: () => fetchWithAuth<UserProfile>('/api/profile'),
    updateProfile: (profile: UserProfile) =>
        fetchWithAuth('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(profile),
        }),
    processOfflineQueue,
};