// 设置与导出页 — tab
// 迁移自 SettingsExport.vue
// 业务逻辑 1:1 等价：训练偏好（单位/休息/取整/提醒）+ 周期入口 + 关于
// 数据管理：导出/导入按钮已接入 exportService（已完整实现），
//           导入冲突解决 UI 为 placeholder（Task 16A 实现完整流程）
//
// 适配要点：
//   - 原 Vue 用 Notification API 发训练提醒；小程序无对应 API，仅更新设置状态，
//     订阅消息能力由 Task 16A 接入。
//   - lastBackupDate 原 Vue 用 localStorage；小程序用 wx.getStorageSync / setStorageSync。
//   - 所有派生显示值在 refresh() 中预计算（WXML 不支持函数调用）。

import { cycleStore } from '../../stores/cycleStore'
import { recordStore } from '../../stores/recordStore'
import { bodyMetricStore } from '../../stores/bodyMetricStore'
import { settingsStore } from '../../stores/settingsStore'
import { storageManager } from '../../utils/storage/storageManager'
import type { StorageMode } from '../../utils/storage/storageManager'
import { isCloudInitialized, setCloudInitialized } from '../../utils/storage/CloudStorageAdapter'
import { exportJSON, exportCSV, chooseAndImportFile } from '../../services/exportService'
import { getToday, formatDateFull } from '../../services/dateService'

const LAST_BACKUP_KEY = 'candito_last_backup'

