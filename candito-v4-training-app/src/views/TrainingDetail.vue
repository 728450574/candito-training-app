<template>
  <main class="min-h-screen max-w-lg mx-auto" style="background: var(--color-surface);">
    <header class="sticky top-0 z-30 flex h-12 items-center justify-between px-4" style="background: var(--color-surface); border-bottom: 1px solid var(--color-border-light);">
      <button class="inline-flex h-8 w-8 items-center justify-center" style="color: var(--color-training-main);" aria-label="返回" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </button>
      <h1 class="min-w-0 flex-1 text-center truncate" style="font-family: var(--font-sans); font-size: var(--text-base); font-weight: var(--font-weight-semibold); color: var(--color-primary); letter-spacing: -0.01em;">训练详情</h1>
      <div class="w-8"></div>
    </header>

    <template v-if="record && dayData">
      <section class="px-4 pt-5 pb-3">
        <div class="px-4 py-4" style="background: var(--color-surface); box-shadow: var(--shadow-elevated); border-radius: var(--radius-lg);">
          <p class="whitespace-nowrap mb-1" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">{{ displayDate }}</p>
          <div class="flex items-center gap-2 mb-3">
            <h2 class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em; line-height: var(--leading-tight);">{{ workoutTypeLabel }} · W{{ weekNum }}D{{ dayNum }}</h2>
            <span class="inline-flex items-center whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--state-success); background: var(--state-success-bg); padding: 2px 8px; border-radius: var(--radius-full);">已完成</span>
          </div>
          <div class="flex items-center gap-4 mb-3">
            <div class="flex items-center gap-1">
              <Clock class="h-3.5 w-3.5" style="color: var(--color-primary-light);" />
              <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light);">{{ record.duration }}分钟</p>
            </div>
            <div class="flex items-center gap-1" v-if="record.bodyWeight">
              <Scale class="h-3.5 w-3.5" style="color: var(--color-primary-light);" />
              <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light);">{{ record.bodyWeight }}{{ unit }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--state-warning); letter-spacing: 0.05em;">{{ feelingStars }}</p>
            <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary-light);">{{ feelingLabel }}</p>
          </div>
        </div>
      </section>

      <section class="px-4 pb-3" v-if="record.notes">
        <div class="px-4 py-3" style="background: var(--color-surface-muted); border-radius: var(--radius-lg);">
          <div class="flex items-center gap-1.5 mb-2">
            <PencilLine class="h-3.5 w-3.5" style="color: var(--color-primary-light);" />
            <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light); letter-spacing: 0.04em;">训练笔记</p>
          </div>
          <p class="line-clamp-4" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary); line-height: var(--leading-relaxed);">{{ record.notes }}</p>
        </div>
      </section>

      <section class="px-4 pt-2 pb-3">
        <div class="flex items-center gap-2 mb-3 px-1">
          <div class="h-1 w-1" style="background: var(--color-training-main); border-radius: var(--radius-full);"></div>
          <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light); letter-spacing: 0.04em;">主项训练</p>
        </div>

        <div v-for="(exercise, idx) in mainExercises" :key="exercise.exerciseId" class="px-4 py-4 mb-3" style="background: var(--color-surface); box-shadow: var(--shadow-card); border-radius: var(--radius-lg);">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-lg); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em; line-height: var(--leading-tight);">{{ exercise.name }}</h3>
            <span class="inline-flex items-center whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-training-main); background: var(--state-info-bg); padding: 2px 8px; border-radius: var(--radius-full);">主项</span>
          </div>
          <p class="whitespace-nowrap mb-3" style="font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-primary-light);">
            目标: <span style="font-family: var(--font-mono); font-weight: var(--font-weight-semibold); color: var(--color-primary);">{{ targetDisplay(exercise) }}</span>
          </p>

          <div class="flex flex-col gap-1.5 mb-3">
            <div v-for="set in exercise.sets" :key="set.setNumber" class="flex items-center gap-3 px-3 py-2.5" :style="setRowStyle(set)">
              <div class="inline-flex items-center justify-center" style="width: 22px; height: 22px; border-radius: var(--radius-full);" :style="setIconStyle(set)">
                <Check v-if="set.isCompleted && !set.isSkipped" class="h-3 w-3" style="color: var(--color-surface);" />
                <AlertTriangle v-else class="h-3 w-3" style="color: var(--color-surface);" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="truncate" style="font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);">第 {{ set.setNumber }} 组</p>
              </div>
              <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-semibold);" :style="setValueStyle(set)">
                {{ set.actualWeight ?? set.targetWeight ?? 0 }}kg <span style="color: var(--color-primary-light);">x</span> {{ set.actualReps ?? 0 }}次
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 pt-2" style="border-top: 1px solid var(--color-border-light);">
            <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">小计:</p>
            <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary-light);">{{ completedSetsCount(exercise) }}组</p>
            <span style="color: var(--color-border);">|</span>
            <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary-light);">容量: {{ exerciseVolume(exercise) }}kg</p>
          </div>
        </div>
      </section>

      <section class="px-4 pb-3" v-if="assistanceExercises.length > 0">
        <div class="flex items-center gap-2 mb-3 px-1">
          <div class="h-1 w-1" style="background: var(--color-training-assist); border-radius: var(--radius-full);"></div>
          <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-primary-light); letter-spacing: 0.04em;">辅助训练</p>
        </div>

        <div class="flex flex-col gap-3">
          <div v-for="exercise in assistanceExercises" :key="exercise.exerciseId" class="px-4 py-4" style="background: var(--color-surface); box-shadow: var(--shadow-card); border-radius: var(--radius-lg);">
            <div class="flex items-center gap-2 mb-3">
              <div class="inline-flex items-center justify-center" style="width: 22px; height: 22px; border-radius: var(--radius-full); background: var(--state-success);">
                <Check class="h-3 w-3" style="color: var(--color-surface);" />
              </div>
              <h3 class="truncate" style="font-family: var(--font-sans); font-size: var(--text-lg); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em; line-height: var(--leading-tight);">{{ exercise.name }}</h3>
            </div>

            <div class="flex flex-col gap-1.5 mb-3">
              <div v-for="set in exercise.sets" :key="set.setNumber" class="flex items-center gap-3 px-3 py-2.5" :style="setRowStyle(set)">
                <div class="inline-flex items-center justify-center" style="width: 22px; height: 22px; border-radius: var(--radius-full);" :style="setIconStyle(set)">
                  <Check v-if="set.isCompleted && !set.isSkipped" class="h-3 w-3" style="color: var(--color-surface);" />
                  <AlertTriangle v-else class="h-3 w-3" style="color: var(--color-surface);" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="truncate" style="font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);">第 {{ set.setNumber }} 组</p>
                </div>
                <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-semibold);" :style="setValueStyle(set)">
                  {{ set.actualWeight ?? set.targetWeight ?? 0 }}kg <span style="color: var(--color-primary-light);">x</span> {{ set.actualReps ?? 0 }}次
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1 pt-2" style="border-top: 1px solid var(--color-border-light);">
              <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">小计:</p>
              <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary-light);">{{ completedSetsCount(exercise) }}组</p>
              <span style="color: var(--color-border);">|</span>
              <p class="whitespace-nowrap" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-primary-light);">容量: {{ exerciseVolume(exercise) }}kg</p>
            </div>
          </div>
        </div>
      </section>

      <section class="px-4 pb-8">
        <div class="px-4 py-4" style="background: var(--color-surface-muted); border-radius: var(--radius-lg);">
          <div class="flex items-center justify-around">
            <div class="text-center">
              <p class="whitespace-nowrap mb-0.5" style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em;">{{ totalVolumeValue }}</p>
              <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">总容量 kg</p>
            </div>
            <div class="h-8" style="width: 1px; background: var(--color-border-light);"></div>
            <div class="text-center">
              <p class="whitespace-nowrap mb-0.5" style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em;">{{ totalSetsCount }}</p>
              <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">总组数</p>
            </div>
            <div class="h-8" style="width: 1px; background: var(--color-border-light);"></div>
            <div class="text-center">
              <p class="whitespace-nowrap mb-0.5" style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em;">{{ avgRestSeconds }}</p>
              <p class="whitespace-nowrap" style="font-family: var(--font-sans); font-size: var(--text-xs); color: var(--color-primary-light);">平均休息 秒</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">未找到训练记录</p>
        <button class="px-6 py-2 rounded-full" style="background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm); font-weight: var(--font-weight-semibold);" @click="goBack">返回</button>
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

