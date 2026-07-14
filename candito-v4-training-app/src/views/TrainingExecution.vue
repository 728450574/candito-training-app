<template>
  <main class="min-h-screen max-w-lg mx-auto" style="background: var(--color-surface);">
    <!-- Top Navigation Bar -->
    <header
      class="sticky top-0 z-30 flex h-12 items-center justify-between px-4"
      style="background: var(--color-surface); border-bottom: 1px solid var(--color-border-light);"
    >
      <button
        class="inline-flex h-8 w-8 items-center justify-center"
        style="color: var(--color-training-main);"
        aria-label="返回今日"
        @click="goBack"
      >
        <ChevronLeft class="h-5 w-5" />
      </button>
      <h1
        class="min-w-0 flex-1 text-center truncate px-2"
        style="font-family: var(--font-sans); font-size: var(--text-base); font-weight: var(--font-weight-semibold); color: var(--color-primary); letter-spacing: -0.01em;"
      >
        {{ pageTitle }}
      </h1>
      <button
        class="inline-flex h-8 w-8 items-center justify-center"
        style="color: var(--color-primary-light);"
        aria-label="暂停训练"
      >
        <PauseIcon class="h-5 w-5" />
      </button>
    </header>

    <template v-if="loading">
      <div class="flex items-center justify-center py-20">
        <p class="typography-caption">加载中...</p>
      </div>
    </template>

    <template v-else-if="errorMsg">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-body mb-4">{{ errorMsg }}</p>
        <button
          class="px-6 py-2 rounded-full"
          style="background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm); font-weight: var(--font-weight-semibold);"
          @click="goBack"
        >
          返回今日
        </button>
      </div>
    </template>

    <template v-else>
      <div ref="swipeContainer">

      <!-- Timer Bar -->
      <section class="px-4 pt-5 pb-4">
        <div class="flex items-end justify-between">
          <div>
            <p
              class="whitespace-nowrap"
              style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-primary-light); letter-spacing: 0.04em; text-transform: uppercase;"
            >
              训练时长
            </p>
            <p
              class="whitespace-nowrap"
              style="font-family: var(--font-mono); font-size: var(--text-4xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.03em; line-height: var(--leading-tight);"
            >
              {{ timer.elapsedFormatted.value }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="15" stroke-width="3" style="stroke: var(--color-border-light);" />
              <circle
                cx="18" cy="18" r="15"
                stroke-width="3"
                stroke-linecap="round"
                :style="restCircleStyle"
              />
            </svg>
            <div>
              <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">组间休息</p>
              <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);">
                {{ timer.isResting.value ? timer.restFormatted.value : '--:--' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="px-4 pb-4" v-if="currentExercise">
        <!-- Exercise Header -->
        <div class="flex items-center gap-2 mb-1">
          <h2
            class="whitespace-nowrap truncate"
            style="font-family: var(--font-sans); font-size: var(--text-2xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em; line-height: var(--leading-tight);"
          >
            {{ currentExercise.name }}
          </h2>
          <span
            class="inline-flex items-center whitespace-nowrap shrink-0"
            :style="typeBadgeStyle(currentExercise.type)"
          >
            {{ typeLabel(currentExercise.type) }}
          </span>
        </div>

        <template v-if="currentExercise.type === 'main'">
          <p class="whitespace-nowrap mb-4" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">
            第 {{ currentSetDisplayIndex }} 组 / 共 {{ currentExercise.sets.length }} 组
          </p>
          <!-- Target (main only) -->
          <div
            class="flex items-center gap-2 mb-4 px-3 py-2"
            style="background: var(--color-surface-muted); border-radius: var(--radius-md);"
          >
            <Target class="h-4 w-4" style="color: var(--color-primary-light);" />
            <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">目标:</p>
            <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-primary);">
              {{ currentSet?.targetWeight ?? '--' }}kg
            </p>
            <span style="color: var(--color-primary-light);">×</span>
            <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-primary);">
              {{ currentSet?.isAMRAP ? 'AMRAP' : (currentSet?.targetReps ?? '--') }}次
            </p>
          </div>
        </template>
        <template v-else>
          <p class="whitespace-nowrap mb-4" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">
            第 {{ currentSetDisplayIndex }} 组 / 共 {{ currentExercise.sets.length }} 组
          </p>
        </template>

        <!-- Weight Input -->
        <div class="mb-4">
          <label class="block mb-2 whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-primary-light);">实际重量 (kg)</label>
          <div class="flex items-baseline gap-1 px-1 pb-2" style="border-bottom: 2px solid var(--color-primary);">
            <input
              type="number"
              :value="inputWeight"
              @input="onWeightInput"
              inputmode="decimal"
              class="w-full bg-transparent outline-none"
              style="font-family: var(--font-mono); font-size: var(--text-4xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.03em; line-height: var(--leading-tight);"
              aria-label="重量输入"
            />
            <span class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-lg); font-weight: var(--font-weight-medium); color: var(--color-primary-light);">kg</span>
          </div>
        </div>

        <!-- Reps Selection -->
        <div class="mb-5">
          <label class="block mb-2 whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-primary-light);">完成次数</label>
          <div class="flex gap-2">
            <button
              v-for="rep in repOptions"
              :key="rep"
              class="inline-flex items-center justify-center whitespace-nowrap"
              :style="repButtonStyle(rep)"
              @click="selectRep(rep)"
            >
              {{ rep }}
            </button>
          </div>
        </div>

        <!-- Complete Set CTA -->
        <button
          class="flex items-center justify-center w-full whitespace-nowrap"
          style="font-family: var(--font-sans); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-surface); background: var(--state-success); height: 52px; border-radius: var(--radius-lg);"
          @click="completeCurrentSet"
        >
          <Check class="h-5 w-5 mr-2" />
          完成本组
        </button>
      </section>

      <!-- Exercise Set List -->
      <section class="px-4 pb-4" v-if="currentExercise">
        <div class="flex flex-col gap-2">
          <div
            v-for="(set, idx) in currentExerciseSetsDisplay"
            :key="idx"
            class="flex items-center gap-3 px-3 py-3"
            :style="setRowStyle(set)"
          >
            <!-- Set number circle -->
            <div
              class="inline-flex items-center justify-center shrink-0"
              :style="setCircleStyle(set)"
            >
              <template v-if="set.isCompleted">
                <Check class="h-3 w-3" :style="{ color: 'var(--color-primary-light)' }" />
              </template>
              <template v-else-if="set.isCurrent">
                <span class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--font-weight-bold); color: var(--color-surface);">{{ set.displayNumber }}</span>
              </template>
              <template v-else>
                <span class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light);">{{ set.displayNumber }}</span>
              </template>
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate" :style="setLabelStyle(set)">第 {{ set.displayNumber }} 组</p>
            </div>
            <p class="whitespace-nowrap" :style="setValueStyle(set)">{{ set.displayWeight }}kg × {{ set.displayReps }}</p>
          </div>
        </div>
      </section>

      <!-- MR10 Dynamic Notice (Week 2 only) -->
      <div
        v-if="showMR10Notice"
        class="mx-5 mt-4 mb-4 p-3 rounded-lg"
        style="background: var(--state-info-bg); border: 1px solid rgba(0,122,255,0.15);"
      >
        <div class="flex items-start gap-2">
          <Info style="width: 14px; height: 14px; color: var(--state-info); flex-shrink: 0; margin-top: 1px;" />
          <div>
            <p style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);">MR10 动态调整</p>
            <p v-if="isWeek2Day1" style="font-size: var(--text-xs); color: var(--color-primary-light); margin-top: 2px;">
              MR10 完成 <span style="font-weight: var(--font-weight-semibold); color: var(--color-training-main);">{{ mr10TotalReps }}次</span>，加量组将执行 <span style="font-weight: var(--font-weight-semibold); color: var(--color-training-main);">5组×3次</span> @ {{ mr10LoadingWeight }}kg
            </p>
            <p v-else-if="isWeek2Day3" style="font-size: var(--text-xs); color: var(--color-primary-light); margin-top: 2px;">
              MR10 完成 <span style="font-weight: var(--font-weight-semibold); color: var(--color-training-main);">{{ mr10TotalReps }}次</span>，减量组将执行 <span style="font-weight: var(--font-weight-semibold); color: var(--color-training-main);">{{ mr10Result.sets }}组×3次</span>
            </p>
            <p v-if="isWeek2Day3" style="font-size: var(--text-xs); color: var(--color-primary-light); margin-top: 1px;">10次→10组 | 8-9次→8组 | 7次→5组 | &lt;7次→跳过并降低1RM</p>
          </div>
        </div>
      </div>

      <!-- Up Next Preview -->
      <section class="px-4 pb-8" v-if="nextExercise">
        <div
          class="flex items-center justify-between px-3 py-3"
          style="background: var(--color-surface-muted); border-radius: var(--radius-md);"
        >
          <div class="flex items-center gap-2">
            <ArrowDownCircle class="h-4 w-4" style="color: var(--color-primary-light);" />
            <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary-light);">下一个动作</p>
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <p class="truncate" style="font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-primary);">{{ nextExercise.name }}</p>
            <span
              class="inline-flex items-center whitespace-nowrap shrink-0"
              :style="typeBadgeStyle(nextExercise.type)"
            >
              {{ typeLabel(nextExercise.type) }}
            </span>
          </div>
        </div>
        <div class="mt-1 flex justify-end px-1">
          <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary-light);">
            {{ nextExercise.targetRepsDisplay }}
          </p>
        </div>
      </section>

      <!-- All exercises completed placeholder -->
      <section class="px-4 pb-4" v-if="allExercisesDone">
        <div class="flex flex-col items-center py-6">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style="background: var(--state-success-bg);"
          >
            <CheckCircle class="h-6 w-6" style="color: var(--state-success);" />
          </div>
          <p class="typography-subtitle">所有动作已完成</p>
          <p class="typography-caption mt-1">点击下方按钮完成训练</p>
        </div>
      </section>

      <!-- Complete Workout Button -->
      <div class="px-5 pb-6 mt-4">
        <button
          class="w-full flex items-center justify-center py-3.5"
          :style="{
            background: allExercisesDone ? 'var(--state-success)' : 'var(--color-border-light)',
            color: allExercisesDone ? 'var(--color-surface)' : 'var(--color-primary-light)',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            fontWeight: 'var(--font-weight-semibold)',
          }"
          :disabled="!allExercisesDone"
          @click="finishWorkout"
        >
          <CheckCircle style="width: 18px; height: 18px; margin-right: 6px;" />
          完成训练
        </button>
      </div>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { ChevronLeft, Pause as PauseIcon, Target, Check, Info, ArrowDownCircle, CheckCircle } from 'lucide-vue-next'
