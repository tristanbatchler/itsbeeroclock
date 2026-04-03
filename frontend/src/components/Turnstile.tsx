import { useEffect, useRef } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  action?: string;
}

/**
 * Cloudflare Turnstile widget (explicit rendering).
 * Requires the script in index.html:
 *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
 */
export function Turnstile({ onSuccess, onError, action }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Turnstile may not be loaded yet if the script is still deferred.
    // Poll briefly until it's available.
    let attempts = 0;
    const maxAttempts = 20;

    const tryRender = () => {
      if (!containerRef.current) return;

      if (!window.turnstile) {
        if (attempts++ < maxAttempts) {
          setTimeout(tryRender, 100);
        }
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: import.meta.env.CF_TURNSTILE_SITE_KEY,
        action,
        callback: onSuccess,
        "error-callback": onError,
        "expired-callback": onError,
      });
    };

    tryRender();

    return () => {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} />;
}
