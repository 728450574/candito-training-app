<template>
  <main class="min-h-screen pb-24 max-w-lg mx-auto px-4 cal-page">
    <div class="h-11"></div>

    <header class="px-5 pt-2 pb-1">
      <h1 class="typography-hero cal-title">训练日历</h1>
      <div class="flex items-center justify-between mt-3">
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-md cal-nav-btn" aria-label="上个月" @click="prevMonth">
          <ChevronLeft style="width:18px; height:18px;" />
        </button>
        <h2 class="typography-subtitle cal-month-title">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-md cal-nav-btn" aria-label="下个月" @click="nextMonth">
          <ChevronRight style="width:18px; height:18px;" />
        </button>
      </div>
      <div class="flex justify-center mt-3" v-if="activeCycle">
        <span class="inline-flex items-center px-3 py-1 whitespace-nowrap cycle-status-badge">{{ cycleStatusText }}</span>
      </div>
    </header>

    <!-- 周行（横向滚动条风格） -->
    <section class="mx-5 mt-3 mb-1 px-2 py-2 week-row-panel">
      <div class="grid grid-cols-7 text-center week-row-grid">
        <div v-for="(day, idx) in weekRowDays" :key="idx" class="flex flex-col items-center py-1">
          <span class="truncate week-row-abbr">{{ day.abbr }}</span>
          <span
            class="mt-1 truncate"
            :class="weekRowDateClass(day)"
          >{{ day.date }}</span>
          <span v-if="day.hasTraining" class="mt-0.5 h-1 w-1 rounded-full" :class="weekRowDotClass(day)"></span>
        </div>
      </div>
    </section>

    <!-- 月历网格 -->
    <section class="mx-5 mt-2 px-1 pb-1 cal-grid-panel">
      <div class="grid grid-cols-7 text-center py-2 cal-grid-header">
        <span v-for="wd in weekdayHeaders" :key="wd" class="truncate wd-header">{{ wd }}</span>
      </div>

      <div v-for="(row, rowIdx) in calendarRows" :key="rowIdx" class="grid grid-cols-7 text-center">
        <div
          v-for="(cell, cellIdx) in row"
          :key="cellIdx"
          class="flex flex-col items-center cal-cell"
          :class="cellContainerClass(rowIdx)"
          @click="selectDay(cell)"
        >
          <span class="truncate" :class="cellDateClass(cell)">{{ cell.day }}</span>
          <span v-if="cell.trainingStatus" class="mt-0.5 h-1.5 w-1.5 rounded-full" :class="cellDotClass(cell.trainingStatus)"></span>
        </div>
      </div>
    </section>

    <!-- 图例 -->
    <div class="flex items-center justify-center gap-4 mt-3 px-5">
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full legend-dot-success"></span>
        <span class="truncate legend-label">已完成</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full legend-dot-today"></span>
        <span class="truncate legend-label">今日</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full legend-dot-upcoming"></span>
        <span class="truncate legend-label">待训练</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full legend-dot-missed"></span>
        <span class="truncate legend-label">未完成</span>
      </div>
    </div>

    <!-- 选中日期详情 -->
    <section v-if="selectedDayInfo" class="mx-5 mt-4 p-4 day-detail-panel">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="typography-subtitle day-detail-title">{{ selectedDayInfo.displayDate }}</h3>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 whitespace-nowrap day-detail-pill" :class="selectedDayPillClass">{{ selectedDayInfo.statusLabel }}</span>
      </div>
      <div class="mt-3 day-detail-content">
        <template v-if="selectedDayInfo.workoutType">
          <div class="flex items-center gap-2">
            <span class="typography-body day-detail-workout">{{ selectedDayInfo.workoutType }} · W{{ selectedDayInfo.weekNum }}D{{ selectedDayInfo.dayNum }}</span>
          </div>
          <p class="mt-2 truncate day-detail-exercises">{{ selectedDayInfo.exercisesSummary }}</p>
          <button class="mt-3 inline-flex items-center gap-1 px-3 py-1.5 day-detail-btn" @click="goToDetail(selectedDayInfo)">
            查看详情
            <ChevronRight style="width: 12px; height: 12px;" />
          </button>
        </template>
        <template v-else>
          <p class="typography-caption">休息日</p>
        </template>
      </div>
    </section>

    <div class="h-2"></div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { getToday, getWeekday } from '@/services/dateService'
import type { TrainingDay, PlannedExercise } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()

const activeCycle = computed(() => cycleStore.activeCycle)

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

const selectedDate = ref<string | null>(null)

