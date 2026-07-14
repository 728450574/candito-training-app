// automator.ts — 封装 miniprogram-automator 的启动与关闭
//
// 使用动态 import 加载 'miniprogram-automator'（仅在运行时可用，编译期由 types.d.ts 提供类型）。
// 启动失败时抛出明确错误，列出三种常见原因，便于上层（globalSetup）记录并优雅跳过用例。
// automator 实例缓存在模块级变量，getAutomator() 暴露给用例与 reset 钩子。

// Automator / LaunchOptions 为 setup/types.d.ts 声明的全局类型（SCRIPT 环境声明）

let cachedAutomator: Automator | null = null

/**
 * 获取已缓存的 automator 实例；未启动时返回 null。
 */
export function getAutomator(): Automator | null {
  return cachedAutomator
}

/**
 * 显式设置缓存的 automator 实例（供 globalSetup 写入 / globalTeardown 清空）。
 */
export function setAutomator(automator: Automator | null): void {
  cachedAutomator = automator
}

/**
 * 启动 miniprogram-automator，连接微信开发者工具 CLI。
 *
 * @param projectPath 小程序工程根目录（指向 miniprogram/）
 * @param cliPath     开发者工具 CLI 路径，可选；默认由 automator 自动探测
 * @throws 启动失败时抛出明确错误（开发者工具未安装 / CLI 端口未开 / 工程路径错误）
 */
export async function launchAutomator(
  projectPath: string,
  cliPath?: string
): Promise<Automator> {
  if (cachedAutomator) {
    return cachedAutomator
  }

  const options: LaunchOptions = { projectPath }
  if (cliPath) {
    options.cliPath = cliPath
  }

  // 动态 import：依赖仅在运行时存在，避免在未安装时让整个测试工程无法加载
  const mod = (await import('miniprogram-automator')) as {
    launch: (opts: LaunchOptions) => Promise<Automator>
  }

  try {
    const automator = await mod.launch(options)
    cachedAutomator = automator
    return automator
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    throw new Error(
      '[automator] 启动微信开发者工具失败。请逐一排查：\n' +
        '  1) 微信开发者工具未安装或未启动\n' +
        '  2) CLI 服务端口未开放（开发者工具 → 设置 → 安全设置 → 开启服务端口）\n' +
        `  3) 工程路径无效：${projectPath}\n` +
        `  4) cliPath 配置（如有）：${cliPath ?? '(未提供)'}\n` +
        `原始错误：${reason}`
    )
  }
}

/**
 * 关闭 automator 并清理模块级缓存。
 */
export async function closeAutomator(automator: Automator): Promise<void> {
  try {
    await automator.close()
  } finally {
    if (cachedAutomator === automator) {
      cachedAutomator = null
    }
  }
}
