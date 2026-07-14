# Tasks

## 阶段一：E2E 测试工程骨架
- [x] Task 1: 创建 E2E 测试工程目录与依赖
  - [x] SubTask 1.1: 创建 `miniprogram/tests/e2e/` 目录及子目录 `setup/`、`cases/`、`fixtures/`、`reports/`、`reports/ui-screenshots/`、`reports/storage-logs/`
  - [x] SubTask 1.2: 创建 `miniprogram/tests/e2e/package.json`，加入 devDependencies：`jest`、`ts-jest`、`@types/jest`、`miniprogram-automator`、`miniprogram-ci`、`typescript`
  - [x] SubTask 1.3: 创建 `miniprogram/tests/e2e/jest.config.ts`（preset ts-jest，testTimeout 60000，testMatch `cases/**/*.e2e.ts`，setupFilesAfterEach 指向 `setup/reset.ts`）
  - [x] SubTask 1.4: 创建 `miniprogram/tests/e2e/tsconfig.json`（strict 模式，types: jest/node，include `./**/*.ts`）
  - [x] SubTask 1.5: 在仓库根 `package.json` 新增 `"test:e2e": "cd miniprogram/tests/e2e && jest"` 脚本
- [x] Task 2: 实现 automator 启动器
  - [x] SubTask 2.1: 创建 `setup/automator.ts`，导出 `launchAutomator()`（调用 `miniprogram-automator.launch({ projectPath, cliPath })`）与 `closeAutomator()`
  - [x] SubTask 2.2: 在 `jest.config.ts` 的 `globalSetup` 中启动 automator，`globalTeardown` 中关闭，将 `automator` 实例通过环境变量/全局对象暴露给用例
  - [x] SubTask 2.3: 启动失败时输出明确错误（开发者工具未安装 / CLI 端口未开 / 工程路径错误），并退出码非 0
- [x] Task 3: 实现 CloudBase 测试环境初始化与清理
  - [x] SubTask 3.1: 创建 `setup/cloudbase.ts`，导出 `initCloudBase()`（在小程序上下文调用 `wx.cloud.init({ env: 'tnt-lxo777jrw', traceUser: true })` 与 `setCloudInitialized(true)`）
  - [x] SubTask 3.2: 定义测试命名空间前缀 `e2e_test_<runId>_`（runId 由时间戳生成），导出 `getTestPrefix()` 与 `cleanupCloudNamespace()`（按前缀清理 `app_data` collection 文档）
  - [x] SubTask 3.3: 在 `globalTeardown` 中调用 `cleanupCloudNamespace()`，保证测试结束后云端不留残留
- [x] Task 4: 实现用例重置与 fixtures 加载
  - [x] SubTask 4.1: 创建 `setup/reset.ts`，导出 `resetStorage()`（清空本地存储 + 清空测试命名空间 + `storageManager.setMode('local')` 重置）
  - [x] SubTask 4.2: 在 `jest.config.ts` 的 `setupFilesAfterEach` 中调用 `resetStorage()`，保证用例隔离
  - [x] SubTask 4.3: 创建 `setup/fixtures.ts`，导出 `loadFixture(name)` 读取 `fixtures/<name>.json` 为 typed object
- [x] Task 5: 生成对照 fixtures（H5 金标准）
  - [x] SubTask 5.1: 在 H5 项目 `candito-v4-training-app/` 下临时运行导出，生成 `fixtures/h5-export-sample.json`（含至少 1 个完整 Cycle + 对应 records + 1 条 bodyMetric + 完整 settings，校验和有效）
  - [x] SubTask 5.2: 在 H5 项目内运行 `planGenerator.createCycle(...)`，输入保存为 `fixtures/plan-input.json`，输出保存为 `fixtures/plan-expected-h5.json`
  - [x] SubTask 5.3: 在 H5 项目内运行 `statsService` 各函数，输入保存为 `fixtures/stats-input.json`，输出保存为 `fixtures/stats-expected-h5.json`
  - [x] SubTask 5.4: 构造 `fixtures/cycle-state-cases.json`，含周期状态机流转用例（创建→暂停→恢复→终止→重启→第6周决策→错过训练 makeup）的输入序列与期望字段快照
  - [x] SubTask 5.5: 构造 `fixtures/design-pages-index.json`，含 17 个设计稿 → 15 个小程序页面映射，每条记录含设计稿路径、小程序页面路径、关键视觉元素清单

