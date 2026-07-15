<template>
  <main class="page">
    <header class="header">
      <button class="nav-btn back-btn" aria-label="返回" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </button>
      <h1 class="header-title">训练详情</h1>
      <div class="w-8"></div>
    </header>

    <template v-if="record && dayData">
      <section class="px-4 pt-5 pb-3">
        <div class="detail-card">
          <p class="date-text">{{ displayDate }}</p>
          <div class="flex items-center gap-2 mb-3">
            <h2 class="workout-title">{{ workoutTypeLabel }} · W{{ weekNum }}D{{ dayNum }}</h2>
            <span class="badge-completed">已完成</span>
          </div>
          <div class="flex items-center gap-4 mb-3">
            <div class="flex items-center gap-1">
              <Clock class="h-3.5 w-3.5 icon-light" />
              <p class="info-value">{{ record.duration }}分钟</p>
            </div>
            <div class="flex items-center gap-1" v-if="record.bodyWeight">
              <Scale class="h-3.5 w-3.5 icon-light" />
              <p class="info-value">{{ record.bodyWeight }}{{ unit }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <p class="feeling-stars">{{ feelingStars }}</p>
            <p class="feeling-label">{{ feelingLabel }}</p>
          </div>
        </div>
      </section>

      <section class="px-4 pb-3" v-if="record.notes">
        <div class="notes-card">
          <div class="flex items-center gap-1.5 mb-2">
            <PencilLine class="h-3.5 w-3.5 icon-light" />
            <p class="notes-title">训练笔记</p>
          </div>
          <p class="notes-body">{{ record.notes }}</p>
        </div>
      </section>

      <!-- 主项训练 -->
      <section class="px-4 pt-2 pb-3">
        <div class="section-header">
          <div class="section-dot main"></div>
          <p class="section-label">主项训练</p>
        </div>

        <div v-for="(exercise, idx) in mainExercises" :key="exercise.exerciseId" class="exercise-card">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="exercise-title">{{ exercise.name }}</h3>
            <span class="badge-main">主项</span>
          </div>
          <p class="target-info">
            目标: <span class="mono-semibold">{{ targetDisplay(exercise) }}</span>
          </p>

          <div class="flex flex-col gap-1.5 mb-3">
            <div v-for="set in exercise.sets" :key="set.setNumber" :class="['set-row', set.isCompleted && !set.isSkipped ? 'done' : 'skipped']">
              <div :class="['set-icon-circle', set.isCompleted && !set.isSkipped ? 'done' : 'skipped']">
                <Check v-if="set.isCompleted && !set.isSkipped" class="h-3 w-3 icon-surface" />
                <AlertTriangle v-else class="h-3 w-3 icon-surface" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="set-name">第 {{ set.setNumber }} 组</p>
              </div>
              <p :class="['set-value', set.isCompleted && !set.isSkipped ? 'done' : 'skipped']">
                {{ set.actualWeight ?? set.targetWeight ?? 0 }}kg <span class="set-x">x</span> {{ set.actualReps ?? 0 }}次
              </p>
            </div>
          </div>

          <div class="subtotal-row">
            <p class="subtotal-label">小计:</p>
            <p class="subtotal-value">{{ completedSetsCount(exercise) }}组</p>
            <span class="subtotal-sep">|</span>
            <p class="subtotal-value">容量: {{ exerciseVolume(exercise) }}kg</p>
          </div>
        </div>
      </section>

      <!-- 辅助训练 -->
      <section class="px-4 pb-3" v-if="assistanceExercises.length > 0">
        <div class="section-header">
          <div class="section-dot assist"></div>
          <p class="section-label">辅助训练</p>
        </div>

        <div class="flex flex-col gap-3">
          <div v-for="exercise in assistanceExercises" :key="exercise.exerciseId" class="exercise-card">
            <div class="flex items-center gap-2 mb-3">
              <div class="assist-check-icon">
                <Check class="h-3 w-3 icon-surface" />
              </div>
              <h3 class="exercise-title">{{ exercise.name }}</h3>
            </div>

            <div class="flex flex-col gap-1.5 mb-3" v-if="exercise.sets.length > 0">
              <div v-for="set in exercise.sets" :key="set.setNumber" :class="['set-row', set.isCompleted && !set.isSkipped ? 'done' : 'skipped']">
                <div :class="['set-icon-circle', set.isCompleted && !set.isSkipped ? 'done' : 'skipped']">
                  <Check v-if="set.isCompleted && !set.isSkipped" class="h-3 w-3 icon-surface" />
                  <AlertTriangle v-else class="h-3 w-3 icon-surface" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="set-name">第 {{ set.setNumber }} 组</p>
                </div>
                <p :class="['set-value', set.isCompleted && !set.isSkipped ? 'done' : 'skipped']">
                  {{ set.actualWeight ?? set.targetWeight ?? 0 }}kg <span class="set-x">x</span> {{ set.actualReps ?? 0 }}次
                </p>
              </div>
            </div>

            <div class="subtotal-row">
              <p class="subtotal-label">小计:</p>
              <p class="subtotal-value">{{ completedSetsCount(exercise) }}组</p>
              <span class="subtotal-sep">|</span>
              <p class="subtotal-value">容量: {{ exerciseVolume(exercise) }}kg</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Summary Row -->
      <section class="px-4 pb-8">
        <div class="summary-card">
          <div class="flex items-center justify-around">
            <div class="text-center">
              <p class="summary-number">{{ totalVolumeValue }}</p>
              <p class="summary-label">总容量 kg</p>
            </div>
            <div class="summary-divider"></div>
            <div class="text-center">
              <p class="summary-number">{{ totalSetsCount }}</p>
              <p class="summary-label">总组数</p>
            </div>
            <div class="summary-divider"></div>
            <div class="text-center">
              <p class="summary-number">{{ avgRestSeconds }}</p>
              <p class="summary-label">平均休息 秒</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">未找到训练记录</p>
        <button class="error-back-btn" @click="goBack">返回</button>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Clock, Scale, PencilLine, Check, AlertTriangle } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { formatDateFull, getWeekday } from '@/services/dateService'
