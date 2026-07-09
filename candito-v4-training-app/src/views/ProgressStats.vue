<template>
  <main class="pb-24 px-4 pt-3 max-w-lg mx-auto">
    <header class="flex items-center justify-between mb-5">
      <h1 class="typography-title">进度统计</h1>
      <span class="typography-caption">第 {{ activeCycle?.weeks.length ?? '--' }} 周期</span>
    </header>

    <nav class="flex rounded-lg p-0.5 mb-5" style="background:var(--color-surface-muted);" aria-label="时间筛选">
      <button
        v-for="opt in periodOptions"
        :key="opt.key"
        class="flex-1 py-2 text-center text-sm font-medium rounded-md transition-all duration-200"
        :style="periodStyle(opt.key)"
        @click="selectedPeriod = opt.key"
      >
        {{ opt.label }}
      </button>
    </nav>

    <section class="flex gap-2.5 mb-5" aria-label="训练概览">
      <div class="flex-1 rounded-lg p-3" style="background:var(--color-surface-muted);">
        <span class="typography-caption block mb-1">总训练</span>
        <span class="typography-data-lg whitespace-nowrap">{{ totalSessions }}</span>
        <span class="typography-caption">次</span>
      </div>
      <div class="flex-1 rounded-lg p-3" style="background:var(--color-surface-muted);">
        <span class="typography-caption block mb-1">总容量</span>
        <span class="typography-data whitespace-nowrap">{{ formattedVolume }}</span>
        <span class="typography-caption">kg</span>
      </div>
      <div class="flex-1 rounded-lg p-3" style="background:var(--color-surface-muted);">
        <span class="typography-caption block mb-1">平均感受</span>
        <div class="flex items-baseline gap-1">
          <span class="typography-data whitespace-nowrap">{{ averageFeeling }}</span>
          <div class="flex items-center" style="color:var(--state-warning); font-size:10px; line-height:1;">
            <svg width="48" height="10" viewBox="0 0 48 10" fill="none" aria-label="星级评分">
              <polygon points="5,0 6.4,3.5 10,3.8 7.4,6.2 8.2,9.8 5,8 1.8,9.8 2.6,6.2 0,3.8 3.6,3.5" :fill="starColor(1)"/>
              <polygon points="15,0 16.4,3.5 20,3.8 17.4,6.2 18.2,9.8 15,8 11.8,9.8 12.6,6.2 10,3.8 13.6,3.5" :fill="starColor(2)"/>
              <polygon points="25,0 26.4,3.5 30,3.8 27.4,6.2 28.2,9.8 25,8 21.8,9.8 22.6,6.2 20,3.8 23.6,3.5" :fill="starColor(3)"/>
              <polygon points="35,0 36.4,3.5 40,3.8 37.4,6.2 38.2,9.8 35,8 31.8,9.8 32.6,6.2 30,3.8 33.6,3.5" :fill="starColor(4)"/>
              <polygon points="45,0 46.4,3.5 50,3.8 47.4,6.2 48.2,9.8 45,8 41.8,9.8 42.6,6.2 40,3.8 43.6,3.5" :fill="starColor(5)"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg p-4 mb-5" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="1RM趋势图">
      <div class="flex items-center justify-between mb-4">
        <h2 class="typography-subtitle">跨周期 1RM 趋势</h2>
        <span class="typography-caption">单位: kg</span>
      </div>

      <div class="flex gap-4 mb-3">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:var(--color-training-main);"></span>
          <span class="typography-caption">深蹲</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:var(--color-training-assist);"></span>
          <span class="typography-caption">卧推</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:var(--color-warm);"></span>
          <span class="typography-caption">硬拉</span>
        </div>
      </div>

      <div class="relative" style="aspect-ratio:16/10;">
        <svg viewBox="0 0 320 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="1RM趋势折线图">
          <defs>
            <linearGradient id="grad-squat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0A84FF" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="#0A84FF" stop-opacity="0.01"/>
            </linearGradient>
            <linearGradient id="grad-bench" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#5E5CE6" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#5E5CE6" stop-opacity="0.01"/>
            </linearGradient>
            <linearGradient id="grad-deadlift" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FF6B35" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#FF6B35" stop-opacity="0.01"/>
            </linearGradient>
          </defs>

          <text x="28" y="22" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ yMax }}</text>
          <text x="28" y="62" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ yMidHigh }}</text>
          <text x="28" y="102" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ yMid }}</text>
          <text x="28" y="142" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ yMidLow }}</text>
          <text x="28" y="179" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ yMin }}</text>

          <line x1="36" y1="18" x2="300" y2="18" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="58" x2="300" y2="58" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="98" x2="300" y2="98" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="138" x2="300" y2="138" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="175" x2="300" y2="175" stroke="var(--color-border-light)" stroke-width="0.5"/>

          <text
            v-for="(c, i) in rmTrend.cycleLabels"
            :key="'x-' + i"
            :x="xPos(i, rmTrend.cycleLabels.length)"
            y="190"
            font-family="var(--font-mono)"
            font-size="10"
            fill="var(--color-primary-light)"
            text-anchor="middle"
          >{{ c }}</text>

          <polygon
            v-if="rmTrend.squat.length > 0"
            :points="areaPoints(rmTrend.squat)"
            fill="url(#grad-squat)"
          />
          <polygon
            v-if="rmTrend.bench.length > 0"
            :points="areaPoints(rmTrend.bench)"
            fill="url(#grad-bench)"
          />
          <polygon
            v-if="rmTrend.deadlift.length > 0"
            :points="areaPoints(rmTrend.deadlift)"
            fill="url(#grad-deadlift)"
          />

          <polyline
            v-if="rmTrend.squat.length > 1"
            :points="linePoints(rmTrend.squat)"
            fill="none" stroke="#0A84FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          />
          <polyline
            v-if="rmTrend.bench.length > 1"
            :points="linePoints(rmTrend.bench)"
            fill="none" stroke="#5E5CE6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          />
          <polyline
            v-if="rmTrend.deadlift.length > 1"
            :points="linePoints(rmTrend.deadlift)"
            fill="none" stroke="#FF6B35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          />

          <template v-if="rmTrend.squat.length > 0">
            <circle
              v-for="(pt, i) in rmTrend.squat"
              :key="'sq-' + i"
              :cx="xPos(i, rmTrend.squat.length)"
              :cy="yPos(pt.value)"
              r="4.5" fill="#0A84FF" stroke="var(--color-surface)" stroke-width="2"
            />
          </template>
          <template v-if="rmTrend.bench.length > 0">
            <circle
              v-for="(pt, i) in rmTrend.bench"
              :key="'be-' + i"
              :cx="xPos(i, rmTrend.bench.length)"
              :cy="yPos(pt.value)"
              r="4.5" fill="#5E5CE6" stroke="var(--color-surface)" stroke-width="2"
            />
          </template>
          <template v-if="rmTrend.deadlift.length > 0">
            <circle
              v-for="(pt, i) in rmTrend.deadlift"
              :key="'dl-' + i"
              :cx="xPos(i, rmTrend.deadlift.length)"
              :cy="yPos(pt.value)"
              r="4.5" fill="#FF6B35" stroke="var(--color-surface)" stroke-width="2"
            />
          </template>
        </svg>
      </div>
    </section>

    <section class="rounded-lg mb-5 overflow-hidden" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="每周完成情况">
      <h2 class="typography-subtitle px-4 pt-4 pb-2">每周完成</h2>

      <div
        v-for="week in weeklyCompletion"
        :key="week.weekNumber"
        class="flex items-center gap-3 px-4 py-3"
        :style="{ borderBottom: week.weekNumber < weeklyCompletion.length ? '1px solid var(--color-border-light)' : 'none' }"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium" style="color:var(--color-primary);">第 {{ week.weekNumber }} 周</span>
              <span
                v-if="week.isInProgress"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                style="background:var(--state-info-bg); color:var(--state-info);"
              >进行中</span>
            </div>
            <span class="typography-caption">{{ week.completed }}/{{ week.total }}</span>
          </div>
          <div class="w-full h-1.5 rounded-full overflow-hidden" style="background:var(--color-surface-muted);">
            <div
              class="h-full rounded-full"
              :style="{ width: week.percent + '%', background: week.isInProgress ? 'var(--state-info)' : 'var(--state-success)' }"
            ></div>
          </div>
        </div>
        <div class="flex gap-1 shrink-0">
          <template v-if="week.completed > 0">
            <i
              v-for="n in Math.min(week.completed, 3)"
              :key="n"
              data-lucide="dumbbell"
              class="w-3.5 h-3.5"
              :style="{ color: n === 1 ? 'var(--color-training-main)' : n === 2 ? 'var(--color-training-assist)' : 'var(--color-warm)' }"
            ></i>
          </template>
          <span v-else class="typography-caption text-xs">未开始</span>
        </div>
      </div>
    </section>

    <section class="rounded-lg p-4 mb-5" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="体重记录">
      <div class="flex items-center justify-between mb-3">
        <h2 class="typography-subtitle">体重记录</h2>
        <span class="typography-caption">kg</span>
      </div>

      <div class="mb-2">
        <svg viewBox="0 0 300 60" width="100%" height="60" preserveAspectRatio="xMidYMid meet" aria-label="体重趋势迷你图">
          <defs>
            <linearGradient id="grad-weight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-training-main)" stop-opacity="0.10"/>
              <stop offset="100%" stop-color="var(--color-training-main)" stop-opacity="0.01"/>
            </linearGradient>
          </defs>
          <polygon v-if="weightPoints.length > 2" :points="weightAreaPoints" fill="url(#grad-weight)"/>
          <polyline v-if="weightPoints.length > 1" :points="weightLinePoints" fill="none" stroke="var(--color-training-main)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle
            v-for="(pt, i) in weightPoints"
            :key="'w-' + i"
            :cx="weightX(i)"
            :cy="weightY(pt.value)"
            :r="i === weightPoints.length - 1 ? 3.5 : 3"
            :fill="i === weightPoints.length - 1 ? 'var(--color-training-main)' : 'var(--color-training-main)'"
            stroke="var(--color-surface)" stroke-width="1.5"
          />
          <text
            v-for="(pt, i) in weightPoints"
            :key="'wl-' + i"
            :x="weightX(i)"
            :y="weightY(pt.value) - 6"
            font-family="var(--font-mono)"
            font-size="9"
            :fill="i === weightPoints.length - 1 ? 'var(--color-primary)' : 'var(--color-primary-light)'"
            :font-weight="i === weightPoints.length - 1 ? '600' : '400'"
            text-anchor="middle"
          >{{ pt.label }}</text>
        </svg>
      </div>

      <div class="flex items-center gap-2">
        <i data-lucide="scale" class="w-3.5 h-3.5" style="color:var(--color-primary-light);"></i>
        <span class="typography-caption">
          最新: <span class="typography-data" style="font-size:var(--text-sm);">{{ latestWeight }}</span> kg &middot; {{ latestWeightDate }}
        </span>
      </div>
    </section>

    <div class="flex justify-center mt-3">
      <button
        class="inline-flex items-center gap-1.5 px-4 py-2"
        style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-training-main); background: var(--state-info-bg); border-radius: var(--radius-full);"
        @click="goWeight"
      >
        <i data-lucide="scale" style="width: 14px; height: 14px;"></i>
        记录体重
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createIcons, icons } from 'lucide'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { calculateTotalVolume, getAverageFeeling, get1rmTrend, calculateWeeklyCompletion } from '@/services/statsService'
import { formatDate } from '@/services/dateService'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()
const bodyMetricStore = useBodyMetricStore()

