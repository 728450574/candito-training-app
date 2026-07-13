export interface CloudBaseConfig {
  env: string
  region: string
  accessKey: string
}

const CONFIG_KEY = 'candito_cloudbase_config'

/** 获取 CloudBase 配置 */
export function getCloudBaseConfig(): CloudBaseConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      return JSON.parse(raw) as CloudBaseConfig
    }
  } catch {
    // ignore
  }
  return { env: '', region: '', accessKey: '' }
}

/** 设置 CloudBase 配置 */
export function setCloudBaseConfig(config: Partial<CloudBaseConfig>): void {
  const current = getCloudBaseConfig()
  const next = { ...current, ...config }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
}

/** 检查 CloudBase 是否已配置（env 和 accessKey 非空） */
export function isCloudBaseConfigured(): boolean {
  const config = getCloudBaseConfig()
  return !!(config.env && config.accessKey)
}
