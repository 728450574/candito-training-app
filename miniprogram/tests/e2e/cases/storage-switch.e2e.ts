// storage-switch.e2e.ts — 存储模式切换 E2E 用例（Task 8）
//
// 覆盖 spec "存储模式切换端到端测试" Requirement 的 6 个 Scenario：
//   1. 设置页存储区块 UI（对照 _design_extracted/pages/设置与导出.html）
//   2. 云端 → 本地切换二次确认（wx.showModal 三条警示 + 取消/确认分支）
//   3. 本地 → 云端切换提示（modal 内容 + 切换后 store 重新 init）
//   4. 未登录态引导（mock 受限，it.skip + 手动测试说明）
//   5. 切换后空后端提示（wx.showToast "该存储模式下暂无数据"）
//   6. 模式本身持久化在本地（重启后从本地 settingsStore 恢复 storageManager）
//
// 所有用例在 automator 不可用（沙箱未装开发者工具）时 early-return 跳过，
// 不阻断测试运行；与 setup/reset.ts 的"用例自身判断 automator 可用性并 skip"策略一致。
// wx.showModal / wx.showToast 通过 evaluate 内安装的 mock 拦截，用例结束统一 restore。

import * as path from 'path'
import { getAutomator } from '../setup'

// ── 类型定义 ──

interface CapturedModalArgs {
  title: string
  content: string
  confirmText: string
  cancelText: string
}

interface CapturedToastArgs {
  title: string
  icon: string
}

type StorageMode = 'local' | 'cloud'

// ── 辅助函数 ──

/** 获取 automator 实例（globalSetup 已注入 globalThis.__AUTOMATOR__） */
function getAuto(): Automator | null {
  return (
    getAutomator() ??
    (typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ : null)
  )
}

/** 重新启动到设置页并等待渲染完成，返回栈顶页面 */
async function navigateToSettings(auto: Automator): Promise<Page> {
  await auto.miniProgram.relaunch({ path: 'pages/settings/index' })
  // 轮询等待页面就绪（route 匹配）
  await auto.miniProgram.evaluate(`
    return new Promise(function(resolve) {
      var start = Date.now()
      function check() {
        var pages = getCurrentPages()
        if (pages.length > 0 && pages[pages.length - 1].route === 'pages/settings/index') {
          resolve(true)
        } else if (Date.now() - start >= 5000) {
          resolve(false)
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  `)
  // 给 onLoad/onShow + refresh 一点时间
  await new Promise((r) => setTimeout(r, 300))
  const stack = await auto.miniProgram.pageStack()
  return stack[stack.length - 1]
}

/** 直接设置存储模式（同步设置 storageManager + 持久化到 settingsStore） */
async function setStorageMode(auto: Automator, mode: StorageMode): Promise<void> {
  await auto.miniProgram.evaluate(`
    try {
      var sm = require('utils/storage/storageManager')
      if (sm && sm.storageManager) sm.storageManager.setMode(${JSON.stringify(mode)})
      var ss = require('stores/settingsStore')
      if (ss && ss.settingsStore) ss.settingsStore.update({ storageMode: ${JSON.stringify(mode)} })
    } catch (e) {}
    return true
  `)
}

/** 读取当前 storageManager 模式 */
async function getStorageMode(auto: Automator): Promise<StorageMode> {
  return auto.miniProgram.evaluate<StorageMode>(`
    try {
      var sm = require('utils/storage/storageManager')
      return sm && sm.storageManager ? sm.storageManager.getMode() : 'local'
    } catch (e) {
      return 'local'
    }
  `)
}

/** 仅持久化模式到 settingsStore（不动 storageManager），用于持久化测试 */
async function persistStorageMode(
  auto: Automator,
  mode: StorageMode
): Promise<void> {
  await auto.miniProgram.evaluate(`
    try {
      var ss = require('stores/settingsStore')
      if (ss && ss.settingsStore) ss.settingsStore.update({ storageMode: ${JSON.stringify(mode)} })
    } catch (e) {}
    return true
  `)
}