const selectedPeriod = ref<'current' | 'history' | 'all'>('current')

const periodOptions = [
  { key: 'current' as const, label: '本周期' },
  { key: 'history' as const, label: '历史' },
  { key: 'all' as const, label: '全部' },
]

const activeCycle = computed(() => cycleStore.activeCycle)

function periodStyle(key: string) {
  const isActive = selectedPeriod.value === key
  if (isActive) {
    return {
      background: 'var(--color-surface)',
      boxShadow: 'var(--shadow-card)',
      color: 'var(--color-primary)',
    }
  }
  return { color: 'var(--color-primary-light)' }
}

const completedCycles = computed(() => cycleStore.getCompletedCycles())

const relevantCycles = computed(() => {
  if (selectedPeriod.value === 'current') {
    return activeCycle.value ? [activeCycle.value] : []
  }
  if (selectedPeriod.value === 'history') {
    return completedCycles.value
  }
  return cycleStore.cycles
})

const relevantRecords = computed(() => {
  const result: Record<string, any[]> = {}
  for (const c of relevantCycles.value) {
    result[c.id] = recordStore.getRecordsForCycle(c.id)
  }
  return result
})

const allRecords = computed(() => {
  const all: any[] = []
  for (const c of relevantCycles.value) {
    all.push(...recordStore.getRecordsForCycle(c.id))
  }
  return all
})

