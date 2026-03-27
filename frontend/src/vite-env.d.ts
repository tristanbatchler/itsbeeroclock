/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_PUBLISHABLE_KEY: string
  readonly SUPABASE_SECRET_KEY?: string
  readonly APP_DOMAIN_NAME: string
  readonly APP_SUPPORT_EMAIL: string
  readonly TABLE_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}