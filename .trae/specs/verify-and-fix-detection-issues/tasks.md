# Tasks

## Phase 1: 类型定义清理

### Task 1: 消除 PlannedExercise/PlannedSet 重复定义
`record.ts` 中删除重复的 `PlannedExercise` 和 `PlannedSet` 定义，改为从 `cycle.ts` 导入。
- [x] 在 `record.ts` 中添加 `import type { PlannedExercise, PlannedSet } from './cycle'`
- [x] 删除 `record.ts` 中 L1-14 的 `PlannedSet` 和 `PlannedExercise` 重复定义
- [x] 验证 TypeScript 编译无错误（预存 vite/client 类型问题与本次修改无关）

### Task 2: 更新 spec.md 补充 mr10TotalReps 字段
在 `candito-v4-training-app` 的 spec.md 中 `WorkoutRecord` 定义补充 `mr10TotalReps?: number` 字段。
- [x] 在 spec.md 的 WorkoutRecord 接口定义中添加 `mr10TotalReps?: number`
- [x] 验证 spec.md 与代码一致

# Task Dependencies
- Task 1 和 Task 2 无依赖，可并行执行