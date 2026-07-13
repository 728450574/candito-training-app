import { ref, readonly } from 'vue'
import {
  initStorage,
  switchToCloud,
  switchToLocal,
  getCurrentMode,
  flushStorage,
} from '@/services/storage'
import { isCloudBaseConfigured } from '@/services/cloudbaseConfig'
import { isAuthenticated } from '@/services/cloudbase'

const storageMode = ref(getCurrentMode())
const switching = ref(false)
const switchError = ref<string | null>(null)

export function useStorageMode() {
  async function enableCloud(): Promise<boolean> {
    if (switching.value) return false
    switching.value = true
    switchError.value = null
    try {
      if (!isCloudBaseConfigured()) {
        switchError.value = '请先配置 CloudBase 环境'
        return false
      }
      const authenticated = await isAuthenticated()
      if (!authenticated) {
        switchError.value = '请先登录 CloudBase'
        return false
      }
      await switchToCloud()
      storageMode.value = 'cloud'
      return true
    } catch (err) {
      switchError.value = err instanceof Error ? err.message : '切换到云端失败'
      return false
    } finally {
      switching.value = false
    }
  }

  async function enableLocal(): Promise<boolean> {
    if (switching.value) return false
    switching.value = true
    switchError.value = null
    try {
      await switchToLocal()
      storageMode.value = 'local'
      return true
    } catch (err) {
      switchError.value = err instanceof Error ? err.message : '切换到本地失败'
      return false
    } finally {
      switching.value = false
    }
  }

  async function reinitStorage(): Promise<void> {
    await initStorage()
    storageMode.value = getCurrentMode()
  }

  async function flush(): Promise<void> {
    await flushStorage()
  }

  return {
    storageMode: readonly(storageMode),
    switching: readonly(switching),
    switchError: readonly(switchError),
    enableCloud,
    enableLocal,
    reinitStorage,
    flush,
  }
}
