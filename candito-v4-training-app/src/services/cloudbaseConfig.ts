export interface CloudBaseConfig {
  env: string
  region: string
  accessKey: string
}

/**
 * CloudBase 配置通过 Vite 环境变量传入（构建时注入）：
 *   VITE_CLOUDBASE_ENV_ID     —— 云开发环境 ID
 *   VITE_CLOUDBASE_REGION     —— 环境所在地域（如 ap-shanghai）
 *   VITE_CLOUDBASE_ACCESS_KEY —— 匿名访问令牌（Publishable Key）
 *
 * 在 .env / .env.local / 部署平台环境变量中配置即可。
 * 由于不是所有用户都会配置云存储，默认提供本地存储，
 * 用户只需在设置中切换本地存储 / 云存储。
 */

const DEFAULT_REGION = 'ap-shanghai'

/** 获取 CloudBase 配置（来自构建期环境变量） */
export function getCloudBaseConfig(): CloudBaseConfig {
  const env = import.meta.env.VITE_CLOUDBASE_ENV_ID ?? ''
  const region = import.meta.env.VITE_CLOUDBASE_REGION || DEFAULT_REGION
  const accessKey = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY ?? ''
  return { env, region, accessKey }
}

/** 检查 CloudBase 是否已配置（envId 和 accessKey 非空） */
export function isCloudBaseConfigured(): boolean {
  const config = getCloudBaseConfig()
  return !!(config.env && config.accessKey)
}
