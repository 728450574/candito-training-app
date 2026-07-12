# Checklist

## 分支与工具链
- [ ] 已创建 `feature/wechat-miniprogram` 分支并切换到该分支
- [ ] 原 H5 项目（`candito-v4-training-app/`）代码保持不变
- [ ] 已成功执行 `npx skills add tencentcloudbase/cloudbase-skills -y`，CloudBase Skills 注册成功
- [ ] 已记录 CloudBase Skills 可用能力清单

## 工程骨架
- [ ] 仓库根存在 `project.config.json`，`miniprogramRoot` 指向 `miniprogram/`，`compileType: miniprogram`
- [ ] 仓库根存在 `tsconfig.json`，开启严格模式，TS 编译通过
- [ ] `package.json` 包含 `miniprogram-api-typings` 依赖
- [ ] `miniprogram/sitemap.json` 已创建
- [ ] `miniprogram/app.json` 注册全部 15 个页面，"今日训练"位于首位
- [ ] `miniprogram/app.json` 的 `tabBar` 配置了今日/日历/统计/设置 4 个 tab
- [ ] `miniprogram/app.ts` 含 `onLaunch`，初始化 stores 与 `wx.cloud`
- [ ] `miniprogram/app.wxss` 定义全局 CSS 变量（`page` 选择器）

## 类型与纯逻辑复用（业务逻辑 1:1 保真，硬性验收门槛）
- [ ] `miniprogram/types/` 包含 `cycle.ts`、`record.ts`、`bodyMetric.ts`、`settings.ts`，字段/枚举/接口与 H5 版本完全一致，不得改动
- [ ] `miniprogram/services/dateService.ts`、`planGenerator.ts`、`statsService.ts` 业务算法逐行等价，禁止改写或"优化"
- [ ] `planGenerator.ts`：`roundWeight`、`pct`、`mainSet/mainSets/amrapSet`、`buildAssistanceExercises`、6 周 WeekTemplate 与原一致
- [ ] `statsService.ts`：`epley1RM`（`weight*(1+reps/30)`）、`ONE_RM_MULTIPLIERS {1:1.00,2:1.03,3:1.06,4:1.09}`、`calculateVolume`、`calculateTotalVolume`、`calculateWeeklyCompletion` 与原一致
- [ ] services 中无浏览器 API 引用（`localStorage`、`document`、`window`、`Blob` 等）
- [ ] **等价性验证**：相同输入下，小程序版本与 H5 版本输出完全一致（已记录对照用例与验证结果）
- [ ] `simpleHash`/`calculateChecksum` 校验和算法逐行等价（`((hash << 5) - hash) + char`，`hash |= 0`，转无符号 16 进制补 0 到 8 位）
- [ ] 任一算法输出不一致即视为未完成，不得进入发布流程

## 状态管理与存储抽象层（业务逻辑 1:1 保真）
- [ ] `miniprogram/utils/storage/StorageAdapter.ts` 定义统一接口（`get/set/remove/list/clear`，异步 Promise）
- [ ] `LocalStorageAdapter.ts` 基于 `wx.setStorageSync / getStorageSync`，key 与 H5 版本一致（`candito_cycles`、`candito_active_cycle`、`candito_records`、`candito_body_metrics`、`candito_settings`）
- [ ] `CloudStorageAdapter.ts` 基于 CloudBase 云数据库，按 openid 隔离
- [ ] `storageManager.ts` 管理 `getActiveAdapter / setMode / onModeChange`
- [ ] `miniprogram/stores/` 包含 `cycleStore.ts`、`recordStore.ts`、`bodyMetricStore.ts`、`settingsStore.ts` 单例模块
- [ ] 各 store 通过 `storageManager.getActiveAdapter()` 读写，不直接调用具体后端
- [ ] 各 store 支持 `subscribe` 订阅模式
- [ ] `cycleStore.ts`：`activeCycle` 计算逻辑（排除 terminated/completed）与原 H5 一致
- [ ] `cycleStore.ts`：周期状态机方法（create/pause/resume/terminate/restart/week6Decision/markMissed/makeup）逻辑与原逐行等价
- [ ] 各 store 在 `app.ts` `onLaunch` 中根据 `settingsStore.storageMode` 初始化对应 adapter 并 `init()` 加载
- [ ] storage key 命名与 JSON 结构与 H5 版本一致（保证数据迁移兼容）

