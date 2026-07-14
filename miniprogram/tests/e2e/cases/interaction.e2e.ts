// interaction.e2e.ts — Task 10: 交互逻辑 1:1 保真 E2E 测试
//
// 7 个用例，对照 H5 Vue Router + Pinia + useTimer + AppTabBar.vue 行为：
//   10.1 导航对照      — tab 页用 wx.switchTab，非 tab 页用 wx.navigateTo，返回栈一致
//   10.2 TabBar 切换   — 4 个 tab 切换到对应页面，选中色 #0A84FF 与 H5 一致
//   10.3 计时器        — 训练总时长递增，组间休息倒计时默认 90s，与 H5 useTimer 一致
//   10.4 表单录入      — 输入重量/次数 → 完成本组 → 自动进入下一组且目标值预填
//   10.5 模态二次确认  — 终止周期弹出 wx.showModal，取消不执行，确认执行
//   10.6 滑动返回      — 从非 tab 页返回上一页，对应 H5 浏览器返回
//   10.7 生命周期订阅  — onLoad 订阅 store，onUnload 取消订阅，与 H5 onMounted/onUnmounted 一致
//
// 所有用例在 automator 不可用（沙箱未装开发者工具）时整体跳过。

import * as fs from 'fs'
import * as path from 'path'

// ── automator 实例（globalSetup 写入 globalThis.__AUTOMATOR__） ──
const automator: Automator | null =
  typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ ?? null : null

// automator 不可用时整体跳过；用例内部使用 automator! 非空断言
const interactionDescribe = automator ? describe : describe.skip

// ── 文件路径常量 ──
const APP_JSON_PATH = path.resolve(__dirname, '..', '..', '..', 'app.json')
const H5_TAB_BAR_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'candito-v4-training-app',
  'src',
  'components',
  'AppTabBar.vue'
)
const H5_USE_TIMER_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'candito-v4-training-app',
  'src',
  'composables',
  'useTimer.ts'
)

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// ── evaluate 返回值类型 ──

interface CapturedCall {
  url?: string
  title?: string
  content?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  [key: string]: unknown
}

interface TimerState {
  isRunning: boolean
  elapsedSeconds: number
  elapsedFormatted: string
  isResting: boolean
  restSeconds: number
  restFormatted: string
  defaultRestSeconds: number
}

interface SetState {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  isAMRAP?: boolean
  actualWeight: number
  actualReps: number
  isCompleted: boolean
}

interface ExerciseState {
  id: string
  name: string
  type: string
  sets: SetState[]
}

interface TrainingState extends TimerState {
  exercises: ExerciseState[]
  currentExerciseIndex: number
  currentSetIndex: number
  inputWeight: number
  inputReps: number
  inputWeightStr: string
}

interface FirstTrainingDay {
  cycleId: string
  week: number
  day: number
}

interface SubscribeCounters {
  subscribeCalls: number
  unsubscribeCalls: number
  notifyCalls: number
}

interface CycleStatus {
  status: string
}

interface AppJsonTabBar {
  color: string
  selectedColor: string
  list: Array<{ pagePath: string; text: string }>
}

// ── 辅助函数 ──

/** 获取当前页面路径（route） */
async function getCurrentPath(mp: MiniProgram): Promise<string> {
  return mp.evaluate<string>(`
    var pages = getCurrentPages()
    return pages.length > 0 ? pages[pages.length - 1].route : ''
  `)
}

/** 获取当前页面对象（automator Page） */
async function getCurrentPage(mp: MiniProgram): Promise<Page> {
  const fn = mp.currentPage
  if (!fn) {
    throw new Error('automator.miniProgram.currentPage 不可用')
  }
  return fn()
}

type WxMethodName =
  | 'switchTab'
  | 'navigateTo'
  | 'navigateBack'
  | 'showModal'
  | 'showToast'

/**
 * 拦截 wx.<methodName>，将调用参数记录到 globalThis.__captured_<methodName>。
 * 拦截后 success/complete 回调仍会被调用：
 *   - showModal: 根据 globalThis.__modal_confirm_result 返回 confirm/cancel
 *   - 其他方法: success({}) 空对象
 * 这样保证页面逻辑（如 showModal 的 success 回调）不中断。
 */