import { v4 as uuid } from 'uuid'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTimer } from '@/composables/useTimer'
import { useSwipe } from '@/composables/useSwipe'
import { getToday } from '@/services/dateService'
import type { PlannedExercise, TrainingDay } from '@/types/cycle'
import type { ExerciseRecord, WorkoutRecord } from '@/types/record'

const DRAFT_PREFIX = 'candito_draft_'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()
const settingsStore = useSettingsStore()
const timer = useTimer()
const swipeContainer = ref<HTMLElement | null>(null)

useSwipe(
  swipeContainer,
  {
    onSwipeLeft: () => {
      if (currentExerciseIndex.value < exercises.value.length - 1) {
        currentExerciseIndex.value++
        currentSetIndex.value = 0
        initInputsForCurrentSet()
      }
    },
    onSwipeRight: () => {
      router.back()
    },
  },
)

timer.defaultRestSeconds.value = settingsStore.settings.defaultRestSeconds

const draftKey = ref('')

function saveDraft(): void {
  if (!draftKey.value) return
  const data = {
    exercises: exercises.value,
    currentExerciseIndex: currentExerciseIndex.value,
    currentSetIndex: currentSetIndex.value,
    inputWeight: inputWeight.value,
    inputReps: inputReps.value,
    startTime: startTime.value,
    mr10TotalReps: mr10TotalReps.value,
    mr10Calculated: mr10Calculated.value,
    mr10LoadingWeight: mr10LoadingWeight.value,
    elapsedSeconds: timer.elapsedSeconds.value,
    isResting: timer.isResting.value,
    restSecondsLeft: timer.restSeconds.value,
    defaultRestSeconds: timer.defaultRestSeconds.value,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(draftKey.value, JSON.stringify(data))
  } catch { /* quota exceeded */ }
}

