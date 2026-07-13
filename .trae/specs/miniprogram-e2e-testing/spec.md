# 小程序端到端测试 Spec（CloudBase + 本地/云端存储 + H5 1:1 还原验证）

## Why
小程序原生重构已进入收尾阶段（参考 `wechat-mini-program-adaptation` spec），但现有验证只覆盖了纯逻辑算法的字节级 diff（`miniprogram/tests/fidelity-report.md`），尚无端到端的存储、UI、交互、数据流转、业务逻辑的对照验证体系。在 H5 → 小程序双端发布前，必须建立一套基于 CloudBase 的端到端测试，**同时验证本地存储（`wx.setStorageSync`）与云端存储（CloudBase 云数据库）两条数据通路**，并以原 H5 项目为"金标准"对照，证明 UI、交互、数据流转、业务逻辑 1:1 还原，否则双端数据互通不可信、云端账户隔离不可信、发布后回归无网。

## What Changes
- 新增 `miniprogram/tests/e2e/` 目录作为端到端测试工程根，包含：测试入口、测试用例、对照基准、运行脚本、报告产物
- 引入端到端测试工具链：`miniprogram-automator`（小程序自动化）+ `miniprogram-ci`（预览/真机包）+ `jest`（断言）+ `ts-jest`（TS 支持）
- 在测试工程内提供 CloudBase 测试环境初始化能力：基于 `wx.cloud` + `app_data` collection，按 openid 隔离验证
- 新增本地存储 E2E 用例：覆盖 `LocalStorageAdapter` 的 `get/set/remove/list/clear`、5 类 storage key 命名、JSON 结构与 H5 等价、跨页面数据流转
- 新增云端存储 E2E 用例：覆盖 `CloudStorageAdapter` 的 `get/set/remove/list/clear`、CloudBase 初始化前置、openid 隔离、collection `app_data` 读写、网络错误降级
- 新增存储模式切换 E2E 用例：覆盖设置页"数据存储"区块、云端↔本地切换的二次确认 `wx.showModal`、切换后各 store 重新 `init()`、空后端提示、未登录态引导
- 新增 UI 1:1 保真 E2E 用例：以 `_design_extracted/pages/` 下 17 个设计稿 HTML 为基准，对 15 个小程序页面（休息日状态合并到今日训练）逐页对照渲染结果（背景色、卡片、按钮、字号、间距、圆角、阴影、字体栈）
- 新增交互逻辑 1:1 保真 E2E 用例：覆盖导航（`wx.navigateTo` / `wx.switchTab`）、TabBar 切换、计时器启停、表单录入、`wx.showModal` 二次确认、滑动返回、`onLoad/onShow/onHide/onUnload` 订阅生命周期，对照 H5 Vue Router + Pinia 行为
- 新增数据流转 E2E 用例：覆盖 `页面事件 → store 方法 → storageManager.getActiveAdapter() → LocalStorageAdapter 或 CloudStorageAdapter → 渲染刷新` 全链路；store `subscribe` 通知触发视图刷新；存储后端切换后数据重新加载
- 新增业务逻辑 1:1 保真 E2E 用例：在已有的 `fidelity-report.md` 静态对照基础上，加入运行时端到端验证——1RM 计算、6 周计划生成、训练执行流程、周期状态机、错过训练处理、第 6 周决策、统计计算、导入导出格式（H5 导出 ↔ 小程序导入双向兼容）
- 新增 CloudBase 集成 E2E 用例：覆盖 `wx.cloud.init`、openid 隔离、跨用户数据不可见、collection 权限规则、`app_data` 文档结构、CloudBase 控制台数据可视化核对
- **不修改**主干 H5 代码（`candito-v4-training-app/`）与已落地的小程序业务代码（`miniprogram/` 下源码），仅新增测试代码与必要的测试钩子（如测试专用 `__test__` 入口、`storageManager` 的 reset 注入点）
- **BREAKING**：无（仅测试工程，对发布产物零影响）

## Impact
- Affected specs:
  - `wechat-mini-program-adaptation`（被测对象，本 spec 不修改其源码，仅消费其测试钩子）
  - `candito-v4-training-app`（H5 金标准对照源，仅只读引用）
