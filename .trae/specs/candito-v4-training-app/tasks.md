# Tasks

## Phase 1: 项目骨架与基础设施

### Task 1: 初始化 Vue 3 + Vite + TypeScript 项目
创建项目脚手架，安装所有依赖（Vue 3, Vite, TypeScript, Tailwind CSS v4, Pinia, Vue Router 4, Lucide Icons）。
- [ ] 使用 Vite 创建 Vue 3 + TypeScript 项目
- [ ] 安装 Tailwind CSS v4（Vite 插件方式）
- [ ] 安装 Pinia、Vue Router 4
- [ ] 安装 lucide-vue-next 图标库
- [ ] 安装 uuid 生成库
- [ ] 配置 vite.config.ts（路径别名 @/）
- [ ] 配置 tsconfig.json（路径映射）

### Task 2: 设计 Token 系统 + 全局样式
将设计稿中的 CSS 变量完整迁移到 `src/assets/theme.css`，配置 Tailwind 使用这些变量。
- [ ] 创建 `src/assets/theme.css`（完整 CSS 变量定义）
- [ ] 配置 Tailwind 扩展 theme（引用 CSS 变量）
- [ ] 定义排版工具类（typography-hero, typography-title 等）
- [ ] 在 main.ts 中引入全局样式

### Task 3: 路由配置 + 底部导航栏
搭建 Vue Router，创建所有页面占位组件，实现底部 TabBar 导航。
- [ ] 配置 `src/router/index.ts`（所有路由定义）
- [ ] 创建 AppTabBar.vue（4个导航项：今日/日历/统计/设置）
- [ ] 创建所有17个 View 的占位 `.vue` 文件
- [ ] 在 App.vue 中集成 RouterView + TabBar
- [ ] 隐藏不需要 TabBar 的页面（如训练执行页）

### Task 4: 数据模型定义 + Service 层
所有 TypeScript 类型定义和纯函数业务逻辑。数据模型以 spec.md 统一定义为准。
- [ ] 创建 `src/types/cycle.ts`（Cycle, Week, TrainingDay, DayStatus, BatchProcessRecord）
- [ ] 创建 `src/types/exercise.ts`（PlannedExercise, PlannedSet, ExerciseType）
- [ ] 创建 `src/types/record.ts`（WorkoutRecord, ExerciseRecord, SetRecord）
- [ ] 创建 `src/types/bodyMetric.ts`（BodyMetric）
- [ ] 创建 `src/types/settings.ts`（UserSettings）
- [ ] 创建 `src/types/pause.ts`（PauseRecord, PauseReason, RestartRecord, ResumeOption, MissedAction）
- [ ] 创建 `src/services/planGenerator.ts`（6周计划自动生成算法 + 重量计算，weightRounding 优先级 Cycle > Settings）
- [ ] 创建 `src/services/dateService.ts`（日期计算工具：三日期体系、暂停顺延、错过检测）
- [ ] 创建 `src/services/statsService.ts`（统计计算：容量、完成率、趋势、第6周1RM估计实时计算不持久化）
- [ ] 创建 `src/services/exportService.ts`（JSON/CSV 导出 + 导入校验 + 数据合并）

### Task 5: Pinia Store 层
数据持久化层（localStorage），封装 CRUD 操作。训练记录按 cycleId 分片存储。
- [ ] 创建 `src/stores/cycleStore.ts`（周期 CRUD + localStorage 读写，存储键 `candito_cycles`）
- [ ] 创建 `src/stores/recordStore.ts`（训练记录 CRUD，存储键 `candito_records_{cycleId}` 按周期分片）
- [ ] 创建 `src/stores/bodyMetricStore.ts`（体重记录 CRUD，存储键 `candito_metrics`）
- [ ] 创建 `src/stores/settingsStore.ts`（设置读写 + 默认值，存储键 `candito_settings`）
- [ ] 创建 `src/composables/useTimer.ts`（训练计时器 composable：总时长 + 组间休息倒计时）
- [ ] 创建 `src/composables/useWeightFormat.ts`（重量格式化 composable：取整 + 单位转换）

## Phase 2: 核心页面实现（按用户流程顺序）

### Task 6: 开始训练页面（StartTraining.vue）
1:1还原设计稿 `开始训练.html`，包含品牌区、1RM输入、单位切换、日期选择、CTA按钮。
- [ ] 实现品牌Logo + "Candito 训练助手"标题
- [ ] 实现 kg/lb 单位切换
- [ ] 实现三大项1RM输入（深蹲/卧推/硬拉）
- [ ] 实现开始日期显示
- [ ] 实现"创建训练周期"按钮
- [ ] 接入 cycleStore（创建周期 + 跳转）

