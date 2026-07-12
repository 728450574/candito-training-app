# Checklist

## 分支与工具链
- [ ] 已创建 `feature/wechat-miniprogram` 分支并切换到该分支
- [ ] 已成功执行 `npx skills add tencentcloudbase/cloudbase-skills -y`，CloudBase Skills 注册成功
- [ ] uni-app 相关依赖已安装（`@dcloudio/uni-app`、`@dcloudio/uni-mp-weixin`、`@dcloudio/vite-plugin-uni`）

## 工程结构
- [ ] `vite.config.ts` 已引入 `vite-plugin-uni`，移除或调整 `@tailwindcss/vite`
- [ ] `package.json` 包含 `dev:mp-weixin`、`build:mp-weixin` 脚本
- [ ] `src/main.ts` 改造为 uni-app 入口（`createSSRApp`）
- [ ] `manifest.json` 创建完成，含微信小程序 appid 占位
- [ ] `pages.json` 注册全部 15 个页面，"今日训练"位于首位
- [ ] `pages.json` 的 `tabBar` 配置了今日/日历/统计/设置 4 个 tab

## 路由与入口
- [ ] `src/router/index.ts` 已删除
- [ ] `App.vue` 不再使用 `<router-view>`，改为 uni-app 根组件
- [ ] 全局 `router.push` / `useRouter` 已替换为 `uni.navigateTo` / `uni.switchTab`
- [ ] `<router-link>` 已替换为 `navigator` 组件或编程式导航

## 视图与组件
- [ ] 15 个视图已迁移为 `src/pages/<name>/index.vue` 结构
- [ ] 视图中无 `document`、`window` 等浏览器 API 引用
- [ ] AppTabBar 已改造为原生 tabBar 或自定义组件，不再调用 `createIcons`
- [ ] 全项目无 `<i data-lucide>` 残留，图标统一为 iconfont 或图片资源

## 数据与 IO
- [ ] 所有 stores 使用 `uni.getStorageSync` / `uni.setStorageSync` 读写
- [ ] `exportService.ts` 使用 `uni.getFileSystemManager` 实现导出
- [ ] 导入功能使用 `uni.chooseMessageFile` 读取文件
- [ ] 导出 JSON/CSV 可在微信开发者工具中生成并可被回导还原
- [ ] `useSwipe.ts` 使用 `touchstart/touchmove/touchend` 事件
- [ ] `useTimer.ts` 在小程序后台场景下计时行为已验证

## 样式
- [ ] `theme.css` 已转换为 `uni.scss` + 全局样式，CSS 变量挂在 `page` 选择器
- [ ] Tailwind/UnoCSS 原子类在小程序中正常生效
- [ ] 关键 px 单位已转换为 rpx
- [ ] 不支持的 CSS 特性（`backdrop-filter`、`*` 通配符等）已替换或降级

## 验证
- [ ] `npm run dev:mp-weixin` 成功生成 `dist/dev/mp-weixin` 产物
- [ ] 微信开发者工具可打开产物并预览首页
- [ ] 15 个页面均能正常渲染、导航
- [ ] 创建周期、记录训练、修改设置的数据读写正常
- [ ] 导入导出功能端到端验证通过
- [ ] CloudBase Skills 可在工程中调用（至少完成一次示例调用）
