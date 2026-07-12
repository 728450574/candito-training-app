# 微信小程序适配 Spec

## Why
当前 Candito 训练助手为 Vue 3 + Vite 的 H5 单页应用，仅能通过浏览器访问。为触达微信生态用户、支持社交分享并接入云开发后端，需要在保留现有业务逻辑与设计风格的前提下，将项目改造为微信小程序版本，并使用腾讯云 CloudBase Skills 提供的云开发能力。

## What Changes
- 在当前 git 仓库新建小程序适配分支 `feature/wechat-miniprogram`
- 安装 CloudBase Skills CLI 工具：`npx skills add tencentcloudbase/cloudbase-skills -y`
- 引入 uni-app（Vue 3 版本）作为跨端框架，将构建目标指向微信小程序
- 将 15 个 Vue 视图迁移为 uni-app 页面（pages.json 注册 + wx 导航 API）
- 复用现有 Pinia stores、services、types、composables 中的纯 TS 逻辑
- 替换浏览器专属 API：
  - `localStorage` → `uni.setStorageSync / getStorageSync`
  - `Blob / URL.createObjectURL` 导出 → `uni.getFileSystemManager` + 文件保存到用户目录
  - `FileReader` 导入 → `uni.chooseFile / chooseMessageFile`
- 替换 Lucide DOM 图标方案（`createIcons`）为 iconfont 字体图标或静态 PNG 资源
- 将 Tailwind CSS / `theme.css` 适配为小程序 WXSS（使用 rpx 单位、CSS 变量降级方案）
- 改造 `AppTabBar` 为小程序原生 `tabBar`（app.json 配置）或自定义 tabBar 组件
- 配置 `manifest.json`、`pages.json`、`app.json` 等小程序工程文件
- **BREAKING**：H5 路由路径（`/today` 等）映射为小程序页面路径（`pages/today/index`），外部 H5 链接将失效

## Impact
- Affected specs:
  - `candito-v4-training-app`（原始 H5 应用，业务逻辑与设计稿以本 spec 为基础复用）
- Affected code:
  - `candito-v4-training-app/package.json`、`vite.config.ts`、`src/main.ts`（入口与构建配置）
  - `src/router/index.ts`（替换为 pages.json）
  - `src/App.vue`、`src/components/AppTabBar.vue`（TabBar 改造）
  - `src/stores/*`（持久化层切换为小程序存储）
  - `src/services/exportService.ts`（文件 IO 重写）
  - `src/views/*.vue`（15 个视图组件迁移，DOM API 替换）
  - `src/composables/useSwipe.ts`、`useTimer.ts`（触摸/计时事件适配）

## ADDED Requirements

### Requirement: 小程序分支与工具链
系统 SHALL 在当前 git 仓库中创建独立的微信小程序适配分支，并安装 CloudBase Skills 工具链以支持后续云开发能力接入。

#### Scenario: 分支创建
- **WHEN** 执行分支创建命令
- **THEN** 仓库存在 `feature/wechat-miniprogram` 分支，且基于当前主干最新提交

#### Scenario: CloudBase Skills 安装
- **WHEN** 执行 `npx skills add tencentcloudbase/cloudbase-skills -y`
- **THEN** 项目中成功注册 CloudBase Skills，可在后续开发中调用云函数、云存储、云数据库能力

### Requirement: uni-app 工程结构
系统 SHALL 基于 uni-app（Vue 3）改造现有项目，编译产物可在微信开发者工具中正常运行。

#### Scenario: 编译产物
- **WHEN** 执行 `npm run dev:mp-weixin`（或对应命令）
- **THEN** 生成 `dist/dev/mp-weixin` 目录，可用微信开发者工具打开并预览

#### Scenario: 页面注册
- **WHEN** 查看产物 `app.json`
- **THEN** 15 个页面均已注册于 `pages` 数组，其中"今日训练"为首页（位于首位）

### Requirement: 数据持久化适配
系统 SHALL 将原有基于 `localStorage` 的数据持久化切换为微信小程序本地存储 API，保证数据模型与字段一致。

#### Scenario: 数据读写
- **WHEN** 用户在小程序中创建周期、记录训练或修改设置
- **THEN** 数据通过 `uni.setStorageSync` 写入，且 key 命名、JSON 结构与 H5 版本保持一致

#### Scenario: 数据迁移
- **WHEN** 用户从小程序版本读取 H5 版本导出的 JSON
- **THEN** 能够正确解析并还原全部周期、记录、身体指标与设置

### Requirement: 图标方案替换
系统 SHALL 使用 iconfont 字体图标或静态图片资源替代原 Lucide DOM 渲染方案，保证 TabBar 与页面内图标视觉一致。

#### Scenario: 图标渲染
- **WHEN** 页面或 TabBar 渲染图标
- **THEN** 图标在小程序环境中正常显示，不依赖 `document` 或 `createIcons` 调用

### Requirement: 文件导入导出适配
系统 SHALL 使用小程序文件系统 API 实现 JSON/CSV 数据导出与导入，导出文件可保存至用户目录或通过分享发送。

#### Scenario: 导出
- **WHEN** 用户点击"导出数据"
- **THEN** 生成 JSON/CSV 文件并写入用户可访问目录，或调用分享能力发送

#### Scenario: 导入
- **WHEN** 用户选择文件导入
- **THEN** 通过 `uni.chooseMessageFile` 或 `chooseFile` 读取文件并解析还原数据

## MODIFIED Requirements

### Requirement: 路由与导航
原有 Vue Router 配置 SHALL 改为 uni-app 的 `pages.json` 配置 + `uni.navigateTo / switchTab` 导航。原路由 `meta.showTabBar` 决定是否使用 `tabBar` 页面跳转方式。

### Requirement: 样式系统
原有 Tailwind CSS + `theme.css` SHALL 适配为小程序 WXSS：
- 像素单位按 `1px = 2rpx`（或设计稿基准）转换为 rpx
- CSS 变量在 WXSS 中通过 `page { --var: value }` 定义并在组件中引用
- 不支持的选择器（如 `*`、某些伪类）需替换

## REMOVED Requirements

### Requirement: Vue Router 与浏览器 History
**Reason**: 小程序无浏览器 History API，路由由 pages.json + 原生导航栈管理
**Migration**: 删除 `src/router/index.ts`，路由逻辑改为页面间 `uni.navigateTo` 调用；`App.vue` 中的 `<router-view>` 改为 uni-app 页面机制

### Requirement: Vite 构建配置（针对小程序目标）
**Reason**: uni-app 使用自有构建链路（基于 Vite 的 uni-app 插件），原 `vite.config.ts` 中的 `@vitejs/plugin-vue` + `@tailwindcss/vite` 配置需替换
**Migration**: 改用 `@dcloudio/vite-plugin-uni`，Tailwind 通过 PostCSS 或 uni-app 内置方案接入
