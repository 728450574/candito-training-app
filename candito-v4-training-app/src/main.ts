import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/theme.css'
import { initStorage, flushStorage, getCurrentMode, getProvider } from '@/services/storage'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { useSettingsStore } from '@/stores/settingsStore'

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  // 1. 初始化存储系统（本地或云端）
  await initStorage()

  // 2. 加载所有数据到内存（容错：即使云端加载失败也要挂载应用）
  const cycleStore = useCycleStore(pinia)
  const recordStore = useRecordStore(pinia)
  const bodyMetricStore = useBodyMetricStore(pinia)
  const settingsStore = useSettingsStore(pinia)

  try {
    await cycleStore.load()
    const cycleIds = cycleStore.cycles.map(c => c.id)
    await recordStore.loadAll(cycleIds)
    await bodyMetricStore.load()
    await settingsStore.load()
  } catch (err) {
    console.error('数据加载失败，以空状态启动应用:', err)
  }

  // 3. 页面关闭/隐藏时 flush 云端写入队列并同步备份到 localStorage
  function syncBackupBeforeUnload(): void {
    if (getCurrentMode() === 'cloud') {
      const provider = getProvider()
      if (provider && provider.syncBackup) {
        const cs = useCycleStore()
        const rs = useRecordStore()
        const bms = useBodyMetricStore()
        const ss = useSettingsStore()
        provider.syncBackup(cs.cycles, cs.activeCycleId, rs.recordsByCycle, bms.metrics, ss.settings)
      }
      void flushStorage()
    }
  }
  window.addEventListener('beforeunload', () => {
    syncBackupBeforeUnload()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      syncBackupBeforeUnload()
    }
  })

  // 4. 挂载应用（无论数据加载是否成功）
  app.mount('#app')
}

void bootstrap()
