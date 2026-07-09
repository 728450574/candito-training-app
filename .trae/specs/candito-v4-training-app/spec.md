# Candito 训练助手 Spec

## Why
基于约翰尼·坎迪托（Johnnie Candito）的经典6周力量举训练计划，构建一个完整的 H5 单页应用。面向力量训练爱好者，提供1RM计算、6周训练计划自动生成、每日训练打卡、进度统计、数据导入导出等全流程功能。采用 Apple 极简白色设计风格，1:1还原设计稿视觉效果。

## What Changes
- 从零搭建 Vue 3 + Vite + Tailwind CSS + Pinia 项目骨架
- 实现17个页面/状态的完整 UI（基于设计稿 HTML 1:1还原）
- 设计完整数据模型（TypeScript interfaces），数据层与UI层严格分离
- 实现 Pinia Store 作为数据访问层（Repository 模式），模拟后端 API 调用
- 实现训练周期管理（创建/暂停/恢复/终止/重新开始）
- 实现训练执行流程（计时器、逐组记录、MR10动态调整）
- 实现打卡、错过训练处理、第6周决策
- 实现训练日历、进度统计图表（SVG）
- 实现数据导入导出（JSON/CSV）
- 实现多端适配（移动端优先，支持 Tablet/Desktop）
- **BREAKING**: 无（全新项目）

## Impact
- Affected specs: 无（全新项目）
- Affected code: 全新项目，所有文件新建

## 架构设计

### 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 渐进式框架，模板语法类似 JSP/Thymeleaf |
| 构建 | Vite 5 | 极速开发服务器 + 生产构建 |
| UI | Tailwind CSS v4 | 设计稿已使用，直接复用 CSS 变量 |
| 图标 | Lucide Icons | 设计稿已使用 |
| 状态管理 | Pinia | 类似 Spring Service 层，数据逻辑与 UI 分离 |
| 路由 | Vue Router 4 | SPA 页面导航 |
| 语言 | TypeScript | 类型安全，Java 开发者友好 |

### 项目结构（类比 Spring Boot）
```
candito-v4-training-app/
├── index.html                    # 入口 HTML
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件
│   ├── types/                    # 数据模型（类比 Java Entity/POJO），共13个实体
│   │   ├── cycle.ts              # Cycle, Week, TrainingDay, BatchProcessRecord
│   │   ├── exercise.ts           # PlannedExercise, PlannedSet
│   │   ├── record.ts             # WorkoutRecord, ExerciseRecord, SetRecord
│   │   ├── bodyMetric.ts         # BodyMetric
│   │   ├── settings.ts           # UserSettings
│   │   └── pause.ts              # PauseRecord, RestartRecord, 枚举类型
│   ├── services/                 # 业务逻辑层（类比 Spring Service）
│   │   ├── cycleService.ts       # 周期创建、状态流转
│   │   ├── planGenerator.ts      # 6周计划自动生成（重量计算）
│   │   ├── recordService.ts      # 训练记录 CRUD
│   │   ├── statsService.ts       # 统计计算
│   │   ├── exportService.ts      # 导入导出
│   │   └── dateService.ts        # 日期计算（暂停顺延等）
│   ├── stores/                   # 数据访问层（类比 Spring Repository + Cache）
│   │   ├── cycleStore.ts         # 周期数据管理
│   │   ├── recordStore.ts        # 训练记录管理
│   │   ├── bodyMetricStore.ts    # 体重记录管理
│   │   └── settingsStore.ts      # 用户设置管理
│   ├── composables/              # 可复用组合函数
│   │   ├── useTimer.ts           # 训练计时器
│   │   ├── useMissedWorkouts.ts  # 错过训练检测
│   │   └── useWeightFormat.ts    # 重量格式化
│   ├── router/                   # 路由配置
│   │   └── index.ts
│   ├── views/                    # 页面组件（17个页面/状态）
│   │   ├── StartTraining.vue     # 开始训练（创建周期）
│   │   ├── TodayTraining.vue     # 今日训练（含3种状态）
│   │   ├── TrainingExecution.vue # 训练执行（计时器 + 组记录）
│   │   ├── TrainingComplete.vue  # 训练完成总结
│   │   ├── TrainingDetail.vue    # 训练详情
│   │   ├── TrainingPlan.vue      # 训练计划总览
│   │   ├── TrainingCalendar.vue  # 训练日历
│   │   ├── PauseCycle.vue        # 暂停周期
│   │   ├── MissedWorkouts.vue    # 处理错过训练
│   │   ├── CycleManagement.vue   # 周期管理
│   │   ├── OneRMSetup.vue        # 1RM 设置
│   │   ├── Week6Decision.vue     # 第6周决策
│   │   ├── ProgressStats.vue     # 进度统计
│   │   ├── SettingsExport.vue    # 设置与导出
│   │   ├── WeightRecord.vue      # 体重记录
│   │   └── CustomExercise.vue    # 自定义动作
│   ├── components/               # 可复用 UI 组件
│   │   ├── AppTabBar.vue         # 底部导航栏
│   │   ├── AppHeader.vue         # 顶部导航栏
│   │   ├── WeightInput.vue       # 重量输入组件
│   │   ├── RepsSelector.vue      # 次数选择器
│   │   ├── SetStatusIcon.vue     # 组状态图标
│   │   ├── ProgressBar.vue       # 进度条
│   │   ├── StarRating.vue        # 星级评分
│   │   ├── CalendarGrid.vue      # 日历网格
│   │   └── SvChart.vue          # SVG 图表基础组件
│   └── assets/
│       └── theme.css             # 设计 Token（CSS 变量）
```