function handleBeforeUnload(): void {
  saveDraft()
}
window.addEventListener('beforeunload', handleBeforeUnload)

function loadDraft(): boolean {
  if (!draftKey.value) return false
  try {
    const raw = localStorage.getItem(draftKey.value)
    if (!raw) return false
    const data = JSON.parse(raw)

    // Migration: old format drafts (before rest fields were added) → discard
    if (data.restSecondsLeft === undefined) {
      localStorage.removeItem(draftKey.value)
      return false
    }

    if (!Array.isArray(data.exercises)) return false

    exercises.value = data.exercises
    currentExerciseIndex.value = data.currentExerciseIndex ?? 0
    currentSetIndex.value = data.currentSetIndex ?? 0
    inputWeight.value = data.inputWeight ?? 0
    inputReps.value = data.inputReps ?? 0
    startTime.value = data.startTime ?? new Date().toISOString()
    mr10TotalReps.value = data.mr10TotalReps ?? 0
    mr10Calculated.value = data.mr10Calculated ?? false
    mr10LoadingWeight.value = data.mr10LoadingWeight ?? 0

    if (data.elapsedSeconds > 0) {
      timer.elapsedSeconds.value = data.elapsedSeconds
    }
    const secondsAway = data.savedAt ? Math.floor((Date.now() - data.savedAt) / 1000) : 0
    if (secondsAway > 0) {
      timer.elapsedSeconds.value += secondsAway
    }

    // Restore rest timer — check if rest was active when saved
    const wasResting = data.isResting === true
    const hadRestTime = (data.restSecondsLeft ?? 0) > 0
    if (wasResting || hadRestTime) {
      const restDuration = data.defaultRestSeconds || 90
      const remaining = Math.max(0, (data.restSecondsLeft ?? restDuration) - secondsAway)
      if (remaining > 0) {
        timer.startRest(remaining)
      }
    }

    return true
  } catch {
    return false
  }
}

