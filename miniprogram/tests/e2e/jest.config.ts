// jest 配置：ts-jest preset，60s 超时，仅收集 cases/**/*.e2e.ts。
// globalSetup 启动 automator + CloudBase 初始化；globalTeardown 清理云端命名空间 + 关闭 automator。
// setupFilesAfterEnv 加载 reset.ts，在每个用例前注册 beforeEach 重置存储。

const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  // 仅收集 cases 目录下的 *.e2e.ts 作为用例
  testMatch: ['**/cases/**/*.e2e.ts'],
  // 全局启动 / 关闭：启动 automator 与 CloudBase 初始化，结束后清理云端命名空间
  globalSetup: '<rootDir>/setup/global-setup.ts',
  globalTeardown: '<rootDir>/setup/global-teardown.ts',
  // 每个用例文件加载后、框架就绪后注册 beforeEach 钩子，重置本地存储 + 云端测试命名空间 + 模式
  setupFilesAfterEnv: ['<rootDir>/setup/reset.ts'],
  reporters: [
    'default',
    // jest-html-reporter 作为 fallback：若自定义 reporter 在 onRunComplete 阶段崩溃，
    // 仍保留基础 HTML 报告。自定义 reporter 在其后运行，其 HTML 输出覆盖此文件。
    [
      'jest-html-reporter',
      {
        outputPath: '<rootDir>/reports/last-run.html',
        pageTitle: 'Candito 小程序 E2E 测试报告',
        includeFailureMsg: true,
        includeConsoleLog: true
      }
    ],
    // 自定义 reporter：生成 last-run.json + 自包含 HTML（覆盖 jest-html-reporter 输出）
    '<rootDir>/setup/reporter.ts'
  ]
}

export default config
