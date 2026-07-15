<template>
  <main class="pb-24 px-4 pt-8 max-w-lg mx-auto min-h-screen">
    <template v-if="loading">
      <div class="flex items-center justify-center py-20">
        <p class="typography-caption">加载中...</p>
      </div>
    </template>

    <template v-else-if="!record">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-body mb-4">未找到训练记录</p>
        <button class="return-btn px-6 py-2 rounded-full" @click="goToday">
          返回今日
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Completion Header -->
      <section class="flex flex-col items-center pt-4 pb-6" aria-label="训练完成">
        <div class="complete-icon w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 class="typography-hero text-center complete-title">
          训练完成！
        </h1>
        <p class="typography-caption mt-2 text-center">{{ workoutSubtitle }}</p>
      </section>

      <!-- Training Summary Card -->
      <section
        class="surface-card rounded-xl p-4 mb-4"
        aria-label="训练摘要"
      >
        <h2 class="typography-subtitle mb-3">本次训练</h2>

        <div v-for="(exercise, exIdx) in record.exercises" :key="exercise.exerciseId">
          <div class="flex items-center justify-between mb-1.5">
            <span
              class="typography-body font-semibold"
              :class="['exercise-name', { 'exercise-name-secondary': exercise.type !== 'main' }]"
            >
              {{ exercise.name }}
            </span>
            <span class="typography-caption set-complete-text">
              {{ completedSetCount(exercise) }}组 完成
            </span>
          </div>
          <div class="space-y-1.5 pl-1 mb-3">
            <div
              v-for="set in exercise.sets"
              :key="set.setNumber"
              :class="['flex items-center justify-between text-xs set-summary', isBelowTarget(set) ? 'set-summary-below' : 'set-summary-normal']"
            >
              <span :class="setSummaryOpacity(set)">S{{ set.setNumber }}</span>
              <span>
                {{ set.actualWeight ?? set.targetWeight ?? '--' }}kg × {{ set.actualReps ?? set.targetReps ?? '--' }}次
              </span>
              <template v-if="set.isCompleted">
                <svg
                  v-if="!isBelowTarget(set)"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--state-success)"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg
                  v-else
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--state-warning)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </template>
            </div>
          </div>

          <div
            v-if="exIdx < record.exercises.length - 1"
            class="summary-separator h-px mb-3"
          ></div>
        </div>
      </section>

      <!-- Stats Summary -->
      <section
        class="grid grid-cols-3 gap-2 mb-4"
        aria-label="训练统计"
      >
        <div class="stat-card rounded-xl p-3 text-center">
          <div class="typography-data-lg stat-value">{{ totalVolume }}</div>
          <div class="typography-caption mt-0.5">总容量 kg</div>
        </div>
        <div class="stat-card rounded-xl p-3 text-center">
          <div class="typography-data-lg stat-value">{{ durationMinutes }}</div>
          <div class="typography-caption mt-0.5">时长 分钟</div>
        </div>
        <div class="stat-card rounded-xl p-3 text-center">
          <div class="typography-data-lg stat-value">{{ averageRest }}</div>
          <div class="typography-caption mt-0.5">平均休息 秒</div>
        </div>
      </section>

      <!-- MR10 Special Notice -->
      <section
        v-if="showMR10"
        class="info-card rounded-xl p-4 mb-4"
        aria-label="MR10 提示"
      >
        <div class="flex items-start gap-3">
          <div class="info-icon-bg w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div>
            <p class="typography-body font-semibold info-title">
              {{ mr10Title }}
            </p>
            <p class="typography-caption mt-1">{{ mr10Description }}</p>
          </div>
        </div>
      </section>

      <!-- Body Weight Record -->
      <section
        class="surface-card rounded-xl p-4 mb-4"
        aria-label="体重记录"
      >
        <h2 class="typography-subtitle mb-3">记录今日体重</h2>
        <div class="flex items-center gap-3">
          <div class="input-container flex-1 flex items-center rounded-lg px-3 h-10">
            <input
              type="number"
              v-model.number="bodyWeight"
              step="0.1"
              inputmode="decimal"
              class="flex-1 bg-transparent outline-none typography-data input-lg"
              aria-label="体重"
              placeholder="--"
            />
          </div>
          <span class="typography-caption shrink-0">kg</span>
        </div>
        <p class="typography-caption mt-2 text-xs">选填，帮助追踪体重变化趋势</p>
      </section>

      <!-- Training Notes -->
      <section
        class="surface-card rounded-xl p-4 mb-4"
        aria-label="训练笔记"
      >
        <h2 class="typography-subtitle mb-3">训练笔记</h2>
        <textarea
          v-model="notes"
          rows="3"
          placeholder="今天感觉怎么样？有什么想记录的..."
          class="w-full bg-transparent outline-none resize-none typography-body rounded-lg p-3 input-container"
          aria-label="训练笔记"
        ></textarea>
      </section>

      <!-- Feeling Rating -->
      <section
        class="surface-card rounded-xl p-4 mb-6"
        aria-label="训练感受"
      >
        <h2 class="typography-subtitle mb-3">训练感受</h2>
        <div class="flex items-center gap-1 mb-2" role="radiogroup" aria-label="评分">
          <button
            v-for="star in 5"
            :key="star"
            :class="['w-10 h-10 flex items-center justify-center rounded-lg transition-colors star-btn', { 'star-btn-active': feeling >= star }]"
            :aria-label="feelingLabels[star - 1]"
            :aria-checked="feeling === star"
            @click="feeling = star"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              :fill="feeling >= star ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="flex justify-between typography-caption text-xs">
          <span>很差</span>
          <span>很棒</span>
        </div>
      </section>

      <!-- Action Buttons -->
      <section class="flex flex-col items-center gap-3" aria-label="操作">
        <button
          class="submit-btn w-full h-12 rounded-full text-white font-semibold transition-all"
          @click="submitRecord"
        >
          完成打卡
        </button>
        <button
          class="back-link typography-caption underline-offset-2"
          @click="goToday"
        >
          返回今日
        </button>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRecordStore } from '@/stores/recordStore'
