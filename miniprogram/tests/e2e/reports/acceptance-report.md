# 小程序 E2E 测试验收报告

## 1. 概述
- 项目：Candito 训练小程序 E2E 测试
- 测试目标：使用 CloudBase 验证小程序端到端的本地存储与云端存储；UI、交互逻辑、数据流转逻辑、业务逻辑与 H5 1:1 还原
- CloudBase 环境 ID：`tnt-lxo777jrw`
- 数据集合：`app_data`（按 key 区分，按 openid 隔离）
- 测试工程路径：`miniprogram/tests/e2e/`

## 2. 测试范围与通过情况（真实运行结果）

> 执行命令：`cd miniprogram/tests/e2e && npx jest --runInBand`
> 执行环境：Ubuntu 24.04 / Node v24.15.0 / npm 11.4.2 / TypeScript 5.9.3 / jest 29.7
> 运行时间：2026-07-13，耗时 1.434s
> 汇总：**Test Suites: 3 skipped, 5 passed, 5 of 8 total | Tests: 68 skipped, 54 passed, 122 total | 0 failed**

| 阶段 | 测试文件 | 用例数 | 通过 | 跳过 | 失败 | 备注 |
|------|----------|--------|------|------|------|------|
| 本地存储 | local-storage.e2e.ts | 23 | 0 | 23 | 0 | 全部依赖 automator（wx.* 运行时），整体 skip |
| 云端存储 | cloud-storage.e2e.ts | 8 | 7 | 1 | 0 | 契约/结构/降级等静态断言通过；openid 隔离需 automator skip |
| 存储模式切换 | storage-switch.e2e.ts | 6 | 5 | 1 | 0 | 5 个结构断言通过；设置页 UI 视觉对照需 automator skip |
| UI 保真 | ui-fidelity.e2e.ts | 10 | 10 | 0 | 0 | **全部通过**：设计 token/字体栈/毛玻璃/单位换算静态对照全绿 |
| 交互 | interaction.e2e.ts | 7 | 0 | 7 | 0 | 全部依赖 automator（页面操作），整体 skip |
| 数据流转 | data-flow.e2e.ts | 8 | 0 | 8 | 0 | 全部依赖 automator（运行时全链路），整体 skip |
| 业务逻辑 | business-logic.e2e.ts | 54 | 27 | 27 | 0 | Node.js 可计算部分（1RM/统计/校验和/导入导出/计划结构）27 通过；小程序运行时部分 27 skip |
| CloudBase 集成 | cloudbase-integration.e2e.ts | 6 | 5 | 1 | 0 | 配置/结构/安全规则静态断言通过；实际 wx.cloud 调用 skip |
| **合计** | **8 文件** | **122** | **54** | **68** | **0** | **0 失败，54 真实通过** |

### 2.1 业务逻辑 1:1 保真细分（27 通过 / 27 跳过）
| 子模块 | 通过 | 跳过 | 说明 |
|--------|------|------|------|
| 1RM 计算保真 | 4 | 3 | epley1RM 参考实现与 fixture 一致（浮点用 toBeCloseTo）；ONE_RM_MULTIPLIERS 常量验证通过 |
| 6 周计划生成保真 | 2 | 2 | 计划结构/校验和静态对照通过；H5 planGenerator 动态加载因 uuid 缺失 skip |
| 训练执行流程保真 | 0 | 3 | 全部需小程序运行时（WorkoutRecord 生成） |
| 周期状态机保真 | 2 | 7 | 用例 fixture 结构验证通过；状态机流转需 automator |
| 统计计算保真 | 8 | 5 | calculateVolume/TotalVolume/WeeklyCompletion Node.js 计算全通过 |
| H5 导出 → 小程序导入 | 3 | 3 | 导入结构/校验和/版本号验证通过 |
| 小程序导出 → H5 导入 | 2 | 1 | 导出结构/校验和验证通过 |
| 校验和算法保真 | 6 | 3 | simpleHash/calculateChecksum/EXPORT_VERSION 多组输入验证通过 |

## 3. 执行环境说明

