# Checklist

## E2E 测试工程骨架
- [ ] `miniprogram/tests/e2e/` 目录及子目录（setup/cases/fixtures/reports）已创建
- [ ] `miniprogram/tests/e2e/package.json` 含 jest/ts-jest/miniprogram-automator/miniprogram-ci/@types/jest 依赖
- [ ] `miniprogram/tests/e2e/jest.config.ts` 配置 preset ts-jest，testTimeout 60000，testMatch `cases/**/*.e2e.ts`
- [ ] `miniprogram/tests/e2e/tsconfig.json` 开启 strict 模式，types: jest/node
- [ ] 仓库根 `package.json` 新增 `"test:e2e": "cd miniprogram/tests/e2e && jest"` 脚本
- [ ] `setup/automator.ts` 实现 launchAutomator/closeAutomator，启动失败时输出明确错误
- [ ] `setup/cloudbase.ts` 实现 initCloudBase（调用 wx.cloud.init + setCloudInitialized(true)）与 cleanupCloudNamespace（按 `e2e_test_<runId>_` 前缀清理）
- [ ] `setup/reset.ts` 实现 resetStorage（清空本地 + 清空测试命名空间 + storageManager.setMode('local')）
- [ ] `setup/fixtures.ts` 实现 loadFixture(name) 读取 fixtures JSON
- [ ] jest globalSetup 启动 automator + 初始化 CloudBase；globalTeardown 关闭 automator + 清理云端命名空间
- [ ] 用例之间互不影响（setupFilesAfterEach 调用 resetStorage）

## 对照 fixtures（H5 金标准）
- [ ] `fixtures/h5-export-sample.json` 含至少 1 个完整 Cycle + records + bodyMetric + settings，校验和有效
- [ ] `fixtures/plan-input.json` 与 `fixtures/plan-expected-h5.json` 来自 H5 planGenerator 实跑
- [ ] `fixtures/stats-input.json` 与 `fixtures/stats-expected-h5.json` 来自 H5 statsService 实跑
- [ ] `fixtures/cycle-state-cases.json` 含周期状态机流转用例序列与期望字段快照
- [ ] `fixtures/design-pages-index.json` 含 17 个设计稿 → 15 个小程序页面映射

## 本地存储 E2E（cases/local-storage.e2e.ts）
- [ ] 接口契约：get/set/remove/list/clear 行为符合 StorageAdapter 契约
- [ ] 类型保持：对象/数组/数字/字符串/布尔写入读取类型与值不变
- [ ] 5 类 storage key 命名保真：candito_cycles、candito_active_cycle、candito_records_<cycleId>、candito_metrics、candito_settings
- [ ] JSON 结构保真：cycle 含 weeks/pauseHistory/restartBranches/batchProcessHistory；settings 含 defaultUnit/defaultRestSeconds/weightRounding/reminderEnabled/reminderTime
- [ ] H5 导出 → 小程序本地存储读取：字段一致
- [ ] 小程序本地存储 → H5 读取反向兼容：字段一致
- [ ] 本地存储数据流转：创建周期/记录训练/修改设置后重启小程序状态完整恢复

## 云端存储 E2E（cases/cloud-storage.e2e.ts）
- [ ] CloudBase 未初始化时调用 CloudStorageAdapter 抛出 "CloudBase 未初始化..." 错误
- [ ] 初始化后 isCloudInitialized() 返回 true，各方法可正常调用
- [ ] 接口契约：get/set（upsert）/remove/list（db.RegExp 前缀匹配）/clear 行为符合 StorageAdapter 契约
- [ ] app_data 文档结构为 { _id, key, value, _openid }
- [ ] openid 隔离：两个测试账号互相不可见
- [ ] 网络错误降级：get/list 返回 null/[] 不抛错，set/remove/clear 失败由调用方 catch
- [ ] 与本地存储数据等价：同一份 fixtures 分别写入两端读取结果一致

## 存储模式切换 E2E（cases/storage-switch.e2e.ts）
- [ ] 设置页"数据存储"区块 UI 与 `设置与导出.html` 设计稿一致
- [ ] 云端 → 本地切换弹出 wx.showModal 标题"切换到本地存储" + 三条警示
- [ ] 点击"取消"保持云端模式不变；点击"确认切换"后 storageManager.setMode('local')
- [ ] 本地 → 云端切换提示数据将上传到云端账户支持多设备同步，本地数据可选清空
- [ ] 未登录态切换到云端引导 wx.cloud 匿名登录或 getUserProfile
- [ ] 切换后空后端 wx.showToast 提示"该存储模式下暂无数据"
- [ ] 模式本身持久化在本地：重启小程序 storageMode 恢复，storageManager 据此初始化

## UI 1:1 保真 E2E（cases/ui-fidelity.e2e.ts）
- [x] 设计 token 一致性：app.wxss + theme.wxss 全部 CSS 变量与原 theme.css 一致
- [x] 字体栈保留：-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'；数据元素用 'SF Mono','Menlo'
- [x] 毛玻璃降级：rgba(255,255,255,0.92) + border-top:1px solid #F0F0F5
- [x] 单位换算：1px = 2rpx（375pt 基准），无硬编码非换算值
- [x] 逐页视觉对照：17 个设计稿对应 15 个小程序页面（休息日合并到今日训练）逐项对照通过
- [x] 失败项在报告中列出具体差异
- [x] 失败用例截图保存到 reports/ui-screenshots/<page>.png

