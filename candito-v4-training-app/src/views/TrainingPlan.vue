<template>
  <main class="min-h-screen max-w-lg mx-auto plan-page">
    <header class="sticky top-0 z-30 flex h-11 items-center px-4 plan-header">
      <button class="inline-flex h-8 w-8 items-center justify-center -ml-1 header-back-btn" aria-label="返回" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </button>
      <div class="min-w-0 flex-1 text-center text-[17px] font-semibold tracking-[-0.02em] header-title">训练计划</div>
      <div class="w-8"></div>
    </header>

    <template v-if="displayCycle">
      <div class="mx-4 mt-4 rounded-lg px-4 py-2.5 flex items-center justify-between progress-bar">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-medium whitespace-nowrap progress-label">{{ route.query.cycleId ? '预览' : '当前' }}</span>
          <span class="text-sm font-semibold truncate progress-week">第{{ displayCycle.weeks.length > 0 ? currentWeekNumber : '--' }}周 · {{ currentWeekTheme }}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0 ml-3">
          <span
            v-for="w in 6"
            :key="w"
            class="inline-block rounded-full"
            :class="['dot-base', w <= currentWeekNumber ? 'dot-active' : 'dot-inactive']"
          ></span>
        </div>
      </div>

      <div class="mt-4 overflow-x-auto no-scrollbar">
        <div class="flex flex-nowrap gap-1 px-4 min-w-min">
          <button
            v-for="w in 6"
            :key="w"
            class="shrink-0 whitespace-nowrap"
            :class="weekTabClass(w)"
            @click="selectedWeek = w"
          >
            <template v-if="weekCompleted(w)">
              <Check class="h-3 w-3 inline-block" />
              W{{ w }}
            </template>
            <template v-else>
              W{{ w }}
            </template>
          </button>
        </div>
      </div>

      <section class="px-4 mt-4 pb-8">
        <h2 class="text-base font-semibold mb-3 tracking-[-0.01em] section-title">第{{ selectedWeek }}周 · {{ selectedWeekTheme }}</h2>

        <div
          v-for="day in selectedWeekDays"
          :key="day.dayNumber"
          class="rounded-lg p-4 mb-3 border-l-[3px]"
          :class="['day-card', 'day-card-' + dayStatus(day)]"
          @click="handleDayClick(day)"
        >
          <div class="flex items-center justify-between mb-3">
            <span
              class="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded-md"
              :class="['day-badge', 'day-badge-' + dayStatus(day)]"
            >
              <template v-if="dayStatus(day) === 'completed'">
                <Check class="h-3 w-3" />
                已完成
              </template>
              <template v-else-if="dayStatus(day) === 'in-progress'">
                <span class="inline-block w-1.5 h-1.5 rounded-full dot-info"></span>
                进行中
              </template>
              <template v-else>
                待训练
              </template>
            </span>
            <span class="text-xs font-medium whitespace-nowrap day-weekday">{{ dayWeekdayLabel(day) }}</span>
          </div>
          <p class="text-sm font-semibold truncate mb-2 workout-type"># {{ workoutTypeLabel(day.type) }}</p>
          <div class="space-y-2">
            <template v-for="(ex, exIdx) in dayExercisesDisplay(day)" :key="ex.id">
              <div v-if="exIdx > 0" class="exercise-separator"></div>
              <div class="flex items-center justify-between text-sm">
                <span
                  class="truncate min-w-0 flex-1 mr-2"
                  :class="dayStatus(day) === 'completed' ? 'ex-name-completed' : 'ex-name-default'"
                >{{ ex.name }}</span>
                <span
                  class="font-mono font-semibold whitespace-nowrap shrink-0 text-sm"
                  :class="['ex-weight', 'ex-weight-' + dayStatus(day)]"
                >{{ ex.weightDisplay }}</span>
              </div>
            </template>
          </div>
        </div>

        <div v-if="selectedWeekDays.length === 0" class="py-12 text-center">
          <p class="typography-caption">暂无训练安排</p>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">没有活跃的训练周期</p>
        <button class="px-6 py-2 rounded-full create-btn" @click="goStart">创建训练周期</button>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Check } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { getWeekday, getToday } from '@/services/dateService'