### Task 7: 今日训练页面（TodayTraining.vue）
1:1还原设计稿 `今日训练.html`，包含3种状态切换。
- [ ] **状态1：训练日-未训练** - 训练内容卡片 + 开始训练按钮 + 快速统计栏 + 跳过/放假/错过训练链接
- [ ] **状态2：训练日-已训练** - 完成提示 + 训练数据摘要 + 下次训练预览
- [ ] **状态3：休息日** - 休息日标题 + 下次训练倒计时 + 快捷入口
- [ ] 接入 cycleStore + recordStore（判断当天状态）
- [ ] 实现第6周决策入口链接
- [ ] 实现跳过训练功能

### Task 8: 训练执行页面（TrainingExecution.vue）
1:1还原设计稿 `训练执行.html`，实时训练功能。
- [ ] 顶部导航栏（返回/标题/暂停按钮）
- [ ] 训练总时长计时器 + 圆形进度指示器
- [ ] 组间休息倒计时显示
- [ ] 当前动作标题 + 主项/辅助项标签 + 进度（第X组/共X组）
- [ ] 目标信息展示（目标重量 × 目标次数）
- [ ] 实际重量输入 + 次数选择器（4-8按钮）
- [ ] "完成本组"按钮（记录数据，切换到下一组）
- [ ] 组状态列表（已完成/当前/待完成3种视觉状态）
- [ ] MR10动态提示卡片（第2周专用）
- [ ] 下一个动作预览
- [ ] "完成训练"按钮（生成WorkoutRecord，跳转总结页）
- [ ] 接入 useTimer composable

### Task 9: 训练完成总结页面（TrainingComplete.vue）
1:1还原设计稿 `训练完成总结.html`。
- [ ] 完成头部（绿色对勾 + "训练完成！" + 基本信息）
- [ ] 训练摘要卡片（每个动作的组详情）
- [ ] 统计指标（总容量 / 时长 / 平均休息）
- [ ] MR10特殊提示（第2周专用）
- [ ] 体重记录区域
- [ ] 训练笔记 textarea
- [ ] 训练感受星级评分（1-5星可点击）
- [ ] "完成打卡"按钮 + "返回今日"链接

### Task 10: 训练详情页面（TrainingDetail.vue）
1:1还原设计稿`训练详情.html`，查看历史训练记录。
- [ ] 顶部导航栏（返回 + 标题）
- [ ] 会话头部卡片（日期/类型/状态/时长/体重/感受）
- [ ] 训练笔记区域
- [ ] 主项训练区域（每个动作的组详情列表）
- [ ] 辅助训练区域
- [ ] 底部汇总卡片（总容量/总组数/平均休息）

### Task 11: 训练计划总览页面（TrainingPlan.vue）
1:1还原设计稿`训练计划.html`。
- [ ] 顶部导航栏
- [ ] 当前位置横幅（第X周 + 进度圆点）
- [ ] 周选择器（W1-W6横向滚动，已完成=绿色对勾，当前=蓝色，待训练=灰色）
- [ ] Day Cards（已完成/进行中/待训练 3种状态，左侧颜色条 + 动作列表 + 重量）
- [ ] 点击 Day Card 跳转到训练详情

### Task 12: 训练日历页面（TrainingCalendar.vue）
1:1还原设计稿`训练日历.html`。
- [ ] 月标题 + 左右切换箭头
- [ ] 周期指示器（第X周 · 进行中）
- [ ] 周视图（7天横向条，今天蓝色圆点高亮）
- [ ] 完整月历网格（含日期、状态圆点、今天高亮）
- [ ] 图例（已完成=绿/今日=蓝/待训练=灰/未完成=橙）
- [ ] 选中日期详情卡片（日期/训练类型/动作摘要/查看详情按钮）
- [ ] 底部导航栏（日历高亮）

## Phase 3: 周期管理与训练流程

### Task 13: 1RM设置页面（OneRMSetup.vue）
1:1还原设计稿`1RM设置.html`。
- [ ] 顶部导航栏（返回 + "设置 1RM"）
- [ ] kg/lb 单位切换
- [ ] 三大项卡片（深蹲/卧推/硬拉各一卡）
  - 动作图标 + 中英文名称
  - 大字号1RM数值 + 底部横线
  - 快速调节按钮（-5/-2.5/+2.5/+5）
  - 周预览行（W1/W3/W5 重量预览）
- [ ] 辅助训练配置区（上背部#1/肩部/上背部#2，带切换按钮）
- [ ] 6周计划预览表格
- [ ] "保存并生成计划"按钮

### Task 14: 周期管理页面（CycleManagement.vue）
1:1还原设计稿`周期管理.html`。
- [ ] 当前周期卡片（名称/状态/进度条/开始日期/1RM/操作按钮）
- [ ] 训练周进度时间线（W1-W6 纵向时间线，带节点状态）
- [ ] 暂停记录区（可展开/折叠）
- [ ] 历史周期列表（已完成/已终止）
- [ ] 重新开始操作区
- [ ] 暂停周期按钮
- [ ] 终止周期按钮（危险操作区）

