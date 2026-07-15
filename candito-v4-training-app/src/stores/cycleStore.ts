import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import type { Cycle, CycleStatus, TrainingDay } from '@/types/cycle'
import type { WorkoutRecord, ExerciseRecord } from '@/types/record'
import { getProvider } from '@/services/storage'
import { getToday } from '@/services/dateService'
import { buildDeloadWeek, buildWeek6TestDays } from '@/services/planGenerator'
import { useRecordStore } from './recordStore'

/**
 * 训练完成的输入参数。
 * 类比 Java：Service 方法的 DTO 入参，由 Controller（视图）组装后传入。
 */
export interface FinishWorkoutInput {
  /** 所属训练周期 ID */
  cycleId: string
  /** 周序号（1-6） */
  weekNumber: number
  /** 训练日序号 */
  dayNumber: number
  /** 本次训练的动作记录列表 */
  exercises: ExerciseRecord[]
  /** 训练开始时间（ISO 8601） */
  startTime: string
  /** 训练结束时间（ISO 8601） */
  endTime: string
  /** 训练总时长（秒） */
  durationSeconds: number
  /** 第2周 MR10 完成的总次数（非 MR10 训练日则为 undefined） */
  mr10TotalReps?: number
}

/**
 * 训练完成的返回结果。
 * 类比 Java：Service 方法的返回值，视图根据此结果决定页面跳转。
 */
export interface FinishWorkoutResult {
  /** 周期状态是否发生了变更（如触发了 week6_pending 或 completed） */
  cycleStatusChanged: boolean
  /** 变更后的周期状态 */
  newCycleStatus: CycleStatus
  /** 是否触发了第5周全部完成（UI 应跳转到第6周决策页） */
  week5AllCompleted: boolean
  /** 是否触发了第6周全部完成（UI 应跳转到新周期创建页） */
  week6AllCompleted: boolean
  /** 周期完成时的预估1RM（用于新周期创建的推荐值） */
  estimated1RM?: { squat: number; bench: number; deadlift: number }
}