### 数据流架构
```
User Action → Vue Component (dispatch)
           → Pinia Store (business logic + caching)
           → Service Layer (pure computation / localStorage I/O)
           → localStorage (persistence)

(未来接入后端)
User Action → Vue Component
           → Pinia Store
           → API Service (fetch/axios)
           → REST API Backend
           → Database
```

---

## 数据模型设计

> 本定义综合了 findings.md、spec.md 初始稿、设计稿三方分析，经数据库评审（database-review.md）对齐后的最终版本。
> findings.md 第五节中的旧版定义已废弃，以下为准。

### 核心枚举

```typescript
type CycleStatus = 'active' | 'paused' | 'week6_pending' | 'completed' | 'terminated'
type Week6Decision = 'new_cycle' | 'test_1rm' | 'deload'
type DayType = 'lower' | 'upper' | 'rest'
type ExerciseType = 'main' | 'assistance' | 'optional'
type DayStatus = 'pending' | 'completed' | 'skipped' | 'makeup' | 'postponed'
type ResumeOption = 'postpone' | 'skip'
type MissedAction = 'makeup' | 'skip' | 'postpone'
type PauseReason = 'holiday' | 'travel' | 'injury' | 'other'
```

### 数据实体

#### 1. Cycle（训练周期）

```typescript
interface Cycle {
  id: string
  name: string
  startDate: string                             // YYYY-MM-DD，初始计划开始日期
  actualStartDate?: string                      // 实际开始日期（暂停顺延后可能不同）
  status: CycleStatus
  week6Decision?: Week6Decision
  oneRM: { squat: number; bench: number; deadlift: number }
  unit: 'kg' | 'lb'
  weightRounding: number                        // Cycle > UserSettings 优先级
  assistanceConfig: {
    horizontalPull: string                      // 上背部#1 具体动作名，如"哑铃划船"
    shoulder: string                            // 肩部训练，如"坐姿哑铃推举"
    verticalPull: string                        // 上背部#2 具体动作名，如"负重引体向上"
    optional1?: string
    optional2?: string
  }
  weeks: Week[]                                  // 6周完整计划
  pauseHistory: PauseRecord[]                    // 多次暂停记录
  restartBranches: RestartRecord[]               // 重新开始分支记录
  batchProcessHistory: BatchProcessRecord[]      // 批量处理（错过训练等）的操作日志，嵌入存储
  isPaused: boolean
  currentPause?: PauseRecord
  terminatedAt?: string
  terminateReason?: string                       // "因伤终止" 等
  createdAt: string                              // ISO datetime
  completedAt?: string
}
```

**weightRounding 优先级规则：** 创建 Cycle 时默认取 `UserSettings.weightRounding`，用户可在1RM设置页覆盖 Cycle 级别的值。计算训练重量时取 Cycle > Settings。

#### 2. Week（周计划）

```typescript
interface Week {
  weekNumber: number                             // 1-6
  theme: string                                  // "肌肉调理"、"肌肉调理/增肌" 等
  days: TrainingDay[]
}
```

#### 3. TrainingDay（训练日）

