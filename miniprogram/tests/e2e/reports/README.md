# E2E 测试报告产物

本目录存放 Candito 小程序 E2E 测试的运行产物。每次运行 `npm run test:e2e` 后由自定义 reporter（`setup/reporter.ts`）自动生成。

## 目录结构

| 路径 | 说明 | 生成方 |
|------|------|--------|
| `last-run.html` | 最近一次运行的 HTML 报告（自包含，内联 CSS，含汇总卡片 + 用例明细 + 失败详情） | `setup/reporter.ts` |
| `last-run.json` | 最近一次运行的 JSON 报告（结构化数据，可供 CI 消费） | `setup/reporter.ts` |
| `ui-screenshots/` | UI 对照截图（小程序页面截图，按用例名命名 `<caseName>.png`） | `setup/screenshot.ts` |
| `storage-logs/` | 存储读写日志（按用例名分文件 `<test-name>.log`，记录 get/set/remove/list/clear 操作） | `setup/storage-logger.ts` |

## JSON 报告结构

```typescript
{
  runId: string,        // 时间戳生成，如 run_1720000000000
  startedAt: string,    // ISO 8601 开始时间
  completedAt: string,  // ISO 8601 完成时间
  duration: number,     // 总耗时（毫秒）
  totalTests: number,
  passedTests: number,
  failedTests: number,
  skippedTests: number,
  results: Array<{
    describeBlock: string,
    testName: string,
    status: 'passed' | 'failed' | 'skipped',
    duration: number,
    failureMessages: string[]
  }>
}
```

## 日志格式

存储日志每行格式：
```
[2026-07-13T10:30:00.000Z] SET key=candito_cycles valueSummary={id:test-cycle...}
[2026-07-13T10:30:01.000Z] GET key=candito_settings
[2026-07-13T10:30:02.000Z] REMOVE key=candito_active_cycle
```

## 最近运行索引

> 由开发者手动维护，建议保留最近 10 次运行记录。如需归档，请在运行后手动复制 `last-run.*` 并重命名（如 `run-<timestamp>.html`）。

| 日期 | runId | 用例总数 | 通过 | 失败 | 跳过 | 通过率 | 备注 |
|------|-------|---------|------|------|------|--------|------|
| -    | -     | -       | -    | -    | -    | -      | 暂无记录 |

## 说明

- `last-run.*` 每次运行覆盖；`ui-screenshots/` 与 `storage-logs/` 内文件按用例名组织，同样每次运行覆盖。
- 除 `README.md` 外，其余产物已在 `.gitignore` 中忽略，不会提交到版本库。
- 若 `globalSetup` 失败（如微信开发者工具未启动），报告仍会生成（0 用例），便于排查环境问题。
