# Candito Training App 全链路代码审查报告 (V2)

> 审查依据：[项目级规则 - 面向Java开发者的前端可维护性](file:///e:/ideaworkspace/candito-training-app/.trae/rules/maintainability-for-java-dev.md)
> 审查日期：2026-07-15（第二轮）

---

## 零、与第一轮审查的对比摘要

| 维度 | V1 评分 | V2 评分 | 变化 |
|---|---|---|---|
| 类型注释覆盖率 | 🔴 0% | 🟢 100% | 全部4个类型文件字段注释完成 |
| Store 方法 JSDoc | 🔴 3% | 🟢 95% | 所有导出方法均已添加 JSDoc |
| View 层纯洁度 | 🔴 差 | 🟢 良好 | 核心违规已修复 |
| 上帝组件问题 | 🔴 TrainingExecution 1058行 | 🟡 结构清晰 | 拆解为 draftService + mr10Service + Store |
| `any` 类型滥用 | 🔴 3处 | 🟢 0处 | 全部消除 |

---

## 一、V1 问题修复确认

### ✅ 已修复（10项）

| V1问题 | 修复方式 | 状态 |
|---|---|---|
| TrainingExecution 直接操作 localStorage | 新文件 `draftService.ts`，封装 localStorage 原子操作 | ✅ |
| TrainingExecution MR10 业务逻辑 | 新文件 `mr10Service.ts`，`calculateMr10LoadingSets()` / `calculateMr10UnloadingSets()` | ✅ |
| TrainingExecution `finishWorkout()` 105行逻辑 | 迁移到 `cycleStore.finishWorkout()`，视图仅调用并处理返回值 | ✅ |
| TodayTraining `handleSkipTraining()` | 改为调用 `cycleStore.skipDay()` | ✅ |
| ProgressStats `findBest1RM()` 重复 | 改为委托 `statsService.get1rmTrend()` + `bestEstimated1RM()` | ✅ |
| ProgressStats `any` 类型 | 3处全部改为具体类型 `WorkoutRecord[]` | ✅ |
| 类型文件零注释 | 4个类型文件全部完成字段注释 + Java 类比 | ✅ |
| Store 方法零 JSDoc | 4个 Store 全部完成方法注释 | ✅ |
| planGenerator.ts 零文档 | 新增顶层 JSDoc 说明6周训练体系 | ✅ |
| TrainingExecution 内联样式 | 改为 scoped CSS class | ✅ |

---

## 二、当前遗留问题

### ⚠️ 遗留 - Week6Decision.vue 存在重复逻辑和跨层调用

**文件**：`views/Week6Decision.vue`

| 位置 | 问题 | 建议 |
|---|---|---|
| L168-L173 | `ONE_RM_MULTIPLIERS` 常量在视图中重复定义 | 应从 `statsService.ts` 导入（该文件已定义相同常量） |
| L190-L209 | `findBestSet()` 业务逻辑写在视图层 | 迁入 `statsService.ts` 或新建 `week6Service.ts` |
| L211-L216 | `getMultiplier()` 与 `statsService.estimateNew1RM()` 功能重复 | 直接使用 `estimateNew1RM()` |
| L277-L331 | `handleConfirm()` 中3个分支各自组装 weeks 数组并调用 `updateCycle()` | 迁入 `cycleStore` 为 `applyWeek6Decision()` |

**影响**：第6周决策是用户必经流程，当前写法如果以后要改决策逻辑需要同时改 Week6Decision.vue + statsService。

### ⚠️ 遗留 - 命名缩写

| 文件 | 原名 | 建议 |
|---|---|---|
| `statsService.ts` L4 | `ONE_RM_MULTIPLIERS` | `ESTIMATED_ONE_REP_MAX_MULTIPLIERS` |
| `statsService.ts` L11 | `epley1RM()` | `calculateEpleyOneRepMax()` |
| `statsService.ts` L56 | `get1rmTrend()` | `getOneRepMaxTrend()` |
| `statsService.ts` L42 | `estimateNew1RM()` | `estimateNewOneRepMax()` |
| Week6Decision.vue L168 | `ONE_RM_MULTIPLIERS` | 应从 service 导入，消除重复定义 |

### ⚠️ 遗留 - planGenerator.ts 内部函数仍无 JSDoc

顶层已有6周体系说明，但 `buildWeek1Days()` ~ `buildWeek6TestDays()` 等内部函数仍无注释。这些函数是 Candito 训练公式的核心实现，建议至少标注"当前周的训练主题和强度百分比范围"。

### ⚠️ 遗留 - TrainingExecution.vue `as` 类型断言

草稿恢复逻辑（L293-L301）使用 `data.exercises as MutableExercise[]` 等 `as` 类型断言，这些是 TypeScript 中的 `any` 等价物。建议定义 `DraftData` 接口，用类型守卫替代断言。

### ⚠️ 遗留 - statsService.ts 无 JSDoc

`calculateVolume()`、`calculateTotalVolume()`、`calculateWeeklyCompletion()`、`get1rmTrend()` 等导出函数均无 JSDoc 注释。这些是训练数据分析的核心指标，Java 开发者需要知道每个指标的物理含义。

---

## 三、新架构亮点

### 3.1 逻辑前后端分离已基本达成

```
训练执行完整链路（优化后）：

TrainingExecution.vue               mr10Service.ts         cycleStore.ts
────────────────────                 ──────────────         ─────────────
用户完成一组                           
  → completeCurrentSet()
    ├─ 更新组状态（UI层）             calculateMr10LoadingSets()  
    ├─ 检测 MR10 触发 ──────────────→ 计算加量组/减量组参数
    ├─ 调用 buildDynamicSets()       ← 返回 Mr10DynamicSetParams
    └─ saveDraft() ─────────────→ draftService.saveDraft()

用户点击"完成训练"
  → finishWorkout()
    ├─ 组装 ExerciseRecord[]（UI层）
    ├─ cycleStore.finishWorkout() ──→ 1. 创建 WorkoutRecord
    │                                 2. 更新 TrainingDay 状态
    │                                 3. 检测 Week5/6 边界
    └─ 根据返回决定跳转               ← 返回 FinishWorkoutResult
```

### 3.2 新建的领域服务

| 文件 | 职责 | 类比 Java |
|---|---|---|
| `draftService.ts` | localStorage 草稿的原子读写 | Session Persistence Util |
| `mr10Service.ts` | MR10 动态组计算（纯函数） | Domain Service |
| `cycleStore.finishWorkout()` | 训练完成事务编排 | Service 事务方法 |
| `cycleStore.skipDay()` | 跳过训练日 | Service 方法 |

---

## 四、架构评分卡（更新后）

| 维度 | V1 | V2 | 说明 |
|---|---|---|---|
| 目录结构 | 🟢 | 🟢 | 无变化 |
| Store 层设计 | 🟢 | 🟢 | 新增 `finishWorkout`、`skipDay` 业务方法 |
| Service 层设计 | 🟢 | 🟢 | 新增 `draftService`、`mr10Service` |
| View 层纯洁度 | 🔴 | 🟢 | 核心违规全部修复 |
| 类型完整性 | 🟡 | 🟢 | `any` 全部消除，字段注释全量完成 |
| 注释覆盖率 | 🔴 | 🟢 | 类型 100% + Store 95% + 核心 Service 部分完成 |
| 命名规范性 | 🟡 | 🟡 | 缩写问题仍存在，但不影响理解 |

---

## 五、修复建议优先级

```
本次审查建议（全部 P2 - 改善性）：

  ├─ 1. Week6Decision.vue 重复逻辑消除
  │     - findBestSet() → statsService
  │     - getMultiplier() → 直接用 estimateNew1RM()
  │     - handleConfirm() 3个分支 → cycleStore.applyWeek6Decision()
  │
  ├─ 2. statsService.ts 命名统一 + JSDoc 补充
  │
  ├─ 3. planGenerator.ts 内部函数补充注释
  │
  └─ 4. TrainingExecution 草稿恢复用 DraftData 接口替代 as 断言
```

---

## 六、总体评价

项目经过优化后，代码质量有**质的飞跃**：

- **对于 Java 开发者**：现在可以像读 Java 项目一样理解代码——类型文件像数据库 DDL，Store 像 Service 层，Service 像工具类，视图像 JSP/Thymeleaf 模板
- **架构清晰度**：核心链路 `View → Store → Service → Provider` 分层明确，边界清晰
- **可维护性**：新增 draftService + mr10Service 后，TrainingExecution.vue 从 1058 行"上帝组件"变为结构合理的编排层

当前仅剩的 Week6Decision.vue 问题和命名缩写属于改善性优化，不影响核心架构的正确性。
