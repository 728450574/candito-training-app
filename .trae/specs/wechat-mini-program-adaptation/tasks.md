# Tasks

## 阶段一：分支与工具链准备
- [ ] Task 1: 创建小程序适配分支
  - [ ] SubTask 1.1: 在仓库根执行 `git checkout -b feature/wechat-miniprogram` 基于当前主干创建分支
  - [ ] SubTask 1.2: 验证分支已切换，原 H5 代码（`candito-v4-training-app/`）保持不变
- [ ] Task 2: 安装 CloudBase Skills
  - [ ] SubTask 2.1: 在仓库根执行 `npx skills add tencentcloudbase/cloudbase-skills -y`
  - [ ] SubTask 2.2: 验证 Skills 注册成功（查看 `.skills/` 或对应配置目录，记录可用 Skills 清单）

## 阶段二：原生小程序工程骨架
- [ ] Task 3: 创建小程序工程文件
  - [ ] SubTask 3.1: 在仓库根创建 `project.config.json`（`miniprogramRoot` 指向 `miniprogram/`，`compileType: miniprogram`，appid 占位）
  - [ ] SubTask 3.2: 创建 `tsconfig.json`（开启严格模式，输出到 `miniprogram/` 同目录）
  - [ ] SubTask 3.3: 创建/更新 `package.json`，加入 `miniprogram-api-typings` 依赖与必要脚本
  - [ ] SubTask 3.4: 创建 `miniprogram/sitemap.json`
- [ ] Task 4: 创建 app 级文件
  - [ ] SubTask 4.1: 创建 `miniprogram/app.json`：注册 15 个页面，配置 `tabBar`（今日/日历/统计/设置），配置 `window`（标题、背景色）
  - [ ] SubTask 4.2: 创建 `miniprogram/app.ts`：小程序入口，`onLaunch` 中初始化 stores、`wx.cloud.init`
  - [ ] SubTask 4.3: 创建 `miniprogram/app.wxss`：全局样式，定义 `page` 下的 CSS 变量（参考原 `theme.css`）
  - [ ] SubTask 4.4: 创建 `miniprogram/assets/styles/theme.wxss` 并在 `app.wxss` 中 `@import`

## 阶段三：类型与纯逻辑层复用（业务逻辑 1:1 保真）
- [ ] Task 5: 复用 TypeScript 类型定义
  - [ ] SubTask 5.1: 将 `candito-v4-training-app/src/types/*.ts` 复制到 `miniprogram/types/`，字段/枚举/接口不得改动
  - [ ] SubTask 5.2: 验证类型在 TS 编译中无报错（无浏览器类型依赖）
- [ ] Task 6: 复用纯逻辑 services（逐行等价，禁止改写）
  - [ ] SubTask 6.1: 将 `dateService.ts`、`planGenerator.ts`、`statsService.ts` 复制到 `miniprogram/services/`，业务算法逐行保留：
    - `planGenerator.ts`：`roundWeight`、`pct`、`mainSet/mainSets/amrapSet`、`buildAssistanceExercises`、6 周 WeekTemplate
    - `statsService.ts`：`epley1RM`（`weight*(1+reps/30)`）、`ONE_RM_MULTIPLIERS {1:1.00,2:1.03,3:1.06,4:1.09}`、`calculateVolume`、`calculateTotalVolume`、`calculateWeeklyCompletion`
  - [ ] SubTask 6.2: 仅替换 IO/依赖注入点（如 `uuid` 的 `v4` 改为小程序兼容实现或保留 `uuid` 依赖），业务算法本体不动
  - [ ] SubTask 6.3: 审查并确认无隐含浏览器 API 引用（`Date` 使用保持，无 `localStorage`/`document`/`window`/`Blob`）
- [ ] Task 6A: 业务逻辑等价性验证
  - [ ] SubTask 6A.1: 构造对照用例（一组 1RM 输入、unit、weightRounding、startDate、assistanceConfig），调用 `planGenerator.createCycle`，比对小程序版本与 H5 版本输出的 Cycle JSON 完全一致
  - [ ] SubTask 6A.2: 对照 `epley1RM`、`calculateVolume`、`calculateWeeklyCompletion` 输出一致
  - [ ] SubTask 6A.3: 对照 `simpleHash`/`calculateChecksum` 对相同字符串输出一致（校验和算法逐行等价）
  - [ ] SubTask 6A.4: 对照周期状态机流转（创建→暂停→恢复→终止→重新开始、第6周决策、错过训练 makeup）字段更新一致
  - [ ] SubTask 6A.5: 将验证结果（对照用例 + 输出 diff）记录到 `miniprogram/tests/fidelity-report.md`（或等价位置），作为验收证据