const totalSessions = computed(() => allRecords.value.length)

const formattedVolume = computed(() => {
  const vol = calculateTotalVolume(allRecords.value)
  return vol.toLocaleString()
})

const averageFeeling = computed(() => {
  const f = getAverageFeeling(allRecords.value)
  return f.toFixed(1)
})

function starColor(starIndex: number) {
  const avg = parseFloat(averageFeeling.value) || 0
  const threshold = starIndex <= Math.round(avg) ? avg : 0
  if (threshold > 0) {
    return 'var(--state-warning)'
  }
  return 'var(--state-warning)'
}

const rmTrend = computed(() => {
  const cycles = relevantCycles.value
  const records = relevantRecords.value
  return buildTrendData(cycles, records)
})

function buildTrendData(cycles: any[], records: Record<string, any[]>) {
  const squat: { label: string; value: number }[] = []
  const bench: { label: string; value: number }[] = []
  const deadlift: { label: string; value: number }[] = []
  const cycleLabels: string[] = []

  for (const cycle of cycles) {
    const label = cycle.name || `C${cycleLabels.length + 1}`
    cycleLabels.push(label)
    const cycleRecords = records[cycle.id] ?? []
    squat.push({ label, value: findBest1RM(cycleRecords, '深蹲', cycle.oneRM?.squat || 0) })
    bench.push({ label, value: findBest1RM(cycleRecords, '卧推', cycle.oneRM?.bench || 0) })
    deadlift.push({ label, value: findBest1RM(cycleRecords, '硬拉', cycle.oneRM?.deadlift || 0) })
  }

  return { squat, bench, deadlift, cycleLabels }
}

