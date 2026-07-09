# Candito 训练助手 — 数据库/数据模型评审报告

> 评审日期：2026-07-09
> 评审范围：findings.md / spec.md / _design_extracted

---

## 一、总体评价

| 维度 | findings.md | spec.md | 设计稿 | 结论 |
|------|------------|---------|--------|------|
| 覆盖度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | spec.md 最完整 |
| 一致性 | ⚠️ 与 spec.md 有差异 | ⚠️ 与 findings.md 有差异 | ✅ 与 spec.md 基本一致 | 存在不一致需要对齐 |
| 可实现性 | ✅ | ✅ | ✅ | 均可实现 |

---

## 二、严重问题（必须修复）

### 🔴 P0-1：TrainingDay 数据模型定义不一致

findings.md 和 spec.md 对 `TrainingDay` 的定义差异显著。

findings.md（第五节, L846-853）：

```typescript
interface TrainingDay {
  dayNumber: number;
  date: string;              // 预计日期 ← 只有1个日期字段
  type: 'lower' | 'upper' | 'rest';
  exercises: PlannedExercise[];
  isCompleted: boolean;      // ← 布尔值
  isSkipped: boolean;        // ← 布尔值
}
```

spec.md（第三节, L175-186）：

```typescript
interface TrainingDay {
  dayNumber: number;
  dayOffset: number;              // ← findings.md 无此字段
  type: DayType;
  originalDate: string;           // ← 三日期体系
  scheduledDate: string;
  exercises: PlannedExercise[];
  status: DayStatus;              // ← 枚举值替代布尔值
  completedDate?: string;
  isRestartPoint?: boolean;       // ← findings.md 无此字段
}
```

**冲突对比：**

| 差异项 | findings.md | spec.md |
|--------|------------|---------|
| 日期字段 | `date`（1个） | `originalDate + scheduledDate + completedDate`（3个） |
| 完成状态 | `isCompleted + isSkipped`（2个布尔） | `status` 枚举（5个状态：pending/completed/skipped/makeup/postponed） |
| dayOffset | 无 | 有 |
| isRestartPoint | 无（在 WorkoutRecord 中） | 有 |
| 暂停顺延信息 | 无 `scheduledDate`，无法支持 | 支持 |

**建议：** 统一采用 spec.md 的三日期 + 枚举状态方案，因为它和 findings.md 第三节（3.5 日期管理核心规则）中描述的三日期体系一致。删除 findings.md 第五节中重复的老版定义。

---

### 🔴 P0-2：Cycle 数据模型定义不一致

spec.md（第一节, L136-161）：

```typescript
interface Cycle {
  id: string
  name: string
  startDate: string             // ← 只有1个日期
  status: CycleStatus
  week6Decision?: Week6Decision
  oneRM: { squat: number; bench: number; deadlift: number }
  unit: 'kg' | 'lb'
  weightRounding: number        // ← findings.md 无此字段
  assistanceConfig: { ... }
  weeks: Week[]
  pauseHistory: PauseRecord[]
  isPaused: boolean
  currentPause?: PauseRecord
  terminatedAt?: string
  terminateReason?: string      // ← findings.md Cycle 中也有
  createdAt: string
  completedAt?: string
}
```

findings.md（第五节, L742-775）：

```typescript
interface Cycle {
  // ...
  startDate: string;
  actualStartDate?: string;     // ← spec.md 无此字段
  // ...
  weightRounding: number        // ← 无此字段
  // ...
}
```

**冲突对比：**

| 差异项 | findings.md | spec.md |
|--------|------------|---------|
| `actualStartDate` | 有 | 无 |
| `weightRounding` | 无（在 Settings 中） | 有（Cycle 中） |
| `terminateReason` | 有 | 无 |

**设计稿对齐：** `周期管理.html` 展示了终止周期显示「完成至第3周 · 因伤终止」→ 需要 `terminateReason`。

