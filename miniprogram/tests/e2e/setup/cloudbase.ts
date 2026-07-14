// cloudbase.ts — CloudBase 测试环境初始化与清理
//
// 所有 wx.cloud 操作只能在 mini program runtime 执行（Node 侧不存在 wx 全局），
// 故全部通过 automator.miniProgram.evaluate() 在小程序上下文内完成。
//
// 测试命名空间：每个测试运行生成唯一 RUN_ID，所有写入云端的测试 key 都加前缀
//   e2e_<timestamp>_test_<key>
// globalTeardown 调用 cleanupCloudNamespace() 按前缀清理，保证云端不留残留。

// Automator 为 setup/types.d.ts 声明的全局类型

/** CloudBase 云环境 ID（与 miniprogram/config/cloud.ts 保持一致） */
export const CLOUD_ENV = 'tnt-lxo777jrw'

/** 数据集合名称（单一 collection，按 key 区分） */
export const CLOUD_COLLECTION = 'app_data'

/** 一次测试运行的唯一 ID，模块加载时计算一次 */
export const RUN_ID = 'e2e_' + Date.now()

/**
 * 测试命名空间前缀：e2e_<timestamp>_test_
 * 所有测试写入云端的 key 都以此为前缀，便于统一清理。
 */
export function getTestPrefix(): string {
  return RUN_ID + '_test_'
}

/**
 * 给业务 key 加测试命名空间前缀，避免污染真实数据。
 */
export function wrapKey(key: string): string {
  return getTestPrefix() + key
}

/**
 * 在小程序运行时初始化 CloudBase：
 *  1) wx.cloud.init({ env, traceUser: true })
 *  2) 调用 CloudStorageAdapter.setCloudInitialized(true) 标记已初始化
 *
 * @throws 评估脚本执行失败时上抛
 */
export async function initCloudBase(automator: Automator): Promise<void> {
  const env = CLOUD_ENV
  const collection = CLOUD_COLLECTION
  await automator.miniProgram.evaluate(`
    // 1) 初始化云开发
    wx.cloud.init({ env: ${JSON.stringify(env)}, traceUser: true })
    // 2) 标记 CloudStorageAdapter 已初始化（require 路径相对小程序根目录）
    try {
      var mod = require('utils/storage/CloudStorageAdapter')
      if (mod && typeof mod.setCloudInitialized === 'function') {
        mod.setCloudInitialized(true)
      }
    } catch (e) {
      // 模块加载失败时降级：仅完成 wx.cloud.init，不标记
    }
    return { env: ${JSON.stringify(env)}, collection: ${JSON.stringify(collection)} }
  `)
}

/**
 * 清理测试命名空间：删除 app_data collection 中所有 key 以 getTestPrefix() 开头的文档。
 *
 * @returns 实际删除的文档数；评估失败返回 -1
 */
export async function cleanupCloudNamespace(
  automator: Automator
): Promise<number> {
  const prefix = getTestPrefix()
  const collection = CLOUD_COLLECTION
  // 前缀仅含 [a-z0-9_]，无正则元字符，可直接拼接 RegExp
  const removed = await automator.miniProgram.evaluate<number>(`
    var prefix = ${JSON.stringify(prefix)}
    var collection = ${JSON.stringify(collection)}
    try {
      var db = wx.cloud.database()
      var regExp = db.RegExp({ regexp: '^' + prefix, options: 'i' })
      var res = await db.collection(collection).where({ key: regExp }).get()
      var docs = res.data || []
      for (var i = 0; i < docs.length; i++) {
        await db.collection(collection).doc(docs[i]._id).remove()
      }
      return docs.length
    } catch (e) {
      return -1
    }
  `)
  return removed
}