function findBest1RM(records: any[], exerciseName: string, default1RM: number): number {
  let best = default1RM
  for (const record of records) {
    for (const exercise of record.exercises) {
      if (exercise.name !== exerciseName) continue
      for (const set of exercise.sets) {
        const reps = set.actualReps
        const weight = set.actualWeight
        if (reps == null || weight == null || reps <= 0) continue
        const estimated = weight * (1 + reps / 30)
        if (estimated > best) best = Math.round(estimated)
      }
    }
  }
  return best
}

const allValues1RM = computed(() => {
  const v: number[] = []
  for (const arr of [rmTrend.value.squat, rmTrend.value.bench, rmTrend.value.deadlift]) {
    for (const pt of arr) v.push(pt.value)
  }
  return v
})

const yMax = computed(() => {
  const vals = allValues1RM.value
  if (vals.length === 0) return 120
  const max = Math.max(...vals)
  return Math.ceil(max / 10) * 10
})

const yMin = computed(() => {
  const vals = allValues1RM.value
  if (vals.length === 0) return 80
  const min = Math.min(...vals)
  return Math.floor(min / 10) * 10
})

const yMid = computed(() => Math.round((yMax.value + yMin.value) / 2))
const yMidHigh = computed(() => Math.round((yMax.value + yMid.value) / 2))
const yMidLow = computed(() => Math.round((yMid.value + yMin.value) / 2))

