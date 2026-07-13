// cloud-storage.e2e.ts — 云端存储（CloudStorageAdapter + CloudBase）端到端测试
//
// 覆盖 Task 7 全部用例：
//   7.1 CloudBase 未初始化时调用抛错
//   7.2 初始化后正常调用
//   7.3 接口契约 - get/set/remove/list/clear
//   7.4 app_data 文档结构
//   7.5 openid 隔离
//   7.6 网络错误降级
//   7.7 与本地存储数据等价
//
// 约定：
//   - 所有云端写入均通过 wrapKey() 加测试命名空间前缀，避免污染真实数据
//   - 永不调用 CloudStorageAdapter.clear() 无前缀形式（会清空用户全部 app_data）；
//     需要清空测试命名空间时使用 clear(wrapKey('')) 或 cleanupCloudNamespace
//   - automator 在沙箱环境可能为 null，所有用例需优雅跳过（early return）
//   - evaluate 内 require 路径相对小程序根目录（与 setup/cloudbase.ts、reset.ts 一致）

import {
  initCloudBase,
  cleanupCloudNamespace,
  wrapKey
} from '../setup/cloudbase'
import { loadFixture } from '../setup/fixtures'

/** app_data collection 原始文档结构（CloudBase 安全规则自动注入 _openid） */
interface AppDataRawDoc {
  _id: string | number
  key: string
  value: unknown
  _openid: string
}

/** H5 导出样本 fixture 的最小结构（仅声明用例访问的字段） */
interface H5ExportSample {
  version: string
  checksum: string
  data: {
    cycles: unknown[]
    records: Record<string, unknown[]>
    bodyMetrics: unknown[]
    settings: {
      defaultUnit: string
      defaultRestSeconds: number
      weightRounding: number
      reminderEnabled: boolean
      reminderTime: string
    }
  }
}

/** 获取已启动的 automator；沙箱未装开发者工具时返回 null */
function getAutomator(): Automator | null {
  const auto =
    typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ : null
  return auto
}