function clearDraft(): void {
  if (!draftKey.value) return
  try {
    localStorage.removeItem(draftKey.value)
  } catch { /* ignore */ }
}

let saveInterval: ReturnType<typeof setInterval> | null = null

interface MutableSet {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  isAMRAP?: boolean
  actualWeight: number
  actualReps: number
  isCompleted: boolean
  isSkipped: boolean
  restSeconds?: number
}

interface MutableExercise {
  id: string
  name: string
  type: 'main' | 'assistance' | 'optional'
  sets: MutableSet[]
}

const loading = ref(true)
const errorMsg = ref('')
const exercises = ref<MutableExercise[]>([])
const currentExerciseIndex = ref(0)
const currentSetIndex = ref(0)
const inputWeight = ref<number>(0)
const inputReps = ref<number>(0)
const startTime = ref<string>('')

const weekNum = computed(() => {
  const w = route.query.week
  return w ? Number(w) : NaN
})

const dayNum = computed(() => {
  const d = route.query.day
  return d ? Number(d) : NaN
})

const cycleId = computed(() => {
  return (route.query.cycleId as string) || null
})

const dayData = computed<TrainingDay | null>(() => {
  const cycle = cycleId.value
    ? cycleStore.getCycleById(cycleId.value)
    : cycleStore.activeCycle
  if (!cycle) return null
  for (const week of cycle.weeks) {
    if (week.weekNumber === weekNum.value) {
      for (const day of week.days) {
        if (day.dayNumber === dayNum.value) {
          return day
        }
      }
    }
  }
  return null
})