**建议：** Cycle 中统一包含 `actualStartDate?` 和 `terminateReason?`。`weightRounding` 在 `UserSettings` 中作为默认值，在 `Cycle` 中允许创建时覆盖，优先级为 Cycle > Settings。

---

### 🔴 P0-3：缺少 RestartRecord 实体（spec.md 缺失）

findings.md 第 3.4 节定义了 `RestartRecord`：

```typescript
interface RestartRecord {
  id: string;                    // 分支ID
  fromWeek: number;              // 从第几周开始
  fromDay: number;               // 从该周第几天开始
  restartDate: string;           // 重新开始日期（实际日历日期，用户选择）
  originalOneRM?: {              // 重新开始时的1RM（可能调整）
    squat: number;
    bench: number;
    deadlift: number;
  };
  previousBranchId?: string;     // 之前的分支ID（形成时间线链）
  isActive: boolean;             // 是否当前活跃分支
}
```

spec.md 完全缺失此实体。设计稿 `周期管理.html` 明确展示了：

- 「从当前周重新开始」
- 「从指定周重新开始 + 调整1RM」

需要此模型支持。

**建议：** 在 spec.md 中补充 `RestartRecord` 实体定义。

---

## 三、中等问题（建议修复）

### 🟡 P1-1：PauseRecord 字段差异

| 字段 | findings.md | spec.md |
|------|------------|---------|
| `reason` | `string?`（可选） | `string`（必填，枚举值） |
| `customReason?` | 无 | 有 |
| `note?` | 有 | 无 |

设计稿 `暂停周期.html` 展示：原因选择（小长假/出差/受伤/其他）+ 自定义原因输入 + 自定义日期范围 → 需要 `customReason`。

**建议：** 合并为：

```typescript
interface PauseRecord {
  // ... 其他字段
  reason: 'holiday' | 'travel' | 'injury' | 'other';
  customReason?: string;
  note?: string;
  // ...
}
```

---

### 🟡 P1-2：WorkoutRecord 定义分歧

spec.md（L211-228）：

```typescript
interface WorkoutRecord {
  // ...
  status: 'completed' | 'makeup'   // ← 有 status
  // 无 branchId
  // 无 wasPausedBefore
  // 无 isRestartPoint
}
```

findings.md（L817-836）：

```typescript
interface WorkoutRecord {
  // ...
  branchId?: string                // ← 分支ID（重新开始时）
  wasPausedBefore?: boolean        // ← 暂停标记
  isRestartPoint?: boolean         // ← 重新开始标记
  // 无 status 字段
}
```

**建议：** 合并两者，`WorkoutRecord` 应包含 `status`、`branchId?`、`wasPausedBefore?`、`isRestartPoint?`。

---

### 🟡 P1-3：缺少 BatchProcessRecord 实体（spec.md 缺失）

findings.md 第 3.6 节定义了：

```typescript
interface BatchProcessRecord {
  id: string;
  type: 'missed_workouts' | 'travel_skip';
  dateRange: { start: string; end: string };
  affectedDays: { week: number; day: number; action: string }[];
  processedAt: string;
}
```

设计稿 `处理错过训练.html` 展示了「出差跳过」（日期范围选择）和「全部顺延/全部跳过」等批量操作。spec.md 缺失此实体。

**建议：** 补充或嵌入 `PauseRecord` 中（当成一种特殊暂停处理）。

---

## 四、设计稿发现的数据需求（补充）

### 🟢 P2-1：训练容量字段已具备

设计稿 `训练完成总结.html` 和 `训练详情.html` 显示「总容量 kg」→ 由现有 `SetRecord.actualWeight × actualReps` 计算得出，无需额外存储。

### 🟢 P2-2：第5周完成数据需要存储

设计稿 `第6周决策.html` 显示第5周每个动作的最终重量和次数（如深蹲 97.5kg × 3次）→ 从 `WorkoutRecord` 中查询第5周数据即可，无需新实体。

