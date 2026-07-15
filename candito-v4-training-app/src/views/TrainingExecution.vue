<template>
  <main class="page">
    <!-- Top Navigation Bar -->
    <header class="header">
      <button class="nav-btn back-btn" aria-label="返回今日" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </button>
      <h1 class="header-title">{{ pageTitle }}</h1>
      <button class="nav-btn pause-btn" aria-label="暂停训练">
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
        <button class="error-back-btn" @click="goBack">返回今日</button>
      </div>
    </template>

    <template v-else>
      <div ref="swipeContainer">

      <!-- Timer Bar -->
      <section class="px-4 pt-5 pb-4">
        <div class="flex items-end justify-between">
          <div>
            <p class="timer-label">训练时长</p>
            <p class="timer-value">{{ timer.elapsedFormatted.value }}</p>
          </div>
          <div class="flex items-center gap-2">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="15" stroke-width="3" class="rest-circle-bg" />
              <circle cx="18" cy="18" r="15" stroke-width="3" stroke-linecap="round" :style="restCircleStyle" />
            </svg>
            <div>
              <p class="rest-label">组间休息</p>
              <p class="rest-value">{{ timer.isResting.value ? timer.restFormatted.value : '--:--' }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="px-4 pb-4" v-if="currentExercise">
        <!-- Exercise Header -->
        <div class="flex items-center gap-2 mb-1">
          <h2 class="exercise-title">{{ currentExercise.name }}</h2>
          <span :class="['type-badge', currentExercise.type]">{{ typeLabel(currentExercise.type) }}</span>
        </div>

        <template v-if="currentExercise.type === 'main'">
          <p class="set-progress">第 {{ currentSetDisplayIndex }} 组 / 共 {{ currentExercise.sets.length }} 组</p>
          <!-- Target (main only) -->
          <div class="target-box">
            <Target class="h-4 w-4 target-icon" />
            <p class="target-label">目标:</p>
            <p class="target-value">{{ currentSet?.targetWeight ?? '--' }}kg</p>
            <span class="target-separator">×</span>
            <p class="target-value">{{ currentSet?.isAMRAP ? 'AMRAP' : (currentSet?.targetReps ?? '--') }}次</p>
          </div>
        </template>
        <template v-else>
          <p class="set-progress">第 {{ currentSetDisplayIndex }} 组 / 共 {{ currentExercise.sets.length }} 组</p>
        </template>

        <!-- Weight Input -->
        <div class="mb-4">
          <label class="weight-label">实际重量 (kg)</label>
          <div class="weight-input-wrapper">
            <input
              type="number"
              :value="inputWeight"
              @input="onWeightInput"
              inputmode="decimal"
              class="w-full bg-transparent outline-none weight-input"
              aria-label="重量输入"
            />
            <span class="weight-unit">kg</span>
          </div>
        </div>

        <!-- Reps Selection -->
        <div class="mb-5">
          <label class="reps-label">完成次数</label>
          <div class="flex gap-2">
            <button
              v-for="rep in repOptions"
              :key="rep"
              :class="['rep-btn', { selected: inputReps === rep }]"
              @click="selectRep(rep)"
            >{{ rep }}</button>
          </div>
        </div>

        <!-- Complete Set CTA -->
        <button class="complete-set-btn" @click="completeCurrentSet">
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
            :class="['set-row', {
              completed: set.isCompleted,
              current: set.isCurrent && !set.isCompleted,
            }]"
          >
            <!-- Set number circle -->
            <div :class="['set-circle', {
              completed: set.isCompleted,
              current: set.isCurrent && !set.isCompleted,
            }]">
              <template v-if="set.isCompleted">
                <Check class="h-3 w-3 set-check-icon" />
              </template>
              <template v-else-if="set.isCurrent">
                <span class="set-number-current">{{ set.displayNumber }}</span>
              </template>
              <template v-else>
                <span class="set-number">{{ set.displayNumber }}</span>
              </template>
            </div>
            <div class="flex-1 min-w-0">
              <p :class="['set-label', {
                completed: set.isCompleted,
                current: set.isCurrent && !set.isCompleted,
              }]">
                第 {{ set.displayNumber }} 组
              </p>
            </div>
            <p :class="['set-value', {
              completed: set.isCompleted,
              current: set.isCurrent && !set.isCompleted,
            }]">
              {{ set.displayWeight }}kg × {{ set.displayReps }}
            </p>
          </div>
        </div>
      </section>

      <!-- MR10 Dynamic Notice (Week 2 only) -->
      <div v-if="showMR10Notice" class="mr10-notice">
        <div class="flex items-start gap-2">
          <Info class="mr10-icon" />
          <div>
            <p class="mr10-title">MR10 动态调整</p>
            <p v-if="isWeek2Day1" class="mr10-detail">
              MR10 完成 <span class="mr10-highlight">{{ mr10TotalReps }}次</span>，加量组将执行 <span class="mr10-highlight">5组×3次</span> @ {{ mr10LoadingWeight }}kg
            </p>
            <p v-else-if="isWeek2Day3" class="mr10-detail">
              MR10 完成 <span class="mr10-highlight">{{ mr10TotalReps }}次</span>，减量组将执行 <span class="mr10-highlight">{{ mr10Result.sets }}组×3次</span>
            </p>
            <p v-if="isWeek2Day3" class="mr10-rule">10次→10组 | 8-9次→8组 | 7次→5组 | &lt;7次→跳过并降低1RM</p>
          </div>
        </div>
      </div>

      <!-- Up Next Preview -->
      <section class="px-4 pb-8" v-if="nextExercise">
        <div class="next-ex-box">
          <div class="flex items-center gap-2">
            <ArrowDownCircle class="h-4 w-4 next-ex-arrow" />
            <p class="next-ex-label">下一个动作</p>
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <p class="next-ex-name">{{ nextExercise.name }}</p>
            <span :class="['type-badge', nextExercise.type]">{{ typeLabel(nextExercise.type) }}</span>
          </div>
        </div>
        <div class="mt-1 flex justify-end px-1">
          <p class="next-ex-reps">{{ nextExercise.targetRepsDisplay }}</p>
        </div>
      </section>

      <!-- All exercises completed placeholder -->
      <section class="px-4 pb-4" v-if="allExercisesDone">
        <div class="flex flex-col items-center py-6">
          <div class="all-done-icon-bg">
            <CheckCircle class="h-6 w-6 all-done-icon" />
          </div>
          <p class="typography-subtitle">所有动作已完成</p>
          <p class="typography-caption mt-1">点击下方按钮完成训练</p>
        </div>
      </section>

      <!-- Complete Workout Button -->
      <div class="px-5 pb-6 mt-4">
        <button
          :class="['finish-btn', { active: allExercisesDone }]"
          :disabled="!allExercisesDone"
          @click="finishWorkout"
        >
          <CheckCircle class="finish-btn-icon" />
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
import { useCycleStore } from '@/stores/cycleStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTimer } from '@/composables/useTimer'
import { useSwipe } from '@/composables/useSwipe'
import { calculateMr10LoadingSets, calculateMr10UnloadingSets, getUnloadingSetCount } from '@/services/mr10Service'
import { buildDraftKey, saveDraft as saveDraftToStorage, loadDraft as loadDraftFromStorage, clearDraft as clearDraftFromStorage, type TrainingDraftData } from '@/services/draftService'
import type { PlannedExercise, TrainingDay } from '@/types/cycle'
import type { ExerciseRecord } from '@/types/record'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()
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

