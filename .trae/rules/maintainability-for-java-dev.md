# 项目级规则：面向 Java 开发者的前端可维护性

## 背景
项目所有者是 Java 后端开发者，对前端（Vue/TypeScript/Node.js 生态）不熟悉。所有代码编写必须考虑后期维护成本。

## 编码原则

### 1. 代码清晰度优先
- 命名使用完整、有意义的单词，避免前端社区常见的缩写（如 `btn`、`cmp`、`ctx`、`attrs`、`e` 等），应写为 `button`、`component`、`context`、`attributes`、`event`
- 复杂逻辑必须拆分为小函数，每个函数只做一件事
- 函数/方法的圈复杂度控制在合理范围内

### 2. 类型安全（TypeScript）
- 禁止 `any` 类型（除非确实无法推断）
- 接口/类型定义要完整，字段必须有注释说明含义
- 返回值类型必须显式声明，禁止隐式 `Object`

### 3. 逻辑上的前后端分离
虽然是单项目（非前后端分离部署），但代码逻辑上必须模拟前后端分层：

- **前端层（UI + 交互）**：只负责页面渲染、用户交互、动画效果，不包含任何业务逻辑/数据计算
  - 类比 Java 的 Controller + View 层
- **后端层（业务逻辑 + 数据）**：负责数据处理、计算、校验、状态管理、与外部系统的交互
  - 类比 Java 的 Service + Repository 层
  - 以 Store（Pinia）为载体，充当"前端项目内的后端"
- **接口契约**：前端层与后端层之间通过明确的接口（Store 的 getter/action）通信，前端不直接操作原始数据
  - 类比 Java 中 Controller 调用 Service 接口，不直接操作 DAO
- **禁止事项**：
  - 禁止在 `.vue` 组件的 `<script>` 中编写业务计算逻辑（复杂公式、数据转换等）
  - 禁止在 UI 组件中直接操作 localStorage/sessionStorage/indexedDB
  - 禁止跨层调用（UI 组件直接调工具函数绕过 Store）

### 4. 架构清晰
- 关注点分离：状态管理、业务逻辑、UI 渲染严格分层
- 文件职责单一，一个文件只做一类事
- 目录结构保持扁平，嵌套不超过 3 层

### 5. 减少"魔法"
- 避免过度使用 Proxy/Reflect/装饰器等元编程特性
- 避免复杂的高阶函数嵌套（超过 2 层需要注释说明）
- 响应式数据流要显式、可追踪，避免隐式副作用

### 6. 注释规范（对标 Java 注释体系）
项目所有者不熟悉前端语法，代码注释必须达到"不查文档也能看懂"的程度。

#### 6.1 方法注释（对标 Java 方法 Javadoc）
所有导出函数/方法必须使用 JSDoc，包含以下要素：

```typescript
/**
 * 根据用户的1RM重量和训练周数，计算本周的目标训练重量
 * （类比 Java 中 Service 层的方法，接收参数、执行计算、返回结果）
 *
 * @param oneRepMax - 用户的1RM重量（单位：kg），类比数据库中的 max_weight 字段
 * @param weekNumber - 当前训练周数（1-based，第1周~第6周）
 * @param intensityPercent - 训练强度百分比，范围 0.0~1.0
 * @returns 计算后的目标训练重量（单位：kg），保留1位小数。返回 -1 表示计算失败
 * @throws 永远不会抛出异常，所有异常在内部捕获
 */
export function calculateTrainingWeight(
  oneRepMax: number,
  weekNumber: number,
  intensityPercent: number
): number {
  // ...
}
```

#### 6.2 接口/类型字段注释（对标数据库表结构 COMMENT）
所有 interface/type 的每个字段必须有行内注释，说明字段含义：