### 🟢 P2-3：辅助训练具体动作名确认

设计稿 `训练执行.html` 显示辅助训练有具体名称（坐姿哑铃推举、哑铃侧平举、杠铃划船等）→ 当前 `Cycle.assistanceConfig` 存储的是用户选择的具体动作名，设计正确。`PlannedExercise` 的 `notes?` 可记录如「直腿硬拉」这样的变式细节（设计稿 `训练详情.html` 显示「硬拉变式 → 直腿硬拉」）。

### 🟢 P2-4：设计 Token 颜色不一致问题

设计稿中存在两套颜色值（不影响数据模型，仅记录）：

- 大部分页面：`--color-training-main: #0A84FF`，`--state-info: #0A84FF`，`--state-success: #30D158`
- `处理错过训练.html` 和 `暂停周期.html`：`--color-training-main: #007AFF`，`--state-info: #007AFF`，`--state-success: #34C759`

---

## 五、字段类型与约束评审

### ✅ 正确的设计

| 字段 | 类型 | 评价 |
|------|------|------|
| `id` | `string`（UUID） | ✅ 使用字符串 ID，前端友好 |
| `startDate` | `string`（YYYY-MM-DD） | ✅ ISO 日期格式 |
| `startTime/endTime` | `string`（ISO datetime） | ✅ 精确到时间 |
| `feeling` | `1 \| 2 \| 3 \| 4 \| 5` | ✅ 有限范围 |
| `CycleStatus` 枚举 | 5个状态 | ✅ 覆盖所有生命周期 |
| `DayStatus` 枚举 | 5个状态 | ✅ 覆盖 pending/completed/skipped/makeup/postponed |

### ⚠️ 需要注意的

| 字段 | 问题 | 建议 |
|------|------|------|
| `SetRecord.targetReps` | 类型是 `string?`（"6"、"MR10"、"4-6"） | 设计合理但建议加注释说明格式规则 |
| `weightRounding` | 既在 Cycle 又在 UserSettings | 明确优先级：Cycle > Settings |
| `unit` | 在 Cycle、UserSettings、BodyMetric 中重复定义 | Cycle 中的 unit 应与 Settings 一致，BodyMetric 可独立 |
| `duration` | 单位是秒（`number`） | ✅ 存储秒，展示时格式化 |

---

## 六、存储键名评审

findings.md 第 4.2 节定义的存储键：

```typescript
const STORAGE_KEYS = {
  CYCLES: 'candito_cycles',
  CURRENT_CYCLE: 'candito_current',
  WORKOUT_RECORDS: 'candito_records',
  BODY_METRICS: 'candito_metrics',
  SETTINGS: 'candito_settings',
  EXPORT_HISTORY: 'candito_exports'
};
```

| 键 | 评价 |
|-----|------|
| `candito_cycles` | ✅ 存储所有 Cycle 列表 |
| `candito_current` | ⚠️ 存储当前周期 ID，但 RestartRecord 可能产生分支，需要更明确「活跃周期」概念 |
| `candito_records` | ⚠️ 所有周期记录混在一起，建议按 cycleId 分 key 或建立索引 |
| `candito_metrics` | ✅ 独立存储体测数据 |
| `candito_settings` | ✅ 单一全局设置 |

**建议：** `candito_records` 如果记录量很大，应改为 `candito_records_{cycleId}` 分片存储，避免单 key 数据过大导致性能问题。

---

## 七、最终建议的统一数据模型

综合三方分析后，推荐以下统一定义：

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

### 核心实体

