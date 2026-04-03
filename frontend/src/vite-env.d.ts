/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_PUBLISHABLE_KEY: string;
  readonly APP_DOMAIN_NAME: string;
  readonly APP_SUPPORT_EMAIL: string;
  readonly TABLE_NAME: string;
  readonly S3_BUCKET: string;
  readonly CF_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Cloudflare Turnstile global (loaded via script tag in index.html)
interface Window {
  turnstile: {
    render: (
      container: HTMLElement | string,
      options: {
        sitekey: string;
        callback: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        action?: string;
        theme?: "auto" | "light" | "dark";
        size?: "normal" | "compact" | "flexible";
      },
    ) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId: string) => void;
  };
}
