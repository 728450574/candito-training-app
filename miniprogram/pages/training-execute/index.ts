// 训练执行页 — 迁移自 TrainingExecution.vue
// 最复杂页面：计时器（elapsed + rest）、逐组记录、MR10 动态调整、草稿保存/恢复
// Store: cycleStore, recordStore, settingsStore
// Service: dateService (getToday)
// 计时器：Page 级 setInterval，onHide/onUnload 时清除

import { cycleStore } from '../../stores/cycleStore'
import { recordStore } from '../../stores/recordStore'
import { settingsStore } from '../../stores/settingsStore'
import { getToday } from '../../services/dateService'
import { v4 as uuid } from 'uuid'
import type { TrainingDay, PlannedExercise } from '../../types/cycle'
import type { ExerciseRecord, WorkoutRecord } from '../../types/record'

const DRAFT_PREFIX = 'candito_draft_'

interface MutableSet {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  isAMRAP?: boolean
  actualWeight: number
  actualReps: number
  isCompleted: boolean
  isSkipped: boolean
  restSeconds?: number
}

interface MutableExercise {
  id: string
  name: string
  type: 'main' | 'assistance' | 'optional'
  sets: MutableSet[]
}

interface SetDisplay {
  displayNumber: number
  isCompleted: boolean
  isCurrent: boolean
  displayWeight: string
  displayReps: string
  rowStyle: string
  circleStyle: string
  circleText: string
  circleTextStyle: string
  showCheck: boolean
  labelStyle: string
  valueStyle: string
}

interface RepOptionDisplay {
  value: number
  isSelected: boolean
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function roundWeight(value: number): number {
  const rounding = 2.5
  return Math.round(value / rounding) * rounding
}

Page({
  data: {
    loading: true,
    errorMsg: '',
    // Timer
    elapsedFormatted: '00:00',
    restFormatted: '--:--',
    isResting: false,
    restProgressDeg: 0,
    // Current exercise display
    pageTitle: '',
    currentExerciseName: '',
    currentExerciseTypeLabel: '',
    currentExerciseBadgeStyle: '',
    currentSetDisplayIndex: 0,
    currentExerciseTotalSets: 0,
    showTarget: false,
    targetWeightDisplay: '--',
    targetRepsDisplay: '--',
    inputWeightStr: '0',
    repOptionsDisplay: [] as RepOptionDisplay[],
    setsDisplay: [] as SetDisplay[],
    // MR10
    showMR10Notice: false,
    mr10MainText: '',
    mr10HintText: '',
    showMr10Hint: false,
    // Next exercise
    nextExerciseName: '',
    nextExerciseTypeLabel: '',
    nextExerciseBadgeStyle: '',
    nextExerciseTargetRepsDisplay: '',
    // Completion
    allExercisesDone: false,
  },

  // ── 实例属性（非 data，不参与渲染） ──
  _exercises: [] as MutableExercise[],
  _currentExerciseIndex: 0,
  _currentSetIndex: 0,
  _inputWeight: 0,
  _inputReps: 0,
  _startTime: '',
  _weekNum: 0,
  _dayNum: 0,
  _cycleId: '',
  _dayData: null as TrainingDay | null,
  _mr10TotalReps: 0,
  _mr10Calculated: false,
  _mr10LoadingWeight: 0,
  _draftKey: '',
  _elapsedInterval: null as ReturnType<typeof setInterval> | null,
  _restInterval: null as ReturnType<typeof setInterval> | null,
  _saveInterval: null as ReturnType<typeof setInterval> | null,
  _elapsedSeconds: 0,
  _restSeconds: 0,
  _isRunning: false,
  _isResting: false,
  _defaultRestSeconds: 90,
  _restTotal: 0,
  _touchStartX: 0,
  _touchStartY: 0,

  onLoad(options: Record<string, string | undefined>) {
    const weekNum = options.week ? Number(options.week) : NaN
    const dayNum = options.day ? Number(options.day) : NaN
    const cycleId = options.cycleId || ''

    if (isNaN(weekNum) || isNaN(dayNum)) {
      this.setData({ errorMsg: '无效的训练参数', loading: false })
      return
    }

    this._weekNum = weekNum
    this._dayNum = dayNum
    this._cycleId = cycleId

    const cycle = cycleId ? cycleStore.getCycleById(cycleId) : cycleStore.getActiveCycle()
    if (!cycle) {
      this.setData({ errorMsg: '未找到训练周期', loading: false })
      return
    }

    // 查找 dayData
    let dayData: TrainingDay | null = null
    for (const week of cycle.weeks) {
      if (week.weekNumber === weekNum) {
        for (const day of week.days) {
          if (day.dayNumber === dayNum) {
            dayData = day
            break
          }
        }
      }
    }
    if (!dayData) {
      this.setData({ errorMsg: '未找到该训练日', loading: false })
      return
    }

    this._dayData = dayData
    this._defaultRestSeconds = settingsStore.getSettings().defaultRestSeconds

    // 设置 pageTitle
    const typeLabelMap: Record<string, string> = { lower: '下肢训练', upper: '上肢训练' }
    const typeName = typeLabelMap[dayData.type] || '训练'
    const pageTitle = `${typeName} · W${weekNum}D${dayNum}`

    // 设置 draftKey
    this._draftKey = `${DRAFT_PREFIX}${cycle.id}_${weekNum}_${dayNum}`

    // 尝试恢复草稿
    const restored = this.loadDraft()
    if (restored) {
      this._startTime = this._startTime || new Date().toISOString()
      this.startTimer()
      this.initInputsForCurrentSet()
      this.setData({ loading: false, pageTitle })
      this.recomputeDisplay()
      // 定期自动保存
      this._saveInterval = setInterval(() => this.saveDraft(), 5000)
      return
    }

    // 构建可变动作列表
    this._exercises = dayData.exercises.map((ex: PlannedExercise) => ({
      id: ex.id,
      name: ex.name,
      type: ex.type,
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        targetWeight: s.targetWeight,
        targetReps: s.targetReps,
        isAMRAP: s.isAMRAP,
        actualWeight: s.targetWeight ?? 0,
        actualReps: parseInt(s.targetReps ?? '6', 10) || 0,
        isCompleted: false,
        isSkipped: false,
      })),
    }))

