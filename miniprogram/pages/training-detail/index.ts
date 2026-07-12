// 训练详情页 — 迁移自 TrainingDetail.vue
// 业务逻辑 1:1 保真：展示训练记录详情（会话头、笔记、主项卡片、辅助项简行、统计）
// Store: cycleStore (getCycleById, getActiveCycle), recordStore (getRecordForDay)
// Service: dateService (formatDateFull, getWeekday), statsService (calculateVolume)
// 主项使用 exercise-card 组件渲染，辅助项按设计稿渲染为简行

import { cycleStore } from '../../stores/cycleStore'
import { recordStore } from '../../stores/recordStore'
import { formatDateFull, getWeekday } from '../../services/dateService'
import { calculateVolume } from '../../services/statsService'
import type { WorkoutRecord, ExerciseRecord, SetRecord } from '../../types/record'
import type { TrainingDay } from '../../types/cycle'

interface AssistanceRowDisplay {
  exKey: string
  name: string
  completedCount: number
}

const FEELING_LABELS = ['', '很差', '较差', '一般', '不错', '很棒']

Page({
  data: {
    hasRecord: false,
    // Session header
    displayDate: '',
    workoutTypeLabel: '',
    weekNum: 0,
    dayNum: 0,
    durationMinutes: 0,
    showBodyWeight: false,
    bodyWeightDisplay: '',
    unit: 'kg',
    feelingStars: '',
    feelingLabel: '',
    // Notes
    showNotes: false,
    notesContent: '',
    // Exercises
    mainExercises: [] as ExerciseRecord[],
    assistanceExercises: [] as AssistanceRowDisplay[],
    // Summary
    totalVolumeValue: 0,
    totalSetsCount: 0,
    avgRestSeconds: 0,
  },

  // ── 实例属性（非 data） ──
  _record: null as WorkoutRecord | null,
  _weekNum: 0,
  _dayNum: 0,
  _cycleId: '',

  onLoad(options: Record<string, string | undefined>) {
    const w = options.week ? Number(options.week) : NaN
    const d = options.day ? Number(options.day) : NaN
    const cId = options.cycleId || ''

    this._weekNum = w
    this._dayNum = d
    this._cycleId = cId

    void this.loadRecord()
  },

  async loadRecord() {
    const cycle = this._cycleId ? cycleStore.getCycleById(this._cycleId) : cycleStore.getActiveCycle()
    if (!cycle) {
      this.setData({ hasRecord: false })
      return
    }

    // 等价 Vue dayData：在 cycle.weeks 中查找 weekNum/dayNum
    let dayData: TrainingDay | null = null
    for (const week of cycle.weeks) {
      if (week.weekNumber === this._weekNum) {
        for (const day of week.days) {
          if (day.dayNumber === this._dayNum) {
            dayData = day
            break
          }
        }
      }
    }

    // 等价 Vue record：recordStore.getRecordForDay（async）
    const record = await recordStore.getRecordForDay(cycle.id, this._weekNum, this._dayNum)

    if (!record || !dayData) {
      this.setData({ hasRecord: false })
      return
    }

    this._record = record
    this.setData({ hasRecord: true })
    this.recomputeAll(record, dayData, cycle.unit)
  },

  recomputeAll(record: WorkoutRecord, dayData: TrainingDay, unit: 'kg' | 'lb') {
    // ── Session header ──
    const displayDate = formatDateFull(record.date) + ' ' + getWeekday(record.date)
    const workoutTypeLabel = dayData.type === 'lower' ? '下肢训练' : '上肢训练'
    // duration 存储为秒，转为分钟展示（等价设计稿 "52分钟"）
    const durationMinutes = Math.floor((record.duration || 0) / 60)
    const showBodyWeight = record.bodyWeight != null
    const bodyWeightDisplay = record.bodyWeight != null ? String(record.bodyWeight) : ''
    const cycleUnit = unit || 'kg'

    // ── Feeling ──
    const f = record.feeling ?? 0
    const feelingStars = '★'.repeat(f) + '☆'.repeat(5 - f)
    const feelingLabel = FEELING_LABELS[record.feeling ?? 0] || ''

    // ── Notes ──
    const showNotes = !!(record.notes && record.notes.length > 0)
    const notesContent = record.notes || ''

    // ── Exercises（等价 Vue mainExercises / assistanceExercises 过滤逻辑） ──
    const mainExercises: ExerciseRecord[] = record.exercises.filter((e: ExerciseRecord) => e.type === 'main')
    const assistanceRaw = record.exercises.filter((e: ExerciseRecord) => e.type === 'assistance' || e.type === 'optional')
    const assistanceExercises: AssistanceRowDisplay[] = assistanceRaw.map((ex: ExerciseRecord, idx: number) => ({
      exKey: ex.exerciseId || `assist-${idx}`,
      name: ex.name,
      completedCount: this.completedSetsCount(ex),
    }))

    // ── Summary ──
    const totalVolumeValue = calculateVolume(record)
    let totalSetsCount = 0
    for (const ex of record.exercises) {
      totalSetsCount += ex.sets.filter((s: SetRecord) => s.isCompleted).length
    }
    const restTimes: number[] = []
    for (const ex of record.exercises) {
      for (const set of ex.sets) {
        if (set.restSeconds != null && set.restSeconds > 0) {
          restTimes.push(set.restSeconds)
        }
      }
    }
    const avgRestSeconds = restTimes.length === 0 ? 0 : Math.round(restTimes.reduce((a, b) => a + b, 0) / restTimes.length)

    this.setData({
      displayDate,
      workoutTypeLabel,
      weekNum: this._weekNum,
      dayNum: this._dayNum,
      durationMinutes,
      showBodyWeight,
      bodyWeightDisplay,
      unit: cycleUnit,
      feelingStars,
      feelingLabel,
      showNotes,
      notesContent,
      mainExercises,
      assistanceExercises,
      totalVolumeValue,
      totalSetsCount,
      avgRestSeconds,
    })
  },

  // ── 辅助方法（等价 Vue 函数） ──
  completedSetsCount(exercise: ExerciseRecord): number {
    return exercise.sets.filter((s) => s.isCompleted).length
  },

  // ── 导航 ──
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 无上一页时回退到日历 tab
        wx.switchTab({ url: '/pages/calendar/index' })
      },
    })
  },

  onUnload() {
    this._record = null
  },
})
