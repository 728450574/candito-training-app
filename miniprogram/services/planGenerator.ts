import { v4 as uuidv4 } from 'uuid'
import type { Cycle, Week, TrainingDay, PlannedExercise } from '../types/cycle'
import type { PlannedSet } from '../types/cycle'
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

function buildAssistanceExercises(config: Cycle['assistanceConfig']): PlannedExercise[] {
  const result: PlannedExercise[] = []
  const add = (name: string, setsCount: number, reps: string) => {
    const sets = Array.from({ length: setsCount }, (_, i) => ({
      setNumber: i + 1,
      targetReps: reps,
    }))
    result.push(assistanceExercise(name, sets))
  }
  add(config.horizontalPull, 3, '8-12')
  add(config.shoulder, 3, '8-12')
  add(config.verticalPull, 3, '8-12')
  if (config.optional1) {
    add(config.optional1, 3, '8-12')
  }
  if (config.optional2) {
    add(config.optional2, 3, '8-12')
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
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(2, pct(oneRM.squat, 80, rounding), '6'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 75, rounding), '6'),
        })
      } else {
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(2, pct(oneRM.squat, 75, rounding), '8'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 70, rounding), '8'),
        })
      }
    } else {
      if (i === 1 || i === 2) {
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.bench, 45, rounding), '10'),
            mainSet(2, pct(oneRM.bench, 60, rounding), '10'),
            mainSet(3, pct(oneRM.bench, 67.5, rounding), '8'),
            mainSet(4, pct(oneRM.bench, 70, rounding), '6'),
          ],
        })
        exercises.push(...buildAssistanceExercises(assistance))
      } else {
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.bench, 75, rounding), 'MR')],
        })
        exercises.push(...buildAssistanceExercises(assistance))
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
        // Day 1: 深蹲 MR10 (80%) + 硬拉变式
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
        // Day 3: 深蹲 MR10 (82.5%) + 硬拉变式
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
        // Day 5: 卧推 MR
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.bench, 75, rounding), 'MR')],
        })
        exercises.push(...buildAssistanceExercises(assistance))
      } else {
        const benchWeight = i === 1 ? pct(oneRM.bench, 72.5, rounding) : pct(oneRM.bench, 70, rounding)
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: mainSets(3, benchWeight, '8'),
        })
        exercises.push(...buildAssistanceExercises(assistance))
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
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.squat, 87.5, rounding), '3'),
            mainSet(2, pct(oneRM.squat, 90, rounding), '3'),
          ],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 82.5, rounding), '3'),
        })
      } else {
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: mainSets(2, pct(oneRM.squat, 85, rounding), '3'),
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: mainSets(2, pct(oneRM.deadlift, 80, rounding), '3'),
        })
      }
    } else {
      const benchWeight1 = pct(oneRM.bench, 77.5, rounding)
      const benchWeight2 = pct(oneRM.bench, 80, rounding)
      if (i === 1) {
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [
            mainSet(1, benchWeight1, '4'),
            mainSet(2, benchWeight2, '4'),
          ],
        })
      } else {
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: mainSets(3, pct(oneRM.bench, 75, rounding), '4'),
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
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.squat, 85, rounding), '3'),
            mainSet(2, pct(oneRM.squat, 90, rounding), '3'),
            mainSet(3, pct(oneRM.squat, 92.5, rounding), '3'),
          ],
        })
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.deadlift, 87.5, rounding), '3'),
            mainSet(2, pct(oneRM.deadlift, 90, rounding), '3'),
          ],
        })
      } else {
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
          sets: mainSets(2, pct(oneRM.deadlift, 85, rounding), '3'),
        })
      }
    } else {
      if (i === 1) {
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: [
            mainSet(1, pct(oneRM.bench, 80, rounding), '3'),
            mainSet(2, pct(oneRM.bench, 85, rounding), '3'),
            mainSet(3, pct(oneRM.bench, 87.5, rounding), '3'),
          ],
        })
      } else {
        exercises.push({
          id: uuidv4(),
          name: '卧推',
          type: 'main',
          sets: mainSets(2, pct(oneRM.bench, 82.5, rounding), '3'),
        })
      }
      exercises.push(...buildAssistanceExercises(assistance))
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
        exercises.push({
          id: uuidv4(),
          name: '深蹲',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.squat, 97.5, rounding), '1-4')],
        })
      } else {
        exercises.push({
          id: uuidv4(),
          name: '硬拉',
          type: 'main',
          sets: [amrapSet(1, pct(oneRM.deadlift, 92.5, rounding), '1-4')],
        })
      }
    } else {
      exercises.push({
        id: uuidv4(),
        name: '卧推',
        type: 'main',
        sets: [amrapSet(1, pct(oneRM.bench, 87.5, rounding), '1-4')],
      })
      exercises.push(...buildAssistanceExercises(assistance))
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
  }
}
