// screenshot.ts — 失败用例截图工具
//
// 在用例失败或需要视觉记录时调用 captureScreenshot()，
// 通过 automator.screenshot() 将截图写入 reports/ui-screenshots/<caseName>.png。
//
// 设计要点：
//   - automator 参数为 unknown（由调用方传入 automator 实例或 null）
//   - automator 为 null/undefined 时直接返回 null，不抛错
//   - 通过类型守卫验证 screenshot 方法存在后再调用
//   - 截图失败时 catch 并返回 null，不阻断用例

/** automator 参数类型守卫：验证对象具有 screenshot 方法 */
interface ScreenshotCapable {
  screenshot(options: { path: string }): Promise<unknown>
}

function hasScreenshot(obj: unknown): obj is ScreenshotCapable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'screenshot' in obj &&
    typeof (obj as Record<string, unknown>).screenshot === 'function'
  )
}

/**
 * 通过 automator 截图并保存到 reports/ui-screenshots/<caseName>.png。
 *
 * @param automator automator 实例（unknown 类型）；为 null 时返回 null
 * @param caseName  用例名（用于生成截图文件名）
 * @returns 成功时返回截图路径字符串；失败或 automator 不可用时返回 null
 */
export async function captureScreenshot(
  automator: unknown,
  caseName: string
): Promise<string | null> {
  if (automator === null || automator === undefined) {
    return null
  }

  if (!hasScreenshot(automator)) {
    return null
  }

  try {
    const screenshotPath = `reports/ui-screenshots/${caseName}.png`
    await automator.screenshot({ path: screenshotPath })
    return screenshotPath
  } catch {
    // 截图失败不阻断用例，返回 null
    return null
  }
}
