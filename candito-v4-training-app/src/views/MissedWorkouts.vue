<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <div class="h-11"></div>

    <header class="flex items-center h-11 px-1 mb-2">
      <button class="inline-flex items-center justify-center w-8 h-8 -ml-1" style="color: var(--color-training-main);" aria-label="返回" @click="router.back()">
        <ChevronLeft class="w-5 h-5" />
      </button>
      <h1 class="flex-1 text-center font-semibold truncate" style="font-family: var(--font-sans); font-size: var(--text-md); color: var(--color-primary);">处理错过训练</h1>
      <div class="w-8"></div>
    </header>

    <template v-if="!activeCycle">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption">没有活跃的训练周期</p>
      </div>
    </template>

    <template v-else-if="missedDays.length === 0">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption">没有错过的训练日</p>
      </div>
    </template>

    <template v-else>
      <section class="px-1 mb-5">
        <div class="flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3" style="background: var(--state-warning-bg); border: 1px solid rgba(255, 159, 10, 0.15);">
          <Info class="w-5 h-5 shrink-0" style="color: var(--state-warning);" />
          <p class="font-medium" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--state-warning);">
            检测到 <span class="font-semibold">{{ missedDays.length }}</span> 个错过的训练日
          </p>
        </div>
      </section>

      <section class="px-1 mb-5 space-y-3">
        <div
          v-for="day in missedDays"
          :key="day.key"
          class="rounded-[var(--radius-lg)] p-4"
          style="background: var(--color-surface); box-shadow: var(--shadow-card);"
        >
          <div class="flex items-center justify-between mb-1.5">
            <h3 class="font-semibold truncate min-w-0 flex-1 mr-2" style="font-family: var(--font-sans); font-size: var(--text-base); color: var(--color-primary);">{{ day.label }} · {{ day.typeLabel }}</h3>
            <span class="inline-flex items-center shrink-0 rounded-[var(--radius-sm)] px-2 py-0.5 font-medium whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--state-warning); background: var(--state-warning-bg);">未完成</span>
          </div>
          <p style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">{{ day.dateDisplay }}</p>
          <div class="flex gap-2 mt-3">
            <button
              v-for="action in dayActionsConfig"
              :key="action.value"
              class="flex-1 rounded-[var(--radius-full)] py-1.5 text-center font-medium whitespace-nowrap transition-colors"
              :style="actionBtnStyle(day.key, action.value)"
              @click="selectAction(day.key, action.value)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </section>

      <section class="px-1 mb-5">
        <button
          class="w-full flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 mb-2 text-left"
          style="background: var(--color-surface); box-shadow: var(--shadow-card);"
          @click="travelSkipOpen = !travelSkipOpen"
        >
          <Briefcase class="w-5 h-5 shrink-0" style="color: var(--color-primary-light);" />
          <span class="flex-1 truncate font-medium" style="font-family: var(--font-sans); font-size: var(--text-base); color: var(--color-primary);">出差跳过</span>
          <ChevronDown class="w-4 h-4 shrink-0 transition-transform" :style="{ color: 'var(--color-primary-light)', transform: travelSkipOpen ? 'rotate(180deg)' : 'rotate(0deg)' }" />
        </button>

        <div v-if="travelSkipOpen" class="mb-2 rounded-[var(--radius-lg)] p-3" style="background: var(--color-surface); box-shadow: var(--shadow-card);">
          <p class="mb-2" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">选择跳过日期范围</p>
          <div class="flex items-center gap-3">
            <div class="flex-1 text-center">
              <p style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">开始</p>
              <p class="font-semibold mt-0.5" style="font-family: var(--font-sans); font-size: var(--text-base); color: var(--color-primary);">{{ travelStartDate }}</p>
            </div>
            <ArrowRight class="w-4 h-4 shrink-0" style="color: var(--color-primary-light);" />
            <div class="flex-1 text-center">
              <p style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">结束</p>
              <p class="font-semibold mt-0.5" style="font-family: var(--font-sans); font-size: var(--text-base); color: var(--color-primary);">{{ travelEndDate }}</p>
            </div>
          </div>
          <button
            class="w-full mt-3 rounded-[var(--radius-full)] py-2.5 text-center font-medium"
            style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-surface); background-color: var(--color-training-main);"
            @click="applyTravelSkip"
          >
            应用
          </button>
        </div>

        <button
          class="w-full flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 mb-2 text-left"
          style="background: var(--color-surface); box-shadow: var(--shadow-card);"
          @click="applyAllPostpone"
        >
          <ArrowRight class="w-5 h-5 shrink-0" style="color: var(--color-primary-light);" />
          <span class="flex-1 truncate font-medium" style="font-family: var(--font-sans); font-size: var(--text-base); color: var(--color-primary);">全部顺延</span>
          <ChevronRight class="w-4 h-4 shrink-0" style="color: var(--color-primary-light);" />
        </button>

        <button
          class="w-full flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-left"
          style="background: var(--color-surface); box-shadow: var(--shadow-card);"
          @click="applyAllSkip"
        >
          <X class="w-5 h-5 shrink-0" style="color: var(--color-primary-light);" />
          <span class="flex-1 truncate font-medium" style="font-family: var(--font-sans); font-size: var(--text-base); color: var(--color-primary);">全部跳过</span>
          <ChevronRight class="w-4 h-4 shrink-0" style="color: var(--color-primary-light);" />
        </button>
      </section>

      <section class="px-1 mb-4">
        <button
          class="w-full flex items-center justify-center rounded-[var(--radius-full)] px-6 py-3.5 font-semibold"
          style="font-family: var(--font-sans); font-size: var(--text-md); color: var(--color-surface); background-color: var(--color-training-main);"
          @click="handleConfirm"
        >
          确认处理
        </button>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronDown, ChevronRight, Info, Briefcase, ArrowRight, X } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { getToday, formatDate, diffDays, addDays } from '@/services/dateService'
