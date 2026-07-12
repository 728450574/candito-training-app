# 业务逻辑保真验证报告 (Task 6A)

> 验证对象：从原 H5 项目 `candito-v4-training-app/src/` 复用至 `miniprogram/` 的 TypeScript 类型定义与纯逻辑 services
> 验证原则：业务算法逐行等价，不得简化、改写或"优化"
> 验证日期：2026-07-12
> 对照基准：`candito-v4-training-app/` 分支原文件（未修改）

---

## 0. 文件清单与复制方式

### Task 5 — 类型定义（4 个，原样复制）
| 新文件 | 原文件 | 复制方式 |
|---|---|---|
| `miniprogram/types/cycle.ts` | `candito-v4-training-app/src/types/cycle.ts` | 原样（无 import，diff IDENTICAL） |
| `miniprogram/types/record.ts` | `candito-v4-training-app/src/types/record.ts` | 原样（无 import，diff IDENTICAL） |
| `miniprogram/types/bodyMetric.ts` | `candito-v4-training-app/src/types/bodyMetric.ts` | 原样（无 import，diff IDENTICAL） |
| `miniprogram/types/settings.ts` | `candito-v4-training-app/src/types/settings.ts` | 原样（无 import，diff IDENTICAL） |

### Task 6 — 纯逻辑 services（4 个）
| 新文件 | 原文件 | 复制方式 |
|---|---|---|
| `miniprogram/services/dateService.ts` | `.../services/dateService.ts` | 原样（无 import，diff IDENTICAL） |
| `miniprogram/services/planGenerator.ts` | `.../services/planGenerator.ts` | 仅调整 import：`@/types/cycle` → `../types/cycle` |
| `miniprogram/services/statsService.ts` | `.../services/statsService.ts` | 仅调整 import：`@/types/record` → `../types/record`、`@/types/cycle` → `../types/cycle` |
| `miniprogram/services/exportService.ts` | `.../services/exportService.ts` | 仅复制纯算法部分，IO 部分 TODO 留 Task 16 |

### 路径调整汇总（仅这些，业务算法本体零改动）
- `@/types/cycle` → `../types/cycle`（planGenerator.ts: 2 处 import）
- `@/types/record` → `../types/record`（statsService.ts: 1 处 import）
- `@/types/cycle` → `../types/cycle`（statsService.ts: 1 处 import）
- `./dateService`、`./dateService` 相对路径保持不变（同目录）
- `import { v4 as uuidv4 } from 'uuid'` 保持原样（planGenerator.ts，小程序 npm 构建后续配置）

### TS 严格模式验证
- `tsconfig.json` 配置：`"strict": true`、`"types": ["miniprogram-api-typings"]`、`"include": ["miniprogram/**/*"]`
- 执行 `npx tsc --noEmit`，退出码 **0**，无任何报错。
- 为支撑 planGenerator 的 `uuid` import 与小程序类型，已安装 `uuid`、`@types/uuid`、`miniprogram-api-typings`、`typescript`。

---

## 验证项 1：类型定义一致性 ✅ 通过

### `types/cycle.ts` 导出项（diff 确认与原文件 IDENTICAL）
- 类型别名：`DayStatus`、`CycleStatus`、`Week6Decision`、`DayType`
- 接口：`BatchProcessRecord`、`PauseRecord`、`RestartRecord`、`PlannedSet`、`PlannedExercise`、`TrainingDay`、`Week`、`Cycle`

### `types/record.ts` 导出项（diff 确认与原文件 IDENTICAL）
- 接口：`PlannedSet`、`PlannedExercise`、`SetRecord`、`ExerciseRecord`、`WorkoutRecord`

### `types/bodyMetric.ts` 导出项（diff 确认与原文件 IDENTICAL）
- 接口：`BodyMetric`

### `types/settings.ts` 导出项（diff 确认与原文件 IDENTICAL）
- 接口：`UserSettings`

**结论**：4 个类型文件字节级一致，字段、枚举、接口定义完全保真。

