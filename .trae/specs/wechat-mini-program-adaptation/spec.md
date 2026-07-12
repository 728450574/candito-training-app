# 微信小程序原生重构 Spec

## Why
当前 Candito 训练助手为 Vue 3 + Vite 的 H5 单页应用，仅能通过浏览器访问。为触达微信生态用户、支持社交分享并接入云开发后端，决定在新分支上使用**微信小程序原生框架**（WXML/WXSS/JS/TS）重写项目，以获得最佳性能、最小包体积、完整原生能力支持，且不依赖任何第三方跨端框架。同时通过 CloudBase Skills 接入腾讯云开发能力。原 H5 项目保留在主干分支不受影响。

## What Changes
- 在当前 git 仓库新建小程序适配分支 `feature/wechat-miniprogram`
- 安装 CloudBase Skills CLI 工具：`npx skills add tencentcloudbase/cloudbase-skills -y`
- 在仓库根目录新建 `miniprogram/` 目录，作为微信小程序原生工程源码根
- 配置工程文件：`project.config.json`、`tsconfig.json`、`package.json`、`app.json`、`app.ts`、`app.wxss`、`sitemap.json`
- 将原 15 个 Vue 视图重写为原生小程序页面（`pages/<name>/index.{wxml,wxss,ts,json}`）
  - Vue 模板指令（`v-if/v-for/v-model/@click`）→ WXML 指令（`wx:if/wx:for/双向绑定 bindtap`）
  - `<style scoped>` → 对应 `index.wxss`
- 复用现有 TypeScript 类型定义（`src/types/*`）与纯逻辑 services（`dateService`、`planGenerator`、`statsService`）
- **业务逻辑 1:1 保真（硬性验收门槛）**：原 H5 项目的全部业务算法、状态机、数据流、边界处理须在小程序中逐行等价复现，不得简化、改写或"优化"。涉及：
  - 1RM 计算与进度系数（Epley 公式 `weight*(1+reps/30)`、`ONE_RM_MULTIPLIERS {1:1.00, 2:1.03, 3:1.06, 4:1.09}`）
  - 6 周 Candito 计划生成（周模板、`roundWeight`/`pct` 百分比计算、主项/辅助项/可选项构建、AMRAP 组）
  - 训练执行流程（计时器、逐组记录、MR10 动态调整逻辑）
  - 周期状态机（active/paused/terminated/completed 状态流转与 `activeCycle` 计算属性排除逻辑）
  - 错过训练处理、第 6 周决策、暂停周期恢复逻辑
  - 训练量与完成度统计（`calculateVolume`、`calculateWeeklyCompletion`）
  - 数据导入导出格式（`EXPORT_VERSION='1.0.0'`、`simpleHash` 校验和算法、`ExportData` 结构）
  - storage key 命名（`candito_cycles`、`candito_active_cycle` 等）与 JSON 结构
- 将 Pinia stores 重写为原生 TS 单例模块（模块级状态 + 订阅通知），持久化通过**存储抽象层** `StorageAdapter` 实现，支持本地存储与云端存储两种后端，由用户在设置页切换
- 实现存储抽象层 `StorageAdapter`（`get/set/remove/list/clear` 接口）+ `LocalStorageAdapter`（`wx.setStorageSync`）+ `CloudStorageAdapter`（CloudBase 云数据库）
- 在设置页提供存储模式切换入口（云端/本地），切换到本地存储时弹出 `wx.showModal` 二次确认，警示数据丢失风险
- 替换浏览器专属 API：
  - `localStorage` → `StorageAdapter`（底层可指向 `wx.setStorageSync` 或 CloudBase）
  - `Blob / URL.createObjectURL` 导出 → `wx.getFileSystemManager().writeFile` + `wx.openDocument` 或 `wx.shareFileMessage`
  - `FileReader` 导入 → `wx.chooseMessageFile`（小程序内选文件）
