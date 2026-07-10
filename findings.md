# Findings

> 项目发现、架构决策和关键信息记录 — 基于当前代码库与设计稿


## 一、Candito 6周力量计划分析

### 1.1 计划来源
- **原作者**: Johnnie Candito (知名力量举运动员/教练)
- **官方网站**: http://www.canditotraininghq.com
- **中文翻译**: 滕达(@力量营)
- **计划类型**: 力量举专项训练 (深蹲/卧推/硬拉)

### 1.2 训练周期结构

| 参数 | 详情 |
|------|------|
| 总周数 | 6周 |
| 训练频率 | 每周 3-5 天（视周数变化） |
| 周期类型 | 累积-强化-峰值 |

#### 分周详情（代码实际实现）

| 周次 | 主题 | 训练日数 | 说明 |
|------|------|---------|------|
| 第1周 | 肌肉调理 | 5天 | 高容量低强度，建立基础 |
| 第2周 | 肌肉调理/增肌 | 5天 | 引入 MR10 动态调整逻辑 |
| 第3周 | 线性最大超负荷 | 4天 | 中大重量，减少辅助项 |
| 第4周 | 适应大重量 | 4天 | 三组 × 3次，渐进加重 |
| 第5周 | 高强度力量训练 | 3天 | 1-4次极限组（97.5% 1RM） |
| 第6周 | 测试/减载/跳过 | - | 决策页，非训练日 |

### 1.3 重量百分比体系（代码实际值）

```typescript
// planGenerator.ts
const SQUAT_PCTS    = [80, 82.5, 87.5, 92.5, 97.5]
const BENCH_PCTS    = [70, 72,   77.5, 83.2, 87.5]
const DEADLIFT_PCTS = [75, 77.5, 82.5, 87.5, 92.5]
```

### 1.4 辅助训练配置

三个辅助项（代码实际实现）：

| 类别 | 默认值 | 可选值 |
|------|--------|--------|
| 上背部 #1 (水平拉举) | 杠铃划船 | 哑铃划船 / 杠铃划船 / 坐姿绳索划船 / T杠划船 |
| 肩部训练 | 哑铃推举 | 坐姿哑铃推举 / 站姿杠铃推举 / 阿诺德推举 / 侧平举 |
| 上背部 #2 (垂直拉举) | 引体向上 | 负重引体向上 / 高位下拉 / 辅助引体向上 / TRX划船 |

### 1.5 MR10 动态调整逻辑（第2周独有）

```
Day 1 深蹲 MR10 @ 80% 1RM
  └── 完成次数 ≥ 8 → 加量组 (5组×3次，+2.5kg)
  └── 完成次数 < 8 → 1RM 减轻 2.5% 后加量组

Day 3 深蹲 MR10 @ 82.5% 1RM
  └── 10次 → 减量组 10组×3次
  └── 8-9次 → 减量组 8组×3次
  └── 7次   → 减量组 5组×3次
  └── <7次  → 跳过减量组，提示调低后续1RM至少2.5%
```

### 1.6 第6周决策选项

| 选项 | 行为 |
|------|------|
| new_cycle | 用预估1RM直接开始新周期 |
| deload | 先做一周减载（重做第1周降低容量），再开始新周期 |
| test_1rm | 本周实测最大重量，获得准确新1RM后再决定 |

预估公式：`estimated1RM = weight × multiplier`
| 完成次数 | 系数 |
|---------|------|
| 1 | ×1.00 |
| 2 | ×1.03 |
| 3 | ×1.06 |
| 4 | ×1.09 |

---

## 二、需求实现总览

### Q1 核心功能 (MVP)
| 需求 | 实现状态 | 说明 |
|------|---------|------|
| 输入1RM自动计算6周计划 | ✅ 已实现 | StartTraining → planGenerator |
| 每日训练打卡 | ✅ 已实现 | TodayTraining → TrainingExecution |
| 训练日历查看 | ✅ 已实现 | TrainingCalendar (SVG月历) |
| 训练计时器+组间休息 | ✅ 已实现 | useTimer composable |
| 进度统计图表 | ✅ 已实现 | ProgressStats (SVG折线图) |

