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

    const response = await fetch(`/api/${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Request failed with status ${response.status}`);
    }

    return response.json();
}

export const api = {
    health: () => fetch('/api/health').then(res => res.json()),

    addDrink: (drink: { beerId: string; size: string; timestamp: number }) =>
        fetchWithAuth('drinks', {
            method: 'POST',
            body: JSON.stringify(drink),
        }),
};