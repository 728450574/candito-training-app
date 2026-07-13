// ui-fidelity.e2e.ts — UI 1:1 保真端到端测试（Task 9）
//
// 五个用例：
//   1. 设计 token 一致性 (静态) - 比对 theme.wxss 与 H5 theme.css 的全部 CSS 变量
//   2. 字体栈保留 (静态) - 检查 --font-sans / --font-mono 与数据元素字体引用
//   3. 毛玻璃降级 (静态) - 禁用 backdrop-filter，应用 rgba(255,255,255,0.92) 降级
//   4. 单位换算 (静态) - 扫描所有 WXSS，断言 px/rpx 按 1px = 2rpx 换算
//   5. 逐页视觉对照 (automator) - 17 个设计稿 → 15 个小程序页面截图与对照
//
// 测试 1-4 是静态文件分析，运行在 Node.js，不依赖 automator，永远运行。
// 测试 5 需要 automator；automator 不可用时整体 describe.skip 并仍生成对照报告。

import * as fs from 'fs'
import * as path from 'path'
import { getAutomator, loadFixture } from '../setup'

// ============================================================================
// 路径常量
// ============================================================================

const E2E_DIR: string = path.resolve(__dirname, '..')
const MINIPROGRAM_DIR: string = path.resolve(E2E_DIR, '..', '..')
const REPO_ROOT: string = path.resolve(MINIPROGRAM_DIR, '..')

const THEME_WXSS_PATH: string = path.join(
  MINIPROGRAM_DIR,
  'assets',
  'styles',
  'theme.wxss'
)
const APP_WXSS_PATH: string = path.join(MINIPROGRAM_DIR, 'app.wxss')
const APP_JSON_PATH: string = path.join(MINIPROGRAM_DIR, 'app.json')
const THEME_CSS_PATH: string = path.join(
  REPO_ROOT,
  'candito-v4-training-app',
  'src',
  'assets',
  'theme.css'
)

const REPORTS_DIR: string = path.join(E2E_DIR, 'reports')
const SCREENSHOTS_DIR: string = path.join(REPORTS_DIR, 'ui-screenshots')
const COMPARISON_REPORT_PATH: string = path.join(
  REPORTS_DIR,
  'ui-fidelity-comparison.json'
)

// ============================================================================
// 类型定义
// ============================================================================

interface DesignPageMapping {
  designHtml: string
  miniprogramPage: string
  visualElements: string[]
}

interface DesignPagesIndex {
  $comment?: string
  mappings: DesignPageMapping[]
}

interface PageComparisonResult {
  designHtml: string
  miniprogramPage: string
  visualElements: string[]
  status: 'passed' | 'failed' | 'skipped'
  screenshotPath: string | null
  diffs: string[]
  notes: string[]
}

interface ComparisonReport {
  generatedAt: string
  automatorAvailable: boolean
  totalMappings: number
  passed: number
  failed: number
  skipped: number
  pages: PageComparisonResult[]
}

interface TabBarConfig {
  backgroundColor?: string
  borderStyle?: string
  color?: string
  selectedColor?: string
}

interface AppJson {
  pages?: string[]
  tabBar?: TabBarConfig
}

// ============================================================================
// 工具函数（纯函数，无副作用便于复用）
// ============================================================================

/** 同步读取文件内容（UTF-8） */
function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

/** 剥离 CSS 注释（含多行 /* ... *\/） */
function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * 解析 CSS 变量定义，返回 Map<变量名, 值>。
 * 仅匹配 `--var-name: value;` 形式；变量名允许字母、数字、连字符。
 * 值内的行内注释会被剥离，结果 trim。
 */
function parseCssVariables(text: string): Map<string, string> {
  const result = new Map<string, string>()
  const regex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const name: string = match[1]
    const rawValue: string = match[2]
    const valueWithoutComments: string = stripCssComments(rawValue)
    const value: string = valueWithoutComments.trim()
    result.set(name, value)
  }
  return result
}