- Affected code（均为新增）：
  - `miniprogram/tests/e2e/` 整个目录（测试入口、用例、fixtures、运行脚本、报告产物）
  - `miniprogram/tests/e2e/jest.config.ts`、`miniprogram/tests/e2e/tsconfig.json`、`miniprogram/tests/e2e/package.json`
  - `miniprogram/tests/e2e/setup/`（CloudBase 测试环境初始化、automator 启动器）
  - `miniprogram/tests/e2e/cases/local-storage.e2e.ts`、`cloud-storage.e2e.ts`、`storage-switch.e2e.ts`
  - `miniprogram/tests/e2e/cases/ui-fidelity.e2e.ts`、`interaction.e2e.ts`、`data-flow.e2e.ts`、`business-logic.e2e.ts`
  - `miniprogram/tests/e2e/cases/cloudbase-integration.e2e.ts`
  - `miniprogram/tests/e2e/fixtures/`（对照基准数据：H5 导出的 JSON、设计稿快照）
  - `miniprogram/tests/e2e/reports/`（运行产物：测试报告、UI 对照截图、存储读写日志）
  - 根级 `package.json` 新增 `test:e2e` 脚本与 devDependencies（jest、miniprogram-automator、miniprogram-ci、ts-jest）

## 架构设计

### 测试工具链
| 层级 | 工具 | 说明 |
|------|------|------|
| 自动化驱动 | `miniprogram-automator` | 启动微信开发者工具，操控页面、组件、数据 |
| 构建/预览 | `miniprogram-ci` | 上传测试包、获取预览二维码（真机回归用） |
| 断言框架 | `jest` + `ts-jest` | 用例组织、断言、报告 |
| H5 对照源 | `candito-v4-training-app/` | 只读引用 H5 源码与导出 JSON，作为金标准 |
| 设计基准 | `_design_extracted/pages/*.html` | 17 个设计稿，UI 保真对照基准 |
| CloudBase | `wx.cloud.database()` | 云端存储 E2E 实际后端，使用 `tnt-lxo777jrw` 环境 |
| 报告产物 | `miniprogram/tests/e2e/reports/` | HTML/JSON 报告 + 失败截图 |

### 工程目录结构
```
/workspace/
├── miniprogram/
│   ├── tests/
│   │   ├── fidelity-report.md            # 已存在（Task 6A 静态对照），本 spec 引用不修改
│   │   └── e2e/                          # 新增：E2E 测试工程
│   │       ├── package.json              # jest + miniprogram-automator + miniprogram-ci 依赖
│   │       ├── jest.config.ts            # jest 配置（preset ts-jest，超时 60s）
│   │       ├── tsconfig.json             # 测试 TS 配置
│   │       ├── README.md                 # 运行说明（仅在必要时创建）
│   │       ├── setup/
│   │       │   ├── automator.ts          # 启动/关闭 miniprogram-automator
│   │       │   ├── cloudbase.ts          # CloudBase 测试环境初始化与清理
│   │       │   ├── fixtures.ts           # 加载 fixtures 数据
│   │       │   └── reset.ts              # 每个用例前重置 storage 与 store 状态
│   │       ├── cases/
│   │       │   ├── local-storage.e2e.ts          # 本地存储 E2E
│   │       │   ├── cloud-storage.e2e.ts          # 云端存储 E2E
│   │       │   ├── storage-switch.e2e.ts         # 存储模式切换 E2E
│   │       │   ├── ui-fidelity.e2e.ts            # UI 1:1 保真 E2E
│   │       │   ├── interaction.e2e.ts            # 交互逻辑 1:1 保真 E2E
│   │       │   ├── data-flow.e2e.ts              # 数据流转 E2E
│   │       │   ├── business-logic.e2e.ts         # 业务逻辑 1:1 保真 E2E
│   │       │   └── cloudbase-integration.e2e.ts  # CloudBase 集成 E2E
│   │       ├── fixtures/
│   │       │   ├── h5-export-sample.json        # H5 导出的标准 JSON（含 cycles/records/metrics/settings）
│   │       │   ├── plan-input.json              # 6 周计划生成输入（oneRM/unit/rounding/startDate）
│   │       │   ├── plan-expected-h5.json        # H5 planGenerator 输出（金标准）
│   │       │   ├── stats-input.json             # 统计计算输入
│   │       │   ├── stats-expected-h5.json       # H5 statsService 输出
│   │       │   ├── cycle-state-cases.json       # 周期状态机流转用例（创建→暂停→恢复→终止→重启→第6周决策）
│   │       │   └── design-pages-index.json      # 17 个设计稿 → 15 个小程序页面映射
│   │       └── reports/                          # 运行产物（gitignored except for README index）
│   │           ├── last-run.html                # 最近一次运行 HTML 报告
│   │           ├── last-run.json                # 最近一次运行 JSON 报告
│   │           ├── ui-screenshots/              # UI 对照截图（小程序 vs 设计稿）
│   │           └── storage-logs/                # 本地/云端存储读写日志
│   └── ... (业务代码不动)
├── candito-v4-training-app/                # H5 金标准（只读引用）
├── _design_extracted/pages/                # 设计稿基准（只读引用）
├── package.json                            # 新增 test:e2e 脚本
└── .trae/specs/miniprogram-e2e-testing/    # 本 spec
```

