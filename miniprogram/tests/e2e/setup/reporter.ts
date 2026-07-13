// reporter.ts — 自定义 jest reporter，生成 JSON + HTML 双格式报告
//
// 功能：
//   - OnRunStart:    记录运行开始时间，初始化报告结构
//   - OnTestResult:  收集每个用例的结果（名称、状态、耗时、失败信息）
//   - OnRunComplete: 写入 reports/last-run.json 与 reports/last-run.html
//
// 即使 globalSetup 失败（automator 不可用），onRunComplete 仍会被 jest 调用，
// 此时 results 为空但报告正常生成（0 用例），便于排查环境问题。
//
// HTML 报告自包含（内联 CSS，无外部依赖），包含：
//   - 标题 + 运行时间戳
//   - 汇总卡片（总数 / 通过 / 失败 / 跳过）
//   - 用例明细表（状态徽章 + 耗时）
//   - 失败用例展开详情（失败消息）

import type {
  Reporter,
  ReporterOnStartOptions,
  Test,
  TestContext,
  TestResult,
  AggregatedResult
} from '@jest/types'
import * as fs from 'fs'
import * as path from 'path'

// ---------- 报告数据结构 ----------

type TestCaseStatus = 'passed' | 'failed' | 'skipped'

interface TestCaseEntry {
  describeBlock: string
  testName: string
  status: TestCaseStatus
  duration: number
  failureMessages: string[]
}

interface ReportData {
  runId: string
  startedAt: string
  completedAt: string
  duration: number
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  results: TestCaseEntry[]
}

// ---------- CustomReporter ----------

export default class CustomReporter implements Reporter {
  private readonly runId: string
  private readonly startedAt: Date
  private readonly entries: TestCaseEntry[]

  constructor() {
    this.runId = `run_${Date.now()}`
    this.startedAt = new Date()
    this.entries = []
  }

  onRunStart(
    _results: AggregatedResult,
    _options: ReporterOnStartOptions
  ): void {
    console.log(
      `[CustomReporter] 测试运行开始：${this.startedAt.toISOString()}（runId=${this.runId}）`
    )
  }

  onTestResult(
    _test: Test,
    testResult: TestResult,
    _aggregatedResult: AggregatedResult
  ): void {
    const assertions = testResult.testResults ?? []
    for (const assertion of assertions) {
      // 跳过 todo / disabled 状态（不计入正式用例）
      if (assertion.status === 'todo' || assertion.status === 'disabled') {
        continue
      }
      const status: TestCaseStatus = this.normalizeStatus(assertion.status)
      this.entries.push({
        describeBlock: (assertion.ancestorTitles ?? []).join(' > '),
        testName: assertion.title ?? '',
        status,
        duration: typeof assertion.duration === 'number' ? assertion.duration : 0,
        failureMessages: assertion.failureMessages ?? []
      })
    }
  }

  async onRunComplete(
    _contexts: Set<TestContext>,
    results: AggregatedResult
  ): Promise<void> {
    const completedAt = new Date()
    const data: ReportData = {
      runId: this.runId,
      startedAt: this.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      duration: completedAt.getTime() - this.startedAt.getTime(),
      totalTests: results.numTotalTests ?? 0,
      passedTests: results.numPassedTests ?? 0,
      failedTests: results.numFailedTests ?? 0,
      skippedTests: (results.numPendingTests ?? 0) + (results.numTodoTests ?? 0),
      results: this.entries
    }

    const reportsDir = path.resolve(__dirname, '..', 'reports')
    this.ensureDir(reportsDir)

    const jsonPath = path.join(reportsDir, 'last-run.json')
    const htmlPath = path.join(reportsDir, 'last-run.html')
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.writeFileSync(htmlPath, buildHtmlReport(data), 'utf-8')

    console.log(`[CustomReporter] JSON 报告：${jsonPath}`)
    console.log(`[CustomReporter] HTML 报告：${htmlPath}`)
  }

  getLastError(): void {
    // 无错误；返回 void 让 jest 正常退出
  }

  // ---------- 内部方法 ----------

