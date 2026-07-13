// reset.ts — 每个用例前的存储重置
//
// 由 jest.config.ts 的 setupFilesAfterEach 加载：在测试框架就绪后注册 beforeEach 钩子。
// beforeEach 读取 globalThis.__AUTOMATOR__（由 global-setup.ts 写入），若 automator 不可用
// （沙箱未装开发者工具）则静默跳过，不阻断用例——用例自身应判断 automator 可用性并 skip。
//
// 重置内容：
//   1) wx.clearStorageSync() 清空小程序本地存储
//   2) storageManager.setMode('local') 重置为本地模式
//   3) cleanupCloudNamespace() 清理云端测试命名空间

import { cleanupCloudNamespace } from './cloudbase'
// Automator 为 setup/types.d.ts 声明的全局类型

/**
 * 重置存储状态（本地 + 云端测试命名空间 + 模式）。
 *
 * @param automator 可选；未提供时从 globalThis.__AUTOMATOR__ 读取
 */
export async function resetStorage(
  automator?: Automator | null
): Promise<void> {
  const auto =
    automator ??
    (typeof globalThis !== 'undefined' ? globalThis.__AUTOMATOR__ : null)
  if (!auto) {
    // automator 未就绪（沙箱环境未装开发者工具），跳过重置
    return
  }
  try {
    // 1) + 2) 清空本地存储 + 重置 storageManager 为 local 模式
    await auto.miniProgram.evaluate(`
      try { wx.clearStorageSync() } catch (e) {}
      try {
        var mod = require('utils/storage/storageManager')
        if (mod && mod.storageManager && typeof mod.storageManager.setMode === 'function') {
          mod.storageManager.setMode('local')
        }
      } catch (e) {}
      return true
    `)
    // 3) 清理云端测试命名空间
    await cleanupCloudNamespace(auto)
  } catch {
    // 重置失败不阻断用例；用例自身按需判断 automator 可用性
  }
}

// 注册 beforeEach 钩子：在每个用例前重置存储
// setupFilesAfterEach 文件在测试框架就绪后加载，beforeEach 全局可用
beforeEach(async () => {
  await resetStorage()
})