### Q2 辅助训练配置
- 提供预设动作库供选择（三个类别各有 3-4 个选项）
- 自定义动作入口（CustomExercise.vue）
- 创建周期页和 1RM 设置页均可配置

### Q3-Q5 打卡与处理
| 需求 | 实现 |
|------|------|
| 主项逐组记录重量/次数 | ✅ |
| 辅助项同样逐组记录重量/次数 | ✅（2026-07-10 修复） |
| 跳过训练 | ✅ 今日页 → 跳过 |
| 错过训练检测与批量处理 | ✅ MissedWorkouts.vue |

### Q6-Q10 其他
| 需求 | 实现 |
|------|------|
| 极简白色 UI（Apple风格） | ✅ 通过 `theme.css` CSS 变量体系 |
| 非训练日显示 | ✅ TodayTraining 三种状态 |
| 本地存储 + JSON/CSV 导出 | ✅ Pinia store + exportService |
| 体重/体测记录 | ✅ WeightRecord.vue (含趋势SVG图) |
| 训练笔记/感受 | ✅ TrainingComplete.vue |

---

## 三、手势导航设计（移动端）

已实现于 `useSwipe.ts` composable：

| 手势 | 操作 | 符合惯例 |
|------|------|---------|
| **右滑 →** | 返回上级页面 | ✅ iOS 标准返回手势 |
| **左滑 ←** | 切换到下一个动作 | ✅ 卡片式浏览 |
| **下拉 ↓** | 保留默认滚动行为 | ✅ 不拦截垂直滑动 |

**技术细节**:
- 阈值 60px
- 竖直滑动 > 水平滑动时不触发（避免与滚动冲突）
- `touchmove` 中仅在水平时 `preventDefault`，保证滚动流畅
- 绑定在 `<div ref="swipeContainer">` 上，通过 `onMounted`/`onUnmounted` 自动管理

---

## 四、技术架构

### 4.1 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 响应式 UI |
| 构建 | Vite 5 + TypeScript | 开发/构建 |
| 路由 | Vue Router 4 (hash mode) | SPA 导航 |
| 状态 | Pinia | Store 层 |
| 图标 | Lucide (lucide-vue-next) | 全部图标 |
| 存储 | localStorage | 持久化 |
| 样式 | CSS 变量体系 (theme.css) | 设计 Token |
| 工具 | uuid | ID 生成 |

### 4.2 项目结构

```
candito-v4-training-app/
├── src/
│   ├── types/          # TS 类型定义（数据模型）
│   │   ├── cycle.ts    # Cycle, Week, TrainingDay, PauseRecord...
│   │   ├── record.ts   # WorkoutRecord, ExerciseRecord, SetRecord
│   │   ├── bodyMetric.ts
│   │   └── settings.ts
│   ├── services/       # 纯函数业务逻辑
│   │   ├── planGenerator.ts  # 6周计划生成 + 重量计算
│   │   ├── dateService.ts    # 日期工具
│   │   ├── statsService.ts   # 统计（容量/1RM预估）
│   │   └── exportService.ts  # JSON/CSV 导入导出
│   ├── stores/         # Pinia 数据层（localStorage 持久化）
│   │   ├── cycleStore.ts     # 周期 CRUD（键：candito_cycles）
│   │   ├── recordStore.ts    # 训练记录（按 cycleId 分片）
│   │   ├── bodyMetricStore.ts
│   │   └── settingsStore.ts
│   ├── composables/    # 可复用组合函数
│   │   ├── useTimer.ts       # 训练计时器 + 组间休息
│   │   ├── useSwipe.ts       # 手势导航
│   │   └── useWeightFormat.ts
│   ├── router/index.ts # 17 条路由
│   ├── views/          # 16 个页面组件
│   └── assets/theme.css
```

### 4.3 数据模型关键设计

**状态枚举**:
```typescript
// CycleStatus
'active' | 'paused' | 'week6_pending' | 'completed' | 'terminated'

// DayStatus
'pending' | 'completed' | 'skipped' | 'makeup' | 'postponed'

// Week6Decision
'new_cycle' | 'test_1rm' | 'deload'
```

