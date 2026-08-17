/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TIANDITU_TOKEN?: string
  readonly PUBLIC_AMAP_KEY: string
  readonly PUBLIC_AMAP_SECURITY_JS_CODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