async function overrideWxMethod(
  mp: MiniProgram,
  methodName: WxMethodName
): Promise<void> {
  const nameJson = JSON.stringify(methodName)
  await mp.evaluate(`
    var name = ${nameJson}
    globalThis['__captured_' + name] = []
    globalThis['__original_' + name] = wx[name]
    globalThis['__modal_confirm_result'] = false
    wx[name] = function(opts) {
      opts = opts || {}
      globalThis['__captured_' + name].push({
        url: opts.url,
        title: opts.title,
        content: opts.content,
        confirmText: opts.confirmText,
        cancelText: opts.cancelText,
        showCancel: opts.showCancel
      })
      if (typeof opts.success === 'function') {
        if (name === 'showModal') {
          var confirm = globalThis['__modal_confirm_result']
          opts.success({ confirm: confirm, cancel: !confirm })
        } else {
          opts.success({})
        }
      }
      if (typeof opts.complete === 'function') {
        opts.complete()
      }
    }
    return true
  `)
}

/** 读取拦截到的调用记录 */
async function getCapturedCalls(
  mp: MiniProgram,
  methodName: WxMethodName
): Promise<CapturedCall[]> {
  const nameJson = JSON.stringify(methodName)
  return mp.evaluate<CapturedCall[]>(`
    return globalThis['__captured_' + ${nameJson}] || []
  `)
}

/** 设置 wx.showModal 的确认结果（true=确认, false=取消） */
async function setShowModalResult(mp: MiniProgram, confirm: boolean): Promise<void> {
  await mp.evaluate(`
    globalThis['__modal_confirm_result'] = ${confirm}
    return true
  `)
}

/** 恢复原始 wx.<methodName> 并清理全局变量 */
async function restoreWxMethod(
  mp: MiniProgram,
  methodName: WxMethodName
): Promise<void> {
  const nameJson = JSON.stringify(methodName)
  await mp.evaluate(`
    var name = ${nameJson}
    if (globalThis['__original_' + name]) {
      wx[name] = globalThis['__original_' + name]
    }
    delete globalThis['__captured_' + name]
    delete globalThis['__original_' + name]
    delete globalThis['__modal_confirm_result']
    return true
  `)
}

/** 在小程序运行时创建一个训练周期（深蹲100/卧推80/硬拉120），返回 cycleId */
async function createCycleViaEvaluate(mp: MiniProgram): Promise<string> {
  return mp.evaluate<string>(`
    var planGen = require('services/planGenerator')
    var cycleStore = require('stores/cycleStore').cycleStore
    var dateSvc = require('services/dateService')
    var today = dateSvc.getToday()
    var cycle = planGen.createCycle({
      oneRM: { squat: 100, bench: 80, deadlift: 120 },
      unit: 'kg',
      weightRounding: 2.5,
      startDate: today,
      assistanceConfig: {
        horizontalPull: '杠铃划船',
        shoulder: '哑铃推举',
        verticalPull: '引体向上'
      }
    })
    cycleStore.addCycle(cycle)
    return cycle.id
  `)
}

/** 获取当前活跃周期的第一个非休息训练日 */
async function getFirstTrainingDay(
  mp: MiniProgram
): Promise<FirstTrainingDay | null> {
  return mp.evaluate<FirstTrainingDay | null>(`
    var cycleStore = require('stores/cycleStore').cycleStore
    var cycle = cycleStore.getActiveCycle()
    if (!cycle) return null
    for (var i = 0; i < cycle.weeks.length; i++) {
      var week = cycle.weeks[i]
      for (var j = 0; j < week.days.length; j++) {
        var day = week.days[j]
        if (day.type !== 'rest') {
          return { cycleId: cycle.id, week: week.weekNumber, day: day.dayNumber }
        }
      }
    }
    return null
  `)
}