三日期体系：`originalDate` 基于 startDate 计算永不变，`scheduledDate` 随暂停顺延调整，`completedDate` 记录实际打卡日期。这是 findings.md §3.5 的核心规则。

```typescript
interface TrainingDay {
  dayNumber: number                              // 该周第几天 (1-N)
  dayOffset: number                              // 相对 startDate 的天数偏移
  type: DayType
  originalDate: string                           // 原始计划日期 = startDate + dayOffset（永不变）
  scheduledDate: string                          // 当前日程日期（暂停顺延后更新）
  exercises: PlannedExercise[]
  status: DayStatus                              // 枚举替代布尔值 isCompleted/isSkipped
  completedDate?: string                         // 用户实际打卡日期
  isRestartPoint?: boolean                       // 是否重新开始后的第一个训练日
}
```

#### 4. PlannedExercise（计划动作）

```typescript
interface PlannedExercise {
  id: string
  name: string                                   // "深蹲"、"硬拉变式" 等
  type: ExerciseType
  sets: PlannedSet[]
  notes?: string                                 // 变式细节，如"直腿硬拉"
}
```

#### 5. PlannedSet（计划组）

```typescript
interface PlannedSet {
  setNumber: number
  targetWeight?: number                          // 目标重量 (kg)
  targetReps?: string                            // "6" | "MR10" | "4-6" | "1-4" 等
  isAMRAP?: boolean                              // 是否力竭组
}
```

#### 6. WorkoutRecord（训练记录）

按 cycleId 分片存储：`candito_records_{cycleId}`。

```typescript
interface WorkoutRecord {
  id: string
  cycleId: string
  branchId?: string                              // 所属重新开始分支
  weekNumber: number
  dayNumber: number
  date: string                                   // 实际训练日期
  originalDate: string                           // 原始计划日期（永不变）
  scheduledDate: string                          // 调整后计划日期
  isRescheduled: boolean                         // 是否因暂停而调整过日期
  startTime: string                              // ISO datetime
  endTime: string
  duration: number                               // 训练时长 (秒)
  bodyWeight?: number                            // 当日体重
  exercises: ExerciseRecord[]
  notes: string                                  // 训练笔记
  feeling: 1 | 2 | 3 | 4 | 5                     // 训练感受
  status: 'completed' | 'makeup'                 // 正常完成 or 补打卡
  wasPausedBefore?: boolean                      // 本次训练前是否经历暂停
  isRestartPoint?: boolean                       // 是否重新开始点
}
```

#### 7. ExerciseRecord（动作记录）

```typescript
interface ExerciseRecord {
  exerciseId: string
  name: string
  type: ExerciseType
  sets: SetRecord[]
}
```

#### 8. SetRecord（组记录）

```typescript
interface SetRecord {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  actualWeight?: number                           // 实际使用重量
  actualReps?: number                             // 实际完成次数
  isCompleted: boolean
  isSkipped: boolean
  restSeconds?: number                            // 该组后休息秒数
}
```

#### 9. PauseRecord（暂停记录）

```typescript
interface PauseRecord {
  id: string
  pausedAt: string                                // 暂停发生日期
  pausedWeek: number                              // 暂停时在第几周
  pausedDay: number                               // 暂停时在该周第几天
  reason: PauseReason                             // 'holiday' | 'travel' | 'injury' | 'other'
  customReason?: string                           // reason=other 时自定义文字
  resumedAt?: string                              // 恢复日期
  resumeOption?: ResumeOption                     // 'postpone' | 'skip'
  daysShifted: number                             // 实际顺延天数
  note?: string
}
```

#### 10. RestartRecord（重新开始记录）

```typescript
interface RestartRecord {
  id: string                                      // 分支ID
  fromWeek: number                                // 从第几周开始
  fromDay: number                                 // 从该周第几天开始
  restartDate: string                             // 重新开始日期（用户指定）
  originalOneRM?: {                               // 重新开始时的1RM（可能调整）
    squat: number
    bench: number
    deadlift: number
  }
  previousBranchId?: string                       // 前一分支ID（形成时间线链）
  isActive: boolean                               // 是否当前活跃分支
}
```

#### 11. BatchProcessRecord（批量处理操作日志）

嵌入 Cycle 内部，用于记录用户如何批量处理错过训练。处理结果已反映在 TrainingDay.status 中，此记录仅用于操作回溯。

