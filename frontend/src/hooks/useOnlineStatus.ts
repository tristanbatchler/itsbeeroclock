import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Track previous state so we only flush the queue when transitioning from offline -> online
  const wasOfflineRef = useRef(!navigator.onLine);

  useEffect(() => {
    const checkActualConnection = async () => {
      try {
        const res = await api.health();
        if (res && res.ok) {
          setIsOnline(true);
          // Only process the queue if we just reconnected
          if (wasOfflineRef.current) {
            api.processOfflineQueue();
            wasOfflineRef.current = false;
          }
        } else {
          setIsOnline(false);
          wasOfflineRef.current = true;
        }
      } catch {
        setIsOnline(false);
        wasOfflineRef.current = true;
      }
    };

    const onOnline = () => checkActualConnection();
    const onOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Smart polling: Only ping the server if the user is actually looking at the app
    const pingInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        if (!navigator.onLine) {
          onOffline();
        } else {
          checkActualConnection();
        }
      }
    }, 15000);

    // Initial check on mount
    checkActualConnection();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(pingInterval);
    };
  }, []);

  return isOnline;
}
