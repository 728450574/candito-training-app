import { v4 as uuidv4 } from 'uuid'
import type { Cycle, Week, TrainingDay, PlannedExercise } from '@/types/cycle'
import type { PlannedSet } from '@/types/cycle'
import { addDays } from './dateService'

export interface CreateCycleInput {
  oneRM: { squat: number; bench: number; deadlift: number }
  unit: 'kg' | 'lb'
  weightRounding: number
  startDate: string
  assistanceConfig: Cycle['assistanceConfig']
}

type OneRM = CreateCycleInput['oneRM']

interface WeekTemplate {
  weekNumber: number
  theme: string
  dayOffsets: number[]
  dayTypes: Array<'lower' | 'upper'>
  dayBuilder: (oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string) => TrainingDay[]
}

function roundWeight(weight: number, rounding: number): number {
  return Math.round(weight / rounding) * rounding
}

function pct(value: number, percent: number, rounding: number): number {
  return roundWeight(value * percent / 100, rounding)
}

function mainSet(setNumber: number, weight: number, reps: string, isAMRAP = false): PlannedSet {
  return { setNumber, targetWeight: weight, targetReps: reps, isAMRAP }
}

function mainSets(count: number, weight: number | undefined, reps: string, startFrom = 1): PlannedSet[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: startFrom + i,
    targetWeight: weight,
    targetReps: reps,
  }))
}

function amrapSet(setNumber: number, weight: number, reps: string): PlannedSet {
  return { setNumber, targetWeight: weight, targetReps: reps, isAMRAP: true }
}

function assistanceExercise(name: string, sets: PlannedSet[]): PlannedExercise {
  return {
    id: uuidv4(),
    name,
    type: 'assistance',
    sets,
  }
}

function buildAssistanceExercises(
  config: Cycle['assistanceConfig'],
  setsCount = 3,
  repsList: string[] = ['8-12', '8-12', '8-12']
): PlannedExercise[] {
  const result: PlannedExercise[] = []
  const add = (name: string) => {
    const sets = Array.from({ length: setsCount }, (_, i) => ({
      setNumber: i + 1,
      targetReps: repsList[i] ?? repsList[repsList.length - 1],
    }))
    result.push(assistanceExercise(name, sets))
  }
  add(config.horizontalPull)
  add(config.shoulder)
  add(config.verticalPull)
  if (config.optional1) {
    add(config.optional1)
  }
  if (config.optional2) {
    add(config.optional2)
  }
  return result
}

// ---------- Week 1: 肌肉调理 ----------

function buildWeek1Days(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 1, 3, 4, 5]
  const types: Array<'lower' | 'upper'> = ['lower', 'upper', 'upper', 'lower', 'upper']

  return offsets.map((offset, i) => {
    const date = addDays(startDate, offset)
    const dayType = types[i]
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (dayType === 'lower') {
      if (i === 0) {
        // W1D1: 深蹲4组 80%×6 + 硬拉2组 75%×6 + 辅助4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(4, pct(oneRM.squat, 80, rounding), '6'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 75, rounding), '6'),
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      } else {
        // W1D4: 深蹲4组 75%×8 + 硬拉2组 70%×8 + 辅助4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(4, pct(oneRM.squat, 75, rounding), '8'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 70, rounding), '8'),
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      }
    } else {
      if (i === 1 || i === 2) {
        // W1D2, W1D3: 卧推 50%/67.5%/75%/77.5% + 辅助 3组8-12
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.bench, 50, rounding), '10'),
            mainSet(2, pct(oneRM.bench, 67.5, rounding), '10'),
            mainSet(3, pct(oneRM.bench, 75, rounding), '8'),
            mainSet(4, pct(oneRM.bench, 77.5, rounding), '6'),
          ],
        })
        exercises.push(...buildAssistanceExercises(assistance))
      } else {
        // W1D5: 卧推 AMRAP 80% MR + 辅助4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.bench, 80, rounding), 'MR')],
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      }
    }

    return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

// ---------- Week 2: 肌肉调理/增肌 ----------

