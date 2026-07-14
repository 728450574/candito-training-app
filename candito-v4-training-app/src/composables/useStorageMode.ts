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
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { useSettingsStore } from '@/stores/settingsStore'

const storageMode = ref(getCurrentMode())
const switching = ref(false)
const switchError = ref<string | null>(null)

async function reloadAllStores(): Promise<void> {
  const cycleStore = useCycleStore()
  const recordStore = useRecordStore()
  const bodyMetricStore = useBodyMetricStore()
  const settingsStore = useSettingsStore()
  recordStore.reset()
  await cycleStore.load()
  const cycleIds = cycleStore.cycles.map(c => c.id)
  await recordStore.loadAll(cycleIds)
  await bodyMetricStore.load()
  await settingsStore.load()
}

export function useStorageMode() {
  async function enableCloud(): Promise<boolean> {
    if (switching.value) return false
    switching.value = true
    switchError.value = null
    try {
      if (!isCloudBaseConfigured()) {
        switchError.value = '云端存储未启用（未配置环境变量）'
        return false
      }
      const authenticated = await isAuthenticated()
      if (!authenticated) {
        switchError.value = '请先登录 CloudBase'
        return false
      }
      await switchToCloud()
      await reloadAllStores()
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
      await reloadAllStores()
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