const currentExercise = computed(() => {
  if (currentExerciseIndex.value >= exercises.value.length) return null
  return exercises.value[currentExerciseIndex.value] ?? null
})

const currentSet = computed(() => {
  if (!currentExercise.value) return null
  const sets = currentExercise.value.sets
  if (currentSetIndex.value >= sets.length) return null
  return sets[currentSetIndex.value] ?? null
})

const currentSetDisplayIndex = computed(() => {
  if (!currentSet.value) return 0
  return currentSet.value.setNumber
})

const allExercisesDone = computed(() => {
  return exercises.value.length > 0 && exercises.value.every(ex =>
    ex.sets.every(s => s.isCompleted)
  )
})

const nextExercise = computed(() => {
  if (!currentExercise.value) return null
  const nextIdx = currentExerciseIndex.value + 1
  if (nextIdx >= exercises.value.length) return null
  const ex = exercises.value[nextIdx]
  const totalSets = ex.sets.length
  const repsSample = ex.sets[0]?.targetReps ?? ''
  return {
    name: ex.name,
    type: ex.type,
    targetRepsDisplay: `${repsSample} × ${totalSets}组`,
  }
})

const pageTitle = computed(() => {
  if (!dayData.value) return '训练'
  const typeLabelMap: Record<string, string> = { lower: '下肢训练', upper: '上肢训练' }
  const typeName = typeLabelMap[dayData.value.type] || '训练'
  return `${typeName} · W${weekNum.value}D${dayNum.value}`
})

const isWeek2 = computed(() => weekNum.value === 2)
const isWeek2Day1 = computed(() => weekNum.value === 2 && dayNum.value === 1)
const isWeek2Day3 = computed(() => weekNum.value === 2 && dayNum.value === 3)

const repOptions = computed(() => {
  if (!currentSet.value) return [5, 6, 7, 8, 9]
  const repStr = currentSet.value.targetReps ?? '6'
  let center: number
  if (repStr === 'MR10') {
    center = 10
  } else {
    const parsed = parseInt(repStr, 10)
    center = isNaN(parsed) ? 6 : parsed
  }
  const options: number[] = []
  for (let i = Math.max(1, center - 2); i <= center + 2; i++) {
    options.push(i)
  }
  return options.length >= 3 ? options : [center]
})

const currentExerciseSetsDisplay = computed(() => {
  if (!currentExercise.value) return []
  return currentExercise.value.sets.map((s, idx) => ({
    ...s,
    displayNumber: s.setNumber,
    isCurrent: idx === currentSetIndex.value && !s.isCompleted,
    displayWeight: s.actualWeight || s.targetWeight || '--',
    displayReps: s.actualReps || s.targetReps || '--',
  }))
})

// MR10
const mr10TotalReps = ref(0)
const mr10Calculated = ref(false)
const mr10LoadingWeight = ref(0)

const mr10Result = computed(() => {
  const reps = mr10TotalReps.value
  if (reps >= 10) return { sets: 10, reps: 3 }
  if (reps >= 8) return { sets: 8, reps: 3 }
  if (reps >= 7) return { sets: 5, reps: 3 }
  return { sets: 0, reps: 0 }
})

const showMR10Notice = computed(() => {
  return isWeek2.value && mr10Calculated.value
})

// Rest circle
const restCircleStyle = computed(() => {
  const circumference = 2 * Math.PI * 15
  const defaultRest = timer.defaultRestSeconds.value
  const remaining = defaultRest > 0 ? timer.restSeconds.value / defaultRest : 0
  const dash = Math.max(0, circumference * remaining)
  return {
    stroke: 'var(--color-training-main)',
    strokeDasharray: `${dash} ${circumference}`,
    transform: 'rotate(-90deg)',
    transformOrigin: 'center',
  }
})

