// 全局类型声明（SCRIPT 文件：无顶层 import/export，所有声明为全局/环境声明）
//
// 1) 声明 miniprogram-automator / jest-html-reporter 模块（沙箱未安装时让 tsc 通过）
// 2) 全局 Automator / MiniProgram / LaunchOptions 接口（供 setup 各模块与用例直接引用）
// 3) globalThis.__AUTOMATOR__ 全局变量（global-setup 写入，reset / 用例读取）
//
// 说明：作为 SCRIPT 文件，`declare module 'foo'` 创建环境模块声明（而非模块增强），
// 这是声明未类型化依赖的最可靠形式。

interface MiniProgramEvaluateOptions {
  path?: string
  args?: Record<string, unknown>
}

/** miniprogram-automator 元素接口（仅声明测试用到的子集） */
interface Element {
  /** 模拟用户点击 */
  tap(): Promise<void>
  /** 模拟输入（input/textarea） */
  input(value: string): Promise<void>
  /** 触发事件（如 bindtap/bindinput） */
  trigger(type: string, detail?: Record<string, unknown>): Promise<void>
  /** 读取元素属性 */
  attribute(name: string): Promise<string>
  /** 元素外部 WXML */
  outerWxml(): Promise<string>
  /** 元素内部 WXML */
  innerWxml(): Promise<string>
  /** 元素 dataset */
  data<T = Record<string, unknown>>(): Promise<T>
}

/** miniprogram-automator 页面接口（仅声明测试用到的子集） */
interface Page {
  /** 页面路径 */
  path: string
  /** 读取页面 data 对象 */
  data<T = Record<string, unknown>>(): Promise<T>
  /** 按选择器查询单个元素（找不到时抛错） */
  $(selector: string): Promise<Element>
  /** 按选择器查询全部元素 */
  $$(selector: string): Promise<Element[]>
  /** 调用页面方法 */
  callMethod(name: string, ...args: unknown[]): Promise<unknown>
  /** 等待条件（如元素出现） */
  waitFor(condition: string): Promise<void>
}

interface MiniProgram {
  /** 在小程序运行时执行 JS 字符串 */
  evaluate<T = unknown>(
    script: string,
    options?: MiniProgramEvaluateOptions
  ): Promise<T>
  /** 重新启动到指定页面 */
  relaunch<T = unknown>(options?: { path?: string }): Promise<T>
  /** 当前页面栈 */
  pageStack(): Promise<Page[]>
  /** 获取当前栈顶页面 */
  currentPage?(): Promise<Page>
  /** 关闭小程序连接 */
  close?(): Promise<void>
  /** 保留页面跳转（对应 wx.navigateTo） */
  navigateTo(url: string): Promise<unknown>
  /** tab 页跳转（对应 wx.switchTab） */
  switchTab(url: string): Promise<unknown>
  /** 返回（对应 wx.navigateBack） */
  navigateBack(delta?: number): Promise<unknown>
}

interface ScreenshotOptions {
  path?: string
}

interface Automator {
  readonly miniProgram: MiniProgram
  /** 关闭 automator 与开发者工具连接 */
  close(): Promise<void>
  /** 断开连接（不退出开发者工具） */
  disconnect(): Promise<void>
  /** 获取当前栈顶页面 */
  currentPage?(): Promise<Page>
  /** 截图，返回图片 base64；指定 path 时同步写文件 */
  screenshot(options?: ScreenshotOptions): Promise<string>
}

interface LaunchOptions {
  projectPath: string
  cliPath?: string
  port?: number
  timeout?: number
}

declare module 'miniprogram-automator' {
  export function launch(options: LaunchOptions): Promise<Automator>
}

declare module 'jest-html-reporter' {
  interface JestHTMLReporterOptions {
    outputPath?: string
    pageTitle?: string
    includeFailureMsg?: boolean
    includeConsoleLog?: boolean
    theme?: string
    append?: boolean
  }
  function reporter(
    globalConfig: unknown,
    options: JestHTMLReporterOptions
  ): unknown
  export = reporter
}

