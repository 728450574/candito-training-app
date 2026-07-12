// 训练计划页 — 1:1 迁移自 TrainingPlan.vue
// 展示当前周期的 6 周训练计划、每周训练日与动作、可切换周次
import { cycleStore } from '../../stores/cycleStore'
import { getWeekday, getToday } from '../../services/dateService'
import type { Cycle, TrainingDay, Week } from '../../types/cycle'

interface ExDisplay {
  id: string
  name: string
  weightDisplay: string
  nameStyle: string
  weightStyle: string
}

interface DayCard {
  dayNumber: number
  status: string
  badgeText: string
  badgeIcon: 'check' | 'dot' | 'none'
  badgeStyle: string
  weekdayLabel: string
  workoutType: string
  exercises: ExDisplay[]
  cardStyle: string
}

interface WeekTab {
  week: number
  completed: boolean
  style: string
}

interface DotItem {
  bgColor: string
}

Page({
  data: {
    cycleId: '' as string,
    hasDisplayCycle: false,
    bannerLabel: '当前',
    currentWeekText: '',
    dots: [] as DotItem[],
    weekTabs: [] as WeekTab[],
    selectedWeekTitle: '',
    dayCards: [] as DayCard[],
  },

  _unsub: null as null | (() => void),
  _displayCycle: null as null | Cycle,
  _selectedWeek: 1,

  onLoad(options: { cycleId?: string }) {
    const cycleId = options.cycleId || ''
    this.setData({ cycleId })
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
    const cycleId = this.data.cycleId
    let displayCycle: Cycle | null = null
    if (cycleId) {
      displayCycle = cycleStore.getCycleById(cycleId) || null
    } else {
      displayCycle = cycleStore.getActiveCycle()
    }
    this._displayCycle = displayCycle

    if (!displayCycle) {
      this.setData({ hasDisplayCycle: false })
      return
    }

    // 初始化 selectedWeek
    if (!this._selectedWeek || this._selectedWeek < 1) {
      this._selectedWeek = this.findCurrentWeekNumber(displayCycle)
    } else {
      this._selectedWeek = this.findCurrentWeekNumber(displayCycle)
    }

    const currentWeekNumber = this.findCurrentWeekNumber(displayCycle)
    const currentWeek = displayCycle.weeks.find((w: Week) => w.weekNumber === currentWeekNumber)
    const currentWeekTheme = currentWeek?.theme || ''
    const bannerLabel = cycleId ? '预览' : '当前'
    const currentWeekText = `第${displayCycle.weeks.length > 0 ? currentWeekNumber : '--'}周 · ${currentWeekTheme}`

    // dots
    const dots: DotItem[] = []
    for (let w = 1; w <= 6; w++) {
      const bgColor = w <= currentWeekNumber ? 'var(--color-training-main)' : 'var(--color-border)'
      dots.push({ bgColor })
    }

    // weekTabs
    const weekTabs: WeekTab[] = []
    for (let w = 1; w <= 6; w++) {
      const completed = this.weekCompleted(displayCycle, w)
      let style = ''
      if (completed) {
        style =
          'color: var(--state-success); padding: 16rpx 24rpx; border-radius: 16rpx; font-size: var(--text-xs); font-weight: var(--font-weight-medium); display: flex; align-items: center; gap: 8rpx;'
      } else if (w === this._selectedWeek) {
        style =
          'color: var(--color-training-main); padding: 16rpx 24rpx; font-size: var(--text-xs); font-weight: var(--font-weight-semibold); border-bottom: 4rpx solid var(--color-training-main);'
      } else {
        style =
          'color: var(--color-primary-light); padding: 16rpx 24rpx; font-size: var(--text-xs); font-weight: var(--font-weight-medium);'
      }
      weekTabs.push({ week: w, completed, style })
    }

    // selectedWeek content
    const selectedWeekData = displayCycle.weeks.find((w: Week) => w.weekNumber === this._selectedWeek) || null
    const selectedWeekTheme = selectedWeekData?.theme || ''
    const selectedWeekTitle = `第${this._selectedWeek}周 · ${selectedWeekTheme}`

    let dayCards: DayCard[] = []
    if (selectedWeekData) {
      const trainingDays = selectedWeekData.days.filter((d: TrainingDay) => d.type !== 'rest')
      dayCards = trainingDays.map((day: TrainingDay) => this.buildDayCard(day))
    }

    this.setData({
      hasDisplayCycle: true,
      bannerLabel,
      currentWeekText,
      dots,
      weekTabs,
      selectedWeekTitle,
      dayCards,
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
    return firstIncomplete?.weekNumber || 1
  },

  weekCompleted(cycle: Cycle, weekNumber: number): boolean {
    const week = cycle.weeks.find((w: Week) => w.weekNumber === weekNumber)
    if (!week) return false
    const trainingDays = week.days.filter((d: TrainingDay) => d.type !== 'rest')
    return trainingDays.length > 0 && trainingDays.every((d: TrainingDay) => d.status === 'completed')
  },

  dayStatus(day: TrainingDay): 'completed' | 'in-progress' | 'pending' {
    if (day.status === 'completed') return 'completed'
    if (day.status === 'pending' && day.scheduledDate === getToday()) return 'in-progress'
    if (day.scheduledDate < getToday() && day.status === 'pending') return 'pending'
    return 'pending'
  },

  buildDayCard(day: TrainingDay): DayCard {
    const status = this.dayStatus(day)

    // cardStyle
    const baseShadow = 'box-shadow: var(--shadow-elevated); background: var(--color-surface);'
    let cardStyle = baseShadow
    if (status === 'completed') {
      cardStyle = baseShadow + ' border-left-color: var(--state-success);'
    } else if (status === 'in-progress') {
      cardStyle = baseShadow + ' border-left-color: var(--color-training-main);'
    } else {
      cardStyle = baseShadow + ' border-left-color: var(--color-border);'
    }

    // badge
    let badgeText = '待训练'
    let badgeIcon: 'check' | 'dot' | 'none' = 'none'
    let badgeStyle = 'color: var(--color-primary-light); background: var(--color-primary-subtle);'
    if (status === 'completed') {
      badgeText = '已完成'
      badgeIcon = 'check'
      badgeStyle = 'color: var(--state-success); background: var(--state-success-bg);'
    } else if (status === 'in-progress') {
      badgeText = '进行中'
      badgeIcon = 'dot'
      badgeStyle = 'color: var(--state-info); background: var(--state-info-bg);'
    }

    const workoutType = day.type === 'lower' ? '下肢训练' : '上肢训练'
    const weekdayLabel = getWeekday(day.scheduledDate)

    // exercise name/weight styles
    let nameStyle = 'color: var(--color-primary);'
    if (status === 'completed') {
      nameStyle = 'color: var(--color-primary-light);'
    }
    let weightStyle = 'color: var(--color-primary);'
    if (status === 'in-progress') {
      weightStyle = 'color: var(--color-training-main);'
    } else if (status === 'pending') {
      weightStyle = 'color: var(--color-primary-light);'
    }

    const exercises: ExDisplay[] = day.exercises.slice(0, 3).map((ex) => {
      const firstSet = ex.sets[0]
      let weightDisplay = '--'
      if (firstSet?.targetWeight) {
        weightDisplay = `${firstSet.targetWeight}kg`
      }
      return { id: ex.id, name: ex.name, weightDisplay, nameStyle, weightStyle }
    })

    return {
      dayNumber: day.dayNumber,
      status,
      badgeText,
      badgeIcon,
      badgeStyle,
      weekdayLabel,
      workoutType,
      exercises,
      cardStyle,
    }
  },

  selectWeek(e: WechatMiniprogram.TouchEvent) {
    const week = Number(e.currentTarget.dataset.week)
    this._selectedWeek = week
    this.recompute()
  },

  handleDayClick(e: WechatMiniprogram.TouchEvent) {
    const day = e.currentTarget.dataset.day as DayCard
    if (!this._displayCycle) return
    const cycleId = this._displayCycle.id
    const week = this._selectedWeek
    const dayNumber = day.dayNumber
    const status = day.status
    if (status === 'completed' || status === 'pending') {
      wx.navigateTo({
        url: `/pages/training-detail/index?week=${week}&day=${dayNumber}&cycleId=${cycleId}`,
      })
    } else if (status === 'in-progress') {
      wx.navigateTo({
        url: `/pages/training-execute/index?week=${week}&day=${dayNumber}&cycleId=${cycleId}`,
      })
    } else {
      wx.navigateTo({
        url: `/pages/training-detail/index?week=${week}&day=${dayNumber}&cycleId=${cycleId}`,
      })
    }
  },

  goBack() {
    wx.navigateBack()
  },

  goStart() {
    wx.navigateTo({ url: '/pages/start/index' })
  },
})
