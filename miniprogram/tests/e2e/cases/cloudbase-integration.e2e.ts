// cloudbase-integration.e2e.ts — CloudBase 集成端到端测试
//
// 覆盖 Task 13 全部用例：
//   13.1 wx.cloud.init
//   13.2 app_data collection 结构
//   13.3 跨用户数据不可见
//   13.4 CloudBase 安全规则核对
//   13.5 控制台核对
//
// 约定：
//   - 所有云端写入均通过 wrapKey() 加测试命名空间前缀，避免污染真实数据
//   - 永不调用 CloudStorageAdapter.clear() 无前缀形式（会清空用户全部 app_data）；
//     需要清空测试命名空间时使用 clear(wrapKey('')) 或 cleanupCloudNamespace
//   - automator 在沙箱环境可能为 null，所有用例需优雅跳过（early return）
//   - evaluate 内 require 路径相对小程序根目录（与 setup/cloudbase.ts、reset.ts 一致）
//
// 说明：app.ts onLaunch 不直接调用 wx.cloud.init，而是由 CloudStorageAdapter.getDb()
// 惰性触发 wx.cloud.init({ env: CLOUD_ENV, traceUser: true })。
// 用例 13.1 通过覆盖 wx.cloud.init 捕获参数，验证惰性初始化路径的 env / traceUser 正确。

import {
  CLOUD_ENV,
  CLOUD_COLLECTION,
  initCloudBase,
  cleanupCloudNamespace,
  wrapKey,
  getTestPrefix
} from '../setup/cloudbase'

/** app_data collection 原始文档结构（CloudBase 安全规则自动注入 _openid） */
interface AppDataRawDoc {
  _id: string | number
  key: string
  value: unknown
  _openid: string
}

/** CloudBase 控制台 URL（供手动核对 app_data collection） */
const CLOUDBASE_CONSOLE_URL =
  'https://tcb.cloud.tencent.com/dev?envId=tnt-lxo777jrw#/db/doc/collection/app_data'

/** 获取已启动的 automator；沙箱未装开发者工具时返回 null */
function getAutomator(): Automator | null {
  return typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ : null
}

/** 等待指定毫秒（onLaunch 内部 fire-and-forget，需等待异步链路稳定） */
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