```typescript
interface BatchProcessRecord {
  id: string
  type: 'missed_workouts' | 'travel_skip'
  dateRange: { start: string; end: string }
  affectedDays: { week: number; day: number; action: MissedAction }[]
  processedAt: string
}
```

#### 12. BodyMetric（体测数据）

```typescript
interface BodyMetric {
  id: string
  date: string
  weight: number
  unit: 'kg' | 'lb'
  measurements?: {
    chest?: number; waist?: number; hips?: number
    leftArm?: number; rightArm?: number
    leftThigh?: number; rightThigh?: number
  }
}
```

#### 13. UserSettings（用户设置）

```typescript
interface UserSettings {
  defaultUnit: 'kg' | 'lb'
  defaultRestSeconds: number                      // 默认 90 秒
  weightRounding: number                          // 默认 2.5
  reminderEnabled: boolean
  reminderTime?: string                           // "08:00"
}
```

---

### 存储策略

| 存储键 | 内容 | 说明 |
|--------|------|------|
| `candito_cycles` | `Cycle[]` | 所有周期列表（不含 records） |
| `candito_records_{cycleId}` | `WorkoutRecord[]` | 按周期分片存储训练记录 |
| `candito_metrics` | `BodyMetric[]` | 体重记录（跨周期共享） |
| `candito_settings` | `UserSettings` | 全局设置 |
| `candito_active_cycle` | `string` | 当前活跃周期 ID |

**分片理由：**
- 每个 Cycle 最多约 30 条记录（6周×5天），单 key 远低于 localStorage 5MB 上限
- 按 cycleId 分片等同于 `GET /api/cycles/{id}/records` 的 REST 模型，未来接后端零改动
- 跨周期统计（如1RM趋势）遍历所有 `candito_records_*` key 即可

### 关键设计决策

| 决策 | 结论 | 理由 |
|------|------|------|
| BatchProcessRecord 存储层级 | 嵌入 Cycle | 仅操作回溯用途，无需跨 Cycle 查询，类似日志而非业务实体 |
| records 存储方式 | 按 cycleId 分片 | 1:1 映射 REST 模型，单 key 数据量可控，方便导出单周期 |
| 第6周预估1RM | 实时计算不持久化 | 公式固定，源数据已有，避免源数据与预估不一致 |
| 训练中修改辅助动作 | 支持 | 设计稿有"切换"按钮，PlannedExercise.notes 记录变式细节 |
| 设计稿颜色 Token | 统一为 `#0A84FF` / `#30D158` | 大部分页面已用此值，仅 2 个页面用了旧版 Apple HIG 色值，统一对齐 |

---

## ADDED Requirements

### Requirement: 项目骨架搭建
系统 SHALL 使用 Vue 3 + Vite + TypeScript + Tailwind CSS v4 + Pinia + Vue Router 4 搭建。

#### Scenario: 开发者启动项目
- **WHEN** 执行 `npm install && npm run dev`
- **THEN** 在 `http://localhost:5173` 启动开发服务器
- **AND** 展示空白首页（路由 `/`）

#### Scenario: 生产构建
- **WHEN** 执行 `npm run build`
- **THEN** 在 `dist/` 目录生成可部署的静态文件
- **AND** 可直接用浏览器打开 `dist/index.html`

### Requirement: 设计 Token 系统
系统 SHALL 定义完整的 CSS 自定义属性（Design Tokens），包含品牌色、状态色、字体族、字号阶梯、间距阶梯、圆角阶梯、阴影层级、过渡曲线。

#### Scenario: 设计 Token 复用
- **WHEN** 开发者在任何组件中引用 `var(--color-training-main)`
- **THEN** 得到统一的主色调 `#0A84FF`
- **AND** 所有17个页面视觉一致

### Requirement: 数据层与UI层分离
系统 SHALL 将数据模型（`types/`）、业务逻辑（`services/`）、数据存储（`stores/`）、UI展示（`views/` + `components/`）严格分层。

#### Scenario: Service 层可单独测试
- **WHEN** 调用 `cycleService.createCycle(oneRM, startDate)`
- **THEN** 返回完整的 Cycle 对象（包含6周计划数据）
- **AND** 不依赖任何 Vue 组件或 DOM

#### Scenario: Store 层封装存储
- **WHEN** UI 调用 `cycleStore.activeCycle`
- **THEN** Store 自动从 localStorage 读取并解析
- **AND** UI 不直接访问 localStorage