- 替换 Lucide DOM 图标方案（`createIcons`）为 iconfont 字体图标
- 将 Tailwind CSS / `theme.css` 转写为小程序 WXSS（rpx 单位、`page` 选择器定义 CSS 变量）
- **UI 1:1 保真**：以 `_design_extracted/pages/` 下 17 个设计稿 HTML 为唯一视觉基准，小程序各页面须像素级还原设计稿
  - 完整迁移 `theme.css` 中的设计 token（颜色、字号、字重、行高、间距、圆角、阴影、缓动）
  - Apple 极简白色设计风格：主色 `#1D1D1F`、训练主色 `#0A84FF`、背景 `#FFFFFF / #F5F5F7`、圆角 `4/8/12/16px`、卡片阴影 `0 0 0 1px #F0F0F5` 等
  - 字体栈保留 `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei'`（小程序 WXSS 支持 `font-family`）
  - 数据展示使用等宽字体 `SF Mono / Menlo` 以保证数字对齐
  - `backdrop-filter` 模糊毛玻璃效果在小程序中降级为半透明纯色（保留 TabBar 88% 白色 + 模糊的视觉意图）
- 改造 `AppTabBar` 为小程序原生 `tabBar`（`app.json` 中配置 `tabBar` 字段，使用 iconfont 或图片资源）
- 路由模型：Vue Router → `app.json` `pages` 注册 + `wx.navigateTo / wx.switchTab / wx.navigateBack`
- 接入 `@cloudbase/wx-cloud-sdk` 或使用 `wx.cloud` 原生能力，为后续云函数/云存储/云数据库预留入口
- **BREAKING**：H5 路由路径（`/today` 等）映射为小程序页面路径（`pages/today/index`），原 H5 入口与小程序入口为两套独立代码

## Impact
- Affected specs:
  - `candito-v4-training-app`（原始 H5 应用，业务逻辑与设计稿以本 spec 为参考源，主干代码不受影响）
- Affected code（均为新增，不修改主干 H5 代码）：
  - 新增 `miniprogram/` 整个原生工程目录
  - 新增 `project.config.json`、`tsconfig.json`、`package.json`（仓库根级小程序工程配置）
  - 新增 `miniprogram/app.{ts,json,wxss}`、`miniprogram/pages/`、`miniprogram/components/`、`miniprogram/services/`、`miniprogram/stores/`、`miniprogram/types/`、`miniprogram/assets/`
  - 参考但不修改：`candito-v4-training-app/src/types/*`、`services/*`、`views/*.vue`、`stores/*`、`assets/theme.css`

## 架构设计

### 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | 微信小程序原生 | WXML/WXSS/JS，无跨端框架 |
| 语言 | TypeScript | 微信开发者工具原生支持 TS 编译 |
| 状态管理 | 自研 TS 单例模块 | 替代 Pinia，模块级 state + subscribe 模式 |
| 持久化 | `wx.setStorageSync` | 替代 localStorage |
| 样式 | WXSS + rpx + CSS 变量 | 替代 Tailwind v4，转写为 WXSS |
| 图标 | iconfont 字体 | 替代 Lucide DOM 渲染 |
| 云开发 | CloudBase Skills + `wx.cloud` | 云函数/云存储/云数据库 |
| 构建 | 微信开发者工具 / miniprogram-ci | 原生工具链 |

