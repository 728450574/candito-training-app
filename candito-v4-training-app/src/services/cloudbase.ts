import cloudbase from '@cloudbase/js-sdk'
import { getCloudBaseConfig, isCloudBaseConfigured } from './cloudbaseConfig'

/**
 * CloudBase SDK 单例管理。
 *
 * 遵循 auth-web SKILL 要求：
 * - 使用 auth.getSession() 检查登录状态（而非废弃的 getLoginState）
 * - accessKey 是 publishable key，不是 secret key
 * - 保持单一共享 app 实例
 */

// 类型从 SDK 的 namespace 直接引用
type CBApp = cloudbase.app.App
type CBDb = cloudbase.database.App

let app: CBApp | null = null
let db: CBDb | null = null

/** 获取已初始化的 CloudBase app 实例 */
export function getCloudBaseApp(): CBApp | null {
  if (app) return app
  if (!isCloudBaseConfigured()) return null

  const config = getCloudBaseConfig()
  app = cloudbase.init({
    env: config.env,
    region: config.region,
    accessKey: config.accessKey,
    auth: { detectSessionInUrl: true },
  })
  return app
}

/** 获取数据库实例 */
export function getDb(): CBDb | null {
  if (db) return db
  const cbApp = getCloudBaseApp()
  if (!cbApp) return null
  db = cbApp.database()
  return db
}

/** 获取 auth 实例 */
export function getAuth() {
  const cbApp = getCloudBaseApp()
  if (!cbApp) return null
  return cbApp.auth
}

/** 检查是否已登录（使用 getSession，非废弃的 getLoginState） */
export async function isAuthenticated(): Promise<boolean> {
  const auth = getAuth()
  if (!auth) return false
  try {
    const { data } = await auth.getSession()
    return !!data?.session
  } catch {
    return false
  }
}

/** 获取当前用户信息 */
export async function getCurrentUser() {
  const auth = getAuth()
  if (!auth) return null
  try {
    const { data } = await auth.getUser()
    return data?.user ?? null
  } catch {
    return null
  }
}

/** 用户名密码登录 */
export async function signInWithPassword(username: string, password: string) {
  const auth = getAuth()
  if (!auth) throw new Error('CloudBase 未配置')
  return auth.signInWithPassword({ username, password })
}

/**
 * 手机号 OTP 登录 —— 第一步发送验证码
 * shouldCreateUser 默认 true，用户不存在时自动创建
 */
export async function signInWithOtpPhone(phone: string) {
  const auth = getAuth()
  if (!auth) throw new Error('CloudBase 未配置')
  return auth.signInWithOtp({ phone, shouldCreateUser: true })
}

/** 手机号 OTP 登录 —— 第二步验证 */
export async function verifyOtp(
  verifyFn: { verifyOtp: (args: { token: string }) => Promise<unknown> },
  token: string,
) {
  return verifyFn.verifyOtp({ token })
}

/** 微信扫码登录（OAuth 重定向方式） */
export async function signInWithWechat() {
  const auth = getAuth()
  if (!auth) throw new Error('CloudBase 未配置')
  const { data, error } = await auth.signInWithOAuth({ provider: 'wechat' })
  if (error) throw error
  // 重定向到微信授权页，回调后 SDK 自动完成登录（detectSessionInUrl: true）
  if (data?.url) {
    window.location.href = data.url
  }
}

/** 退出登录 */
export async function signOut() {
  const auth = getAuth()
  if (!auth) return
  try {
    await auth.signOut()
  } catch {
    // ignore
  }
}

/** 重置单例（用于配置变更后重新初始化） */
export function resetCloudBase() {
  app = null
  db = null
}