const weekdayHeaders = ['一', '二', '三', '四', '五', '六', '日']
const weekAbbrs = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const todayStr = getToday()

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1)
  let day = d.getDay()
  return day === 0 ? 6 : day - 1
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getDaysInPrevMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

interface CalendarCell {
  day: number
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  trainingStatus: 'completed' | 'today' | 'upcoming' | 'missed' | null
  trainingInfo?: {
    weekNumber: number
    dayNumber: number
    type: string
    exercises: string
    status: string
  }
}

interface WeekRowDay {
  abbr: string
  date: number
  dateStr: string
  isToday: boolean
  hasTraining: boolean
  trainingStatus: 'completed' | 'today' | 'upcoming' | 'missed' | null
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
}

const trainingDayMap = computed(() => {
  const map = new Map<string, { weekNumber: number; dayNumber: number; type: string; exercises: string; status: string; scheduledDate: string }>()
  if (!activeCycle.value) return map
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.type === 'rest') continue
      const exNames = day.exercises.map((e: PlannedExercise) => e.name).join(', ')
      const record = recordStore.getRecordForDay(activeCycle.value.id, week.weekNumber, day.dayNumber)
      const status = record ? 'completed' : day.status
      map.set(day.scheduledDate, {
        weekNumber: week.weekNumber,
        dayNumber: day.dayNumber,
        type: day.type,
        exercises: exNames,
        status,
        scheduledDate: day.scheduledDate,
      })
    }
  }
  return map
})

function getTrainingStatusForDate(dateStr: string): CalendarCell['trainingStatus'] {
  if (dateStr === todayStr) return 'today'
  const info = trainingDayMap.value.get(dateStr)
  if (!info) return null
  if (info.status === 'completed') return 'completed'
  if (dateStr < todayStr) return 'missed'
  return 'upcoming'
}

function getTrainingInfoForDate(dateStr: string) {
  return trainingDayMap.value.get(dateStr)
}

const weekRowDays = computed(() => {
  const days: WeekRowDay[] = []
  const firstDay = getFirstDayOfMonth(currentYear.value, currentMonth.value)
  const daysInMonth = getDaysInMonth(currentYear.value, currentMonth.value)
  const daysInPrevMonth = getDaysInPrevMonth(currentYear.value, currentMonth.value)

  for (let i = 0; i < 7; i++) {
    let day: number
    let month: number
    let year: number
    if (i < firstDay) {
      day = daysInPrevMonth - firstDay + i + 1
      month = currentMonth.value - 1
      year = currentYear.value
      if (month < 0) { month = 11; year-- }
    } else {
      day = i - firstDay + 1
      month = currentMonth.value
      year = currentYear.value
    }
    const dateStr = toDateStr(year, month, day)
    days.push({
      abbr: weekAbbrs[i],
      date: day,
      dateStr,
      isToday: dateStr === todayStr,
      hasTraining: trainingDayMap.value.has(dateStr),
      trainingStatus: getTrainingStatusForDate(dateStr),
    })
  }
  return days
})

const calendarRows = computed(() => {
  const rows: CalendarCell[][] = []
  const firstDay = getFirstDayOfMonth(currentYear.value, currentMonth.value)
  const daysInMonth = getDaysInMonth(currentYear.value, currentMonth.value)
  const daysInPrevMonth = getDaysInPrevMonth(currentYear.value, currentMonth.value)

  const allCells: CalendarCell[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    let year = currentYear.value
    let month = currentMonth.value - 1
    if (month < 0) { month = 11; year-- }
    const dateStr = toDateStr(year, month, day)
    allCells.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      trainingStatus: null,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(currentYear.value, currentMonth.value, d)
    allCells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      trainingStatus: getTrainingStatusForDate(dateStr),
      trainingInfo: getTrainingInfoForDate(dateStr),
    })
  }

  const remaining = 7 - (allCells.length % 7)
  if (remaining < 7) {
    let year = currentYear.value
    let month = currentMonth.value + 1
    if (month > 11) { month = 0; year++ }
    for (let d = 1; d <= remaining; d++) {
      const dateStr = toDateStr(year, month, d)
      allCells.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        trainingStatus: null,
      })
    }
  }

  for (let i = 0; i < allCells.length; i += 7) {
    rows.push(allCells.slice(i, i + 7))
  }

  return rows
})