---

## 验证项 2：planGenerator 关键算法 ✅ 通过

> 算法本体未改动（diff 仅显示 import 行差异）。以下用 node 实跑复制后的等价逻辑验证输出。

### `roundWeight(weight, rounding)`
- 实现：`Math.round(weight / rounding) * rounding`
- 验证：`roundWeight(85.5, 2.5)`
  - `85.5 / 2.5 = 34.2`
  - `Math.round(34.2) = 34`
  - `34 * 2.5 = 85`
  - **实跑输出：85** ✅（与预期一致）

### `pct(value, percent, rounding)`
- 实现：`roundWeight(value * percent / 100, rounding)`
- 验证：`pct(100, 80, 2.5)`
  - `100 * 80 / 100 = 80`
  - `roundWeight(80, 2.5) = Math.round(80/2.5)*2.5 = Math.round(32)*2.5 = 32*2.5 = 80`
  - **实跑输出：80** ✅（与预期一致）

### 关键函数签名（与原文件逐行一致）
- `mainSet(setNumber: number, weight: number, reps: string, isAMRAP = false): PlannedSet` ✅
- `mainSets(count: number, weight: number | undefined, reps: string, startFrom = 1): PlannedSet[]` ✅
- `amrapSet(setNumber: number, weight: number, reps: string): PlannedSet` ✅
- `assistanceExercise(name: string, sets: PlannedSet[]): PlannedExercise` ✅
- `buildAssistanceExercises(config: Cycle['assistanceConfig']): PlannedExercise[]` ✅

### 周次构建器（签名与百分比参数全部保留）
- `buildWeek1Days` … `buildWeek6Days`：offsets / types / 百分比 / reps 字符串逐行保留
- `WEEK_BUILDERS`、`WEEK_THEMES`、`WEEK_OFFSETS`、`buildWeeks`、`createCycle` 均原样保留
- 各周百分比取值（如深蹲 80/75/87.5/90/92.5/97.5%、卧推 45/60/67.5/70/75/77.5/80/82.5/85/87.5%、硬拉 70/75/80/82.5/85/87.5/90/92.5%）全部未改动

**结论**：planGenerator 业务算法逐行等价。

---

## 验证项 3：statsService 关键算法 ✅ 通过

### `epley1RM(weight, reps)`
- 实现：
  ```
  if (reps <= 0) return weight
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
  ```
- 验证：
  - `epley1RM(100, 5)` = `100 * (1 + 5/30)` = `100 * 1.1666...` → **实跑：116.66666666666667** ✅
  - `epley1RM(100, 1)` → reps===1 直接返回 weight → **实跑：100** ✅
  - `epley1RM(100, 0)` → reps<=0 直接返回 weight → **实跑：100** ✅

### `ONE_RM_MULTIPLIERS`
- 定义：
  ```
  { 1: 1.00, 2: 1.03, 3: 1.06, 4: 1.09 }
  ```
- ✅ 与原文件一致（`Record<number, number>`）

### `calculateVolume(record)`
- 实现：`Σ (set.actualWeight ?? set.targetWeight ?? 0) × (set.actualReps ?? 0)`
- 实跑样例：actualWeight 缺失走 targetWeight=100×5 + actualWeight=80×10 = 500 + 800 = **1300** ✅

### `calculateTotalVolume(records)`
- 实现：`records.reduce((sum, r) => sum + calculateVolume(r), 0)` ✅ 逐行一致

### `calculateWeeklyCompletion(cycle)`
- 实现：`completed = days.filter(status === 'completed' || 'makeup').length`；`percent = total > 0 ? Math.round(completed/total*100) : 0`
- 实跑样例（4 天：completed/pending/makeup/skipped）→ `completed=2, total=4, percent=50` ✅（Math.round 取整）