import type { TrainingDay, PlannedExercise, Week, Cycle } from '@/types/cycle'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()

const displayCycle = computed<Cycle | null>(() => {
  const cycleId = route.query.cycleId as string | undefined
  if (cycleId) {
    return cycleStore.getCycleById(cycleId) || null
  }
  return cycleStore.activeCycle
})

const selectedWeek = ref(displayCycle.value ? findCurrentWeekNumber() : 1)

function findCurrentWeekNumber(): number {
  if (!displayCycle.value) return 1
  const today = getToday()
  for (const week of displayCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === today) {
        return week.weekNumber
      }
    }
  }
  const firstIncomplete = displayCycle.value.weeks.find((w: Week) =>
    w.days.some((d: TrainingDay) => d.status === 'pending' && d.type !== 'rest')
  )
  return firstIncomplete?.weekNumber || 1
}

const currentWeekNumber = computed(() => {
  if (!displayCycle.value) return 1
  const today = getToday()
  for (const week of displayCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === today) {
        return week.weekNumber
      }
    }
  }
  const firstIncomplete = displayCycle.value.weeks.find((w: Week) =>
    w.days.some((d: TrainingDay) => d.status === 'pending' && d.type !== 'rest')
  )
  return firstIncomplete?.weekNumber || 1
})

const currentWeekTheme = computed(() => {
  if (!displayCycle.value) return ''
  const week = displayCycle.value.weeks.find((w: Week) => w.weekNumber === currentWeekNumber.value)
  return week?.theme || ''
})

const selectedWeekData = computed(() => {
  if (!displayCycle.value) return null
  return displayCycle.value.weeks.find((w: Week) => w.weekNumber === selectedWeek.value) || null
})

const selectedWeekTheme = computed(() => {
  return selectedWeekData.value?.theme || ''
})

const selectedWeekDays = computed(() => {
  if (!selectedWeekData.value) return []
  return selectedWeekData.value.days.filter((d: TrainingDay) => d.type !== 'rest')
})

function weekCompleted(weekNumber: number): boolean {
  if (!displayCycle.value) return false
  const week = displayCycle.value.weeks.find((w: Week) => w.weekNumber === weekNumber)
  if (!week) return false
  const trainingDays = week.days.filter((d: TrainingDay) => d.type !== 'rest')
  return trainingDays.length > 0 && trainingDays.every((d: TrainingDay) => d.status === 'completed')
}

function dayStatus(day: TrainingDay): 'completed' | 'in-progress' | 'pending' {
  if (day.status === 'completed') return 'completed'
  if (day.status === 'pending' && day.scheduledDate === getToday()) return 'in-progress'
  if (day.scheduledDate < getToday() && day.status === 'pending') return 'pending'
  return 'pending'
}

function dayExercisesDisplay(day: TrainingDay): { id: string; name: string; weightDisplay: string }[] {
  return day.exercises.slice(0, 3).map(ex => {
    const firstSet = ex.sets[0]
    let weightDisplay = '--'
    if (firstSet?.targetWeight) {
      weightDisplay = `${firstSet.targetWeight}kg`
    }
    return { id: ex.id, name: ex.name, weightDisplay }
  })
}

function dayWeekdayLabel(day: TrainingDay): string {
  return getWeekday(day.scheduledDate)
}

/**
 * 周Tab的CSS类（替代原来的 weekTabStyle 样式函数）
 * 根据完成/选中/默认三种状态返回不同的class
 */
function weekTabClass(weekNum: number): string[] {
  if (weekCompleted(weekNum)) {
    return ['week-tab', 'week-tab-completed']
  }
  if (weekNum === selectedWeek.value) {
    return ['week-tab', 'week-tab-selected']
  }
  return ['week-tab', 'week-tab-default']
}