### 测试运行流程
```
1. jest 启动 → setup/automator.ts 调用 miniprogram-automator.launch()
   → 自动打开微信开发者工具并加载 miniprogram/ 工程
2. setup/cloudbase.ts 调用 wx.cloud.init({ env: 'tnt-lxo777jrw' })
   → 在 app_data collection 中创建测试命名空间（key 前缀 `e2e_test_<runId>_`）
3. setup/reset.ts 在每个用例前：
   - 调用 LocalStorageAdapter.clear() 清空本地存储
   - 调用 CloudStorageAdapter.clear('e2e_test_<runId>_') 清空测试命名空间
   - 通过 storageManager.setMode('local') 重置为本地模式
4. 用例运行：通过 automator 操作页面 / 调用 store / 读写 storage / 比对 fixtures
5. 用例结束：截图失败项 / 记录存储读写日志
6. jest 退出：setup/cloudbase.ts 清理测试命名空间，automator.close()
7. 报告产物写入 reports/last-run.{html,json}
```

## ADDED Requirements

### Requirement: E2E 测试工程骨架
系统 SHALL 在 `miniprogram/tests/e2e/` 下建立独立的端到端测试工程，提供 automator 启动、CloudBase 初始化、fixtures 加载、用例重置等基础设施，且不污染业务代码。

#### Scenario: 工程结构
- **WHEN** 查看 `miniprogram/tests/e2e/`
- **THEN** 存在 `package.json`、`jest.config.ts`、`tsconfig.json`、`setup/`、`cases/`、`fixtures/`、`reports/` 子目录
- **AND** `package.json` 含 `jest`、`ts-jest`、`miniprogram-automator`、`miniprogram-ci`、`@types/jest` 依赖
- **AND** 根级 `package.json` 新增 `"test:e2e": "cd miniprogram/tests/e2e && jest"` 脚本

#### Scenario: automator 启动与关闭
- **WHEN** 执行 `npm run test:e2e`
- **THEN** `setup/automator.ts` 通过 `miniprogram-automator.launch({ projectPath: '<repo>/miniprogram' })` 启动微信开发者工具
- **AND** 所有用例运行完毕后调用 `automator.close()` 退出
- **AND** 启动失败时输出明确错误（开发者工具未安装 / CLI 端口未开 / 工程路径错误）

#### Scenario: 用例隔离
- **WHEN** 每个用例开始
- **THEN** `setup/reset.ts` 清空本地存储与云端测试命名空间，并将 `storageManager` 重置为 `local` 模式
- **AND** 各用例之间互不影响（不依赖前序用例的副作用）

#### Scenario: 报告产物
- **WHEN** 测试运行结束
- **THEN** `reports/last-run.html` 与 `reports/last-run.json` 含每个用例的通过/失败状态、耗时、失败原因
- **AND** 失败用例的截图保存到 `reports/ui-screenshots/<case-name>.png`

### Requirement: 本地存储端到端测试（LocalStorageAdapter）
系统 SHALL 提供本地存储 E2E 用例，覆盖 `LocalStorageAdapter` 的全部接口与 5 类 storage key 命名，证明本地存储行为与 H5 localStorage 等价。