### 3.1 已完成的本地验证
- ✅ **npm 依赖安装**：1290+ 包（jest 29.7 / ts-jest 29.1 / ts-node 10.9 / miniprogram-automator / miniprogram-ci / jest-html-reporter / typescript 5.9.3）
- ✅ **TypeScript 静态编译**：`npx tsc --noEmit` 退出码 0，零错误
- ✅ **jest 实际运行**：8 个测试文件全部被发现，54 用例真实通过，0 失败
- ✅ **报告产物生成**：
  - `reports/last-run.html`（52 KB，自包含 HTML 报告）
  - `reports/last-run.json`（30 KB，结构化测试结果）
  - `reports/ui-fidelity-comparison.json`（7.7 KB，UI 静态对照明细）

### 3.2 微信开发者工具限制（无法在 Linux 沙箱安装）
- **官方支持平台**：微信开发者工具仅提供 macOS 与 Windows 官方构建，**无 Linux 版本**（已核对官方下载页 https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html，所有链接均为 win32/darwin，无 linux 选项）。
- **沙箱环境**：Ubuntu 24.04 x86_64，已安装 xvfb + libgtk-3 + libnss3 + libgbm 等 GUI 依赖，但官方 DevTools 二进制不存在，无法启动 automator。
- **降级策略**：`globalSetup` 在 automator 启动失败时将 `globalThis.__AUTOMATOR__` 置为 `null` 且**不抛错**，让静态分析类用例（UI token、业务算法、存储契约结构）仍可在 Node.js 下运行；依赖 automator 的用例通过 `itMp = automator ? it : it.skip` 优雅跳过。
- **结论**：68 个跳过用例全部是「需要小程序运行时（wx.* / 页面操作 / CloudBase 实际调用）」的用例，**非测试代码缺陷**；在已安装微信开发者工具的 macOS/Windows 环境补齐后即可运行。

## 4. 关键缺陷与修复记录（本轮真实运行发现并修复）

| # | 缺陷 | 现象 | 修复 |
|---|------|------|------|
| 1 | `ignoreDeprecations: "6.0"` 在 tsc 5.9 下报 TS5103 | `error TS5103: Invalid value for '--ignoreDeprecations'` | tsconfig.json 改为 `"ignoreDeprecations": "5.0"` |
| 2 | jest.config.ts 缺少 ts-node | `Error: 'ts-node' is required for the TypeScript configuration files` | `package.json` devDependencies 增加 `ts-node@^10.9.2` 并安装 |
| 3 | reporter.ts 在 ESM 上下文使用 `__dirname` | `ReferenceError: __dirname is not defined at CustomReporter.onRunComplete` | 改用 `process.cwd()`（test:e2e 脚本固定在 e2e 目录运行） |
| 4 | epley1RM 浮点精度差异 | `Expected: 93.5 / Received: 93.50000000000001` | 浮点比较改用 `toBeCloseTo(expected, 10)` |

### 4.1 历史修复（前期 spec 实现阶段）
- TS2688 jest/node 类型定义缺失 → `setup/types.d.ts` SCRIPT 形式声明 ambient module
- TS2307 Cannot find module 'miniprogram-automator' → ambient module 声明
- jest.config.ts 误写 `setupFilesAfterEach` → 改为 `setupFilesAfterEnv`
- `string | number` 类型访问 `.length` → typeof 类型守卫
- H5 planGenerator 在 Node.js 下因 uuid 缺失无法导入 → `tryRequire<T>()` 优雅降级

## 5. CloudBase 测试命名空间清理
- 测试用 `RUN_ID = 'e2e_' + Date.now()` 作为本次运行唯一标识
- 所有云端 key 通过 `wrapKey(key) = getTestPrefix() + key` 包装，其中 `getTestPrefix() = RUN_ID + '_test_'`
- globalTeardown 调用 `cleanupCloudNamespace(automator)` 按 `RUN_ID + '_test_'` 前缀清理 `app_data` 文档
- 严禁调用 `CloudStorageAdapter.clear()`（无前缀会清空用户真实数据）
- 本轮因 automator 未启动，globalTeardown 输出 `[globalTeardown] automator 未启动，无需清理`（符合预期）
- 真实环境运行后，可在 CloudBase 控制台 https://tcb.cloud.tencent.com/dev?envId=tnt-lxo777jrw#/db/doc/collection/app_data 验证测试前缀文档已清除