function buildWeek2Days(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 1, 3, 4, 6]
  const types: Array<'lower' | 'upper'> = ['lower', 'upper', 'lower', 'upper', 'upper']

  return offsets.map((offset, i) => {
    const date = addDays(startDate, offset)
    const dayType = types[i]
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (dayType === 'lower') {
      if (i === 0) {
        // W2D1: 深蹲 MR10 80% + 硬拉变式 3组 70%×8
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.squat, 80, rounding), 'MR10')],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉变式',
          type: 'main',
          sets: mainSets(3, pct(oneRM.deadlift, 70, rounding), '8'),
        })
      } else {
        // W2D3: 深蹲 MR10 82.5% + 硬拉变式 3组 70%×8
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.squat, 82.5, rounding), 'MR10')],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉变式',
          type: 'main',
          sets: mainSets(3, pct(oneRM.deadlift, 70, rounding), '8'),
        })
      }
      // 可选项目
      if (assistance.optional1) {
        exercises.push(assistanceExercise(assistance.optional1, mainSets(3, undefined, '8-12')))
      }
      if (assistance.optional2) {
        exercises.push(assistanceExercise(assistance.optional2, mainSets(3, undefined, '8-12')))
      }
    } else {
      if (i === 4) {
        // W2D5: 卧推 AMRAP 80% MR + 辅助4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.bench, 80, rounding), 'MR')],
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      } else {
        // W2D2, W2D4: 卧推 72.5%/77.5%/82.5% reps 10/8/6-8 + 辅助 3组 [10,8,8]
        const benchPcts = [72.5, 77.5, 82.5]
        const benchReps = ['10', '8', '6-8']
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: benchPcts.map((pctVal, idx) => ({
            setNumber: idx + 1,
            targetWeight: pct(oneRM.bench, pctVal, rounding),
            targetReps: benchReps[idx],
          })),
        })
        exercises.push(...buildAssistanceExercises(assistance, 3, ['10', '8', '8']))
      }
    }

    return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

// ---------- Week 3: 线性最大超负荷 ----------

function buildWeek3Days(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 2, 4, 5]
  const types: Array<'lower' | 'upper'> = ['lower', 'upper', 'lower', 'upper']

  return offsets.map((offset, i) => {
    const date = addDays(startDate, offset)
    const dayType = types[i]
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (dayType === 'lower') {
      if (i === 0) {
        // W3D1: 深蹲 2组 87.5%×3 + 硬拉 3组 87.5%×3
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(2, pct(oneRM.squat, 87.5, rounding), '3'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(3, pct(oneRM.deadlift, 87.5, rounding), '3'),
        })
      } else {
        // W3D3: 深蹲 1组 90% 4-6个 + 硬拉 1组 90% 8个
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [mainSet(1, pct(oneRM.squat, 90, rounding), '4-6')],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [mainSet(1, pct(oneRM.deadlift, 90, rounding), '8')],
        })
      }
    } else {
      if (i === 1) {
        // W3D2: 卧推 3组 85% 4-6个
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: mainSets(3, pct(oneRM.bench, 85, rounding), '4-6'),
        })
      } else {
        // W3D4: 卧推 3组 87.5% 4-6个
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: mainSets(3, pct(oneRM.bench, 87.5, rounding), '4-6'),
        })
      }
      exercises.push(...buildAssistanceExercises(assistance))
    }

    return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

// ---------- Week 4: 适应大重量 ----------

function buildWeek4Days(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 1, 3, 4]
  const types: Array<'lower' | 'upper'> = ['lower', 'upper', 'lower', 'upper']

  return offsets.map((offset, i) => {
    const date = addDays(startDate, offset)
    const dayType = types[i]
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (dayType === 'lower') {
      if (i === 0) {
        // W4D1: 深蹲 87.5%/90%/92.5% 3组3个 + 硬拉 2组6个 (87.5%/90%)
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.squat, 87.5, rounding), '3'),
            mainSet(2, pct(oneRM.squat, 90, rounding), '3'),
            mainSet(3, pct(oneRM.squat, 92.5, rounding), '3'),
          ],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.deadlift, 87.5, rounding), '6'),
            mainSet(2, pct(oneRM.deadlift, 90, rounding), '6'),
          ],
        })
      } else {
        // W4D3: 深蹲 92.5%×3个 + 95%×1-2个, 硬拉 92.5%×3个 + 95%×1-2个
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.squat, 92.5, rounding), '3'),
            mainSet(2, pct(oneRM.squat, 95, rounding), '1-2'),
          ],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.deadlift, 92.5, rounding), '3'),
            mainSet(2, pct(oneRM.deadlift, 95, rounding), '1-2'),
          ],
        })
      }
    } else {
      if (i === 1) {
        // W4D2: 卧推 82.5%/85%/90% 三组三个 + 辅助 4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.bench, 82.5, rounding), '3'),
            mainSet(2, pct(oneRM.bench, 85, rounding), '3'),
            mainSet(3, pct(oneRM.bench, 90, rounding), '3'),
          ],
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      } else {
        // W4D4: 卧推 87.5%×3个 + 90%×2-4个 + 95%×1-2个 + 辅助 4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.bench, 87.5, rounding), '3'),
            mainSet(2, pct(oneRM.bench, 90, rounding), '2-4'),
            mainSet(3, pct(oneRM.bench, 95, rounding), '1-2'),
          ],
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      }
    }

    return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