import { useCycleStore } from '@/stores/cycleStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { calculateVolume } from '@/services/statsService'
import { v4 as uuid } from 'uuid'
import type { WorkoutRecord, SetRecord } from '@/types/record'
import type { TrainingDay } from '@/types/cycle'

const router = useRouter()
const route = useRoute()
const recordStore = useRecordStore()
const cycleStore = useCycleStore()
const bodyMetricStore = useBodyMetricStore()

const loading = ref(true)
const record = ref<WorkoutRecord | null>(null)
const bodyWeight = ref<number | null>(null)
const notes = ref('')
const feeling = ref<1 | 2 | 3 | 4 | 5>(3)
const isSubmitting = ref(false)

const weekNum = computed(() => Number(route.query.week) || 0)
const dayNum = computed(() => Number(route.query.day) || 0)
const cycleId = computed(() => (route.query.cycleId as string) || '')

const week5Completed = computed(() => {
  if (weekNum.value !== 5) return false
  const cycle = cycleId.value ? cycleStore.getCycleById(cycleId.value) : cycleStore.activeCycle
  if (!cycle) return false
  const week5 = cycle.weeks.find(w => w.weekNumber === 5)
  if (!week5) return false
  const trainingDays = week5.days.filter((d: TrainingDay) => d.type !== 'rest')
  return trainingDays.length > 0 && trainingDays.every((d: TrainingDay) => d.status === 'completed')
})

function navigateAfterComplete(): void {
  if (week5Completed.value) {
    const cycle = cycleId.value ? cycleStore.getCycleById(cycleId.value) : cycleStore.activeCycle
    if (cycle) {
      cycleStore.updateCycle(cycle.id, { status: 'week6_pending' })
    }
    router.push({ name: 'week6' })
  } else {
    router.push('/today')
  }
}

const feelingLabels = ['很差', '较差', '还行', '不错', '很棒']

const workoutSubtitle = computed(() => {
  if (!record.value) return ''
  const cycle = cycleId.value ? cycleStore.getCycleById(cycleId.value) : cycleStore.activeCycle
  let typeLabel = '训练'
  if (cycle) {
    for (const week of cycle.weeks) {
      if (week.weekNumber === weekNum.value) {
        for (const day of week.days) {
          if (day.dayNumber === dayNum.value) {
            typeLabel = day.type === 'lower' ? '下肢训练' : day.type === 'upper' ? '上肢训练' : '训练'
          }
        }
      }
    }
  }
  const mins = Math.floor((record.value.duration || 0) / 60)
  return `${typeLabel} · W${weekNum.value}D${dayNum.value} · ${mins}分钟`
})

const totalVolume = computed(() => {
  if (!record.value) return 0
  return calculateVolume(record.value)
})

const durationMinutes = computed(() => {
  if (!record.value) return 0
  return Math.floor((record.value.duration || 0) / 60)
})

const averageRest = computed(() => {
  if (!record.value) return 0
  const restTimes: number[] = []
  for (const ex of record.value.exercises) {
    for (const set of ex.sets) {
      if (set.restSeconds != null && set.isCompleted) {
        restTimes.push(set.restSeconds)
      }
    }
  }
  if (restTimes.length === 0) return 0
  const sum = restTimes.reduce((a, b) => a + b, 0)
  return Math.round(sum / restTimes.length)
})

const showMR10 = computed(() => {
  return record.value?.mr10TotalReps != null
})

