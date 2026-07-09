<template>
  <main class="pb-8 px-4 pt-3 max-w-lg mx-auto">
    <header class="flex items-center justify-between mb-5 h-11">
      <button class="inline-flex items-center justify-center w-8 h-8 rounded-lg" style="color:var(--color-primary);" aria-label="返回" @click="goBack">
        <i data-lucide="chevron-left" class="w-5 h-5"></i>
      </button>
      <h1 class="typography-title" style="letter-spacing:-0.01em;">体重记录</h1>
      <div class="w-8"></div>
    </header>

    <section class="rounded-lg p-5 mb-4" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="当前体重">
      <span class="typography-caption block mb-1">当前体重</span>
      <div class="flex items-baseline gap-1.5 mb-2">
        <span class="whitespace-nowrap" style="font-family:var(--font-mono); font-size:3rem; font-weight:var(--font-weight-bold); color:var(--color-primary); letter-spacing:-0.03em; line-height:1.1;">{{ currentWeight }}</span>
        <span class="typography-caption" style="font-size:var(--text-sm); color:var(--color-primary-light);">kg</span>
      </div>
      <div class="flex items-center gap-1.5 mb-1.5">
        <span style="font-family:var(--font-mono); font-size:var(--text-sm); font-weight:var(--font-weight-medium);" :style="{ color: changeColor }">{{ changeIndicator }}</span>
        <span class="typography-caption">较上次</span>
      </div>
      <span class="typography-caption">最后记录: {{ lastRecordDate }}</span>
    </section>

    <section class="rounded-lg p-4 mb-4" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="记录体重">
      <h2 class="typography-subtitle mb-3" style="font-size:var(--text-md);">记录体重</h2>
      <div class="flex items-center gap-3 mb-3">
        <div class="flex-1 min-w-0 flex items-center rounded-lg px-3 h-12" style="background:var(--color-surface-muted);">
          <input
            v-model="weightInput"
            type="number"
            step="0.1"
            placeholder="81.5"
            class="w-full bg-transparent border-none outline-none"
            style="font-family:var(--font-mono); font-size:var(--text-lg); font-weight:var(--font-weight-semibold); color:var(--color-primary); min-width:0;"
            aria-label="输入体重"
          >
          <span class="typography-caption whitespace-nowrap ml-1" style="color:var(--color-primary-light);">kg</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex-1 min-w-0 flex items-center rounded-lg px-3 h-11" style="background:var(--color-surface-muted);">
          <input
            v-model="recordDate"
            type="date"
            class="w-full bg-transparent border-none outline-none"
            style="font-family:var(--font-mono); font-size:var(--text-sm); font-weight:var(--font-weight-semibold); color:var(--color-primary); min-width:0;"
            aria-label="选择日期"
          >
        </div>
        <button
          class="shrink-0 h-11 px-6 rounded-lg whitespace-nowrap"
          style="background:var(--color-training-main); color:var(--color-surface); font-family:var(--font-sans); font-size:var(--text-base); font-weight:var(--font-weight-semibold);"
          @click="handleSave"
        >
          保存
        </button>
      </div>
    </section>

    <section class="rounded-lg p-4 mb-4" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="体重趋势">
      <div class="flex items-center justify-between mb-4">
        <h2 class="typography-subtitle" style="font-size:var(--text-md);">体重趋势</h2>
        <span class="typography-caption">近30天</span>
      </div>
      <div class="relative" style="aspect-ratio:16/10;">
        <svg viewBox="0 0 320 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="体重趋势折线图">
          <text x="28" y="42" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ chartYMax }}</text>
          <text x="28" y="82" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ chartYMidHigh }}</text>
          <text x="28" y="122" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ chartYMidLow }}</text>
          <text x="28" y="162" font-family="var(--font-mono)" font-size="10" fill="var(--color-primary-light)" text-anchor="end">{{ chartYMin }}</text>

          <line x1="36" y1="38" x2="300" y2="38" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="78" x2="300" y2="78" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="118" x2="300" y2="118" stroke="var(--color-border-light)" stroke-width="0.5"/>
          <line x1="36" y1="158" x2="300" y2="158" stroke="var(--color-border-light)" stroke-width="0.5"/>

          <text
            v-for="(pt, i) in chartPoints"
            :key="'x-' + i"
            :x="chartX(i)"
            y="178"
            font-family="var(--font-mono)"
            font-size="9"
            fill="var(--color-primary-light)"
            :text-anchor="i === 0 ? 'start' : i === chartPoints.length - 1 ? 'end' : 'middle'"
          >{{ pt.xLabel }}</text>

          <polyline
            v-if="chartPoints.length > 1"
            :points="chartLinePoints"
            style="fill: none; stroke: var(--color-training-main); stroke-width: 2.5px; stroke-linecap: round; stroke-linejoin: round;"
          />

          <circle
            v-for="(pt, i) in chartPoints"
            :key="'dp-' + i"
            :cx="chartX(i)"
            :cy="chartY(pt.value)"
            :r="i === chartPoints.length - 1 ? 4.5 : 4"
            style="fill: var(--color-training-main); stroke: var(--color-surface); stroke-width: 2px;"
          />

          <text
            v-for="(pt, i) in chartPoints"
            :key="'vl-' + i"
            :x="chartX(i)"
            :y="chartY(pt.value) - 10"
            font-family="var(--font-mono)"
            font-size="9"
            :fill="i === chartPoints.length - 1 ? 'var(--color-primary)' : 'var(--color-primary-light)'"
            :font-weight="i === chartPoints.length - 1 ? '600' : '400'"
            text-anchor="middle"
          >{{ pt.valueLabel }}</text>
        </svg>
      </div>
    </section>

    <section class="rounded-lg overflow-hidden mb-5" style="background:var(--color-surface); box-shadow:var(--shadow-card);" aria-label="历史记录">
      <h2 class="typography-subtitle px-4 pt-4 pb-1" style="font-size:var(--text-md);">历史记录</h2>

      <div
        v-for="(item, i) in displayHistory"
        :key="item.id"
        class="flex items-center justify-between px-4 py-3"
        :style="{ borderBottom: i < displayHistory.length - 1 ? '1px solid var(--color-border-light)' : 'none' }"
      >
        <div class="flex items-center gap-3">
          <span class="typography-caption whitespace-nowrap" style="font-family:var(--font-mono); color:var(--color-primary);">{{ item.dateLabel }}</span>
          <span class="typography-data whitespace-nowrap" style="font-size:var(--text-base);">{{ item.weightLabel }}</span>
        </div>
        <span class="whitespace-nowrap" style="font-family:var(--font-mono); font-size:var(--text-sm); font-weight:var(--font-weight-medium);" :style="{ color: item.changeColor }">{{ item.changeLabel }}</span>
      </div>

      <div class="px-4 py-3" style="border-top:1px solid var(--color-border-light);">
        <span
          class="typography-caption block text-center whitespace-nowrap"
          style="color:var(--color-training-main); font-size:var(--text-sm); cursor: pointer;"
          @click="toggleShowAll"
        >{{ showAllHistory ? '收起' : '查看全部' }}</span>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createIcons, icons } from 'lucide'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { getToday, formatDate, formatDateFull } from '@/services/dateService'