function typeBadgeStyle(type: string) {
  if (type === 'main') {
    return {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-training-main)',
      background: 'var(--state-info-bg)',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
    }
  }
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-training-assist)',
    background: 'rgba(94, 92, 230, 0.08)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
  }
}

function typeLabel(type: string): string {
  if (type === 'main') return '主项'
  if (type === 'assistance') return '辅助项'
  return '补充项'
}

function repButtonStyle(rep: number) {
  const isSelected = inputReps.value === rep
  if (isSelected) {
    return {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-surface)',
      background: 'var(--color-training-main)',
      width: '48px',
      height: '48px',
      borderRadius: 'var(--radius-md)',
    }
  }
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-md)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-primary-light)',
    background: 'var(--color-surface-muted)',
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-md)',
  }
}

function setRowStyle(set: any) {
  if (set.isCompleted) {
    return {
      background: 'var(--color-surface-muted)',
      borderRadius: 'var(--radius-md)',
    }
  }
  if (set.isCurrent) {
    return {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-training-main)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 0 0 1px var(--color-training-main)',
    }
  }
  return {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-light)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
  }
}

function setCircleStyle(set: any) {
  if (set.isCompleted) {
    return {
      width: '22px',
      height: '22px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--color-border-light)',
    }
  }
  if (set.isCurrent) {
    return {
      width: '22px',
      height: '22px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--color-training-main)',
    }
  }
  return {
    width: '22px',
    height: '22px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid var(--color-border)',
  }
}

function setLabelStyle(set: any) {
  if (set.isCompleted) {
    return {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-weight-medium)',
      color: 'var(--color-primary-light)',
      textDecoration: 'line-through',
    }
  }
  if (set.isCurrent) {
    return {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-primary)',
    }
  }
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-primary-light)',
  }
}

function setValueStyle(set: any) {
  if (set.isCompleted) {
    return {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-primary-light)',
      textDecoration: 'line-through',
    }
  }
  if (set.isCurrent) {
    return {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-training-main)',
    }
  }
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-primary-light)',
  }
}

function roundWeight(value: number): number {
  const rounding = 2.5
  return Math.round(value / rounding) * rounding
}

function onWeightInput(e: Event) {
  const target = e.target as HTMLInputElement
  inputWeight.value = target.value ? Number(target.value) : 0
}

function selectRep(rep: number) {
  inputReps.value = rep
}

function advanceToNextSet(): void {
  if (!currentExercise.value) return
  const nextSetIdx = currentSetIndex.value + 1
  if (nextSetIdx < currentExercise.value.sets.length) {
    currentSetIndex.value = nextSetIdx
    initInputsForCurrentSet()
  } else {
    const nextExIdx = currentExerciseIndex.value + 1
    if (nextExIdx < exercises.value.length) {
      currentExerciseIndex.value = nextExIdx
      currentSetIndex.value = 0
      initInputsForCurrentSet()
    }
  }
}