## 阶段二：本地存储端到端测试
- [x] Task 6: 实现 `cases/local-storage.e2e.ts`
  - [x] SubTask 6.1: 用例"接口契约 - get/set/remove/list/clear"：通过 automator 调用 `LocalStorageAdapter` 各方法，断言行为符合 `StorageAdapter` 契约（get 不存在返回 null，set 后 get 返回原值，remove 后 get 返回 null，list(prefix) 返回匹配 key 列表，clear(prefix?) 清除对应 key）
  - [x] SubTask 6.2: 用例"类型保持"：写入对象/数组/数字/字符串/布尔，读取时类型与值不变
  - [x] SubTask 6.3: 用例"5 类 storage key 命名保真"：调用各 store 写入方法，断言 `wx.getStorageInfoSync().keys` 包含 `candito_cycles`、`candito_active_cycle`、`candito_records_<cycleId>`、`candito_metrics`、`candito_settings`
  - [x] SubTask 6.4: 用例"JSON 结构保真"：写入后读取，断言 cycle 含 weeks/pauseHistory/restartBranches/batchProcessHistory 全字段；settings 含 defaultUnit/defaultRestSeconds/weightRounding/reminderEnabled/reminderTime
  - [x] SubTask 6.5: 用例"H5 导出 → 小程序本地存储读取"：将 `fixtures/h5-export-sample.json` 逐项写入本地存储，断言各 store 读取后字段与 H5 一致
  - [x] SubTask 6.6: 用例"小程序本地存储 → H5 读取反向兼容"：将小程序写入的本地存储 JSON 导出，在测试中加载 H5 stores 解析，断言字段一致
  - [x] SubTask 6.7: 用例"本地存储数据流转"：创建周期 → 记录训练 → 修改设置（本地模式），重启小程序（automator relaunch），断言状态完整恢复

## 阶段三：云端存储端到端测试（CloudBase）
- [x] Task 7: 实现 `cases/cloud-storage.e2e.ts`
  - [x] SubTask 7.1: 用例"CloudBase 未初始化时调用抛错"：调用 `setCloudInitialized(false)` 后调 `CloudStorageAdapter.get`，断言抛出 "CloudBase 未初始化..." 错误
  - [x] SubTask 7.2: 用例"初始化后正常调用"：调用 `initCloudBase()` 后，断言 `isCloudInitialized()` 返回 `true`，且 `CloudStorageAdapter` 各方法可正常调用
  - [x] SubTask 7.3: 用例"接口契约 - get/set/remove/list/clear"：在云端模式（key 加 `e2e_test_<runId>_` 前缀）调用各方法，断言行为符合契约（set upsert，list 用 db.RegExp 前缀匹配，clear 清除对应文档）
  - [x] SubTask 7.4: 用例"app_data 文档结构"：写入后通过 `db.collection('app_data').where({key}).get()` 读取原始文档，断言结构为 `{ _id, key, value, _openid }`
  - [x] SubTask 7.5: 用例"openid 隔离"：用两个测试账号（或 mock 两个 openid）分别写入相同 key，断言互相不可见
  - [x] SubTask 7.6: 用例"网络错误降级"：mock `wx.cloud.database` 抛错，断言 `get/list` 返回 `null`/`[]` 不抛错，`set/remove/clear` 失败时由调用方 catch
  - [x] SubTask 7.7: 用例"与本地存储数据等价"：将 `fixtures/h5-export-sample.json` 分别写入本地与云端，断言从两端读取出的数据结构与字段完全一致

