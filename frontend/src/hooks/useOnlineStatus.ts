import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Periodic ping to /api/health for real connectivity
    const pingInterval = setInterval(async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }
      try {
        const res = await api.health();
        if (!res || !res.ok) throw new Error("Health check failed");
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(pingInterval);
    };
  }, []);

  return isOnline;
}