function completeCurrentSet() {
  if (!currentExercise.value || !currentSet.value) return
  const set = currentSet.value
  set.actualWeight = inputWeight.value
  set.actualReps = inputReps.value
  set.isCompleted = true
  set.restSeconds = timer.restSeconds.value

  // Start rest timer
  timer.startRest()

  // Check MR10 for week 2 — trigger on AMRAP set completion
  if (isWeek2.value && currentExercise.value.name === '深蹲' && currentSet.value.isAMRAP && !mr10Calculated.value) {
    const reps = inputReps.value
    mr10TotalReps.value = reps
    mr10Calculated.value = true

    const ex = currentExercise.value
    const amrapSetNum = currentSet.value.setNumber
    const amrapWeight = inputWeight.value

    if (isWeek2Day1.value) {
      // Day 1: 加量组 — always 5 sets x 3 reps
      let loadingWeight: number
      if (reps >= 8) {
        loadingWeight = roundWeight(amrapWeight + 2.5)
      } else {
        loadingWeight = roundWeight(amrapWeight * 0.975)
      }
      mr10LoadingWeight.value = loadingWeight
      const loadingSets: MutableSet[] = []
      for (let i = 0; i < 5; i++) {
        loadingSets.push({
          setNumber: amrapSetNum + 1 + i,
          targetWeight: loadingWeight,
          targetReps: '3',
          actualWeight: loadingWeight,
          actualReps: 3,
          isCompleted: false,
          isSkipped: false,
        })
      }
      ex.sets.push(...loadingSets)
    } else if (isWeek2Day3.value) {
      // Day 3: 减量组 — based on reps
      if (reps >= 7) {
        const totalSets = mr10Result.value.sets
        const unloadingWeight = roundWeight(amrapWeight - 5)
        const unloadingSets: MutableSet[] = []
        for (let i = 0; i < totalSets; i++) {
          unloadingSets.push({
            setNumber: amrapSetNum + 1 + i,
            targetWeight: unloadingWeight,
            targetReps: '3',
            actualWeight: unloadingWeight,
            actualReps: 3,
            isCompleted: false,
            isSkipped: false,
          })
        }
        ex.sets.push(...unloadingSets)
      } else {
        // <7 reps: skip, prompt user to lower future 1RM
        alert('MR10 少于7次，已跳过减量组。建议将后续训练周期的1RM调低至少2.5%。')
      }
    }
  }

  // Auto-save draft after each set
  saveDraft()

  advanceToNextSet()
}

function initInputsForCurrentSet() {
  if (!currentSet.value) return
  const set = currentSet.value
  // If no targetWeight, inherit from last completed set in this exercise
  if (set.targetWeight != null) {
    inputWeight.value = set.targetWeight
  } else if (currentExercise.value) {
    const lastCompleted = [...currentExercise.value.sets].reverse().find(s => s.isCompleted && s.actualWeight > 0)
    inputWeight.value = lastCompleted ? lastCompleted.actualWeight : 0
  } else {
    inputWeight.value = 0
  }
  const parsed = parseInt(set.targetReps ?? '6', 10)
  inputReps.value = isNaN(parsed) ? 6 : parsed
}

function finishWorkout() {
  if (!allExercisesDone.value) return
  if (!dayData.value) return

  timer.stop()

  const cycle = cycleId.value
    ? cycleStore.getCycleById(cycleId.value)
    : cycleStore.activeCycle
  if (!cycle) return

  const now = new Date().toISOString()
  const todayStr = getToday()

  const exerciseRecords: ExerciseRecord[] = exercises.value.map(ex => ({
    exerciseId: ex.id,
    name: ex.name,
    type: ex.type,
    sets: ex.sets.map(s => ({
      setNumber: s.setNumber,
      targetWeight: s.targetWeight,
      targetReps: s.targetReps,
      actualWeight: s.actualWeight,
      actualReps: s.actualReps,
      isCompleted: s.isCompleted,
      isSkipped: s.isSkipped,
      restSeconds: s.restSeconds,
    })),
  }))

  const record: WorkoutRecord = {
    id: uuid(),
    cycleId: cycle.id,
    weekNumber: weekNum.value,
    dayNumber: dayNum.value,
    date: todayStr,
    originalDate: dayData.value.originalDate,
    scheduledDate: dayData.value.scheduledDate,
    isRescheduled: dayData.value.originalDate !== dayData.value.scheduledDate,
    startTime: startTime.value,
    endTime: now,
    duration: timer.elapsedSeconds.value,
    exercises: exerciseRecords,
    notes: '',
    feeling: 3,
    status: 'completed',
    mr10TotalReps: mr10Calculated.value ? mr10TotalReps.value : undefined,
  }

  clearDraft()
  recordStore.addRecord(record)

  // Update cycle day status
  const updatedWeeks = cycle.weeks.map(week => {
    if (week.weekNumber !== weekNum.value) return week
    return {
      ...week,
      days: week.days.map(day => {
        if (day.dayNumber !== dayNum.value) return day
        return { ...day, status: 'completed' as const, completedDate: todayStr }
      }),
    }
  })

  // Week 5 completion check — navigate directly to week6 decision
  if (weekNum.value === 5) {
    const week5 = updatedWeeks.find(w => w.weekNumber === 5)
    const week5Done = week5 && week5.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
    if (week5Done) {
      cycleStore.updateCycle(cycle.id, { weeks: updatedWeeks, status: 'week6_pending' })
      router.push({ name: 'week6', query: { cycleId: cycle.id } })
      return
    }
  }

  // Week 6 completion check — navigate to start new cycle
  if (weekNum.value === 6) {
    const week6 = updatedWeeks.find(w => w.weekNumber === 6)
    const week6Done = week6 && week6.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
    if (week6Done) {
      const decision = cycle.week6Decision
      const estimated = cycle.estimated1RM
      const query: Record<string, string> = {}
      // 携带预估1RM跳转到创建页, 用户可在此基础上调整
      if (estimated && (decision === 'deload' || decision === 'test_1rm')) {
        if (estimated.squat) query.squat = String(estimated.squat)
        if (estimated.bench) query.bench = String(estimated.bench)
        if (estimated.deadlift) query.deadlift = String(estimated.deadlift)
      }
      cycleStore.updateCycle(cycle.id, { weeks: updatedWeeks, status: 'completed', completedAt: todayStr })
      router.push({ name: 'start', query })
      return
    }
  }

  cycleStore.updateCycle(cycle.id, { weeks: updatedWeeks })

  router.push({
    name: 'training-complete',
    query: {
      week: weekNum.value,
      day: dayNum.value,
      cycleId: cycle.id,
    },
  })
}