const selectedDayInfo = computed<SelectedDayInfo | null>(() => {
  if (!selectedDate.value) return null
  const info = getTrainingInfoForDate(selectedDate.value)
  const dateStr = selectedDate.value
  const [y, m, d] = dateStr.split('-').map(Number)
  const display = `${m}月${d}日 · ${getWeekday(dateStr)}`

  if (!info) {
    return {
      displayDate: display,
      statusLabel: '休息日',
      statusPillColor: 'var(--color-primary-light)',
      statusPillBg: 'var(--color-primary-subtle)',
      workoutType: '',
      weekNum: 0,
      dayNum: 0,
      exercisesSummary: '',
      dateStr,
    }
  }

  const status = info.status === 'completed' ? '已完成' : (dateStr === todayStr ? '今日待完成' : '待训练')
  const typeLabel = info.type === 'lower' ? '下肢训练' : '上肢训练'

  let pillColor = 'var(--color-training-main)'
  let pillBg = 'var(--state-info-bg)'
  if (info.status === 'completed') {
    pillColor = 'var(--state-success)'
    pillBg = 'var(--state-success-bg)'
  }

  return {
    displayDate: display,
    statusLabel: status,
    statusPillColor: pillColor,
    statusPillBg: pillBg,
    workoutType: typeLabel,
    weekNum: info.weekNumber,
    dayNum: info.dayNumber,
    exercisesSummary: info.exercises,
    dateStr,
  }
})

/**
 * 选中日期标签的状态CSS类（替代原来的 selectedDayPillStyle 样式函数）
 */
const selectedDayPillClass = computed(() => {
  if (!selectedDayInfo.value) return ''
  if (selectedDayInfo.value.statusLabel === '休息日') return 'day-pill-rest'
  if (selectedDayInfo.value.statusLabel === '已完成') return 'day-pill-completed'
  return 'day-pill-upcoming'
})

const cycleStatusText = computed(() => {
  if (!activeCycle.value) return ''
  const weekNum = currentWeekNumber()
  return `第${weekNum}周 · ${activeCycle.value.status === 'paused' ? '已暂停' : '进行中'}`
})

function currentWeekNumber(): number {
  if (!activeCycle.value) return 1
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === todayStr) {
        return week.weekNumber
      }
    }
  }
  return 1
}

/**
 * 周行日期CSS类（替代原来的 weekRowDateStyle 样式函数）
 */
function weekRowDateClass(day: WeekRowDay): string[] {
  if (day.isToday) {
    return ['week-date-today', 'inline-flex', 'h-7', 'w-7', 'items-center', 'justify-center', 'rounded-full']
  }
  const isCurrentMonth = day.dateStr.startsWith(todayStr.slice(0, 7))
  if (isCurrentMonth) {
    return ['week-date-current']
  }
  return ['week-date-other']
}

/**
 * 周行圆点CSS类（替代原来的 weekRowDotStyle 样式函数）
 */
function weekRowDotClass(day: WeekRowDay): string {
  if (day.isToday) return 'week-dot-today'
  if (day.trainingStatus === 'completed') return 'week-dot-completed'
  return 'week-dot-upcoming'
}

/**
 * 日历单元格容器CSS类（替代原来的 cellContainerStyle 样式函数）
 * 非最后一行的单元格添加底边框；同行右边框由 CSS :not(:last-child) 处理
 */
function cellContainerClass(rowIdx: number): string[] {
  const classes: string[] = []
  const isLastRow = rowIdx === calendarRows.value.length - 1
  if (!isLastRow) {
    classes.push('cell-border-bottom')
  }
  return classes
}

/**
 * 日历单元格日期CSS类（替代原来的 cellDateStyle 样式函数）
 */
function cellDateClass(cell: CalendarCell): string[] {
  const classes: string[] = ['cell-date']
  if (cell.isToday) {
    classes.push('cell-date-today')
    return classes
  }
  if (!cell.isCurrentMonth) {
    classes.push('cell-date-other-month')
    return classes
  }
  if (selectedDate.value === cell.dateStr) {
    classes.push('cell-date-selected')
  }
  if (cell.trainingStatus) {
    classes.push('cell-date-has-training')
  }
  return classes
}

/**
 * 日历单元格圆点CSS类（替代原来的 cellDotStyle 样式函数）
 */
function cellDotClass(status: string | null): string {
  switch (status) {
    case 'completed': return 'cell-dot-completed'
    case 'today': return 'cell-dot-today'
    case 'upcoming': return 'cell-dot-upcoming'
    case 'missed': return 'cell-dot-missed'
    default: return ''
  }
}

function selectDay(cell: CalendarCell) {
  if (cell.isCurrentMonth || cell.dateStr === todayStr) {
    selectedDate.value = cell.dateStr
  }
}

