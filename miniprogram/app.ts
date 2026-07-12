// app.ts — 小程序入口 App 实例
// 初始化 stores（settingsStore / cycleStore / recordStore / bodyMetricStore）

import { settingsStore } from './stores/settingsStore'
import { cycleStore } from './stores/cycleStore'
import { recordStore } from './stores/recordStore'
import { bodyMetricStore } from './stores/bodyMetricStore'
import { storageManager } from './utils/storage/storageManager'

App({
  onLaunch() {
    // fire-and-forget：不阻塞 onLaunch，避免页面路由超时
    settingsStore.loadFromLocal().then(() => {
      storageManager.setMode(settingsStore.getStorageMode())
      void cycleStore.load()
      void recordStore.load()
      void bodyMetricStore.load()
    }).catch(() => {
      void cycleStore.load()
      void recordStore.load()
      void bodyMetricStore.load()
    })
  },

  globalData: {}
})