#### Scenario: 接口契约
- **WHEN** 通过 automator 在小程序内调用 `LocalStorageAdapter.get/set/remove/list/clear`
- **THEN** 行为符合 `StorageAdapter` 接口契约：`get` 不存在返回 `null`，`set` 后 `get` 返回原值，`remove` 后 `get` 返回 `null`，`list(prefix)` 返回匹配 key 列表，`clear(prefix?)` 清除对应 key
- **AND** 类型保持（写入对象/数组/原始类型，读取时类型不变）

#### Scenario: 5 类 storage key 命名保真
- **WHEN** 在小程序内分别调用各 store 的写入方法
- **THEN** `wx.getStorageInfoSync().keys` 包含：`candito_cycles`、`candito_active_cycle`、`candito_records_<cycleId>`、`candito_metrics`、`candito_settings`
- **AND** 对应 JSON 结构与 H5 版本字段一致（cycle 含 weeks/pauseHistory/restartBranches 等全字段；settings 含 defaultUnit/defaultRestSeconds/weightRounding/reminderEnabled/reminderTime）

#### Scenario: 与 H5 localStorage 数据兼容
- **WHEN** 将 H5 导出的 `fixtures/h5-export-sample.json` 中的 settings/cycles/metrics 逐项写入本地存储
- **THEN** 小程序各 store 读取后字段与原 H5 一致
- **AND** 小程序写入的本地存储 JSON 可被 H5 版本直接读取并还原（反向兼容）

#### Scenario: 本地存储数据流转
- **WHEN** 在小程序创建周期、记录训练、修改设置（本地模式）
- **THEN** 数据写入 `wx.setStorageSync`，刷新页面或重启小程序后状态完整恢复
- **AND** store 的 `subscribe` 通知触发视图刷新

### Requirement: 云端存储端到端测试（CloudStorageAdapter + CloudBase）
系统 SHALL 提供云端存储 E2E 用例，覆盖 `CloudStorageAdapter` 的全部接口、CloudBase 初始化前置、openid 隔离与 `app_data` collection 读写。

#### Scenario: CloudBase 初始化前置
- **WHEN** CloudBase 未初始化时调用 `CloudStorageAdapter` 任意方法
- **THEN** 抛出错误 "CloudBase 未初始化..."
- **WHEN** `app.ts` `onLaunch` 中调用 `wx.cloud.init({ env: 'tnt-lxo777jrw' })` 并标记 `setCloudInitialized(true)` 后
- **THEN** `CloudStorageAdapter` 所有方法可正常调用

#### Scenario: 接口契约
- **WHEN** 在云端模式下调用 `CloudStorageAdapter.get/set/remove/list/clear`
- **THEN** 行为符合 `StorageAdapter` 接口契约：`get` 不存在返回 `null`，`set` upsert（存在则 update，不存在则 add），`remove` 删除匹配文档，`list(prefix)` 用 `db.RegExp` 前缀匹配返回 key 列表，`clear(prefix?)` 清除对应文档
- **AND** `app_data` collection 文档结构为 `{ _id, key, value, _openid }`

#### Scenario: openid 隔离
- **WHEN** 用户 A 在云端写入 key=`candito_settings` 的数据
- **THEN** 用户 B 在云端读取 key=`candito_settings` 时仅得到自己的数据，无法读到用户 A 的数据
- **AND** CloudBase 安全规则配置为 "仅创建者可读写"

#### Scenario: 网络错误降级
- **WHEN** 云端模式下断网或 CloudBase 服务异常
- **THEN** `CloudStorageAdapter.get/list` 返回 `null`/`[]`（不抛错），`set/remove/clear` 失败时由调用方 catch
- **AND** 业务层有明确提示（如设置页显示"云端不可用"）

#### Scenario: 与本地存储数据等价
- **WHEN** 同一份 `fixtures/h5-export-sample.json` 分别写入本地与云端
- **THEN** 从两端读取出的数据结构与字段完全一致（仅存储位置不同）
- **AND** stores 在两种模式下行为一致

### Requirement: 存储模式切换端到端测试
系统 SHALL 提供存储模式切换 E2E 用例，覆盖设置页"数据存储"区块的 UI、二次确认、模式切换、数据重新加载、未登录态引导。

