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

## 类型与纯逻辑复用
- [ ] `miniprogram/types/` 包含 `cycle.ts`、`record.ts`、`bodyMetric.ts`、`settings.ts`，字段与 H5 版本一致
- [ ] `miniprogram/services/dateService.ts`、`planGenerator.ts`、`statsService.ts` 核心算法与 H5 版本一致
- [ ] services 中无浏览器 API 引用（`localStorage`、`document`、`window`、`Blob` 等）

## 状态管理与持久化
- [ ] `miniprogram/utils/storage.ts` 封装 `wx.setStorageSync / getStorageSync`
- [ ] `miniprogram/stores/` 包含 `cycleStore.ts`、`recordStore.ts`、`bodyMetricStore.ts`、`settingsStore.ts` 单例模块
- [ ] 各 store 支持 `subscribe` 订阅模式
- [ ] 各 store 在 `app.ts` `onLaunch` 中调用 `init()` 从本地存储恢复
- [ ] storage key 命名与 JSON 结构与 H5 版本一致（保证数据迁移兼容）

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

## 文件导入导出
- [ ] `miniprogram/services/exportService.ts` 使用 `wx.getFileSystemManager().writeFile` 实现导出
- [ ] 导出后调用 `wx.openDocument` 或 `wx.shareFileMessage`
- [ ] 导入使用 `wx.chooseMessageFile` 读取文件
- [ ] 端到端验证：导出 JSON/CSV → 导入还原数据完整

## 样式适配
- [ ] `theme.css` 已转写为 `app.wxss` + `theme.wxss`
- [ ] CSS 变量挂在 `page` 选择器
- [ ] 不支持的 CSS 特性（`backdrop-filter`、`*` 通配符）已替换或降级
- [ ] 关键 px 单位已转换为 rpx（1px = 2rpx）
- [ ] 各页面视觉与原设计稿基本一致

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