function goBack() {
  saveDraft()
  router.push('/today')
}

onMounted(() => {
  if (isNaN(weekNum.value) || isNaN(dayNum.value)) {
    errorMsg.value = '无效的训练参数'
    loading.value = false
    return
  }

  const cycle = cycleId.value
    ? cycleStore.getCycleById(cycleId.value)
    : cycleStore.activeCycle

  if (!cycle) {
    errorMsg.value = '未找到训练周期'
    loading.value = false
    return
  }

  if (!dayData.value) {
    errorMsg.value = '未找到该训练日'
    loading.value = false
    return
  }

  // Set draft key once — don't use computed, route may change before unmount
  draftKey.value = `${DRAFT_PREFIX}${cycle.id}_${weekNum.value}_${dayNum.value}`

  // Try restoring draft first
  const restored = loadDraft()
  if (restored) {
    startTime.value = startTime.value || new Date().toISOString()
    timer.start()
    initInputsForCurrentSet()
    loading.value = false
    return
  }

  // Build mutable exercise list
  exercises.value = dayData.value.exercises.map((ex: PlannedExercise) => ({
    id: ex.id,
    name: ex.name,
    type: ex.type,
    sets: ex.sets.map((s) => ({
      setNumber: s.setNumber,
      targetWeight: s.targetWeight,
      targetReps: s.targetReps,
      isAMRAP: s.isAMRAP,
      actualWeight: s.targetWeight ?? 0,
      actualReps: parseInt(s.targetReps ?? '6', 10) || 0,
      isCompleted: false,
      isSkipped: false,
    })),
  }))

  currentExerciseIndex.value = 0
  currentSetIndex.value = 0
  startTime.value = new Date().toISOString()

  initInputsForCurrentSet()
  timer.start()
  loading.value = false

  // Periodic auto-save every 5 seconds
  saveInterval = setInterval(() => saveDraft(), 5000)
})

onUnmounted(() => {
  saveDraft()
  if (saveInterval !== null) {
    clearInterval(saveInterval)
    saveInterval = null
  }
  timer.stop()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// Save draft before any route navigation (fires before route changes, unlike onUnmounted)
onBeforeRouteLeave(() => {
  saveDraft()
})
</script>