    this._currentExerciseIndex = 0
    this._currentSetIndex = 0
    this._startTime = new Date().toISOString()

    this.initInputsForCurrentSet()
    this.startTimer()
    this.setData({ loading: false, pageTitle })
    this.recomputeDisplay()

    // 定期自动保存每 5 秒
    this._saveInterval = setInterval(() => this.saveDraft(), 5000)
  },

  onShow() {
    // 页面重新显示时恢复计时器（如果之前在运行）
    if (this._isRunning && this._elapsedInterval === null) {
      this._elapsedInterval = setInterval(() => {
        this._elapsedSeconds++
        this.setData({ elapsedFormatted: formatTime(this._elapsedSeconds) })
      }, 1000)
    }
    if (this._isResting && this._restSeconds > 0 && this._restInterval === null) {
      this._restInterval = setInterval(() => {
        if (this._restSeconds > 0) {
          this._restSeconds--
          this.setData({
            restFormatted: formatTime(this._restSeconds),
            restProgressDeg: this._restTotal > 0 ? Math.round((this._restSeconds / this._restTotal) * 360) : 0,
          })
        } else {
          this.clearRestInterval()
          this._isResting = false
          this.setData({ isResting: false, restFormatted: '--:--', restProgressDeg: 0 })
        }
      }, 1000)
    }
  },

  onHide() {
    // 页面隐藏时清除计时器（保真要求：onHide 时清除）
    this.saveDraft()
    this.clearElapsedInterval()
    this.clearRestInterval()
  },

  onUnload() {
    // 页面卸载时保存草稿并清除所有计时器
    this.saveDraft()
    this.clearElapsedInterval()
    this.clearRestInterval()
    if (this._saveInterval !== null) {
      clearInterval(this._saveInterval)
      this._saveInterval = null
    }
    this._isRunning = false
  },

  // ── 计时器方法 ──
  clearElapsedInterval() {
    if (this._elapsedInterval !== null) {
      clearInterval(this._elapsedInterval)
      this._elapsedInterval = null
    }
  },

  clearRestInterval() {
    if (this._restInterval !== null) {
      clearInterval(this._restInterval)
      this._restInterval = null
    }
  },

  startTimer() {
    if (this._isRunning) return
    this.clearElapsedInterval()
    this._isRunning = true
    this._elapsedInterval = setInterval(() => {
      this._elapsedSeconds++
      this.setData({ elapsedFormatted: formatTime(this._elapsedSeconds) })
    }, 1000)
  },

  stopTimer() {
    this.clearElapsedInterval()
    this.clearRestInterval()
    this._isRunning = false
    this._isResting = false
  },

  startRest(duration?: number) {
    this.clearRestInterval()
    this._restSeconds = duration ?? this._defaultRestSeconds
    if (this._restSeconds <= 0) return
    this._restTotal = this._restSeconds
    this._isResting = true
    this.setData({
      isResting: true,
      restFormatted: formatTime(this._restSeconds),
      restProgressDeg: 360,
    })
    this._restInterval = setInterval(() => {
      if (this._restSeconds > 0) {
        this._restSeconds--
        this.setData({
          restFormatted: formatTime(this._restSeconds),
          restProgressDeg: this._restTotal > 0 ? Math.round((this._restSeconds / this._restTotal) * 360) : 0,
        })
      } else {
        this.clearRestInterval()
        this._isResting = false
        this.setData({ isResting: false, restFormatted: '--:--', restProgressDeg: 0 })
      }
    }, 1000)
  },

  // ── 草稿保存/恢复 ──
  saveDraft() {
    if (!this._draftKey) return
    const data = {
      exercises: this._exercises,
      currentExerciseIndex: this._currentExerciseIndex,
      currentSetIndex: this._currentSetIndex,
      inputWeight: this._inputWeight,
      inputReps: this._inputReps,
      startTime: this._startTime,
      mr10TotalReps: this._mr10TotalReps,
      mr10Calculated: this._mr10Calculated,
      mr10LoadingWeight: this._mr10LoadingWeight,
      elapsedSeconds: this._elapsedSeconds,
      isResting: this._isResting,
      restSecondsLeft: this._restSeconds,
      defaultRestSeconds: this._defaultRestSeconds,
      savedAt: Date.now(),
    }
    try {
      wx.setStorageSync(this._draftKey, JSON.stringify(data))
    } catch {
      // quota exceeded
    }
  },

  loadDraft(): boolean {
    if (!this._draftKey) return false
    try {
      const raw = wx.getStorageSync(this._draftKey)
      if (!raw) return false
      const data = JSON.parse(raw)

      // 旧格式迁移：无 restSecondsLeft 字段则丢弃
      if (data.restSecondsLeft === undefined) {
        wx.removeStorageSync(this._draftKey)
        return false
      }

      if (!Array.isArray(data.exercises)) return false

      this._exercises = data.exercises
      this._currentExerciseIndex = data.currentExerciseIndex ?? 0
      this._currentSetIndex = data.currentSetIndex ?? 0
      this._inputWeight = data.inputWeight ?? 0
      this._inputReps = data.inputReps ?? 0
      this._startTime = data.startTime ?? new Date().toISOString()
      this._mr10TotalReps = data.mr10TotalReps ?? 0
      this._mr10Calculated = data.mr10Calculated ?? false
      this._mr10LoadingWeight = data.mr10LoadingWeight ?? 0

      if (data.elapsedSeconds > 0) {
        this._elapsedSeconds = data.elapsedSeconds
      }
      const secondsAway = data.savedAt ? Math.floor((Date.now() - data.savedAt) / 1000) : 0
      if (secondsAway > 0) {
        this._elapsedSeconds += secondsAway
      }

      // 恢复休息计时器
      const wasResting = data.isResting === true
      const hadRestTime = (data.restSecondsLeft ?? 0) > 0
      if (wasResting || hadRestTime) {
        const restDuration = data.defaultRestSeconds || 90
        const remaining = Math.max(0, (data.restSecondsLeft ?? restDuration) - secondsAway)
        if (remaining > 0) {
          this.startRest(remaining)
        }
      }

      return true
    } catch {
      return false
    }
  },

  clearDraft() {
    if (!this._draftKey) return
    try {
      wx.removeStorageSync(this._draftKey)
    } catch {
      // ignore
    }
  },

  // ── 输入处理 ──
  onWeightInput(e: WechatMiniprogram.Input) {
    const val = e.detail.value
    this._inputWeight = val ? Number(val) : 0
    this.setData({ inputWeightStr: val })
    this.recomputeRepDisplay()
  },

  selectRep(e: WechatMiniprogram.TouchEvent) {
    const rep = Number(e.currentTarget.dataset.rep)
    this._inputReps = rep
    this.recomputeRepDisplay()
  },

  // ── 完成当前组 ──
  completeCurrentSet() {
    const currentExercise = this._exercises[this._currentExerciseIndex]
    if (!currentExercise) return
    const currentSet = currentExercise.sets[this._currentSetIndex]
    if (!currentSet) return

    currentSet.actualWeight = this._inputWeight
    currentSet.actualReps = this._inputReps
    currentSet.isCompleted = true
    currentSet.restSeconds = this._restSeconds

    // 开始休息计时器
    this.startRest()

    // MR10 检查（第2周，深蹲 AMRAP 组）
    const isWeek2 = this._weekNum === 2
    const isWeek2Day1 = this._weekNum === 2 && this._dayNum === 1
    const isWeek2Day3 = this._weekNum === 2 && this._dayNum === 3

    if (isWeek2 && currentExercise.name === '深蹲' && currentSet.isAMRAP && !this._mr10Calculated) {
      const reps = this._inputReps
      this._mr10TotalReps = reps
      this._mr10Calculated = true

      const amrapSetNum = currentSet.setNumber
      const amrapWeight = this._inputWeight

      if (isWeek2Day1) {
        // Day 1: 加量组 — 始终 5 组 × 3 次
        let loadingWeight: number
        if (reps >= 8) {
          loadingWeight = roundWeight(amrapWeight + 2.5)
        } else {
          loadingWeight = roundWeight(amrapWeight * 0.975)
        }
        this._mr10LoadingWeight = loadingWeight
        const loadingSets: MutableSet[] = []
        for (let i = 0; i < 5; i++) {
          loadingSets.push({
            setNumber: amrapSetNum + 1 + i,
            targetWeight: loadingWeight,
            targetReps: '3',
            actualWeight: loadingWeight,
            actualReps: 3,
            isCompleted: false,
            isSkipped: false,
          })
        }
        currentExercise.sets.push(...loadingSets)
      } else if (isWeek2Day3) {
        // Day 3: 减量组 — 根据次数
        if (reps >= 7) {
          const totalSets = this.getMr10ResultSets(reps)
          const unloadingWeight = roundWeight(amrapWeight - 5)
          const unloadingSets: MutableSet[] = []
          for (let i = 0; i < totalSets; i++) {
            unloadingSets.push({
              setNumber: amrapSetNum + 1 + i,
              targetWeight: unloadingWeight,
              targetReps: '3',
              actualWeight: unloadingWeight,
              actualReps: 3,
              isCompleted: false,
              isSkipped: false,
            })
          }
          currentExercise.sets.push(...unloadingSets)
        } else {
          // <7 次：跳过减量组，提示降低 1RM
          wx.showModal({
            title: '提示',
            content: 'MR10 少于7次，已跳过减量组。建议将后续训练周期的1RM调低至少2.5%。',
            showCancel: false,
          })
        }
      }
    }

    // 自动保存草稿
    this.saveDraft()

    // 前进到下一组
    this.advanceToNextSet()
  },

  getMr10ResultSets(reps: number): number {
    if (reps >= 10) return 10
    if (reps >= 8) return 8
    if (reps >= 7) return 5
    return 0
  },

  advanceToNextSet() {
    const currentExercise = this._exercises[this._currentExerciseIndex]
    if (!currentExercise) return
    const nextSetIdx = this._currentSetIndex + 1
    if (nextSetIdx < currentExercise.sets.length) {
      this._currentSetIndex = nextSetIdx
      this.initInputsForCurrentSet()
    } else {
      const nextExIdx = this._currentExerciseIndex + 1
      if (nextExIdx < this._exercises.length) {
        this._currentExerciseIndex = nextExIdx
        this._currentSetIndex = 0
        this.initInputsForCurrentSet()
      }
    }
    this.recomputeDisplay()
  },

  initInputsForCurrentSet() {
    const currentExercise = this._exercises[this._currentExerciseIndex]
    if (!currentExercise) return
    const currentSet = currentExercise.sets[this._currentSetIndex]
    if (!currentSet) return

    // 若无 targetWeight，继承同动作上一个已完成组的实际重量
    if (currentSet.targetWeight != null) {
      this._inputWeight = currentSet.targetWeight
    } else {
      const lastCompleted = [...currentExercise.sets].reverse().find((s) => s.isCompleted && s.actualWeight > 0)
      this._inputWeight = lastCompleted ? lastCompleted.actualWeight : 0
    }

    const parsed = parseInt(currentSet.targetReps ?? '6', 10)
    this._inputReps = isNaN(parsed) ? 6 : parsed

    this.setData({
      inputWeightStr: String(this._inputWeight),
    })
  },

  // ── 完成训练 ──
  async finishWorkout() {
    if (!this.data.allExercisesDone) return
    if (!this._dayData) return

    this.stopTimer()

    const cycle = this._cycleId ? cycleStore.getCycleById(this._cycleId) : cycleStore.getActiveCycle()
    if (!cycle) return

    const now = new Date().toISOString()
    const todayStr = getToday()

    const exerciseRecords: ExerciseRecord[] = this._exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      type: ex.type,
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        targetWeight: s.targetWeight,
        targetReps: s.targetReps,
        actualWeight: s.actualWeight,
        actualReps: s.actualReps,
        isCompleted: s.isCompleted,
        isSkipped: s.isSkipped,
        restSeconds: s.restSeconds,
      })),
    }))

    const record: WorkoutRecord = {
      id: uuid(),
      cycleId: cycle.id,
      weekNumber: this._weekNum,
      dayNumber: this._dayNum,
      date: todayStr,
      originalDate: this._dayData.originalDate,
      scheduledDate: this._dayData.scheduledDate,
      isRescheduled: this._dayData.originalDate !== this._dayData.scheduledDate,
      startTime: this._startTime,
      endTime: now,
      duration: this._elapsedSeconds,
      exercises: exerciseRecords,
      notes: '',
      feeling: 3,
      status: 'completed',
      mr10TotalReps: this._mr10Calculated ? this._mr10TotalReps : undefined,
    }

    this.clearDraft()
    await recordStore.addRecord(record)

    // 更新周期天状态
    const updatedWeeks = cycle.weeks.map((week) => {
      if (week.weekNumber !== this._weekNum) return week
      return {
        ...week,
        days: week.days.map((day) => {
          if (day.dayNumber !== this._dayNum) return day
          return { ...day, status: 'completed' as const, completedDate: todayStr }
        }),
      }
    })

    // 第 5 周完成检查 — 直接导航到 week6 决策
    if (this._weekNum === 5) {
      const week5 = updatedWeeks.find((w) => w.weekNumber === 5)
      const week5Done = week5 && week5.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
      if (week5Done) {
        cycleStore.updateCycle(cycle.id, { weeks: updatedWeeks, status: 'week6_pending' })
        wx.redirectTo({ url: `/pages/week6/index?cycleId=${cycle.id}` })
        return
      }
    }

    cycleStore.updateCycle(cycle.id, { weeks: updatedWeeks })

    wx.redirectTo({
      url: `/pages/training-complete/index?week=${this._weekNum}&day=${this._dayNum}&cycleId=${cycle.id}`,
    })
  },

  goBack() {
    this.saveDraft()
    wx.switchTab({ url: '/pages/today/index' })
  },

  // ── 触摸滑动 ──
  onTouchStart(e: WechatMiniprogram.TouchEvent) {
    if (e.touches.length > 0) {
      this._touchStartX = e.touches[0].clientX
      this._touchStartY = e.touches[0].clientY
    }
  },

  onTouchEnd(e: WechatMiniprogram.TouchEvent) {
    if (e.changedTouches.length === 0) return
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - this._touchStartX
    const deltaY = endY - this._touchStartY

    // 水平滑动阈值 50px，且水平位移大于垂直位移
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return

    if (deltaX < 0) {
      // 向左滑：下一个动作
      if (this._currentExerciseIndex < this._exercises.length - 1) {
        this._currentExerciseIndex++
        this._currentSetIndex = 0
        this.initInputsForCurrentSet()
        this.recomputeDisplay()
      }
    } else {
      // 向右滑：返回
      this.goBack()
    }
  },

  // ── 重新计算显示数据 ──
  recomputeDisplay() {
    const currentExercise = this._exercises[this._currentExerciseIndex] ?? null
    const currentSet = currentExercise ? currentExercise.sets[this._currentSetIndex] ?? null : null

    if (!currentExercise || !currentSet) {
      // 所有动作完成
      const allDone = this._exercises.length > 0 && this._exercises.every((ex) => ex.sets.every((s) => s.isCompleted))
      this.setData({
        currentExerciseName: '',
        allExercisesDone: allDone,
      })
      this.recomputeNextDisplay()
      return
    }

    // 类型标签和徽章样式
    const typeLabel = this.typeLabel(currentExercise.type)
    const badgeStyle = this.typeBadgeStyle(currentExercise.type)

    // 当前组显示
    const currentSetDisplayIndex = currentSet.setNumber
    const currentExerciseTotalSets = currentExercise.sets.length

    // 目标显示（仅主项）
    const showTarget = currentExercise.type === 'main'
    const targetWeightDisplay = currentSet.targetWeight != null ? String(currentSet.targetWeight) : '--'
    const targetRepsDisplay = currentSet.isAMRAP ? 'AMRAP' : (currentSet.targetReps ?? '--') + '次'

    // 组列表显示
    const setsDisplay: SetDisplay[] = currentExercise.sets.map((s, idx) => {
      const isCurrent = idx === this._currentSetIndex && !s.isCompleted
      const isCompleted = s.isCompleted
      const displayNumber = s.setNumber
      const displayWeight = String(s.actualWeight || s.targetWeight || '--')
      const displayReps = String(s.actualReps || s.targetReps || '--')

      // 行样式
      let rowStyle = 'background: var(--color-surface); border: 1rpx solid var(--color-border-light); border-radius: var(--radius-md); box-shadow: var(--shadow-card);'
      if (isCompleted) {
        rowStyle = 'background: var(--color-surface-muted); border-radius: var(--radius-md);'
      } else if (isCurrent) {
        rowStyle = 'background: var(--color-surface); border: 1rpx solid var(--color-training-main); border-radius: var(--radius-md); box-shadow: 0 0 0 1rpx var(--color-training-main);'
      }

      // 圆圈样式
      let circleStyle = 'border: 3rpx solid var(--color-border);'
      let circleText = String(displayNumber)
      let circleTextStyle = 'font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light);'
      let showCheck = false
      if (isCompleted) {
        circleStyle = 'background: var(--color-border-light);'
        showCheck = true
      } else if (isCurrent) {
        circleStyle = 'background: var(--color-training-main);'
        circleTextStyle = 'font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--font-weight-bold); color: var(--color-surface);'
      }

      // 标签样式
      let labelStyle = 'font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary-light);'
      if (isCompleted) {
        labelStyle = 'font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary-light); text-decoration: line-through;'
      } else if (isCurrent) {
        labelStyle = 'font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-primary);'
      }

      // 值样式
      let valueStyle = 'font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light);'
      if (isCompleted) {
        valueStyle = 'font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light); text-decoration: line-through;'
      } else if (isCurrent) {
        valueStyle = 'font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-training-main);'
      }

      return {
        displayNumber,
        isCompleted,
        isCurrent,
        displayWeight,
        displayReps,
        rowStyle,
        circleStyle,
        circleText,
        circleTextStyle,
        showCheck,
        labelStyle,
        valueStyle,
      }
    })

    // MR10 提示
    const isWeek2 = this._weekNum === 2
    const isWeek2Day1 = this._weekNum === 2 && this._dayNum === 1
    const isWeek2Day3 = this._weekNum === 2 && this._dayNum === 3
    const showMR10Notice = isWeek2 && this._mr10Calculated
    let mr10MainText = ''
    let mr10HintText = ''
    let showMr10Hint = false

    if (showMR10Notice) {
      if (isWeek2Day1) {
        mr10MainText = `MR10 完成 ${this._mr10TotalReps}次，加量组将执行 5组×3次 @ ${this._mr10LoadingWeight}kg`
      } else if (isWeek2Day3) {
        const sets = this.getMr10ResultSets(this._mr10TotalReps)
        mr10MainText = `MR10 完成 ${this._mr10TotalReps}次，减量组将执行 ${sets}组×3次`
        mr10HintText = '10次→10组 | 8-9次→8组 | 7次→5组 | <7次→跳过并降低1RM'
        showMr10Hint = true
      }
    }

    // 所有动作完成
    const allExercisesDone = this._exercises.length > 0 && this._exercises.every((ex) => ex.sets.every((s) => s.isCompleted))

    // 下一动作
    let nextExerciseName = ''
    let nextExerciseTypeLabel = ''
    let nextExerciseBadgeStyle = ''
    let nextExerciseTargetRepsDisplay = ''
    const nextIdx = this._currentExerciseIndex + 1
    if (nextIdx < this._exercises.length) {
      const nextEx = this._exercises[nextIdx]
      nextExerciseName = nextEx.name
      nextExerciseTypeLabel = this.typeLabel(nextEx.type)
      nextExerciseBadgeStyle = this.typeBadgeStyle(nextEx.type)
      const totalSets = nextEx.sets.length
      const repsSample = nextEx.sets[0]?.targetReps ?? ''
      nextExerciseTargetRepsDisplay = `${repsSample} × ${totalSets}组`
    }

    this.setData({
      currentExerciseName: currentExercise.name,
      currentExerciseTypeLabel: typeLabel,
      currentExerciseBadgeStyle: badgeStyle,
      currentSetDisplayIndex,
      currentExerciseTotalSets,
      showTarget,
      targetWeightDisplay,
      targetRepsDisplay,
      setsDisplay,
      showMR10Notice,
      mr10MainText,
      mr10HintText,
      showMr10Hint,
      allExercisesDone,
      nextExerciseName,
      nextExerciseTypeLabel,
      nextExerciseBadgeStyle,
      nextExerciseTargetRepsDisplay,
    })

    this.recomputeRepDisplay()
  },

  recomputeRepDisplay() {
    const currentExercise = this._exercises[this._currentExerciseIndex]
    const currentSet = currentExercise ? currentExercise.sets[this._currentSetIndex] ?? null : null
    if (!currentSet) {
      this.setData({ repOptionsDisplay: [] })
      return
    }

    const parsed = parseInt(currentSet.targetReps ?? '6', 10)
    const center = isNaN(parsed) ? 6 : parsed
    const options: number[] = []
    for (let i = Math.max(1, center - 2); i <= center + 2; i++) {
      options.push(i)
    }
    const repOptionsDisplay: RepOptionDisplay[] = (options.length >= 3 ? options : [center]).map((value) => ({
      value,
      isSelected: this._inputReps === value,
    }))

    this.setData({ repOptionsDisplay })
  },

  recomputeNextDisplay() {
    // 下一动作预览（所有动作完成时清空）
    let nextExerciseName = ''
    let nextExerciseTypeLabel = ''
    let nextExerciseBadgeStyle = ''
    let nextExerciseTargetRepsDisplay = ''
    const nextIdx = this._currentExerciseIndex + 1
    if (nextIdx < this._exercises.length) {
      const nextEx = this._exercises[nextIdx]
      nextExerciseName = nextEx.name
      nextExerciseTypeLabel = this.typeLabel(nextEx.type)
      nextExerciseBadgeStyle = this.typeBadgeStyle(nextEx.type)
      const totalSets = nextEx.sets.length
      const repsSample = nextEx.sets[0]?.targetReps ?? ''
      nextExerciseTargetRepsDisplay = `${repsSample} × ${totalSets}组`
    }
    this.setData({
      nextExerciseName,
      nextExerciseTypeLabel,
      nextExerciseBadgeStyle,
      nextExerciseTargetRepsDisplay,
    })
  },

  typeLabel(type: string): string {
    if (type === 'main') return '主项'
    if (type === 'assistance') return '辅助项'
    return '补充项'
  },

  typeBadgeStyle(type: string): string {
    if (type === 'main') {
      return 'font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-training-main); background: var(--state-info-bg);'
    }
    return 'font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-training-assist); background: rgba(94, 92, 230, 0.08);'
  },
})