describe('云端存储 E2E - CloudStorageAdapter + CloudBase', () => {
  afterEach(async () => {
    // 每个用例后清理云端测试命名空间，保证用例之间互不影响
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await cleanupCloudNamespace(automator).catch(() => {
      // 清理失败不阻断后续用例
    })
  })

  // 7.1 CloudBase 未初始化时调用抛错
  it('CloudBase 未初始化时调用抛错', async () => {
    const automator = getAutomator()
    if (!automator) {
      // 沙箱环境未启动 automator，优雅跳过
      return
    }
    const key = wrapKey('uninit_foo')
    const result = await automator.miniProgram.evaluate<{
      threw: boolean
      message: string
    }>(`
      var key = ${JSON.stringify(key)}
      try {
        var mod = require('utils/storage/CloudStorageAdapter')
        mod.setCloudInitialized(false)
        var adapter = new mod.CloudStorageAdapter()
        await adapter.get(key)
        return { threw: false, message: '' }
      } catch (e) {
        return { threw: true, message: (e && e.message) ? e.message : String(e) }
      }
    `)
    expect(result.threw).toBe(true)
    expect(result.message.startsWith('CloudBase 未初始化')).toBe(true)
  })

  // 7.2 初始化后正常调用
  it('初始化后正常调用', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const key = wrapKey('nonexistent')
    const result = await automator.miniProgram.evaluate<{
      initialized: boolean
      getValue: unknown
    }>(`
      var key = ${JSON.stringify(key)}
      var mod = require('utils/storage/CloudStorageAdapter')
      var initialized = mod.isCloudInitialized()
      var adapter = new mod.CloudStorageAdapter()
      var val = await adapter.get(key)
      return { initialized: initialized, getValue: val }
    `)
    expect(result.initialized).toBe(true)
    expect(result.getValue).toBeNull()
  })

  // 7.3 接口契约 - get/set/remove/list/clear
  it('接口契约 - get/set/remove/list/clear', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const k1 = wrapKey('contract_a')
    const k2 = wrapKey('contract_b')
    const prefix = wrapKey('contract_')
    // 测试命名空间前缀（wrapKey('') === getTestPrefix()），用于安全地清除全部测试 key
    const nsPrefix = wrapKey('')
    const result = await automator.miniProgram.evaluate<{
      getMissing: unknown
      getAfterSet: unknown
      getAfterUpdate: unknown
      listAfterSet: string[]
      getAfterRemove: unknown
      listAfterRemove: string[]
      listAfterClearPrefix: string[]
      listAfterClearNs: string[]
    }>(`
      var k1 = ${JSON.stringify(k1)}
      var k2 = ${JSON.stringify(k2)}
      var prefix = ${JSON.stringify(prefix)}
      var nsPrefix = ${JSON.stringify(nsPrefix)}
      var mod = require('utils/storage/CloudStorageAdapter')
      var adapter = new mod.CloudStorageAdapter()
      var r = {}
      // get 不存在返回 null
      r.getMissing = await adapter.get(k1)
      // set 后 get 返回原值
      await adapter.set(k1, { v: 1 })
      r.getAfterSet = await adapter.get(k1)
      // set 已存在 key 覆盖（upsert 行为）
      await adapter.set(k1, { v: 2 })
      r.getAfterUpdate = await adapter.get(k1)
      // set 第二个 key
      await adapter.set(k2, 'hello')
      // list(prefix) 使用 db.RegExp 前缀匹配返回 key 列表
      r.listAfterSet = (await adapter.list(prefix)).slice().sort()
      // remove 后 get 返回 null
      await adapter.remove(k1)
      r.getAfterRemove = await adapter.get(k1)
      r.listAfterRemove = (await adapter.list(prefix)).slice().sort()
      // clear(prefix) 仅清除匹配前缀的 key
      await adapter.clear(prefix)
      r.listAfterClearPrefix = await adapter.list(prefix)
      // clear(测试命名空间前缀) 清除所有测试 key —— 不调用无前缀 clear()，
      // 以免清空用户 app_data 中非测试命名空间的文档
      await adapter.clear(nsPrefix)
      r.listAfterClearNs = await adapter.list(nsPrefix)
      return r
    `)
    expect(result.getMissing).toBeNull()
    expect(result.getAfterSet).toEqual({ v: 1 })
    expect(result.getAfterUpdate).toEqual({ v: 2 })
    expect(result.listAfterSet).toEqual([k1, k2].sort())
    expect(result.getAfterRemove).toBeNull()
    expect(result.listAfterRemove).toEqual([k2])
    expect(result.listAfterClearPrefix).toEqual([])
    expect(result.listAfterClearNs).toEqual([])
  })

  // 7.4 app_data 文档结构
  it('app_data 文档结构', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const key = wrapKey('doc_struct')
    const value = { hello: 'world', n: 42 }
    const result = await automator.miniProgram.evaluate<{
      doc: AppDataRawDoc | null
    }>(`
      var key = ${JSON.stringify(key)}
      var value = ${JSON.stringify(value)}
      var mod = require('utils/storage/CloudStorageAdapter')
      var adapter = new mod.CloudStorageAdapter()
      await adapter.set(key, value)
      var db = wx.cloud.database()
      var res = await db.collection('app_data').where({ key: key }).limit(1).get()
      var doc = (res.data && res.data.length > 0) ? res.data[0] : null
      return { doc: doc }
    `)
    expect(result.doc).not.toBeNull()
    expect(result.doc).toHaveProperty('_id')
    expect(result.doc).toHaveProperty('key', key)
    expect(result.doc).toHaveProperty('value')
    expect(result.doc!.value).toEqual(value)
    // _openid 由 CloudBase 安全规则自动注入，应存在且为字符串
    expect(result.doc).toHaveProperty('_openid')
    expect(typeof result.doc!._openid).toBe('string')
    expect(result.doc!._openid.length > 0).toBe(true)
  })

  // 7.5 openid 隔离
  describe('openid 隔离', () => {
    it('openid 在多次写入中保持一致且非空', async () => {
      const automator = getAutomator()
      if (!automator) {
        return
      }
      await initCloudBase(automator)
      const k1 = wrapKey('openid_a')
      const k2 = wrapKey('openid_b')
      const result = await automator.miniProgram.evaluate<{
        openid1: string
        openid2: string
      }>(`
        var k1 = ${JSON.stringify(k1)}
        var k2 = ${JSON.stringify(k2)}
        var mod = require('utils/storage/CloudStorageAdapter')
        var adapter = new mod.CloudStorageAdapter()
        await adapter.set(k1, 1)
        await adapter.set(k2, 2)
        var db = wx.cloud.database()
        var r1 = await db.collection('app_data').where({ key: k1 }).limit(1).get()
        var r2 = await db.collection('app_data').where({ key: k2 }).limit(1).get()
        var o1 = (r1.data && r1.data[0]) ? r1.data[0]._openid : ''
        var o2 = (r2.data && r2.data[0]) ? r2.data[0]._openid : ''
        return { openid1: o1, openid2: o2 }
      `)
      expect(typeof result.openid1).toBe('string')
      expect(result.openid1.length > 0).toBe(true)
      // 同一用户多次写入，_openid 应一致
      expect(result.openid1).toBe(result.openid2)
    })

    // 真正的跨用户隔离需要两个真实测试账号：账号 A 写入后切换到账号 B 读取，
    // 断言 B 读不到 A 的数据。单账号测试环境无法验证，故 skip。
    // 启用方式：配置第二个测试账号登录态（如独立 automator 会话 / TEST_ACCOUNT_B_OPENID），
    // 在 A 写入 wrapKey('cross_user') 后，于 B 会话读取同一 key，断言返回 null。
    // 参考 spec SubTask 7.5 / 13.3。
    it.skip('跨用户数据不可见（需两个测试账号）', async () => {
      const automator = getAutomator()
      if (!automator) {
        return
      }
      await initCloudBase(automator)
      const key = wrapKey('cross_user')
      // 账号 A 写入
      await automator.miniProgram.evaluate(`
        var key = ${JSON.stringify(key)}
        var mod = require('utils/storage/CloudStorageAdapter')
        var adapter = new mod.CloudStorageAdapter()
        await adapter.set(key, { owner: 'A' })
        return true
      `)
      // TODO（需账号 B 会话）：
      //   const fromB = await accountB.miniProgram.evaluate(`
      //     var key = ${JSON.stringify(key)}
      //     var mod = require('utils/storage/CloudStorageAdapter')
      //     var adapter = new mod.CloudStorageAdapter()
      //     return await adapter.get(key)
      //   `)
      //   expect(fromB).toBeNull()
    })
  })

  // 7.6 网络错误降级
  it('网络错误降级', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const key = wrapKey('degrade_key')
    const result = await automator.miniProgram.evaluate<{
      getValue: unknown
      listValue: string[]
      setThrew: boolean
      setErrMsg: string
    }>(`
      var key = ${JSON.stringify(key)}
      var mod = require('utils/storage/CloudStorageAdapter')
      mod.setCloudInitialized(true)
      var adapter = new mod.CloudStorageAdapter()
      // 保存原始 wx.cloud.database，mock 网络错误后必须在 finally 中恢复
      var origDatabase = wx.cloud.database
      var r = {}
      try {
        wx.cloud.database = function() { throw new Error('mock network error') }
        // get/list 失败降级：返回 null / []，不抛错
        r.getValue = await adapter.get(key)
        r.listValue = await adapter.list(key)
        // set 失败上抛，由调用方 catch
        r.setThrew = false
        r.setErrMsg = ''
        try {
          await adapter.set(key, 'v')
        } catch (e) {
          r.setThrew = true
          r.setErrMsg = (e && e.message) ? e.message : String(e)
        }
      } finally {
        // 恢复原始实现，避免影响后续用例
        wx.cloud.database = origDatabase
      }
      return r
    `)
    expect(result.getValue).toBeNull()
    expect(result.listValue).toEqual([])
    expect(result.setThrew).toBe(true)
    expect(result.setErrMsg.length > 0).toBe(true)
  })

  // 7.7 与本地存储数据等价
  it('与本地存储数据等价', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const fixture = loadFixture<H5ExportSample>('h5-export-sample')
    const payload = fixture.data
    const key = wrapKey('equiv_sample')
    const result = await automator.miniProgram.evaluate<{
      fromCloud: unknown
      fromLocal: unknown
    }>(`
      var key = ${JSON.stringify(key)}
      var payload = ${JSON.stringify(payload)}
      var cloudMod = require('utils/storage/CloudStorageAdapter')
      var localMod = require('utils/storage/LocalStorageAdapter')
      var cloud = new cloudMod.CloudStorageAdapter()
      var local = new localMod.LocalStorageAdapter()
      await cloud.set(key, payload)
      await local.set(key, payload)
      var fromCloud = await cloud.get(key)
      var fromLocal = await local.get(key)
      return { fromCloud: fromCloud, fromLocal: fromLocal }
    `)
    expect(result.fromLocal).toEqual(payload)
    expect(result.fromCloud).toEqual(payload)
    // 两个 adapter 对同一份数据读写结果应完全一致（仅存储位置不同）
    expect(result.fromCloud).toEqual(result.fromLocal)
  })
})
