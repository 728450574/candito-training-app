<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <header class="sticky top-0 z-30 border-b flex h-11 items-center px-4 -mx-4 mb-2 fix-header">
      <div class="flex items-center justify-start w-[88px]">
        <button class="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]" aria-label="返回" @click="router.back()">
          <ChevronLeft class="w-5 h-5 icon-primary" />
        </button>
      </div>
      <div class="min-w-0 flex-1 text-center truncate header-title">第6周决策</div>
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
        <button class="px-6 py-2 rounded-full font-semibold action-btn" @click="handleDirectNewCycle">
          直接开始新周期
        </button>
      </div>
    </template>

    <template v-else>
      <section class="px-5 pt-4 pb-2">
        <div class="flex items-center gap-2 mb-1">
          <Trophy class="w-5 h-5 shrink-0 icon-success" />
          <p class="typography-title text-2xl">恭喜完成第5周！</p>
        </div>
        <p class="typography-caption">第5周训练数据回顾</p>
      </section>

      <section class="px-5 mt-3">
        <div class="flex gap-3">
          <div
            v-for="lift in liftData"
            :key="lift.key"
            class="flex-1 flex flex-col items-center rounded-[var(--radius-lg)] py-3 px-2 lift-card"
          >
            <span class="typography-caption mb-1.5">{{ lift.name }}</span>
            <span class="whitespace-nowrap weight-display">{{ formatWeight(lift.weight) }}</span>
            <span class="whitespace-nowrap reps-display">x {{ lift.reps }}次</span>
          </div>
        </div>
      </section>

      <section class="px-5 mt-5">
        <div class="rounded-[var(--radius-xl)] p-5 surface-elevated">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <TrendingUp class="w-4 h-4 shrink-0 icon-training" />
              <span class="typography-subtitle text-md">预估新 1RM</span>
            </div>
          </div>
          <p class="typography-caption mb-4">基于第5周完成次数自动预估</p>
          <div class="space-y-3">
            <div
              v-for="lift in liftData"
              :key="lift.key"
              class="flex items-center justify-between py-2.5"
              :class="{ 'estimate-divider': lift.key !== liftData[liftData.length - 1].key }"
            >
              <span class="typography-body">{{ lift.name }}</span>
              <div class="flex items-baseline gap-1.5">
                <span class="whitespace-nowrap estimate-formula">{{ formatWeight(lift.weight) }} x {{ lift.multiplier }} =</span>
                <span class="whitespace-nowrap estimate-result">{{ formatWeight(lift.estimated1RM) }} {{ activeCycle.unit }}</span>
              </div>
            </div>
          </div>
          <p class="mt-3 multiplier-hint">完成2次 x 1.03, 3次 x 1.06, 4次 x 1.09</p>
        </div>
      </section>

      <section class="px-5 mt-6">
        <p class="typography-body mb-3">选择你的下一步</p>
        <div class="space-y-3">
          <button
            class="w-full text-left rounded-[var(--radius-lg)] p-4 border-l-[3px] transition-opacity decision-card"
            :class="{ 'decision-card-selected': selectedDecision === 'new_cycle' }"
            @click="selectedDecision = 'new_cycle'"
          >
            <div class="flex items-start gap-3">
              <div
                :class="['flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-full radio-btn', selectedDecision === 'new_cycle' ? 'radio-btn-selected' : '']"
              >
                <div v-if="selectedDecision === 'new_cycle'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="typography-subtitle truncate text-base">直接开始新周期</span>
                  <span class="inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 whitespace-nowrap recommend-badge">推荐</span>
                </div>
                <p class="typography-caption">使用预估1RM直接开始下一轮6周计划</p>
              </div>
            </div>
          </button>

          <button
            class="w-full text-left rounded-[var(--radius-lg)] p-4 border-l-[3px] transition-opacity decision-card"
            :class="{ 'decision-card-selected': selectedDecision === 'deload' }"
            @click="selectedDecision = 'deload'"
          >
            <div class="flex items-start gap-3">
              <div
                :class="['flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-full border-2 radio-btn', selectedDecision === 'deload' ? 'radio-btn-selected' : '']"
              ></div>
              <div class="flex-1 min-w-0">
                <span class="typography-subtitle block mb-1 truncate text-base">减载周</span>
                <p class="typography-caption">先做一周减载训练（重做第1周，降低容量），再开始新周期</p>
              </div>
            </div>
          </button>

          <button
            class="w-full text-left rounded-[var(--radius-lg)] p-4 border-l-[3px] transition-opacity decision-card"
            :class="{ 'decision-card-selected': selectedDecision === 'test_1rm' }"
            @click="selectedDecision = 'test_1rm'"
          >
            <div class="flex items-start gap-3">
              <div
                :class="['flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-full border-2 radio-btn', selectedDecision === 'test_1rm' ? 'radio-btn-selected' : '']"
              ></div>
              <div class="flex-1 min-w-0">
                <span class="typography-subtitle block mb-1 truncate text-base">实测1RM</span>
                <p class="typography-caption">本周实测最大重量，获得准确新1RM后再决定</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section class="px-5 mt-6">
        <button
          class="w-full flex items-center justify-center rounded-[var(--radius-full)] px-6 py-3.5 font-semibold confirm-btn"
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
import { estimateNewOneRepMax, getOneRepMaxMultiplier, findBestSetFromExerciseRecords } from '@/services/statsService'
import { getToday } from '@/services/dateService'
import type { ExerciseRecord } from '@/types/record'
import type { Week6Decision } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()

