<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <header
      class="sticky top-0 z-30 border-b flex h-11 items-center px-4 -mx-4 mb-2"
      style="background: var(--color-surface)/95; backdrop-filter: blur(12px); border-color: var(--color-border);"
    >
      <div class="flex items-center justify-start w-[88px]">
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]" aria-label="返回" @click="router.back()">
          <ChevronLeft class="w-5 h-5" style="color: var(--color-primary);" />
        </button>
      </div>
      <div class="min-w-0 flex-1 text-center truncate" style="font-family: var(--font-sans); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);">第6周决策</div>
      <div class="w-[88px]"></div>
    </header>

    <template v-if="!activeCycle">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption">没有活跃的训练周期</p>
      </div>
    </template>

    <template v-else-if="liftData.length === 0">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">未找到第5周训练数据</p>
        <button
          class="px-6 py-2 rounded-full font-semibold"
          style="background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm);"
          @click="handleDirectNewCycle"
        >
          直接开始新周期
        </button>
      </div>
    </template>

    <template v-else>
      <section class="px-5 pt-4 pb-2">
        <div class="flex items-center gap-2 mb-1">
          <Trophy class="w-5 h-5 shrink-0" style="color: var(--state-success);" />
          <p class="typography-title" style="font-size: var(--text-2xl);">恭喜完成第5周！</p>
        </div>
        <p class="typography-caption">第5周训练数据回顾</p>
      </section>

      <section class="px-5 mt-3">
        <div class="flex gap-3">
          <div
            v-for="lift in liftData"
            :key="lift.key"
            class="flex-1 flex flex-col items-center rounded-[var(--radius-lg)] py-3 px-2"
            style="background: var(--color-surface-muted); box-shadow: var(--shadow-card);"
          >
            <span class="typography-caption mb-1.5">{{ lift.name }}</span>
            <span class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-lg); font-weight: var(--font-weight-bold); color: var(--color-primary);">{{ formatWeight(lift.weight) }}</span>
            <span class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light);">x {{ lift.reps }}次</span>
          </div>
        </div>
      </section>

      <section class="px-5 mt-5">
        <div class="rounded-[var(--radius-xl)] p-5" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <TrendingUp class="w-4 h-4 shrink-0" style="color: var(--color-training-main);" />
              <span class="typography-subtitle" style="font-size: var(--text-md);">预估新 1RM</span>
            </div>
          </div>
          <p class="typography-caption mb-4">基于第5周完成次数自动预估</p>
          <div class="space-y-3">
            <div
              v-for="lift in liftData"
              :key="lift.key"
              class="flex items-center justify-between py-2.5"
              :class="{ 'border-b': lift.key !== liftData[liftData.length - 1].key }"
              style="border-color: var(--color-border-light);"
            >
              <span class="typography-body">{{ lift.name }}</span>
              <div class="flex items-baseline gap-1.5">
                <span class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light);">{{ formatWeight(lift.weight) }} x {{ lift.multiplier }} =</span>
                <span class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-training-main);">{{ formatWeight(lift.estimated1RM) }} {{ activeCycle.unit }}</span>
              </div>
            </div>
          </div>
          <p class="mt-3" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">完成2次 x 1.03, 3次 x 1.06, 4次 x 1.09</p>
        </div>
      </section>

      <section class="px-5 mt-6">
        <p class="typography-body mb-3">选择你的下一步</p>
        <div class="space-y-3">
          <button
            class="w-full text-left rounded-[var(--radius-lg)] p-4 border-l-[3px] transition-opacity"
            :style="decisionCardStyle('new_cycle')"
            @click="selectedDecision = 'new_cycle'"
          >
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-full" :style="radioStyle('new_cycle')">
                <div v-if="selectedDecision === 'new_cycle'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="typography-subtitle truncate" style="font-size: var(--text-base);">直接开始新周期</span>
                  <span class="inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 whitespace-nowrap" style="background-color: var(--state-info-bg); font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-training-main);">推荐</span>
                </div>
                <p class="typography-caption">使用预估1RM直接开始下一轮6周计划</p>
              </div>
            </div>
          </button>

          <button
            class="w-full text-left rounded-[var(--radius-lg)] p-4 border-l-[3px] transition-opacity"
            :style="decisionCardStyle('deload')"
            @click="selectedDecision = 'deload'"
          >
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-full border-2" :style="radioStyle('deload')"></div>
              <div class="flex-1 min-w-0">
                <span class="typography-subtitle block mb-1 truncate" style="font-size: var(--text-base);">减载周</span>
                <p class="typography-caption">先做一周减载训练（重做第1周，降低容量），再开始新周期</p>
              </div>
            </div>
          </button>

          <button
            class="w-full text-left rounded-[var(--radius-lg)] p-4 border-l-[3px] transition-opacity"
            :style="decisionCardStyle('test_1rm')"
            @click="selectedDecision = 'test_1rm'"
          >
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-full border-2" :style="radioStyle('test_1rm')"></div>
              <div class="flex-1 min-w-0">
                <span class="typography-subtitle block mb-1 truncate" style="font-size: var(--text-base);">实测1RM</span>
                <p class="typography-caption">本周实测最大重量，获得准确新1RM后再决定</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section class="px-5 mt-6">
        <button
          class="w-full flex items-center justify-center rounded-[var(--radius-full)] px-6 py-3.5 font-semibold"
          style="background-color: var(--color-training-main); color: var(--color-surface); font-family: var(--font-sans); font-size: var(--text-md);"
          @click="handleConfirm"
        >
          确认选择
        </button>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Trophy, TrendingUp } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { estimateNew1RM } from '@/services/statsService'
