/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_DOMAIN_NAME: string;
  readonly APP_SUPPORT_EMAIL: string;
  readonly TABLE_NAME: string;
  readonly S3_BUCKET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