#### Scenario: 设置页存储区块 UI
- **WHEN** 进入设置页
- **THEN** 可见"数据存储"区块，展示当前模式（本地/云端），UI 与 `设置与导出.html` 设计稿一致（背景色、卡片样式、间距、字号、字重、圆角、阴影）

#### Scenario: 云端 → 本地切换二次确认
- **WHEN** 从云端切换到本地
- **THEN** 弹出 `wx.showModal`，标题"切换到本地存储"，内容含三条警示：①数据仅保存在当前设备 ②卸载/清缓存/换设备将丢失 ③云端数据不会自动同步到本地建议先导出
- **AND** 点击"取消"保持云端模式不变；点击"确认切换"后 `storageManager.setMode('local')`

#### Scenario: 本地 → 云端切换提示
- **WHEN** 从本地切换到云端
- **THEN** 弹出 `wx.showModal` 提示数据将上传到云端账户支持多设备同步，本地数据可选清空
- **AND** 切换成功后各 store 重新 `init()` 加载云端数据

#### Scenario: 未登录态引导
- **WHEN** 未登录 CloudBase 状态下切换到云端
- **THEN** 引导 `wx.cloud` 匿名登录或 `getUserProfile`
- **AND** 登录成功后再执行模式切换

#### Scenario: 切换后数据加载
- **WHEN** 存储模式切换完成
- **THEN** 从新后端加载对应数据刷新各 store；新后端为空时 `wx.showToast` 提示"该存储模式下暂无数据"

#### Scenario: 模式本身持久化在本地
- **WHEN** 重启小程序
- **THEN** `settingsStore.storageMode` 从本地存储恢复（不依赖云端），且 `storageManager` 据此初始化对应 adapter

### Requirement: UI 1:1 保真端到端测试
系统 SHALL 以 `_design_extracted/pages/` 下 17 个设计稿 HTML 为基准，对 15 个小程序页面（休息日状态合并到今日训练页）逐页对照渲染结果，证明视觉 1:1 还原。

#### Scenario: 设计稿映射
- **WHEN** 查看 `fixtures/design-pages-index.json`
- **THEN** 17 个设计稿均映射到对应小程序页面（休息日.html → 今日训练页的休息日状态；其余一一对应）
- **AND** 每条映射记录含：设计稿路径、小程序页面路径、关键视觉元素清单（背景色/卡片/按钮/列表项/字号/间距/圆角/阴影/字体）

#### Scenario: 逐页视觉对照
- **WHEN** automator 打开任一小程序页面
- **THEN** 截图与对应设计稿 HTML 渲染结果对照：背景色、卡片样式、按钮样式、列表项、间距、字号、字重、颜色、圆角、阴影均一致
- **AND** 失败项在报告中列出具体差异（如"今日训练页卡片圆角为 8rpx，设计稿为 16rpx"）

#### Scenario: 设计 token 一致性
- **WHEN** 检查 `app.wxss` 与 `theme.wxss`
- **THEN** 全部 CSS 变量与原 `theme.css` 一致：颜色（`--color-primary #1D1D1F`、`--color-training-main #0A84FF` 等）、字号、字重、行高、间距、圆角、阴影、缓动
- **AND** 字体栈保留 `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'`，数据元素用 `'SF Mono','Menlo'`

#### Scenario: 毛玻璃降级
- **WHEN** 渲染 TabBar 或需毛玻璃元素
- **THEN** 使用 `rgba(255,255,255,0.92)` + `border-top: 1px solid #F0F0F5` 降级，视觉意图与设计稿一致

#### Scenario: 单位换算
- **WHEN** 检查 WXSS 中的 px/rpx 值
- **THEN** 按 `1px = 2rpx`（375pt 基准）换算，无硬编码非换算值

### Requirement: 交互逻辑 1:1 保真端到端测试
系统 SHALL 提供交互逻辑 E2E 用例，对照 H5 Vue Router + Pinia 行为，证明小程序交互（导航、TabBar、计时器、表单、模态、滑动、生命周期）与 H5 等价。

#### Scenario: 导航对照
- **WHEN** 在小程序执行页面跳转
- **THEN** tab 页跳转使用 `wx.switchTab`，非 tab 页跳转使用 `wx.navigateTo`，对应 H5 Vue Router 的 `router.push`
- **AND** 返回栈行为一致（`wx.navigateBack` ↔ `router.back`）