### 工程目录结构
```
/workspace/                         # 仓库根
├── candito-v4-training-app/        # 原 H5 项目（不动）
├── miniprogram/                    # 新增：原生小程序源码根
│   ├── app.ts                      # 小程序入口
│   ├── app.json                    # 全局配置（pages、tabBar、window）
│   ├── app.wxss                    # 全局样式（CSS 变量定义）
│   ├── sitemap.json
│   ├── pages/
│   │   ├── today/                  # tab 页（今日训练，首页）
│   │   │   ├── index.wxml
│   │   │   ├── index.wxss
│   │   │   ├── index.ts
│   │   │   └── index.json
│   │   ├── calendar/               # tab 页
│   │   ├── stats/                  # tab 页
│   │   ├── settings/               # tab 页
│   │   ├── start/
│   │   ├── training-execute/
│   │   ├── training-complete/
│   │   ├── training-detail/
│   │   ├── plan/
│   │   ├── cycle/
│   │   ├── onerm/
│   │   ├── pause/
│   │   ├── missed/
│   │   ├── week6/
│   │   ├── weight/
│   │   └── custom-exercise/
│   ├── components/                 # 自定义组件
│   │   ├── tab-bar/                # 自定义 tabBar（如不用原生 tabBar）
│   │   ├── exercise-card/
│   │   └── stat-chart/             # SVG 图表改为 canvas 或 echarts-for-weixin
│   ├── services/                   # 复用纯逻辑（TS 移植）
│   │   ├── dateService.ts
│   │   ├── planGenerator.ts
│   │   ├── statsService.ts
│   │   └── exportService.ts        # 重写：wx 文件系统
│   ├── stores/                     # 单例状态模块
│   │   ├── cycleStore.ts
│   │   ├── recordStore.ts
│   │   ├── bodyMetricStore.ts
│   │   └── settingsStore.ts
│   ├── types/                      # 复用类型定义
│   │   ├── cycle.ts
│   │   ├── record.ts
│   │   ├── bodyMetric.ts
│   │   └── settings.ts
│   ├── utils/
│   │   ├── storage/                # 存储抽象层
│   │   │   ├── StorageAdapter.ts   # 统一接口定义
│   │   │   ├── LocalStorageAdapter.ts   # wx.setStorageSync 实现
│   │   │   ├── CloudStorageAdapter.ts   # CloudBase 云数据库实现
│   │   │   └── storageManager.ts   # 当前激活后端管理 + 切换
│   │   └── navigation.ts           # wx.navigateTo 封装
│   └── assets/
│       ├── iconfont/               # 字体图标文件
│       └── styles/
│           └── theme.wxss          # 全局变量与基础样式
├── project.config.json             # 小程序工程配置
├── tsconfig.json
└── package.json                    # 小程序依赖与脚本
```

## ADDED Requirements

### Requirement: UI 1:1 保真（硬性验收门槛）
系统 SHALL 以 `_design_extracted/pages/` 下 17 个设计稿 HTML 为唯一视觉基准，在小程序中像素级还原 Apple 极简白色设计风格。设计 token 必须完整迁移，不得自行发挥或简化视觉。**UI 保真为硬性验收门槛**：任一页面未通过设计稿逐项对照即视为该页面未完成，不得进入发布流程。

#### Scenario: 设计 token 迁移
- **WHEN** 查看 `miniprogram/app.wxss` 与 `theme.wxss`
- **THEN** 包含原 `theme.css` 的全部 token：
  - 颜色：`--color-primary: #1D1D1F`、`--color-primary-light: #86868B`、`--color-surface: #FFFFFF`、`--color-surface-muted: #F5F5F7`、`--color-border: #E5E5EA`、`--color-border-light: #F0F0F5`
  - 训练色：`--color-training-main: #0A84FF`、`--color-training-assist: #5E5CE6`、`--color-training-optional: #30D158`、`--color-training-rest: #86868B`
  - 状态色：success `#30D158`、warning `#FF9F0A`、error `#FF3B30`、info `#0A84FF`（含 8% 半透明背景）
  - 字号：`xs 0.6875rem / sm 0.75rem / base 0.875rem / md 1rem / lg 1.125rem / xl 1.25rem / 2xl 1.5rem / 3xl 1.75rem / 4xl 2rem`
  - 字重：`400 / 500 / 600 / 700`
  - 行高：`1.2 / 1.5 / 1.65`
  - 间距：`0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 2.5 / 3 / 4rem`
  - 圆角：`4 / 8 / 12 / 16px / 9999px`
  - 阴影：`--shadow-card: 0 0 0 1px #F0F0F5`、`--shadow-elevated: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px #F0F0F5`、`--shadow-float: 0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px #F0F0F5`
  - 缓动：`--ease-default: cubic-bezier(0.25,0.1,0.25,1)`、`--duration-fast: 150ms`、`--duration-normal: 250ms`

