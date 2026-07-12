// 训练日历页 — tab
// 迁移自 TrainingCalendar.vue
// 业务逻辑 1:1 等价：月历视图 + 周视图 + 训练状态标记 + 选中日期详情
// 适配：recordStore 为异步 API（getRecordForDay），trainingDayMap 在 refresh() 内 await 构建

import { cycleStore } from '../../stores/cycleStore'
import { recordStore } from '../../stores/recordStore'
import { getToday, getWeekday } from '../../services/dateService'
import type { Cycle, PlannedExercise } from '../../types/cycle'

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日']
const WEEK_ABBRS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

type TrainingStatus = 'completed' | 'today' | 'upcoming' | 'missed' | null

interface TrainingDayInfo {
  weekNumber: number
  dayNumber: number
  type: string
  exercises: string
  status: string
  scheduledDate: string
}

interface CalendarCell {
  day: number
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  selectable: boolean
  trainingStatus: TrainingStatus
  dateClass: string
  dotClass: string
}

interface WeekRowDay {
  abbr: string
  date: number
  dateStr: string
  isToday: boolean
  isCurrentMonth: boolean
  hasTraining: boolean
  dotClass: string
}

interface SelectedDayInfo {
  displayDate: string
  statusLabel: string
  statusPillColor: string
  statusPillBg: string
  workoutType: string
  weekNum: number
  dayNum: number
  exercisesSummary: string
  dateStr: string
  isCompleted: boolean
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1)
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getDaysInPrevMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function workoutTypeLabel(type: string): string {
  return type === 'lower' ? '下肢训练' : '上肢训练'
}