export const useCycleStore = defineStore('cycle', () => {
  const cycles = ref<Cycle[]>([])
  const activeCycleId = ref<string | null>(null)

  const activeCycle = computed(() => {
    const cycle = cycles.value.find((c: Cycle) => c.id === activeCycleId.value)
    if (!cycle) return null
    if (cycle.status === 'terminated' || cycle.status === 'completed') return null
    return cycle
  })

  const hasActiveCycle = computed(() => activeCycle.value !== null)

  async function load(): Promise<void> {
    const provider = getProvider()
    cycles.value = await provider.loadCycles()
    activeCycleId.value = await provider.loadActiveCycleId()
    if (!activeCycleId.value) {
      const firstActive = cycles.value.find(
        (c: Cycle) => c.status !== 'terminated' && c.status !== 'completed',
      )
      if (firstActive) {
        activeCycleId.value = firstActive.id
      }
    }
  }

  function save(): void {
    const provider = getProvider()
    provider.saveCycles(cycles.value)
    provider.saveActiveCycleId(activeCycleId.value)
  }

  function addCycle(cycle: Cycle): void {
    cycles.value.push(cycle)
    activeCycleId.value = cycle.id
    save()
  }

  function updateCycle(id: string, updates: Partial<Cycle>): void {
    const index = cycles.value.findIndex((c: Cycle) => c.id === id)
    if (index !== -1) {
      cycles.value[index] = { ...cycles.value[index], ...updates, updatedAt: new Date().toISOString() }
      save()
    }
  }

  function deleteCycle(id: string): void {
    cycles.value = cycles.value.filter((c: Cycle) => c.id !== id)
    if (activeCycleId.value === id) {
      activeCycleId.value = null
    }
    save()
  }

  function setActiveCycle(id: string): void {
    activeCycleId.value = id || null
    save()
  }

  function getCycleById(id: string): Cycle | undefined {
    return cycles.value.find((c: Cycle) => c.id === id)
  }

  function getCompletedCycles(): Cycle[] {
    return cycles.value.filter((c: Cycle) => c.status === 'completed' || c.status === 'terminated')
  }

  /**
   * 完成一次训练。
   *
   * 编排以下业务步骤（类比 Java Service 中的事务方法）：
   * 1. 创建 WorkoutRecord 并持久化
   * 2. 更新 Cycle 中对应 TrainingDay 的状态为 completed
   * 3. 检测是否触发第5周/第6周边界（状态机转换）
   *
   * @param input - 训练完成所需的数据，由视图层组装传入
   * @returns 完成结果，包含状态变更和导航提示
   */
  function finishWorkout(input: FinishWorkoutInput): FinishWorkoutResult {
    const recordStore = useRecordStore()
    const cycle = cycles.value.find((c: Cycle) => c.id === input.cycleId)
    if (!cycle) {
      throw new Error(`训练周期 ${input.cycleId} 不存在`)
    }

    // 从 Cycle 计划中查找当天训练日的原始日期和排程日期
    let originalDate = ''
    let scheduledDate = ''
    for (const week of cycle.weeks) {
      if (week.weekNumber !== input.weekNumber) continue
      for (const day of week.days) {
        if (day.dayNumber !== input.dayNumber) continue
        originalDate = day.originalDate
        scheduledDate = day.scheduledDate
        break
      }
      break
    }

    const todayStr = getToday()

    // --- 步骤1: 创建训练记录 ---
    const record: WorkoutRecord = {
      id: uuid(),
      cycleId: input.cycleId,
      weekNumber: input.weekNumber,
      dayNumber: input.dayNumber,
      date: todayStr,
      originalDate,
      scheduledDate,
      isRescheduled: originalDate !== scheduledDate,
      startTime: input.startTime,
      endTime: input.endTime,
      duration: input.durationSeconds,
      exercises: input.exercises,
      notes: '',
      feeling: 3,
      status: 'completed',
      mr10TotalReps: input.mr10TotalReps,
    }
    recordStore.addRecord(record)

    // --- 步骤2: 更新训练日状态 ---
    const updatedWeeks = cycle.weeks.map((week) => {
      if (week.weekNumber !== input.weekNumber) return week
      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== input.dayNumber) return day
          return { ...day, status: 'completed' as const, completedDate: todayStr }
        }),
      }
    })

    // --- 步骤3: 周期状态机边界检测 ---
    const updates: Partial<Cycle> = { weeks: updatedWeeks }
    const result: FinishWorkoutResult = {
      cycleStatusChanged: false,
      newCycleStatus: cycle.status,
      week5AllCompleted: false,
      week6AllCompleted: false,
    }

    // 第5周完成检测：所有非休息日均完成 → 状态变更为 week6_pending
    if (input.weekNumber === 5) {
      const week5 = updatedWeeks.find((w) => w.weekNumber === 5)
      const week5Done = week5
        && week5.days
          .filter((d: TrainingDay) => d.type !== 'rest')
          .every((d: TrainingDay) => d.status === 'completed')
      if (week5Done) {
        updates.status = 'week6_pending'
        result.cycleStatusChanged = true
        result.newCycleStatus = 'week6_pending'
        result.week5AllCompleted = true
      }
    }

    // 第6周完成检测：所有非休息日均完成 → 周期结束
    if (input.weekNumber === 6) {
      const week6 = updatedWeeks.find((w) => w.weekNumber === 6)
      const week6Done = week6
        && week6.days
          .filter((d: TrainingDay) => d.type !== 'rest')
          .every((d: TrainingDay) => d.status === 'completed')
      if (week6Done) {
        updates.status = 'completed'
        updates.completedAt = todayStr
        result.cycleStatusChanged = true
        result.newCycleStatus = 'completed'
        result.week6AllCompleted = true
        result.estimated1RM = cycle.estimated1RM
      }
    }

    // --- 步骤4: 持久化 Cycle 更新 ---
    const index = cycles.value.findIndex((c: Cycle) => c.id === input.cycleId)
    if (index !== -1) {
      cycles.value[index] = { ...cycles.value[index], ...updates, updatedAt: new Date().toISOString() }
    }
    save()

    return result
  }

  /**
   * 跳过一个训练日。
   * 封装 weeks 内部结构，视图层无需直接操作 weeks 数组。
   *
   * @param cycleId - 目标周期 ID
   * @param weekNumber - 周序号
   * @param dayNumber - 训练日序号
   */
  function skipDay(cycleId: string, weekNumber: number, dayNumber: number): void {
    const index = cycles.value.findIndex((c: Cycle) => c.id === cycleId)
    if (index === -1) return
    const cycle = cycles.value[index]
    const updatedWeeks = cycle.weeks.map((week) => {
      if (week.weekNumber !== weekNumber) return week
      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== dayNumber) return day
          return { ...day, status: 'skipped' as const }
        }),
      }
    })
    cycles.value[index] = { ...cycle, weeks: updatedWeeks, updatedAt: new Date().toISOString() }
    save()
  }

  /**
   * 应用第6周决策。
   *
   * 三个决策分支：
   * - new_cycle: 保存预估1RM，标记周期完成
   * - deload: 将第6周替换为减载周（重做第1周D1-D4）
   * - test_1rm: 将第6周替换为1RM实测计划
   *
   * @param cycleId - 目标周期 ID
   * @param decision - 用户选择的决策类型
   * @param estimated1RM - 基于第5周成绩预估的三大项1RM
   * @param today - 当前日期 "YYYY-MM-DD"
   */
  function applyWeek6Decision(
    cycleId: string,
    decision: 'new_cycle' | 'deload' | 'test_1rm',
    estimated1RM: { squat: number; bench: number; deadlift: number },
    today: string,
  ): void {
    const index = cycles.value.findIndex((c: Cycle) => c.id === cycleId)
    if (index === -1) return
    const cycle = cycles.value[index]

    if (decision === 'new_cycle') {
      cycles.value[index] = {
        ...cycle,
        week6Decision: 'new_cycle',
        estimated1RM,
        status: 'completed',
        completedAt: today,
        updatedAt: new Date().toISOString(),
      }
    } else if (decision === 'deload') {
      const deloadDays = buildDeloadWeek(cycle.oneRM, cycle.weightRounding, cycle.assistanceConfig, today)
      const updatedWeeks = cycle.weeks.map((w) => {
        if (w.weekNumber === 6) return { ...w, theme: '减载周', days: deloadDays }
        return w
      })
      cycles.value[index] = {
        ...cycle,
        week6Decision: 'deload',
        estimated1RM,
        weeks: updatedWeeks,
        status: 'active',
        updatedAt: new Date().toISOString(),
      }
    } else {
      const testDays = buildWeek6TestDays(cycle.oneRM, cycle.weightRounding, cycle.assistanceConfig, today)
      const updatedWeeks = cycle.weeks.map((w) => {
        if (w.weekNumber === 6) return { ...w, theme: '实测1RM', days: testDays }
        return w
      })
      cycles.value[index] = {
        ...cycle,
        week6Decision: 'test_1rm',
        weeks: updatedWeeks,
        status: 'active',
        updatedAt: new Date().toISOString(),
      }
    }
    save()
  }

  return {
    cycles,
    activeCycleId,
    activeCycle,
    hasActiveCycle,
    load,
    save,
    addCycle,
    updateCycle,
    deleteCycle,
    setActiveCycle,
    getCycleById,
    getCompletedCycles,
    finishWorkout,
    skipDay,
    applyWeek6Decision,
  }
})
