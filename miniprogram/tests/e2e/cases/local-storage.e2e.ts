// local-storage.e2e.ts — 本地存储端到端测试
//
// 通过 miniprogram-automator 在小程序运行时驱动 LocalStorageAdapter / stores，
// 验证：
//   1) 接口契约（get/set/remove/list/clear）
//   2) 类型保持（对象/数组/原始类型）
//   3) 5 类 storage key 命名保真（candito_cycles / candito_active_cycle /
//      candito_records_<cycleId> / candito_metrics / candito_settings）
//   4) JSON 结构保真（cycle / settings 全字段）
//   5) H5 导出 → 小程序本地存储读取
//   6) 小程序本地存储 → H5 读取反向兼容
//   7) 本地存储数据流转（创建周期 / 修改设置 → 重启 → 状态恢复）
//
// 当 automator 不可用（沙箱环境未装微信开发者工具）时，整体 describe 块 skip。
// 所有 mini program runtime 代码通过 automator.miniProgram.evaluate() 执行，
// 不能直接 import TS 模块——使用 require() 相对小程序根目录的路径（无 .js 后缀）。

import { getAutomator, wrapKey, loadFixture } from '../setup'

// ---------- 本地类型定义 ----------
//
// 仅声明用例实际访问的字段；结构上与 miniprogram/types/*.ts 兼容，但定义在本地
// 以避免引入 e2e 工程外的源文件触发 rootDir 冲突（tsconfig 的 include 仅覆盖 e2e/）。

interface CycleOneRM {
  squat: number
  bench: number
  deadlift: number
}

interface CycleAssistanceConfig {
  horizontalPull: string
  shoulder: string
  verticalPull: string
  optional1?: string
  optional2?: string
}

interface CycleLike {
  id: string
  name: string
  startDate: string
  status: string
  unit: string
  weightRounding: number
  isPaused: boolean
  createdAt: string
  oneRM: CycleOneRM
  assistanceConfig: CycleAssistanceConfig
  weeks: unknown[]
  pauseHistory: unknown[]
  restartBranches: unknown[]
  batchProcessHistory: unknown[]
}

interface WorkoutRecordLike {
  id: string
  cycleId: string
  feeling: number
}

interface BodyMetricLike {
  id: string
  weight: number
}

interface UserSettingsLike {
  defaultUnit: string
  defaultRestSeconds: number
  weightRounding: number
  reminderEnabled: boolean
  reminderTime?: string
  storageMode: string
}

// ---------- fixtures 类型 ----------

interface H5ExportData {
  cycles: CycleLike[]
  records: Record<string, WorkoutRecordLike[]>
  bodyMetrics: BodyMetricLike[]
  settings: Partial<UserSettingsLike>
}

interface H5ExportFixture {
  version: string
  exportedAt: string
  checksum: string
  data: H5ExportData
}

// ---------- automator 可用性判定 ----------
//
// getAutomator() 读取 setup/automator.ts 模块级缓存；若 globalSetup 未传播模块缓存，
// 回退到 globalThis.__AUTOMATOR__（由 global-setup.ts 写入）。
// 两者均空（沙箱场景）时整体 skip。

const automator: Automator | null =
  getAutomator() ??
  (typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ : null)

const describeOrSkip = automator ? describe : describe.skip

// ---------- 辅助：在 mini program runtime 执行脚本 ----------

/**
 * 调用 automator.miniProgram.evaluate<T> 执行脚本。
 * automator 已由 describeOrSkip 保证非空，但为类型安全显式断言。
 */
async function evaluate<T>(script: string): Promise<T> {
  const auto = automator
  if (!auto) {
    throw new Error('automator 不可用')
  }
  return await auto.miniProgram.evaluate<T>(script)
}

/**
 * 重新启动小程序到指定页面（模拟重启）。
 */
async function relaunch(path: string): Promise<void> {
  const auto = automator
  if (!auto) {
    throw new Error('automator 不可用')
  }
  await auto.miniProgram.relaunch({ path })
}

// ---------- 用例 ----------