import { calculateVolume } from '@/services/statsService'
import type { ExerciseRecord, SetRecord } from '@/types/record'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()

const weekNum = computed(() => { const w = route.query.week; return w ? Number(w) : NaN })
const dayNum = computed(() => { const d = route.query.day; return d ? Number(d) : NaN })
const cycleId = computed(() => (route.query.cycleId as string) || null)
const cycle = computed(() => cycleId.value ? cycleStore.getCycleById(cycleId.value) : cycleStore.activeCycle)

const dayData = computed(() => {
  if (!cycle.value) return null
  for (const week of cycle.value.weeks) {
    if (week.weekNumber === weekNum.value) {
      for (const day of week.days) {
        if (day.dayNumber === dayNum.value) return day
      }
    }
  }
  return null
})

const record = computed(() => {
  if (!cycle.value) return null
  return recordStore.getRecordForDay(cycle.value.id, weekNum.value, dayNum.value) || null
})

const unit = computed(() => cycle.value?.unit || 'kg')
const displayDate = computed(() => {
  if (!record.value) return ''
  return formatDateFull(record.value.date) + ' ' + getWeekday(record.value.date)
})
const workoutTypeLabel = computed(() => {
  if (!dayData.value) return ''
  return dayData.value.type === 'lower' ? '下肢训练' : '上肢训练'
})
const feelingStars = computed(() => {
  const f = record.value?.feeling ?? 0
  return '★'.repeat(f) + '☆'.repeat(5 - f)
})
const feelingLabel = computed(() => {
  const labels = ['', '很差', '较差', '一般', '不错', '很棒']
  return labels[record.value?.feeling ?? 0] || ''
})
const mainExercises = computed(() => {
  if (!record.value) return []
  return record.value.exercises.filter((e: ExerciseRecord) => e.type === 'main')
})
const assistanceExercises = computed(() => {
  if (!record.value) return []
  return record.value.exercises.filter((e: ExerciseRecord) => e.type === 'assistance' || e.type === 'optional')
})
const totalVolumeValue = computed(() => record.value ? calculateVolume(record.value) : 0)
const totalSetsCount = computed(() => {
  if (!record.value) return 0
  let count = 0
  for (const ex of record.value.exercises) count += ex.sets.filter((s: SetRecord) => s.isCompleted).length
  return count
})
const avgRestSeconds = computed(() => {
  if (!record.value) return 0
  const restTimes: number[] = []
  for (const ex of record.value.exercises) {
    for (const set of ex.sets) {
      if (set.restSeconds != null && set.restSeconds > 0) restTimes.push(set.restSeconds)
    }
  }
  if (restTimes.length === 0) return 0
  return Math.round(restTimes.reduce((a, b) => a + b, 0) / restTimes.length)
})

function completedSetsCount(exercise: ExerciseRecord): number { return exercise.sets.filter(s => s.isCompleted).length }
function exerciseVolume(exercise: ExerciseRecord): string {
  let total = 0
  for (const set of exercise.sets) { total += (set.actualWeight ?? set.targetWeight ?? 0) * (set.actualReps ?? 0) }
  return total.toLocaleString()
}
function targetDisplay(exercise: ExerciseRecord): string {
  const firstSet = exercise.sets[0]
  if (!firstSet) return '--'
  return `${firstSet.targetWeight ?? 0}kg x MR${firstSet.targetReps ?? '--'}`
}
function goBack() { router.back() }
</script>