### Task 15: 暂停周期页面（PauseCycle.vue）
1:1还原设计稿`暂停周期.html`。
- [ ] 当前进度上下文卡片
- [ ] 暂停原因选择（小长假/出差/受伤/其他，单选 + 对勾标记）
- [ ] 自定义原因输入（选"其他"时显示）
- [ ] 预计暂停时长（3天/5天/7天/自定义，单选按钮）
- [ ] 自定义日期范围（选"自定义"时显示）
- [ ] 受影响训练预览列表
- [ ] "确认暂停"按钮

### Task 16: 处理错过训练页面（MissedWorkouts.vue）
1:1还原设计稿`处理错过训练.html`。
- [ ] 提示横幅（"检测到 N 个错过的训练日"）
- [ ] 错过天列表（每卡：训练信息 + 日期 + 补练/跳过/顺延按钮）
- [ ] 出差跳过（折叠面板，日期范围 + 应用按钮）
- [ ] 全部顺延 / 全部跳过 快捷操作
- [ ] "确认处理"按钮

### Task 17: 第6周决策页面（Week6Decision.vue）
1:1还原设计稿`第6周决策.html`。
- [ ] 庆祝头部（"恭喜完成第5周！"）
- [ ] 第5周三大项结果卡片（重量×次数）
- [ ] 预估新1RM卡片（深蹲/卧推/硬拉的计算公式+结果）
- [ ] 三个决策选项（Radio样式，推荐标签）：
  - 直接开始新周期（推荐）
  - 减载周
  - 实测1RM
- [ ] "确认选择"按钮

### Task 18: 自定义动作页面（CustomExercise.vue）
1:1还原设计稿`自定义动作.html`。
- [ ] 动作类目选择（上背部#1/肩部/上背部#2）
- [ ] 预设动作库列表（可勾选）
- [ ] 自定义动作名称输入
- [ ] 确认/取消操作

## Phase 4: 统计与设置

### Task 19: 进度统计页面（ProgressStats.vue）
1:1还原设计稿`进度统计.html`。
- [ ] 页面标题 + 周期选择器（本周期/历史/全部）
- [ ] 概览卡片（总训练/总容量/平均感受）
- [ ] 跨周期1RM趋势图（SVG折线图：深蹲蓝/卧推紫/硬拉橙）
- [ ] 每周完成进度条（W1-W5 各一行）
- [ ] 体重趋势迷你图（SVG）
- [ ] 记录体重入口按钮

### Task 20: 设置与导出页面（SettingsExport.vue）
1:1还原设计稿`设置与导出.html`。
- [ ] 训练偏好区（默认单位/组间休息/重量取整/训练提醒开关）
- [ ] 数据管理区（导出JSON/导出CSV/导入数据）
- [ ] 导入冲突预览（检测到冲突时显示）
- [ ] 周期管理入口链接
- [ ] 关于区（应用名称/版本/数据来源）

### Task 21: 体重记录页面（WeightRecord.vue）
1:1还原设计稿`体重记录.html`。
- [ ] 当前体重卡片（大字体重 + 变化量 + 最后记录日期）
- [ ] 记录体重输入区（体重输入 + 日期 + 保存按钮）
- [ ] 体重趋势图（SVG折线图，30天）
- [ ] 历史记录列表（日期/体重/变化量）
- [ ] "查看全部"链接

## Phase 5: 收尾与验证

### Task 22: 多端适配 + 边界处理
- [ ] 移动端安全区适配（safe-area-inset-bottom）
- [ ] 触摸交互优化（active 状态、最小点击区域 44px）
- [ ] 数字输入优化（inputmode="decimal"）
- [ ] 滚动列表使用 `no-scrollbar` 隐藏滚动条
- [ ] 桌面端居中 + 背景色区分
- [ ] 空状态处理（无训练周期时的引导状态）
- [ ] 加载状态（数据读取中）

### Task 23: 数据校验 + 错误处理
- [ ] 1RM 输入范围校验（>0, <999）
- [ ] 导入数据 Schema 校验
- [ ] 导入数据版本兼容检查
- [ ] 训练记录完整性校验
- [ ] localStorage 容量检测

### Task 24: 构建验证 + 可运行检查
- [ ] `npm run build` 无错误
- [ ] `npm run dev` 可正常启动
- [ ] 所有路由可正常导航
- [ ] 数据持久化正常（刷新页面数据不丢失）

# Task Dependencies
- Task 2 → Task 1（Tailwind 配置依赖项目初始化）
- Task 3 → Task 1, Task 2（路由依赖项目 + 样式）
- Task 4 → Task 1（类型定义独立于其他）
- Task 5 → Task 4（Store 依赖类型定义）
- Task 6 → Task 1-5（所有页面依赖基础层）
- Task 7-21 → Task 1-5（所有页面依赖基础层）
- Task 7-21 之间无依赖，可并行开发
- Task 8 → Task 5（训练执行依赖 useTimer composable）
- Task 22-24 → Task 6-21（收尾依赖所有页面完成）