import type { WorkoutRecord, ExerciseRecord, SetRecord } from '@/types/record'
import type { Week6Decision } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()

const activeCycle = computed(() => cycleStore.activeCycle)

const selectedDecision = ref<Week6Decision>('new_cycle')

const ONE_RM_MULTIPLIERS: Record<number, number> = {
  1: 1.00,
  2: 1.03,
  3: 1.06,
  4: 1.09,
}

interface LiftDataItem {
  key: string
  name: string
  weight: number
  reps: number
  multiplier: number
  estimated1RM: number
}

const liftNames: Record<string, string> = {
  squat: '深蹲',
  bench: '卧推',
  deadlift: '硬拉',
}

function findBestSet(exerciseRecords: ExerciseRecord[]): { weight: number; reps: number } | null {
  let bestWeight = 0
  let bestReps = 0
  for (const ex of exerciseRecords) {
    for (const set of ex.sets) {
      const w = set.actualWeight ?? 0
      const r = set.actualReps ?? 0
      if (w > 0 && r > 0 && set.isCompleted) {
        if (w > bestWeight || (w === bestWeight && r > bestReps)) {
          bestWeight = w
          bestReps = r
        }
      }
    }
  }
  if (bestWeight > 0 && bestReps > 0) {
    return { weight: bestWeight, reps: bestReps }
  }
  return null
}

function getMultiplier(reps: number): number {
  if (reps in ONE_RM_MULTIPLIERS) {
    return ONE_RM_MULTIPLIERS[reps]
  }
  return parseFloat((1 + reps / 30).toFixed(2))
}

const liftData = computed<LiftDataItem[]>(() => {
  if (!activeCycle.value) return []
  const week5Records = recordStore.getRecordsForWeek(activeCycle.value.id, 5)
  if (week5Records.length === 0) return []

  const exerciseRecordsByName: Record<string, ExerciseRecord[]> = {}
  for (const record of week5Records) {
    for (const ex of record.exercises) {
      if (!exerciseRecordsByName[ex.name]) {
        exerciseRecordsByName[ex.name] = []
      }
      exerciseRecordsByName[ex.name].push(ex)
    }
  }

  const result: LiftDataItem[] = []
  for (const [key, name] of Object.entries(liftNames)) {
    const exRecords = exerciseRecordsByName[name]
    if (!exRecords || exRecords.length === 0) continue
    const best = findBestSet(exRecords)
    if (!best) continue
    const multiplier = getMultiplier(best.reps)
    const estimated = Math.round(estimateNew1RM(best.weight, best.reps) * 10) / 10
    result.push({
      key,
      name,
      weight: best.weight,
      reps: best.reps,
      multiplier,
      estimated1RM: estimated,
    })
  }

  return result
})

function formatWeight(value: number): string {
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(1)
}

function decisionCardStyle(value: Week6Decision) {
  if (selectedDecision.value === value) {
    return {
      boxShadow: 'var(--shadow-card)',
      background: 'var(--color-surface)',
      borderLeftColor: 'var(--color-training-main)',
    }
  }
  return {
    boxShadow: 'var(--shadow-card)',
    background: 'var(--color-surface)',
    borderLeftColor: 'transparent',
  }
}

function radioStyle(value: Week6Decision) {
  if (selectedDecision.value === value) {
    return {
      backgroundColor: 'var(--color-training-main)',
      borderColor: 'var(--color-training-main)',
    }
  }
  return {
    borderColor: 'var(--color-border)',
  }
}

function handleDirectNewCycle(): void {
  if (!activeCycle.value) return
  cycleStore.updateCycle(activeCycle.value.id, {
    week6Decision: 'new_cycle',
    status: 'completed',
    completedAt: new Date().toISOString().split('T')[0],
  })
  router.push({ name: 'start' })
}

function handleConfirm(): void {
  if (!activeCycle.value) return

  cycleStore.updateCycle(activeCycle.value.id, {
    week6Decision: selectedDecision.value,
    status: 'completed',
    completedAt: new Date().toISOString().split('T')[0],
  })

  if (selectedDecision.value === 'new_cycle') {
    router.push({ name: 'start' })
  } else if (selectedDecision.value === 'deload') {
    router.push({ name: 'plan' })
  } else {
    router.push({ name: 'today' })
  }
}
</script>
