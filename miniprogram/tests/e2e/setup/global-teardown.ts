// global-teardown.ts — jest globalTeardown
//
// 测试结束后：清理云端测试命名空间（app_data 中 e2e_<runId>_test_ 前缀文档），再关闭 automator。
// automator 未启动时（沙箱场景）仅记录日志后返回。

import { closeAutomator } from './automator'
import { cleanupCloudNamespace } from './cloudbase'

export default async function globalTeardown(): Promise<void> {
  const automator = globalThis.__AUTOMATOR__
  if (!automator) {
    console.log('[globalTeardown] automator 未启动，无需清理')
    return
  }

  // 1) 清理云端测试命名空间
  try {
    const removed = await cleanupCloudNamespace(automator)
    console.log(
      `[globalTeardown] 云端测试命名空间已清理，删除文档数：${removed}`
    )
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.warn(`[globalTeardown] 清理云端命名空间失败：${reason}`)
  }

  // 2) 关闭 automator
  try {
    await closeAutomator(automator)
    console.log('[globalTeardown] automator 已关闭')
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.warn(`[globalTeardown] 关闭 automator 失败：${reason}`)
  } finally {
    globalThis.__AUTOMATOR__ = null
  }
}
