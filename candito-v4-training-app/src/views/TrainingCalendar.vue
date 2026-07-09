<template>
  <main class="min-h-screen pb-24 max-w-lg mx-auto px-4" style="font-family: var(--font-sans);">
    <div class="h-11"></div>

    <header class="px-5 pt-2 pb-1">
      <h1 class="typography-hero" style="font-size: var(--text-2xl); letter-spacing: -0.01em;">训练日历</h1>
      <div class="flex items-center justify-between mt-3">
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-md" style="color: var(--color-primary-light);" aria-label="上个月" @click="prevMonth">
          <ChevronLeft style="width:18px; height:18px;" />
        </button>
        <h2 class="typography-subtitle" style="font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-md" style="color: var(--color-primary-light);" aria-label="下个月" @click="nextMonth">
          <ChevronRight style="width:18px; height:18px;" />
        </button>
      </div>
      <div class="flex justify-center mt-3" v-if="activeCycle">
        <span class="inline-flex items-center px-3 py-1 whitespace-nowrap" style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-training-main); background: var(--state-info-bg); border-radius: var(--radius-full);">{{ cycleStatusText }}</span>
      </div>
    </header>

    <section class="mx-5 mt-3 mb-1 px-2 py-2" style="background: rgba(255,255,255,0.72); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light);">
      <div class="grid grid-cols-7 text-center" style="gap: 0;">
        <div v-for="(day, idx) in weekRowDays" :key="idx" class="flex flex-col items-center py-1">
          <span class="truncate" style="font-size: var(--text-xs); color: var(--color-primary-light); line-height: 1;">{{ day.abbr }}</span>
          <span class="mt-1 truncate" :style="weekRowDateStyle(day)" :class="day.isToday ? 'inline-flex h-7 w-7 items-center justify-center rounded-full' : ''">{{ day.date }}</span>
          <span v-if="day.hasTraining" class="mt-0.5 h-1 w-1 rounded-full" :style="weekRowDotStyle(day)"></span>
        </div>
      </div>
    </section>

    <section class="mx-5 mt-2 px-1 pb-1" style="border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);">
      <div class="grid grid-cols-7 text-center py-2" style="border-bottom: 1px solid var(--color-border-light);">
        <span v-for="wd in weekdayHeaders" :key="wd" class="truncate" style="font-size: var(--text-xs); color: var(--color-primary-light); font-weight: var(--font-weight-medium);">{{ wd }}</span>
      </div>

      <div v-for="(row, rowIdx) in calendarRows" :key="rowIdx" class="grid grid-cols-7 text-center">
        <div v-for="(cell, cellIdx) in row" :key="cellIdx" class="flex flex-col items-center" :style="cellContainerStyle(rowIdx, cellIdx, row.length)" @click="selectDay(cell)">
          <span class="truncate" :style="cellDateStyle(cell)">{{ cell.day }}</span>
          <span v-if="cell.trainingStatus" class="mt-0.5 h-1.5 w-1.5 rounded-full" :style="cellDotStyle(cell)"></span>
        </div>
      </div>
    </section>

    <div class="flex items-center justify-center gap-4 mt-3 px-5">
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full" style="background: var(--state-success);"></span>
        <span class="truncate" style="font-size: var(--text-xs); color: var(--color-primary-light);">已完成</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full" style="background: var(--color-training-main);"></span>
        <span class="truncate" style="font-size: var(--text-xs); color: var(--color-primary-light);">今日</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full" style="background: var(--color-primary-light);"></span>
        <span class="truncate" style="font-size: var(--text-xs); color: var(--color-primary-light);">待训练</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full" style="background: var(--state-warning);"></span>
        <span class="truncate" style="font-size: var(--text-xs); color: var(--color-primary-light);">未完成</span>
      </div>
    </div>

    <section v-if="selectedDayInfo" class="mx-5 mt-4 p-4" style="background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="typography-subtitle" style="font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);">{{ selectedDayInfo.displayDate }}</h3>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 whitespace-nowrap" style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); border-radius: var(--radius-full);" :style="selectedDayPillStyle">{{ selectedDayInfo.statusLabel }}</span>
      </div>
      <div class="mt-3" style="border-top: 1px solid var(--color-border-light); padding-top: var(--space-3);">
        <template v-if="selectedDayInfo.workoutType">
          <div class="flex items-center gap-2">
            <span class="typography-body" style="font-size: var(--text-base); font-weight: var(--font-weight-semibold); color: var(--color-primary);">{{ selectedDayInfo.workoutType }} · W{{ selectedDayInfo.weekNum }}D{{ selectedDayInfo.dayNum }}</span>
          </div>
          <p class="mt-2 truncate" style="font-size: var(--text-base); color: var(--color-primary-light); line-height: var(--leading-relaxed);">{{ selectedDayInfo.exercisesSummary }}</p>
          <button class="mt-3 inline-flex items-center gap-1 px-3 py-1.5" style="font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-training-main); background: var(--state-info-bg); border-radius: var(--radius-full);" @click="goToDetail(selectedDayInfo)">
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