**三日期体系**（TrainingDay）:
- `originalDate` — 原始计划日期（基于 startDate + dayOffset，永远不变）
- `scheduledDate` — 当前日程日期（暂停顺延后）
- `completedDate` — 实际打卡日期

### 4.4 路由表（17条）

| 路径 | 名称 | TabBar |
|------|------|--------|
| `/start` | start | ❌ |
| `/today` | today | ✅ |
| `/training/execute` | training-execute | ❌ |
| `/training/complete` | training-complete | ❌ |
| `/training/detail` | training-detail | ❌ |
| `/plan` | plan | ✅ |
| `/calendar` | calendar | ✅ |
| `/cycle` | cycle | ✅ |
| `/1rm` | 1rm | ❌ |
| `/pause` | pause | ❌ |
| `/missed` | missed | ❌ |
| `/week6` | week6 | ❌ |
| `/stats` | stats | ✅ |
| `/settings` | settings | ✅ |
| `/weight` | weight | ❌ |
| `/custom-exercise` | custom-exercise | ❌ |

---

## 五、页面实现细节

### 5.1 StartTraining.vue（开始训练）
- **设计稿**: `开始训练.html`
- 1RM 输入 + 单位切换 (kg/lb)
- 辅助训练配置展开面板（可切换三个辅助项）
- 开始日期自动当天
- 创建后跳转 `/today`

### 5.2 TodayTraining.vue（今日训练）
- **设计稿**: `今日训练.html`
- **三种状态**:
  1. 训练日-未训练 — 训练卡片 + 开始按钮 + 统计
  2. 训练日-已训练 — 完成提示 + 摘要 + 下次预览
  3. 休息日 — 休息提示 + 下次倒计时
- 跳过训练功能
- 第6周决策入口

### 5.3 TrainingExecution.vue（训练执行）
- **设计稿**: `训练执行.html`
- 训练时长计时器 + 圆形休息进度
- 逐组记录（重量输入 + 次数选择器）
- 辅助项与主项相同 UI（无目标瞄点）
- MR10 动态调整（第2周）
- 第5周全部完成 → 自动跳转第6周决策页
- 手势：左滑下一动作 / 右滑返回

### 5.4 TrainingComplete.vue（训练完成总结）
- **设计稿**: `训练完成总结.html`
- 训练摘要卡片 + 统计指标
- 体重记录 + 笔记 + 感受评分
- 第5周完成检测 → 跳转第6周决策

### 5.5 Week6Decision.vue（第6周决策）
- **设计稿**: `第6周决策.html`
- 展示各动作预估1RM
- 三种决策单选（推荐：直接开始新周期）
- 确认后完成当前周期，跳转创建新周期

### 5.6 其他页面
| 页面 | 文件 | 说明 |
|------|------|------|
| 训练详情 | TrainingDetail.vue | 查看历史记录（含辅助项每组数据） |
| 训练日历 | TrainingCalendar.vue | 月历视图 + 训练日状态 |
| 训练计划 | TrainingPlan.vue | 6周总览 |
| 周期管理 | CycleManagement.vue | 列表/详情/暂停/终止 |
| 暂停周期 | PauseCycle.vue | 暂停原因+恢复方式 |
| 错过训练 | MissedWorkouts.vue | 批量处理 |
| 进度统计 | ProgressStats.vue | SVG 折线图 |
| 1RM设置 | OneRMSetup.vue | 调整 + 辅助项配置 |
| 体重记录 | WeightRecord.vue | 记录+趋势图+历史 |
| 设置与导出 | SettingsExport.vue | JSON/CSV 导入导出 |
| 自定义动作 | CustomExercise.vue | 辅助项自定义（占位） |

---

## 六、已知问题与待修复

### 6.1 已修复问题