<style scoped>
/* ===== 页面 ===== */
.page { min-height: 100vh; max-width: 32rem; margin: 0 auto; background: var(--color-surface); }

/* ===== 头部 ===== */
.header {
  position: sticky; top: 0; z-index: 30; display: flex; height: 3rem;
  align-items: center; justify-content: space-between; padding: 0 1rem;
  background: var(--color-surface); border-bottom: 1px solid var(--color-border-light);
}
.nav-btn { display: inline-flex; height: 2rem; width: 2rem; align-items: center; justify-content: center; }
.back-btn { color: var(--color-training-main); }
.header-title {
  min-width: 0; flex: 1; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: var(--font-sans); font-size: var(--text-base); font-weight: var(--font-weight-semibold);
  color: var(--color-primary); letter-spacing: -0.01em;
}

/* ===== 详情卡片 ===== */
.detail-card { padding: 1rem; background: var(--color-surface); box-shadow: var(--shadow-elevated); border-radius: var(--radius-lg); }
.date-text { white-space: nowrap; margin-bottom: 0.25rem; font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light); }
.workout-title {
  white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-xl); font-weight: var(--font-weight-bold);
  color: var(--color-primary); letter-spacing: -0.02em; line-height: var(--leading-tight);
}
.badge-completed {
  display: inline-flex; align-items: center; white-space: nowrap; font-family: var(--font-sans);
  font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--state-success);
  background: var(--state-success-bg); padding: 2px 8px; border-radius: var(--radius-full);
}
.icon-light { color: var(--color-primary-light); }
.info-value { white-space: nowrap; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light); }
.feeling-stars { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-sm); color: var(--state-warning); letter-spacing: 0.05em; }
.feeling-label { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary-light); }

/* ===== 笔记 ===== */
.notes-card { padding: 0.75rem 1rem; background: var(--color-surface-muted); border-radius: var(--radius-lg); }
.notes-title { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light); letter-spacing: 0.04em; }
.notes-body { font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary); line-height: var(--leading-relaxed); }
.line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

/* ===== 区域标题 ===== */
.section-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0 0.25rem; }
.section-dot { height: 0.25rem; width: 0.25rem; border-radius: var(--radius-full); }
.section-dot.main { background: var(--color-training-main); }
.section-dot.assist { background: var(--color-training-assist); }
.section-label { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light); letter-spacing: 0.04em; }

/* ===== 动作卡片 ===== */
.exercise-card { padding: 1rem; margin-bottom: 0.75rem; background: var(--color-surface); box-shadow: var(--shadow-card); border-radius: var(--radius-lg); }
.exercise-title { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-lg); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em; line-height: var(--leading-tight); }
.badge-main {
  display: inline-flex; align-items: center; white-space: nowrap; font-family: var(--font-sans);
  font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-training-main);
  background: var(--state-info-bg); padding: 2px 8px; border-radius: var(--radius-full);
}
.target-info { white-space: nowrap; margin-bottom: 0.75rem; font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light); }
.mono-semibold { font-family: var(--font-mono); font-weight: var(--font-weight-semibold); color: var(--color-primary); }

/* ===== 组行 ===== */
.set-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; }
.set-row.done { background: var(--color-surface-muted); border-radius: var(--radius-md); }
.set-row.skipped { background: var(--state-warning-bg); border-radius: var(--radius-md); }
.set-icon-circle { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-full); }
.set-icon-circle.done { background: var(--state-success); }
.set-icon-circle.skipped { background: var(--state-warning); }
.icon-surface { color: var(--color-surface); }
.set-name { overflow: hidden; text-overflow: ellipsis; font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); }
.set-value { white-space: nowrap; font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); }
.set-value.done { color: var(--color-primary); }
.set-value.skipped { color: var(--state-warning); }
.set-x { color: var(--color-primary-light); }

/* ===== 小计行 ===== */
.subtotal-row { display: flex; align-items: center; gap: 0.25rem; padding-top: 0.5rem; border-top: 1px solid var(--color-border-light); }
.subtotal-label { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light); }
.subtotal-value { white-space: nowrap; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary-light); }
.subtotal-sep { color: var(--color-border); }

/* ===== 辅助动作图标 ===== */
.assist-check-icon { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-full); background: var(--state-success); }

/* ===== 底部汇总 ===== */
.summary-card { padding: 1rem; background: var(--color-surface-muted); border-radius: var(--radius-lg); }
.summary-number { white-space: nowrap; margin-bottom: 0.125rem; font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em; }
.summary-label { white-space: nowrap; font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light); }
.summary-divider { height: 2rem; width: 1px; background: var(--color-border-light); }

/* ===== 错误状态 ===== */
.error-back-btn { padding: 0.375rem 1.5rem; border-radius: var(--radius-full); background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); }
</style>