function workoutTypeLabel(type: string): string {
  return type === 'lower' ? '下肢训练' : '上肢训练'
}

function handleDayClick(day: TrainingDay) {
  const status = dayStatus(day)
  if (status === 'completed') {
    router.push({
      name: 'training-detail',
      query: {
        week: selectedWeek.value,
        day: day.dayNumber,
        cycleId: displayCycle.value?.id,
      },
    })
  } else if (status === 'in-progress') {
    router.push({
      name: 'training-execute',
      query: {
        week: selectedWeek.value,
        day: day.dayNumber,
        cycleId: displayCycle.value?.id,
      },
    })
  } else {
    router.push({
      name: 'training-detail',
      query: {
        week: selectedWeek.value,
        day: day.dayNumber,
        cycleId: displayCycle.value?.id,
      },
    })
  }
}

function goBack() {
  router.back()
}

function goStart() {
  router.push('/start')
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.plan-page {
  background: var(--color-surface);
}

/* ===== 顶部导航栏 ===== */
.plan-header {
  background: var(--color-surface)/95;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border-light);
}

.header-back-btn {
  color: var(--color-training-main);
}

.header-title {
  color: var(--color-primary);
}

/* ===== 进度条 ===== */
.progress-bar {
  background: var(--color-surface-muted);
}

.progress-label {
  color: var(--color-primary-light);
}

.progress-week {
  color: var(--color-primary);
}

/* ===== 进度圆点 ===== */
.dot-base {
  width: 0.375rem;
  height: 0.375rem;
}

.dot-active {
  background: var(--color-training-main);
}

.dot-inactive {
  background: var(--color-border);
}

.dot-info {
  background: var(--state-info);
}

/* ===== 周Tab ===== */
.week-tab {
  padding: 8px 12px;
  font-size: var(--text-xs);
}

.week-tab-completed {
  color: var(--state-success);
  border-radius: 8px;
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
  gap: 4px;
}

.week-tab-selected {
  color: var(--color-training-main);
  font-weight: var(--font-weight-semibold);
  border-bottom: 2px solid var(--color-training-main);
}

.week-tab-default {
  color: var(--color-primary-light);
  font-weight: var(--font-weight-medium);
}

/* ===== 区域标题 ===== */
.section-title {
  color: var(--color-primary);
}

/* ===== 训练日卡片 ===== */
.day-card {
  box-shadow: var(--shadow-elevated);
  background: var(--color-surface);
}

.day-card-completed {
  border-left-color: var(--state-success);
}

.day-card-in-progress {
  border-left-color: var(--color-training-main);
}

.day-card-pending {
  border-left-color: var(--color-border);
}

/* ===== 训练日状态标签 ===== */
.day-badge-completed {
  color: var(--state-success);
  background: var(--state-success-bg);
}

.day-badge-in-progress {
  color: var(--state-info);
  background: var(--state-info-bg);
}

.day-badge-pending {
  color: var(--color-primary-light);
  background: var(--color-primary-subtle);
}

/* ===== 训练日星期标签 ===== */
.day-weekday {
  color: var(--color-primary-light);
}

/* ===== 训练类型标题 ===== */
.workout-type {
  color: var(--color-primary);
}

/* ===== 训练项分隔线 ===== */
.exercise-separator {
  height: 1px;
  background: var(--color-border-light);
}

/* ===== 训练动作名称 ===== */
.ex-name-completed {
  color: var(--color-primary-light);
}

.ex-name-default {
  color: var(--color-primary);
}

/* ===== 训练动作重量 ===== */
.ex-weight-completed {
  color: var(--color-primary);
}

.ex-weight-in-progress {
  color: var(--color-training-main);
}

.ex-weight-pending {
  color: var(--color-primary-light);
}

/* ===== 创建按钮 ===== */
.create-btn {
  background: var(--color-training-main);
  color: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