/** 递归列出目录下所有 .wxss 文件（跳过 node_modules / tests） */
function listWxssFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) {
    return results
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath: string = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'tests') {
        continue
      }
      results.push(...listWxssFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.wxss')) {
      results.push(fullPath)
    }
  }
  return results
}

/** 文件路径相对 miniprogram/ 的简短表示，用于报告输出 */
function relativeToMiniprogram(filePath: string): string {
  return path.relative(MINIPROGRAM_DIR, filePath)
}

/** 从页面路径推断截图文件名（pages/today/index → today） */
function pagePathToFileName(pagePath: string): string {
  const parts: string[] = pagePath.split('/')
  // parts[0] = 'pages', parts[1] = 'today', parts[2] = 'index'
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
}

/** 检查页面 WXML 文件是否存在 */
function checkPageWxmlExists(pagePath: string): boolean {
  const pageDir: string = path.dirname(path.join(MINIPROGRAM_DIR, pagePath))
  const wxmlPath: string = path.join(pageDir, 'index.wxml')
  return fs.existsSync(wxmlPath)
}

/** 检查页面 WXSS 文件是否存在 */
function checkPageWxssExists(pagePath: string): boolean {
  const pageDir: string = path.dirname(path.join(MINIPROGRAM_DIR, pagePath))
  const wxssPath: string = path.join(pageDir, 'index.wxss')
  return fs.existsSync(wxssPath)
}

/** 检查设计稿 HTML 文件是否存在 */
function checkDesignHtmlExists(designHtml: string): boolean {
  const fullPath: string = path.join(REPO_ROOT, designHtml)
  return fs.existsSync(fullPath)
}

/**
 * 统计页面 WXSS 中 CSS 变量引用与硬编码 hex 颜色数量。
 * - varCount: var(--xxx) 出现次数
 * - hardcodedHexCount: #RRGGBB 出现次数（不含 #FFF/#FFF 等 3 位短码，避免误报白色前景）
 */
function analyzePageCssVariableUsage(pagePath: string): {
  usesVars: boolean
  varCount: number
  hardcodedHexCount: number
} {
  if (!checkPageWxssExists(pagePath)) {
    return { usesVars: false, varCount: 0, hardcodedHexCount: 0 }
  }
  const pageDir: string = path.dirname(path.join(MINIPROGRAM_DIR, pagePath))
  const wxssPath: string = path.join(pageDir, 'index.wxss')
  const content: string = readFile(wxssPath)
  const stripped: string = stripCssComments(content)
  const varMatches: RegExpMatchArray | null = stripped.match(
    /var\(--[a-zA-Z0-9-]+\)/g
  )
  const hardcodedHexMatches: RegExpMatchArray | null = stripped.match(
    /#[0-9a-fA-F]{6}\b/g
  )
  return {
    usesVars: (varMatches?.length ?? 0) > 0,
    varCount: varMatches?.length ?? 0,
    hardcodedHexCount: hardcodedHexMatches?.length ?? 0
  }
}

// ============================================================================
// 测试套件
// ============================================================================

