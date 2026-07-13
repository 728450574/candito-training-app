// data-flow.e2e.ts — 数据流转端到端测试 (Task 11)
//
// 覆盖 spec "数据流转端到端测试" Requirement 的 5 个 Scenario：
//   11.1 本地模式全链路：页面事件 → store → LocalStorageAdapter → wx.setStorageSync → 渲染刷新
//   11.2 云端模式全链路：页面事件 → store → CloudStorageAdapter → app_data collection → 渲染刷新
//   11.3 存储后端切换后数据重新加载（含空后端 toast）
//   11.4 store 订阅触发视图刷新（对照 H5 Pinia 响应式）
//   11.5 错误降级（本地满 / 云端断网）
//
// 约定：
//   - automator 不可用（沙箱未装开发者工具）时整体 describe.skip
//   - 云端写入通过 wrapKey() 加测试命名空间前缀，避免污染真实数据；
//     cycleStore 内部使用裸 key 'candito_cycles'，故通过临时覆盖
//     storageManager.getActiveAdapter() 返回 key-wrapping 代理来实现命名空间隔离
//   - mock 的 wx API（setStorageSync / cloud.database / showToast / showModal 等）
//     在 afterEach 中统一恢复
//   - evaluate 内 require 路径相对小程序根目录

import { getAutomator, wrapKey, initCloudBase } from '../setup'

// ── 类型定义 ──

interface CycleOneRM {
  squat: number
  bench: number
  deadlift: number
}

interface CycleAssistanceConfig {
  horizontalPull: string
  shoulder: string
  verticalPull: string
}

interface TestCycle {
  id: string
  name: string
  startDate: string
  status: string
  oneRM: CycleOneRM
  unit: string
  weightRounding: number
  assistanceConfig: CycleAssistanceConfig
  weeks: unknown[]
  pauseHistory: unknown[]
  restartBranches: unknown[]
  batchProcessHistory: unknown[]
  isPaused: boolean
  createdAt: string
}

type StorageMode = 'local' | 'cloud'

// ── 测试用最小 Cycle ──

function makeTestCycle(id: string): TestCycle {
  return {
    id: id,
    name: 'E2E数据流转测试周期',
    startDate: '2026-07-13',
    status: 'active',
    oneRM: { squat: 100, bench: 80, deadlift: 120 },
    unit: 'kg',
    weightRounding: 2.5,
    assistanceConfig: {
      horizontalPull: '哑铃划船',
      shoulder: '推举',
      verticalPull: '引体',
    },
    weeks: [
      {
        weekNumber: 1,
        theme: '测试周',
        days: [
          {
            dayNumber: 1,
            dayOffset: 0,
            type: 'lower',
            originalDate: '2026-07-13',
            scheduledDate: '2026-07-13',
            exercises: [],
            status: 'pending',
          },
        ],
      },
    ],
    pauseHistory: [],
    restartBranches: [],
    batchProcessHistory: [],
    isPaused: false,
    createdAt: '2026-07-13T00:00:00.000Z',
  }
}

// ── automator 可用性判定 ──

const automator: Automator | null =
  getAutomator() ??
  (typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ : null)

const describeOrSkip = automator ? describe : describe.skip

// ── 辅助函数 ──

/** 在 mini program runtime 执行脚本 */
async function evaluate<T>(script: string): Promise<T> {
  const auto = automator
  if (!auto) {
    throw new Error('automator 不可用')
  }
  return await auto.miniProgram.evaluate<T>(script)
}

/** 重新启动小程序到指定页面（模拟重启） */
async function relaunch(path: string): Promise<void> {
  const auto = automator
  if (!auto) {
    throw new Error('automator 不可用')
  }
  await auto.miniProgram.relaunch({ path })
}

/** 获取非空 automator（describeOrSkip 保证非空） */
function getAuto(): Automator {
  const auto = automator
  if (!auto) {
    throw new Error('automator 不可用')
  }
  return auto
}