#### Scenario: 未来切换后端
- **WHEN** 需要接入 REST API
- **THEN** 仅需修改 Store 层中的持久化方法
- **AND** Service 层和 UI 层代码无需改动

### Requirement: 6周训练计划自动生成
系统 SHALL 根据用户输入的1RM自动计算6周训练计划，包含每周训练日、动作、组数、次数、目标重量。

#### Scenario: 创建周期
- **WHEN** 用户输入深蹲100kg、卧推85kg、硬拉120kg，点击"创建训练周期"
- **THEN** 生成完整6周计划，第1周重量的百分比应准确
- **AND** 第1周深蹲80kg (100×80%), 硬拉90kg (120×75%), 卧推金字塔最高70kg

#### Scenario: 训练日数量按周正确
- **WHEN** 查看第1周计划
- **THEN** 共有5个训练日（非4个）
- **AND** Day1=下肢, Day2=上肢, Day3=上肢, Day4=下肢, Day5=上肢

#### Scenario: MR10动态调整
- **WHEN** 第2周深蹲MR10完成9次
- **THEN** 减量组自动设为8组×3次
- **WHEN** 完成少于7次
- **THEN** 跳过减量组，提示降低后续1RM

### Requirement: 今日训练页面（多状态）
系统 SHALL 在"今日训练"页面根据当前日期和训练状态展示不同内容。

#### Scenario: 训练日-未训练
- **WHEN** 今天是训练日且未完成
- **THEN** 展示训练内容卡片 + "开始训练"按钮 + 快速统计栏

#### Scenario: 训练日-已训练
- **WHEN** 今天是训练日且已完成
- **THEN** 展示"今日训练已完成"提示 + 训练数据摘要 + 下次训练预览

#### Scenario: 休息日
- **WHEN** 今天不是训练日
- **THEN** 展示"今天是休息日" + 下次训练倒计时 + 快捷入口

### Requirement: 训练执行流程
系统 SHALL 提供完整的训练执行界面，包含计时器、逐组录入、动作切换。

#### Scenario: 开始训练
- **WHEN** 用户点击"开始训练"
- **THEN** 进入训练执行页面，训练总时长计时器开始计时
- **AND** 显示当前动作（第一个未完成动作）

#### Scenario: 录入组数据
- **WHEN** 用户输入重量80kg，选择次数6
- **THEN** 点击"完成本组"后该组标记为完成
- **AND** 自动进入下一组，目标值预填

#### Scenario: 完成训练
- **WHEN** 所有动作所有组完成，点击"完成训练"
- **THEN** 生成 WorkoutRecord，跳转到训练完成总结页

#### Scenario: 组间休息计时器
- **WHEN** 一组完成后
- **THEN** 自动启动组间休息倒计时（默认90秒）
- **AND** 倒计时归零时提示用户

### Requirement: 训练完成总结
系统 SHALL 在训练完成后展示本次训练的完整数据摘要。

#### Scenario: 查看总结
- **WHEN** 训练完成
- **THEN** 展示每个动作的组详情、总容量、总时长、平均休息时间
- **AND** 可记录体重
- **AND** 可填写训练笔记
- **AND** 可评星（1-5）

### Requirement: 训练日历
系统 SHALL 提供月历视图展示训练计划。

#### Scenario: 查看日历
- **WHEN** 打开训练日历
- **THEN** 展示当前月份日历，已完成日期用绿色圆点标记
- **AND** 待训练日期用灰色圆点标记
- **AND** 未完成（错过）日期用橙色圆点标记
- **AND** 今日用蓝色高亮

#### Scenario: 切换月份
- **WHEN** 点击左右箭头
- **THEN** 切换到上/下月

### Requirement: 周期管理
系统 SHALL 提供周期管理功能，支持暂停、恢复、重新开始、终止。

#### Scenario: 暂停周期
- **WHEN** 用户选择暂停原因（假期/出差/受伤/其他）和预计天数
- **THEN** 系统记录暂停，展示受影响的训练日
- **AND** 恢复时支持"顺延"（日期后推）或"跳过"

#### Scenario: 重新开始
- **WHEN** 用户选择从指定周重新开始 + 可选调整1RM
- **THEN** 保留已完成记录，创建新的训练时间线

