/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_REDIRECT_URI?: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}