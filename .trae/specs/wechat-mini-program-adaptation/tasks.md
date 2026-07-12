# Tasks

## 阶段一：分支与工具链准备
- [ ] Task 1: 创建小程序适配分支
  - [ ] SubTask 1.1: 执行 `git checkout -b feature/wechat-miniprogram` 基于当前主干创建分支
  - [ ] SubTask 1.2: 验证分支已切换并推送（如需）
- [ ] Task 2: 安装 CloudBase Skills
  - [ ] SubTask 2.1: 执行 `npx skills add tencentcloudbase/cloudbase-skills -y`
  - [ ] SubTask 2.2: 验证 Skills 注册成功（查看 `.skills/` 或对应配置目录）

## 阶段二：uni-app 工程改造
- [ ] Task 3: 接入 uni-app 构建链路
  - [ ] SubTask 3.1: 安装 uni-app 依赖（`@dcloudio/uni-app`、`@dcloudio/uni-mp-weixin`、`@dcloudio/vite-plugin-uni` 等）
  - [ ] SubTask 3.2: 改造 `vite.config.ts`，引入 `vite-plugin-uni`，移除/调整 `@tailwindcss/vite`
  - [ ] SubTask 3.3: 改造 `package.json` 脚本：新增 `dev:mp-weixin`、`build:mp-weixin`
  - [ ] SubTask 3.4: 改造 `src/main.ts` 为 uni-app 入口（`createSSRApp` + uni 初始化）
  - [ ] SubTask 3.5: 创建 `manifest.json`（uni-app 工程配置，含小程序 appid 占位）
  - [ ] SubTask 3.6: 创建 `pages.json`（注册 15 个页面，配置 tabBar）
- [ ] Task 4: 路由与入口迁移
  - [ ] SubTask 4.1: 删除 `src/router/index.ts`
  - [ ] SubTask 4.2: 改造 `App.vue`，移除 `<router-view>`，改为 uni-app 根组件
  - [ ] SubTask 4.3: 将 TabBar 配置迁移到 `pages.json` 的 `tabBar` 字段（今日/日历/统计/设置 4 个 tab）
  - [ ] SubTask 4.4: 全局替换 `router.push` / `useRouter` 为 `uni.navigateTo` / `uni.switchTab`

## 阶段三：视图与组件迁移
- [ ] Task 5: 迁移 15 个视图为 uni-app 页面
  - [ ] SubTask 5.1: 将 `src/views/*.vue` 移动到 `src/pages/<name>/index.vue` 结构
  - [ ] SubTask 5.2: 替换视图中的 DOM 专属 API（如 `document`、`window`）
  - [ ] SubTask 5.3: 将 `<router-link>` 改为 `navigator` 组件或编程式导航
- [ ] Task 6: 改造 AppTabBar 组件
  - [ ] SubTask 6.1: 评估使用原生 tabBar 还是自定义 tabBar 组件
  - [ ] SubTask 6.2: 替换 Lucide 图标为 iconfont 或图片资源
  - [ ] SubTask 6.3: 移除 `createIcons` 调用逻辑
- [ ] Task 7: 图标方案全局替换
  - [ ] SubTask 7.1: 整理项目中使用的 Lucide 图标清单
  - [ ] SubTask 7.2: 引入 iconfont 字体文件或下载对应 PNG 资源
  - [ ] SubTask 7.3: 全局替换 `<i data-lucide>` 与 `createIcons` 调用

## 阶段四：数据与 IO 层适配
- [ ] Task 8: 持久化层适配
  - [ ] SubTask 8.1: 在 stores 中将 `localStorage.getItem/setItem` 替换为 `uni.getStorageSync/setStorageSync`
  - [ ] SubTask 8.2: 验证 `cycleStore`、`recordStore`、`bodyMetricStore`、`settingsStore` 读写正常
- [ ] Task 9: 文件导入导出适配
  - [ ] SubTask 9.1: 重写 `exportService.ts`，导出使用 `uni.getFileSystemManager().writeFile` + `uni.shareFile` 或保存到用户目录
  - [ ] SubTask 9.2: 导入使用 `uni.chooseMessageFile`（小程序）读取文件并解析
  - [ ] SubTask 9.3: 验证导出 JSON/CSV 在微信开发者工具中可生成并可被回导
- [ ] Task 10: composables 适配
  - [ ] SubTask 10.1: `useSwipe.ts` 替换为 uni-app `touchstart/touchmove/touchend` 事件
  - [ ] SubTask 10.2: `useTimer.ts` 验证 `setInterval` 在小程序后台/熄屏场景下的行为，必要时改用 `setStorage` 持久化开始时间

## 阶段五：样式适配
- [ ] Task 11: 样式系统适配
  - [ ] SubTask 11.1: 将 `theme.css` 转换为 `uni.scss` + 全局样式，CSS 变量挂在 `page` 选择器
  - [ ] SubTask 11.2: Tailwind 类名通过 `uni-app` 内置的 Tailwind 支持或 `unocss` 适配，确认常用原子类生效
  - [ ] SubTask 11.3: 将关键 px 单位转换为 rpx（按设计稿基准换算）
  - [ ] SubTask 11.4: 处理小程序不支持的 CSS 特性（`backdrop-filter`、某些伪类、`*` 通配符等）

## 阶段六：验证与联调
- [ ] Task 12: 编译与运行验证
  - [ ] SubTask 12.1: 执行 `npm run dev:mp-weixin` 生成产物
  - [ ] SubTask 12.2: 在微信开发者工具中打开 `dist/dev/mp-weixin` 预览
  - [ ] SubTask 12.3: 逐页面验证渲染、导航、数据读写、导入导出功能
- [ ] Task 13: CloudBase Skills 集成验证
  - [ ] SubTask 13.1: 确认 CloudBase Skills 可在工程中调用
  - [ ] SubTask 13.2: （可选）接入一个云函数或云存储示例验证链路

# Task Dependencies
- Task 2 依赖 Task 1（同分支环境下安装 Skills）
- Task 3 ~ Task 11 依赖 Task 3 完成（uni-app 工程结构就绪后才能迁移）
- Task 4（路由迁移）应先于 Task 5（视图迁移）完成
- Task 6（TabBar）、Task 7（图标）可并行
- Task 8（持久化）、Task 9（导入导出）、Task 10（composables）可并行
- Task 12 依赖 Task 3 ~ Task 11 全部完成
- Task 13 依赖 Task 2 与 Task 12
