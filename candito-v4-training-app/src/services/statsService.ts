import type { WorkoutRecord } from '@/types/record'
import type { Cycle } from '@/types/cycle'

const ONE_RM_MULTIPLIERS: Record<number, number> = {
  1: 1.00,
  2: 1.03,
  3: 1.06,
  4: 1.09,
}

function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

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

export function calculateTotalVolume(records: WorkoutRecord[]): number {
  return records.reduce((sum, r) => sum + calculateVolume(r), 0)
}

export function calculateWeeklyCompletion(cycle: Cycle): { weekNumber: number; completed: number; total: number; percent: number }[] {
  return cycle.weeks.map((week) => {
    const total = week.days.length
    const completed = week.days.filter((d) => d.status === 'completed' || d.status === 'makeup').length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { weekNumber: week.weekNumber, completed, total, percent }
  })
}

export function estimateNew1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight
  if (reps in ONE_RM_MULTIPLIERS) {
    return Math.round(weight * ONE_RM_MULTIPLIERS[reps])
  }
  return Math.round(epley1RM(weight, reps))
}

export function getAverageFeeling(records: WorkoutRecord[]): number {
  if (records.length === 0) return 0
  const sum = records.reduce((acc, r) => acc + r.feeling, 0)
  return Math.round((sum / records.length) * 10) / 10
}

export function get1rmTrend(
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

    squat.push({
      cycleName: cycle.name,
      value: bestEstimated1RM(cycleRecords, '深蹲', cycle.oneRM.squat),
    })
    bench.push({
      cycleName: cycle.name,
      value: bestEstimated1RM(cycleRecords, '卧推', cycle.oneRM.bench),
    })
    deadlift.push({
      cycleName: cycle.name,
      value: bestEstimated1RM(cycleRecords, '硬拉', cycle.oneRM.deadlift),
    })
  }

  return { squat, bench, deadlift }
}

function bestEstimated1RM(records: WorkoutRecord[], exerciseName: string, default1RM: number): number {
  let best = default1RM

  for (const record of records) {
    for (const exercise of record.exercises) {
      if (exercise.name !== exerciseName) continue
      for (const set of exercise.sets) {
        const actualReps = set.actualReps
        const actualWeight = set.actualWeight
        if (actualReps == null || actualWeight == null) continue
        if (actualReps <= 0) continue
        const estimated = estimateNew1RM(actualWeight, actualReps)
        if (estimated > best) {
          best = estimated
        }
      }
    }
  }

  return best
}
