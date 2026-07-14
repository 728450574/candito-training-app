/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** CloudBase 云开发环境 ID */
  readonly VITE_CLOUDBASE_ENV_ID?: string
  /** CloudBase 环境所在地域（如 ap-shanghai），缺省时使用 ap-shanghai */
  readonly VITE_CLOUDBASE_REGION?: string
  /** CloudBase 匿名访问令牌（Publishable Key） */
  readonly VITE_CLOUDBASE_ACCESS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