const router = useRouter()
const route = useRoute()
const bodyMetricStore = useBodyMetricStore()

const weightInput = ref<number | null>(null)
const recordDate = ref(getToday())
const showAllHistory = ref(false)

const sortedMetrics = computed(() => {
  return [...bodyMetricStore.metrics].sort((a, b) => b.date.localeCompare(a.date))
})

const currentWeight = computed(() => {
  if (sortedMetrics.value.length === 0) return '--'
  return sortedMetrics.value[0].weight.toFixed(1)
})

const lastRecordDate = computed(() => {
  if (sortedMetrics.value.length === 0) return '暂无记录'
  return formatDateFull(sortedMetrics.value[0].date)
})

const weightDiff = computed(() => {
  if (sortedMetrics.value.length < 2) return 0
  return sortedMetrics.value[0].weight - sortedMetrics.value[1].weight
})

const changeColor = computed(() => {
  if (weightDiff.value > 0) return 'var(--state-warning)'
  if (weightDiff.value < 0) return 'var(--state-success)'
  return 'var(--color-primary-light)'
})

const changeIndicator = computed(() => {
  if (sortedMetrics.value.length < 2) return '—'
  const diff = weightDiff.value
  const sign = diff > 0 ? '↑' : diff < 0 ? '↓' : '—'
  return `${sign} ${Math.abs(diff).toFixed(1)}kg`
})