### 其他导出函数（签名逐行一致）
- `estimateNew1RM(weight, reps)`：reps<=0 返回 weight；reps 命中 ONE_RM_MULTIPLIERS 返回 `Math.round(weight * multiplier)`；否则 `Math.round(epley1RM(...))` ✅
- `getAverageFeeling(records)`：`Math.round(sum/len*10)/10`，空数组返回 0 ✅
- `get1rmTrend(cycles, records)`：遍历 cycles 取 bestEstimated1RM，按 squat/bench/deadlift 分组 ✅
- `bestEstimated1RM`：跳过 actualReps/actualWeight 为 null 及 reps<=0，取最大 estimated ✅

**结论**：statsService 业务算法逐行等价。

---

## 验证项 4：exportService 校验和算法 ✅ 通过

> 仅复制纯算法部分；IO 部分（downloadBlob/exportJSON/exportCSV/importJSON/buildExportPayload/validateImportData/detectConflicts/ImportResult）留 TODO，Task 16 重写。

### `EXPORT_VERSION`
- 值：`'1.0.0'` ✅

### `ExportData` 接口结构
```
{
  version: string
  exportedAt: string
  checksum: string
  data: {
    cycles: any[]
    records: Record<string, any[]>
    bodyMetrics: any[]
    settings: any
  }
}
```
- ✅ 与原文件一致（`{version, exportedAt, checksum, data:{cycles, records, bodyMetrics, settings}}`）

### `simpleHash(str)` 计算过程
- 实现：
  ```
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
  ```
- `simpleHash("test")` 逐字符推演：
  | i | char | charCode | hash = ((hash<<5)-hash)+char | hash \|= 0 |
  |---|---|---|---|---|
  | 0 | 't' | 116 | ((0<<5)-0)+116 = 116 | 116 |
  | 1 | 'e' | 101 | ((116<<5)-116)+101 = (3712-116)+101 = 3697 | 3697 |
  | 2 | 's' | 115 | ((3697<<5)-3697)+115 = (118304-3697)+115 = 114722 | 114722 |
  | 3 | 't' | 116 | ((114722<<5)-114722)+116 = (3671104-114722)+116 = 3556498 | 3556498 |
  - `hash >>> 0` = 3556498（正数，无符号转换不变）
  - `(3556498).toString(16)` = `364492`（6 位）
  - `.padStart(8, '0')` = `00364492`
  - **实跑输出：`00364492`** ✅

### `calculateChecksum(payload)`
- 实现：`return simpleHash(payload)` ✅（即 simpleHash 的别名包装）

**结论**：exportService 纯算法逐行等价；IO 部分已明确 TODO，不影响校验和保真。

---

## 验证项 5：storage key 命名清单 ✅ 通过

> 读取原 H5 stores 文件确认 key 命名，供 Task 8 stores 重写时参考。小程序需将 `localStorage` 替换为 `wx.getStorageSync` / `wx.setStorageSync` / `wx.removeStorageSync`，但 key 命名必须保持一致以保证数据兼容。

### `stores/cycleStore.ts`
| 常量 | 值 | 用途 |
|---|---|---|
| `STORAGE_KEY` | `candito_cycles` | 全部周期数据（`Cycle[]` JSON） |
| `ACTIVE_KEY` | `candito_active_cycle` | 当前激活周期 ID（`string` JSON） |

### `stores/recordStore.ts`
| 常量 | 值 | 用途 |
|---|---|---|
| `STORAGE_PREFIX` | `candito_records_` | 训练记录 key 前缀，完整 key = `candito_records_` + `cycleId` |
| 完整 key 示例 | `candito_records_{cycleId}` | 单个周期的 `WorkoutRecord[]` JSON |

> 注意：`getCycleIds()` 通过 `localStorage.key(i)` + `startsWith(STORAGE_PREFIX)` 遍历得出所有 cycleId。小程序无 `localStorage.key(i)` 等价 API，Task 8 需改为：从 `candito_cycles` 反推 cycleId 列表，或维护独立的索引 key。

### `stores/bodyMetricStore.ts`
| 常量 | 值 | 用途 |
|---|---|---|
| `STORAGE_KEY` | `candito_metrics` | 全部身体数据（`BodyMetric[]` JSON） |

