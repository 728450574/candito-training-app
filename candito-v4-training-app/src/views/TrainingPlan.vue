<template>
  <main class="min-h-screen max-w-lg mx-auto" style="background: var(--color-surface);">
    <header class="sticky top-0 z-30 flex h-11 items-center px-4" style="background: var(--color-surface)/95; backdrop-filter: blur(10px); border-bottom: 1px solid var(--color-border-light);">
      <button class="inline-flex h-8 w-8 items-center justify-center -ml-1" style="color: var(--color-training-main);" aria-label="返回" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </button>
      <div class="min-w-0 flex-1 text-center text-[17px] font-semibold tracking-[-0.02em]" style="color: var(--color-primary);">训练计划</div>
      <div class="w-8"></div>
    </header>

    <template v-if="displayCycle">
      <div class="mx-4 mt-4 rounded-lg px-4 py-2.5 flex items-center justify-between" style="background: var(--color-surface-muted);">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-medium whitespace-nowrap" style="color: var(--color-primary-light);">{{ route.query.cycleId ? '预览' : '当前' }}</span>
          <span class="text-sm font-semibold truncate" style="color: var(--color-primary);">第{{ displayCycle.weeks.length > 0 ? currentWeekNumber : '--' }}周 · {{ currentWeekTheme }}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0 ml-3">
          <span v-for="w in 6" :key="w" class="inline-block rounded-full" :class="w <= currentWeekNumber ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5'" :style="dotStyle(w)"></span>
        </div>
      </div>

      <div class="mt-4 overflow-x-auto no-scrollbar">
        <div class="flex flex-nowrap gap-1 px-4 min-w-min">
          <button v-for="w in 6" :key="w" class="shrink-0 whitespace-nowrap" :style="weekTabStyle(w)" @click="selectedWeek = w">
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
        <h2 class="text-base font-semibold mb-3 tracking-[-0.01em]" style="color: var(--color-primary);">第{{ selectedWeek }}周 · {{ selectedWeekTheme }}</h2>

        <div v-for="day in selectedWeekDays" :key="day.dayNumber" class="rounded-lg p-4 mb-3 border-l-[3px]" :style="dayCardStyle(day)" @click="handleDayClick(day)">
          <div class="flex items-center justify-between mb-3">
            <span class="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded-md" :style="dayBadgeStyle(day)">
              <template v-if="dayStatus(day) === 'completed'">
                <Check class="h-3 w-3" />
                已完成
              </template>
              <template v-else-if="dayStatus(day) === 'in-progress'">
                <span class="inline-block w-1.5 h-1.5 rounded-full" style="background: var(--state-info);"></span>
                进行中
              </template>
              <template v-else>
                待训练
              </template>
            </span>
            <span class="text-xs font-medium whitespace-nowrap" style="color: var(--color-primary-light);">{{ dayWeekdayLabel(day) }}</span>
          </div>
          <p class="text-sm font-semibold truncate mb-2" style="color: var(--color-primary);">{{ workoutTypeLabel(day.type) }}</p>
          <div class="space-y-2">
            <template v-for="(ex, exIdx) in dayExercisesDisplay(day)" :key="ex.id">
              <div v-if="exIdx > 0" style="height: 1px; background: var(--color-border-light);"></div>
              <div class="flex items-center justify-between text-sm">
                <span class="truncate min-w-0 flex-1 mr-2" :style="dayExerciseNameStyle(day)">{{ ex.name }}</span>
                <span class="font-mono font-semibold whitespace-nowrap shrink-0 text-sm" :style="dayExerciseWeightStyle(day)">{{ ex.weightDisplay }}</span>
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
        <button class="px-6 py-2 rounded-full" style="background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm); font-weight: var(--font-weight-semibold);" @click="goStart">创建训练周期</button>
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

function dotStyle(weekNum: number): Record<string, string> {
  if (weekNum <= currentWeekNumber.value) {
    return { background: 'var(--color-training-main)' }
  }
  return { background: 'var(--color-border)' }
}

function weekTabStyle(weekNum: number): Record<string, string> {
  if (weekCompleted(weekNum)) {
    return {
      color: 'var(--state-success)',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--font-weight-medium)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }
  }
  if (weekNum === selectedWeek.value) {
    return {
      color: 'var(--color-training-main)',
      padding: '8px 12px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--font-weight-semibold)',
      borderBottom: '2px solid var(--color-training-main)',
    }
  }
  return {
    color: 'var(--color-primary-light)',
    padding: '8px 12px',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-weight-medium)',
  }
}

function dayCardStyle(day: TrainingDay): Record<string, string> {
  const status = dayStatus(day)
  const base = {
    boxShadow: 'var(--shadow-elevated)',
    background: 'var(--color-surface)',
  }
  if (status === 'completed') {
    return { ...base, borderLeftColor: 'var(--state-success)' }
  }
  if (status === 'in-progress') {
    return { ...base, borderLeftColor: 'var(--color-training-main)' }
  }
  return { ...base, borderLeftColor: 'var(--color-border)' }
}

function dayBadgeStyle(day: TrainingDay): Record<string, string> {
  const status = dayStatus(day)
  if (status === 'completed') {
    return {
      color: 'var(--state-success)',
      background: 'var(--state-success-bg)',
    }
  }
  if (status === 'in-progress') {
    return {
      color: 'var(--state-info)',
      background: 'var(--state-info-bg)',
    }
  }
  return {
    color: 'var(--color-primary-light)',
    background: 'var(--color-primary-subtle)',
  }
}

function dayExerciseNameStyle(day: TrainingDay): Record<string, string> {
  const status = dayStatus(day)
  if (status === 'completed') {
    return { color: 'var(--color-primary-light)' }
  }
  return { color: 'var(--color-primary)' }
}

function dayExerciseWeightStyle(day: TrainingDay): Record<string, string> {
  const status = dayStatus(day)
  if (status === 'in-progress') {
    return { color: 'var(--color-training-main)' }
  }
  if (status === 'pending') {
    return { color: 'var(--color-primary-light)' }
  }
  return { color: 'var(--color-primary)' }
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