const chartMetrics = computed(() => {
  return [...bodyMetricStore.metrics].sort((a, b) => a.date.localeCompare(b.date))
})

const chartPoints = computed(() => {
  const items = chartMetrics.value.slice(-7)
  return items.map(m => ({
    xLabel: m.date.slice(5).replace('-', '/'),
    value: m.weight,
    valueLabel: m.weight.toFixed(1),
  }))
})

const chartValues = computed(() => chartPoints.value.map(p => p.value))

const chartYMax = computed(() => {
  if (chartValues.value.length === 0) return 83
  return Math.ceil(Math.max(...chartValues.value)) + 1
})

const chartYMin = computed(() => {
  if (chartValues.value.length === 0) return 80
  return Math.floor(Math.min(...chartValues.value)) - 1
})

const chartYMidHigh = computed(() => Math.round((chartYMax.value * 2 + chartYMin.value) / 3))
const chartYMidLow = computed(() => Math.round((chartYMax.value + chartYMin.value * 2) / 3))

function chartX(index: number): number {
  const total = chartPoints.value.length
  if (total <= 1) return 160
  return 36 + (index / (total - 1)) * 264
}

function chartY(value: number): number {
  const range = chartYMax.value - chartYMin.value || 1
  return 158 - ((value - chartYMin.value) / range) * 120
}

const chartLinePoints = computed(() => {
  return chartPoints.value.map((pt, i) => `${chartX(i)},${chartY(pt.value)}`).join(' ')
})

const displayHistory = computed(() => {
  const items = showAllHistory.value ? sortedMetrics.value : sortedMetrics.value.slice(0, 5)
  return items.map((m, i) => {
    const next = i < items.length - 1 ? items[i + 1] : null
    const diff = next ? m.weight - next.weight : 0
    let changeColor: string
    let changeLabel: string
    if (diff > 0) {
      changeColor = 'var(--state-warning)'
      changeLabel = `↑ ${diff.toFixed(1)}`
    } else if (diff < 0) {
      changeColor = 'var(--state-success)'
      changeLabel = `↓ ${Math.abs(diff).toFixed(1)}`
    } else {
      changeColor = 'var(--color-primary-light)'
      changeLabel = '—'
    }
    return {
      id: m.id,
      dateLabel: formatDate(m.date),
      weightLabel: `${m.weight.toFixed(1)}kg`,
      changeColor,
      changeLabel,
    }
  })
})

function handleSave() {
  const w = weightInput.value
  if (w == null || isNaN(w) || w <= 0) return

  const id = `bw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  bodyMetricStore.addMetric({
    id,
    date: recordDate.value,
    weight: w,
    unit: 'kg',
  })
  weightInput.value = null
}

function toggleShowAll() {
  showAllHistory.value = !showAllHistory.value
}

function goBack() {
  router.back()
}

watch(() => route.path, () => {
  setTimeout(() => {
    createIcons({ icons })
  }, 50)
}, { immediate: true })
</script>
