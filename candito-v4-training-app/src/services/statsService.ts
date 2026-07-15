import type { WorkoutRecord } from '@/types/record'
import type { Cycle } from '@/types/cycle'
import type { ExerciseRecord } from '@/types/record'

/**
 * 训练统计分析服务。
 *
 * 类比 Java：Stateless Domain Service，纯计算逻辑，无副作用。
 * 包含训练量计算、1RM估算、周期完成率等统计指标。
 */

/**
 * Wendler 5/3/1 体系中的 1RM 估算系数表。
 * 用于基于低次数重量反推单次最大重量（One Rep Max）：
 * - 完成 2次 → 实际 1RM = 重量 × 1.03
 * - 完成 3次 → 实际 1RM = 重量 × 1.06
 * - 完成 4次 → 实际 1RM = 重量 × 1.09
 * 超过 4 次则使用 Epley 公式估算。
 */
export const ESTIMATED_ONE_REP_MAX_MULTIPLIERS: Record<number, number> = {
  1: 1.00,
  2: 1.03,
  3: 1.06,
  4: 1.09,
}

/**
 * 使用 Epley 公式估算 1RM。
 * 公式：1RM = weight × (1 + reps / 30)
 * 用于超过4次的情况（Wendler系数表只覆盖1-4次的区间）。
 *
 * @param weight - 使用的重量
 * @param reps - 完成的次数
 * @returns 估算的 1RM
 */
function calculateEpleyOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * 获取指定次数对应的 1RM 估算系数。
 * 1-4 次使用 Wendler 系数表，超过 4 次使用 Epley 公式系数。
 *
 * @param reps - 完成的次数
 * @returns 对应的估算系数（如 3 → 1.06）
 */
export function getOneRepMaxMultiplier(reps: number): number {
  if (reps in ESTIMATED_ONE_REP_MAX_MULTIPLIERS) {
    return ESTIMATED_ONE_REP_MAX_MULTIPLIERS[reps]
  }
  return 1 + reps / 30
}

/**
 * 计算单次训练记录的总训练量（重量 × 次数 的总和）。
 * 训练量是衡量训练负荷的核心指标，单位 kg×次。
 *
 * @param record - 训练记录
 * @returns 总训练量
 */
export function calculateVolume(record: WorkoutRecord): number {
  let total = 0
  for (const exercise of record.exercises) {
    for (const set of exercise.sets) {
      const w = set.actualWeight ?? set.targetWeight ?? 0
      const r = set.actualReps ?? 0
      total += w * r
    }
  }
  return total
}

/**
 * 计算多条训练记录的总训练量。
 *
 * @param records - 训练记录列表
 * @returns 总训练量
 */
export function calculateTotalVolume(records: WorkoutRecord[]): number {
  return records.reduce((sum, r) => sum + calculateVolume(r), 0)
}

/**
 * 计算训练周期中每周的完成率。
 *
 * @param cycle - 训练周期
 * @returns 每周的完成统计（完成天数/总天数/百分比）
 */
export function calculateWeeklyCompletion(cycle: Cycle): { weekNumber: number; completed: number; total: number; percent: number }[] {
  return cycle.weeks.map((week) => {
    const total = week.days.length
    const completed = week.days.filter((d) => d.status === 'completed' || d.status === 'makeup').length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { weekNumber: week.weekNumber, completed, total, percent }
  })
}

/**
 * 根据完成的重量和次数估算单次最大重量（1RM）。
 * 1-4 次使用 Wendler 系数表，超过 4 次使用 Epley 公式。
 *
 * @param weight - 实际使用的重量
 * @param reps - 实际完成的次数
 * @returns 估算的 1RM，四舍五入到整数
 */
export function estimateNewOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps in ESTIMATED_ONE_REP_MAX_MULTIPLIERS) {
    return Math.round(weight * ESTIMATED_ONE_REP_MAX_MULTIPLIERS[reps])
  }
  return Math.round(calculateEpleyOneRepMax(weight, reps))
}

/**
 * 计算记录列表的平均训练感受评分。
 *
 * @param records - 训练记录列表
 * @returns 平均评分（保留1位小数），无记录时返回 0
 */
