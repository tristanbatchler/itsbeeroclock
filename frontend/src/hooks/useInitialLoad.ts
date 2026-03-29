import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function useInitialLoad() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const checkHealth = async () => {
      try {
        const res = await api.health();
        if (res && res.ok) {
          setIsLoading(false);
          return;
        }
      } catch {
        // health failed — keep loading for now
      }

      timeout = setTimeout(() => {
        setIsLoading(false);
        setInitialLoadFailed(true);
      }, 3500);
    };

    checkHealth();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return { isLoading, initialLoadFailed };
}