// ---------- Week 5: 高强度力量训练 ----------

function buildWeek5Days(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 2, 4]
  const types: Array<'lower' | 'upper'> = ['lower', 'upper', 'lower']

  return offsets.map((offset, i) => {
    const date = addDays(startDate, offset)
    const dayType = types[i]
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (dayType === 'lower') {
      if (i === 0) {
        // W5D1: 深蹲 AMRAP 97.5% 1-4 + 硬拉 67.5%×4 / 70%×4 / 72.5%×2
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.squat, 97.5, rounding), '1-4')],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.deadlift, 67.5, rounding), '4'),
            mainSet(2, pct(oneRM.deadlift, 70, rounding), '4'),
            mainSet(3, pct(oneRM.deadlift, 72.5, rounding), '2'),
          ],
        })
      } else {
        // W5D3: 硬拉 AMRAP 97.5% 1-4
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.deadlift, 97.5, rounding), '1-4')],
        })
      }
    } else {
      // W5D2: 卧推 AMRAP 97.5% 1-4 + 辅助 3组 [8,6,6]
      exercises.push({
        id: uuidv4(),
        name: '卧推',
        type: 'main',
        sets: [amrapSet(1, pct(oneRM.bench, 97.5, rounding), '1-4')],
      })
      exercises.push(...buildAssistanceExercises(assistance, 3, ['8', '6', '6']))
    }

    return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

// ---------- Week 6: 测试/减载/跳过 ----------

function buildWeek6Days(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 2, 4]
  const date = (offset: number) => addDays(startDate, offset)

  return [
    {
      dayNumber: 1,
      dayOffset: 0,
      type: 'lower',
      originalDate: date(0),
      scheduledDate: date(0),
      exercises: [
        {
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.squat, 85, rounding), '3-5')],
          notes: '第6周 — 根据选择进行调整：测试1RM / 减载 / 跳过',
        },
      ],
      status: 'pending',
    },
    {
      dayNumber: 2,
      dayOffset: 2,
      type: 'upper',
      originalDate: date(2),
      scheduledDate: date(2),
      exercises: [
        {
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.bench, 85, rounding), '3-5')],
          notes: '第6周 — 根据选择进行调整：测试1RM / 减载 / 跳过',
        },
      ],
      status: 'pending',
    },
    {
      dayNumber: 3,
      dayOffset: 4,
      type: 'lower',
      originalDate: date(4),
      scheduledDate: date(4),
      exercises: [
        {
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.deadlift, 85, rounding), '3-5')],
          notes: '第6周 — 根据选择进行调整：测试1RM / 减载 / 跳过',
        },
      ],
      status: 'pending',
    },
  ]
}

// ---------- 减载周 (重做第一周, 去掉最后一个上肢日) ----------

export function buildDeloadWeek(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  // Week 1 的 D1~D4, 去掉 D5 (最后一个上肢日)
  const offsets = [0, 1, 3, 4]
  const types: Array<'lower' | 'upper'> = ['lower', 'upper', 'upper', 'lower']

  return offsets.map((offset, i) => {
    const date = addDays(startDate, offset)
    const dayType = types[i]
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (dayType === 'lower') {
      if (i === 0) {
        // D1: 深蹲4组 80%×6 + 硬拉2组 75%×6 + 辅助4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(4, pct(oneRM.squat, 80, rounding), '6'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 75, rounding), '6'),
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      } else {
        // D4: 深蹲4组 75%×8 + 硬拉2组 70%×8 + 辅助4组 [12,12,10,8]
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(4, pct(oneRM.squat, 75, rounding), '8'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 70, rounding), '8'),
        })
        exercises.push(...buildAssistanceExercises(assistance, 4, ['12', '12', '10', '8']))
      }
    } else {
      // D2, D3: 卧推 50%/67.5%/75%/77.5% + 辅助 3组8-12
      exercises.push({
        id: uuidv4(),
        name: '卧推',
        type: 'main',
        sets: [
          mainSet(1, pct(oneRM.bench, 50, rounding), '10'),
          mainSet(2, pct(oneRM.bench, 67.5, rounding), '10'),
          mainSet(3, pct(oneRM.bench, 75, rounding), '8'),
          mainSet(4, pct(oneRM.bench, 77.5, rounding), '6'),
        ],
      })
      exercises.push(...buildAssistanceExercises(assistance))
    }

    return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