#### Scenario: 终止周期
- **WHEN** 用户确认终止
- **THEN** 周期状态变为 `terminated`，已完成数据保留为只读

### Requirement: 错过训练处理
系统 SHALL 自动检测并提示用户处理错过的训练日。

#### Scenario: 检测错过训练
- **WHEN** 打开应用时存在已过期的未完成训练日
- **THEN** 弹出提示，展示错过训练列表

#### Scenario: 批量处理
- **WHEN** 用户为每个错过日选择处理方式（补练/跳过/顺延）
- **THEN** 系统按选择更新各训练日状态和后续日期

#### Scenario: 出差跳过
- **WHEN** 用户选择日期范围并点击"出差跳过"
- **THEN** 范围内所有训练日标记为跳过

### Requirement: 第6周决策
系统 SHALL 在第5周完成后展示第6周决策页面。

#### Scenario: 查看预估1RM
- **WHEN** 第5周完成
- **THEN** 展示基于完成次数的预估新1RM
- **AND** 深蹲97.5kg×3次 → 预估103.4kg (×1.06)

#### Scenario: 选择决策
- **WHEN** 用户选择"直接开始新周期"
- **THEN** 使用预估1RM创建新周期
- **WHEN** 选择"减载周"
- **THEN** 创建减载周训练计划
- **WHEN** 选择"实测1RM"
- **THEN** 进入第6周自由训练模式

### Requirement: 进度统计
系统 SHALL 提供训练数据的统计图表。

#### Scenario: 查看跨周期1RM趋势
- **WHEN** 打开进度统计
- **THEN** 展示深蹲/卧推/硬拉1RM折线图（SVG）
- **AND** 支持切换"本周期/历史/全部"

#### Scenario: 每周完成进度条
- **WHEN** 查看进度统计
- **THEN** 展示每周完成率的进度条

#### Scenario: 体重趋势图
- **WHEN** 查看进度统计
- **THEN** 展示体重变化折线图

### Requirement: 设置与数据导入导出
系统 SHALL 提供设置管理和完整的导入导出功能。

#### Scenario: 修改设置
- **WHEN** 用户修改默认单位、组间休息、重量取整等设置
- **THEN** 设置立即生效，持久化到 localStorage

#### Scenario: 导出JSON备份
- **WHEN** 点击"导出JSON备份"
- **THEN** 下载包含所有数据的JSON文件

#### Scenario: 导出CSV
- **WHEN** 点击"导出CSV训练记录"
- **THEN** 下载CSV格式训练记录

#### Scenario: 导入数据
- **WHEN** 选择JSON备份文件
- **THEN** 解析并校验数据，检测冲突
- **AND** 提供智能合并/覆盖/取消选项

### Requirement: 1RM设置页面
系统 SHALL 提供精细的1RM设置界面，包含快速加减按钮和周预览。

#### Scenario: 调整1RM
- **WHEN** 用户点击+2.5/-2.5/+5/-5按钮
- **THEN** 1RM数值实时更新，周预览同步更新

#### Scenario: 辅助训练配置
- **WHEN** 用户点击辅助训练项的"切换"
- **THEN** 弹出动作库选择或输入自定义动作名称

### Requirement: 体重记录
系统 SHALL 提供体重记录和趋势图表。

#### Scenario: 记录体重
- **WHEN** 用户输入体重并保存
- **THEN** 显示当前体重、较上次变化、趋势图

### Requirement: 底部导航栏
系统 SHALL 在主要页面底部展示固定导航栏（今日/日历/统计/设置）。

#### Scenario: 导航切换
- **WHEN** 用户点击导航项
- **THEN** 切换到对应页面，当前页导航项高亮

### Requirement: 多端适配
系统 SHALL 支持移动端优先的响应式布局。

#### Scenario: 手机端
- **WHEN** 浏览器宽度 < 640px
- **THEN** 内容最大宽度为 `max-w-lg`，居中显示
- **AND** 底部导航栏固定，带 safe-area-inset-bottom

#### Scenario: 平板端
- **WHEN** 浏览器宽度 640-1024px
- **THEN** 内容区域适当放宽，保持居中
- **AND** 日历网格保持可见

#### Scenario: 桌面端
- **WHEN** 浏览器宽度 > 1024px
- **THEN** 内容最大宽度 `max-w-lg`，模拟手机预览效果
- **AND** 背景使用 `var(--color-surface-muted)`
