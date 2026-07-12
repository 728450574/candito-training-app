// 暂停周期页 — 1:1 迁移自 PauseCycle.vue
// 确认暂停当前周期，记录暂停原因/日期，顺延受影响训练日
import { cycleStore } from '../../stores/cycleStore'
import { getToday, addDays, formatDate } from '../../services/dateService'
import type { PauseRecord, TrainingDay, Week, Cycle } from '../../types/cycle'

interface ReasonOption {
  value: 'holiday' | 'travel' | 'injury' | 'other'
  label: string
  iconClass: string
}

interface DurationOption {
  value: string
  label: string
}

interface AffectedDay {
  key: string
  label: string
  date: string
}

interface CurrentWeekDay {
  weekNumber: number
  dayNumber: number
  type: string
}

Page({
  data: {
    hasActiveCycle: false,
    progressLabel: '',
    reasonOptions: [
      { value: 'holiday', label: '小长假 / 假期', iconClass: 'icon-calendar' },
      { value: 'travel', label: '出差 / 旅行', iconClass: 'icon-briefcase' },
      { value: 'injury', label: '身体不适 / 受伤', iconClass: 'icon-heart-pulse' },
      { value: 'other', label: '其他', iconClass: 'icon-more-horizontal' },
    ] as ReasonOption[],
    selectedReason: '' as string,
    customReason: '',
    durationOptions: [
      { value: '3', label: '3天' },
      { value: '5', label: '5天' },
      { value: '7', label: '7天' },
      { value: 'custom', label: '自定义' },
    ] as DurationOption[],
    selectedDuration: '5',
    customStartDate: '',
    customEndDate: '',
    totalDaysNum: 5,
    affectedDays: [] as AffectedDay[],
  },

  _unsub: null as null | (() => void),
  _activeCycle: null as null | Cycle,
  _todayStr: '',
  _currentWeekDay: null as null | CurrentWeekDay,

  onLoad() {
    this._todayStr = getToday()
    this.setData({
      customStartDate: this._todayStr,
      customEndDate: addDays(this._todayStr, 4),
    })
    this._unsub = cycleStore.subscribe(() => this.recompute())
    this.recompute()
  },

  onUnload() {
    if (this._unsub) {
      this._unsub()
      this._unsub = null
    }
  },

  recompute() {
    const activeCycle = cycleStore.getActiveCycle()
    this._activeCycle = activeCycle

    if (!activeCycle) {
      this.setData({ hasActiveCycle: false })
      return
    }

    // currentWeekDay
    this._currentWeekDay = this.findCurrentWeekDay(activeCycle)
    let progressLabel = ''
    if (this._currentWeekDay) {
      const typeLabel = this._currentWeekDay.type === 'lower' ? '下肢训练' : '上肢训练'
      progressLabel = `第${this._currentWeekDay.weekNumber}周 · Day${this._currentWeekDay.dayNumber} · ${typeLabel}`
    }

    this.setData({ hasActiveCycle: true, progressLabel })
    this.recomputeDisplay()
  },

  findCurrentWeekDay(cycle: Cycle): CurrentWeekDay | null {
    for (const week of cycle.weeks) {
      for (const day of week.days) {
        if (day.scheduledDate === this._todayStr) {
          return { weekNumber: week.weekNumber, dayNumber: day.dayNumber, type: day.type }
        }
      }
    }
    for (const week of cycle.weeks) {
      const pending = week.days.find((d: TrainingDay) => d.status === 'pending' && d.type !== 'rest')
      if (pending) {
        return { weekNumber: week.weekNumber, dayNumber: pending.dayNumber, type: pending.type }
      }
    }
    return null
  },

  recomputeDisplay() {
    const activeCycle = this._activeCycle
    if (!activeCycle) return

    // totalDaysNum
    let totalDaysNum = 5
    if (this.data.selectedDuration === 'custom') {
      const diff =
        Math.round(
          (new Date(this.data.customEndDate + 'T00:00:00').getTime() -
            new Date(this.data.customStartDate + 'T00:00:00').getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      totalDaysNum = Math.max(1, diff)
    } else {
      totalDaysNum = parseInt(this.data.selectedDuration)
    }

    // affectedDays
    const days: AffectedDay[] = []
    const pauseEnd = addDays(this._todayStr, totalDaysNum - 1)
    for (const week of activeCycle.weeks) {
      for (const day of week.days) {
        if (day.type === 'rest') continue
        if (
          day.scheduledDate >= this._todayStr &&
          day.scheduledDate <= pauseEnd &&
          day.status === 'pending'
        ) {
          days.push({
            key: `W${week.weekNumber}D${day.dayNumber}`,
            label: `W${week.weekNumber}D${day.dayNumber}`,
            date: formatDate(day.scheduledDate),
          })
        }
      }
    }
    days.sort((a, b) => a.date.localeCompare(b.date))

    this.setData({ totalDaysNum, affectedDays: days })
  },

  selectReason(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value as string
    this.setData({ selectedReason: value })
  },

  inputCustomReason(e: WechatMiniprogram.Input) {
    this.setData({ customReason: e.detail.value })
  },

  selectDuration(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value as string
    this.setData({ selectedDuration: value })
    this.recomputeDisplay()
  },

  changeStartDate(e: WechatMiniprogram.PickerChange) {
    this.setData({ customStartDate: String(e.detail.value) })
    this.recomputeDisplay()
  },

  changeEndDate(e: WechatMiniprogram.PickerChange) {
    this.setData({ customEndDate: String(e.detail.value) })
    this.recomputeDisplay()
  },

  goBack() {
    wx.navigateBack()
  },

  handleConfirm() {
    if (!this._activeCycle || !this._currentWeekDay) return
    if (!this.data.selectedReason) return

    const activeCycle = this._activeCycle
    const todayStr = this._todayStr

    const pauseRecord: PauseRecord = {
      id: Date.now().toString(36),
      pausedAt: todayStr,
      pausedWeek: this._currentWeekDay.weekNumber,
      pausedDay: this._currentWeekDay.dayNumber,
      reason: this.data.selectedReason as PauseRecord['reason'],
      customReason: this.data.selectedReason === 'other' ? this.data.customReason : undefined,
      daysShifted: this.data.totalDaysNum,
      resumeOption: 'postpone',
    }

    const updatedPauseHistory = [...activeCycle.pauseHistory, pauseRecord]

    // Update scheduledDate for all future training days (postpone by shiftDays)
    const shiftDays = this.data.totalDaysNum
    const updatedWeeks: Week[] = activeCycle.weeks.map((week: Week) => ({
      ...week,
      days: week.days.map((day: TrainingDay) => {
        if (day.status === 'pending' && day.scheduledDate >= todayStr) {
          const newDate = addDays(day.scheduledDate, shiftDays)
          return { ...day, scheduledDate: newDate }
        }
        return day
      }),
    }))

    cycleStore.updateCycle(activeCycle.id, {
      isPaused: true,
      currentPause: pauseRecord,
      pauseHistory: updatedPauseHistory,
      weeks: updatedWeeks,
    })

    wx.navigateBack()
  },
})