#### Scenario: 字体栈保留
- **WHEN** 查看 `app.wxss` 的 `page` 或 `body` 选择器
- **THEN** `font-family` 包含 `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei'`，数据展示元素使用 `'SF Mono', 'Menlo', 'Consolas'` 等宽字体

#### Scenario: 排版工具类保留
- **WHEN** 查看 WXSS
- **THEN** 保留原 `theme.css` 的工具类：`.typography-hero`（4xl/bold/字距-0.02em）、`.typography-title`、`.typography-subtitle`、`.typography-body`、`.typography-caption`、`.typography-data`、`.typography-data-lg`，字号/字重/行高/字距与原值一致

#### Scenario: 单位换算
- **WHEN** 将设计稿 px 值写入 WXSS
- **THEN** 按 `1px = 2rpx`（375pt 设计稿基准）换算，例如设计稿 `16px` 字号 → `32rpx`，`8px` 圆角 → `16rpx`，`12px` 间距 → `24rpx`

#### Scenario: 逐页视觉对照
- **WHEN** 在微信开发者工具中打开任一页面
- **THEN** 与 `_design_extracted/pages/` 下对应设计稿 HTML 逐项对照：背景色、卡片样式、按钮样式、列表项、间距、字号、字重、颜色、圆角、阴影均一致
- **AND** 17 个设计稿均有对应页面覆盖（休息日状态合并到今日训练页）

#### Scenario: 毛玻璃降级
- **WHEN** 渲染 TabBar 或需毛玻璃效果的元素
- **THEN** 因小程序不支持 `backdrop-filter`，使用 `background: rgba(255,255,255,0.92)` + `border-top: 1px solid #F0F0F5` 降级，保留原设计"半透明白色 + 顶部细线"的视觉意图

#### Scenario: 图表视觉
- **WHEN** 渲染进度统计页的图表
- **THEN** 原 SVG 图表改为 `canvas` 或 `echarts-for-weixin` 实现，配色、线宽、数据点样式与设计稿一致（训练主色 `#0A84FF` 折线、辅助色 `#5E5CE6` 等）

### Requirement: 小程序分支与工具链
系统 SHALL 在当前 git 仓库中创建独立的微信小程序适配分支，并安装 CloudBase Skills 工具链以支持后续云开发能力接入。

#### Scenario: 分支创建
- **WHEN** 执行分支创建命令
- **THEN** 仓库存在 `feature/wechat-miniprogram` 分支，基于当前主干最新提交，且原 H5 代码保持不变

#### Scenario: CloudBase Skills 安装
- **WHEN** 执行 `npx skills add tencentcloudbase/cloudbase-skills -y`
- **THEN** 项目中成功注册 CloudBase Skills，可在后续开发中调用云函数、云存储、云数据库能力

### Requirement: 原生小程序工程结构
系统 SHALL 在仓库根目录创建独立的微信小程序原生工程，编译产物可在微信开发者工具中正常运行。

#### Scenario: 工程结构
- **WHEN** 查看仓库根目录
- **THEN** 存在 `miniprogram/` 目录、`project.config.json`、`tsconfig.json`，且 `project.config.json` 的 `miniprogramRoot` 指向 `miniprogram/`

#### Scenario: 编译运行
- **WHEN** 用微信开发者工具打开仓库根目录
- **THEN** 工具能正常加载工程，预览首页（今日训练）无报错

#### Scenario: 页面注册
- **WHEN** 查看 `miniprogram/app.json`
- **THEN** 15 个页面路径均已注册于 `pages` 数组，"今日训练"位于首位；`tabBar` 字段配置了今日/日历/统计/设置 4 个 tab

### Requirement: TypeScript 类型与纯逻辑复用
系统 SHALL 直接复用原 H5 项目的 TypeScript 类型定义与无副作用的纯逻辑 service（不引用浏览器 API 的部分）。

