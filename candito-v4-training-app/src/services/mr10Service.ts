import { roundWeight } from './planGenerator'

/**
 * MR10 动态调整服务。
 *
 * Candito 第2周深蹲训练包含 MR10（Max Reps 10）组——用户以 80%/82.5% 1RM 重量尽可能多次完成。
 * 完成后系统根据实际完成次数自动插入后续动态组，这是 Candito 6周计划的核心自适应机制：
 *
 * - Day1（第2周第1天，80% 1RM）：加量组（Loading Sets），固定 5组×3次
 * - Day3（第2周第3天，82.5% 1RM）：减量组（Unloading Sets），阶梯组数
 *
 * 类比 Java：这是一个无状态的领域服务（Domain Service），只包含纯计算逻辑。
 */

/** 动态组生成参数，供调用方构造 MutableSet 对象 */
export interface Mr10DynamicSetParams {
  /** 训练重量（已取整） */
  weight: number
  /** 每组目标次数（显示文本，如 "3"） */
  reps: string
  /** 插入的组数 */
  count: number
}

/**
 * 计算 MR10 Day1 加量组参数。
 *
 * Day1 深蹲 MR10 完成后固定追加 5 组 × 3 次。重量根据 MR10 成绩微调：
 * - 完成 ≥8 次：加量组重量 = MR10重量 + 2.5kg（表现良好，可适度加重）
 * - 完成 <8 次：加量组重量 = MR10重量 × 0.975（接近极限，微降确保完成）
 *
 * @param amrapWeight - MR10 组使用的重量（已取整）
 * @param reps - MR10 组实际完成的次数
 * @param rounding - 重量取整步长，默认 2.5kg
 * @returns 加量组参数（固定 5组 × 3次）
 */
export function calculateMr10LoadingSets(
  amrapWeight: number,
  reps: number,
  rounding: number = 2.5,
): Mr10DynamicSetParams {
  if (reps >= 8) {
    return { weight: roundWeight(amrapWeight + 2.5, rounding), reps: '3', count: 5 }
  }
  return { weight: roundWeight(amrapWeight * 0.975, rounding), reps: '3', count: 5 }
}

/**
 * 计算 MR10 Day3 减量组参数。
 *
 * Day3 深蹲 MR10 完成后追加减量组。所有减量组重量 = MR10重量 - 5kg，组数根据成绩阶梯计算：
 * - ≥10 次 → 10 组（完成极好，最大训练量刺激）
 * - 8-9 次 → 8 组（完成良好，标准训练量）
 * - 7 次   → 5 组（勉强达标，减少训练量避免过度疲劳）
 * - <7 次  → 返回 null（未达标，应跳过减量组并建议降低后续1RM）
 *
 * @param amrapWeight - MR10 组使用的重量（已取整）
 * @param reps - MR10 组实际完成的次数
 * @param rounding - 重量取整步长，默认 2.5kg
 * @returns 减量组参数，reps < 7 时返回 null 表示应跳过
 */
export function calculateMr10UnloadingSets(
  amrapWeight: number,
  reps: number,
  rounding: number = 2.5,
): Mr10DynamicSetParams | null {
  const totalSets = getUnloadingSetCount(reps)
  if (totalSets === 0) return null
  return {
    weight: roundWeight(amrapWeight - 5, rounding),
    reps: '3',
    count: totalSets,
  }
}

/**
 * 根据 MR10 完成次数计算减量组数。
 *
 * @param totalReps - MR10 实际完成次数
 * @returns 应生成的减量组数（可能为 0）
 */
export function getUnloadingSetCount(totalReps: number): number {
  if (totalReps >= 10) return 10
  if (totalReps >= 8) return 8
  if (totalReps >= 7) return 5
  return 0
}