```typescript
interface Cycle {
  id: string
  name: string
  startDate: string
  actualStartDate?: string
  status: CycleStatus
  week6Decision?: Week6Decision
  oneRM: { squat: number; bench: number; deadlift: number }
  unit: 'kg' | 'lb'
  weightRounding: number
  assistanceConfig: {
    horizontalPull: string
    shoulder: string
    verticalPull: string
    optional1?: string
    optional2?: string
  }
  weeks: Week[]
  pauseHistory: PauseRecord[]
  restartBranches: RestartRecord[]
  isPaused: boolean
  currentPause?: PauseRecord
  terminatedAt?: string
  terminateReason?: string
  createdAt: string
  completedAt?: string
}

interface Week {
  weekNumber: number
  theme: string
  days: TrainingDay[]
}

interface TrainingDay {
  dayNumber: number
  dayOffset: number
  type: DayType
  originalDate: string
  scheduledDate: string
  exercises: PlannedExercise[]
  status: DayStatus
  completedDate?: string
  isRestartPoint?: boolean
}

interface PlannedExercise {
  id: string
  name: string
  type: ExerciseType
  sets: PlannedSet[]
  notes?: string
}

interface PlannedSet {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  isAMRAP?: boolean
}

interface WorkoutRecord {
  id: string
  cycleId: string
  branchId?: string
  weekNumber: number
  dayNumber: number
  date: string
  originalDate: string
  scheduledDate: string
  isRescheduled: boolean
  startTime: string
  endTime: string
  duration: number
  bodyWeight?: number
  exercises: ExerciseRecord[]
  notes: string
  feeling: 1 | 2 | 3 | 4 | 5
  status: 'completed' | 'makeup'
  wasPausedBefore?: boolean
  isRestartPoint?: boolean
}

interface ExerciseRecord {
  exerciseId: string
  name: string
  type: ExerciseType
  sets: SetRecord[]
}

interface SetRecord {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  actualWeight?: number
  actualReps?: number
  isCompleted: boolean
  isSkipped: boolean
  restSeconds?: number
}

interface PauseRecord {
  id: string
  pausedAt: string
  pausedWeek: number
  pausedDay: number
  reason: PauseReason
  customReason?: string
  resumedAt?: string
  resumeOption?: ResumeOption
  daysShifted: number
  note?: string
}

interface RestartRecord {
  id: string
  fromWeek: number
  fromDay: number
  restartDate: string
  originalOneRM?: { squat: number; bench: number; deadlift: number }
  previousBranchId?: string
  isActive: boolean
}

interface BatchProcessRecord {
  id: string
  type: 'missed_workouts' | 'travel_skip'
  dateRange: { start: string; end: string }
  affectedDays: { week: number; day: number; action: MissedAction }[]
  processedAt: string
}

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

interface UserSettings {
  defaultUnit: 'kg' | 'lb'
  defaultRestSeconds: number
  weightRounding: number
  reminderEnabled: boolean
  reminderTime?: string
}
```

---

## 八、总结与行动项

### 必须修复（P0）

| # | 问题 | 行动 |
|---|------|------|
| 1 | TrainingDay 定义不一致 | 采用 spec.md 的三日期+枚举状态方案，删除 findings.md 第五节旧版定义 |
| 2 | Cycle 定义不一致 | 合并双方字段，补充 `actualStartDate?` 和 `terminateReason?` |
| 3 | 缺少 RestartRecord | 在 spec.md 中正式定义此实体 |

### 建议修复（P1）

| # | 问题 | 行动 |
|---|------|------|
| 4 | PauseRecord 字段差异 | 合并 reason 枚举值 + customReason + note |
| 5 | WorkoutRecord 定义分歧 | 补充 status/branchId/wasPausedBefore/isRestartPoint |
| 6 | 缺少 BatchProcessRecord | 补充此实体或明确其与 PauseRecord 的关系 |

### 可选优化（P2）

| # | 问题 | 行动 |
|---|------|------|
| 7 | records 存储键 | 评估记录量后决定是否分片存储 `candito_records` |
| 8 | weightRounding 优先级 | 明确 Cycle 覆盖 Settings 的优先级规则 |
| 9 | 设计稿 color tokens | 统一两套颜色值为一套 |
