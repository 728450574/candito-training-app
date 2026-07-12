// app.ts — 小程序入口 App 实例
// Task 8: 初始化 stores（settingsStore / cycleStore / recordStore / bodyMetricStore）
// Task 22: 初始化 wx.cloud（云开发环境）

import { settingsStore } from './stores/settingsStore'
import { cycleStore } from './stores/cycleStore'
import { recordStore } from './stores/recordStore'
import { bodyMetricStore } from './stores/bodyMetricStore'
import { storageManager } from './utils/storage/storageManager'
import { setCloudInitialized } from './utils/storage/CloudStorageAdapter'

App({
  onLaunch() {
    // onLaunch 不能是 async：微信框架不会等待 Promise，会导致页面路由超时
    // 用同步读取 + fire-and-forget 模式初始化

    // 1. 同步初始化 CloudBase（包裹在 try-catch 中，未开通云开发时静默降级）
    try {
      if (wx.cloud) {
        wx.cloud.init({ env: 'candito-prod', traceUser: true })
        setCloudInitialized(true)
      }
    } catch {
      // 云开发未开通或环境不存在，静默降级为本地存储
    }

    // 2. 加载设置 → 初始化存储后端 → 加载各 store（全部 fire-and-forget）
    settingsStore.loadFromLocal().then(() => {
      storageManager.setMode(settingsStore.getStorageMode())
      void cycleStore.load()
      void recordStore.load()
      void bodyMetricStore.load()
    }).catch(() => {
      // 加载失败时仍尝试加载各 store（使用默认本地存储）
      void cycleStore.load()
      void recordStore.load()
      void bodyMetricStore.load()
    })
  },

  globalData: {}
})