/** 轮询等待页面就绪并返回栈顶页面 */
async function navigateAndWait(
  auto: Automator,
  pagePath: string,
  waitMs = 300
): Promise<Page> {
  await auto.miniProgram.relaunch({ path: pagePath })
  await auto.miniProgram.evaluate(`
    return new Promise(function(resolve) {
      var start = Date.now()
      var target = ${JSON.stringify(pagePath)}
      function check() {
        var pages = getCurrentPages()
        if (pages.length > 0 && pages[pages.length - 1].route === target) {
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
  await new Promise((r) => setTimeout(r, waitMs))
  const stack = await auto.miniProgram.pageStack()
  return stack[stack.length - 1]
}

/**
 * 在 evaluate 内安装 key-wrapping 代理：覆盖 storageManager.getActiveAdapter，
 * 使所有 store 的 get/set/remove/list/clear 调用自动加上测试命名空间前缀。
 * 原始 getActiveAdapter 保存在 globalThis.__origGetActiveAdapter。
 * 需在 finally / afterEach 中调用 restoreWrappedAdapter 恢复。
 */
function installWrappedAdapterScript(prefix: string): string {
  return `
    var PREFIX = ${JSON.stringify(prefix)}
    var sm = require('utils/storage/storageManager')
    var realAdapter = sm.storageManager.getActiveAdapter()
    var wrapped = {
      get: function(key) { return realAdapter.get(PREFIX + key) },
      set: function(key, value) { return realAdapter.set(PREFIX + key, value) },
      remove: function(key) { return realAdapter.remove(PREFIX + key) },
      list: function(p) {
        return realAdapter.list(PREFIX + (p || '')).then(function(keys) {
          return keys.map(function(k) { return k.substring(PREFIX.length) })
        })
      },
      clear: function(p) {
        return p ? realAdapter.clear(PREFIX + p) : realAdapter.clear(PREFIX)
      }
    }
    globalThis.__origGetActiveAdapter = sm.storageManager.getActiveAdapter.bind(sm.storageManager)
    sm.storageManager.getActiveAdapter = function() { return wrapped }
  `
}

/** 恢复 storageManager.getActiveAdapter 原始实现 */
function restoreWrappedAdapterScript(): string {
  return `
    try {
      var sm = require('utils/storage/storageManager')
      if (sm && sm.storageManager && globalThis.__origGetActiveAdapter) {
        sm.storageManager.getActiveAdapter = globalThis.__origGetActiveAdapter
        globalThis.__origGetActiveAdapter = null
      }
    } catch (e) {}
    return true
  `
}

// ── 用例 ──

describeOrSkip('数据流转 E2E (Task 11)', () => {
  // afterEach：统一恢复所有 mock，保证用例间互不影响
  afterEach(async () => {
    const auto = automator
    if (!auto) {
      return
    }
    await auto.miniProgram.evaluate(`
      // 恢复 wx.setStorageSync
      if (globalThis.__origSetStorageSync) {
        wx.setStorageSync = globalThis.__origSetStorageSync
        globalThis.__origSetStorageSync = null
      }
      // 恢复 wx.cloud.database
      if (globalThis.__origCloudDatabase) {
        wx.cloud.database = globalThis.__origCloudDatabase
        globalThis.__origCloudDatabase = null
      }
      // 恢复 wx.showToast
      if (globalThis.__originalShowToast) {
        wx.showToast = globalThis.__originalShowToast
        globalThis.__originalShowToast = null
      }
      // 恢复 wx.showModal
      if (globalThis.__originalShowModal) {
        wx.showModal = globalThis.__originalShowModal
        globalThis.__originalShowModal = null
      }
      // 恢复 wx.showLoading / wx.hideLoading
      if (globalThis.__originalShowLoading) {
        wx.showLoading = globalThis.__originalShowLoading
        globalThis.__originalShowLoading = null
      }
      if (globalThis.__originalHideLoading) {
        wx.hideLoading = globalThis.__originalHideLoading
        globalThis.__originalHideLoading = null
      }
      // 恢复 storageManager.getActiveAdapter
      ${restoreWrappedAdapterScript()}
      return true
    `).catch(() => {
      // 恢复失败不阻断后续用例
    })
  })

  // ============================================================
  // 11.1 本地模式全链路
  // 页面事件 → store → LocalStorageAdapter → wx.setStorageSync → 渲染刷新
  // ============================================================
  it('本地模式全链路 - 页面事件 → store → LocalStorageAdapter → wx.setStorageSync → 渲染刷新', async () => {
    // Setup: local 模式 + 清空 cycleStore 内存
    await evaluate(`
      var sm = require('utils/storage/storageManager')
      var cs = require('stores/cycleStore')
      sm.storageManager.setMode('local')
      cs.cycleStore.cycles = []
      cs.cycleStore.activeCycleId = null
      return true
    `)

    const cycle = makeTestCycle('e2e-df-local-001')
    const cycleJson = JSON.stringify(cycle)

    // 订阅 + addCycle + 断言全链路
    const result = await evaluate<{
      cycleCount: number
      cycleId: string
      storageHasCycle: boolean
      storageCyclesLen: number
      subscribeCalled: number
    }>(`
      var cs = require('stores/cycleStore')
      globalThis.__subscribeCalled = 0
      var unsub = cs.cycleStore.subscribe(function() { globalThis.__subscribeCalled++ })
      cs.cycleStore.addCycle(${cycleJson})
      var cycles = cs.cycleStore.getCycles()
      var raw = wx.getStorageSync('candito_cycles')
      var r = {
        cycleCount: cycles.length,
        cycleId: cycles.length > 0 ? cycles[0].id : '',
        storageHasCycle: Array.isArray(raw) && raw.length > 0,
        storageCyclesLen: Array.isArray(raw) ? raw.length : 0,
        subscribeCalled: globalThis.__subscribeCalled
      }
      unsub()
      return r
    `)
    // store 内存含新周期
    expect(result.cycleCount).toBe(1)
    expect(result.cycleId).toBe(cycle.id)
    // LocalStorageAdapter 被命中：wx.setStorageSync 写入 candito_cycles
    expect(result.storageHasCycle).toBe(true)
    expect(result.storageCyclesLen).toBe(1)
    // subscribe 回调被触发（证明 store → 视图刷新链路）
    expect(result.subscribeCalled).toBeGreaterThan(0)

    // 全链路 round-trip：重启小程序后状态完整恢复
    await relaunch('pages/start/index')
    const afterReload = await evaluate<{
      cycleCount: number
      cycleId: string
      activeCycleId: string | null
    }>(`
      var cs = require('stores/cycleStore')
      await cs.cycleStore.load()
      var cycles = cs.cycleStore.getCycles()
      return {
        cycleCount: cycles.length,
        cycleId: cycles.length > 0 ? cycles[0].id : '',
        activeCycleId: cs.cycleStore.getActiveCycleId()
      }
    `)
    expect(afterReload.cycleCount).toBe(1)
    expect(afterReload.cycleId).toBe(cycle.id)
    expect(afterReload.activeCycleId).toBe(cycle.id)
  })

  // ============================================================
  // 11.2 云端模式全链路
  // 页面事件 → store → CloudStorageAdapter → app_data collection → 渲染刷新
  // ============================================================
  it('云端模式全链路 - 页面事件 → store → CloudStorageAdapter → app_data collection → 渲染刷新', async () => {
    const auto = getAuto()
    await initCloudBase(auto)

    // Setup: cloud 模式 + 清空 cycleStore 内存
    await evaluate(`
      var sm = require('utils/storage/storageManager')
      var cs = require('stores/cycleStore')
      sm.storageManager.setMode('cloud')
      cs.cycleStore.cycles = []
      cs.cycleStore.activeCycleId = null
      return true
    `)

    const cycle = makeTestCycle('e2e-df-cloud-001')
    const cycleJson = JSON.stringify(cycle)
    const prefix = wrapKey('')
    const expectedCloudKey = wrapKey('candito_cycles')

    // 安装 key-wrapping 代理 + 订阅 + addCycle + 断言 + 模拟新设备重载
    const result = await evaluate<{
      cycleCount: number
      cycleId: string
      cloudDocExists: boolean
      cloudDocKey: string
      cloudDocCyclesLen: number
      subscribeCalled: number
      reloadedCount: number
      reloadedId: string
    }>(`
      ${installWrappedAdapterScript(prefix)}
      var cs = require('stores/cycleStore')
      var r = {}
      try {
        // 订阅 cycleStore
        globalThis.__subscribeCalled = 0
        var unsub = cs.cycleStore.subscribe(function() { globalThis.__subscribeCalled++ })

        // addCycle（通过 wrapped adapter 写入 wrapKey('candito_cycles')）
        cs.cycleStore.addCycle(${cycleJson})
        var cycles = cs.cycleStore.getCycles()
        r.cycleCount = cycles.length
        r.cycleId = cycles.length > 0 ? cycles[0].id : ''

        // 断言 CloudStorageAdapter 被命中：app_data collection 含对应文档
        var cloudKey = ${JSON.stringify(expectedCloudKey)}
        var db = wx.cloud.database()
        var res = await db.collection('app_data').where({ key: cloudKey }).limit(1).get()
        var doc = (res.data && res.data.length > 0) ? res.data[0] : null
        r.cloudDocExists = doc !== null
        r.cloudDocKey = doc ? doc.key : ''
        r.cloudDocCyclesLen = (doc && doc.value && Array.isArray(doc.value)) ? doc.value.length : 0
        r.subscribeCalled = globalThis.__subscribeCalled

        // 模拟"另一台设备"登录：清空内存，从云端重新 load
        cs.cycleStore.cycles = []
        cs.cycleStore.activeCycleId = null
        await cs.cycleStore.load()
        var reloaded = cs.cycleStore.getCycles()
        r.reloadedCount = reloaded.length
        r.reloadedId = reloaded.length > 0 ? reloaded[0].id : ''

        unsub()
      } finally {
        ${restoreWrappedAdapterScript()}
      }
      return r
    `)
    // store 内存含新周期
    expect(result.cycleCount).toBe(1)
    expect(result.cycleId).toBe(cycle.id)
    // CloudStorageAdapter 被命中：app_data collection 含 wrapKey('candito_cycles') 文档
    expect(result.cloudDocExists).toBe(true)
    expect(result.cloudDocKey).toBe(expectedCloudKey)
    expect(result.cloudDocCyclesLen).toBe(1)
    // subscribe 回调被触发
    expect(result.subscribeCalled).toBeGreaterThan(0)
    // 模拟新设备重载后数据可恢复（证明非仅内存）
    expect(result.reloadedCount).toBe(1)
    expect(result.reloadedId).toBe(cycle.id)
  })

  // ============================================================
  // 11.3 存储后端切换后数据重新加载
  // ============================================================
  describe('存储后端切换后数据重新加载', () => {
    // 本地 → 云端：store 重新 load 后为空（云端命名空间为空）
    it('本地 → 云端：store 重新 load 后为空', async () => {
      const auto = getAuto()
      const cycle = makeTestCycle('e2e-df-switch-lc-001')
      const cycleJson = JSON.stringify(cycle)

      // Setup: local 模式，写入周期到本地
      await evaluate(`
        var sm = require('utils/storage/storageManager')
        var cs = require('stores/cycleStore')
        sm.storageManager.setMode('local')
        cs.cycleStore.cycles = []
        cs.cycleStore.activeCycleId = null
        cs.cycleStore.addCycle(${cycleJson})
        return cs.cycleStore.getCycles().length
      `)

      // 切换到 cloud（wrapped 命名空间，为空）→ load → 断言为空
      await initCloudBase(auto)
      const prefix = wrapKey('')
      const result = await evaluate<{
        localCount: number
        cloudCount: number
      }>(`
        var sm = require('utils/storage/storageManager')
        var cs = require('stores/cycleStore')
        var beforeCount = cs.cycleStore.getCycles().length
        sm.storageManager.setMode('cloud')
        ${installWrappedAdapterScript(prefix)}
        try {
          await cs.cycleStore.load()
          var afterCount = cs.cycleStore.getCycles().length
          return { localCount: beforeCount, cloudCount: afterCount }
        } finally {
          ${restoreWrappedAdapterScript()}
        }
      `)
      expect(result.localCount).toBe(1)
      expect(result.cloudCount).toBe(0)
    })

    // 云端 → 本地：store 重新 load 后为空（本地为空）
    it('云端 → 本地：store 重新 load 后为空', async () => {
      const auto = getAuto()
      await initCloudBase(auto)
      const cycle = makeTestCycle('e2e-df-switch-cl-001')
      const cycleJson = JSON.stringify(cycle)
      const prefix = wrapKey('')

      // Setup: cloud 模式（wrapped），写入周期到云端
      const setupResult = await evaluate<number>(`
        var sm = require('utils/storage/storageManager')
        var cs = require('stores/cycleStore')
        sm.storageManager.setMode('cloud')
        cs.cycleStore.cycles = []
        cs.cycleStore.activeCycleId = null
        ${installWrappedAdapterScript(prefix)}
        try {
          cs.cycleStore.addCycle(${cycleJson})
          return cs.cycleStore.getCycles().length
        } finally {
          ${restoreWrappedAdapterScript()}
        }
      `)
      expect(setupResult).toBe(1)

      // 清空本地存储，切换到 local → load → 断言为空
      const result = await evaluate<{
        cloudCount: number
        localCount: number
      }>(`
        var sm = require('utils/storage/storageManager')
        var cs = require('stores/cycleStore')
        var beforeCount = cs.cycleStore.getCycles().length
        wx.clearStorageSync()
        sm.storageManager.setMode('local')
        cs.cycleStore.cycles = []
        cs.cycleStore.activeCycleId = null
        await cs.cycleStore.load()
        var afterCount = cs.cycleStore.getCycles().length
        return { cloudCount: beforeCount, localCount: afterCount }
      `)
      expect(result.cloudCount).toBe(1)
      expect(result.localCount).toBe(0)
    })

    // 空后端提示 toast
    it('空后端提示 toast - 切换到空后端时 wx.showToast 提示"该存储模式下暂无数据"', async () => {
      const auto = getAuto()
      await initCloudBase(auto)

      // Setup: cloud 模式，清空本地存储（确保切换到 local 后为空）
      await evaluate(`
        var sm = require('utils/storage/storageManager')
        var ss = require('stores/settingsStore')
        sm.storageManager.setMode('cloud')
        ss.settingsStore.update({ storageMode: 'cloud' })
        wx.clearStorageSync()
        return true
      `)

      // 导航到设置页
      const page = await navigateAndWait(auto, 'pages/settings/index')

      // 安装 mock：showModal 自动确认 + showToast 捕获 + showLoading/hideLoading 空操作
      await evaluate(`
        globalThis.__capturedToastArgs = null
        if (!globalThis.__originalShowToast) globalThis.__originalShowToast = wx.showToast
        wx.showToast = function(opts) {
          globalThis.__capturedToastArgs = { title: opts.title || '', icon: opts.icon || '' }
        }
        if (!globalThis.__originalShowModal) globalThis.__originalShowModal = wx.showModal
        wx.showModal = function(opts) {
          if (opts.success) {
            setTimeout(function() { opts.success({ confirm: true, cancel: false }) }, 10)
          }
        }
        if (!globalThis.__originalShowLoading) globalThis.__originalShowLoading = wx.showLoading
        wx.showLoading = function() {}
        if (!globalThis.__originalHideLoading) globalThis.__originalHideLoading = wx.hideLoading
        wx.hideLoading = function() {}
        return true
      `)

      // 触发切换（cloud → local，local 为空）
      await page.callMethod('handleStorageModeSwitch')
      // 等待 performSwitch 完成（含 modal 回调 + 各 store load）
      await new Promise((r) => setTimeout(r, 1500))

      const toast = await evaluate<{ title: string; icon: string } | null>(`
        return globalThis.__capturedToastArgs || null
      `)
      expect(toast).not.toBeNull()
      expect(toast!.title).toContain('暂无数据')
    })
  })

  // ============================================================
  // 11.4 store 订阅触发视图刷新
  // 对照 H5 Pinia 响应式：store change → subscribe callback → setData() → re-render
  // ============================================================
  it('store 订阅触发视图刷新', async () => {
    const auto = getAuto()

    // Setup: local 模式 + 清空 cycleStore
    await evaluate(`
      var sm = require('utils/storage/storageManager')
      var cs = require('stores/cycleStore')
      sm.storageManager.setMode('local')
      cs.cycleStore.cycles = []
      cs.cycleStore.activeCycleId = null
      return true
    `)

    // 导航到今日训练页（onLoad 订阅 cycleStore）
    const page = await navigateAndWait(auto, 'pages/today/index', 500)

    // Before: 无周期，pageState='noCycle', activeCycle=null
    const before = await page.data<{ pageState: string; activeCycle: unknown }>()
    expect(before.pageState).toBe('noCycle')
    expect(before.activeCycle).toBeNull()

    // addCycle → subscribe 回调触发 refresh → setData
    const cycle = makeTestCycle('e2e-df-view-001')
    const cycleJson = JSON.stringify(cycle)
    await evaluate(`
      var cs = require('stores/cycleStore')
      cs.cycleStore.addCycle(${cycleJson})
      return true
    `)
    // 等待 subscribe callback → refresh() → setData() 完成
    await new Promise((r) => setTimeout(r, 600))

    // After: activeCycle 已设置，pageState !== 'noCycle'
    const after = await page.data<{
      pageState: string
      activeCycle: { id: string } | null
    }>()
    expect(after.activeCycle).not.toBeNull()
    expect(after.activeCycle!.id).toBe(cycle.id)
    // pageState 从 'noCycle' 变为其他状态（rest/pending/paused/...），
    // 证明页面 data 确实更新（而非仅 store 变化）
    expect(after.pageState).not.toBe('noCycle')
  })

  // ============================================================
  // 11.5 错误降级
  // mock 存储后端不可用（本地满 / 云端断网），断言 store 方法不抛错、
  // 业务层有提示、已加载状态不丢失
  // ============================================================
  describe('错误降级', () => {
    it('本地存储满：store 不抛错，已加载状态保留', async () => {
      const cycle1 = makeTestCycle('e2e-df-err-local-001')
      const cycle2 = makeTestCycle('e2e-df-err-local-002')
      const cycle1Json = JSON.stringify(cycle1)
      const cycle2Json = JSON.stringify(cycle2)

      const result = await evaluate<{
        threw: boolean
        errMsg: string
        beforeCount: number
        afterCount: number
        hasFirstCycle: boolean
        toastArgs: { title: string; icon: string } | null
      }>(`
        var sm = require('utils/storage/storageManager')
        var cs = require('stores/cycleStore')
        sm.storageManager.setMode('local')
        cs.cycleStore.cycles = []
        cs.cycleStore.activeCycleId = null

        // 预加载一个周期（已加载状态）
        cs.cycleStore.addCycle(${cycle1Json})
        var beforeCount = cs.cycleStore.getCycles().length

        // mock wx.setStorageSync 抛错（存储满）
        globalThis.__origSetStorageSync = wx.setStorageSync
        wx.setStorageSync = function() { throw new Error('storage full') }

        // mock wx.showToast 捕获业务层通知
        globalThis.__capturedToastArgs = null
        if (!globalThis.__originalShowToast) globalThis.__originalShowToast = wx.showToast
        wx.showToast = function(opts) {
          globalThis.__capturedToastArgs = { title: opts.title || '', icon: opts.icon || '' }
        }

        // addCycle：store 方法不应抛错（LocalStorageAdapter.set + cycleStore.save 内部 catch）
        var threw = false
        var errMsg = ''
        try {
          cs.cycleStore.addCycle(${cycle2Json})
        } catch (e) {
          threw = true
          errMsg = (e && e.message) ? e.message : String(e)
        }

        // 等待 void save() 异步完成
        await new Promise(function(r) { setTimeout(r, 50) })

        var afterCycles = cs.cycleStore.getCycles()
        var hasFirst = afterCycles.some(function(c) { return c.id === ${JSON.stringify(cycle1.id)} })

        // 恢复 setStorageSync（toast mock 保留供断言，由 afterEach 统一恢复）
        wx.setStorageSync = globalThis.__origSetStorageSync
        globalThis.__origSetStorageSync = null

        return {
          threw: threw,
          errMsg: errMsg,
          beforeCount: beforeCount,
          afterCount: afterCycles.length,
          hasFirstCycle: hasFirst,
          toastArgs: globalThis.__capturedToastArgs
        }
      `)
      // store 方法不抛错
      expect(result.threw).toBe(false)
      expect(result.errMsg).toBe('')
      // 已加载状态保留（至少含预加载的周期）
      expect(result.beforeCount).toBe(1)
      expect(result.afterCount).toBeGreaterThanOrEqual(1)
      expect(result.hasFirstCycle).toBe(true)
      // 业务层有通知（spec 要求；当前 impl 静默降级时此项标记已知缺口）
      expect(result.toastArgs).not.toBeNull()
    })

    it('云端网络错误：store 不抛错，已加载状态保留', async () => {
      const auto = getAuto()
      await initCloudBase(auto)

      const cycle1 = makeTestCycle('e2e-df-err-cloud-001')
      const cycle2 = makeTestCycle('e2e-df-err-cloud-002')
      const cycle1Json = JSON.stringify(cycle1)
      const cycle2Json = JSON.stringify(cycle2)
      const prefix = wrapKey('')

      const result = await evaluate<{
        threw: boolean
        errMsg: string
        beforeCount: number
        afterCount: number
        hasFirstCycle: boolean
        toastArgs: { title: string; icon: string } | null
      }>(`
        var sm = require('utils/storage/storageManager')
        var cs = require('stores/cycleStore')
        var cloudMod = require('utils/storage/CloudStorageAdapter')
        cloudMod.setCloudInitialized(true)
        sm.storageManager.setMode('cloud')
        cs.cycleStore.cycles = []
        cs.cycleStore.activeCycleId = null

        // 安装 wrapped adapter（命名空间隔离）
        ${installWrappedAdapterScript(prefix)}

        // 预加载一个周期（云端可用时写入成功）
        cs.cycleStore.addCycle(${cycle1Json})
        await new Promise(function(r) { setTimeout(r, 300) })
        var beforeCount = cs.cycleStore.getCycles().length

        // mock wx.cloud.database 抛错（网络错误）
        globalThis.__origCloudDatabase = wx.cloud.database
        wx.cloud.database = function() { throw new Error('mock network error') }

        // mock wx.showToast 捕获业务层通知
        globalThis.__capturedToastArgs = null
        if (!globalThis.__originalShowToast) globalThis.__originalShowToast = wx.showToast
        wx.showToast = function(opts) {
          globalThis.__capturedToastArgs = { title: opts.title || '', icon: opts.icon || '' }
        }

        // addCycle：store 方法不应抛错（CloudStorageAdapter.set 抛错由 cycleStore.save catch）
        var threw = false
        var errMsg = ''
        try {
          cs.cycleStore.addCycle(${cycle2Json})
        } catch (e) {
          threw = true
          errMsg = (e && e.message) ? e.message : String(e)
        }

        // 等待 void save() 异步完成
        await new Promise(function(r) { setTimeout(r, 300) })

        var afterCycles = cs.cycleStore.getCycles()
        var hasFirst = afterCycles.some(function(c) { return c.id === ${JSON.stringify(cycle1.id)} })

        // 恢复 cloud.database（wrapped adapter / toast 由 afterEach 统一恢复）
        wx.cloud.database = globalThis.__origCloudDatabase
        globalThis.__origCloudDatabase = null

        return {
          threw: threw,
          errMsg: errMsg,
          beforeCount: beforeCount,
          afterCount: afterCycles.length,
          hasFirstCycle: hasFirst,
          toastArgs: globalThis.__capturedToastArgs
        }
      `)
      // store 方法不抛错
      expect(result.threw).toBe(false)
      expect(result.errMsg).toBe('')
      // 已加载状态保留
      expect(result.beforeCount).toBe(1)
      expect(result.afterCount).toBeGreaterThanOrEqual(1)
      expect(result.hasFirstCycle).toBe(true)
      // 业务层有通知（spec 要求；当前 impl 静默降级时此项标记已知缺口）
      expect(result.toastArgs).not.toBeNull()
    })
  })
})