#### Scenario: 类型复用
- **WHEN** 查看 `miniprogram/types/`
- **THEN** 包含 `cycle.ts`、`record.ts`、`bodyMetric.ts`、`settings.ts`，与原 H5 项目字段一致

#### Scenario: 纯逻辑复用
- **WHEN** 查看 `miniprogram/services/dateService.ts`、`planGenerator.ts`、`statsService.ts`
- **THEN** 核心算法与原 H5 版本一致（如 1RM 计算、6 周计划生成、统计数据聚合），且不依赖任何浏览器 API

### Requirement: 业务逻辑 1:1 保真（硬性验收门槛）
系统 SHALL 在小程序中逐行等价复现原 H5 项目的全部业务算法、状态机、数据流与边界处理，不得简化、改写或"优化"。**业务逻辑保真为硬性验收门槛**：任一关键算法输出与 H5 版本不一致即视为未完成。原 H5 services 文件作为"金标准"参考源，小程序版本须通过等价性验证（相同输入 → 相同输出）。

#### Scenario: 1RM 计算保真
- **WHEN** 调用 `epley1RM(weight, reps)`
- **THEN** 公式为 `reps <= 0 ? weight : reps === 1 ? weight : weight * (1 + reps / 30)`，与原 `statsService.ts` 逐行一致
- **AND** `ONE_RM_MULTIPLIERS` 常量为 `{1: 1.00, 2: 1.03, 3: 1.06, 4: 1.09}`，用于周期间 1RM 进度调整

#### Scenario: 6 周计划生成保真
- **WHEN** 调用 `planGenerator.createCycle(input)`（相同 oneRM/unit/weightRounding/startDate/assistanceConfig）
- **THEN** 生成的 Cycle 结构（weeks/days/exercises/sets）与 H5 版本完全一致：
  - `roundWeight(weight, rounding) = Math.round(weight / rounding) * rounding`
  - `pct(value, percent, rounding) = roundWeight(value * percent / 100, rounding)`
  - 主项组（`mainSet/mainSets`）、AMRAP 组（`isAMRAP: true`）、辅助项（`buildAssistanceExercises`）构建逻辑一致
  - 6 周主题、dayOffsets、dayTypes（lower/upper）与原 WeekTemplate 一致

#### Scenario: 训练执行流程保真
- **WHEN** 用户在训练执行页完成一组训练
- **THEN** 逐组记录逻辑（actualWeight/actualReps 写入）、MR10 动态调整算法、计时器启停与原 H5 `useTimer.ts` 及 `TrainingExecution.vue` 逻辑一致

#### Scenario: 周期状态机保真
- **WHEN** 操作周期（创建/暂停/恢复/终止/重新开始/第6周决策）
- **THEN** 状态流转规则与原 `cycleStore.ts` 一致：
  - `activeCycle` 计算属性排除 `status === 'terminated' || 'completed'` 的周期
  - 暂停后恢复、终止后重新开始的字段更新逻辑一致
  - 错过训练处理（makeup 状态）、第 6 周决策（测试组 vs 减重组）逻辑一致

#### Scenario: 统计计算保真
- **WHEN** 调用 `calculateVolume(record)` / `calculateTotalVolume(records)` / `calculateWeeklyCompletion(cycle)`
- **THEN** 输出与原 `statsService.ts` 完全一致：
  - 训练量 = Σ(actualWeight ?? targetWeight ?? 0) × (actualReps ?? 0)
  - 周完成度 = completed(含 makeup) / total × 100，四舍五入取整

#### Scenario: 导入导出格式保真
- **WHEN** 导出数据
- **THEN** `ExportData` 结构（version/exportedAt/checksum/data）与原 `exportService.ts` 一致：
  - `EXPORT_VERSION = '1.0.0'`
  - `simpleHash(str)` 校验和算法逐行一致（`((hash << 5) - hash) + char`，`hash |= 0`，转无符号 16 进制补 0 到 8 位）
  - `calculateChecksum` 使用 `simpleHash`
