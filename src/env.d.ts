/// <reference types="astro/client" />

// The build's mode, fixed at build by `vite.define` in astro.config.mjs.
interface ImportMetaEnv {
  readonly DEPLOY_TARGET: 'vercel' | 'node'
  readonly DB_ADAPTER: 'postgres' | 'sqlite'
  readonly STORAGE: 's3' | 'blob' | 'local'
  readonly BUILD_ID: string
}