Page({
  data: {
    currentYear: 0,
    currentMonth: 0,
    currentMonthLabel: '',
    activeCycle: null as Cycle | null,
    cycleStatusText: '',
    weekRowDays: [] as WeekRowDay[],
    calendarRows: [] as CalendarCell[][],
    lastRowIndex: 0,
    selectedDayInfo: null as SelectedDayInfo | null,
    weekdayHeaders: WEEKDAY_HEADERS,
  },

  unsubCycle: null as null | (() => void),
  unsubRecord: null as null | (() => void),
  todayStr: '' as string,
  selectedDate: null as string | null,
  trainingDayMap: {} as Record<string, TrainingDayInfo>,

  onLoad() {
    this.todayStr = getToday()
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    this.setData({
      currentYear: year,
      currentMonth: month,
      currentMonthLabel: String(month + 1),
    })
    this.unsubCycle = cycleStore.subscribe(() => { void this.refresh() })
    this.unsubRecord = recordStore.subscribe(() => { void this.refresh() })
    void this.refresh()
  },

  onShow() {
    void this.refresh()
  },

  onUnload() {
    this.unsubCycle?.()
    this.unsubRecord?.()
  },

  async refresh() {
    const activeCycle = cycleStore.getActiveCycle()
    // 构建 trainingDayMap（异步：await getRecordForDay）
    const map: Record<string, TrainingDayInfo> = {}
    if (activeCycle) {
      for (const week of activeCycle.weeks) {
        for (const day of week.days) {
          if (day.type === 'rest') continue
          const exNames = day.exercises.map((e: PlannedExercise) => e.name).join(', ')
          const record = await recordStore.getRecordForDay(
            activeCycle.id,
            week.weekNumber,
            day.dayNumber
          )
          const status = record ? 'completed' : day.status
          map[day.scheduledDate] = {
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            type: day.type,
            exercises: exNames,
            status,
            scheduledDate: day.scheduledDate,
          }
        }
      }
    }
    this.trainingDayMap = map

    this.buildCalendar()
    this.updateSelectedDay()
    this.setData({
      activeCycle,
      cycleStatusText: this.computeCycleStatusText(activeCycle),
    })
  },

  buildCalendar() {
    const year = this.data.currentYear
    const month = this.data.currentMonth
    const todayStr = this.todayStr
    const map = this.trainingDayMap

    // 周视图：显示当月第一周（含上月末尾日期补齐）
    const weekRowDays: WeekRowDay[] = []
    const firstDay = getFirstDayOfMonth(year, month)
    const daysInMonth = getDaysInMonth(year, month)
    const daysInPrevMonth = getDaysInPrevMonth(year, month)

    for (let i = 0; i < 7; i++) {
      let day: number, m: number, y: number
      if (i < firstDay) {
        day = daysInPrevMonth - firstDay + i + 1
        m = month - 1
        y = year
        if (m < 0) { m = 11; y-- }
      } else {
        day = i - firstDay + 1
        m = month
        y = year
      }
      const dateStr = toDateStr(y, m, day)
      const isToday = dateStr === todayStr
      const info = map[dateStr]
      const trainingStatus = this.getTrainingStatusForDate(dateStr, info)
      weekRowDays.push({
        abbr: WEEK_ABBRS[i],
        date: day,
        dateStr,
        isToday,
        isCurrentMonth: m === month && y === year,
        hasTraining: !!info,
        dotClass: this.dotClassFor(trainingStatus, isToday),
      })
    }

    // 月历网格
    const allCells: CalendarCell[] = []

    // 上月末尾日期补齐
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      let y = year, m = month - 1
      if (m < 0) { m = 11; y-- }
      const dateStr = toDateStr(y, m, day)
      allCells.push(this.buildCell(day, dateStr, false, todayStr, null))
    }

    // 当月日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(year, month, d)
      const info = map[dateStr]
      const trainingStatus = this.getTrainingStatusForDate(dateStr, info)
      allCells.push(this.buildCell(d, dateStr, true, todayStr, trainingStatus))
    }

    // 下月开头补齐
    const remaining = 7 - (allCells.length % 7)
    if (remaining < 7) {
      let y = year, m = month + 1
      if (m > 11) { m = 0; y++ }
      for (let d = 1; d <= remaining; d++) {
        const dateStr = toDateStr(y, m, d)
        allCells.push(this.buildCell(d, dateStr, false, todayStr, null))
      }
    }

    const rows: CalendarCell[][] = []
    for (let i = 0; i < allCells.length; i += 7) {
      rows.push(allCells.slice(i, i + 7))
    }

    this.setData({
      weekRowDays,
      calendarRows: rows,
      lastRowIndex: rows.length - 1,
    })
  },

  buildCell(
    day: number,
    dateStr: string,
    isCurrentMonth: boolean,
    todayStr: string,
    trainingStatus: TrainingStatus
  ): CalendarCell {
    const isToday = dateStr === todayStr
    const selectable = isCurrentMonth || isToday
    let dateClass: string
    if (isToday) {
      dateClass = 'cal-date--today'
    } else if (isCurrentMonth) {
      dateClass = trainingStatus ? 'cal-date--current-train' : 'cal-date--current-rest'
    } else {
      dateClass = 'cal-date--other'
    }
    // 选中修饰（叠加，今日除外）
    if (this.selectedDate === dateStr && !isToday) {
      dateClass += ' cal-date--selected'
    }
    return {
      day,
      dateStr,
      isCurrentMonth,
      isToday,
      selectable,
      trainingStatus,
      dateClass,
      dotClass: this.dotClassFor(trainingStatus, isToday),
    }
  },

  getTrainingStatusForDate(dateStr: string, info: TrainingDayInfo | undefined): TrainingStatus {
    if (dateStr === this.todayStr) return 'today'
    if (!info) return null
    if (info.status === 'completed') return 'completed'
    if (dateStr < this.todayStr) return 'missed'
    return 'upcoming'
  },

  dotClassFor(status: TrainingStatus, isToday: boolean): string {
    if (isToday) return 'cal-dot--today'
    switch (status) {
      case 'completed': return 'cal-dot--completed'
      case 'today': return 'cal-dot--today'
      case 'upcoming': return 'cal-dot--upcoming'
      case 'missed': return 'cal-dot--missed'
      default: return ''
    }
  },

  computeCycleStatusText(activeCycle: Cycle | null): string {
    if (!activeCycle) return ''
    const weekNum = this.currentWeekNumber(activeCycle)
    return `第${weekNum}周 · ${activeCycle.status === 'paused' ? '已暂停' : '进行中'}`
  },

  currentWeekNumber(activeCycle: Cycle): number {
    for (const week of activeCycle.weeks) {
      for (const day of week.days) {
        if (day.scheduledDate === this.todayStr) {
          return week.weekNumber
        }
      }
    }
    return 1
  },

  updateSelectedDay() {
    const dateStr = this.selectedDate
    if (!dateStr) {
      this.setData({ selectedDayInfo: null })
      return
    }
    const info = this.trainingDayMap[dateStr]
    const [y, m, d] = dateStr.split('-').map(Number)
    void y // 仅解析使用，年份不显示
    const display = `${m}月${d}日 · ${getWeekday(dateStr)}`

    if (!info) {
      this.setData({
        selectedDayInfo: {
          displayDate: display,
          statusLabel: '休息日',
          statusPillColor: 'var(--color-primary-light)',
          statusPillBg: 'var(--color-primary-subtle)',
          workoutType: '',
          weekNum: 0,
          dayNum: 0,
          exercisesSummary: '',
          dateStr,
          isCompleted: false,
        } as SelectedDayInfo,
      })
      return
    }

    const status = info.status === 'completed'
      ? '已完成'
      : (dateStr === this.todayStr ? '今日待完成' : '待训练')
    const typeLabel = workoutTypeLabel(info.type)

    let pillColor = 'var(--color-training-main)'
    let pillBg = 'var(--state-info-bg)'
    if (info.status === 'completed') {
      pillColor = 'var(--state-success)'
      pillBg = 'var(--state-success-bg)'
    }

    this.setData({
      selectedDayInfo: {
        displayDate: display,
        statusLabel: status,
        statusPillColor: pillColor,
        statusPillBg: pillBg,
        workoutType: typeLabel,
        weekNum: info.weekNumber,
        dayNum: info.dayNumber,
        exercisesSummary: info.exercises,
        dateStr,
        isCompleted: info.status === 'completed',
      } as SelectedDayInfo,
    })
  },

  selectDay(e: WechatMiniprogram.TouchEvent) {
    const date = (e.currentTarget.dataset as { date?: string }).date
    if (!date) return
    // 查找 cell 校验可选性（仅当月或今日可选）
    const rows = this.data.calendarRows as CalendarCell[][]
    let selectable = false
    for (const row of rows) {
      for (const c of row) {
        if (c.dateStr === date) {
          selectable = c.selectable
          break
        }
      }
      if (selectable) break
    }
    if (!selectable) return
    this.selectedDate = date
    // 重建日历以更新选中态样式
    this.buildCalendar()
    this.updateSelectedDay()
  },

  prevMonth() {
    let m = this.data.currentMonth - 1
    let y = this.data.currentYear
    if (m < 0) { m = 11; y-- }
    this.selectedDate = null
    this.setData({
      currentYear: y,
      currentMonth: m,
      currentMonthLabel: String(m + 1),
    })
    this.buildCalendar()
    this.updateSelectedDay()
  },

  nextMonth() {
    let m = this.data.currentMonth + 1
    let y = this.data.currentYear
    if (m > 11) { m = 0; y++ }
    this.selectedDate = null
    this.setData({
      currentYear: y,
      currentMonth: m,
      currentMonthLabel: String(m + 1),
    })
    this.buildCalendar()
    this.updateSelectedDay()
  },

  goToDetail() {
    const info = this.data.selectedDayInfo as SelectedDayInfo | null
    const cycle = this.data.activeCycle as Cycle | null
    if (!info || !cycle) return
    const url = info.isCompleted
      ? `/pages/training-detail/index?week=${info.weekNum}&day=${info.dayNum}&cycleId=${cycle.id}`
      : `/pages/training-execute/index?week=${info.weekNum}&day=${info.dayNum}&cycleId=${cycle.id}`
    wx.navigateTo({ url })
  },
})