const mr10Title = computed(() => {
  if (!record.value) return ''
  const mainExercise = record.value.exercises.find(ex => ex.type === 'main')
  const name = mainExercise?.name ?? '主项'
  return `${name} MR10 完成 ${record.value.mr10TotalReps}次`
})

const mr10Description = computed(() => {
  if (!record.value) return ''
  const reps = record.value.mr10TotalReps ?? 0
  let sets: number
  if (reps >= 10) sets = 10
  else if (reps >= 8) sets = 8
  else if (reps >= 7) sets = 5
  else sets = 0

  if (sets === 0) {
    return '下次训练将跳过减量组并建议降低1RM'
  }
  return `下次训练将进行 ${sets}组 × 3次 减量组`
})

function completedSetCount(exercise: { sets: SetRecord[] }): number {
  return exercise.sets.filter(s => s.isCompleted).length
}

function isBelowTarget(set: SetRecord): boolean {
  if (!set.isCompleted) return false
  const targetNum = parseInt(set.targetReps ?? '', 10)
  if (isNaN(targetNum)) return false
  return (set.actualReps ?? 0) < targetNum
}

function setSummaryOpacity(set: SetRecord) {
  if (isBelowTarget(set)) {
    return 'opacity-70'
  }
  return 'opacity-50'
}

function submitRecord() {
  if (isSubmitting.value || !record.value) return
  isSubmitting.value = true

  const updatedRecord: WorkoutRecord = {
    ...record.value,
    notes: notes.value,
    feeling: feeling.value,
    bodyWeight: bodyWeight.value ?? undefined,
  }

  if (bodyWeight.value) {
    bodyMetricStore.addMetric({
      id: uuid(),
      date: record.value.date,
      weight: bodyWeight.value,
      unit: 'kg',
    })
  }

  const cycleIdVal = cycleId.value || record.value.cycleId
  const existingRecords = recordStore.getRecordsForCycle(cycleIdVal)
  const idx = existingRecords.findIndex(r => r.id === record.value!.id)
  if (idx !== -1) {
    existingRecords[idx] = { ...updatedRecord, updatedAt: new Date().toISOString() }
    recordStore.saveRecords(cycleIdVal)
  }

  navigateAfterComplete()
}

function goToday() {
  navigateAfterComplete()
}

onMounted(() => {
  const wNum = Number(route.query.week) || 0
  const dNum = Number(route.query.day) || 0
  const cId = (route.query.cycleId as string) || ''

  if (!cId || !wNum || !dNum) {
    loading.value = false
    return
  }

  const found = recordStore.getRecordForDay(cId, wNum, dNum)
  if (found) {
    record.value = found
    bodyWeight.value = found.bodyWeight ?? null
    notes.value = found.notes || ''
    feeling.value = found.feeling || 3
  }

  loading.value = false
})
</script>

<style scoped>
/* ===== 返回按钮（无记录时） ===== */
.return-btn {
  background: var(--color-training-main);
  color: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
}

/* ===== 完成图标 ===== */
.complete-icon {
  background: var(--state-success);
}

/* ===== 完成标题 ===== */
.complete-title {
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: break-word;
}

/* ===== 卡片（统一白色背景+阴影） ===== */
.surface-card {
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

/* ===== 训练动作名称 ===== */
.exercise-name-secondary {
  color: var(--color-primary-light);
}

/* ===== 完成组数文字 ===== */
.set-complete-text {
  color: var(--state-success);
}

/* ===== 组摘要行 ===== */
.set-summary {
  font-family: var(--font-mono);
}

.set-summary-below {
  color: var(--state-warning);
}

.set-summary-normal {
  color: var(--color-primary);
}

/* ===== 训练项分隔线 ===== */
.summary-separator {
  background: var(--color-border-light);
}

/* ===== 统计卡片 ===== */
.stat-card {
  background: var(--color-surface-muted);
}

.stat-value {
  font-size: 1.125rem;
}

/* ===== MR10 提示卡片 ===== */
.info-card {
  background: var(--state-info-bg);
  box-shadow: var(--shadow-card);
}

.info-icon-bg {
  background: var(--state-info);
}

.info-title {
  color: var(--state-info);
}

/* ===== 输入控件容器 ===== */
.input-container {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-light);
}

.input-lg {
  font-size: var(--text-lg);
}

/* ===== 星星评分按钮 ===== */
.star-btn {
  color: var(--color-border);
}

.star-btn-active {
  color: var(--color-warm);
}

/* ===== 通用文字大小 ===== */
.text-xs {
  font-size: var(--text-xs);
}

/* ===== 提交按钮 ===== */
.submit-btn {
  background: var(--state-success);
  font-family: var(--font-sans);
  font-size: var(--text-md);
}

/* ===== 返回链接 ===== */
.back-link {
  font-size: var(--text-sm);
  color: var(--color-primary-light);
  background: none;
  border: none;
  cursor: pointer;
}
</style>