## 存储模式切换（设置页）
- [ ] 设置页含"数据存储"区块，展示当前模式（云端/本地）+ 切换入口
- [ ] 切换入口 UI 对照 `设置与导出.html` 设计稿，风格一致
- [ ] 云端 → 本地：弹出 `wx.showModal` 二次确认，内容含三条警示（仅本机、卸载/清缓存/换设备丢失、云端数据不自动同步建议先导出）
- [ ] 用户点击"取消"时保持云端模式不变，不执行切换
- [ ] 本地 → 云端：弹出提示告知数据将上传到云端账户支持多设备同步，本地数据可选清空
- [ ] 未登录态切换到云端时引导 `wx.cloud` 匿名登录或 `getUserProfile`
- [ ] 切换成功后调用 `storageManager.setMode()`，各 store 重新 `init()` 加载新后端数据
- [ ] 新后端为空时 `wx.showToast` 提示"该存储模式下暂无数据"
- [ ] `settingsStore.storageMode` 字段持久化在本地（模式本身不依赖云端）

## 图标与组件
- [ ] iconfont 字体文件已放入 `miniprogram/assets/iconfont/`
- [ ] `app.wxss` 中 `@font-face` 引入 iconfont，定义通用 `.icon` 类
- [ ] 全项目无 `data-lucide` 或 `createIcons` 残留
- [ ] 共享组件（exercise-card、stat-chart 等）已实现

## 页面迁移
- [ ] 4 个 tab 页（today/calendar/stats/settings）已迁移
- [ ] 训练流程页面（start/training-execute/training-complete/training-detail）已迁移
- [ ] 周期管理页面（plan/cycle/onerm/pause/missed/week6）已迁移
- [ ] 其他页面（weight/custom-exercise）已迁移
- [ ] Vue 模板指令已转为 WXML 指令（`wx:if/wx:for/bindtap`）
- [ ] 页面间导航使用 `wx.navigateTo`，tab 页跳转使用 `wx.switchTab`
- [ ] 页面 `onLoad/onShow` 订阅 store，`onHide/onUnload` 取消订阅
- [ ] 页面中无 `document`、`window`、`router.push`、`useRouter` 等浏览器/Vue 残留

## 文件导入导出（业务逻辑 1:1 保真）
- [ ] `miniprogram/services/exportService.ts` `ExportData` 结构（version/exportedAt/checksum/data）与原 H5 一致，`EXPORT_VERSION = '1.0.0'`
- [ ] `simpleHash`/`calculateChecksum` 校验和算法逐行等价
- [ ] 导出 JSON/CSV 使用 `wx.getFileSystemManager().writeFile`（IO 层替换，业务逻辑不变）
- [ ] 导出后调用 `wx.openDocument` 或 `wx.shareFileMessage`
- [ ] 导入使用 `wx.chooseMessageFile`（IO 层替换，解析逻辑与原一致）
- [ ] **双向兼容验证**：H5 导出 JSON → 小程序导入完整还原；小程序导出 JSON → H5 导入完整还原

## 样式适配（UI 1:1 保真，硬性验收门槛）
- [ ] `theme.css` 已转写为 `app.wxss` + `theme.wxss`，全部设计 token（颜色/字号/字重/行高/间距/圆角/阴影/缓动）值不得改动
- [ ] CSS 变量挂在 `page` 选择器
- [ ] 排版工具类 `.typography-hero/title/subtitle/body/caption/data/data-lg` 保留，字号/字重/行高/字距与原值一致
- [ ] 字体栈保留 `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'`，数据元素用 `'SF Mono','Menlo'`
- [ ] 不支持的 CSS 特性（`backdrop-filter` 降级为 `rgba(255,255,255,0.92)` + 顶部细线、`*` 通配符替换）已处理
- [ ] 关键 px 单位已转换为 rpx（1px = 2rpx，375pt 基准）
- [ ] **逐页 UI 验收**：17 个设计稿对应页面（含休息日状态合并到今日训练页）已逐项对照，背景色/卡片/按钮/列表项/间距/字号/字重/颜色/圆角/阴影均与设计稿一致
- [ ] 任一页面未通过设计稿对照即视为未完成，不得进入发布流程

## CloudBase 集成
- [ ] `app.ts` 中 `wx.cloud.init` 完成，环境 ID 可配置
- [ ] CloudBase Skills 可在工程中调用
- [ ] （可选）至少完成一次云函数或云存储示例调用

## 最终验证
- [ ] 微信开发者工具可打开仓库根目录，编译通过无报错
- [ ] 首页（今日训练）正常渲染
- [ ] 15 个页面均能正常渲染、导航
- [ ] tabBar 4 个 tab 切换正常
- [ ] 创建周期、记录训练、修改设置的数据读写正常
- [ ] 计时器、触摸交互在小程序中行为正常
- [ ] 导入导出功能端到端验证通过