export function getAverageFeeling(records: WorkoutRecord[]): number {
  if (records.length === 0) return 0
  const sum = records.reduce((acc, r) => acc + r.feeling, 0)
  return Math.round((sum / records.length) * 10) / 10
}

/**
 * 计算多个周期的三大项 1RM 趋势数据。
 * 用于绘制跨周期 1RM 趋势图（深蹲/卧推/硬拉分别一条折线）。
 *
 * @param cycles - 需要统计的训练周期列表
 * @param records - 按 cycleId 分组的训练记录
 * @returns 深蹲/卧推/硬拉三条 1RM 趋势线
 */
export function getOneRepMaxTrend(
  cycles: Cycle[],
  records: Record<string, WorkoutRecord[]>
): {
  squat: { cycleName: string; value: number }[]
  bench: { cycleName: string; value: number }[]
  deadlift: { cycleName: string; value: number }[]
} {
  const squat: { cycleName: string; value: number }[] = []
  const bench: { cycleName: string; value: number }[] = []
  const deadlift: { cycleName: string; value: number }[] = []

  for (const cycle of cycles) {
    const cycleRecords = records[cycle.id] ?? []
    squat.push({ cycleName: cycle.name, value: bestEstimatedOneRepMax(cycleRecords, '深蹲', cycle.oneRM.squat) })
    bench.push({ cycleName: cycle.name, value: bestEstimatedOneRepMax(cycleRecords, '卧推', cycle.oneRM.bench) })
    deadlift.push({ cycleName: cycle.name, value: bestEstimatedOneRepMax(cycleRecords, '硬拉', cycle.oneRM.deadlift) })
  }

  return { squat, bench, deadlift }
}

/**
 * 从指定动作的训练记录中找到历史最佳 1RM 估算值。
 * 遍历该动作所有组，找到最大的一次 1RM 估算。
 *
 * @param records - 训练记录列表
 * @param exerciseName - 动作名称（如 "深蹲"）
 * @param default1RM - 默认值（当无训练记录时使用周期初始 1RM）
 * @returns 该动作的历史最佳 1RM
 */
function bestEstimatedOneRepMax(records: WorkoutRecord[], exerciseName: string, default1RM: number): number {
  let best = default1RM
  for (const record of records) {
    for (const exercise of record.exercises) {
      if (exercise.name !== exerciseName) continue
      for (const set of exercise.sets) {
        const actualReps = set.actualReps
        const actualWeight = set.actualWeight
        if (actualReps == null || actualWeight == null) continue
        if (actualReps <= 0) continue
        const estimated = estimateNewOneRepMax(actualWeight, actualReps)
        if (estimated > best) best = estimated
      }
    }
  }
  return best
}

/**
 * 从一组动作记录中找到最佳（最重/最多重复次数）的完成组。
 * 用于第6周决策时找出第5周的最佳表现来估算新1RM。
 *
 * 选择逻辑：优先选重量最大的；若重量相同，选择次数最多的。
 *
 * @param exerciseRecords - 某动作的训练记录列表
 * @returns 最佳组的重量和次数，无有效组时返回 null
 */
export function findBestSetFromExerciseRecords(exerciseRecords: ExerciseRecord[]): { weight: number; reps: number } | null {
  let bestWeight = 0
  let bestReps = 0
  for (const ex of exerciseRecords) {
    for (const set of ex.sets) {
      const w = set.actualWeight ?? 0
      const r = set.actualReps ?? 0
      if (w > 0 && r > 0 && set.isCompleted) {
        if (w > bestWeight || (w === bestWeight && r > bestReps)) {
          bestWeight = w
          bestReps = r
        }
      }
    }
  }
  if (bestWeight > 0 && bestReps > 0) {
    return { weight: bestWeight, reps: bestReps }
  }
  return null
}

// ===== 向后兼容别名（逐步迁移用） =====
/** @deprecated 使用 estimateNewOneRepMax 替代 */
export const estimateNew1RM = estimateNewOneRepMax
/** @deprecated 使用 getOneRepMaxTrend 替代 */
export const get1rmTrend = getOneRepMaxTrend