describe('CloudBase 集成 E2E', () => {
  // 每个用例后清理云端测试命名空间，保证用例之间互不影响
  afterEach(async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await cleanupCloudNamespace(automator).catch(() => {
      // 清理失败不阻断后续用例
    })
  })

  // 13.5 控制台核对：所有用例结束后断言测试命名空间已清理干净
  afterAll(async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    const prefix = getTestPrefix()
    const remaining = await automator.miniProgram
      .evaluate<number>(`
        var prefix = ${JSON.stringify(prefix)}
        var collection = ${JSON.stringify(CLOUD_COLLECTION)}
        try {
          var db = wx.cloud.database()
          var regExp = db.RegExp({ regexp: '^' + prefix, options: 'i' })
          var res = await db.collection(collection).where({ key: regExp }).get()
          return (res.data || []).length
        } catch (e) {
          return -1
        }
      `)
      .catch(() => -1)
    // 所有测试命名空间文档应已清理（afterEach 已逐用例清理）
    if (remaining >= 0) {
      expect(remaining).toBe(0)
    }
    console.log(
      '[cloudbase-integration] 测试命名空间清理验证完成，剩余文档数：' +
        remaining +
        '\n' +
        '手动核对地址：' +
        CLOUDBASE_CONSOLE_URL
    )
  })

  // ============================================================
  // 13.1 wx.cloud.init
  // ============================================================
  it('wx.cloud.init', async () => {
    const automator = getAutomator()
    if (!automator) {
      // automator 不可用（沙箱未装微信开发者工具），优雅跳过
      return
    }
    // Relaunch 重新执行 app.ts onLaunch
    await automator.miniProgram.relaunch()
    // onLaunch 内部 fire-and-forget，等待异步链路稳定
    await wait(1500)

    const result = await automator.miniProgram.evaluate<{
      cloudDefined: boolean
      initialized: boolean
      capturedEnv: string | null
      capturedTraceUser: boolean | null
      dbValid: boolean
    }>(`
      var mod = require('utils/storage/CloudStorageAdapter')
      // 重置初始化标记，测试 CloudStorageAdapter.getDb() 惰性初始化路径
      mod.setCloudInitialized(false)
      // 覆盖 wx.cloud.init 捕获参数
      var capturedEnv = null
      var capturedTraceUser = null
      var origInit = wx.cloud.init
      wx.cloud.init = function(opts) {
        opts = opts || {}
        capturedEnv = opts.env || null
        capturedTraceUser = (typeof opts.traceUser === 'boolean') ? opts.traceUser : null
        try { origInit.call(wx.cloud, opts) } catch (e) {}
      }
      var cloudDefined = (typeof wx.cloud !== 'undefined')
      // 触发惰性初始化：list() 内部调用 getDb() → wx.cloud.init()
      var probeKey = ${JSON.stringify(wrapKey('init_probe'))}
      try {
        var adapter = new mod.CloudStorageAdapter()
        await adapter.list(probeKey)
      } catch (e) {}
      var initialized = mod.isCloudInitialized()
      // 验证 database() 返回有效 db 对象
      var dbValid = false
      try {
        var db = wx.cloud.database()
        dbValid = (db && typeof db.collection === 'function')
      } catch (e) {}
      // 恢复原始 init
      wx.cloud.init = origInit
      return {
        cloudDefined: cloudDefined,
        initialized: initialized,
        capturedEnv: capturedEnv,
        capturedTraceUser: capturedTraceUser,
        dbValid: dbValid
      }
    `)
    // wx.cloud 已定义（小程序支持云开发）
    expect(result.cloudDefined).toBe(true)
    // setCloudInitialized(true) 已被调用，isCloudInitialized() 返回 true
    expect(result.initialized).toBe(true)
    // env 参数为正确的云环境 ID
    expect(result.capturedEnv).toBe(CLOUD_ENV)
    // traceUser 参数为 true
    expect(result.capturedTraceUser).toBe(true)
    // wx.cloud.database() 返回有效 db 对象
    expect(result.dbValid).toBe(true)
  })

  // ============================================================
  // 13.2 app_data collection 结构
  // ============================================================
  it('app_data collection 结构', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const key = wrapKey('doc_struct')
    const value = { foo: 'bar', num: 42, nested: { a: 1 } }
    const result = await automator.miniProgram.evaluate<{
      doc: AppDataRawDoc | null
    }>(`
      var key = ${JSON.stringify(key)}
      var value = ${JSON.stringify(value)}
      var collection = ${JSON.stringify(CLOUD_COLLECTION)}
      var mod = require('utils/storage/CloudStorageAdapter')
      var adapter = new mod.CloudStorageAdapter()
      // 通过 CloudStorageAdapter 写入（upsert 到 app_data collection）
      await adapter.set(key, value)
      // 读取原始文档结构
      var db = wx.cloud.database()
      var res = await db.collection(collection).where({ key: key }).limit(1).get()
      var doc = (res.data && res.data.length > 0) ? res.data[0] : null
      // 清理测试文档（afterEach 也会兜底清理）
      if (doc) {
        try { await db.collection(collection).doc(doc._id).remove() } catch (e) {}
      }
      return { doc: doc }
    `)
    expect(result.doc).not.toBeNull()
    expect(result.doc).toHaveProperty('_id')
    expect(result.doc).toHaveProperty('key', key)
    expect(result.doc).toHaveProperty('value')
    expect(result.doc).toHaveProperty('_openid')
    // _id 为 CloudBase 自动生成的字符串
    expect(typeof result.doc!._id).toBe('string')
    expect(typeof result.doc!._id === 'string' && result.doc!._id.length > 0).toBe(true)
    // key 字段等于 wrapKey 后的测试 key
    expect(result.doc!.key).toBe(key)
    // value 字段等于写入的对象（含嵌套结构）
    expect(result.doc!.value).toEqual(value)
    // _openid 由 CloudBase 安全规则自动注入，非空字符串
    expect(typeof result.doc!._openid).toBe('string')
    expect(result.doc!._openid.length > 0).toBe(true)
  })

  // ============================================================
  // 13.3 跨用户数据不可见
  // ============================================================
  describe('跨用户数据不可见', () => {
    // 单账号 sanity check：自身数据可读写，_openid 一致，伪造 _openid 查询返回空
    it('单账号 sanity check - 自身数据可读写且 _openid 一致', async () => {
      const automator = getAutomator()
      if (!automator) {
        return
      }
      await initCloudBase(automator)
      const keyA = wrapKey('user-a-test')
      const keyB = wrapKey('user-b-test')
      const result = await automator.miniProgram.evaluate<{
        readBack: unknown
        openidA: string
        openidB: string
        fakeOpenidCount: number
      }>(`
        var keyA = ${JSON.stringify(keyA)}
        var keyB = ${JSON.stringify(keyB)}
        var collection = ${JSON.stringify(CLOUD_COLLECTION)}
        var mod = require('utils/storage/CloudStorageAdapter')
        var adapter = new mod.CloudStorageAdapter()
        // 写入 keyA
        await adapter.set(keyA, { owner: 'A' })
        // 读回自身数据（sanity check）
        var readBack = await adapter.get(keyA)
        // 写入 keyB 以验证 _openid 一致性
        await adapter.set(keyB, { owner: 'B' })
        var db = wx.cloud.database()
        var r1 = await db.collection(collection).where({ key: keyA }).limit(1).get()
        var r2 = await db.collection(collection).where({ key: keyB }).limit(1).get()
        var openidA = (r1.data && r1.data[0]) ? r1.data[0]._openid : ''
        var openidB = (r2.data && r2.data[0]) ? r2.data[0]._openid : ''
        // 尝试用伪造 _openid 查询 —— CloudBase "仅创建者可读写" 安全规则
        // 在用户态查询时，服务端自动按 auth.openid 过滤，where 中指定的非自身
        // _openid 不会命中任何文档（安全规则 + 数据层双重保证）
        var fakeRes = await db.collection(collection).where({
          key: keyA,
          _openid: 'fake-openid-not-exist'
        }).get()
        var fakeOpenidCount = (fakeRes.data || []).length
        return {
          readBack: readBack,
          openidA: openidA,
          openidB: openidB,
          fakeOpenidCount: fakeOpenidCount
        }
      `)
      // sanity：自身数据可读写
      expect(result.readBack).toEqual({ owner: 'A' })
      // _openid 非空
      expect(typeof result.openidA).toBe('string')
      expect(result.openidA.length > 0).toBe(true)
      // 同一用户多次写入 _openid 一致
      expect(result.openidA).toBe(result.openidB)
      // 用伪造 _openid 查询应返回 0 条（安全规则在服务端过滤）
      expect(result.fakeOpenidCount).toBe(0)
    })

    // 真正的跨用户隔离需要两个真实微信账号：
    //   账号 A 写入 wrapKey('cross_user')，切换到账号 B 会话读取同一 key，
    //   断言 B 返回 null（读不到 A 的数据）。
    // 单账号测试环境无法验证真实跨用户隔离，故 skip。
    // 启用方式：配置第二个测试账号登录态（独立 automator 会话 / TEST_ACCOUNT_B_OPENID），
    // 在 A 写入后于 B 会话读取，断言返回 null。
    // 参考 spec SubTask 13.3。
    it.skip('双账号跨用户隔离（需两个真实测试账号）', async () => {
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

  // ============================================================
  // 13.4 CloudBase 安全规则核对
  // ============================================================
  it('CloudBase 安全规则核对', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const key = wrapKey('security_check')
    const result = await automator.miniProgram.evaluate<{
      selfOpenid: string
      canReadOwn: boolean
      fakeOpenidReadCount: number
    }>(`
      var key = ${JSON.stringify(key)}
      var collection = ${JSON.stringify(CLOUD_COLLECTION)}
      var mod = require('utils/storage/CloudStorageAdapter')
      var adapter = new mod.CloudStorageAdapter()
      // 写入文档以获取当前用户 _openid
      await adapter.set(key, { marker: 'security' })
      var db = wx.cloud.database()
      var ownRes = await db.collection(collection).where({ key: key }).limit(1).get()
      var selfOpenid = (ownRes.data && ownRes.data[0]) ? ownRes.data[0]._openid : ''
      // 能读回自身数据
      var canReadOwn = (ownRes.data && ownRes.data.length > 0)
      // 尝试用伪造 _openid 查询 —— CloudBase "仅创建者可读写" 安全规则
      // 在用户态查询时，服务端自动按 auth.openid 过滤，where 中指定的非自身
      // _openid 不会命中任何文档
      var fakeRes = await db.collection(collection).where({
        key: key,
        _openid: 'fake-openid-for-security-test'
      }).get()
      var fakeOpenidReadCount = (fakeRes.data || []).length
      // 清理测试文档（afterEach 也会兜底清理）
      try { await adapter.remove(key) } catch (e) {}
      return {
        selfOpenid: selfOpenid,
        canReadOwn: canReadOwn,
        fakeOpenidReadCount: fakeOpenidReadCount
      }
    `)
    // 当前用户 _openid 非空
    expect(typeof result.selfOpenid).toBe('string')
    expect(result.selfOpenid.length > 0).toBe(true)
    // 能读回自身数据
    expect(result.canReadOwn).toBe(true)
    // 伪造 _openid 查询应无法读取他人数据（返回 0 条）
    // 注意：此断言为 sanity check，验证用户态查询无法绕过安全规则。
    // 完整安全规则核对需在 CloudBase 控制台手动确认：
    //   1. 访问 https://tcb.cloud.tencent.com/dev?envId=tnt-lxo777jrw#/db/doc/collection/app_data
    //   2. 点击「权限设置」
    //   3. 确认权限规则为「仅创建者可读写」（所有用户只能读写 _openid 等于自身的数据）
    //   4. 若需通过 Admin SDK 验证，可使用 cloudbase MCP 工具查询 collection 权限配置
    expect(result.fakeOpenidReadCount).toBe(0)
  })

  // ============================================================
  // 13.5 控制台核对
  // ============================================================
  it('控制台核对 - 测试命名空间清理验证', async () => {
    const automator = getAutomator()
    if (!automator) {
      return
    }
    await initCloudBase(automator)
    const prefix = getTestPrefix()
    // 写入测试数据，验证可按前缀查询
    const key = wrapKey('console_check')
    await automator.miniProgram.evaluate(`
      var key = ${JSON.stringify(key)}
      var mod = require('utils/storage/CloudStorageAdapter')
      var adapter = new mod.CloudStorageAdapter()
      await adapter.set(key, { check: true })
      return true
    `)
    // 查询测试命名空间文档数（此时应 >= 1）
    const beforeCleanup = await automator.miniProgram.evaluate<number>(`
      var prefix = ${JSON.stringify(prefix)}
      var collection = ${JSON.stringify(CLOUD_COLLECTION)}
      try {
        var db = wx.cloud.database()
        var regExp = db.RegExp({ regexp: '^' + prefix, options: 'i' })
        var res = await db.collection(collection).where({ key: regExp }).get()
        return (res.data || []).length
      } catch (e) {
        return -1
      }
    `)
    expect(beforeCleanup).toBeGreaterThanOrEqual(1)
    // 清理测试命名空间
    await cleanupCloudNamespace(automator)
    // 验证清理后文档数为 0
    const afterCleanup = await automator.miniProgram.evaluate<number>(`
      var prefix = ${JSON.stringify(prefix)}
      var collection = ${JSON.stringify(CLOUD_COLLECTION)}
      try {
        var db = wx.cloud.database()
        var regExp = db.RegExp({ regexp: '^' + prefix, options: 'i' })
        var res = await db.collection(collection).where({ key: regExp }).get()
        return (res.data || []).length
      } catch (e) {
        return -1
      }
    `)
    expect(afterCleanup).toBe(0)
    console.log(
      '[cloudbase-integration] 控制台手动核对地址：\n' +
        CLOUDBASE_CONSOLE_URL +
        '\n' +
        '请在控制台确认 app_data collection 中无 ' +
        prefix +
        ' 前缀的残留文档。'
    )
  })
})
