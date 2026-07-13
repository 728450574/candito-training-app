// global-setup.ts — jest globalSetup
//
// 启动 miniprogram-automator 并初始化 CloudBase。
// 启动成功：将 automator 暴露到 globalThis.__AUTOMATOR__ 供用例与 reset 钩子读取。
// 启动失败：输出明确警告，置 globalThis.__AUTOMATOR__ = null，不抛错——
//   这样 globalSetup 仍成功结束，用例可自行判断 automator 可用性并优雅 skip（沙箱场景）。

import * as path from 'path'
import { launchAutomator, setAutomator } from './automator'
import { initCloudBase } from './cloudbase'

export default async function globalSetup(): Promise<void> {
  // projectPath 指向 miniprogram/ 工程根（setup 目录上溯三级）
  const projectPath = path.resolve(__dirname, '..', '..', '..')
  // CLI 路径可选，由环境变量提供
  const cliPath = process.env.MP_CLI_PATH

  try {
    const automator = await launchAutomator(projectPath, cliPath)
    // 暴露给用例与 reset 钩子（双写：模块缓存 + globalThis）
    globalThis.__AUTOMATOR__ = automator
    setAutomator(automator)
    // 在小程序运行时初始化 CloudBase（wx.cloud.init + setCloudInitialized）
    await initCloudBase(automator)
    console.log(`[globalSetup] automator 已启动，工程路径：${projectPath}`)
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    globalThis.__AUTOMATOR__ = null
    console.warn(
      `[globalSetup] 微信开发者工具不可用，E2E 用例将跳过。原因：\n${reason}\n` +
        '提示：安装微信开发者工具并在 "设置 → 安全设置" 开启服务端口后重试。'
    )
    // 不抛错：让 globalSetup 成功结束，用例自行判断 automator 可用性并 skip
  }
}