// ──────────────────────────────────────────────────────────────────────
// @jest/types 最小类型定义（沙箱未安装 @jest/types 时的 fallback）
// 真实环境 `npm install` 后由完整 @jest/types 取代，以下声明与之兼容。
// 仅声明 CustomReporter 用到的字段；type-only import 在编译期擦除，
// 运行时无需 @jest/types 包存在。
// ──────────────────────────────────────────────────────────────────────

declare module '@jest/types' {
  export interface ReporterOnStartOptions {
    estimatedTime: number
    showStatus: boolean
  }

  export interface AssertionResult {
    ancestorTitles: string[]
    fullName: string
    title: string
    status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo' | 'disabled'
    duration?: number | null
    failureMessages: string[]
  }

  export interface TestResult {
    testResults: AssertionResult[]
    [key: string]: unknown
  }

  export interface AggregatedResult {
    numTotalTests: number
    numPassedTests: number
    numFailedTests: number
    numPendingTests: number
    numTodoTests: number
    startTime: number
    [key: string]: unknown
  }

  export interface TestContext {
    config: { rootDir: string; [key: string]: unknown }
  }

  export interface Test {
    context: TestContext
    path: string
  }

  export interface Reporter {
    onRunStart?(
      results: AggregatedResult,
      options: ReporterOnStartOptions
    ): void | Promise<void>
    onTestResult?(
      test: Test,
      testResult: TestResult,
      aggregatedResult: AggregatedResult
    ): void | Promise<void>
    onRunComplete?(
      contexts: Set<TestContext>,
      results: AggregatedResult
    ): void | Promise<void>
    getLastError?(): Error | void
  }
}

// globalThis 扩展：automator 实例（由 global-setup.ts 写入，reset.ts / 用例读取）
declare var __AUTOMATOR__: Automator | null

// ──────────────────────────────────────────────────────────────────────
// 沙箱 fallback @types/node / @types/jest 补丁
//
// /workspace/miniprogram/tests/e2e/node_modules/@types/{node,jest} 为
// sandbox-fallback 最小桩，缺少 readdirSync / path.relative / toBeGreaterThan /
// test.each 等。真实环境 `npm install` 后由完整 @types 取代，以下声明与之合并
// （declaration merging）而不冲突。
// ──────────────────────────────────────────────────────────────────────

declare module 'fs' {
  export interface Dirent {
    name: string
    isDirectory(): boolean
    isFile(): boolean
    isBlockDevice(): boolean
    isCharacterDevice(): boolean
    isSymbolicLink(): boolean
    isFIFO(): boolean
    isSocket(): boolean
  }
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[]
  export function readdirSync(
    path: string,
    options?: { withFileTypes?: false; encoding?: string }
  ): string[]
  export function appendFileSync(
    path: string,
    data: string,
    options?: string | { encoding?: string; flag?: string; mode?: number }
  ): void
}

declare module 'path' {
  export function relative(from: string, to: string): string
  export function parse(p: string): {
    root: string
    dir: string
    base: string
    ext: string
    name: string
  }
}

// Jest matchers 补丁：sandbox fallback @types/jest 缺少数值比较与长度断言
interface JestMatchers<T> {
  toBeGreaterThan(n: number): void
  toBeGreaterThanOrEqual(n: number): void
  toBeLessThan(n: number): void
  toBeLessThanOrEqual(n: number): void
}

// Jest test.each：sandbox fallback @types/jest 缺少 each 方法
interface JestEachTable<T> {
  (name: string, fn: (arg: T) => void | Promise<unknown>, timeout?: number): void
  only(name: string, fn: (arg: T) => void | Promise<unknown>, timeout?: number): void
  skip(name: string, fn: (arg: T) => void | Promise<unknown>, timeout?: number): void
}

interface JestIt {
  each<T>(table: ReadonlyArray<T>): JestEachTable<T>
}
