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
- 将 Pinia stores 重写为原生 TS 单例模块（模块级状态 + 订阅通知），持久化使用 `wx.setStorageSync / getStorageSync`
- 替换浏览器专属 API：
  - `localStorage` → `wx.setStorageSync / getStorageSync`
  - `Blob / URL.createObjectURL` 导出 → `wx.getFileSystemManager().writeFile` + `wx.openDocument` 或 `wx.shareFileMessage`
  - `FileReader` 导入 → `wx.chooseMessageFile`（小程序内选文件）
- 替换 Lucide DOM 图标方案（`createIcons`）为 iconfont 字体图标
- 将 Tailwind CSS / `theme.css` 转写为小程序 WXSS（rpx 单位、`page` 选择器定义 CSS 变量）
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
│   │   ├── storage.ts              # wx.setStorageSync 封装
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

### Requirement: 状态管理与持久化
系统 SHALL 将原 Pinia stores 重写为 TypeScript 单例状态模块，并通过微信小程序本地存储持久化。

#### Scenario: 状态读写
- **WHEN** 用户在小程序中创建周期、记录训练或修改设置
- **THEN** 状态通过单例模块管理，并通过 `wx.setStorageSync` 写入本地存储，key 命名与 JSON 结构与 H5 版本保持一致

#### Scenario: 订阅通知
- **WHEN** 某个 store 状态变化
- **THEN** 已订阅的页面/组件能收到通知并更新视图（类似 Pinia 的响应式）

#### Scenario: 数据迁移
- **WHEN** 用户从小程序版本读取 H5 版本导出的 JSON
- **THEN** 能够正确解析并还原全部周期、记录、身体指标与设置

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