const selectedDayPillStyle = computed(() => {
  if (!selectedDayInfo.value) return {}
  return {
    color: selectedDayInfo.value.statusPillColor,
    background: selectedDayInfo.value.statusPillBg,
  }
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

function weekRowDateStyle(day: WeekRowDay): Record<string, string> {
  if (day.isToday) {
    return {
      fontSize: 'var(--text-sm)',
      color: 'var(--color-surface)',
      fontWeight: 'var(--font-weight-bold)',
      background: 'var(--color-training-main)',
    }
  }
  return {
    fontSize: 'var(--text-sm)',
    color: day.dateStr.startsWith(todayStr.slice(0, 7)) ? 'var(--color-primary)' : 'var(--color-border)',
    fontWeight: 'var(--font-weight-medium)',
  }
}

function weekRowDotStyle(day: WeekRowDay): Record<string, string> {
  if (day.isToday) return { background: 'var(--color-surface)' }
  if (day.trainingStatus === 'completed') return { background: 'var(--state-success)' }
  return { background: 'var(--color-primary-light)' }
}

function cellContainerStyle(rowIdx: number, cellIdx: number, totalCells: number): Record<string, string> {
  const isLastRow = rowIdx === calendarRows.value.length - 1
  const base: Record<string, string> = {
    paddingTop: '8px',
    paddingBottom: '8px',
  }
  if (!isLastRow) {
    base.borderBottom = '1px solid var(--color-border-light)'
  }
  if (cellIdx < totalCells - 1) {
    base.borderRight = '1px solid var(--color-border-light)'
  }
  return base
}

function cellDateStyle(cell: CalendarCell): Record<string, string> {
  const base: Record<string, string> = {
    fontSize: 'var(--text-sm)',
  }
  if (cell.isToday) {
    base.color = 'var(--color-surface)'
    base.fontWeight = 'var(--font-weight-bold)'
    base.background = 'var(--color-training-main)'
    base.borderRadius = 'var(--radius-full)'
    base.padding = '2px 6px'
    base.display = 'inline-block'
    base.minWidth = '24px'
  } else if (cell.isCurrentMonth) {
    base.color = 'var(--color-primary)'
    base.fontWeight = cell.trainingStatus ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)'
  } else {
    base.color = 'var(--color-border)'
  }
  if (selectedDate.value === cell.dateStr && !cell.isToday) {
    base.background = 'var(--state-info-bg)'
    base.borderRadius = 'var(--radius-sm)'
    base.padding = '2px 6px'
    base.display = 'inline-block'
  }
  return base
}

function cellDotStyle(cell: CalendarCell): Record<string, string> {
  switch (cell.trainingStatus) {
    case 'completed': return { background: 'var(--state-success)' }
    case 'today': return { background: 'var(--color-training-main)' }
    case 'upcoming': return { background: 'var(--color-primary-light)' }
    case 'missed': return { background: 'var(--state-warning)' }
    default: return {}
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