- **AND** H5 版本导出的 JSON 可被小程序版本导入并完整还原，反之亦然

#### Scenario: 存储 key 与数据结构保真
- **WHEN** 查看 `LocalStorageAdapter` 写入的 key
- **THEN** 与原 H5 版本完全一致：`candito_cycles`、`candito_active_cycle`、`candito_records`、`candito_body_metrics`、`candito_settings`（以原 store 中实际 key 为准）
- **AND** 对应 JSON 结构与字段名一致，保证 H5 与小程序本地存储数据可互通

#### Scenario: 等价性验证
- **WHEN** 对关键算法（1RM、计划生成、训练量、完成度、校验和）编写对照测试
- **THEN** 相同输入下，小程序版本与 H5 版本输出完全一致（建议移植 H5 单元测试或构造对照用例）

### Requirement: 状态管理与持久化
系统 SHALL 将原 Pinia stores 重写为 TypeScript 单例状态模块，并通过存储抽象层持久化（本地或云端，由用户在设置中切换）。

#### Scenario: 状态读写
- **WHEN** 用户在小程序中创建周期、记录训练或修改设置
- **THEN** 状态通过单例模块管理，并通过存储抽象层写入当前激活的存储后端（本地或云端），key 命名与 JSON 结构与 H5 版本保持一致

#### Scenario: 订阅通知
- **WHEN** 某个 store 状态变化
- **THEN** 已订阅的页面/组件能收到通知并更新视图（类似 Pinia 的响应式）

#### Scenario: 数据迁移
- **WHEN** 用户从小程序版本读取 H5 版本导出的 JSON
- **THEN** 能够正确解析并还原全部周期、记录、身体指标与设置

### Requirement: 存储抽象层（本地/云端可切换）
系统 SHALL 提供统一的存储抽象层 `StorageAdapter`，封装本地存储（`wx.setStorageSync`）与云端存储（CloudBase 云数据库）两种实现，stores 仅依赖抽象接口，不直接调用具体后端。

#### Scenario: 抽象接口
- **WHEN** 查看 `miniprogram/utils/storage/`
- **THEN** 存在 `StorageAdapter` 接口定义（`get / set / remove / list / clear` 等方法），以及 `LocalStorageAdapter`（基于 `wx.setStorageSync`）与 `CloudStorageAdapter`（基于 CloudBase 云数据库 collection）两个实现

#### Scenario: 后端切换
- **WHEN** 用户在设置页切换存储模式
- **THEN** stores 使用的存储后端即时切换为对应 adapter，无需修改 store 业务代码

#### Scenario: 默认模式
- **WHEN** 用户首次启动小程序且未选择存储模式
- **THEN** 默认使用云端存储（若 CloudBase 已初始化）或本地存储（作为降级），并在设置页明确展示当前模式

### Requirement: 设置页存储模式切换与数据丢失警示
系统 SHALL 在设置页提供存储模式切换入口（云端存储 / 本地存储），并在用户切换到本地存储时弹出二次确认警示，告知数据存储位置变化及丢失风险。

#### Scenario: 切换入口
- **WHEN** 用户进入设置页
- **THEN** 可见"数据存储"区块，展示当前模式（云端/本地），并提供切换到另一模式的操作入口

#### Scenario: 切换到本地存储的警示
- **WHEN** 用户从云端存储切换到本地存储
- **THEN** 弹出 `wx.showModal` 二次确认，标题如"切换到本地存储"，内容明确告知：
  - 切换后数据仅保存在当前设备本地
  - 卸载小程序、清除缓存或更换设备将导致数据丢失
  - 云端已有数据不会自动同步到本地（建议先导出备份）
- **AND** 用户点击"确认切换"后才执行切换；点击"取消"则保持云端模式不变

#### Scenario: 切换到云端存储的提示
- **WHEN** 用户从本地存储切换到云端存储
- **THEN** 弹出 `wx.showModal` 提示：切换后数据将上传到云端账户，可在多设备间同步；本地数据不会自动清除（可选是否清空本地）