import type { TrainingDay, Week } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()

const activeCycle = computed(() => cycleStore.activeCycle)

const todayStr = getToday()

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

const missedDays = computed<MissedDayInfo[]>(() => {
  if (!activeCycle.value) return []
  const days: MissedDayInfo[] = []
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.type === 'rest') continue
      if (day.status === 'pending' && day.scheduledDate < todayStr) {
        const diff = diffDays(day.scheduledDate, todayStr)
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
})

type DayAction = 'makeup' | 'skip' | 'postpone'

const dayActionsConfig = [
  { value: 'makeup' as DayAction, label: '补练' },
  { value: 'skip' as DayAction, label: '跳过' },
  { value: 'postpone' as DayAction, label: '顺延' },
]

const dayActions = ref<Record<string, DayAction>>({})

function selectAction(key: string, action: DayAction): void {
  dayActions.value[key] = action
}

function actionBtnStyle(key: string, action: DayAction) {
  const selected = dayActions.value[key]
  if (selected === action) {
    return {
      color: 'var(--color-surface)',
      background: 'var(--color-training-main)',
    }
  }
  return {
    color: 'var(--color-primary)',
    background: 'var(--color-surface-muted)',
  }
}

const travelSkipOpen = ref(false)

const travelStartDate = ref(missedDays.value.length > 0 ? missedDays.value[0].date : formatDate(todayStr))
const travelEndDate = ref(formatDate(todayStr))

function applyTravelSkip(): void {
  for (const day of missedDays.value) {
    dayActions.value[day.key] = 'skip'
  }
  travelSkipOpen.value = false
}

function applyAllPostpone(): void {
  for (const day of missedDays.value) {
    dayActions.value[day.key] = 'postpone'
  }
}

function applyAllSkip(): void {
  for (const day of missedDays.value) {
    dayActions.value[day.key] = 'skip'
  }
}

function handleConfirm(): void {
  if (!activeCycle.value) return

  const updatedWeeks: Week[] = activeCycle.value.weeks.map(week => {
    return {
      ...week,
      days: week.days.map(day => {
        const actionKey = `W${week.weekNumber}D${day.dayNumber}`
        const action = dayActions.value[actionKey]
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

  cycleStore.updateCycle(activeCycle.value.id, { weeks: updatedWeeks })
  router.back()
}
</script>