```typescript
/** 训练记录实体（类比数据库表 training_log） */
interface TrainingLog {
  /** 主键ID，自增，类比数据库 AUTO_INCREMENT */
  id: number;
  /** 训练日期，格式 "YYYY-MM-DD"，类比 DATE 类型 */
  trainingDate: string;
  /** 训练动作名称，如 "卧推"、"深蹲"，类比 VARCHAR(50) */
  exerciseName: string;
  /** 使用的重量（kg），允许小数，类比 DECIMAL(6,1) */
  weight: number;
  /** 完成的次数，整数，范围 1~30，类比 TINYINT */
  repetitions: number;
  /** 训练状态：0=已完成 1=跳过 2=失败，类比 TINYINT 枚举 */
  status: number;
}
```

#### 6.3 复杂业务逻辑注释（对标 Java 复杂方法的行内注释）
复杂计算/算法必须在关键步骤前写出"为什么这么做"，而非"做了什么"：

```typescript
function calculateFatigueIndex(trainingHistory: TrainingLog[]): number {
  // 疲劳指数公式参考 Wendler 5/3/1 体系：
  //   fatigueIndex = Σ(本周总训练量) / Σ(上周总训练量)
  // 其中训练量 = 重量 × 次数，这里用倒数第二周的历史数据对比

  // 第一步：按周分组训练记录（周一到周日为一个周期）
  const weeklyGroups = groupByWeek(trainingHistory);

  // 第二步：计算本周总训练量
  // 注意：这里用 totalWeight × totalReps 而非逐组计算，
  // 因为同一天内多组训练对神经系统疲劳有叠加效应
  const currentWeekVolume = calculateWeekVolume(weeklyGroups[0]);

  // 第三步：对比上周训练量，得出疲劳指数
  // 指数 > 1.2 说明训练量增幅过大，建议下周减载
  // 指数 < 0.5 说明训练量下降过快，可能存在训练中断
  const previousWeekVolume = calculateWeekVolume(weeklyGroups[1]);
  const fatigueIndex = currentWeekVolume / previousWeekVolume;

  return Math.round(fatigueIndex * 100) / 100;
}
```

#### 6.4 Vue 特有语法注释
Vue 的 `computed`、`watch`、生命周期钩子等前端特有语法必须加注释说明用途：

```typescript
// ===== 计算属性（类比 MyBatis 二级缓存：依赖不变就不会重新计算）=====

/** 根据 1RM 自动计算各周训练重量，当 1RM 变化时自动更新 */
const weeklyWeights = computed(() => {
  // ...
});

// ===== 监听器（类比数据库触发器：数据变了自动执行逻辑）=====

/** 当用户切换训练模板时，自动清空旧模板的训练记录 */
watch(selectedTemplateId, (newTemplateId) => {
  // ...
});

// ===== 生命周期钩子（类比 Spring @PostConstruct：组件初始化时执行）=====
onMounted(() => {
  // ...
});
```

#### 6.5 注释自查清单
写完代码后确认：
- 一个不熟悉前端的 Java 开发者，不看文档能看懂吗？
- 每个字段都知道它的数据库对应关系吗（如果有）？
- 复杂的 if/else 分支有注释说明为什么分支吗？

### 7. 依赖管理
- 尽量减少第三方依赖，优先使用标准库/框架内置能力
- 新增依赖前评估其维护状态、体积、学习曲线

### 8. 类比 Java 生态
在编写和注释时，可以用 Java 生态的概念做类比帮助理解，例如：
- Vue 的 `computed` → 类似 MyBatis 的二级缓存，依赖不变就不重新计算
- Vue 的 `watch` → 类似数据库触发器，数据变了自动执行逻辑
- Pinia Store → 类似 Spring Service + Repository 的结合体
- `ref` / `reactive` → 类似包装了一个支持脏检测的属性

### 9. 代码评审标准
- 改动是否容易让 Java 开发者理解？
- 如果半年后回来看这段代码，能不能快速定位问题？
- 有没有更简单直接的实现方式？