## 阶段四：状态管理与存储抽象层
- [ ] Task 7: 实现存储抽象层
  - [ ] SubTask 7.1: 创建 `miniprogram/utils/storage/StorageAdapter.ts`：定义统一接口（`get/set/remove/list/clear`，异步 Promise 返回），支持泛型
  - [ ] SubTask 7.2: 实现 `LocalStorageAdapter.ts`：基于 `wx.setStorageSync / getStorageSync`，与 H5 版本 storage key 命名保持一致
  - [ ] SubTask 7.3: 实现 `CloudStorageAdapter.ts`：基于 CloudBase 云数据库 collection（如 `cycles`、`records`、`bodyMetrics`、`settings`），支持按 openid 隔离
  - [ ] SubTask 7.4: 实现 `storageManager.ts`：管理当前激活后端，提供 `getActiveAdapter / setMode('local'|'cloud') / onModeChange` 订阅
  - [ ] SubTask 7.5: 定义存储模式枚举与 settings 中 `storageMode` 字段持久化（模式本身存本地，避免循环依赖）
- [ ] Task 8: 重写 Pinia stores 为 TS 单例模块（业务逻辑 1:1 保真，依赖 StorageAdapter）
  - [ ] SubTask 8.1: 创建 `miniprogram/stores/cycleStore.ts`：模块级 state + `subscribe` 订阅模式，读写通过 `storageManager.getActiveAdapter()`；`activeCycle` 计算逻辑（排除 terminated/completed）、storage key（`candito_cycles`/`candito_active_cycle`）与原 H5 一致
  - [ ] SubTask 8.2: 创建 `miniprogram/stores/recordStore.ts`（key `candito_records`，记录写入/查询逻辑与 H5 一致）
  - [ ] SubTask 8.3: 创建 `miniprogram/stores/bodyMetricStore.ts`（key `candito_body_metrics`）
  - [ ] SubTask 8.4: 创建 `miniprogram/stores/settingsStore.ts`（key `candito_settings`，含 `storageMode` 字段，其余设置字段与 H5 一致）
  - [ ] SubTask 8.5: 周期状态机方法（create/pause/resume/terminate/restart/week6Decision/markMissed/makeup）逻辑与原 `cycleStore.ts` 逐行等价
  - [ ] SubTask 8.6: 在 `app.ts` `onLaunch` 中根据 settingsStore.storageMode 初始化对应 adapter，调用各 store 的 `init()` 加载数据

## 阶段五：组件与图标
- [ ] Task 9: 图标方案落地
  - [ ] SubTask 9.1: 整理项目中使用的 Lucide 图标清单（参考 `AppTabBar.vue` 与各视图）
  - [ ] SubTask 9.2: 在 iconfont 平台生成对应字体文件，下载放入 `miniprogram/assets/iconfont/`
  - [ ] SubTask 9.3: 在 `app.wxss` 中 `@font-face` 引入 iconfont，定义通用 `.icon` 类
- [ ] Task 10: 实现共享自定义组件
  - [ ] SubTask 10.1: 评估使用原生 `tabBar` 还是自定义 tabBar 组件（原生优先）
  - [ ] SubTask 10.2: 实现 `components/exercise-card/`（如原 H5 有卡片复用）
  - [ ] SubTask 10.3: 实现 `components/stat-chart/`（SVG → canvas 或 echarts-for-weixin）

## 阶段六：页面迁移（15 个页面）
- [ ] Task 11: 迁移 4 个 tab 页
  - [ ] SubTask 11.1: `pages/today/`（今日训练，首页）
  - [ ] SubTask 11.2: `pages/calendar/`（训练日历）
  - [ ] SubTask 11.3: `pages/stats/`（进度统计）
  - [ ] SubTask 11.4: `pages/settings/`（设置与导出）
- [ ] Task 12: 迁移训练流程页面
  - [ ] SubTask 12.1: `pages/start/`（开始训练）
  - [ ] SubTask 12.2: `pages/training-execute/`（训练执行，含计时器）
  - [ ] SubTask 12.3: `pages/training-complete/`（训练完成总结）
  - [ ] SubTask 12.4: `pages/training-detail/`（训练详情）