function yPos(value: number): number {
  const range = yMax.value - yMin.value || 1
  return 175 - ((value - yMin.value) / range) * 157
}

function xPos(index: number, total: number): number {
  if (total <= 1) return 160
  const step = (300 - 36) / (total - 1)
  return 36 + index * step
}

function linePoints(arr: { value: number }[]): string {
  return arr.map((pt, i) => `${xPos(i, arr.length)},${yPos(pt.value)}`).join(' ')
}

function areaPoints(arr: { value: number }[]): string {
  if (arr.length < 2) return ''
  const top = arr.map((pt, i) => `${xPos(i, arr.length)},${yPos(pt.value)}`).join(' ')
  const bottom = `${xPos(arr.length - 1, arr.length)},175 ${xPos(0, arr.length)},175`
  return top + ' ' + bottom
}

const weeklyCompletion = computed(() => {
  const cycle = selectedPeriod.value === 'current' ? activeCycle.value
    : selectedPeriod.value === 'history' ? completedCycles.value[completedCycles.value.length - 1]
    : cycleStore.cycles[cycleStore.cycles.length - 1]
  if (!cycle) return []
  const completion = calculateWeeklyCompletion(cycle)

  return completion.map(week => ({
    ...week,
    isInProgress: week.completed > 0 && week.completed < week.total,
  }))
})

const weightMetrics = computed(() => {
  const all = bodyMetricStore.metrics
  return [...all].sort((a, b) => a.date.localeCompare(b.date))
})

const weightPoints = computed(() => {
  return weightMetrics.value.slice(-7).map(m => ({
    label: m.weight.toFixed(1),
    value: m.weight,
    date: m.date,
  }))
})

const latestWeight = computed(() => {
  if (weightPoints.value.length === 0) return '--'
  return weightPoints.value[weightPoints.value.length - 1].label
})

const latestWeightDate = computed(() => {
  if (weightMetrics.value.length === 0) return '--'
  const latest = weightMetrics.value[weightMetrics.value.length - 1]
  return formatDate(latest.date)
})

const weightValues = computed(() => weightPoints.value.map(p => p.value))

const weightMin = computed(() => {
  if (weightValues.value.length === 0) return 80
  return Math.floor(Math.min(...weightValues.value)) - 1
})

const weightMax = computed(() => {
  if (weightValues.value.length === 0) return 85
  return Math.ceil(Math.max(...weightValues.value)) + 1
})

function weightX(index: number): number {
  const total = weightPoints.value.length
  if (total <= 1) return 150
  return 30 + (index / (total - 1)) * 240
}

function weightY(value: number): number {
  const range = weightMax.value - weightMin.value || 1
  return 55 - ((value - weightMin.value) / range) * 40
}

const weightLinePoints = computed(() => {
  return weightPoints.value.map((pt, i) => `${weightX(i)},${weightY(pt.value)}`).join(' ')
})

const weightAreaPoints = computed(() => {
  if (weightPoints.value.length < 2) return ''
  const top = weightPoints.value.map((pt, i) => `${weightX(i)},${weightY(pt.value)}`).join(' ')
  const lastX = weightX(weightPoints.value.length - 1)
  const firstX = weightX(0)
  return top + ` ${lastX},55 ${firstX},55`
})

function goWeight() {
  router.push({ name: 'weight' })
}

watch(() => route.path, () => {
  setTimeout(() => {
    createIcons({ icons })
  }, 50)
}, { immediate: true })
</script>

<style scoped>
@keyframes progress-fill {
  from { width: 0%; }
}
[style*="width:"] {
  animation: progress-fill 0.8s var(--ease-default) both;
}
</style>