#### Scenario: 切换未登录态
- **WHEN** 用户在未登录 CloudBase 状态下尝试切换到云端存储
- **THEN** 引导用户先完成微信登录（`wx.cloud` 匿名登录或 `getUserProfile`），登录成功后再执行切换

#### Scenario: 切换后数据加载
- **WHEN** 存储模式切换完成
- **THEN** 从新后端加载对应数据刷新各 store；若新后端为空，提示用户"该存储模式下暂无数据"

### Requirement: 图标方案替换
系统 SHALL 使用 iconfont 字体图标替代原 Lucide DOM 渲染方案，保证 TabBar 与页面内图标视觉一致。

#### Scenario: 图标渲染
- **WHEN** 页面或 TabBar 渲染图标
- **THEN** 图标在小程序环境中正常显示，不依赖 `document` 或 `createIcons` 调用

### Requirement: 文件导入导出适配
系统 SHALL 使用小程序文件系统 API 实现 JSON/CSV 数据导出与导入，导出文件可保存至用户目录或通过分享发送。

#### Scenario: 导出
- **WHEN** 用户点击"导出数据"
- **THEN** 通过 `wx.getFileSystemManager().writeFile` 生成 JSON/CSV 文件，并调用 `wx.openDocument` 预览或 `wx.shareFileMessage` 分享

#### Scenario: 导入
- **WHEN** 用户选择文件导入
- **THEN** 通过 `wx.chooseMessageFile` 读取文件并解析还原数据

### Requirement: CloudBase 云开发接入
系统 SHALL 通过 CloudBase Skills 与 `wx.cloud` 或 `@cloudbase/wx-cloud-sdk` 接入云开发能力，为后续云函数、云存储、云数据库提供统一入口。

#### Scenario: 初始化
- **WHEN** 小程序启动
- **THEN** `app.ts` 中完成 `wx.cloud.init`（或对应 SDK 初始化），环境 ID 可配置

#### Scenario: 示例调用
- **WHEN** 调用任一云函数或云存储示例
- **THEN** 链路通畅，返回结果正确

## MODIFIED Requirements

### Requirement: 路由与导航
原 Vue Router 配置 SHALL 改为 `app.json` `pages` 注册 + 原生导航 API。原路由 `meta.showTabBar: true` 的 4 个页面（today/calendar/stats/settings）使用 `wx.switchTab` 跳转，其余页面使用 `wx.navigateTo`。

### Requirement: 样式系统
原 Tailwind CSS + `theme.css` SHALL 转写为小程序 WXSS：
- `1px = 2rpx`（基于 375pt 设计稿基准）单位换算
- CSS 变量在 `app.wxss` 中通过 `page { --var: value }` 定义并在组件中引用
- 不支持的选择器（`*` 通配符、某些伪类）需替换
- `backdrop-filter` 在小程序中不支持，使用纯色背景降级
- SVG 图表改为 `canvas` 或 `echarts-for-weixin` 组件

## REMOVED Requirements

### Requirement: Vue Router 与浏览器 History
**Reason**: 小程序无浏览器 History API，路由由 `app.json` `pages` + 原生导航栈管理
**Migration**: 不再使用 `src/router/index.ts`；页面间通过 `wx.navigateTo` / `wx.switchTab` 跳转

### Requirement: Vue 3 + Vite 构建链路（针对小程序目标）
**Reason**: 原生小程序使用微信开发者工具或 `miniprogram-ci` 构建，不使用 Vite
**Migration**: 原 H5 的 `vite.config.ts`、`@vitejs/plugin-vue`、`@tailwindcss/vite` 在小程序工程中不使用，仅保留在 `candito-v4-training-app/` 目录中供 H5 版本继续使用

### Requirement: Pinia 状态管理
**Reason**: 小程序原生不支持 Vue 响应式系统，Pinia 无法直接使用
**Migration**: 重写为 TS 单例模块（模块级 state + subscribe 订阅模式），保持外部 API 形态与 Pinia store 接近以降低学习成本