/** 读取训练执行页的计时器状态 */
async function getTimerState(mp: MiniProgram): Promise<TimerState | null> {
  return mp.evaluate<TimerState | null>(`
    var pages = getCurrentPages()
    var page = pages[pages.length - 1]
    if (!page || page.route !== 'pages/training-execute/index') return null
    return {
      isRunning: !!page._isRunning,
      elapsedSeconds: page._elapsedSeconds || 0,
      elapsedFormatted: page.data.elapsedFormatted || '00:00',
      isResting: !!page._isResting,
      restSeconds: page._restSeconds || 0,
      restFormatted: page.data.restFormatted || '--:--',
      defaultRestSeconds: page._defaultRestSeconds || 90
    }
  `)
}

/** 读取训练执行页的完整状态（含动作/组数据与输入值） */
async function getTrainingState(mp: MiniProgram): Promise<TrainingState | null> {
  return mp.evaluate<TrainingState | null>(`
    var pages = getCurrentPages()
    var page = pages[pages.length - 1]
    if (!page || page.route !== 'pages/training-execute/index') return null
    return {
      isRunning: !!page._isRunning,
      elapsedSeconds: page._elapsedSeconds || 0,
      elapsedFormatted: page.data.elapsedFormatted || '00:00',
      isResting: !!page._isResting,
      restSeconds: page._restSeconds || 0,
      restFormatted: page.data.restFormatted || '--:--',
      defaultRestSeconds: page._defaultRestSeconds || 90,
      exercises: page._exercises || [],
      currentExerciseIndex: page._currentExerciseIndex || 0,
      currentSetIndex: page._currentSetIndex || 0,
      inputWeight: page._inputWeight || 0,
      inputReps: page._inputReps || 0,
      inputWeightStr: page.data.inputWeightStr || '0'
    }
  `)
}

/** 读取最后创建的周期状态（用于断言终止操作是否生效） */
async function getLastCycleStatus(mp: MiniProgram): Promise<CycleStatus | null> {
  return mp.evaluate<CycleStatus | null>(`
    var cycleStore = require('stores/cycleStore').cycleStore
    var cycles = cycleStore.getCycles()
    if (cycles.length === 0) return null
    var last = cycles[cycles.length - 1]
    return { status: last.status }
  `)
}

/**
 * 拦截 cycleStore.subscribe，记录订阅/取消订阅/通知次数。
 * 包装原始 subscribe：
 *   - subscribeCalls:    subscribe 被调用次数（onLoad 触发）
 *   - unsubscribeCalls:  返回的取消订阅函数被调用次数（onUnload 触发）
 *   - notifyCalls:       订阅回调被实际调用次数（store 变化触发）
 */
async function overrideCycleStoreSubscribe(mp: MiniProgram): Promise<void> {
  await mp.evaluate(`
    var cycleStore = require('stores/cycleStore').cycleStore
    globalThis['__original_subscribe'] = cycleStore.subscribe.bind(cycleStore)
    globalThis['__subscribe_calls'] = 0
    globalThis['__unsubscribe_calls'] = 0
    globalThis['__notify_calls'] = 0
    cycleStore.subscribe = function(fn) {
      globalThis['__subscribe_calls']++
      var wrapped = function() {
        globalThis['__notify_calls']++
        try { fn() } catch (e) {}
      }
      var unsub = globalThis['__original_subscribe'](wrapped)
      return function() {
        globalThis['__unsubscribe_calls']++
        return unsub()
      }
    }
    return true
  `)
}

/** 读取订阅计数器 */
async function getSubscribeCounters(
  mp: MiniProgram
): Promise<SubscribeCounters> {
  return mp.evaluate<SubscribeCounters>(`
    return {
      subscribeCalls: globalThis['__subscribe_calls'] || 0,
      unsubscribeCalls: globalThis['__unsubscribe_calls'] || 0,
      notifyCalls: globalThis['__notify_calls'] || 0
    }
  `)
}

/** 恢复原始 cycleStore.subscribe */
async function restoreCycleStoreSubscribe(mp: MiniProgram): Promise<void> {
  await mp.evaluate(`
    var cycleStore = require('stores/cycleStore').cycleStore
    if (globalThis['__original_subscribe']) {
      cycleStore.subscribe = globalThis['__original_subscribe']
    }
    delete globalThis['__original_subscribe']
    delete globalThis['__subscribe_calls']
    delete globalThis['__unsubscribe_calls']
    delete globalThis['__notify_calls']
    return true
  `)
}