## 阶段四：存储模式切换端到端测试
- [x] Task 8: 实现 `cases/storage-switch.e2e.ts`
  - [x] SubTask 8.1: 用例"设置页存储区块 UI"：automator 打开 `pages/settings/index`，断言可见"数据存储"区块展示当前模式（本地/云端），UI 与 `设置与导出.html` 设计稿对照（背景色/卡片/间距/字号/字重/圆角/阴影）
  - [x] 8.2: 用例"云端 → 本地切换二次确认"：先 `storageManager.setMode('cloud')`，点击切换到本地，断言弹出 `wx.showModal` 标题"切换到本地存储"、内容含三条警示；点击"取消"断言模式仍为 cloud；点击"确认切换"断言 `storageManager.getMode() === 'local'`
  - [x] SubTask 8.3: 用例"本地 → 云端切换提示"：从 local 切换到 cloud，断言弹出 `wx.showModal` 提示数据将上传到云端账户支持多设备同步，本地数据可选清空；切换成功后各 store 重新 `init()` 加载云端数据
  - [x] SubTask 8.4: 用例"未登录态引导"：mock 未登录态，从 local 切换到 cloud，断言引导 `wx.cloud` 匿名登录或 `getUserProfile`，登录成功后再执行切换（实现为 `it.skip` + 手动测试说明，因 wx.cloud 已 init 后无法回退到未登录态）
  - [x] SubTask 8.5: 用例"切换后空后端提示"：切换到空后端，断言 `wx.showToast` 提示"该存储模式下暂无数据"
  - [x] SubTask 8.6: 用例"模式本身持久化在本地"：切换模式后重启小程序，断言 `settingsStore.storageMode` 从本地存储恢复，`storageManager` 据此初始化对应 adapter

## 阶段五：UI 1:1 保真端到端测试
- [x] Task 9: 实现 `cases/ui-fidelity.e2e.ts`
  - [x] SubTask 9.1: 用例"设计 token 一致性"：读取 `miniprogram/app.wxss` 与 `assets/styles/theme.wxss`，断言全部 CSS 变量与原 `candito-v4-training-app/src/assets/theme.css` 一致（颜色/字号/字重/行高/间距/圆角/阴影/缓动）
  - [x] SubTask 9.2: 用例"字体栈保留"：断言 `page`/`body` 选择器 `font-family` 含 `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'`，数据元素含 `'SF Mono','Menlo'`
  - [x] SubTask 9.3: 用例"毛玻璃降级"：断言 TabBar 等 `backdrop-filter` 元素降级为 `rgba(255,255,255,0.92)` + `border-top:1px solid #F0F0F5`
  - [x] SubTask 9.4: 用例"单位换算"：扫描所有 WXSS，断言 px/rpx 按 `1px = 2rpx`（375pt 基准）换算，无硬编码非换算值
  - [x] SubTask 9.5: 用例"逐页视觉对照 - 17 个设计稿"：遍历 `fixtures/design-pages-index.json`，automator 打开每个小程序页面截图，与设计稿 HTML 渲染截图对照（背景色/卡片/按钮/列表项/间距/字号/字重/颜色/圆角/阴影），失败项在报告中列出具体差异，截图保存到 `reports/ui-screenshots/<page>.png`

## 阶段六：交互逻辑 1:1 保真端到端测试
- [x] Task 10: 实现 `cases/interaction.e2e.ts`
  - [x] SubTask 10.1: 用例"导航对照"：在小程序执行 tab 页跳转断言使用 `wx.switchTab`，非 tab 页跳转使用 `wx.navigateTo`，返回栈行为与 H5 Vue Router 一致
  - [x] SubTask 10.2: 用例"TabBar 切换"：点击 4 个 tab，断言切换到对应页面，当前 tab 高亮 `#0A84FF`，与 H5 `AppTabBar.vue` 行为一致
  - [x] SubTask 10.3: 用例"计时器"：在训练执行页点击"开始训练"，断言训练总时长计时器启动；逐组完成后启动组间休息倒计时（默认 90s），倒计时归零提示用户，行为与 H5 `useTimer.ts` + `TrainingExecution.vue` 一致
  - [x] SubTask 10.4: 用例"表单录入"：输入重量、选择次数、点击"完成本组"，断言该组标记完成、自动进入下一组、目标值预填，行为与 H5 一致
  - [x] SubTask 10.5: 用例"模态二次确认"：触发删除/切换/终止等高风险操作，断言弹出 `wx.showModal` 二次确认，取消时不执行操作，确认时执行操作
  - [x] SubTask 10.6: 用例"滑动返回"：模拟从屏幕左边缘向右滑动，断言触发 `wx.navigateBack`，对应 H5 浏览器返回
  - [x] SubTask 10.7: 用例"生命周期订阅"：页面 `onLoad/onShow` 订阅 store，`onHide/onUnload` 取消订阅，与 H5 Vue 组件 `onMounted/onUnmounted` 行为一致