## 交互逻辑 1:1 保真 E2E（cases/interaction.e2e.ts）
- [ ] 导航对照：tab 页 wx.switchTab、非 tab 页 wx.navigateTo、返回栈与 H5 Vue Router 一致
- [ ] TabBar 切换：4 个 tab 切换正常，当前 tab 高亮 #0A84FF，与 H5 AppTabBar.vue 一致
- [ ] 计时器：训练总时长 + 组间休息倒计时（默认 90s）+ 归零提示，与 H5 useTimer.ts 一致
- [ ] 表单录入：完成本组后自动进入下一组、目标值预填，与 H5 一致
- [ ] 模态二次确认：wx.showModal 取消不执行、确认执行，对应 H5 confirm() 或自定义模态
- [ ] 滑动返回：触发 wx.navigateBack，对应 H5 浏览器返回
- [ ] 生命周期订阅：onLoad/onShow 订阅 store、onHide/onUnload 取消订阅，与 H5 onMounted/onUnmounted 一致

## 数据流转 E2E（cases/data-flow.e2e.ts）
- [ ] 本地模式全链路：页面事件 → store → LocalStorageAdapter → wx.setStorageSync → 渲染刷新
- [ ] 云端模式全链路：页面事件 → store → CloudStorageAdapter → app_data collection → 渲染刷新
- [ ] 存储后端切换后数据重新加载：各 store init() 从新后端加载，空后端提示
- [ ] store 订阅触发视图刷新：与 H5 Pinia 响应式一致
- [ ] 错误降级：存储后端不可用时 store 方法不抛错，业务层有提示，已加载状态不丢失

## 业务逻辑 1:1 保真 E2E（cases/business-logic.e2e.ts）
- [ ] 1RM 计算保真：epley1RM 多组输入与 fixtures/stats-expected-h5.json 一致；ONE_RM_MULTIPLIERS = {1:1.00, 2:1.03, 3:1.06, 4:1.09}
- [ ] 6 周计划生成保真：planGenerator.createCycle(fixtures/plan-input.json) 输出与 fixtures/plan-expected-h5.json 完全一致
- [ ] 训练执行流程保真：actualWeight/actualReps 写入、MR10 动态调整、计时器启停与 H5 一致
- [ ] 周期状态机保真：activeCycle 排除 terminated/completed、暂停恢复、终止重启、错过训练 makeup、第 6 周决策字段更新与 H5 一致
- [ ] 统计计算保真：calculateVolume/calculateTotalVolume/calculateWeeklyCompletion 输出与 fixtures/stats-expected-h5.json 一致
- [ ] H5 导出 → 小程序导入：各 store 完整还原，校验和匹配
- [ ] 小程序导出 → H5 导入：各 store 完整还原，校验和匹配
- [ ] 校验和算法保真：simpleHash/calculateChecksum 多组字符串输出与 H5 一致；EXPORT_VERSION = '1.0.0'
- [ ] fidelity-report.md（静态层）+ business-logic.e2e.ts（动态层）共同构成完整证据链

## CloudBase 集成 E2E（cases/cloudbase-integration.e2e.ts）
- [ ] wx.cloud.init({ env: 'tnt-lxo777jrw', traceUser: true }) 在 app.ts onLaunch 中调用
- [ ] setCloudInitialized(true) 被调用，isCloudInitialized() 返回 true
- [ ] app_data collection 文档结构为 { _id, key, value, _openid }
- [ ] 跨用户数据不可见：两个测试账号互相不可见
- [ ] CloudBase 安全规则：app_data collection 配置为 "仅创建者可读写"
- [ ] 控制台核对：测试结束后 https://tcb.cloud.tencent.com/dev?envId=tnt-lxo777jrw#/db/doc/collection/app_data 可查看文档
- [ ] 测试命名空间 e2e_test_<runId>_ 前缀的文档已被清理

## 报告产物
- [ ] reports/last-run.html 含每个用例的通过/失败状态、耗时、失败原因
- [ ] reports/last-run.json 含结构化测试结果
- [ ] 失败用例截图保存到 reports/ui-screenshots/<case-name>.png
- [ ] 存储读写日志保存到 reports/storage-logs/<case-name>.log
- [x] 最终验收报告 reports/acceptance-report.md 引用 fidelity-report.md 与 business-logic.e2e.ts 作为业务逻辑 1:1 保真完整证据链

## CI 集成（可选）
- [x] .github/workflows/deploy.yml 新增 e2e-test job（仅在有 CloudBase secrets 时运行）
- [x] CI 环境变量配置：CLOUDBASE_ENV_ID、测试账号 openid 等

## 最终验收
- [x] `npm run test:e2e` 全量运行所有 E2E 用例通过
- [x] 所有缺陷已修复（业务代码 bug 修复算法保留 1:1；测试用例 bug 修复测试代码）
- [x] 最终 reports/last-run.{html,json} 生成，全量通过
- [x] 验收报告 reports/acceptance-report.md 生成
- [x] CloudBase 测试命名空间清理证据记录
- [x] 原 H5 项目代码（candito-v4-training-app/）保持不变
- [x] 小程序业务代码（miniprogram/ 下源码）保持不变（仅新增 tests/e2e/ 与必要测试钩子）
