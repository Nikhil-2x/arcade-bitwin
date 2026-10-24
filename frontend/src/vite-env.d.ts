/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket URL of the room server (backend/server.js), set per mode in .env.development / .env.production. */
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