/** 将当前训练状态序列化并保存到 localStorage 草稿 */
function saveDraft(): void {
  if (!draftKey.value) return
  saveDraftToStorage(draftKey.value, {
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
  })
}

function handleBeforeUnload(): void {
  saveDraft()
}
window.addEventListener('beforeunload', handleBeforeUnload)

/** 从 localStorage 恢复训练草稿，包含格式迁移和计时器状态恢复逻辑 */
function loadDraft(): boolean {
  if (!draftKey.value) return false
  const data = loadDraftFromStorage(draftKey.value) as TrainingDraftData | null
  if (!data) return false

  // 迁移：旧格式草稿（缺少组间休息字段）直接丢弃
  if (data.restSecondsLeft === undefined) {
    clearDraftFromStorage(draftKey.value)
    return false
  }

  if (!Array.isArray(data.exercises)) return false

  exercises.value = data.exercises as MutableExercise[]
  currentExerciseIndex.value = data.currentExerciseIndex ?? 0
  currentSetIndex.value = data.currentSetIndex ?? 0
  inputWeight.value = data.inputWeight ?? 0
  inputReps.value = data.inputReps ?? 0
  startTime.value = data.startTime ?? new Date().toISOString()
  mr10TotalReps.value = data.mr10TotalReps ?? 0
  mr10Calculated.value = data.mr10Calculated ?? false
  mr10LoadingWeight.value = data.mr10LoadingWeight ?? 0

  const elapsedSeconds = data.elapsedSeconds ?? 0
  if (elapsedSeconds > 0) {
    timer.elapsedSeconds.value = elapsedSeconds
  }
  const secondsAway = data.savedAt
    ? Math.floor((Date.now() - data.savedAt) / 1000)
    : 0
  if (secondsAway > 0) {
    timer.elapsedSeconds.value += secondsAway
  }

  // 恢复组间休息计时器：草稿保存时若正在休息，则减去离开时间后继续倒计时
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
}