## 阶段七：数据流转端到端测试
- [x] Task 11: 实现 `cases/data-flow.e2e.ts`
  - [x] SubTask 11.1: 用例"本地模式全链路"：在本地模式下创建周期、记录训练、修改设置，断言数据通过 `LocalStorageAdapter` 写入 `wx.setStorageSync`，store 的 `subscribe` 通知触发视图刷新，重启后状态完整恢复
  - [x] SubTask 11.2: 用例"云端模式全链路"：在云端模式下创建周期、记录训练、修改设置，断言数据通过 `CloudStorageAdapter` 写入 CloudBase `app_data` collection，store 的 `subscribe` 通知触发视图刷新，在另一设备/账号登录后状态可恢复
  - [x] SubTask 11.3: 用例"存储后端切换后数据重新加载"：从本地切换到云端（或反向），断言各 store 重新 `init()` 从新后端加载数据，视图刷新，新后端为空时提示"该存储模式下暂无数据"
  - [x] SubTask 11.4: 用例"store 订阅触发视图刷新"：mock 某个 store 状态变化，断言已订阅的页面/组件收到通知并更新视图，行为与 H5 Pinia 响应式一致
  - [x] SubTask 11.5: 用例"错误降级"：mock 存储后端不可用（本地满/云端断网），断言 store 方法不抛错，业务层有明确提示，已加载状态不丢失

## 阶段八：业务逻辑 1:1 保真端到端测试
- [x] Task 12: 实现 `cases/business-logic.e2e.ts`
  - [x] SubTask 12.1: 用例"1RM 计算保真"：在小程序内调用 `epley1RM(weight, reps)` 多组输入（含 reps<=0, reps===1, reps>1），断言输出与 `fixtures/stats-expected-h5.json` 中 epley1RM 字段完全一致；断言 `ONE_RM_MULTIPLIERS = {1:1.00, 2:1.03, 3:1.06, 4:1.09}`
  - [x] SubTask 12.2: 用例"6 周计划生成保真"：在小程序内调用 `planGenerator.createCycle(fixtures/plan-input.json)`，断言输出 Cycle JSON 与 `fixtures/plan-expected-h5.json` 完全一致（weeks/days/exercises/sets/weight/reps/isAMRAP）
  - [x] SubTask 12.3: 用例"训练执行流程保真"：在小程序训练执行页完成一组训练，断言逐组记录逻辑（actualWeight/actualReps 写入）、MR10 动态调整算法、计时器启停与 H5 一致，生成的 `WorkoutRecord` 结构与 H5 一致
  - [x] SubTask 12.4: 用例"周期状态机保真"：在小程序操作周期（按 `fixtures/cycle-state-cases.json` 用例序列），断言状态流转字段更新与 H5 一致（activeCycle 排除 terminated/completed、暂停后恢复、终止后重新开始、错过训练 makeup、第 6 周决策）
  - [x] SubTask 12.5: 用例"统计计算保真"：在小程序内调用 `calculateVolume` / `calculateTotalVolume` / `calculateWeeklyCompletion`，断言输出与 `fixtures/stats-expected-h5.json` 完全一致
  - [x] SubTask 12.6: 用例"H5 导出 → 小程序导入"：将 `fixtures/h5-export-sample.json` 通过 `wx.chooseMessageFile` 导入小程序，断言各 store 完整还原全部周期/记录/指标/设置，校验和匹配
  - [x] SubTask 12.7: 用例"小程序导出 → H5 导入"：在小程序内导出 JSON，加载到 H5 stores 解析，断言完整还原，校验和匹配
  - [x] SubTask 12.8: 用例"校验和算法保真"：调用 `simpleHash` / `calculateChecksum` 多组字符串输入，断言输出与 H5 一致；断言 `EXPORT_VERSION = '1.0.0'`

## 阶段九：CloudBase 集成端到端测试
- [x] Task 13: 实现 `cases/cloudbase-integration.e2e.ts`
  - [x] SubTask 13.1: 用例"wx.cloud.init"：启动小程序，断言 `app.ts` `onLaunch` 调用 `wx.cloud.init({ env: 'tnt-lxo777jrw', traceUser: true })`，`setCloudInitialized(true)` 被调用，`isCloudInitialized()` 返回 `true`
  - [x] SubTask 13.2: 用例"app_data collection 结构"：在云端模式写入任意 key/value，通过 `db.collection('app_data').where({key}).get()` 读取原始文档，断言结构为 `{ _id, key, value, _openid }`
  - [x] SubTask 13.3: 用例"跨用户数据不可见"：用两个测试账号（或 mock 两个 openid）分别写入 key=`candito_settings`，断言互相不可见
  - [x] SubTask 13.4: 用例"CloudBase 安全规则核对"：通过 MCP 或控制台断言 `app_data` collection 权限规则为 "仅创建者可读写"
  - [x] SubTask 13.5: 用例"控制台核对"：测试运行结束后，在 CloudBase 控制台 `https://tcb.cloud.tencent.com/dev?envId=tnt-lxo777jrw#/db/doc/collection/app_data` 可查看测试期间写入的文档，断言测试命名空间 `e2e_test_<runId>_` 前缀的文档已被清理