/** 读取 app.json tabBar 配置 */
function readAppJsonTabBar(): AppJsonTabBar {
  const raw = fs.readFileSync(APP_JSON_PATH, 'utf-8')
  const json = JSON.parse(raw) as { tabBar: AppJsonTabBar }
  return json.tabBar
}

/** 读取 H5 源码用于对照（文件不存在时返回空字符串） */
function readH5Source(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

// ═══════════════════════════════════════════════════════════════
// 测试用例
// ═══════════════════════════════════════════════════════════════

interactionDescribe('交互逻辑 1:1 保真 E2E', () => {
  // ── SubTask 10.1: 导航对照 ──
  it('导航对照：tab 页用 switchTab，非 tab 页用 navigateTo，返回栈一致', async () => {
    const mp = automator!.miniProgram

    // Part 1: tab 页跳转使用 wx.switchTab
    // 重启到今日页，拦截 wx.switchTab，调用 goStats 方法
    await mp.relaunch({ path: 'pages/today/index' })
    await wait(800)

    await overrideWxMethod(mp, 'switchTab')
    try {
      const page = await getCurrentPage(mp)
      await page.callMethod('goStats')
      await wait(300)

      const calls = await getCapturedCalls(mp, 'switchTab')
      expect(calls.length).toBeGreaterThanOrEqual(1)
      expect(calls[0].url).toBe('/pages/stats/index')
    } finally {
      await restoreWxMethod(mp, 'switchTab')
    }

    // Part 2: 非 tab 页跳转使用 wx.navigateTo
    // 重启到今日页（无活跃周期），点击"创建训练周期"按钮
    await mp.relaunch({ path: 'pages/today/index' })
    await wait(800)

    await overrideWxMethod(mp, 'navigateTo')
    try {
      const page = await getCurrentPage(mp)
      const startBtn = await page.$('.no-cycle-btn')
      await startBtn.tap()
      await wait(300)

      const calls = await getCapturedCalls(mp, 'navigateTo')
      expect(calls.length).toBeGreaterThanOrEqual(1)
      expect(calls[0].url).toBe('/pages/start/index')
    } finally {
      await restoreWxMethod(mp, 'navigateTo')
    }

    // Part 3: 返回栈行为（navigateTo → navigateBack）
    // 对应 H5 Vue Router 的 router.push → router.back
    await mp.relaunch({ path: 'pages/today/index' })
    await wait(800)

    await mp.navigateTo('/pages/start/index')
    await wait(800)
    const pathBefore = await getCurrentPath(mp)
    expect(pathBefore).toBe('pages/start/index')

    await mp.navigateBack()
    await wait(800)
    const pathAfter = await getCurrentPath(mp)
    expect(pathAfter).toBe('pages/today/index')
  })

  // ── SubTask 10.2: TabBar 切换 ──
  it('TabBar 切换：4 个 tab 切换到对应页面，选中色 #0A84FF 与 H5 一致', async () => {
    const mp = automator!.miniProgram
    const tabBar = readAppJsonTabBar()

    // 断言 tabBar 配置：4 个 tab，selectedColor = #0A84FF
    expect(tabBar.list.length).toBe(4)
    expect(tabBar.selectedColor).toBe('#0A84FF')

    // 逐个切换 tab，验证页面路径
    for (const tab of tabBar.list) {
      await mp.switchTab('/' + tab.pagePath)
      await wait(800)
      const currentPath = await getCurrentPath(mp)
      expect(currentPath).toBe(tab.pagePath)
    }

    // 与 H5 AppTabBar.vue 对照：
    //   - active tab 使用 var(--color-training-main) = #0A84FF
    //   - 4 个 tab label 为 今日/日历/统计/设置
    const h5TabBarSrc = readH5Source(H5_TAB_BAR_PATH)
    expect(h5TabBarSrc).toContain('color-training-main')
    expect(h5TabBarSrc).toContain('今日')
    expect(h5TabBarSrc).toContain('日历')
    expect(h5TabBarSrc).toContain('统计')
    expect(h5TabBarSrc).toContain('设置')

    // 小程序 tabBar text 与 H5 label 一致
    const tabTexts = tabBar.list.map((t) => t.text)
    expect(tabTexts).toEqual(['今日', '日历', '统计', '设置'])
  })

  // ── SubTask 10.3: 计时器 ──
  it('计时器：训练总时长递增，组间休息倒计时默认 90s 与 H5 useTimer 一致', async () => {
    const mp = automator!.miniProgram

    // 创建周期并找到第一个训练日
    const cycleId = await createCycleViaEvaluate(mp)
    expect(cycleId).toBeTruthy()

    const firstDay = await getFirstTrainingDay(mp)
    expect(firstDay).not.toBeNull()
    expect(firstDay!.cycleId).toBe(cycleId)

    // 导航到训练执行页（onLoad 中调用 startTimer）
    await mp.relaunch({
      path: `pages/training-execute/index?week=${firstDay!.week}&day=${firstDay!.day}&cycleId=${cycleId}`,
    })
    await wait(1500) // 等待 onLoad 完成（含 startTimer）

    // 断言训练计时器已启动
    const timer1 = await getTimerState(mp)
    expect(timer1).not.toBeNull()
    expect(timer1!.isRunning).toBe(true)
    expect(timer1!.elapsedSeconds).toBeGreaterThanOrEqual(0)
    const initialElapsed = timer1!.elapsedSeconds

    // 等待 2.5 秒，断言训练总时长计时器递增
    await wait(2500)
    const timer2 = await getTimerState(mp)
    expect(timer2).not.toBeNull()
    expect(timer2!.isRunning).toBe(true)
    expect(timer2!.elapsedSeconds).toBeGreaterThan(initialElapsed)
    expect(timer2!.elapsedSeconds).toBeGreaterThanOrEqual(initialElapsed + 2)

    // 完成一组：输入重量 80kg → 点击"完成本组"
    const page = await getCurrentPage(mp)
    const weightInput = await page.$('.weight-input')
    await weightInput.input('80')
    await wait(300)

    const completeBtn = await page.$('.complete-set-btn')
    await completeBtn.tap()
    await wait(500)

    // 断言该组标记完成
    const state1 = await getTrainingState(mp)
    expect(state1).not.toBeNull()
    const firstSet = state1!.exercises[0]?.sets[0]
    expect(firstSet).toBeDefined()
    expect(firstSet!.isCompleted).toBe(true)
    expect(firstSet!.actualWeight).toBe(80)

    // 断言休息倒计时启动（默认 90s）
    expect(state1!.isResting).toBe(true)
    expect(state1!.restSeconds).toBeGreaterThan(0)
    expect(state1!.defaultRestSeconds).toBe(90)

    // 等待 2.5 秒，断言休息倒计时递减
    const restBefore = state1!.restSeconds
    await wait(2500)
    const timer3 = await getTimerState(mp)
    expect(timer3).not.toBeNull()
    expect(timer3!.isResting).toBe(true)
    expect(timer3!.restSeconds).toBeLessThan(restBefore)
    expect(timer3!.restSeconds).toBeLessThanOrEqual(restBefore - 2)

    // 与 H5 useTimer.ts 对照：默认休息时间 90s，计时器递增行为一致
    const h5UseTimerSrc = readH5Source(H5_USE_TIMER_PATH)
    expect(h5UseTimerSrc).toContain('defaultRestSeconds = ref(90)')
    expect(h5UseTimerSrc).toContain('elapsedSeconds.value++')
    expect(state1!.defaultRestSeconds).toBe(90)
  })

  // ── SubTask 10.4: 表单录入 ──
  it('表单录入：输入重量/次数 → 完成本组 → 自动进入下一组且目标值预填', async () => {
    const mp = automator!.miniProgram

    // 创建周期并导航到训练执行页
    const cycleId = await createCycleViaEvaluate(mp)
    expect(cycleId).toBeTruthy()

    const firstDay = await getFirstTrainingDay(mp)
    expect(firstDay).not.toBeNull()

    await mp.relaunch({
      path: `pages/training-execute/index?week=${firstDay!.week}&day=${firstDay!.day}&cycleId=${cycleId}`,
    })
    await wait(1500)

    // 读取当前组的目标值与索引
    const state0 = await getTrainingState(mp)
    expect(state0).not.toBeNull()
    expect(state0!.exercises.length).toBeGreaterThan(0)

    const initialExerciseIdx = state0!.currentExerciseIndex
    const initialSetIdx = state0!.currentSetIndex
    const currentEx0 = state0!.exercises[initialExerciseIdx]
    expect(currentEx0).toBeDefined()
    const currentSet0 = currentEx0!.sets[initialSetIdx]
    expect(currentSet0).toBeDefined()
    const initialSetCount = currentEx0!.sets.length

    // 输入实际重量 80kg
    const page = await getCurrentPage(mp)
    const weightInput = await page.$('.weight-input')
    await weightInput.input('80')
    await wait(300)

    // 选择次数（点击第一个 rep 选项；若不存在则使用预填值）
    try {
      const repBtn = await page.$('.rep-btn')
      await repBtn.tap()
      await wait(200)
    } catch {
      // rep 按钮可能不存在（如 AMRAP 组），使用预填 _inputReps 即可
    }

    // 点击"完成本组"
    const completeBtn = await page.$('.complete-set-btn')
    await completeBtn.tap()
    await wait(500)

    // 断言当前组标记完成，actualWeight = 80
    const state1 = await getTrainingState(mp)
    expect(state1).not.toBeNull()

    const completedSet = state1!.exercises[initialExerciseIdx]?.sets[initialSetIdx]
    expect(completedSet).toBeDefined()
    expect(completedSet!.isCompleted).toBe(true)
    expect(completedSet!.actualWeight).toBe(80)

    // 断言前进到下一组（setIndex 递增，或末组时 exerciseIndex 递增）
    const advancedBySet =
      state1!.currentExerciseIndex === initialExerciseIdx &&
      state1!.currentSetIndex > initialSetIdx
    const advancedByExercise =
      state1!.currentExerciseIndex > initialExerciseIdx
    const isLastSetOfExercise = initialSetIdx === initialSetCount - 1
    const advanced = isLastSetOfExercise ? advancedByExercise : advancedBySet
    expect(advanced).toBe(true)

    // 断言下一组的目标值已预填到表单
    const nextEx = state1!.exercises[state1!.currentExerciseIndex]
    expect(nextEx).toBeDefined()
    const nextSet = nextEx!.sets[state1!.currentSetIndex]
    expect(nextSet).toBeDefined()
    if (nextSet!.targetWeight != null) {
      expect(state1!.inputWeight).toBe(nextSet!.targetWeight)
    }
    expect(state1!.inputWeightStr).toBe(String(state1!.inputWeight))
  })

  // ── SubTask 10.5: 模态二次确认 ──
  it('模态二次确认：终止周期弹出 showModal，取消不执行，确认执行', async () => {
    const mp = automator!.miniProgram

    // 创建周期（cycle 页需要活跃周期才显示终止按钮）
    const cycleId = await createCycleViaEvaluate(mp)
    expect(cycleId).toBeTruthy()

    // 导航到周期管理页
    await mp.relaunch({ path: 'pages/cycle/index' })
    await wait(1000)

    await overrideWxMethod(mp, 'showModal')
    try {
      const page = await getCurrentPage(mp)
      const terminateBtn = await page.$('.terminate-btn')

      // 第一次点击：默认 modal 返回 cancel=true（取消）
      await terminateBtn.tap()
      await wait(500)

      // 断言 wx.showModal 被调用，且参数完整（标题/内容/确认/取消按钮）
      const calls = await getCapturedCalls(mp, 'showModal')
      expect(calls.length).toBeGreaterThanOrEqual(1)
      const modalOpts = calls[0]
      expect(modalOpts.title).toBeTruthy()
      expect(modalOpts.title!.length).toBeGreaterThan(0)
      expect(modalOpts.content).toBeTruthy()
      expect(modalOpts.content!.length).toBeGreaterThan(0)
      expect(modalOpts.confirmText).toBeTruthy()
      expect(modalOpts.cancelText).toBeTruthy()

      // 取消时不执行操作：周期状态不变（非 terminated）
      const statusAfterCancel = await getLastCycleStatus(mp)
      expect(statusAfterCancel).not.toBeNull()
      expect(statusAfterCancel!.status).not.toBe('terminated')

      // 设置 modal 返回 confirm=true，再次点击终止按钮
      await setShowModalResult(mp, true)
      await terminateBtn.tap()
      await wait(500)

      // 确认时执行操作：周期状态变为 terminated
      const statusAfterConfirm = await getLastCycleStatus(mp)
      expect(statusAfterConfirm).not.toBeNull()
      expect(statusAfterConfirm!.status).toBe('terminated')
    } finally {
      await restoreWxMethod(mp, 'showModal')
    }
  })

  // ── SubTask 10.6: 滑动返回 ──
  it('滑动返回：从非 tab 页返回上一页，对应 H5 浏览器返回', async () => {
    const mp = automator!.miniProgram

    // 从今日页导航到开始训练页（非 tab 页）
    await mp.relaunch({ path: 'pages/today/index' })
    await wait(800)

    await mp.navigateTo('/pages/start/index')
    await wait(800)
    const pathBefore = await getCurrentPath(mp)
    expect(pathBefore).toBe('pages/start/index')

    // 模拟滑动返回：调用 wx.navigateBack
    // 注：automator 无法可靠模拟从屏幕左边缘向右滑动的手势，回退到验证 wx.navigateBack 行为
    // 对应 H5 浏览器返回（history.back()），两者行为等价
    await mp.evaluate(`
      wx.navigateBack({ delta: 1 })
      return true
    `)
    await wait(800)

    const pathAfter = await getCurrentPath(mp)
    expect(pathAfter).toBe('pages/today/index')
  })

  // ── SubTask 10.7: 生命周期订阅 ──
  it('生命周期订阅：onLoad 订阅 store，onUnload 取消订阅，与 H5 onMounted/onUnmounted 一致', async () => {
    const mp = automator!.miniProgram

    // 先到设置页（tab），避免 today 页已订阅 cycleStore 干扰计数
    await mp.relaunch({ path: 'pages/settings/index' })
    await wait(800)

    // 拦截 cycleStore.subscribe（包装原始方法以计数）
    await overrideCycleStoreSubscribe(mp)
    try {
      // 导航到周期管理页（onLoad 中调用 cycleStore.subscribe）
      await mp.navigateTo('/pages/cycle/index')
      await wait(1000)

      // 断言 subscribe 被调用（onLoad 触发，对应 H5 onMounted）
      const counters1 = await getSubscribeCounters(mp)
      expect(counters1.subscribeCalls).toBeGreaterThanOrEqual(1)

      // 读取页面数据（无活跃周期 → hasActiveCycle = false）
      const page = await getCurrentPage(mp)
      const data0 = await page.data<{ hasActiveCycle: boolean }>()
      expect(data0.hasActiveCycle).toBe(false)

      // 触发 store 变化（添加周期 → notify → 订阅回调 → recompute → setData）
      await createCycleViaEvaluate(mp)
      await wait(800)

      // 断言订阅回调被调用（store.notify 触发）
      const counters2 = await getSubscribeCounters(mp)
      expect(counters2.notifyCalls).toBeGreaterThanOrEqual(1)

      // 断言页面数据更新（hasActiveCycle → true，对应 H5 Pinia 响应式刷新）
      const data1 = await page.data<{ hasActiveCycle: boolean }>()
      expect(data1.hasActiveCycle).toBe(true)

      // 返回（触发 onUnload → 取消订阅，对应 H5 onUnmounted）
      await mp.navigateBack()
      await wait(800)

      // 断言 unsubscribe 被调用
      const counters3 = await getSubscribeCounters(mp)
      expect(counters3.unsubscribeCalls).toBeGreaterThanOrEqual(1)
    } finally {
      await restoreCycleStoreSubscribe(mp)
    }
  })
})
