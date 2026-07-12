// 周期管理页 — 1:1 迁移自 CycleManagement.vue
// 周期列表、当前周期进度、暂停/恢复/终止/重新开始/第6周决策入口
import { cycleStore } from '../../stores/cycleStore'
import { formatDateFull, getToday } from '../../services/dateService'
import { createCycle } from '../../services/planGenerator'
import type { Cycle, PauseRecord, Week, TrainingDay } from '../../types/cycle'

interface OneRMCard {
  key: string
  name: string
  value: number
}

interface WeekTimelineItem {
  weekNumber: number
  theme: string
  state: 'completed' | 'in-progress' | 'pending'
  completedDays: number
  totalDays: number
  cardStyle: string
  titleStyle: string
}

interface PauseHistoryDisplay {
  id: string
  label: string
  range: string
}

interface HistoryCycleDisplay {
  id: string
  name: string
  statusLabel: string
  statusBadgeStyle: string
  dateRange: string
  subtitle: string
  squat: number
  bench: number
  deadlift: number
  unit: string
}

interface RestartLift {
  key: 'squat' | 'bench' | 'deadlift'
  cn: string
}

Page({
  data: {
    hasActiveCycle: false,
    canOperate: false,
    activeCycleName: '',
    unit: 'kg',
    statusLabel: '',
    statusBadgeStyle: '',
    progressText: '',
    progressPercent: 0,
    formattedStartDate: '',
    oneRMCards: [] as OneRMCard[],
    weekTimeline: [] as WeekTimelineItem[],
    showPauseHistory: true,
    pauseHistoryDisplay: [] as PauseHistoryDisplay[],
    historicalCycles: [] as HistoryCycleDisplay[],
    showRestartModal: false,
    restartWeek: 1,
    restartOneRM: { squat: 100, bench: 85, deadlift: 120 },
    restartLifts: [
      { key: 'squat', cn: '深蹲' },
      { key: 'bench', cn: '卧推' },
      { key: 'deadlift', cn: '硬拉' },
    ] as RestartLift[],
  },

  _unsub: null as null | (() => void),
  _activeCycle: null as null | Cycle,

  onLoad() {
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
      const historicalCycles = this.buildHistoricalCycles()
      this.setData({
        hasActiveCycle: false,
        canOperate: false,
        historicalCycles,
      })
      return
    }

    const currentWeekNumber = this.findCurrentWeekNumber(activeCycle)
    const completedWeekCount = activeCycle.weeks.filter((w: Week) =>
      w.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
    ).length
    const progressText = `第${currentWeekNumber}周 / 共6周`
    const progressPercent = Math.round((completedWeekCount / 6) * 100)

    // status
    const s = activeCycle.status
    let statusLabel = ''
    let statusBadgeStyle = ''
    if (s === 'active') {
      statusLabel = '进行中'
      statusBadgeStyle = 'background: var(--state-success-bg); color: var(--state-success);'
    } else if (s === 'paused') {
      statusLabel = '已暂停'
      statusBadgeStyle = 'background: var(--state-warning-bg); color: var(--state-warning);'
    } else if (s === 'week6_pending') {
      statusLabel = '等待决策'
      statusBadgeStyle = 'background: var(--state-success-bg); color: var(--state-success);'
    } else if (s === 'completed') {
      statusLabel = '已完成'
      statusBadgeStyle = 'background: var(--color-primary-subtle); color: var(--color-primary-light);'
    } else if (s === 'terminated') {
      statusLabel = '已终止'
      statusBadgeStyle = 'background: var(--color-primary-subtle); color: var(--color-primary-light);'
    }

    const canOperate = s !== 'terminated' && s !== 'completed'
    const formattedStartDate = formatDateFull(activeCycle.startDate)
    const oneRMCards: OneRMCard[] = [
      { key: 'squat', name: '深蹲', value: activeCycle.oneRM.squat },
      { key: 'bench', name: '卧推', value: activeCycle.oneRM.bench },
      { key: 'deadlift', name: '硬拉', value: activeCycle.oneRM.deadlift },
    ]

    const weekTimeline = this.buildWeekTimeline(activeCycle)
    const pauseHistoryDisplay = this.buildPauseHistory(activeCycle.pauseHistory)
    const historicalCycles = this.buildHistoricalCycles()

    this.setData({
      hasActiveCycle: true,
      canOperate,
      activeCycleName: activeCycle.name,
      unit: activeCycle.unit,
      statusLabel,
      statusBadgeStyle,
      progressText,
      progressPercent,
      formattedStartDate,
      oneRMCards,
      weekTimeline,
      pauseHistoryDisplay,
      historicalCycles,
    })
  },

  findCurrentWeekNumber(cycle: Cycle): number {
    const today = getToday()
    for (const week of cycle.weeks) {
      for (const day of week.days) {
        if (day.scheduledDate === today) {
          return week.weekNumber
        }
      }
    }
    const firstIncomplete = cycle.weeks.find((w: Week) =>
      w.days.some((d: TrainingDay) => d.status === 'pending' && d.type !== 'rest')
    )
    return firstIncomplete?.weekNumber || 6
  },

  buildWeekTimeline(cycle: Cycle): WeekTimelineItem[] {
    const today = getToday()
    return cycle.weeks.map((week: Week) => {
      const trainingDays = week.days.filter((d: TrainingDay) => d.type !== 'rest')
      const totalDays = trainingDays.length
      const completedDays = trainingDays.filter((d: TrainingDay) => d.status === 'completed').length

      let state: 'completed' | 'in-progress' | 'pending' = 'pending'
      if (completedDays === totalDays && totalDays > 0) {
        state = 'completed'
      } else if (week.days.some((d: TrainingDay) => d.scheduledDate === today) && completedDays < totalDays) {
        state = 'in-progress'
      } else if (completedDays > 0 && completedDays < totalDays) {
        state = 'in-progress'
      }

      const cardStyle =
        state === 'in-progress'
          ? 'background: var(--state-info-bg); box-shadow: var(--shadow-card);'
          : 'background: var(--color-surface); box-shadow: var(--shadow-card);'
      const titleStyle =
        state === 'pending'
          ? 'font-weight: 400; color: var(--color-primary-light);'
          : 'font-weight: 600; color: var(--color-primary);'

      return {
        weekNumber: week.weekNumber,
        theme: week.theme,
        state,
        completedDays,
        totalDays,
        cardStyle,
        titleStyle,
      }
    })
  },

  buildPauseHistory(pauseHistory: PauseRecord[]): PauseHistoryDisplay[] {
    const reasonMap: Record<string, string> = {
      holiday: '假期',
      travel: '出差',
      injury: '受伤',
      other: '其他',
    }
    return pauseHistory.map((pause: PauseRecord) => {
      const label = pause.customReason || reasonMap[pause.reason] || '暂停'
      const start = this.formatShortDate(pause.pausedAt)
      const end = pause.resumedAt ? this.formatShortDate(pause.resumedAt) : '进行中'
      const days = pause.daysShifted || 0
      const range = `${start}-${end} (${days}天) → 顺延`
      return { id: pause.id, label, range }
    })
  },

  buildHistoricalCycles(): HistoryCycleDisplay[] {
    const completed = cycleStore.getCompletedCycles()
    return completed.map((cycle: Cycle) => {
      const statusLabel = cycle.status === 'completed' ? '已完成' : '已终止'
      const statusBadgeStyle =
        cycle.status === 'completed'
          ? 'color: var(--state-success); background: var(--state-success-bg);'
          : 'color: var(--color-primary-light); background: var(--color-primary-subtle);'
      const dateRange = `${this.formatShortDate(cycle.startDate)} - ${this.formatShortDate(cycle.completedAt || cycle.terminatedAt || '')}`
      return {
        id: cycle.id,
        name: cycle.name,
        statusLabel,
        statusBadgeStyle,
        dateRange,
        subtitle: this.cycleSubtitle(cycle),
        squat: cycle.oneRM.squat,
        bench: cycle.oneRM.bench,
        deadlift: cycle.oneRM.deadlift,
        unit: cycle.unit,
      }
    })
  },

  formatShortDate(dateStr: string): string {
    if (!dateStr) return '--'
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length < 3) return dateStr
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`
  },

  cycleSubtitle(cycle: Cycle): string {
    if (cycle.status === 'completed') {
      const weeksDone = cycle.weeks.filter((w: Week) =>
        w.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
      ).length
      return `${weeksDone}周完成`
    }
    if (cycle.status === 'terminated') {
      const lastWeek = [...cycle.weeks].reverse().find((w: Week) =>
        w.days.some((d: TrainingDay) => d.status === 'completed')
      )
      const weekNum = lastWeek?.weekNumber || 0
      const reason = cycle.terminateReason ? ` · ${cycle.terminateReason}` : '因伤终止'
      return `完成至第${weekNum}周${reason}`
    }
    return ''
  },

  togglePauseHistory() {
    this.setData({ showPauseHistory: !this.data.showPauseHistory })
  },

  goPause() {
    wx.navigateTo({ url: '/pages/pause/index' })
  },

  goOneRM() {
    wx.navigateTo({ url: '/pages/onerm/index' })
  },

  goStart() {
    wx.navigateTo({ url: '/pages/start/index' })
  },

  goCycleDetail(e: WechatMiniprogram.TouchEvent) {
    const cycle = e.currentTarget.dataset.cycle as HistoryCycleDisplay
    wx.navigateTo({ url: `/pages/plan/index?cycleId=${cycle.id}` })
  },

  restartCurrent() {
    if (!this._activeCycle) return
    const cycle = this._activeCycle
    const data = createCycle({
      oneRM: cycle.oneRM,
      unit: cycle.unit,
      weightRounding: cycle.weightRounding,
      startDate: getToday(),
      assistanceConfig: cycle.assistanceConfig,
    })
    cycleStore.updateCycle(cycle.id, {
      status: 'completed',
      completedAt: getToday(),
    })
    cycleStore.addCycle(data)
    wx.switchTab({ url: '/pages/today/index' })
  },

  openRestartModal() {
    if (!this._activeCycle) return
    const cycle = this._activeCycle
    this.setData({
      showRestartModal: true,
      restartWeek: this.findCurrentWeekNumber(cycle),
      restartOneRM: {
        squat: cycle.oneRM.squat,
        bench: cycle.oneRM.bench,
        deadlift: cycle.oneRM.deadlift,
      },
    })
  },

  closeRestartModal() {
    this.setData({ showRestartModal: false })
  },

  noop() {
    // 阻止冒泡
  },

  selectRestartWeek(e: WechatMiniprogram.TouchEvent) {
    const week = Number(e.currentTarget.dataset.week)
    this.setData({ restartWeek: week })
  },

  inputRestartOneRM(e: WechatMiniprogram.Input) {
    const key = e.currentTarget.dataset.key as 'squat' | 'bench' | 'deadlift'
    const value = parseFloat(e.detail.value)
    const next = { ...this.data.restartOneRM }
    if (!isNaN(value)) {
      next[key] = value
    }
    this.setData({ restartOneRM: next })
  },

  confirmRestart() {
    if (!this._activeCycle) return
    const cycle = this._activeCycle
    const rm = this.data.restartOneRM
    const data = createCycle({
      oneRM: { squat: rm.squat, bench: rm.bench, deadlift: rm.deadlift },
      unit: cycle.unit,
      weightRounding: cycle.weightRounding,
      startDate: getToday(),
      assistanceConfig: cycle.assistanceConfig,
    })
    cycleStore.updateCycle(cycle.id, {
      status: 'completed',
      completedAt: getToday(),
    })
    cycleStore.addCycle(data)
    this.setData({ showRestartModal: false })
    wx.switchTab({ url: '/pages/today/index' })
  },

  handleTerminate() {
    if (!this._activeCycle) return
    const activeCycle = this._activeCycle
    wx.showModal({
      title: '终止周期',
      content: '确定要终止当前周期吗？终止后训练数据保留为只读。',
      confirmText: '确认终止',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          cycleStore.updateCycle(activeCycle.id, {
            status: 'terminated',
            terminatedAt: getToday(),
            terminateReason: '因伤终止',
          })
          cycleStore.setActiveCycle('')
        }
      },
    })
  },
})
