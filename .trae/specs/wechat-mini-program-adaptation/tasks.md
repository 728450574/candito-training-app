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

## 阶段三：类型与纯逻辑层复用
- [ ] Task 5: 复用 TypeScript 类型定义
  - [ ] SubTask 5.1: 将 `candito-v4-training-app/src/types/*.ts` 复制到 `miniprogram/types/`
  - [ ] SubTask 5.2: 验证类型在 TS 编译中无报错（无浏览器类型依赖）
- [ ] Task 6: 复用纯逻辑 services
  - [ ] SubTask 6.1: 将 `dateService.ts`、`planGenerator.ts`、`statsService.ts` 复制到 `miniprogram/services/`
  - [ ] SubTask 6.2: 审查并移除/替换任何隐含的浏览器 API 引用（如 `Date` 使用保持，无 `localStorage`）
  - [ ] SubTask 6.3: 单元测试或手动调用验证算法输出与 H5 版本一致

## 阶段四：状态管理与持久化
- [ ] Task 7: 实现存储工具
  - [ ] SubTask 7.1: 创建 `miniprogram/utils/storage.ts`：封装 `wx.setStorageSync / getStorageSync`，提供类型安全的读写接口
  - [ ] SubTask 7.2: 定义与 H5 版本一致的 storage key 命名约定
- [ ] Task 8: 重写 Pinia stores 为 TS 单例模块
  - [ ] SubTask 8.1: 创建 `miniprogram/stores/cycleStore.ts`：模块级 state + `subscribe` 订阅模式 + 持久化
  - [ ] SubTask 8.2: 创建 `miniprogram/stores/recordStore.ts`
  - [ ] SubTask 8.3: 创建 `miniprogram/stores/bodyMetricStore.ts`
  - [ ] SubTask 8.4: 创建 `miniprogram/stores/settingsStore.ts`
  - [ ] SubTask 8.5: 在 `app.ts` `onLaunch` 中调用各 store 的 `init()` 从本地存储恢复状态

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
- Task 7（存储工具）须先于 Task 8 完成
- Task 9（图标）、Task 10（组件）可并行，且须先于页面迁移（Task 11 ~ 14）
- Task 11 ~ 14 可并行（不同页面互不依赖），但都依赖 Task 4、Task 8、Task 9、Task 10
- Task 16（导入导出）依赖 Task 8（stores）完成
- Task 17（token 迁移）须先于 Task 20（页面级样式）完成，且强烈建议先于页面迁移完成以提供样式基础
- Task 18、Task 19（降级/单位换算）依赖 Task 17
- Task 21（逐页视觉对照）依赖对应页面迁移完成与 Task 17 ~ 20
- Task 22 依赖 Task 2 与 Task 4
- Task 23 依赖所有前置任务完成（含 Task 21 逐页 UI 验收）