// ---------- 第6周 1RM 测试 ----------

export function buildWeek6TestDays(oneRM: OneRM, rounding: number, _assistance: Cycle['assistanceConfig'], startDate: string): TrainingDay[] {
  const offsets = [0, 2, 4]
  const types: Array<'lower' | 'upper' | 'lower'> = ['lower', 'upper', 'lower']

  return types.map((type, i) => {
    const date = addDays(startDate, offsets[i])
    const dayNumber = i + 1
    const exercises: PlannedExercise[] = []

    if (type === 'lower') {
      if (i === 0) {
        // Day 1: 深蹲测试 + 硬拉辅助
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.squat, 60, rounding), '5'),
            mainSet(2, pct(oneRM.squat, 75, rounding), '3'),
            mainSet(3, pct(oneRM.squat, 85, rounding), '2'),
            amrapSet(4, pct(oneRM.squat, 92.5, rounding), '1+'),
          ],
          notes: '测试极限重量和次数，记录结果用于计算新1RM',
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.deadlift, 85, rounding), '3-5')],
        })
      } else {
        // Day 3: 硬拉测试 + 深蹲辅助
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.deadlift, 60, rounding), '5'),
            mainSet(2, pct(oneRM.deadlift, 75, rounding), '3'),
            mainSet(3, pct(oneRM.deadlift, 85, rounding), '2'),
            amrapSet(4, pct(oneRM.deadlift, 92.5, rounding), '1+'),
          ],
          notes: '测试极限重量和次数，记录结果用于计算新1RM',
        })
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.squat, 85, rounding), '3-5')],
        })
      }
    } else {
      // Day 2: 卧推测试
      exercises.push({
        id: uuidv4(),
        name: '卧推',
        type: 'main',
        sets: [
          mainSet(1, pct(oneRM.bench, 60, rounding), '5'),
          mainSet(2, pct(oneRM.bench, 75, rounding), '3'),
          mainSet(3, pct(oneRM.bench, 85, rounding), '2'),
          amrapSet(4, pct(oneRM.bench, 92.5, rounding), '1+'),
        ],
        notes: '测试极限重量和次数，记录结果用于计算新1RM',
      })
    }

    return { dayNumber, dayOffset: offsets[i], type, originalDate: date, scheduledDate: date, exercises, status: 'pending' }
  })
}

const WEEK_BUILDERS: Array<(oneRM: OneRM, rounding: number, assistance: Cycle['assistanceConfig'], startDate: string) => TrainingDay[]> = [
  buildWeek1Days,
  buildWeek2Days,
  buildWeek3Days,
  buildWeek4Days,
  buildWeek5Days,
  buildWeek6Days,
]

const WEEK_THEMES = [
  '肌肉调理',
  '肌肉调理/增肌',
  '线性最大超负荷',
  '适应大重量',
  '高强度力量训练',
  '测试/减载/跳过',
]

const WEEK_OFFSETS = [
  0,  // week 1 starts at startDate
  7,  // week 2 starts at startDate + 7
  14, // week 3 starts at startDate + 14
  21, // week 4 starts at startDate + 21
  28, // week 5 starts at startDate + 28
  35, // week 6 starts at startDate + 35
]

export function buildWeeks(oneRM: CreateCycleInput['oneRM'], weightRounding: number, assistanceConfig: CreateCycleInput['assistanceConfig'], startDate: string): Week[] {
  return WEEK_BUILDERS.map((builder, index) => {
    const weekNumber = index + 1
    const weekStartDate = addDays(startDate, WEEK_OFFSETS[index])
    const days = builder(oneRM, weightRounding, assistanceConfig, weekStartDate)
    return {
      weekNumber,
      theme: WEEK_THEMES[index],
      days,
    }
  })
}

export function createCycle(input: CreateCycleInput) {
  const id = uuidv4()
  const now = new Date()
  const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}Z`

  const weeks = buildWeeks(input.oneRM, input.weightRounding, input.assistanceConfig, input.startDate)

  const startLocal = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const name = `周期 ${startLocal}`

  return {
    id,
    name,
    startDate: input.startDate,
    status: 'active' as const,
    oneRM: { ...input.oneRM },
    unit: input.unit,
    weightRounding: input.weightRounding,
    assistanceConfig: { ...input.assistanceConfig },
    weeks,
    pauseHistory: [] as [],
    restartBranches: [] as [],
    batchProcessHistory: [] as [],
    isPaused: false as const,
    createdAt,
    updatedAt: createdAt,
  }
}
