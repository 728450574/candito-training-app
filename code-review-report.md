# Candito Training App 全链路代码审查报告

> 审查依据：[项目级规则 - 面向Java开发者的前端可维护性](file:///e:/ideaworkspace/candito-training-app/.trae/rules/maintainability-for-java-dev.md)
> 审查日期：2026-07-15

---

## 一、整体架构概览

```
vue组件(.vue) ──调用──▶ Store(Pinia) ──调用──▶ services/ ──调用──▶ localStorage / CloudBase
   ↑                      ↑
   │                      │
composables/          types/
(UI工具层)           (数据模型)
```

**当前链路**：`Vue Views → Store → Storage Provider → localStorage/CloudBase`，分层方向合理。但存在大量 **Vue组件直接跨越Store层操作数据** 的违规。

---

## 二、严重问题（🔴 必须修复）

### 2.1 前后端分离违规 —— TrainingExecution.vue 是"上帝组件"

**文件**：`candito-v4-training-app/src/views/TrainingExecution.vue` — **1058行**

这是整个项目最严重的问题。该组件把 **Service层的业务逻辑全部写在了 View 层**：

| 违规代码位置 | 业务逻辑内容 | 应该在哪个层 |
|---|---|---|
| L339-L359 | `saveDraft()` / `loadDraft()` 直接操作 `localStorage` | Store 或 Service |
| L777-L849 | `completeCurrentSet()` — MR10 动态调整算法（加量组/减量组计算） | `mr10Service.ts` |
| L867-L972 | `finishWorkout()` — 训练记录创建、Week5/6完成检测、周期状态更新 | Store.action |
| L745-L748 | `roundWeight()` — 重量取整（与 planGenerator 重复实现） | `weightService.ts` |

**影响**：以后要修改训练完成的逻辑，必须在这 1000+ 行的 Vue 文件中定位业务代码，而不是直奔 Store/Service。

---

### 2.2 前后端分离违规 —— TodayTraining.vue 直接拼接数据

**文件**：`candito-v4-training-app/src/views/TodayTraining.vue`

| 违规代码位置 | 问题描述 |
|---|---|
| L658-L671 | `handleSkipTraining()` 在组件内直接拼接 `weeks` 数组并调用 `cycleStore.updateCycle()`，绕过了 Store 的业务接口 |
| L596-L605 | `estimateDuration()` 训练时长估算逻辑散落在组件中 |
| L507-L524 | `streakDays` 连续训练天数计算直接写在 `computed` 中 |

**实际调用链路**：
```
TodayTraining.vue → 直接拼接weeks数组 → cycleStore.updateCycle()  ← 违规
                 ↓ 应该的链路
TodayTraining.vue → cycleStore.skipDay(cycleId, weekNum, dayNum) → Store内部处理
```

---

### 2.3 前后端分离违规 —— ProgressStats.vue 重复实现业务逻辑

**文件**：`candito-v4-training-app/src/views/ProgressStats.vue`

L368-L401 的 `buildTrendData()` 和 `findBest1RM()` 与 `services/statsService.ts` 中已有的 `get1rmTrend()` / `bestEstimated1RM()` **功能完全相同但实现不一致**。统计页面直接绕过 statsService 自己算了一遍。

**问题链路**：
```
ProgressStats.vue                     statsService.ts
  ├─ buildTrendData()                 ├─ get1rmTrend()       ← 已有实现
  │    └─ findBest1RM()               │    └─ bestEstimated1RM()  ← 已有实现
  │        使用 epley公式直接算         │        用 ONE_RM_MULTIPLIERS 查表
  └─ 与 service 结果可能不一致！        └─ 这是正确版本
```

---

### 2.4 类型安全 —— `any` 类型滥用

| 文件 | 位置 | 违规代码 | 应改为 |
|---|---|---|---|
| ProgressStats.vue | L326 | `Record<string, any[]>` | `Record<string, WorkoutRecord[]>` |
| ProgressStats.vue | L334 | `const all: any[] = []` | `const all: WorkoutRecord[] = []` |
| ProgressStats.vue | L368 | `cycles: any[], records: Record<string, any[]>` | 使用 `Cycle[]` 和 `Record<string, WorkoutRecord[]>` |

---

## 三、注释缺失（⚠️ 中等问题，直接影响Java开发者理解）

### 3.1 数据模型零注释（对标数据库表结构 COMMENT）

**所有4个类型文件完全没有字段注释**：

| 文件 | 行数 | 字段数 | 注释覆盖 |
|---|---|---|---|
| `types/bodyMetric.ts` | 16行 | 7个字段 | **0条** |
| `types/settings.ts` | 7行 | 5个字段 | **0条** |
| `types/record.ts` | 41行 | 17个字段 | **0条** |
| `types/cycle.ts` | 99行 | 25+个字段 | **0条** |

规则要求的是（以 `TrainingLog` 为例）：
```typescript
/** 训练日期，格式 "YYYY-MM-DD"，类比 DATE 类型 */
trainingDate: string;
/** 训练状态：0=已完成 1=跳过 2=失败，类比 TINYINT 枚举 */
status: number;
```

### 3.2 Store 方法零 JSDoc（对标 Java Service 方法注释）

4个Store共暴露 **30个方法**，只有 `recordStore.loadAll()` 有1条 JSDoc。这相当于 Java 项目中所有 Service 方法没有 Javadoc：

| Store | 导出方法数 | JSDoc覆盖 |
|---|---|---|
| `stores/bodyMetricStore.ts` | 6个 | **0** |
| `stores/settingsStore.ts` | 4个 | **0** |
| `stores/cycleStore.ts` | 11个 | **0** |
| `stores/recordStore.ts` | 10个 | **1个**（仅 loadAll） |

### 3.3 planGenerator.ts 零文档 —— 核心业务逻辑的黑盒

`services/planGenerator.ts` 是整个项目**最核心的业务代码**（705行），包含 Candito 6周计划的全部训练公式：
- `createCycle()` — 无JSDoc
- `buildWeeks()` — 无JSDoc
- `buildWeek1Days()` ~ `buildWeek6TestDays()` — 全靠魔法数字 `80%×6`、`87.5%×3`，没有注释解释"为什么在这个阶段用这个百分比"

---

## 四、命名规范问题（⚠️ 中等问题）

| 文件 | 当前命名 | 问题 | 建议命名 |
|---|---|---|---|
| planGenerator.ts L4 | `ONE_RM_MULTIPLIERS` | 缩写 | `ESTIMATED_ONE_REP_MAX_MULTIPLIERS` |
| statsService.ts L11 | `epley1RM()` | 函数名不规范 | `calculateEpleyOneRepMax()` |
| statsService.ts L56 | `get1rmTrend()` | 缩写 | `getOneRepMaxTrend()` |
| TrainingExecution.vue | `mr10TotalReps`, `mr10Calculated`, `mr10LoadingWeight` | MR10 缩写不直观 | `maxReps10TotalReps`, `maxReps10Calculated`, `maxReps10LoadingWeight` |
| 多处循环 | `ex` (exercise), `s` (set), `d` (day), `w` (week) | 单字母缩写 | 使用 `exercise`, `set`, `day`, `week` |

---

## 五、异常处理问题（⚠️ 中等问题）

| 文件 | 位置 | 代码 | 问题 |
|---|---|---|---|
| `storage/localProvider.ts` | 多处 | `catch { return [] }` | 存储读取失败静默返回空数组，无日志 |
| `storage/localProvider.ts` | 多处 | `catch { /* storage full */ }` | 存储写入失败完全静默，用户数据丢失却不知道 |
| `storage/cloudProvider.ts` | 多处 | `catch(err) { console.error(...) }` | 云端操作失败只打印控制台，用户无感知 |

**影响**：localStorage 满了，用户点击保存后以为数据存上了，实际根本没存。

---

## 六、依赖与架构总评

### 6.1 依赖清单（✅ 基本合理）

| 依赖 | 用途 | 评价 |
|---|---|---|
| `vue` + `vue-router` + `pinia` | 框架核心 | ✅ 必须 |
| `@cloudbase/js-sdk` | 云端存储 | ⚠️ 体积较大但功能必要 |
| `uuid` | 生成唯一ID | ⚠️ 可用原生 `crypto.randomUUID()` 替代，减少一个依赖 |
| `lucide-vue-next` | 图标库 | ✅ 合理 |

### 6.2 架构评分卡

| 维度 | 评分 | 说明 |
|---|---|---|
| 目录结构 | 🟢 优 | `views/` `stores/` `services/` `types/` `composables/` 分层清晰 |
| Store 层设计 | 🟢 优 | 4个Store按领域拆分，`recordStore` 的预加载+内存缓存设计合理 |
| Service 层设计 | 🟢 优 | `storage/` 抽象了 local/cloud 双Provider，`mergeData` 合并策略严谨 |
| View 层纯洁度 | 🔴 差 | TrainingExecution、TodayTraining、ProgressStats 大量跨层调用 |
| 类型完整性 | 🟡 中 | 类型定义完整但零注释且存在 `any` 滥用 |
| 注释覆盖率 | 🔴 差 | 类型0% + Store方法3% + 核心Service 0% |

---

## 七、修复优先级

```
P0 — 影响数据一致性 / 严重的架构违规：
  ├─ 1. 拆解 TrainingExecution.vue：业务逻辑迁移到 trainingStore + mr10Service
  ├─ 2. TodayTraining.handleSkipTraining() → 迁移到 cycleStore
  └─ 3. 消除 UI 组件直接操作 localStorage（draft 机制迁移到 draftService）

P1 — 影响 Java 开发者可维护性：
  ├─ 4. 为 types/*.ts 所有字段添加注释（对标数据库表 COMMENT）
  ├─ 5. 为 Stores 所有导出方法添加 JSDoc（对标 Java 方法 Javadoc）
  ├─ 6. 为 planGenerator.ts 核心业务逻辑添加注释
  └─ 7. 消除 ProgressStats.vue 中的 any 类型和重复逻辑

P2 — 改善代码质量：
  ├─ 8. 统一命名，消除缩写（get1rmTrend → getOneRepMaxTrend 等）
  ├─ 9. ProgressStats 中 findBest1RM 替换为 statsService.bestEstimated1RM
  └─ 10. 异常处理补充用户反馈（localStorage满时弹出提示）
```

---

## 八、理想改造后的链路示例

以 TrainingExecution.vue 改造后的目标架构：

```
TrainingExecution.vue                    trainingStore.ts (新建)
─────────────────────                    ──────────────────────────
用户点击"完成本组"                         
  → store.completeSet()        ──────→  更新当前组状态
  → (自动触发 MR10 计算)        ──────→  mr10Service.calculateDynamicSets()
  → (自动保存训练草稿)           ──────→  draftService.save()

用户点击"完成训练"
  → store.finishWorkout()      ──────→  创建 WorkoutRecord
                                        检测 Week5/6 完成状态
                                        更新 Cycle.status
                                        recordStore.addRecord()
                                        cycleStore.updateCycle()
  → router.push('/complete')   ←──────  Store 返回是否跳转
```

这样 UI 组件只负责：**渲染界面 + 响应用户点击 + 调用 Store 方法**。所有"怎么算"的逻辑全部在 Store/Service 中——跟 Java 里 Controller 只调用 Service、不写业务逻辑一样。