  private normalizeStatus(
    raw: string
  ): TestCaseStatus {
    if (raw === 'passed') return 'passed'
    if (raw === 'failed') return 'failed'
    // pending / skipped / 其它均归为 skipped
    return 'skipped'
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

// ---------- HTML 报告生成 ----------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function statusBadge(status: TestCaseStatus): string {
  const labels: Record<TestCaseStatus, string> = {
    passed: '通过',
    failed: '失败',
    skipped: '跳过'
  }
  return `<span class="badge badge-${status}">${labels[status]}</span>`
}

function buildHtmlReport(data: ReportData): string {
  const rows = data.results
    .map(
      (entry, idx) => `
        <tr class="row-${entry.status}">
          <td>${idx + 1}</td>
          <td class="col-describe">${escapeHtml(entry.describeBlock)}</td>
          <td class="col-name">${escapeHtml(entry.testName)}</td>
          <td class="col-status">${statusBadge(entry.status)}</td>
          <td class="col-duration">${entry.duration}</td>
        </tr>${
          entry.status === 'failed' && entry.failureMessages.length > 0
            ? `
        <tr class="row-detail">
          <td colspan="5">
            <details open>
              <summary>失败详情（${entry.failureMessages.length} 条）</summary>
              <pre class="failure-msg">${escapeHtml(entry.failureMessages.join('\n\n---\n\n'))}</pre>
            </details>
          </td>
        </tr>`
            : ''
        }`
    )
    .join('')

  const passRate =
    data.totalTests > 0
      ? Math.round((data.passedTests / data.totalTests) * 100)
      : 0

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Candito 小程序 E2E 测试报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: #F5F5F7;
      color: #1D1D1F;
      padding: 24px;
      line-height: 1.6;
    }
    header {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 24px 32px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .timestamps {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      font-size: 14px;
      color: #6E6E73;
    }
    .timestamps span { display: inline-flex; gap: 6px; }
    .timestamps .label { font-weight: 500; color: #1D1D1F; }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .card .num {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.2;
    }
    .card .label {
      font-size: 14px;
      color: #6E6E73;
      margin-top: 4px;
    }
    .card.total .num { color: #1D1D1F; }
    .card.passed .num { color: #34C759; }
    .card.failed .num { color: #FF3B30; }
    .card.skipped .num { color: #FF9500; }
    .pass-rate {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 16px 24px;
      margin-bottom: 24px;
      font-size: 14px;
      color: #6E6E73;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .pass-rate strong { color: #1D1D1F; font-size: 18px; }
    .details {
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .details h2 {
      font-size: 18px;
      font-weight: 600;
      padding: 20px 24px 12px;
      border-bottom: 1px solid #F0F0F5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      text-align: left;
      padding: 12px 24px;
      background: #FAFAFA;
      color: #6E6E73;
      font-weight: 500;
      font-size: 13px;
      border-bottom: 1px solid #F0F0F5;
    }
    td {
      padding: 12px 24px;
      border-bottom: 1px solid #F0F0F5;
      vertical-align: top;
    }
    tr.row-detail td { padding: 0 24px 12px; background: #FFF5F5; }
    tr.row-detail details { padding: 8px 0; }
    tr.row-detail summary {
      cursor: pointer;
      font-size: 13px;
      color: #FF3B30;
      font-weight: 500;
      padding: 4px 0;
    }
    .failure-msg {
      margin-top: 8px;
      padding: 12px 16px;
      background: #FFF5F5;
      border-radius: 8px;
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      font-size: 12px;
      color: #1D1D1F;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
    }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-passed { background: #E8F8EC; color: #248A3D; }
    .badge-failed { background: #FFEEEE; color: #D70015; }
    .badge-skipped { background: #FFF4E6; color: #C96600; }
    .col-duration { font-family: 'SF Mono', 'Menlo', monospace; text-align: right; }
    .empty {
      padding: 48px 24px;
      text-align: center;
      color: #6E6E73;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Candito 小程序 E2E 测试报告</h1>
    <div class="timestamps">
      <span><span class="label">开始：</span>${data.startedAt}</span>
      <span><span class="label">完成：</span>${data.completedAt}</span>
      <span><span class="label">耗时：</span>${data.duration} ms</span>
      <span><span class="label">RunID：</span>${escapeHtml(data.runId)}</span>
    </div>
  </header>

  <section class="summary">
    <div class="card total">
      <div class="num">${data.totalTests}</div>
      <div class="label">用例总数</div>
    </div>
    <div class="card passed">
      <div class="num">${data.passedTests}</div>
      <div class="label">通过</div>
    </div>
    <div class="card failed">
      <div class="num">${data.failedTests}</div>
      <div class="label">失败</div>
    </div>
    <div class="card skipped">
      <div class="num">${data.skippedTests}</div>
      <div class="label">跳过</div>
    </div>
  </section>

  <div class="pass-rate">
    通过率：<strong>${passRate}%</strong>（${data.passedTests}/${data.totalTests}）
  </div>

  <section class="details">
    <h2>用例明细</h2>
    ${
      data.results.length === 0
        ? '<div class="empty">无用例结果（可能 globalSetup 失败或未匹配到用例文件）</div>'
        : `<table>
      <thead>
        <tr>
          <th>#</th>
          <th>Describe</th>
          <th>用例名</th>
          <th>状态</th>
          <th>耗时 (ms)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`
    }
  </section>
</body>
</html>`
}