const cycle = computed(() => {
  return cycleId.value ? cycleStore.getCycleById(cycleId.value) : cycleStore.activeCycle
})

const dayData = computed(() => {
  if (!cycle.value) return null
  for (const week of cycle.value.weeks) {
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

const record = computed(() => {
  if (!cycle.value) return null
  return recordStore.getRecordForDay(cycle.value.id, weekNum.value, dayNum.value) || null
})

const unit = computed(() => {
  return cycle.value?.unit || 'kg'
})

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

const totalVolumeValue = computed(() => {
  if (!record.value) return 0
  return calculateVolume(record.value)
})

const totalSetsCount = computed(() => {
  if (!record.value) return 0
  let count = 0
  for (const ex of record.value.exercises) {
    count += ex.sets.filter((s: SetRecord) => s.isCompleted).length
  }
  return count
})

const avgRestSeconds = computed(() => {
  if (!record.value) return 0
  const restTimes: number[] = []
  for (const ex of record.value.exercises) {
    for (const set of ex.sets) {
      if (set.restSeconds != null && set.restSeconds > 0) {
        restTimes.push(set.restSeconds)
      }
    }
  }
  if (restTimes.length === 0) return 0
  const sum = restTimes.reduce((a, b) => a + b, 0)
  return Math.round(sum / restTimes.length)
})

function completedSetsCount(exercise: ExerciseRecord): number {
  return exercise.sets.filter(s => s.isCompleted).length
}

function exerciseVolume(exercise: ExerciseRecord): string {
  let total = 0
  for (const set of exercise.sets) {
    const w = set.actualWeight ?? set.targetWeight ?? 0
    const r = set.actualReps ?? 0
    total += w * r
  }
  return total.toLocaleString()
}

function targetDisplay(exercise: ExerciseRecord): string {
  const firstSet = exercise.sets[0]
  if (!firstSet) return '--'
  return `${firstSet.targetWeight ?? 0}kg x MR${firstSet.targetReps ?? '--'}`
}

function setRowStyle(set: SetRecord): Record<string, string> {
  if (!set.isCompleted || set.isSkipped) {
    return {
      background: 'var(--state-warning-bg)',
      borderRadius: 'var(--radius-md)',
    }
  }
  return {
    background: 'var(--color-surface-muted)',
    borderRadius: 'var(--radius-md)',
  }
}

function setIconStyle(set: SetRecord): Record<string, string> {
  if (!set.isCompleted || set.isSkipped) {
    return { background: 'var(--state-warning)' }
  }
  return { background: 'var(--state-success)' }
}

function setValueStyle(set: SetRecord): Record<string, string> {
  if (!set.isCompleted || set.isSkipped) {
    return { color: 'var(--state-warning)' }
  }
  return { color: 'var(--color-primary)' }
}

function goBack() {
  router.back()
}
</script>