/** 模拟 app.ts onLaunch 的存储初始化序列：loadFromLocal + setMode */
async function simulateAppLaunch(auto: Automator): Promise<void> {
  await auto.miniProgram.evaluate(`
    try {
      var ss = require('stores/settingsStore')
      var sm = require('utils/storage/storageManager')
      if (ss && ss.settingsStore && sm && sm.storageManager) {
        ss.settingsStore.loadFromLocal().then(function() {
          sm.storageManager.setMode(ss.settingsStore.getStorageMode())
        })
      }
    } catch (e) {}
    return true
  `)
  // 等待 loadFromLocal 异步完成
  await new Promise((r) => setTimeout(r, 500))
}

/** 安装 wx.showModal 拦截，捕获调用参数并按 result 模拟用户点击 */
async function installShowModalMock(
  auto: Automator,
  result: { confirm: boolean }
): Promise<void> {
  const resultJson = JSON.stringify(result)
  await auto.miniProgram.evaluate(`
    globalThis.__capturedModalArgs = null
    if (!globalThis.__originalShowModal) {
      globalThis.__originalShowModal = wx.showModal
    }
    wx.showModal = function(opts) {
      globalThis.__capturedModalArgs = {
        title: opts.title || '',
        content: opts.content || '',
        confirmText: opts.confirmText || '确定',
        cancelText: opts.cancelText || '取消'
      }
      var confirm = (${resultJson}).confirm === true
      if (opts.success) {
        setTimeout(function() { opts.success({ confirm: confirm, cancel: !confirm }) }, 10)
      }
    }
    return true
  `)
}

/** 读取已捕获的 wx.showModal 参数 */
async function getCapturedModal(
  auto: Automator
): Promise<CapturedModalArgs | null> {
  return auto.miniProgram.evaluate<CapturedModalArgs | null>(`
    return globalThis.__capturedModalArgs || null
  `)
}

/** 恢复 wx.showModal 原始实现 */
async function restoreShowModal(auto: Automator): Promise<void> {
  await auto.miniProgram.evaluate(`
    if (globalThis.__originalShowModal) {
      wx.showModal = globalThis.__originalShowModal
      globalThis.__originalShowModal = null
    }
    globalThis.__capturedModalArgs = null
    return true
  `)
}

/** 安装 wx.showToast 拦截，捕获调用参数 */
async function installShowToastMock(auto: Automator): Promise<void> {
  await auto.miniProgram.evaluate(`
    globalThis.__capturedToastArgs = null
    if (!globalThis.__originalShowToast) {
      globalThis.__originalShowToast = wx.showToast
    }
    wx.showToast = function(opts) {
      globalThis.__capturedToastArgs = {
        title: opts.title || '',
        icon: opts.icon || ''
      }
    }
    return true
  `)
}

/** 读取已捕获的 wx.showToast 参数（最后一次调用） */
async function getCapturedToast(
  auto: Automator
): Promise<CapturedToastArgs | null> {
  return auto.miniProgram.evaluate<CapturedToastArgs | null>(`
    return globalThis.__capturedToastArgs || null
  `)
}

/** 恢复 wx.showToast 原始实现 */
async function restoreShowToast(auto: Automator): Promise<void> {
  await auto.miniProgram.evaluate(`
    if (globalThis.__originalShowToast) {
      wx.showToast = globalThis.__originalShowToast
      globalThis.__originalShowToast = null
    }
    globalThis.__capturedToastArgs = null
    return true
  `)
}

