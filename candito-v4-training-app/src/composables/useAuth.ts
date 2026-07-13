import { ref, readonly } from 'vue'
import { isAuthenticated, getCurrentUser, signInWithPassword, signOut } from '@/services/cloudbase'

interface AuthUser {
  uid?: string
  username?: string
  email?: string
  phone?: string
}

// 模块级 ref 实现单例状态
const user = ref<AuthUser | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

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

  async function logout(): Promise<void> {
    loading.value = true
    try {
      await signOut()
      user.value = null
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
    logout,
  }
}