- [ ] Task 13: 迁移周期管理页面
  - [ ] SubTask 13.1: `pages/plan/`（训练计划）
  - [ ] SubTask 13.2: `pages/cycle/`（周期管理）
  - [ ] SubTask 13.3: `pages/onerm/`（1RM 设置）
  - [ ] SubTask 13.4: `pages/pause/`（暂停周期）
  - [ ] SubTask 13.5: `pages/missed/`（处理错过训练）
  - [ ] SubTask 13.6: `pages/week6/`（第6周决策）
- [ ] Task 14: 迁移其他页面
  - [ ] SubTask 14.1: `pages/weight/`（体重记录）
  - [ ] SubTask 14.2: `pages/custom-exercise/`（自定义动作）
- [ ] Task 15: 页面迁移通用规范
  - [ ] SubTask 15.1: Vue 模板 `v-if/v-for/v-model/@click` → WXML `wx:if/wx:for/双向绑定/bindtap`
  - [ ] SubTask 15.2: `<style scoped>` → `index.wxss`，px → rpx 换算
  - [ ] SubTask 15.3: 页面间 `router.push` → `wx.navigateTo`，tab 页跳转 → `wx.switchTab`
  - [ ] SubTask 15.4: 页面 `onLoad/onShow` 中订阅所需 store，`onHide/onUnload` 取消订阅

## 阶段七：文件导入导出适配
- [ ] Task 16: 重写 `exportService.ts`
  - [ ] SubTask 16.1: 导出 JSON/CSV 使用 `wx.getFileSystemManager().writeFile` 写入到用户目录
  - [ ] SubTask 16.2: 调用 `wx.openDocument` 预览或 `wx.shareFileMessage` 分享
  - [ ] SubTask 16.3: 导入使用 `wx.chooseMessageFile` 读取文件并解析还原
  - [ ] SubTask 16.4: 端到端验证：导出 → 导入数据完整还原

## 阶段 7.5：设置页存储模式切换
- [ ] Task 16A: 实现存储模式切换 UI 与逻辑
  - [ ] SubTask 16A.1: 在设置页 `pages/settings/` 新增"数据存储"区块，展示当前模式（云端/本地）+ 切换入口，UI 对照 `设置与导出.html` 设计稿风格
  - [ ] SubTask 16A.2: 切换到本地存储时弹出 `wx.showModal` 二次确认：标题"切换到本地存储"，内容明确告知（① 数据仅保存在当前设备 ② 卸载/清缓存/换设备将丢失 ③ 云端数据不会自动同步到本地，建议先导出备份），含"确认切换/取消"按钮
  - [ ] SubTask 16A.3: 切换到云端存储时弹出 `wx.showModal` 提示：数据将上传到云端账户支持多设备同步，本地数据可选是否清空
  - [ ] SubTask 16A.4: 未登录态切换到云端时引导 `wx.cloud` 匿名登录或 `getUserProfile`，登录成功后再切换
  - [ ] SubTask 16A.5: 切换成功后调用 `storageManager.setMode()`，各 store 重新 `init()` 加载新后端数据；新后端为空时 `wx.showToast` 提示"该存储模式下暂无数据"
  - [ ] SubTask 16A.6: 切换入口与警示文案的 UI 保真度对照设计稿验收

## 阶段八：样式适配（UI 1:1 保真）
- [ ] Task 17: 设计 token 完整迁移
  - [ ] SubTask 17.1: 将 `theme.css` 全部 CSS 变量转写到 `miniprogram/assets/styles/theme.wxss`，挂在 `page` 选择器下（颜色/字号/字重/行高/间距/圆角/阴影/缓动全量迁移，值不得改动）
  - [ ] SubTask 17.2: 迁移排版工具类 `.typography-hero/title/subtitle/body/caption/data/data-lg`，字号/字重/行高/字距与原值一致
  - [ ] SubTask 17.3: 保留字体栈 `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'`，数据元素使用 `'SF Mono','Menlo'`
  - [ ] SubTask 17.4: 在 `app.wxss` 中 `@import` theme.wxss，并设置 `page` 默认 `background:#FFFFFF; color:#1D1D1F; font-family` 等
- [ ] Task 18: 不支持 CSS 特性降级
  - [ ] SubTask 18.1: `backdrop-filter` 降级为 `rgba(255,255,255,0.92)` + `border-top:1px solid #F0F0F5`（TabBar 等）
  - [ ] SubTask 18.2: `*` 通配符、不支持伪类替换为等价 class 选择器
  - [ ] SubTask 18.3: `env(safe-area-inset-bottom)` 改为 `calc(0.5rem + env(safe-area-inset-bottom))` 或 `padding-bottom: constant/env` 兼容写法