## 阶段十：报告产物与 CI 集成
- [x] Task 14: 实现报告产物生成
  - [x] SubTask 14.1: 在 `jest.config.ts` 配置 reporters（默认 jest-html-reporter 或自定义），输出 `reports/last-run.html` 与 `reports/last-run.json`
  - [x] SubTask 14.2: 失败用例自动截图保存到 `reports/ui-screenshots/<case-name>.png`
  - [x] SubTask 14.3: 存储读写日志保存到 `reports/storage-logs/<case-name>.log`（每条 get/set/remove 记录 key、value 摘要、时间戳）
  - [x] SubTask 14.4: 创建 `reports/README.md` 索引最近 10 次运行报告（可选）
- [x] Task 15: 集成到 CI（可选）
  - [x] SubTask 15.1: 在 `.github/workflows/deploy.yml` 新增 `e2e-test` job（仅在有 CloudBase secrets 时运行）
  - [x] SubTask 15.2: 配置 CI 环境变量：`CLOUDBASE_ENV_ID`、测试账号 openid 等

## 阶段十一：验收与回归
- [x] Task 16: 全量运行与缺陷修复
  - [x] SubTask 16.1: 执行 `npm run test:e2e`，全量运行所有 E2E 用例
  - [x] SubTask 16.2: 收集失败用例，定位缺陷（业务代码 bug 或测试用例 bug）
  - [x] SubTask 16.3: 修复缺陷（不修改业务代码算法逻辑，仅修复实际 bug；测试用例 bug 修复测试代码）
  - [x] SubTask 16.4: 重新运行直至全量通过，生成最终 `reports/last-run.html` 与 `reports/last-run.json`
- [x] Task 17: 验收报告
  - [x] SubTask 17.1: 汇总各阶段通过率、关键缺陷修复记录、CloudBase 测试命名空间清理证据
  - [x] SubTask 17.2: 在 `miniprogram/tests/e2e/reports/` 下生成最终验收报告 `acceptance-report.md`，引用 `fidelity-report.md` 作为静态层证据，`business-logic.e2e.ts` 作为动态层证据，二者共同构成业务逻辑 1:1 保真的完整证据链

# Task Dependencies
- Task 2、Task 3、Task 4 均依赖 Task 1（工程骨架与依赖）
- Task 5（fixtures 生成）依赖 Task 1，且须先于 Task 6、Task 12 完成（提供对照基准）
- Task 6（本地存储 E2E）依赖 Task 2、Task 3、Task 4、Task 5
- Task 7（云端存储 E2E）依赖 Task 2、Task 3、Task 4、Task 5
- Task 8（存储模式切换 E2E）依赖 Task 6、Task 7（两种 adapter 已验证）
- Task 9（UI 保真 E2E）依赖 Task 5（设计稿映射 fixtures）与 Task 2（automator）
- Task 10（交互 E2E）依赖 Task 2、Task 5
- Task 11（数据流转 E2E）依赖 Task 6、Task 7、Task 8
- Task 12（业务逻辑保真 E2E）依赖 Task 5（fixtures）、Task 2（automator）、Task 6（存储通路）
- Task 13（CloudBase 集成 E2E）依赖 Task 3、Task 7
- Task 14（报告产物）依赖所有用例 Task（6~13）至少有可运行版本
- Task 15（CI 集成）可选，依赖 Task 14
- Task 16（全量运行与缺陷修复）依赖所有用例 Task 与 Task 14
- Task 17（验收报告）依赖 Task 16

# 并行化建议
- Task 6 与 Task 7 可并行（不同 adapter，互不依赖）
- Task 9 与 Task 10 可并行（不同断言维度）
- Task 12 内部各 SubTask 可并行（不同算法对照）
- Task 13 可与 Task 8 并行（CloudBase 集成 vs 存储模式切换）
