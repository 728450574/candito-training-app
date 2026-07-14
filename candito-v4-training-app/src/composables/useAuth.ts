import { ref, readonly } from 'vue'
import {
  isAuthenticated,
  getCurrentUser,
  signInWithPassword,
  signInWithOtpPhone,
  verifyOtp,
  signInWithWechat,
  signOut,
} from '@/services/cloudbase'

interface AuthUser {
  uid?: string
  username?: string
  email?: string
  phone?: string
}

// verifyOtp 回调类型
type VerifyOtpFn = { verifyOtp: (args: { token: string }) => Promise<unknown> }

// 模块级 ref 实现单例状态
const user = ref<AuthUser | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
// 保存短信登录的 verifyOtp 回调
let otpVerifyFn: VerifyOtpFn | null = null

export function useAuth() {
  async function checkAuthState(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const authenticated = await isAuthenticated()
      if (!authenticated) {
        user.value = null
        return
      }
      const currentUser = await getCurrentUser()
      user.value = currentUser as AuthUser | null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '检查登录状态失败'
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await signInWithPassword(username, password)
      await checkAuthState()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /** 微信扫码登录（重定向方式，跳转后自动回来） */
  async function loginWithWechat(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await signInWithWechat()
      // signInWithWechat 会触发重定向，以下代码通常不会执行
    } catch (err) {
      error.value = err instanceof Error ? err.message : '微信登录失败'
      loading.value = false
      throw err
    }
  }

  /** 短信登录 —— 第一步：发送验证码 */
  async function sendSmsCode(phone: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: otpError } = await signInWithOtpPhone(phone)
      if (otpError) throw otpError
      otpVerifyFn = data as VerifyOtpFn
    } catch (err) {
      error.value = err instanceof Error ? err.message : '发送验证码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /** 短信登录 —— 第二步：验证码验证（无用户时自动创建） */
  async function loginWithSmsCode(code: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (!otpVerifyFn) throw new Error('请先发送验证码')
      await verifyOtp(otpVerifyFn, code)
      otpVerifyFn = null
      await checkAuthState()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '验证码验证失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    try {
      await signOut()
      user.value = null
      otpVerifyFn = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '退出失败'
    } finally {
      loading.value = false
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    checkAuthState,
    login,
    loginWithWechat,
    sendSmsCode,
    loginWithSmsCode,
    logout,
  }
}
