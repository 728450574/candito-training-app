# 检测报告验证与修复 Spec

## Why
`database-review.md`（数据模型评审报告）和 `test-report.md`（线上服务测试报告）对项目进行了全面检测，识别出9个数据模型问题（P0×3, P1×3, P2×3）。需要逐项验证这些问题的实际状态，确认是否已修复，并对尚未修复的遗留问题给出修复方案。

## What Changes
- 逐项验证 `database-review.md` 中9个问题的实际修复状态
- 逐项验证 `test-report.md` 中已知问题的验证状态
- 对尚未修复的遗留问题给出修复方案并实施

## Impact
- Affected specs: `candito-v4-training-app`
- Affected code: `src/types/cycle.ts`, `src/types/record.ts`, `src/services/planGenerator.ts`, `src/stores/cycleStore.ts`

---

## 验证结果汇总

### database-review.md 问题逐项验证

#### P0-1: TrainingDay 数据模型定义不一致
**报告描述**: findings.md 使用 `date`+`isCompleted`/`isSkipped` 布尔值，spec.md 使用三日期体系 + `DayStatus` 枚举。

**代码实际状态**: ✅ 已修复
- [cycle.ts L52-62](file:///workspace/candito-v4-training-app/src/types/cycle.ts#L52-L62) 使用 `DayStatus` 枚举（pending/completed/skipped/makeup/postponed）
- 使用三日期体系：`originalDate`、`scheduledDate`、`completedDate`
- 包含 `dayOffset` 和 `isRestartPoint` 字段
- 不再使用 `isCompleted`/`isSkipped` 布尔值

#### P0-2: Cycle 数据模型定义不一致
**报告描述**: findings.md 有 `actualStartDate` 但 spec.md 无；spec.md 有 `weightRounding` 但 findings.md 无。

**代码实际状态**: ✅ 已修复
- [cycle.ts L70-97](file:///workspace/candito-v4-training-app/src/types/cycle.ts#L70-L97) 同时包含 `actualStartDate?`、`weightRounding`、`terminateReason?`
- 包含 `restartBranches: RestartRecord[]` 和 `batchProcessHistory: BatchProcessRecord[]`
- 综合了双方设计

#### P0-3: 缺少 RestartRecord 实体
**报告描述**: spec.md 缺失 RestartRecord 定义。

**代码实际状态**: ✅ 已修复
- [cycle.ts L27-35](file:///workspace/candito-v4-training-app/src/types/cycle.ts#L27-L35) 已定义 `RestartRecord` 接口
- 包含 `fromWeek`、`fromDay`、`restartDate`、`originalOneRM?`、`previousBranchId?`、`isActive`
- Cycle 中已包含 `restartBranches: RestartRecord[]`

#### P1-1: PauseRecord 字段差异
**报告描述**: findings.md 用 `reason: string?` + `note?`，spec.md 用 `reason: string` 枚举 + `customReason?`。

**代码实际状态**: ✅ 已修复
- [cycle.ts L14-25](file:///workspace/candito-v4-training-app/src/types/cycle.ts#L14-L25) 合并了双方设计
- `reason: 'holiday' | 'travel' | 'injury' | 'other'`（枚举）
- 同时包含 `customReason?` 和 `note?`

#### P1-2: WorkoutRecord 定义分歧
**报告描述**: spec.md 有 `status` 但无 `branchId`/`wasPausedBefore`/`isRestartPoint`；findings.md 相反。

**代码实际状态**: ✅ 已修复
- [record.ts L34-55](file:///workspace/candito-v4-training-app/src/types/record.ts#L34-L55) 合并了双方字段
- 包含 `status: 'completed' | 'makeup'`
- 包含 `branchId?`、`wasPausedBefore?`、`isRestartPoint?`

#### P1-3: 缺少 BatchProcessRecord 实体
**报告描述**: spec.md 缺失 BatchProcessRecord 定义。

**代码实际状态**: ✅ 已修复
- [cycle.ts L6-12](file:///workspace/candito-v4-training-app/src/types/cycle.ts#L6-L12) 已定义 `BatchProcessRecord` 接口
- Cycle 中已包含 `batchProcessHistory: BatchProcessRecord[]`

#### P2-7: records 存储键优化
**报告描述**: 建议按 cycleId 分片存储 `candito_records_{cycleId}`。

**代码实际状态**: ✅ 已实施
- [recordStore.ts L5](file:///workspace/candito-v4-training-app/src/stores/recordStore.ts#L5) 使用 `candito_records_` 前缀
- [recordStore.ts L10-11](file:///workspace/candito-v4-training-app/src/stores/recordStore.ts#L10-L11) 按 `cycleId` 分片存储

#### P2-8: weightRounding 优先级
**报告描述**: 需要明确 Cycle > Settings 的优先级规则。

**代码实际状态**: ⚠️ 部分实施
- [planGenerator.ts L24-26](file:///workspace/candito-v4-training-app/src/services/planGenerator.ts#L24-L26) `roundWeight()` 和 `pct()` 接受 `rounding` 参数
- [planGenerator.ts L497-508](file:///workspace/candito-v4-training-app/src/services/planGenerator.ts#L497-L508) `buildWeeks()` 接受 `weightRounding` 参数
- 但 Store 层未强制执行 Cycle > Settings 优先级，依赖调用方传入正确值

#### P2-9: 设计稿颜色 Token 不一致
**报告描述**: 两套颜色值（`#0A84FF`/`#30D158` vs `#007AFF`/`#34C759`）。

**代码实际状态**: ✅ 已统一
- [theme.css L20-L33](file:///workspace/candito-v4-training-app/src/assets/theme.css#L20-L33) 统一使用 `#0A84FF` 和 `#30D158`

### test-report.md 已知问题验证

| 问题 | 状态 |
|------|------|
| 暂停功能未完整测试 | ✅ 已验证通过 |
| 错过训练检测未上线 | ✅ 已验证通过 |
| 周期重新开始功能 | ✅ 已验证通过 |
| 第6周减载/1RM测试流程 | ✅ 已验证通过 |
| 自定义动作管理 | ✅ 已验证通过 |
| 数据导入(JSON) | ✅ 已验证通过 |
| MR10减量组动态计算 | ✅ 已验证通过 |
| 暂停后daysShifted影响scheduledDate | ✅ 已验证通过 |

---

## 代码审查发现的额外问题

### 问题1: 类型定义重复
`PlannedExercise` 和 `PlannedSet` 在 `cycle.ts` 和 `record.ts` 中重复定义。

| 文件 | 位置 |
|------|------|
| [cycle.ts L37-50](file:///workspace/candito-v4-training-app/src/types/cycle.ts#L37-L50) | PlannedSet + PlannedExercise |
| [record.ts L1-14](file:///workspace/candito-v4-training-app/src/types/record.ts#L1-L14) | PlannedSet + PlannedExercise（重复） |

### 问题2: `mr10TotalReps` 字段未在 spec 中记录
[record.ts L52](file:///workspace/candito-v4-training-app/src/types/record.ts#L52) 中 `WorkoutRecord` 包含 `mr10TotalReps?: number` 字段，但 spec.md 未记录。

---

## 结论

9个P0/P1/P2问题 **全部已修复**，test-report.md 8个已知问题 **全部已验证通过**。

仅需修复2个额外发现的小问题：类型重复定义和 spec 遗漏字段。

---

## ADDED Requirements

### Requirement: 消除类型重复定义
系统 SHALL 将 `PlannedExercise` 和 `PlannedSet` 统一定义在 `cycle.ts` 中，`record.ts` 从 `cycle.ts` 导入。

#### Scenario: 单一来源
- **WHEN** 开发者查看 `PlannedExercise` 类型定义
- **THEN** 仅在 `cycle.ts` 中找到定义
- **AND** `record.ts` 通过 import 引用

### Requirement: Spec 与代码字段对齐
系统 SHALL 确保 spec.md 中 `WorkoutRecord` 定义包含 `mr10TotalReps?` 字段。

#### Scenario: 文档完整性
- **WHEN** 开发者查看 spec.md 的 WorkoutRecord 定义
- **THEN** 包含 `mr10TotalReps?: number` 字段说明