function prevMonth() {
  currentMonth.value--
  if (currentMonth.value < 0) {
    currentMonth.value = 11
    currentYear.value--
  }
  selectedDate.value = null
}

function nextMonth() {
  currentMonth.value++
  if (currentMonth.value > 11) {
    currentMonth.value = 0
    currentYear.value++
  }
  selectedDate.value = null
}

function goToDetail(info: SelectedDayInfo) {
  if (info.statusLabel === '已完成') {
    router.push({
      name: 'training-detail',
      query: {
        week: info.weekNum,
        day: info.dayNum,
        cycleId: activeCycle.value?.id,
      },
    })
  } else {
    router.push({
      name: 'training-execute',
      query: {
        week: info.weekNum,
        day: info.dayNum,
        cycleId: activeCycle.value?.id,
      },
    })
  }
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.cal-page {
  font-family: var(--font-sans);
}

/* ===== 标题 ===== */
.cal-title {
  font-size: var(--text-2xl);
  letter-spacing: -0.01em;
}

/* ===== 导航按钮 ===== */
.cal-nav-btn {
  color: var(--color-primary-light);
}

/* ===== 月标题 ===== */
.cal-month-title {
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

/* ===== 周期状态标签 ===== */
.cycle-status-badge {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-training-main);
  background: var(--state-info-bg);
  border-radius: var(--radius-full);
}

/* ===== 周行面板 ===== */
.week-row-panel {
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
}

.week-row-grid {
  gap: 0;
}

.week-row-abbr {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  line-height: 1;
}

.week-date-today {
  font-size: var(--text-sm);
  color: var(--color-surface);
  font-weight: var(--font-weight-bold);
  background: var(--color-training-main);
}

.week-date-current {
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.week-date-other {
  font-size: var(--text-sm);
  color: var(--color-border);
  font-weight: var(--font-weight-medium);
}

.week-dot-today { background: var(--color-surface); }
.week-dot-completed { background: var(--state-success); }
.week-dot-upcoming { background: var(--color-primary-light); }

/* ===== 月历网格面板 ===== */
.cal-grid-panel {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}

.cal-grid-header {
  border-bottom: 1px solid var(--color-border-light);
}

.wd-header {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  font-weight: var(--font-weight-medium);
}

/* ===== 日历单元格 ===== */
.cal-cell {
  padding-top: 8px;
  padding-bottom: 8px;
}

.cal-cell:not(:last-child) {
  border-right: 1px solid var(--color-border-light);
}

.cell-border-bottom {
  border-bottom: 1px solid var(--color-border-light);
}

.cell-date {
  font-size: var(--text-sm);
}

/* 今日 */
.cell-date-today {
  color: var(--color-surface);
  font-weight: var(--font-weight-bold);
  background: var(--color-training-main);
  border-radius: var(--radius-full);
  padding: 2px 6px;
  display: inline-block;
  min-width: 24px;
}

/* 当月（非今日、带训练） */
.cell-date-has-training {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

/* 当月（非今日、无训练）—— 未匹配到 cell-date-has-training 时的默认样式 */
/* 当月默认颜色为 color-primary，由下方 cell 默认样式覆盖 */

/* 选中日期 */
.cell-date-selected {
  background: var(--state-info-bg);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  display: inline-block;
}

/* 非当月 */
.cell-date-other-month {
  color: var(--color-border);
}

/* 圆点颜色 */
.cell-dot-completed { background: var(--state-success); }
.cell-dot-today { background: var(--color-training-main); }
.cell-dot-upcoming { background: var(--color-primary-light); }
.cell-dot-missed { background: var(--state-warning); }

/* ===== 图例 ===== */
.legend-dot-success { background: var(--state-success); }
.legend-dot-today { background: var(--color-training-main); }
.legend-dot-upcoming { background: var(--color-primary-light); }
.legend-dot-missed { background: var(--state-warning); }

.legend-label {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

/* ===== 选中日期详情面板 ===== */
.day-detail-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.day-detail-title {
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.day-detail-pill {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
}

.day-pill-rest {
  color: var(--color-primary-light);
  background: var(--color-primary-subtle);
}

.day-pill-completed {
  color: var(--state-success);
  background: var(--state-success-bg);
}

.day-pill-upcoming {
  color: var(--color-training-main);
  background: var(--state-info-bg);
}

.day-detail-content {
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--space-3);
}

.day-detail-workout {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.day-detail-exercises {
  font-size: var(--text-base);
  color: var(--color-primary-light);
  line-height: var(--leading-relaxed);
}

.day-detail-btn {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-training-main);
  background: var(--state-info-bg);
  border-radius: var(--radius-full);
}
</style>