describeOrSkip('LocalStorageAdapter E2E', () => {
  // ============================================================
  // SubTask 6.1: 接口契约 - get/set/remove/list/clear
  // ============================================================
  describe('LocalStorageAdapter 接口契约 - get/set/remove/list/clear', () => {
    it('get 不存在的 key 返回 null', async () => {
      const key = wrapKey('local-test-non-existent')
      const result = await evaluate<null>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        return await adapter.get(${JSON.stringify(key)})
      `)
      expect(result).toBeNull()
    })

    it('set 后 get 返回原值', async () => {
      const key = wrapKey('local-test-set-get')
      const result = await evaluate<{ foo: string; n: number } | null>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(key)}, { foo: 'bar', n: 42 })
        return await adapter.get(${JSON.stringify(key)})
      `)
      expect(result).toEqual({ foo: 'bar', n: 42 })
    })

    it('remove 后 get 返回 null', async () => {
      const key = wrapKey('local-test-remove')
      const result = await evaluate<unknown>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(key)}, 'value')
        await adapter.remove(${JSON.stringify(key)})
        return await adapter.get(${JSON.stringify(key)})
      `)
      expect(result).toBeNull()
    })

    it('list(prefix) 返回匹配前缀的 key 列表', async () => {
      const prefix = wrapKey('local-test-list-')
      const otherKey = wrapKey('local-test-other') + '-x'
      const result = await evaluate<string[]>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(prefix + 'a')}, 1)
        await adapter.set(${JSON.stringify(prefix + 'b')}, 2)
        await adapter.set(${JSON.stringify(prefix + 'c')}, 3)
        await adapter.set(${JSON.stringify(otherKey)}, 0)
        var keys = await adapter.list(${JSON.stringify(prefix)})
        keys.sort()
        return keys
      `)
      expect(result).toEqual([prefix + 'a', prefix + 'b', prefix + 'c'])
    })

    it('clear(prefix) 仅清除匹配前缀的 key', async () => {
      const prefix = wrapKey('local-test-clear-')
      const keepPrefix = wrapKey('local-test-keep-')
      const result = await evaluate<{ cleared: string[]; kept: string[] }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(prefix + 'a')}, 1)
        await adapter.set(${JSON.stringify(prefix + 'b')}, 2)
        await adapter.set(${JSON.stringify(keepPrefix + 'x')}, 9)
        await adapter.clear(${JSON.stringify(prefix)})
        var cleared = await adapter.list(${JSON.stringify(prefix)})
        var kept = await adapter.list(${JSON.stringify(keepPrefix)})
        return { cleared: cleared, kept: kept }
      `)
      expect(result.cleared).toEqual([])
      expect(result.kept).toEqual([keepPrefix + 'x'])
    })

    it('clear() 无 prefix 清除全部', async () => {
      const prefix = wrapKey('local-test-clearall-')
      const result = await evaluate<{ before: string[]; after: string[] }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(prefix + 'a')}, 1)
        await adapter.set(${JSON.stringify(prefix + 'b')}, 2)
        var before = await adapter.list(${JSON.stringify(prefix)})
        before.sort()
        await adapter.clear()
        var after = await adapter.list(${JSON.stringify(prefix)})
        return { before: before, after: after }
      `)
      expect(result.before).toEqual([prefix + 'a', prefix + 'b'])
      expect(result.after).toEqual([])
    })
  })

  // ============================================================
  // SubTask 6.2: 类型保持 - 写入对象/数组/数字/字符串/布尔
  // ============================================================
  describe('类型保持 - 写入对象/数组/数字/字符串/布尔', () => {
    it('写入对象读取后结构与类型保持', async () => {
      const key = wrapKey('local-test-type-obj')
      const result = await evaluate<{ value: unknown; type: string }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        var v = { a: 1, b: 'two', c: true, d: [1, 2, 3] }
        await adapter.set(${JSON.stringify(key)}, v)
        var got = await adapter.get(${JSON.stringify(key)})
        return { value: got, type: Object.prototype.toString.call(got) }
      `)
      expect(result.type).toBe('[object Object]')
      expect(result.value).toEqual({ a: 1, b: 'two', c: true, d: [1, 2, 3] })
    })

    it('写入数组读取后类型与值保持', async () => {
      const key = wrapKey('local-test-type-arr')
      const result = await evaluate<{ value: unknown; type: string }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        var v = [1, 'two', false, { x: 1 }]
        await adapter.set(${JSON.stringify(key)}, v)
        var got = await adapter.get(${JSON.stringify(key)})
        return { value: got, type: Object.prototype.toString.call(got) }
      `)
      expect(result.type).toBe('[object Array]')
      expect(result.value).toEqual([1, 'two', false, { x: 1 }])
    })

    it('写入数字读取后类型与值保持', async () => {
      const key = wrapKey('local-test-type-num')
      const result = await evaluate<{ value: unknown; type: string }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(key)}, 42.5)
        var got = await adapter.get(${JSON.stringify(key)})
        return { value: got, type: typeof got }
      `)
      expect(result.type).toBe('number')
      expect(result.value).toBe(42.5)
    })

    it('写入字符串读取后类型与值保持', async () => {
      const key = wrapKey('local-test-type-str')
      const result = await evaluate<{ value: unknown; type: string }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(key)}, 'hello world')
        var got = await adapter.get(${JSON.stringify(key)})
        return { value: got, type: typeof got }
      `)
      expect(result.type).toBe('string')
      expect(result.value).toBe('hello world')
    })

    it('写入布尔读取后类型与值保持', async () => {
      const key = wrapKey('local-test-type-bool')
      const result = await evaluate<{ value: unknown; type: string }>(`
        var mod = require('utils/storage/LocalStorageAdapter')
        var adapter = new mod.LocalStorageAdapter()
        await adapter.set(${JSON.stringify(key)}, true)
        var got = await adapter.get(${JSON.stringify(key)})
        return { value: got, type: typeof got }
      `)
      expect(result.type).toBe('boolean')
      expect(result.value).toBe(true)
    })
  })

  // ============================================================
  // SubTask 6.3: 5 类 storage key 命名保真
  // ============================================================
  describe('5 类 storage key 命名保真', () => {
    it('cycleStore.addCycle 写入 candito_cycles', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const cycle = fixture.data.cycles[0]
      const cycleJson = JSON.stringify(cycle)
      const result = await evaluate<string[]>(`
        var mod = require('stores/cycleStore')
        mod.cycleStore.addCycle(${cycleJson})
        await mod.cycleStore.save()
        return wx.getStorageInfoSync().keys
      `)
      expect(result).toContain('candito_cycles')
    })

    it('recordStore.addRecord 写入 candito_records_<cycleId>', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const record = fixture.data.records['test-cycle-001'][0]
      const recordJson = JSON.stringify(record)
      const expectedKey = 'candito_records_' + record.cycleId
      const result = await evaluate<string[]>(`
        var mod = require('stores/recordStore')
        await mod.recordStore.addRecord(${recordJson})
        return wx.getStorageInfoSync().keys
      `)
      expect(result).toContain(expectedKey)
    })

    it('bodyMetricStore.addMetric 写入 candito_metrics', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const metric = fixture.data.bodyMetrics[0]
      const metricJson = JSON.stringify(metric)
      const result = await evaluate<string[]>(`
        var mod = require('stores/bodyMetricStore')
        mod.bodyMetricStore.addMetric(${metricJson})
        await mod.bodyMetricStore.save()
        return wx.getStorageInfoSync().keys
      `)
      expect(result).toContain('candito_metrics')
    })

    it('settingsStore.update 写入 candito_settings', async () => {
      const result = await evaluate<string[]>(`
        var mod = require('stores/settingsStore')
        mod.settingsStore.update({ defaultUnit: 'kg' })
        await mod.settingsStore.save()
        return wx.getStorageInfoSync().keys
      `)
      expect(result).toContain('candito_settings')
    })

    it('cycleStore.setActiveCycle 写入 candito_active_cycle', async () => {
      const result = await evaluate<string[]>(`
        var mod = require('stores/cycleStore')
        mod.cycleStore.setActiveCycle('test-cycle-id')
        await mod.cycleStore.save()
        return wx.getStorageInfoSync().keys
      `)
      expect(result).toContain('candito_active_cycle')
    })
  })

  // ============================================================
  // SubTask 6.4: JSON 结构保真
  // ============================================================
  describe('JSON 结构保真', () => {
    it('Cycle JSON 含全部必填字段（weeks/pauseHistory/restartBranches/batchProcessHistory/oneRM/...）', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const cycle = fixture.data.cycles[0]
      const cycleJson = JSON.stringify(cycle)
      const result = await evaluate<{
        weeksLen: number
        hasPauseHistory: boolean
        hasRestartBranches: boolean
        hasBatchProcessHistory: boolean
        oneRM: { squat: number; bench: number; deadlift: number }
        unit: string
        weightRounding: number
        assistanceConfig: {
          horizontalPull: string
          shoulder: string
          verticalPull: string
        }
        status: string
        isPaused: boolean
        createdAt: string
        id: string
        name: string
        startDate: string
      }>(`
        var mod = require('stores/cycleStore')
        mod.cycleStore.addCycle(${cycleJson})
        await mod.cycleStore.save()
        var raw = wx.getStorageSync('candito_cycles')
        var c = Array.isArray(raw) ? raw[0] : raw
        return {
          weeksLen: c.weeks.length,
          hasPauseHistory: Array.isArray(c.pauseHistory),
          hasRestartBranches: Array.isArray(c.restartBranches),
          hasBatchProcessHistory: Array.isArray(c.batchProcessHistory),
          oneRM: c.oneRM,
          unit: c.unit,
          weightRounding: c.weightRounding,
          assistanceConfig: c.assistanceConfig,
          status: c.status,
          isPaused: c.isPaused,
          createdAt: c.createdAt,
          id: c.id,
          name: c.name,
          startDate: c.startDate
        }
      `)
      expect(result.weeksLen).toBe(6)
      expect(result.hasPauseHistory).toBe(true)
      expect(result.hasRestartBranches).toBe(true)
      expect(result.hasBatchProcessHistory).toBe(true)
      expect(result.oneRM).toEqual({ squat: 100, bench: 85, deadlift: 120 })
      expect(result.unit).toBe('kg')
      expect(result.weightRounding).toBe(2.5)
      expect(result.assistanceConfig).toEqual({
        horizontalPull: '哑铃划船',
        shoulder: '坐姿哑铃推举',
        verticalPull: '负重引体向上'
      })
      expect(result.status).toBe('active')
      expect(result.isPaused).toBe(false)
      expect(result.createdAt).toBe('2026-07-13T00:00:00.000Z')
      expect(result.id).toBe('test-cycle-001')
      expect(result.name).toBe('测试周期')
      expect(result.startDate).toBe('2026-07-13')
    })

    it('Settings JSON 含全部必填字段（defaultUnit/defaultRestSeconds/weightRounding/reminderEnabled/reminderTime）', async () => {
      const result = await evaluate<{
        defaultUnit: string
        defaultRestSeconds: number
        weightRounding: number
        reminderEnabled: boolean
        reminderTime: string
      }>(`
        var mod = require('stores/settingsStore')
        mod.settingsStore.update({ reminderEnabled: true, reminderTime: '08:00' })
        await mod.settingsStore.save()
        var raw = wx.getStorageSync('candito_settings')
        return {
          defaultUnit: raw.defaultUnit,
          defaultRestSeconds: raw.defaultRestSeconds,
          weightRounding: raw.weightRounding,
          reminderEnabled: raw.reminderEnabled,
          reminderTime: raw.reminderTime
        }
      `)
      expect(result.defaultUnit).toBe('kg')
      expect(result.defaultRestSeconds).toBe(90)
      expect(result.weightRounding).toBe(2.5)
      expect(result.reminderEnabled).toBe(true)
      expect(result.reminderTime).toBe('08:00')
    })
  })

  // ============================================================
  // SubTask 6.5: H5 导出 → 小程序本地存储读取
  // ============================================================
  describe('H5 导出 → 小程序本地存储读取', () => {
    it('逐项写入后各 store 读取字段与 H5 一致', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const cycle = fixture.data.cycles[0]
      const records = fixture.data.records['test-cycle-001']
      const metric = fixture.data.bodyMetrics[0]
      const settings = fixture.data.settings

      const cycleJson = JSON.stringify(cycle)
      const recordsJson = JSON.stringify(records)
      const metricJson = JSON.stringify(metric)
      const settingsJson = JSON.stringify(settings)

      const result = await evaluate<{
        cycleId: string
        cycleName: string
        cycleWeeks: number
        cycleOneRM: { squat: number; bench: number; deadlift: number }
        recordsCount: number
        firstRecordId: string
        firstRecordFeeling: number
        metricId: string
        metricWeight: number
        settingsUnit: string
        settingsReminderEnabled: boolean
      }>(`
        var cycleMod = require('stores/cycleStore')
        var recordMod = require('stores/recordStore')
        var metricMod = require('stores/bodyMetricStore')
        var settingsMod = require('stores/settingsStore')
        var adapterMod = require('utils/storage/LocalStorageAdapter')
        var adapter = new adapterMod.LocalStorageAdapter()

        var cycle = ${cycleJson}
        var records = ${recordsJson}
        var metric = ${metricJson}
        var settings = ${settingsJson}

        cycleMod.cycleStore.addCycle(cycle)
        await cycleMod.cycleStore.save()
        await adapter.set('candito_records_' + cycle.id, records)
        metricMod.bodyMetricStore.addMetric(metric)
        await metricMod.bodyMetricStore.save()
        settingsMod.settingsStore.update(settings)
        await settingsMod.settingsStore.save()

        var cycleGot = cycleMod.cycleStore.getCycles()[0]
        var recordsGot = await adapter.get('candito_records_' + cycle.id)
        var metricGot = metricMod.bodyMetricStore.getMetrics()[0]
        var settingsGot = settingsMod.settingsStore.getSettings()

        return {
          cycleId: cycleGot.id,
          cycleName: cycleGot.name,
          cycleWeeks: cycleGot.weeks.length,
          cycleOneRM: cycleGot.oneRM,
          recordsCount: recordsGot.length,
          firstRecordId: recordsGot[0].id,
          firstRecordFeeling: recordsGot[0].feeling,
          metricId: metricGot.id,
          metricWeight: metricGot.weight,
          settingsUnit: settingsGot.defaultUnit,
          settingsReminderEnabled: settingsGot.reminderEnabled
        }
      `)
      expect(result.cycleId).toBe(cycle.id)
      expect(result.cycleName).toBe(cycle.name)
      expect(result.cycleWeeks).toBe(cycle.weeks.length)
      expect(result.cycleOneRM).toEqual(cycle.oneRM)
      expect(result.recordsCount).toBe(records.length)
      expect(result.firstRecordId).toBe(records[0].id)
      expect(result.firstRecordFeeling).toBe(records[0].feeling)
      expect(result.metricId).toBe(metric.id)
      expect(result.metricWeight).toBe(metric.weight)
      expect(result.settingsUnit).toBe(settings.defaultUnit)
      expect(result.settingsReminderEnabled).toBe(settings.reminderEnabled)
    })
  })

  // ============================================================
  // SubTask 6.6: 小程序本地存储 → H5 读取反向兼容
  // ============================================================
  describe('小程序本地存储 → H5 读取反向兼容', () => {
    it('小程序写入的 candito_cycles JSON 可被 H5 风格解析（字段一致）', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const cycle = fixture.data.cycles[0]
      const cycleJson = JSON.stringify(cycle)

      // 在小程序内通过 store 写入，然后导出原始 JSON 字符串
      const rawJson = await evaluate<string>(`
        var mod = require('stores/cycleStore')
        mod.cycleStore.addCycle(${cycleJson})
        await mod.cycleStore.save()
        var raw = wx.getStorageSync('candito_cycles')
        return JSON.stringify(raw)
      `)

      // 在 Node.js 侧（模拟 H5 读取）解析并断言
      const parsed: unknown = JSON.parse(rawJson)
      expect(Array.isArray(parsed)).toBe(true)
      const gotCycles = parsed as CycleLike[]
      expect(gotCycles.length).toBe(1)
      const gotCycle = gotCycles[0]
      expect(gotCycle.id).toBe(cycle.id)
      expect(gotCycle.name).toBe(cycle.name)
      expect(gotCycle.startDate).toBe(cycle.startDate)
      expect(gotCycle.status).toBe(cycle.status)
      expect(gotCycle.unit).toBe(cycle.unit)
      expect(gotCycle.weightRounding).toBe(cycle.weightRounding)
      expect(gotCycle.isPaused).toBe(cycle.isPaused)
      expect(gotCycle.createdAt).toBe(cycle.createdAt)
      expect(gotCycle.oneRM).toEqual(cycle.oneRM)
      expect(gotCycle.assistanceConfig).toEqual(cycle.assistanceConfig)
      expect(Array.isArray(gotCycle.weeks)).toBe(true)
      expect(gotCycle.weeks.length).toBe(6)
      expect(Array.isArray(gotCycle.pauseHistory)).toBe(true)
      expect(Array.isArray(gotCycle.restartBranches)).toBe(true)
      expect(Array.isArray(gotCycle.batchProcessHistory)).toBe(true)
    })

    it('小程序写入的 candito_settings JSON 可被 H5 风格解析（字段一致）', async () => {
      const rawJson = await evaluate<string>(`
        var mod = require('stores/settingsStore')
        mod.settingsStore.update({ reminderEnabled: true, reminderTime: '08:00', weightRounding: 2.5 })
        await mod.settingsStore.save()
        var raw = wx.getStorageSync('candito_settings')
        return JSON.stringify(raw)
      `)

      const parsed: unknown = JSON.parse(rawJson)
      expect(parsed).not.toBeNull()
      const gotSettings = parsed as UserSettingsLike
      expect(gotSettings.defaultUnit).toBe('kg')
      expect(gotSettings.defaultRestSeconds).toBe(90)
      expect(gotSettings.weightRounding).toBe(2.5)
      expect(gotSettings.reminderEnabled).toBe(true)
      expect(gotSettings.reminderTime).toBe('08:00')
      expect(gotSettings.storageMode).toBe('local')
    })
  })

  // ============================================================
  // SubTask 6.7: 本地存储数据流转
  // ============================================================
  describe('本地存储数据流转', () => {
    it('创建周期 / 修改设置后重新 load() 状态完整恢复', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const cycle = fixture.data.cycles[0]
      const cycleJson = JSON.stringify(cycle)

      // 1) 通过 store 写入周期与设置
      await evaluate(`
        var cycleMod = require('stores/cycleStore')
        var settingsMod = require('stores/settingsStore')
        cycleMod.cycleStore.addCycle(${cycleJson})
        await cycleMod.cycleStore.save()
        settingsMod.settingsStore.update({ defaultRestSeconds: 120 })
        await settingsMod.settingsStore.save()
        return true
      `)

      // 2) 重新从存储加载（模拟重启后 onLaunch 的 init）
      const result = await evaluate<{
        cycleCount: number
        cycleId: string
        activeCycleId: string | null
        restSeconds: number
      }>(`
        var cycleMod = require('stores/cycleStore')
        var settingsMod = require('stores/settingsStore')
        await cycleMod.cycleStore.load()
        await settingsMod.settingsStore.load()
        var cycles = cycleMod.cycleStore.getCycles()
        return {
          cycleCount: cycles.length,
          cycleId: cycles.length > 0 ? cycles[0].id : '',
          activeCycleId: cycleMod.cycleStore.getActiveCycleId(),
          restSeconds: settingsMod.settingsStore.getSettings().defaultRestSeconds
        }
      `)
      expect(result.cycleCount).toBe(1)
      expect(result.cycleId).toBe(cycle.id)
      expect(result.activeCycleId).toBe(cycle.id)
      expect(result.restSeconds).toBe(120)
    })

    it('relaunch 重启小程序后状态完整恢复', async () => {
      const fixture = loadFixture<H5ExportFixture>('h5-export-sample')
      const cycle = fixture.data.cycles[0]
      const cycleJson = JSON.stringify(cycle)

      // 1) 写入周期数据
      await evaluate(`
        var cycleMod = require('stores/cycleStore')
        var settingsMod = require('stores/settingsStore')
        cycleMod.cycleStore.addCycle(${cycleJson})
        await cycleMod.cycleStore.save()
        settingsMod.settingsStore.update({ defaultRestSeconds: 150 })
        await settingsMod.settingsStore.save()
        return true
      `)

      // 2) relaunch 到 start 页（触发 onLaunch 重新初始化）
      await relaunch('pages/start/index')

      // 3) 显式重新加载并断言（onLaunch 是 fire-and-forget，可能有延迟）
      const result = await evaluate<{
        cycleCount: number
        cycleId: string
        activeCycleId: string | null
        restSeconds: number
      }>(`
        var cycleMod = require('stores/cycleStore')
        var settingsMod = require('stores/settingsStore')
        await cycleMod.cycleStore.load()
        await settingsMod.settingsStore.load()
        var cycles = cycleMod.cycleStore.getCycles()
        return {
          cycleCount: cycles.length,
          cycleId: cycles.length > 0 ? cycles[0].id : '',
          activeCycleId: cycleMod.cycleStore.getActiveCycleId(),
          restSeconds: settingsMod.settingsStore.getSettings().defaultRestSeconds
        }
      `)
      expect(result.cycleCount).toBe(1)
      expect(result.cycleId).toBe(cycle.id)
      expect(result.activeCycleId).toBe(cycle.id)
      expect(result.restSeconds).toBe(150)
    })
  })
})
