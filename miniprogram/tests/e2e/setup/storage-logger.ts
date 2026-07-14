// storage-logger.ts — 存储读写日志工具
//
// 在用例中调用 logStorageOp() 记录每次存储操作（get/set/remove/list/clear），
// 日志按用例名分文件写入 reports/storage-logs/<test-name>.log。
// 每条记录格式：
//   [2026-07-13T10:30:00.000Z] SET key=candito_cycles valueSummary={id:test-cycle...}
//
// 用例名取自 jest 运行时的 expect.getState().currentTestName；
// jest 不可用时回退到 'unknown'。
//
// 这是 Node.js 侧工具——用例文件 import 后在断言前后调用即可，
// 不会进入小程序运行时（小程序侧的存储操作通过 automator.evaluate 触发，
// 由用例在 Node 侧调用本函数记录）。

import * as fs from 'fs'
import * as path from 'path'

export type StorageOperation = 'get' | 'set' | 'remove' | 'list' | 'clear'

/** reports/storage-logs 目录绝对路径 */
const LOGS_DIR: string = path.resolve(__dirname, '..', 'reports', 'storage-logs')

/**
 * 将测试名清洗为安全的文件名（保留中文/字母/数字/下划线/连字符）。
 * 过长时截断到 100 字符，避免文件系统路径限制。
 */
function sanitizeTestName(name: string): string {
  const cleaned = name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .trim()
  return cleaned.slice(0, 100) || 'unknown'
}

/**
 * 从 jest 运行时获取当前用例名。
 * 通过 globalThis.expect.getState().currentTestName 读取；
 * jest 不可用或未在用例上下文时返回空字符串。
 */
function getCurrentTestName(): string {
  try {
    const g = globalThis as unknown as {
      expect?: {
        getState?: () => { currentTestName?: string }
      }
    }
    if (g.expect && typeof g.expect.getState === 'function') {
      const state = g.expect.getState()
      if (state && typeof state.currentTestName === 'string') {
        return state.currentTestName
      }
    }
  } catch {
    // jest 未就绪或 getState 不可用，忽略
  }
  return ''
}

/**
 * 记录一次存储操作到 reports/storage-logs/<test-name>.log。
 *
 * @param operation    操作类型（get/set/remove/list/clear）
 * @param key          存储 key（如 candito_cycles）
 * @param valueSummary 值摘要（可选，如 "{id:test-cycle...}" 或 "<200 chars>"）
 */
export function logStorageOp(
  operation: StorageOperation,
  key: string,
  valueSummary?: string
): void {
  const rawName = getCurrentTestName()
  const testName = rawName || 'unknown'
  const safeName = sanitizeTestName(testName)

  // 确保日志目录存在
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }

  const logFile = path.join(LOGS_DIR, `${safeName}.log`)
  const timestamp = new Date().toISOString()
  const opUpper = operation.toUpperCase()
  const valuePart =
    valueSummary !== undefined && valueSummary !== ''
      ? ` valueSummary=${valueSummary}`
      : ''
  const line = `[${timestamp}] ${opUpper} key=${key}${valuePart}\n`

  fs.appendFileSync(logFile, line, 'utf-8')
}