### `stores/settingsStore.ts`
| 常量 | 值 | 用途 |
|---|---|---|
| `STORAGE_KEY` | `candito_settings` | 用户设置（`UserSettings` JSON） |

### settingsStore 默认值（Task 8 需保留）
```
DEFAULT_SETTINGS = {
  defaultUnit: 'kg',
  defaultRestSeconds: 90,
  weightRounding: 2.5,
  reminderEnabled: false,
  reminderTime: '08:00',
}
```
- 加载策略：`{ ...DEFAULT_SETTINGS, ...parsed }`（合并覆盖）✅ 需在 Task 8 保真

### 完整 storage key 清单（共 4 类）
1. `candito_cycles` — 周期列表
2. `candito_active_cycle` — 激活周期 ID
3. `candito_records_{cycleId}` — 各周期训练记录（动态 key，前缀 `candito_records_`）
4. `candito_metrics` — 身体数据
5. `candito_settings` — 用户设置

**结论**：key 命名已全部记录，Task 8 重写 stores 时须沿用同一命名以兼容历史数据。

---

## 浏览器 API 引用审查 ✅ 通过

对 `miniprogram/services/` 全目录扫描以下符号：
`localStorage`、`document`、`window`、`Blob`、`URL.createObjectURL`、`FileReader`、`navigator`、`fetch(`、`XMLHttpRequest`、`location.`

- **实际代码引用：0 处**
- 唯一命中：`exportService.ts:33` 的 TODO 注释（`// - downloadBlob(blob, filename) → 原 H5 使用 Blob / URL.createObjectURL / document.createElement('a')`），属说明性文档，非可执行代码。
- `Date`、`Math`、`JSON`、`Array`、`String`、`Set`、`Number` 等标准内置对象使用保持（小程序运行时支持）。

**结论**：services 无任何隐含浏览器 API 依赖，可在小程序运行时直接使用。

---

## 总结

| 验证项 | 结果 |
|---|---|
| 1. 类型定义一致性 | ✅ 通过（4 文件 diff IDENTICAL） |
| 2. planGenerator 关键算法 | ✅ 通过（roundWeight/pct/签名 + 周次百分比均逐行等价） |
| 3. statsService 关键算法 | ✅ 通过（epley1RM/ONE_RM_MULTIPLIERS/calculateVolume/calculateWeeklyCompletion 均等价） |
| 4. exportService 校验和算法 | ✅ 通过（simpleHash/calculateChecksum/EXPORT_VERSION/ExportData 等价；IO 部分 TODO） |
| 5. storage key 命名 | ✅ 通过（5 类 key 全部记录，供 Task 8 使用） |
| 浏览器 API 引用审查 | ✅ 通过（services 实际代码 0 处引用） |
| TS 严格模式类型检查 | ✅ 通过（`tsc --noEmit` 退出码 0） |

### 无"需修复"项
未发现任何算法不一致或非法浏览器 API 引用，所有验证项均通过。

### 后续注意事项
1. **uuid npm 构建**：`planGenerator.ts` 依赖 `uuid` 包（已加入 `package.json` dependencies 并安装用于类型校验）。微信开发者工具需执行"工具 → 构建 npm"步骤，后续任务统一配置。
2. **exportService IO 部分**：`exportJSON`/`exportCSV`/`importJSON` 及辅助函数 `buildExportPayload`/`validateImportData`/`detectConflicts`/`ImportResult` 待 Task 16 实现，届时须直接复用本文件的 `simpleHash`/`calculateChecksum`/`EXPORT_VERSION`/`ExportData`，不得改写校验和逻辑。其中 `validateImportData`/`detectConflicts` 为纯逻辑，Task 16 可原样迁移。
3. **recordStore 的 `getCycleIds()`**：依赖 `localStorage.key(i)` 遍历，小程序无等价 API，Task 8 需改为从 `candito_cycles` 反推 cycleId。