| 问题 | 修复时间 | 说明 |
|------|---------|------|
| 辅助项无法记录重量/次数 | 2026-07-10 | 之前只有"组数完成"，现与主项相同逐组录入 |
| 辅助项切换按钮无效 | 2026-07-10 | `assistanceItems` 非响应式 + 缺少 `type="button"` |
| 创建周期无法配置辅助项 | 2026-07-10 | StartTraining 缺少辅助项 UI |
| 辅助项重量每次重新填 | 2026-07-10 | 继承上一组 actualWeight |
| W1D3/W1D5 缺少卧推主项 | 2026-07-10 | planGenerator 补全 |
| W2D5 缺少 MR 组 | 2026-07-10 | 之前与 D4 相同常规组 |
| 修改辅助项后计划不变 | 2026-07-10 | 保存时需重新生成 weeks |
| 训练详情无辅助项数据 | 2026-07-10 | 辅助项只显示名称+组数 |
| 第5周完成未跳转第6周 | 2026-07-10 | `finishWorkout` 合并一次 updateCycle |

### 6.2 待实现/待验证

| 问题 | 优先级 | 说明 |
|------|--------|------|
| 暂停功能未完整测试 | P1 | PauseCycle 页面已实现但流程未完全打通 |
| 错过训练检测未上线 | P1 | MissedWorkouts 页面已存在但自动检测未接入 |
| 周期重新开始功能 | P2 | RestartRecord 模型已定义但页面未实现 |
| 第6周减载/1RM测试具体流程 | P2 | 目前三者都跳转创建新周期 |
| 自定义动作管理 | P3 | CustomExercise 为占位 |
| 数据导入（JSON） | P3 | 导出已实现，导入 UI 待完善 |
| 自定义动作在后端持久化 | P3 | 目前仅在 assistanceConfig 中存储名称 |
| 第2周 MR10 减量组生成逻辑（training execution) | P1 | planGenerator 已生成加量组，但减量组在 finishWorkout 后动态计算并注入 — 已实现在 completeCurrentSet 中 |
| 暂停后 daysShifted 未影响 scheduledDate | P2 | 暂停功能需要联动日期计算 |

### 6.3 架构遗留（不会修复）

| 原因 | 说明 |
|------|------|
| 无 JWT/认证 | 纯本地 PWA |
| 无后端 API | 所有数据在 localStorage |
| 无推送通知 | H5 限制，服务端不支持 |
| 无测试框架 | 项目初期未配置 |

---

## 七、设计稿对照

设计稿位于 `_design_extracted/pages/`，共 17 个 HTML 文件：

| 设计稿 | 对应页面 | 还原度 |
|--------|---------|--------|
| 开始训练.html | StartTraining.vue | ✅ |
| 今日训练.html | TodayTraining.vue | ✅ |
| 训练执行.html | TrainingExecution.vue | ✅ |
| 训练完成总结.html | TrainingComplete.vue | ✅ |
| 训练详情.html | TrainingDetail.vue | ✅ |
| 训练计划.html | TrainingPlan.vue | ✅ |
| 训练日历.html | TrainingCalendar.vue | ✅ |
| 周期管理.html | CycleManagement.vue | ✅ |
| 1RM设置.html | OneRMSetup.vue | ✅ |
| 暂停周期.html | PauseCycle.vue | ✅ |
| 处理错过训练.html | MissedWorkouts.vue | ✅ |
| 第6周决策.html | Week6Decision.vue | ✅ |
| 进度统计.html | ProgressStats.vue | ✅ |
| 设置与导出.html | SettingsExport.vue | ✅ |
| 体重记录.html | WeightRecord.vue | ✅ |
| 自定义动作.html | CustomExercise.vue | ✅ |
| 休息日.html | → TodayTraining 状态3 | ✅ |

---

## 八、术语表

| 术语 | 含义 |
|------|------|
| 1RM | 1次重复最大重量 (One Rep Max) |
| MR | Max Reps，极限次数 |
| MR10 | 极限次数但不超过10次 |
| AMRAP | As Many Reps As Possible，力竭组 |
| Cycle | 一个完整的6周训练周期 |
| Deload | 减载周，降低训练量恢复 |
| Pause | 暂停周期，临时停止训练（可恢复） |
| Resume | 恢复周期，从暂停状态继续训练 |
| Terminate | 终止周期，提前结束（不可恢复） |
| Postpone | 顺延，暂停后调整日期继续 |
| Reschedule | 调整日程，修改训练日期 |
| main | 主项（深蹲/卧推/硬拉），有重量百分比目标 |
| assistance | 辅助项，用户可配置具体动作名称 |
| optional | 可选项，用户可配置是否执行 |
