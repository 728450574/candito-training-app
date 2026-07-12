// 处理错过训练页 — 1:1 迁移自 MissedWorkouts.vue
// 展示错过的训练日，选择补练/跳过/顺延，批量处理
import { cycleStore } from '../../stores/cycleStore'
import { getToday, formatDate, diffDays } from '../../services/dateService'
import type { TrainingDay, Week, Cycle } from '../../types/cycle'

type DayAction = 'makeup' | 'skip' | 'postpone'

interface MissedDayInfo {
  key: string
  weekNumber: number
  dayNumber: number
  label: string
  typeLabel: string
  type: string
  date: string
  dateDisplay: string
  scheduledDate: string
}

interface ActionBtn {
  value: DayAction
  label: string
  style: string
}

interface MissedDayCard {
  key: string
  label: string
  typeLabel: string
  dateDisplay: string
  actions: ActionBtn[]
}

const DAY_ACTIONS: Array<{ value: DayAction; label: string }> = [
  { value: 'makeup', label: '补练' },
  { value: 'skip', label: '跳过' },
  { value: 'postpone', label: '顺延' },
]

Page({
  data: {
    hasActiveCycle: false,
    missedCount: 0,
    missedDayCards: [] as MissedDayCard[],
    travelSkipOpen: false,
    travelStartDate: '',
    travelEndDate: '',
  },

  _unsub: null as null | (() => void),
  _activeCycle: null as null | Cycle,
  _todayStr: '',
  _missedDayInfos: [] as MissedDayInfo[],
  _dayActions: {} as Record<string, DayAction>,

  onLoad() {
    this._todayStr = getToday()
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
      this.setData({ hasActiveCycle: false, missedCount: 0, missedDayCards: [] })
      return
    }

    this._missedDayInfos = this.buildMissedDays(activeCycle)

    // travel dates (display only)
    const travelStartDate =
      this._missedDayInfos.length > 0 ? this._missedDayInfos[0].date : formatDate(this._todayStr)
    const travelEndDate = formatDate(this._todayStr)

    this.setData({
      hasActiveCycle: true,
      missedCount: this._missedDayInfos.length,
      travelStartDate,
      travelEndDate,
    })
    this.recomputeCards()
  },

  buildMissedDays(cycle: Cycle): MissedDayInfo[] {
    const days: MissedDayInfo[] = []
    for (const week of cycle.weeks) {
      for (const day of week.days) {
        if (day.type === 'rest') continue
        if (day.status === 'pending' && day.scheduledDate < this._todayStr) {
          const diff = diffDays(day.scheduledDate, this._todayStr)
          let agoText = ''
          if (diff === 0) agoText = '今天'
          else if (diff === 1) agoText = '昨天'
          else agoText = `${diff}天前`
          days.push({
            key: `W${week.weekNumber}D${day.dayNumber}`,
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            label: `W${week.weekNumber}D${day.dayNumber}`,
            typeLabel: day.type === 'lower' ? '下肢训练' : '上肢训练',
            type: day.type,
            date: formatDate(day.scheduledDate),
            dateDisplay: `${formatDate(day.scheduledDate)} (${agoText})`,
            scheduledDate: day.scheduledDate,
          })
        }
      }
    }
    return days
  },

  recomputeCards() {
    const missedDayCards: MissedDayCard[] = this._missedDayInfos.map((info: MissedDayInfo) => {
      const selected = this._dayActions[info.key]
      const actions: ActionBtn[] = DAY_ACTIONS.map((a) => {
        const isSelected = selected === a.value
        const style = isSelected
          ? 'color: var(--color-surface); background: var(--color-training-main);'
          : 'color: var(--color-primary); background: var(--color-surface-muted);'
        return { value: a.value, label: a.label, style }
      })
      return {
        key: info.key,
        label: info.label,
        typeLabel: info.typeLabel,
        dateDisplay: info.dateDisplay,
        actions,
      }
    })
    this.setData({ missedDayCards })
  },

  selectAction(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as string
    const action = e.currentTarget.dataset.action as DayAction
    this._dayActions[key] = action
    this.recomputeCards()
  },

  toggleTravelSkip() {
    this.setData({ travelSkipOpen: !this.data.travelSkipOpen })
  },

  applyTravelSkip() {
    for (const day of this._missedDayInfos) {
      this._dayActions[day.key] = 'skip'
    }
    this.setData({ travelSkipOpen: false })
    this.recomputeCards()
  },

  applyAllPostpone() {
    for (const day of this._missedDayInfos) {
      this._dayActions[day.key] = 'postpone'
    }
    this.recomputeCards()
  },

  applyAllSkip() {
    for (const day of this._missedDayInfos) {
      this._dayActions[day.key] = 'skip'
    }
    this.recomputeCards()
  },

  goBack() {
    wx.navigateBack()
  },

  handleConfirm() {
    if (!this._activeCycle) return
    const activeCycle = this._activeCycle
    const todayStr = this._todayStr

    const updatedWeeks: Week[] = activeCycle.weeks.map((week: Week) => {
      return {
        ...week,
        days: week.days.map((day: TrainingDay) => {
          const actionKey = `W${week.weekNumber}D${day.dayNumber}`
          const action = this._dayActions[actionKey]
          if (action && day.status === 'pending') {
            if (action === 'postpone') {
              return { ...day, status: 'postponed' as const }
            }
            if (action === 'skip') {
              return { ...day, status: 'skipped' as const }
            }
            if (action === 'makeup') {
              return { ...day, status: 'makeup' as const, completedDate: todayStr }
            }
          }
          return day
        }),
      }
    })

    cycleStore.updateCycle(activeCycle.id, { weeks: updatedWeeks })
    wx.navigateBack()
  },
})
