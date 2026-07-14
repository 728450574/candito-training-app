import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/theme.css'
import { initStorage } from '@/services/storage'
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

  // 2. 加载所有数据到内存（在 app.mount 前完成，确保 UI 有数据）
  const cycleStore = useCycleStore(pinia)
  await cycleStore.load()

  const recordStore = useRecordStore(pinia)
  const cycleIds = cycleStore.cycles.map(c => c.id)
  await recordStore.loadAll(cycleIds)

  const bodyMetricStore = useBodyMetricStore(pinia)
  await bodyMetricStore.load()

  const settingsStore = useSettingsStore(pinia)
  await settingsStore.load()

  // 3. 挂载应用
  app.mount('#app')
}

void bootstrap()