Page({
  data: {
    // 训练偏好
    defaultUnit: 'kg',
    defaultRestSeconds: 90,
    weightRoundingLabel: '2.5kg',
    reminderEnabled: false,
    // 周期
    cycleSummary: '暂无活跃周期',
    // 数据管理
    lastBackupDate: '暂无备份记录',
    // 导入冲突（placeholder，Task 16A 实现完整冲突解决 UI）
    importConflict: null as null | { conflictType: string; conflictCount: number },
    // 数据存储（Task 16A）：当前存储后端模式
    storageMode: 'local' as StorageMode,
  },

  unsubSettings: null as null | (() => void),
  unsubCycle: null as null | (() => void),

  onLoad() {
    this.unsubSettings = settingsStore.subscribe(() => { this.refresh() })
    this.unsubCycle = cycleStore.subscribe(() => { this.refresh() })
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  onUnload() {
    this.unsubSettings?.()
    this.unsubCycle?.()
  },

  refresh() {
    const settings = settingsStore.getSettings()
    const activeCycle = cycleStore.getActiveCycle()

    // cycleSummary（与原 Vue computed 等价）
    let cycleSummary = '暂无活跃周期'
    if (activeCycle) {
      const completedDays = activeCycle.weeks.reduce(
        (sum, w) => sum + w.days.filter(d => d.status === 'completed').length, 0
      )
      cycleSummary = `当前: ${activeCycle.name} · 已完成 ${completedDays} 天`
    }

    // lastBackupDate（与原 Vue computed 等价，从小程序 storage 读取）
    let lastBackupDate = '暂无备份记录'
    const stored = wx.getStorageSync(LAST_BACKUP_KEY)
    if (stored) lastBackupDate = stored

    this.setData({
      defaultUnit: settings.defaultUnit,
      defaultRestSeconds: settings.defaultRestSeconds,
      weightRoundingLabel: settings.weightRounding + 'kg',
      reminderEnabled: settings.reminderEnabled,
      cycleSummary,
      lastBackupDate,
      storageMode: settingsStore.getStorageMode(),
    })
  },

  // ── 训练偏好 actions（与原 Vue 1:1 等价） ──

  toggleUnit() {
    const next = settingsStore.getSettings().defaultUnit === 'kg' ? 'lb' : 'kg'
    settingsStore.update({ defaultUnit: next })
  },

  incrementRest() {
    const current = settingsStore.getSettings().defaultRestSeconds
    const next = Math.min(current + 15, 300)
    settingsStore.update({ defaultRestSeconds: next })
  },

  decrementRest() {
    const current = settingsStore.getSettings().defaultRestSeconds
    const prev = Math.max(current - 15, 15)
    settingsStore.update({ defaultRestSeconds: prev })
  },

  toggleRounding() {
    const current = settingsStore.getSettings().weightRounding
    const next = current === 2.5 ? 5 : 2.5
    settingsStore.update({ weightRounding: next })
  },

  toggleReminder() {
    const newValue = !settingsStore.getSettings().reminderEnabled
    settingsStore.update({ reminderEnabled: newValue })
    // 原 Vue 在开启时请求浏览器 Notification 权限并发通知；小程序无对应 API，
    // 训练提醒的实际订阅消息能力由 Task 16A 接入，此处仅更新设置状态。
  },

  // ── 数据管理 actions ──
  // 导出/导入已接入 exportService（完整实现）；
  // 导入冲突解决 UI 为 placeholder，Task 16A 实现完整流程。

  async handleExportJSON() {
    wx.showLoading({ title: '导出中...', mask: true })
    try {
      await exportJSON()
      const today = getToday()
      const label = formatDateFull(today) + ' ' + today
      wx.setStorageSync(LAST_BACKUP_KEY, label)
      this.setData({ lastBackupDate: label })
      wx.hideLoading()
      wx.showToast({ title: '导出成功', icon: 'success' })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e instanceof Error ? e.message : '导出失败', icon: 'none' })
    }
  },

  async handleExportCSV() {
    wx.showLoading({ title: '导出中...', mask: true })
    try {
      await exportCSV()
      wx.hideLoading()
      wx.showToast({ title: '导出成功', icon: 'success' })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e instanceof Error ? e.message : '导出失败', icon: 'none' })
    }
  },

  async handleImport() {
    wx.showLoading({ title: '处理中...', mask: true })
    try {
      const result = await chooseAndImportFile()
      wx.hideLoading()
      if (!result.success) {
        wx.showToast({ title: result.error || '导入失败', icon: 'none' })
        return
      }
      if (result.conflicts && result.conflicts.length > 0) {
        // placeholder：检测到冲突时数据未写入（exportService.importJSON 在有冲突时不写回 store），
        // 完整冲突解决 UI（智能合并 / 覆盖现有 / 取消导入）由 Task 16A 实现。
        const firstType = result.conflicts[0].type === 'cycle' ? '周期' : '记录'
        this.setData({
          importConflict: {
            conflictType: firstType,
            conflictCount: result.conflicts.length,
          },
        })
        wx.showToast({
          title: `检测到${result.conflicts.length}个冲突，导入已取消`,
          icon: 'none',
          duration: 2500,
        })
        return
      }
      this.setData({ importConflict: null })
      wx.showToast({ title: '导入成功', icon: 'success' })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e instanceof Error ? e.message : '导入失败', icon: 'none' })
    }
  },

  // ── 数据存储 actions（Task 16A） ──

  /** 处理存储模式切换入口：根据当前模式决定切换方向，弹出对应确认弹窗 */
  handleStorageModeSwitch() {
    const current = settingsStore.getStorageMode()
    const newMode: StorageMode = current === 'cloud' ? 'local' : 'cloud'

    if (newMode === 'local') {
      // 切换到本地存储 — 二次确认，明确告知三条警示
      wx.showModal({
        title: '切换到本地存储',
        content: '切换后将产生以下影响：\n1. 数据仅保存在当前设备本地\n2. 卸载小程序、清除缓存或更换设备将导致数据丢失\n3. 云端已有数据不会自动同步到本地，建议先导出备份',
        confirmText: '确认切换',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            void this.performSwitch(newMode)
          }
        },
      })
      return
    }

    // 切换到云端存储 — 先校验 CloudBase 可用性
    // wx.cloud 为小程序内置能力，未启用云开发时可能为 undefined
    if (!wx.cloud) {
      wx.showToast({ title: '云端存储不可用，请检查网络或稍后重试', icon: 'none' })
      return
    }
    // CloudBase 未初始化时尝试重新初始化（引导登录：小程序云开发通过 wx.cloud.init
    // 建立 OPENID 鉴权上下文，无需单独匿名登录步骤）
    if (!isCloudInitialized()) {
      try {
        wx.cloud.init({ env: 'candito-prod', traceUser: true })
        setCloudInitialized(true)
      } catch {
        wx.showToast({ title: '云端存储不可用，请检查网络或稍后重试', icon: 'none' })
        return
      }
    }
    // 提示并确认
    wx.showModal({
      title: '切换到云端存储',
      content: '切换后数据将上传到云端账户，可在多设备间同步。本地数据不会自动清除。',
      confirmText: '确认切换',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          void this.performSwitch(newMode)
        }
      },
    })
  },

  /** 执行实际切换：切后端 → 持久化模式 → 重新加载各 store → 刷新视图 → 反馈 */
  async performSwitch(newMode: StorageMode) {
    wx.showLoading({ title: '切换中...', mask: true })
    try {
      // 1. 切换存储后端
      storageManager.setMode(newMode)
      // 2. 持久化模式设置（settingsStore 始终走本地，保存 storageMode）
      settingsStore.update({ storageMode: newMode })
      // 3. 重新加载各 store 数据（从新后端读取）
      await cycleStore.load()
      await recordStore.load()
      await bodyMetricStore.load()
      // 4. 刷新设置页视图
      this.refresh()
      wx.hideLoading()
      // 5/6. 根据新后端是否有数据给出提示
      //    recordStore 为懒加载（load 是 no-op），空状态以 cycles + metrics 判定
      const hasData =
        cycleStore.getCycles().length > 0 ||
        bodyMetricStore.getMetrics().length > 0
      if (!hasData) {
        wx.showToast({ title: '该存储模式下暂无数据', icon: 'none' })
      } else {
        wx.showToast({
          title: `已切换到${newMode === 'cloud' ? '云端' : '本地'}存储`,
          icon: 'success',
        })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({
        title: e instanceof Error ? e.message : '切换失败',
        icon: 'none',
      })
    }
  },

  // ── 周期入口 ──

  goCycle() {
    wx.navigateTo({ url: '/pages/cycle/index' })
  },

  goOneRM() {
    wx.navigateTo({ url: '/pages/onerm/index' })
  },
})