#### Scenario: TabBar 切换
- **WHEN** 在小程序点击 TabBar 4 个 tab（今日/日历/统计/设置）
- **THEN** 切换到对应页面，当前 tab 高亮（`#0A84FF`）
- **AND** 与 H5 `AppTabBar.vue` 行为一致

#### Scenario: 计时器
- **WHEN** 在训练执行页点击"开始训练"
- **THEN** 训练总时长计时器启动；逐组完成后启动组间休息倒计时（默认 90s）
- **AND** 倒计时归零时提示用户
- **AND** 行为与 H5 `useTimer.ts` + `TrainingExecution.vue` 一致

#### Scenario: 表单录入
- **WHEN** 用户输入重量、选择次数、点击"完成本组"
- **THEN** 该组标记为完成，自动进入下一组，目标值预填
- **AND** 行为与 H5 一致

#### Scenario: 模态二次确认
- **WHEN** 触发删除/切换/终止等高风险操作
- **THEN** 弹出 `wx.showModal` 二次确认（标题、内容、确认/取消按钮），对应 H5 的 `confirm()` 或自定义模态
- **AND** 取消时不执行操作，确认时执行操作

#### Scenario: 滑动返回
- **WHEN** 用户在小程序内从屏幕左边缘向右滑动
- **THEN** 触发 `wx.navigateBack`，对应 H5 浏览器返回
- **AND** 与 H5 行为一致

#### Scenario: 生命周期订阅
- **WHEN** 页面 `onLoad/onShow`
- **THEN** 订阅所需 store；`onHide/onUnload` 取消订阅
- **AND** 与 H5 Vue 组件 `onMounted/onUnmounted` 行为一致

### Requirement: 数据流转端到端测试
系统 SHALL 提供数据流转 E2E 用例，覆盖"页面事件 → store 方法 → storageManager.getActiveAdapter() → adapter 读写 → 渲染刷新"全链路，证明数据流转与 H5 等价。

#### Scenario: 本地模式全链路
- **WHEN** 在本地模式下创建周期、记录训练、修改设置
- **THEN** 数据通过 `LocalStorageAdapter` 写入 `wx.setStorageSync`，store 的 `subscribe` 通知触发视图刷新
- **AND** 刷新页面或重启小程序后状态完整恢复

#### Scenario: 云端模式全链路
- **WHEN** 在云端模式下创建周期、记录训练、修改设置
- **THEN** 数据通过 `CloudStorageAdapter` 写入 CloudBase `app_data` collection，store 的 `subscribe` 通知触发视图刷新
- **AND** 在另一设备/账号登录后状态可恢复（openid 隔离）

#### Scenario: 存储后端切换后数据重新加载
- **WHEN** 存储模式从本地切换到云端（或反向）
- **THEN** 各 store 重新 `init()` 从新后端加载数据，视图刷新
- **AND** 新后端为空时提示"该存储模式下暂无数据"

#### Scenario: store 订阅触发视图刷新
- **WHEN** 某个 store 状态变化
- **THEN** 已订阅的页面/组件收到通知并更新视图
- **AND** 行为与 H5 Pinia 响应式一致

#### Scenario: 错误降级
- **WHEN** 存储后端不可用（本地满/云端断网）
- **THEN** store 方法不抛错，业务层有明确提示
- **AND** 已加载的状态不丢失

### Requirement: 业务逻辑 1:1 保真端到端测试
系统 SHALL 在已有的 `fidelity-report.md` 静态对照基础上，加入运行时端到端验证，证明小程序业务逻辑与 H5 1:1 等价。原 H5 services 文件作为"金标准"参考源。

#### Scenario: 1RM 计算保真
- **WHEN** 在小程序内调用 `epley1RM(weight, reps)` 与 H5 同输入
- **THEN** 输出完全一致：`reps<=0` 返回 weight，`reps===1` 返回 weight，否则 `weight * (1 + reps/30)`
- **AND** `ONE_RM_MULTIPLIERS = {1:1.00, 2:1.03, 3:1.06, 4:1.09}` 一致