const activeCycle = computed(() => cycleStore.activeCycle)

const selectedDecision = ref<Week6Decision>('new_cycle')

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

const estimated1RMMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const item of liftData.value) {
    map[item.key] = item.estimated1RM
  }
  return map
})

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
    const best = findBestSetFromExerciseRecords(exRecords)
    if (!best) continue
    const multiplier = getOneRepMaxMultiplier(best.reps)
    const estimated = Math.round(estimateNewOneRepMax(best.weight, best.reps) * 10) / 10
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

function handleDirectNewCycle(): void {
  if (!activeCycle.value) return
  cycleStore.applyWeek6Decision(activeCycle.value.id, 'new_cycle', {
    squat: estimated1RMMap.value['squat'] ?? 0,
    bench: estimated1RMMap.value['bench'] ?? 0,
    deadlift: estimated1RMMap.value['deadlift'] ?? 0,
  }, getToday().split('T')[0])
  router.push({ name: 'start' })
}

/**
 * 确认第6周决策，委托 cycleStore 处理周期状态的更新。
 * 视图仅根据决策类型决定页面跳转。
 */
function handleConfirm(): void {
  if (!activeCycle.value) return
  const cycle = activeCycle.value
  const today = getToday()
  const estimated1RM = {
    squat: estimated1RMMap.value['squat'] ?? 0,
    bench: estimated1RMMap.value['bench'] ?? 0,
    deadlift: estimated1RMMap.value['deadlift'] ?? 0,
  }

  cycleStore.applyWeek6Decision(cycle.id, selectedDecision.value, estimated1RM, today)

  if (selectedDecision.value === 'new_cycle') {
    const query: Record<string, string> = {}
    for (const item of liftData.value) {
      query[item.key] = String(item.estimated1RM)
    }
    router.push({ name: 'start', query })
  } else if (selectedDecision.value === 'deload') {
    router.push({ name: 'plan' })
  } else {
    router.push({ name: 'today' })
  }
}
</script>

<style scoped>
/* ===== 顶部导航栏 ===== */
.fix-header {
  background: var(--color-surface)/95;
  backdrop-filter: blur(12px);
  border-color: var(--color-border);
}

.icon-primary {
  color: var(--color-primary);
}

.header-title {
  font-family: var(--font-sans);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

/* ===== 通用按钮 ===== */
.action-btn {
  background: var(--color-training-main);
  color: var(--color-surface);
  font-size: var(--text-sm);
}

/* ===== 图标颜色 ===== */
.icon-success {
  color: var(--state-success);
}

.icon-training {
  color: var(--color-training-main);
}

/* ===== 文字大小 ===== */
.text-2xl {
  font-size: var(--text-2xl);
}

.text-md {
  font-size: var(--text-md);
}

.text-base {
  font-size: var(--text-base);
}

/* ===== 举重数据卡片 ===== */
.lift-card {
  background: var(--color-surface-muted);
  box-shadow: var(--shadow-card);
}

.weight-display {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.reps-display {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

/* ===== 预估1RM区域 ===== */
.surface-elevated {
  background: var(--color-surface);
  box-shadow: var(--shadow-elevated);
}

.estimate-divider {
  border-bottom: 1px solid var(--color-border-light);
}

.estimate-formula {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

.estimate-result {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-training-main);
}

.multiplier-hint {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

/* ===== 决策卡片 ===== */
.decision-card {
  box-shadow: var(--shadow-card);
  background: var(--color-surface);
  border-left-color: transparent;
}

.decision-card-selected {
  border-left-color: var(--color-training-main);
}

/* ===== 推荐标签 ===== */
.recommend-badge {
  background-color: var(--state-info-bg);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-training-main);
}

/* ===== 单选按钮 ===== */
.radio-btn {
  border-color: var(--color-border);
}

.radio-btn-selected {
  background-color: var(--color-training-main);
  border-color: var(--color-training-main);
}

/* ===== 确认按钮 ===== */
.confirm-btn {
  background-color: var(--color-training-main);
  color: var(--color-surface);
  font-family: var(--font-sans);
  font-size: var(--text-md);
}
</style>