/** 轮询等待 storageManager 进入期望模式（用于异步切换完成判断） */
async function waitForMode(
  auto: Automator,
  expected: StorageMode,
  timeoutMs = 5000
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const mode = await getStorageMode(auto)
    if (mode === expected) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

/** 读取 cycleStore 周期数量（用于验证切换后 store 重新加载） */
async function getCycleCount(auto: Automator): Promise<number> {
  return auto.miniProgram.evaluate<number>(`
    try {
      var cs = require('stores/cycleStore')
      return cs && cs.cycleStore ? cs.cycleStore.getCycles().length : -1
    } catch (e) {
      return -1
    }
  `)
}

/** 清空云端 candito_* 业务数据（仅用于空后端测试，best-effort） */
async function clearCloudBusinessData(auto: Automator): Promise<void> {
  await auto.miniProgram.evaluate(`
    try {
      var cs = require('utils/storage/CloudStorageAdapter')
      if (cs && typeof cs.isCloudInitialized === 'function' && !cs.isCloudInitialized()) {
        if (typeof wx !== 'undefined' && wx.cloud) {
          wx.cloud.init({ env: 'tnt-lxo777jrw', traceUser: true })
          if (cs.setCloudInitialized) cs.setCloudInitialized(true)
        }
      }
      if (cs && cs.CloudStorageAdapter) {
        var adapter = new cs.CloudStorageAdapter()
        // 仅清空本测试关心的业务 key，避免误删其他文档
        adapter.remove('candito_cycles').catch(function() {})
        adapter.remove('candito_active_cycle').catch(function() {})
        adapter.remove('candito_metrics').catch(function() {})
      }
    } catch (e) {}
    return true
  `)
  // 给云端删除一点时间
  await new Promise((r) => setTimeout(r, 800))
}

/** 触发设置页 handleStorageModeSwitch（通过 callMethod 比元素 tap 更稳定） */
async function triggerStorageSwitch(
  auto: Automator,
  page: Page
): Promise<void> {
  await page.callMethod('handleStorageModeSwitch')
  // 让 wx.showModal 同步捕获完成
  await new Promise((r) => setTimeout(r, 100))
}

// ── 用例 ──

describe('存储模式切换 E2E (Task 8)', () => {
  // 注意：automator 在 globalSetup 阶段注入 globalThis.__AUTOMATOR__，此时点已就绪。
  // 沙箱环境未装微信开发者工具时 __AUTOMATOR__ 为 null，用例内部统一 early-return 跳过。

  it('设置页存储区块 UI', async () => {
    const auto = getAuto()
    if (!auto) {
      console.warn('[skip] automator 不可用，跳过 "设置页存储区块 UI"')
      return
    }
    const page = await navigateToSettings(auto)

    // 1) 页面 data 含 storageMode 字段（'local' | 'cloud'）
    const data = await page.data<{ storageMode?: StorageMode }>()
    expect(typeof data.storageMode).toBe('string')
    expect(data.storageMode === 'local' || data.storageMode === 'cloud').toBe(
      true
    )

    // 2) 页面存在"数据存储"区块：用 createSelectorQuery 验证文本
    //    设计稿 _design_extracted/pages/设置与导出.html 同样含"数据存储"section title
    const hasStorageSection = await auto.miniProgram.evaluate<boolean>(`
      return new Promise(function(resolve) {
        wx.createSelectorQuery()
          .selectAll('.section-title')
          .fields({ text: true }, function(items) {
            var found = false
            for (var i = 0; i < (items || []).length; i++) {
              if (items[i] && items[i].text && items[i].text.indexOf('数据存储') !== -1) {
                found = true
                break
              }
            }
            resolve(found)
          }).exec()
      })
    `)
    expect(hasStorageSection).toBe(true)

    // 3) 验证存储徽标元素存在（结构保真：当前模式有对应 storage-badge--local/cloud class）
    const storageBadge = await auto.miniProgram.evaluate<boolean>(`
      return new Promise(function(resolve) {
        wx.createSelectorQuery()
          .selectAll('.storage-badge')
          .boundingClientRect(function(rects) {
            resolve((rects || []).length > 0)
          }).exec()
      })
    `)
    expect(storageBadge).toBe(true)

    // 4) 验证切换入口存在（含 row-action "切换" 文本）
    const hasSwitchRow = await auto.miniProgram.evaluate<boolean>(`
      return new Promise(function(resolve) {
        wx.createSelectorQuery()
          .selectAll('.row-action')
          .fields({ text: true }, function(items) {
            var found = false
            for (var i = 0; i < (items || []).length; i++) {
              if (items[i] && items[i].text && items[i].text.indexOf('切换') !== -1) {
                found = true
                break
              }
            }
            resolve(found)
          }).exec()
      })
    `)
    expect(hasSwitchRow).toBe(true)

    // 5) 截图保存到 reports/ui-screenshots/，供视觉对照设计稿
    const screenshotPath = path.resolve(
      __dirname,
      '..',
      'reports',
      'ui-screenshots',
      'settings-storage.png'
    )
    try {
      await auto.screenshot({ path: screenshotPath })
    } catch (e) {
      // 截图失败不阻断断言
      console.warn(
        '[screenshot] 截图失败：',
        e instanceof Error ? e.message : String(e)
      )
    }
  })

  it('云端 → 本地切换二次确认', async () => {
    const auto = getAuto()
    if (!auto) {
      console.warn('[skip] automator 不可用，跳过 "云端 → 本地切换二次确认"')
      return
    }

    // Setup: 切到 cloud 模式
    await setStorageMode(auto, 'cloud')
    expect(await getStorageMode(auto)).toBe('cloud')

    const page = await navigateToSettings(auto)

    // 第一次：点击取消
    await installShowModalMock(auto, { confirm: false })
    await triggerStorageSwitch(auto, page)
    const capturedCancel = await getCapturedModal(auto)
    expect(capturedCancel).not.toBeNull()
    expect(capturedCancel!.title).toBe('切换到本地存储')
    // 三条警示（按 pages/settings/index.ts 的 modal content）
    expect(capturedCancel!.content).toContain('数据仅保存在当前设备')
    expect(capturedCancel!.content).toContain('卸载')
    expect(capturedCancel!.content).toContain('云端数据不会自动同步')
    expect(capturedCancel!.confirmText).toBe('确认切换')
    expect(capturedCancel!.cancelText).toBe('取消')
    // 取消不会触发 performSwitch，模式保持 cloud
    await new Promise((r) => setTimeout(r, 300))
    expect(await getStorageMode(auto)).toBe('cloud')
    await restoreShowModal(auto)

    // 第二次：点击确认切换
    await installShowModalMock(auto, { confirm: true })
    await triggerStorageSwitch(auto, page)
    const capturedConfirm = await getCapturedModal(auto)
    expect(capturedConfirm).not.toBeNull()
    expect(capturedConfirm!.title).toBe('切换到本地存储')
    // 等待 performSwitch 完成
    const switched = await waitForMode(auto, 'local', 8000)
    expect(switched).toBe(true)
    expect(await getStorageMode(auto)).toBe('local')
    await restoreShowModal(auto)
  })

  it('本地 → 云端切换提示', async () => {
    const auto = getAuto()
    if (!auto) {
      console.warn('[skip] automator 不可用，跳过 "本地 → 云端切换提示"')
      return
    }

    // Setup: 切到 local 模式
    await setStorageMode(auto, 'local')
    expect(await getStorageMode(auto)).toBe('local')

    const page = await navigateToSettings(auto)

    // 安装 mock：确认切换
    await installShowModalMock(auto, { confirm: true })
    await triggerStorageSwitch(auto, page)
    const captured = await getCapturedModal(auto)
    expect(captured).not.toBeNull()
    expect(captured!.title).toBe('切换到云端存储')
    // 内容含三段提示（按 pages/settings/index.ts 的 modal content）
    expect(captured!.content).toContain('数据将上传到云端账户')
    expect(captured!.content).toContain('多设备')
    expect(captured!.content).toContain('同步')
    expect(captured!.content).toContain('本地数据')

    // 等待 performSwitch 完成（含 testCloudConnection + 各 store load）
    const switched = await waitForMode(auto, 'cloud', 10000)
    expect(switched).toBe(true)
    expect(await getStorageMode(auto)).toBe('cloud')

    // 切换后 cycleStore 已重新 load（云端为空或为测试数据，调用应不抛错）
    const cycleCount = await getCycleCount(auto)
    expect(cycleCount).toBeGreaterThanOrEqual(0)

    await restoreShowModal(auto)
  })

  // 未登录态引导：需 mock wx.cloud 未认证状态，沙箱中难以稳定模拟，
  // 且 wx.cloud 在已 init 的环境下无法回退到未登录态。该用例标记为 skip，
  // 实际验证依赖手动测试：在未开通云开发的账号下尝试切换到云端，应弹出登录引导。
  it.skip('未登录态引导', async () => {
    const auto = getAuto()
    if (!auto) {
      console.warn('[skip] automator 不可用，跳过 "未登录态引导"')
      return
    }
    // 该用例需在未登录 CloudBase 的真实环境下手动验证：
    // 1) 设置 → 切换到云端存储
    // 2) 期望：弹出 wx.showModal 提示需登录或直接调用 wx.cloud 匿名登录
    // 3) 登录成功后再执行切换；登录失败显示错误提示
    // 自动化 mock 方案（破坏性，不在线上跑）：
    //   - 覆盖 wx.cloud.callFunction / wx.cloud.database 抛 -1 权限错误
    //   - 验证 performSwitch 走 catch 分支，回滚到 local，showToast 提示云存储不可用
    expect(true).toBe(true)
  })

  it('切换后空后端提示', async () => {
    const auto = getAuto()
    if (!auto) {
      console.warn('[skip] automator 不可用，跳过 "切换后空后端提示"')
      return
    }

    // Setup: 切到 local，清空本地存储 + 清空云端 candito_* 业务 key
    await setStorageMode(auto, 'local')
    await auto.miniProgram.evaluate(`
      try { wx.clearStorageSync() } catch (e) {}
      // 重置 storageManager 为 local（清空 storage 后模式默认 local）
      try {
        var sm = require('utils/storage/storageManager')
        if (sm && sm.storageManager) sm.storageManager.setMode('local')
      } catch (e) {}
      return true
    `)
    // 清空云端业务 key（best-effort，测试账号需为空）
    await clearCloudBusinessData(auto)

    const page = await navigateToSettings(auto)

    // 安装 toast 拦截 + 模态确认拦截
    await installShowToastMock(auto)
    await installShowModalMock(auto, { confirm: true })

    await triggerStorageSwitch(auto, page)

    // 等待 performSwitch 完成（切换到 cloud + 各 store load）
    await waitForMode(auto, 'cloud', 10000)
    // 多等一会确保 toast 触发
    await new Promise((r) => setTimeout(r, 500))

    const toast = await getCapturedToast(auto)
    expect(toast).not.toBeNull()
    // 期望提示"该存储模式下暂无数据"（spec 文案 + pages/settings/index.ts 实现）
    // 如云端账号有数据导致 hasData=true，会改提示"已切换到云端存储"，此时测试失败
    expect(toast!.title).toContain('暂无数据')

    await restoreShowModal(auto)
    await restoreShowToast(auto)
  })

  it('模式本身持久化在本地', async () => {
    const auto = getAuto()
    if (!auto) {
      console.warn('[skip] automator 不可用，跳过 "模式本身持久化在本地"')
      return
    }

    // 1) 持久化 cloud 模式到本地 settingsStore（不动 storageManager）
    await persistStorageMode(auto, 'cloud')

    // 2) 模拟 fresh start：把 storageManager 重置为默认 local，再执行 app.ts onLaunch 序列
    await auto.miniProgram.evaluate(`
      try {
        var sm = require('utils/storage/storageManager')
        if (sm && sm.storageManager) sm.storageManager.setMode('local')
      } catch (e) {}
      return true
    `)
    expect(await getStorageMode(auto)).toBe('local') // 模拟重启前 storageManager 仍为 local

    await simulateAppLaunch(auto)

    // 3) 重启后 storageManager 应根据本地 settingsStore.storageMode 设置为 cloud
    expect(await getStorageMode(auto)).toBe('cloud')

    // 4) 反向：持久化 local，模拟重启后应恢复为 local
    await persistStorageMode(auto, 'local')
    await auto.miniProgram.evaluate(`
      try {
        var sm = require('utils/storage/storageManager')
        if (sm && sm.storageManager) sm.storageManager.setMode('cloud')
      } catch (e) {}
      return true
    `)
    expect(await getStorageMode(auto)).toBe('cloud')
    await simulateAppLaunch(auto)
    expect(await getStorageMode(auto)).toBe('local')
  })
})