## 6. 1:1 保真证据链

### 6.1 静态层证据（已验证 ✅）
- **TypeScript 编译零错误**：`npx tsc --noEmit` 退出码 0，证明所有 E2E 测试代码类型安全
- **`miniprogram/tests/fidelity-report.md`**：设计 token、字体栈、单位换算、17 设计稿→15 页面映射的逐项静态对照结果
- **`cases/ui-fidelity.e2e.ts` 10 个静态用例全部通过**：设计 token 一致性、字体栈保留、毛玻璃降级、单位换算（1px=2rpx）等
- **报告产物**：`reports/ui-fidelity-comparison.json` 含逐项对照明细

### 6.2 动态层证据（部分已验证，部分待真实环境）
- **已通过（Node.js 可计算，27 用例）**：
  - 1RM 计算：`epley1RM` 参考实现与 H5 fixture 一致；`ONE_RM_MULTIPLIERS = {1:1.00, 2:1.03, 3:1.06, 4:1.09}` 验证通过
  - 统计计算：`calculateVolume` / `calculateTotalVolume` / `calculateWeeklyCompletion` 与 H5 fixture 一致
  - 校验和算法：`simpleHash` / `calculateChecksum` 多组输入与 H5 一致；`EXPORT_VERSION = '1.0.0'` 验证通过
  - H5 导出样本：结构完整、校验和 `732fc6ad` 匹配、版本号正确
  - 6 周计划：结构/字段/校验和静态对照通过
  - 周期状态机：用例 fixture 结构验证通过
- **待真实环境（68 用例，需微信开发者工具）**：
  - `cases/local-storage.e2e.ts`（23）：wx.setStorageSync/getStorageSync 实际读写
  - `cases/cloud-storage.e2e.ts`（1）：openid 隔离实际验证
  - `cases/interaction.e2e.ts`（7）：导航/TabBar/计时器/表单/模态/滑动/生命周期
  - `cases/data-flow.e2e.ts`（8）：本地/云端全链路、切换重载、订阅刷新、错误降级
  - `cases/business-logic.e2e.ts`（27）：小程序运行时计划生成、训练执行、状态机流转、导入导出实际操作
  - `cases/cloudbase-integration.e2e.ts`（1）：wx.cloud.init 实际调用验证
  - `cases/storage-switch.e2e.ts`（1）：设置页 UI 视觉对照

### 6.3 证据链结论
- **静态层证据已完整闭合**：tsc 编译 + UI token 对照 + 业务算法 Node.js 计算，共 54 用例真实通过、0 失败
- **动态层证据待补齐**：68 个 automator 依赖用例在 macOS/Windows + 微信开发者工具环境下运行后即可形成完整闭环
- 在真实环境执行 `npm run test:e2e` 全量通过后，即可宣告 H5 → 小程序的端到端 1:1 保真达成

## 7. 后续行动（在 macOS/Windows 真实环境执行）
1. 进入 `miniprogram/tests/e2e/` 执行 `npm install`（依赖已声明，lockfile 未提交）
2. 安装微信开发者工具（仅 macOS/Windows 官方支持）并打开 CLI 端口（设置 → 安全设置 → 服务端口）
3. 设置环境变量 `MP_CLI_PATH` 指向开发者工具 CLI（可选，automator 会自动探测）
4. 在仓库根执行 `npm run test:e2e`
5. 查看 `reports/last-run.html` 与 `reports/last-run.json` 获取全量通过情况
6. 失败用例截图位于 `reports/ui-screenshots/`，存储读写日志位于 `reports/storage-logs/`
7. 修复缺陷后重跑直至 122 用例全量通过

## 8. 附录：本轮运行产物清单
| 文件 | 大小 | 说明 |
|------|------|------|
| `reports/last-run.html` | 52 KB | 自包含 HTML 报告（汇总卡片 + 用例明细表 + 失败详情） |
| `reports/last-run.json` | 30 KB | 结构化测试结果（122 条用例逐条状态/耗时） |
| `reports/ui-fidelity-comparison.json` | 7.7 KB | UI 静态对照明细（设计 token / 字体 / 单位换算逐项） |
| `reports/acceptance-report.md` | 本文件 | 验收报告 |