- [ ] Task 19: 单位换算
  - [ ] SubTask 19.1: 全局 px → rpx 按 `1px = 2rpx`（375pt 基准）换算，建立换算对照表
  - [ ] SubTask 19.2: 设计稿关键值示例：16px字号→32rpx、8px圆角→16rpx、12px间距→24rpx、4px圆角→8rpx
- [ ] Task 20: 页面级样式适配
  - [ ] SubTask 20.1: 各页面 `index.wxss` 中 Tailwind 类名替换为等价 WXSS，颜色/间距/圆角引用全局变量
  - [ ] SubTask 20.2: 卡片样式统一使用 `--shadow-card` / `--shadow-elevated` / `--shadow-float`，不自行写阴影
- [ ] Task 21: 逐页视觉对照验收
  - [ ] SubTask 21.1: 今日训练（含休息日状态）对照 `今日训练.html` + `休息日.html`
  - [ ] SubTask 21.2: 训练日历对照 `训练日历.html`
  - [ ] SubTask 21.3: 进度统计对照 `进度统计.html`（图表配色/线宽/数据点）
  - [ ] SubTask 21.4: 设置与导出对照 `设置与导出.html`
  - [ ] SubTask 21.5: 开始训练对照 `开始训练.html`
  - [ ] SubTask 21.6: 训练执行对照 `训练执行.html`（计时器、逐组记录）
  - [ ] SubTask 21.7: 训练完成总结对照 `训练完成总结.html`
  - [ ] SubTask 21.8: 训练详情对照 `训练详情.html`
  - [ ] SubTask 21.9: 训练计划对照 `训练计划.html`
  - [ ] SubTask 21.10: 周期管理对照 `周期管理.html`
  - [ ] SubTask 21.11: 1RM 设置对照 `1RM 设置.html`
  - [ ] SubTask 21.12: 暂停周期对照 `暂停周期.html`
  - [ ] SubTask 21.13: 处理错过训练对照 `处理错过训练.html`
  - [ ] SubTask 21.14: 第6周决策对照 `第6周决策.html`
  - [ ] SubTask 21.15: 体重记录对照 `体重记录.html`
  - [ ] SubTask 21.16: 自定义动作对照 `自定义动作.html`

## 阶段九：CloudBase 集成与验证
- [ ] Task 22: CloudBase 集成
  - [ ] SubTask 22.1: 在 `app.ts` 中初始化 `wx.cloud`（或 `@cloudbase/wx-cloud-sdk`），环境 ID 可配置
  - [ ] SubTask 22.2: 验证 CloudBase Skills 可在工程中调用
  - [ ] SubTask 22.3: （可选）接入一个云函数或云存储示例验证链路
- [ ] Task 23: 编译与运行验证
  - [ ] SubTask 23.1: 微信开发者工具打开仓库根目录，编译通过
  - [ ] SubTask 23.2: 逐页面验证渲染、导航、数据读写、导入导出功能
  - [ ] SubTask 23.3: 验证 tabBar 4 个 tab 切换正常
  - [ ] SubTask 23.4: 验证计时器、触摸交互在小程序中行为正常
  - [ ] SubTask 23.5: 逐页 UI 视觉对照设计稿（Task 21 验收结果汇总）

# Task Dependencies
- Task 2 依赖 Task 1（同分支环境下安装 Skills）
- Task 3 ~ Task 4 为工程骨架，须先于其他开发任务完成
- Task 5（类型）、Task 6（纯逻辑 services）须先于 Task 8（stores）完成
- Task 7（存储抽象层）须先于 Task 8 完成
- Task 9（图标）、Task 10（组件）可并行，且须先于页面迁移（Task 11 ~ 14）
- Task 11 ~ 14 可并行（不同页面互不依赖），但都依赖 Task 4、Task 8、Task 9、Task 10
- Task 16（导入导出）依赖 Task 8（stores）完成
- Task 16A（存储模式切换）依赖 Task 7、Task 8、Task 22（CloudBase 初始化）与设置页迁移完成
- Task 17（token 迁移）须先于 Task 20（页面级样式）完成，且强烈建议先于页面迁移完成以提供样式基础
- Task 18、Task 19（降级/单位换算）依赖 Task 17
- Task 21（逐页视觉对照）依赖对应页面迁移完成与 Task 17 ~ 20，含 Task 16A 的设置页存储区块验收
- Task 22 依赖 Task 2 与 Task 4
- Task 23 依赖所有前置任务完成（含 Task 21 逐页 UI 验收）