function clearDraft(): void {
  if (!draftKey.value) return
  clearDraftFromStorage(draftKey.value)
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

/** MR10 完成后计算的减量组配置，供模板显示用 */
const mr10Result = computed(() => {
  const sets = getUnloadingSetCount(mr10TotalReps.value)
  return { sets, reps: 3 }
})

const showMR10Notice = computed(() => {
  return isWeek2.value && mr10Calculated.value
})

/** 组间休息倒计时圆弧（SVG stroke-dasharray 动态计算，保留内联 :style） */
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

function typeLabel(type: string): string {
  if (type === 'main') return '主项'
  if (type === 'assistance') return '辅助项'
  return '补充项'
}

function onWeightInput(e: Event) {
  const target = e.target as HTMLInputElement
  inputWeight.value = target.value ? Number(target.value) : 0
}

function selectRep(rep: number) {
  inputReps.value = rep
}

/**
 * 根据 MR10 服务返回的动态组参数，构造视图层的 MutableSet 数组。
 * 这是一个纯 UI 适配函数，将领域服务参数转换为组件内部数据结构。
 */
function buildDynamicSets(startSetNumber: number, params: { weight: number; reps: string; count: number }): MutableSet[] {
  const sets: MutableSet[] = []
  for (let i = 0; i < params.count; i++) {
    sets.push({
      setNumber: startSetNumber + 1 + i,
      targetWeight: params.weight,
      targetReps: params.reps,
      actualWeight: params.weight,
      actualReps: parseInt(params.reps, 10) || 0,
      isCompleted: false,
      isSkipped: false,
    })
  }
  return sets
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

  // 第2周深蹲 MR10 动态调整：触发于 AMRAP 组完成后
  if (isWeek2.value && currentExercise.value.name === '深蹲' && currentSet.value.isAMRAP && !mr10Calculated.value) {
    const reps = inputReps.value
    mr10TotalReps.value = reps
    mr10Calculated.value = true

    const amrapSetNum = currentSet.value.setNumber
    const amrapWeight = inputWeight.value
    const rounding = 2.5

    if (isWeek2Day1.value) {
      // Day1 加量组：固定 5组×3次，重量由 MR10 成绩决定
      const loadingParams = calculateMr10LoadingSets(amrapWeight, reps, rounding)
      mr10LoadingWeight.value = loadingParams.weight
      const loadingSets = buildDynamicSets(amrapSetNum, loadingParams)
      currentExercise.value.sets.push(...loadingSets)
    } else if (isWeek2Day3.value) {
      // Day3 减量组：阶梯组数，reps < 7 时跳过
      const unloadingParams = calculateMr10UnloadingSets(amrapWeight, reps, rounding)
      if (unloadingParams) {
        const unloadingSets = buildDynamicSets(amrapSetNum, unloadingParams)
        currentExercise.value.sets.push(...unloadingSets)
      } else {
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

/**
 * 完成本次训练。
 * 将训练数据组装后委托给 cycleStore.finishWorkout() 处理业务逻辑，
 * 视图仅根据返回结果决定页面跳转。
 */
function finishWorkout() {
  if (!allExercisesDone.value) return
  if (!dayData.value) return

  timer.stop()

  const cycle = cycleId.value
    ? cycleStore.getCycleById(cycleId.value)
    : cycleStore.activeCycle
  if (!cycle) return

  const now = new Date().toISOString()

  // 组装动作记录（从视图层的 MutableExercise 转换为领域层的 ExerciseRecord）
  const exerciseRecords: ExerciseRecord[] = exercises.value.map((ex) => ({
    exerciseId: ex.id,
    name: ex.name,
    type: ex.type,
    sets: ex.sets.map((s) => ({
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

  clearDraft()

  // 委托 Store 处理训练完成的核心业务逻辑
  const result = cycleStore.finishWorkout({
    cycleId: cycle.id,
    weekNumber: weekNum.value,
    dayNumber: dayNum.value,
    exercises: exerciseRecords,
    startTime: startTime.value,
    endTime: now,
    durationSeconds: timer.elapsedSeconds.value,
    mr10TotalReps: mr10Calculated.value ? mr10TotalReps.value : undefined,
  })

  // 根据 Store 返回的状态决定页面跳转
  if (result.week5AllCompleted) {
    router.push({ name: 'week6', query: { cycleId: cycle.id } })
  } else if (result.week6AllCompleted) {
    const estimated = result.estimated1RM
    const query: Record<string, string> = {}
    if (estimated) {
      if (estimated.squat) query.squat = String(estimated.squat)
      if (estimated.bench) query.bench = String(estimated.bench)
      if (estimated.deadlift) query.deadlift = String(estimated.deadlift)
    }
    router.push({ name: 'start', query })
  } else {
    router.push({
      name: 'training-complete',
      query: { week: weekNum.value, day: dayNum.value, cycleId: cycle.id },
    })
  }
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

  // 根据训练日标识生成草稿存储键
  draftKey.value = buildDraftKey(cycle.id, weekNum.value, dayNum.value)

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

<style scoped>
/* ===== 页面容器 ===== */
.page {
  min-height: 100vh;
  max-width: 32rem;
  margin: 0 auto;
  background: var(--color-surface);
}

/* ===== 顶部导航栏 ===== */
.header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  height: 3rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
}

.nav-btn {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
}

.back-btn { color: var(--color-training-main); }
.pause-btn { color: var(--color-primary-light); }

.header-title {
  min-width: 0;
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 0.5rem;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  letter-spacing: -0.01em;
}

/* ===== 错误状态 ===== */
.error-back-btn {
  padding: 0.375rem 1.5rem;
  border-radius: 9999px;
  background: var(--color-training-main);
  color: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

/* ===== 计时器区域 ===== */
.timer-label {
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.timer-value {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  letter-spacing: -0.03em;
  line-height: var(--leading-tight);
}

.rest-circle-bg { stroke: var(--color-border-light); }

.rest-label {
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

.rest-value {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

/* ===== 动作标题 ===== */
.exercise-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-sans);
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  letter-spacing: -0.02em;
  line-height: var(--leading-tight);
}

.type-badge {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.type-badge.main {
  font-weight: var(--font-weight-semibold);
  color: var(--color-training-main);
  background: var(--state-info-bg);
}

.type-badge.assistance,
.type-badge.optional {
  font-weight: var(--font-weight-medium);
  color: var(--color-training-assist);
  background: rgba(94, 92, 230, 0.08);
}

/* ===== 组进度文字 ===== */
.set-progress {
  white-space: nowrap;
  margin-bottom: 1rem;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

/* ===== 目标信息卡片 ===== */
.target-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

.target-icon { color: var(--color-primary-light); }

.target-label {
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

.target-value {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.target-separator { color: var(--color-primary-light); }

/* ===== 重量输入 ===== */
.weight-label {
  display: block;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
}

.weight-input-wrapper {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0 0.25rem 0.5rem;
  border-bottom: 2px solid var(--color-primary);
}

.weight-input {
  font-family: var(--font-mono);
  font-size: var(--text-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  letter-spacing: -0.03em;
  line-height: var(--leading-tight);
}

.weight-unit {
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
}

/* ===== 次数选择 ===== */
.reps-label {
  display: block;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
}

.rep-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-light);
  background: var(--color-surface-muted);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
}

.rep-btn.selected {
  font-weight: var(--font-weight-bold);
  color: var(--color-surface);
  background: var(--color-training-main);
}

/* ===== 完成本组按钮 ===== */
.complete-set-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-surface);
  background: var(--state-success);
  height: 52px;
  border-radius: var(--radius-lg);
}

/* ===== 组列表行 ===== */
.set-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.set-row.completed {
  background: var(--color-surface-muted);
  border-color: transparent;
  box-shadow: none;
}

.set-row.current {
  background: var(--color-surface);
  border: 1px solid var(--color-training-main);
  box-shadow: 0 0 0 1px var(--color-training-main);
}

/* ===== 组序号圆圈 ===== */
.set-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
}

.set-circle.completed {
  border: none;
  background: var(--color-border-light);
}

.set-circle.current {
  border: none;
  background: var(--color-training-main);
}

.set-check-icon { color: var(--color-primary-light); }

.set-number {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-light);
}

.set-number-current {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-surface);
}

/* ===== 组标签文字 ===== */
.set-label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
}

.set-label.current {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.set-label.completed {
  text-decoration: line-through;
}

/* ===== 组数值文字 ===== */
.set-value {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

.set-value.current {
  font-weight: var(--font-weight-semibold);
  color: var(--color-training-main);
}

.set-value.completed {
  text-decoration: line-through;
}

/* ===== MR10 通知卡片 ===== */
.mr10-notice {
  margin: 0 1.25rem 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-lg);
  background: var(--state-info-bg);
  border: 1px solid rgba(0, 122, 255, 0.15);
}

.mr10-icon {
  width: 14px;
  height: 14px;
  color: var(--state-info);
  flex-shrink: 0;
  margin-top: 1px;
}

.mr10-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.mr10-detail {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  margin-top: 2px;
}

.mr10-highlight {
  font-weight: var(--font-weight-semibold);
  color: var(--color-training-main);
}

.mr10-rule {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  margin-top: 1px;
}

/* ===== 下一个动作预览 ===== */
.next-ex-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

.next-ex-arrow { color: var(--color-primary-light); }

.next-ex-label {
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
}

.next-ex-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.next-ex-reps {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

/* ===== 全部动作完成占位 ===== */
.all-done-icon-bg {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  background: var(--state-success-bg);
}

.all-done-icon { color: var(--state-success); }

/* ===== 完成训练按钮 ===== */
.finish-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 0;
  border-radius: var(--radius-full);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  background: var(--color-border-light);
  color: var(--color-primary-light);
}

.finish-btn.active {
  background: var(--state-success);
  color: var(--color-surface);
}

.finish-btn-icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
}
</style>
