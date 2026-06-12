/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMETCHAT_APP_ID: string;
  readonly VITE_COMETCHAT_REGION: string;
  readonly VITE_COMETCHAT_AUTH_KEY: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