#### Scenario: 6 周计划生成保真
- **WHEN** 在小程序内调用 `planGenerator.createCycle(input)`（使用 `fixtures/plan-input.json` 输入）
- **THEN** 输出 Cycle JSON 与 `fixtures/plan-expected-h5.json` 完全一致（weeks/days/exercises/sets/weight/reps/isAMRAP）
- **AND** `roundWeight`、`pct`、`mainSet/mainSets/amrapSet`、`buildAssistanceExercises`、6 周 WeekTemplate 逐行等价

#### Scenario: 训练执行流程保真
- **WHEN** 在小程序训练执行页完成一组训练
- **THEN** 逐组记录逻辑（actualWeight/actualReps 写入）、MR10 动态调整算法、计时器启停与 H5 一致
- **AND** 生成的 `WorkoutRecord` 结构与 H5 一致

#### Scenario: 周期状态机保真
- **WHEN** 在小程序操作周期（使用 `fixtures/cycle-state-cases.json` 用例）
- **THEN** 状态流转字段更新与 H5 一致：`activeCycle` 排除 `terminated/completed`、暂停后恢复、终止后重新开始、错过训练 makeup、第 6 周决策（new_cycle/test_1rm/deload）

#### Scenario: 统计计算保真
- **WHEN** 在小程序内调用 `calculateVolume` / `calculateTotalVolume` / `calculateWeeklyCompletion`
- **THEN** 输出与 `fixtures/stats-expected-h5.json` 完全一致
- **AND** 训练量 = Σ(actualWeight ?? targetWeight ?? 0) × (actualReps ?? 0)；周完成度 = completed(含 makeup) / total × 100，四舍五入取整

#### Scenario: 导入导出格式保真（双向兼容）
- **WHEN** H5 导出 `fixtures/h5-export-sample.json` → 小程序导入
- **THEN** 小程序各 store 完整还原全部周期/记录/指标/设置，校验和匹配
- **WHEN** 小程序导出 JSON → H5 导入
- **THEN** H5 各 store 完整还原，校验和匹配
- **AND** `EXPORT_VERSION = '1.0.0'`，`simpleHash` / `calculateChecksum` 算法逐行等价

### Requirement: CloudBase 集成端到端测试
系统 SHALL 提供 CloudBase 集成 E2E 用例，覆盖 `wx.cloud.init`、openid 隔离、collection 权限、文档结构、控制台核对。

#### Scenario: wx.cloud.init
- **WHEN** 小程序启动
- **THEN** `app.ts` `onLaunch` 调用 `wx.cloud.init({ env: 'tnt-lxo777jrw', traceUser: true })`
- **AND** `setCloudInitialized(true)` 被调用，`CloudStorageAdapter.isCloudInitialized()` 返回 `true`

#### Scenario: app_data collection 结构
- **WHEN** 在云端模式写入任意 key/value
- **THEN** CloudBase 控制台 `app_data` collection 出现文档 `{ _id, key, value, _openid }`
- **AND** 文档结构与 `CloudStorageAdapter` 设计一致

#### Scenario: 跨用户数据不可见
- **WHEN** 用户 A 写入 key=`candito_settings`
- **THEN** 用户 B 读取 key=`candito_settings` 仅得到自己的数据
- **AND** CloudBase 安全规则配置为 "仅创建者可读写"

#### Scenario: 控制台核对
- **WHEN** 测试运行结束
- **THEN** 在 CloudBase 控制台 `https://tcb.cloud.tencent.com/dev?envId=tnt-lxo777jrw#/db/doc/collection/app_data` 可查看测试期间写入的文档
- **AND** 测试命名空间 `e2e_test_<runId>_` 前缀的文档已被清理

## MODIFIED Requirements

### Requirement: fidelity-report.md 范围扩展
原 `fidelity-report.md`（Task 6A 静态对照）SHALL 作为业务逻辑保真的"静态层"证据，本 spec 新增的 `business-logic.e2e.ts` 作为"动态运行时层"证据，二者共同构成业务逻辑 1:1 保真的完整证据链。

## REMOVED Requirements

无（本 spec 不移除任何现有需求；`wechat-mini-program-adaptation` 的 Task 23"编译与运行验证"为本 spec 的真子集，本 spec 不修改其定义，仅提供更系统的 E2E 验证手段）
