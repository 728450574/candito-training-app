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
  async onLaunch() {
    // 1. 先用本地存储加载设置（获取 storageMode）。
    //    必须 await：getStorageMode() 依赖此加载结果，否则始终返回默认 'local'，
    //    会导致用户已切换的 cloud 模式无法生效。
    await settingsStore.loadFromLocal()

    // 2. 初始化 CloudBase（wx.cloud 是小程序内置能力，无需额外依赖）。
    //    必须在 storageManager.setMode() 之前完成：若 storageMode 为 'cloud'，
    //    CloudStorageAdapter 需要 cloudInitialized=true 才能正常读写。
    if (wx.cloud) {
      wx.cloud.init({
        env: 'candito-prod',  // 环境 ID，可配置（后续可在设置中配置）
        traceUser: true
      })
      // 通知 CloudStorageAdapter 已初始化
      setCloudInitialized(true)
    }

    // 3. 根据设置初始化存储后端（决定后续 store 走本地还是云端）
    storageManager.setMode(settingsStore.getStorageMode())

    // 4. 加载各 store 数据（fire-and-forget：异步加载完成后 store 会 notify 订阅的页面）。
    //    各 load() 内部均带 try-catch，加载失败时使用默认空状态。
    void cycleStore.load()
    void recordStore.load()
    void bodyMetricStore.load()
  },
  globalData: {}
})
