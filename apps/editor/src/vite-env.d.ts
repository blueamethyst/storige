/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_STORAGE_BASE_URL: string
  readonly VITE_AUTO_SAVE_INTERVAL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