describe('UI 1:1 保真 E2E (Task 9)', () => {
  // ──────────────────────────────────────────────────────────────────────
  // 测试 1: 设计 token 一致性（静态）
  // ──────────────────────────────────────────────────────────────────────
  describe('SubTask 9.1 - 设计 token 一致性 (静态)', () => {
    test('theme.wxss 的 CSS 变量与 H5 theme.css 完全一致', () => {
      const wxssContent: string = readFile(THEME_WXSS_PATH)
      const cssContent: string = readFile(THEME_CSS_PATH)

      const wxssVars: Map<string, string> = parseCssVariables(wxssContent)
      const cssVars: Map<string, string> = parseCssVariables(cssContent)

      // 关键变量清单（spec 要求逐项核对）
      const keyVariables: ReadonlyArray<{ name: string; expected: string }> = [
        { name: 'color-primary', expected: '#1D1D1F' },
        { name: 'color-primary-light', expected: '#86868B' },
        { name: 'color-surface', expected: '#FFFFFF' },
        { name: 'color-surface-muted', expected: '#F5F5F7' },
        { name: 'color-border', expected: '#E5E5EA' },
        { name: 'color-border-light', expected: '#F0F0F5' },
        { name: 'color-training-main', expected: '#0A84FF' },
        { name: 'color-training-assist', expected: '#5E5CE6' },
        { name: 'color-training-optional', expected: '#30D158' },
        { name: 'color-training-rest', expected: '#86868B' },
        { name: 'state-success', expected: '#30D158' },
        { name: 'state-warning', expected: '#FF9F0A' },
        { name: 'state-error', expected: '#FF3B30' },
        { name: 'state-info', expected: '#0A84FF' }
      ]

      // 1) 逐项核对关键变量（提供清晰失败信息）
      for (const { name, expected } of keyVariables) {
        const wxssValue: string | undefined = wxssVars.get(name)
        expect(wxssValue).toBeDefined()
        expect(wxssValue).toBe(expected)
      }

      // 2) theme.css 中所有变量在 theme.wxss 中均存在且值一致
      const mismatches: string[] = []
      const missing: string[] = []
      cssVars.forEach((expectedValue: string, name: string) => {
        const wxssValue: string | undefined = wxssVars.get(name)
        if (wxssValue === undefined) {
          missing.push(name)
        } else if (wxssValue !== expectedValue) {
          mismatches.push(
            `--${name}: wxss="${wxssValue}" vs css="${expectedValue}"`
          )
        }
      })

      expect(missing).toEqual([])
      expect(mismatches).toEqual([])
    })

    test('app.wxss 引入 theme.wxss 且不引入新的 CSS 变量', () => {
      const appWxss: string = readFile(APP_WXSS_PATH)
      // app.wxss 应通过 @import 引入 theme.wxss
      expect(appWxss).toMatch(
        /@import\s+["']\.\/assets\/styles\/theme\.wxss["']/
      )

      // app.wxss 自身不应直接定义 CSS 变量（应集中在 theme.wxss）
      const appVars: Map<string, string> = parseCssVariables(appWxss)
      expect(appVars.size).toBe(0)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 测试 2: 字体栈保留（静态）
  // ──────────────────────────────────────────────────────────────────────
  describe('SubTask 9.2 - 字体栈保留 (静态)', () => {
    test("page 选择器 font-family 保留 -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'", () => {
      const themeWxss: string = readFile(THEME_WXSS_PATH)
      const appWxss: string = readFile(APP_WXSS_PATH)
      const combined: string = themeWxss + '\n' + appWxss

      // --font-sans 变量定义应包含全部预期字体
      const expectedFonts: ReadonlyArray<string> = [
        '-apple-system',
        'BlinkMacSystemFont',
        "'SF Pro Display'",
        "'PingFang SC'",
        "'Microsoft YaHei'"
      ]
      for (const font of expectedFonts) {
        expect(combined).toContain(font)
      }

      // --font-sans 变量值断言
      const vars: Map<string, string> = parseCssVariables(combined)
      const fontSans: string | undefined = vars.get('font-sans')
      expect(fontSans).toBeDefined()
      for (const font of expectedFonts) {
        expect(fontSans).toContain(font)
      }
    })

    test("数据元素（含 'data' 或 'mono' 的类）使用 'SF Mono'、'Menlo'", () => {
      const themeWxss: string = readFile(THEME_WXSS_PATH)

      // --font-mono 变量应定义 SF Mono 与 Menlo
      const vars: Map<string, string> = parseCssVariables(themeWxss)
      const fontMono: string | undefined = vars.get('font-mono')
      expect(fontMono).toBeDefined()
      expect(fontMono).toContain("'SF Mono'")
      expect(fontMono).toContain("'Menlo'")

      // 静态扫描所有 .wxss：含 data/mono 的选择器块若声明 font-family，
      // 应使用 var(--font-mono)，而非硬编码字体
      const wxssFiles: string[] = listWxssFiles(MINIPROGRAM_DIR)
      const violations: string[] = []
      for (const file of wxssFiles) {
        const content: string = readFile(file)
        const stripped: string = stripCssComments(content)
        // 按选择器块切分（粗略）：找到含 'data' 或 'mono' 的选择器块
        const ruleRegex = /([^{}]+)\{([^{}]*)\}/g
        let match: RegExpExecArray | null
        while ((match = ruleRegex.exec(stripped)) !== null) {
          const selector: string = match[1]
          const body: string = match[2]
          if (/\b(data|mono)\b/i.test(selector)) {
            if (body.includes('font-family')) {
              if (!body.includes('var(--font-mono)')) {
                violations.push(
                  `${relativeToMiniprogram(file)}: 选择器 "${selector.trim()}" 含 data/mono 但未使用 var(--font-mono)`
                )
              }
            }
          }
        }
      }

      // 至少应有 1 处使用 var(--font-mono)（确认设计令牌被消费）
      const allContent: string = wxssFiles
        .map((f: string) => readFile(f))
        .join('\n')
      const monoUsages: number =
        (allContent.match(/var\(--font-mono\)/g) || []).length
      expect(monoUsages).toBeGreaterThan(0)

      // 数据相关类不应硬编码字体（应通过 var 引用）
      expect(violations).toEqual([])
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 测试 3: 毛玻璃降级（静态）
  // ──────────────────────────────────────────────────────────────────────
  describe('SubTask 9.3 - 毛玻璃降级 (静态)', () => {
    test('所有 .wxss 不使用 backdrop-filter CSS 属性', () => {
      const wxssFiles: string[] = listWxssFiles(MINIPROGRAM_DIR)
      const violations: string[] = []
      for (const file of wxssFiles) {
        const content: string = readFile(file)
        const stripped: string = stripCssComments(content)
        // 仅匹配 backdrop-filter 作为 CSS 属性（后跟冒号），不匹配注释中提及的文本
        const match: RegExpMatchArray | null = stripped.match(
          /backdrop-filter\s*:/
        )
        if (match) {
          violations.push(
            `${relativeToMiniprogram(file)}: 检测到 backdrop-filter CSS 属性`
          )
        }
      }
      expect(violations).toEqual([])
    })

    test('使用 rgba(255,255,255,0.92) 作为毛玻璃降级背景', () => {
      const wxssFiles: string[] = listWxssFiles(MINIPROGRAM_DIR)
      const matches: string[] = []
      // 允许 rgba(255, 255, 255, 0.92) 或 rgba(255,255,255,0.92)
      const re = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.92\s*\)/
      for (const file of wxssFiles) {
        const content: string = readFile(file)
        const stripped: string = stripCssComments(content)
        if (re.test(stripped)) {
          matches.push(relativeToMiniprogram(file))
        }
      }
      // 至少 1 个文件应用降级模式（确认毛玻璃元素已降级为不透明背景）
      expect(matches.length).toBeGreaterThan(0)
    })

    test('tab bar / hairline 边框使用 border-top hairline + border-light 令牌', () => {
      const wxssFiles: string[] = listWxssFiles(MINIPROGRAM_DIR)
      const matches: string[] = []
      // spec 期望 border-top: 1px solid #F0F0F5；rpx 等价为 1rpx；
      // color 可用变量 var(--color-border-light) 或字面量 #F0F0F5
      const re = /border-top:\s*1rpx\s+solid\s+(var\(--color-border-light\)|#F0F0F5)/
      for (const file of wxssFiles) {
        const content: string = readFile(file)
        const stripped: string = stripCssComments(content)
        if (re.test(stripped)) {
          matches.push(relativeToMiniprogram(file))
        }
      }
      expect(matches.length).toBeGreaterThan(0)

      // app.json tabBar 应使用不透明白色背景（原生 tabBar 不支持毛玻璃，等价于降级）
      const appJson: AppJson = JSON.parse(readFile(APP_JSON_PATH)) as AppJson
      expect(appJson.tabBar).toBeDefined()
      expect(appJson.tabBar?.backgroundColor).toBe('#FFFFFF')
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 测试 4: 单位换算（静态）
  // ──────────────────────────────────────────────────────────────────────
  describe('SubTask 9.4 - 单位换算 (静态)', () => {
    test('font-size / padding / margin / width / height 使用 rpx，无硬编码非换算 px', () => {
      const wxssFiles: string[] = listWxssFiles(MINIPROGRAM_DIR)
      const violations: string[] = []

      for (const file of wxssFiles) {
        const content: string = readFile(file)
        const stripped: string = stripCssComments(content)
        const lines: string[] = stripped.split('\n')

        lines.forEach((line: string, idx: number) => {
          // 跳过 CSS 变量定义行（如 --radius-md: 8px;）
          // 这些是 token 定义，不是直接使用，允许 px
          if (/^\s*--/.test(line)) {
            return
          }
          // 跳过空行
          if (!line.trim()) {
            return
          }
          // 找到所有 \d+px 模式（允许小数）
          const pxRegex = /(\d+(?:\.\d+)?)px/g
          let m: RegExpExecArray | null
          while ((m = pxRegex.exec(line)) !== null) {
            const num: number = parseFloat(m[1])
            // 0px 与 1px 发丝线允许（spec 排除 1px borders 与 0）
            if (num === 0 || num === 1) {
              continue
            }
            violations.push(
              `${relativeToMiniprogram(file)}:${idx + 1} ${line.trim()} （应使用 rpx，1px = 2rpx）`
            )
            break // 一行只报一次
          }
        })
      }

      expect(violations).toEqual([])
    })

    test('rpx 单位被广泛使用（确认换算后的样式存在）', () => {
      const wxssFiles: string[] = listWxssFiles(MINIPROGRAM_DIR)
      let totalRpxUsages = 0
      for (const file of wxssFiles) {
        const content: string = readFile(file)
        const stripped: string = stripCssComments(content)
        const matches: RegExpMatchArray | null = stripped.match(/\d+rpx\b/g)
        if (matches) {
          totalRpxUsages += matches.length
        }
      }
      // 整个工程应大量使用 rpx（确认换算到位）
      expect(totalRpxUsages).toBeGreaterThan(50)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 测试 5: 逐页视觉对照（automator）
  // ──────────────────────────────────────────────────────────────────────
  describe('SubTask 9.5 - 逐页视觉对照 - 17 个设计稿 (automator)', () => {
    // 在 describe 回调顶部读取 automator：globalSetup 已运行，实例已就绪
    const automatorAtLoad: Automator | null = getAutomator()
    const index: DesignPagesIndex = loadFixture<DesignPagesIndex>(
      'design-pages-index.json'
    )
    const comparisonResults: PageComparisonResult[] = []

    beforeAll(() => {
      if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true })
      }
      if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
      }
    })

    afterAll(() => {
      // 生成对照报告（无论 automator 是否可用都生成）
      const passed: number = comparisonResults.filter(
        (r: PageComparisonResult) => r.status === 'passed'
      ).length
      const failed: number = comparisonResults.filter(
        (r: PageComparisonResult) => r.status === 'failed'
      ).length
      const skipped: number = comparisonResults.filter(
        (r: PageComparisonResult) => r.status === 'skipped'
      ).length
      const report: ComparisonReport = {
        generatedAt: new Date().toISOString(),
        automatorAvailable: automatorAtLoad !== null,
        totalMappings: index.mappings.length,
        passed,
        failed,
        skipped,
        pages: comparisonResults
      }
      fs.writeFileSync(
        COMPARISON_REPORT_PATH,
        JSON.stringify(report, null, 2),
        'utf-8'
      )
    })

    // 若 automator 不可用：注册一个跳过用例并填充 skipped 结果
    if (!automatorAtLoad) {
      test('automator 不可用，逐页视觉对照整体跳过', () => {
        // 结果在 afterAll 中写入报告
        for (const mapping of index.mappings) {
          comparisonResults.push({
            designHtml: mapping.designHtml,
            miniprogramPage: mapping.miniprogramPage,
            visualElements: mapping.visualElements,
            status: 'skipped',
            screenshotPath: null,
            diffs: [],
            notes: ['automator 不可用（沙箱未装微信开发者工具）']
          })
        }
        // 提示性日志（不失败用例）
        console.warn(
          '[ui-fidelity] automator 不可用，逐页视觉对照整体跳过；详见 reports/ui-fidelity-comparison.json'
        )
      })
      return
    }

    test.each(index.mappings)(
      '页面 $miniprogramPage 视觉对照',
      async (mapping: DesignPageMapping) => {
        const automator: Automator | null = getAutomator()
        if (!automator) {
          // 不应发生（外层已 guard），但保险起见
          comparisonResults.push({
            designHtml: mapping.designHtml,
            miniprogramPage: mapping.miniprogramPage,
            visualElements: mapping.visualElements,
            status: 'skipped',
            screenshotPath: null,
            diffs: [],
            notes: ['automator 在用例运行时不可用']
          })
          return
        }

        const diffs: string[] = []
        const notes: string[] = []
        const pageName: string = pagePathToFileName(mapping.miniprogramPage)
        const screenshotPath: string = path.join(
          SCREENSHOTS_DIR,
          `${pageName}.png`
        )

        // 1) 静态：检查页面 WXML/WXSS 文件存在
        if (!checkPageWxmlExists(mapping.miniprogramPage)) {
          diffs.push(
            `小程序页面 WXML 不存在：${mapping.miniprogramPage}/index.wxml`
          )
        }
        if (!checkDesignHtmlExists(mapping.designHtml)) {
          diffs.push(`设计稿 HTML 不存在：${mapping.designHtml}`)
        }

        // 2) 静态：检查页面 WXSS 使用 CSS 变量（而非硬编码颜色）
        const varCheck = analyzePageCssVariableUsage(mapping.miniprogramPage)
        notes.push(`页面 WXSS var() 引用 ${varCheck.varCount} 处`)
        if (!varCheck.usesVars) {
          diffs.push('页面 WXSS 未引用任何 CSS 变量（应通过 var(--color-*) 复用 token）')
        }
        if (varCheck.hardcodedHexCount > 0) {
          notes.push(
            `页面 WXSS 含 ${varCheck.hardcodedHexCount} 处硬编码 #RRGGBB（建议改为 var() 引用）`
          )
        }

        // 3) automator：跳转到页面，截图
        try {
          await automator.miniProgram.relaunch({
            path: mapping.miniprogramPage
          })
          // 等待渲染（best effort：800ms 给页面 onLoad/onShow 完成）
          await new Promise<void>((resolve: () => void): void => {
            setTimeout(resolve, 800)
          })

          // 截图（automator.screenshot 由 types.d.ts 声明）
          await automator.screenshot({ path: screenshotPath })
          notes.push(
            `截图已保存：${path.relative(REPO_ROOT, screenshotPath)}`
          )

          // 4) automator：评估当前页面路径，确认导航成功
          const currentPage: string = await automator.miniProgram.evaluate<string>(`
            try {
              var pages = getCurrentPages()
              var cur = pages[pages.length - 1]
              return cur ? cur.route : ''
            } catch (e) {
              return ''
            }
          `)
          if (currentPage !== mapping.miniprogramPage) {
            diffs.push(
              `导航后当前页面为 "${currentPage}"，期望 "${mapping.miniprogramPage}"`
            )
          }
        } catch (e) {
          const reason: string = e instanceof Error ? e.message : String(e)
          diffs.push(`automator 操作失败：${reason}`)
        }

        // 5) 记录关键视觉元素清单到 notes（供人工对照）
        notes.push(
          `关键视觉元素清单：${mapping.visualElements.join('、')}`
        )

        const status: 'passed' | 'failed' =
          diffs.length === 0 ? 'passed' : 'failed'

        comparisonResults.push({
          designHtml: mapping.designHtml,
          miniprogramPage: mapping.miniprogramPage,
          visualElements: mapping.visualElements,
          status,
          screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : null,
          diffs,
          notes
        })

        // 断言：所有 diff 必须为空（否则用例失败，但其它页面仍可继续运行）
        expect(diffs).toEqual([])
      }
    )
  })
})
