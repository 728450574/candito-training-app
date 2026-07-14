// fixtures.ts — 加载 fixtures/*.json 对照基准数据
//
// 对照基准（H5 金标准导出、设计稿映射、状态机用例等）存放在 fixtures/ 目录，
// 用例通过 loadFixture<T>(name) 同步读取并解析为指定类型。

import * as fs from 'fs'
import * as path from 'path'

/** fixtures 目录绝对路径：<e2e>/fixtures */
export const FIXTURES_DIR: string = path.resolve(__dirname, '..', 'fixtures')

/**
 * 同步读取 fixtures/<name>.json 并解析为指定类型 T。
 *
 * @param name 文件名（不含扩展名，或含 .json 均可）
 * @returns 解析后的对象，类型由调用方断言
 */
export function loadFixture<T>(name: string): T {
  const fileName = name.endsWith('.json') ? name : `${name}.json`
  const filePath = path.resolve(FIXTURES_DIR, fileName)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}
