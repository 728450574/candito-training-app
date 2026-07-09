<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <header
      class="sticky top-0 z-30 flex h-11 items-center justify-between border-b px-4 -mx-4"
      style="background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); border-color: var(--color-border);"
    >
      <button class="flex h-9 w-9 items-center justify-center" style="border-radius: var(--radius-md);" aria-label="返回" @click="goBack">
        <ChevronLeft class="h-5 w-5" style="color: var(--color-primary);" />
      </button>
      <h1 class="text-base font-semibold tracking-tight" style="color: var(--color-primary);">设置 1RM</h1>
      <div class="w-9"></div>
    </header>

    <div class="px-4 pt-4 -mx-4">
      <div class="flex rounded-lg p-1" style="background: var(--color-surface-muted); box-shadow: var(--shadow-card);">
        <button
          class="flex-1 py-2 text-center text-sm font-semibold"
          :style="unit === 'kg' ? { background: 'var(--color-surface)', color: 'var(--color-training-main)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-elevated)', fontFamily: 'var(--font-mono)' } : { color: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }"
          @click="unit = 'kg'"
        >kg</button>
        <button
          class="flex-1 py-2 text-center text-sm font-medium"
          :style="unit === 'lb' ? { background: 'var(--color-surface)', color: 'var(--color-training-main)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-elevated)', fontFamily: 'var(--font-mono)' } : { color: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }"
          @click="unit = 'lb'"
        >lb</button>
      </div>

      <div class="mt-5 flex flex-col gap-3">
        <div v-for="lift in lifts" :key="lift.key" class="rounded-xl p-4" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center" style="background: var(--state-info-bg); border-radius: var(--radius-md);">
              <div v-if="lift.key === 'squat'" class="flex flex-col items-center" style="color: var(--color-training-main);">
                <div class="h-3 w-3 rounded-full border-2" style="border-color: var(--color-training-main);"></div>
                <ArrowDown class="-mt-1.5 h-3.5 w-3.5" style="color: var(--color-training-main);" />
              </div>
              <div v-else-if="lift.key === 'bench'" class="flex items-center gap-0.5" style="color: var(--color-training-main);">
                <div class="h-0.5 w-5" style="background: var(--color-training-main);"></div>
                <div class="h-2.5 w-2.5 rounded-sm" style="background: var(--color-training-main); opacity: 0.6;"></div>
              </div>
              <div v-else class="flex flex-col items-center" style="color: var(--color-training-main);">
                <div class="h-4 w-0.5" style="background: var(--color-training-main);"></div>
                <div class="h-2.5 w-2.5 rounded-sm -mt-0.5" style="background: var(--color-training-main); opacity: 0.6;"></div>
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-primary);">{{ lift.cn }}</p>
              <p class="text-xs" style="color: var(--color-primary-light);">{{ lift.en }}</p>
            </div>
          </div>

          <div class="mt-4 pb-1" style="border-bottom: 1.5px solid var(--color-primary);">
            <div class="flex items-baseline gap-1.5">
              <input
                type="number"
                :value="oneRM[lift.key as keyof typeof oneRM]"
                @input="handleWeightInput(lift.key, ($event.target as HTMLInputElement).value)"
                step="0.5"
                min="0"
                class="w-full bg-transparent border-none outline-none text-4xl font-bold tracking-tight"
                style="font-family: var(--font-mono); color: var(--color-primary); line-height: 1.1;"
                :aria-label="lift.cn + '1RM'"
              />
              <span class="text-sm font-medium" style="color: var(--color-primary-light); font-family: var(--font-mono);">{{ unit }}</span>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-center gap-2">
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold" style="border-radius: var(--radius-md); background: var(--color-surface-muted); color: var(--state-error); font-family: var(--font-mono);" @click="adjustWeight(lift.key, -5)">-5</button>
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold" style="border-radius: var(--radius-md); background: var(--color-surface-muted); color: var(--state-error); font-family: var(--font-mono);" @click="adjustWeight(lift.key, -2.5)">-2.5</button>
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold" style="border-radius: var(--radius-md); background: var(--color-surface-muted); color: var(--color-primary); font-family: var(--font-mono);" @click="adjustWeight(lift.key, 2.5)">+2.5</button>
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold" style="border-radius: var(--radius-md); background: var(--color-surface-muted); color: var(--state-success); font-family: var(--font-mono);" @click="adjustWeight(lift.key, 5)">+5</button>
          </div>

          <div class="mt-3 flex items-center gap-1 text-xs" style="color: var(--color-primary-light); font-family: var(--font-mono);">
            <span>W1: {{ weekWeight(lift.key, WEEK_PCTS[lift.key][0]) }}{{ unit }}</span>
            <span style="color: var(--color-border);">|</span>
            <span>W3: {{ weekWeight(lift.key, WEEK_PCTS[lift.key][2]) }}{{ unit }}</span>
            <span style="color: var(--color-border);">|</span>
            <span>W5: {{ weekWeight(lift.key, WEEK_PCTS[lift.key][4]) }}{{ unit }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <button type="button" class="flex w-full items-center justify-between py-3" @click="showAssistance = !showAssistance">
          <h2 class="text-base font-semibold tracking-tight" style="color: var(--color-primary);">辅助训练配置</h2>
          <ChevronDown class="h-4 w-4" :style="{ color: 'var(--color-primary-light)', transform: showAssistance ? 'rotate(180deg)' : 'none' }" />
        </button>

        <div v-show="showAssistance" class="flex flex-col gap-0 rounded-xl" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
          <div v-for="(item, idx) in assistanceItems" :key="idx" class="flex items-center justify-between px-4 py-3.5" :style="idx < assistanceItems.length - 1 ? { borderBottom: '0.5px solid var(--color-border-light)' } : {}">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" style="color: var(--color-primary);">{{ item.cn }}</p>
              <p class="text-xs" style="color: var(--color-primary-light);">{{ item.en }}</p>
            </div>
            <button type="button" class="flex items-center gap-1 shrink-0 ml-3">
            <span class="text-sm" style="color: var(--color-primary);">{{ item.current }}</span>
          </button>
          <button type="button" class="shrink-0 text-xs font-medium ml-1" style="color: var(--color-training-main);" @click="switchAssistance(item.key)">切换</button>
          </div>
        </div>

        <div class="mt-2 flex justify-end">
          <button type="button" class="text-xs font-medium" style="color: var(--color-training-main);" @click="goCustom">自定义</button>
        </div>
      </div>

      <div class="mt-6">
        <h2 class="mb-3 text-base font-semibold tracking-tight" style="color: var(--color-primary);">6周计划预览</h2>
        <div class="rounded-xl p-4" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
          <div class="overflow-x-auto">
            <table class="w-full" style="min-width: 280px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <th class="py-2 pr-3 text-left text-xs font-medium" style="color: var(--color-primary-light); width: 56px;"></th>
                  <th v-for="w in 5" :key="w" class="py-2 px-2 text-center text-xs font-medium" style="color: var(--color-primary-light); font-family: var(--font-mono);">W{{ w }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(lift, li) in previewLifts" :key="lift.key" style="border-bottom: 0.5px solid var(--color-border-light);">
                  <td class="py-2.5 pr-3 text-xs font-medium" style="color: var(--color-primary);">{{ lift.cn }}</td>
                  <td v-for="w in 5" :key="w" class="py-2.5 px-2 text-center text-xs font-semibold whitespace-nowrap" :style="w === 5 ? { color: 'var(--color-training-main)', fontFamily: 'var(--font-mono)' } : { color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }">{{ previewCellValue(lift.key, w - 1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-2 flex items-center justify-center gap-3 text-xs" style="color: var(--color-primary-light); font-family: var(--font-mono);">
            <span class="flex items-center gap-1">
              <span class="inline-block h-1.5 w-1.5 rounded-full" style="background: var(--color-primary);"></span>
              累积周
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block h-1.5 w-1.5 rounded-full" style="background: var(--color-training-main);"></span>
              强度周
            </span>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <button
          class="flex w-full items-center justify-center py-3.5 text-base font-semibold"
          style="background: var(--color-training-main); color: var(--color-surface); border-radius: var(--radius-full);"
          @click="handleSave"
        >
          保存并生成计划
        </button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronDown, ArrowDown } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { buildWeeks } from '@/services/planGenerator'
import { useWeightFormat } from '@/composables/useWeightFormat'

const router = useRouter()
const cycleStore = useCycleStore()

const activeCycle = cycleStore.activeCycle

if (!activeCycle) {
  router.replace('/today')
}

const unit = ref<'kg' | 'lb'>(activeCycle?.unit || 'kg')
const showAssistance = ref(true)
const rounding = ref(activeCycle?.weightRounding ?? 2.5)

const SQUAT_PCTS = [80, 82.5, 87.5, 92.5, 97.5]
const BENCH_PCTS = [70, 72, 77.5, 83.2, 87.5]
const DEADLIFT_PCTS = [75, 77.5, 82.5, 87.5, 92.5]

const WEEK_PCTS: Record<string, number[]> = {
  squat: SQUAT_PCTS,
  bench: BENCH_PCTS,
  deadlift: DEADLIFT_PCTS,
}

const { displayWeight: formatDisplay } = useWeightFormat(rounding)

const lifts = [
  { key: 'squat', cn: '深蹲', en: 'Squat' },
  { key: 'bench', cn: '卧推', en: 'Bench Press' },
  { key: 'deadlift', cn: '硬拉', en: 'Deadlift' },
]

const previewLifts = [
  { key: 'squat', cn: '深蹲' },
  { key: 'bench', cn: '卧推' },
  { key: 'deadlift', cn: '硬拉' },
]

const oneRM = reactive({
  squat: activeCycle?.oneRM.squat ?? 100,
  bench: activeCycle?.oneRM.bench ?? 85,
  deadlift: activeCycle?.oneRM.deadlift ?? 120,
})

const assistanceItems = reactive([
  { key: 'horizontalPull', cn: '上背部 #1 (水平拉举)', en: 'Back Row', current: activeCycle?.assistanceConfig.horizontalPull || '哑铃划船' },
  { key: 'shoulder', cn: '肩部训练', en: 'Shoulder', current: activeCycle?.assistanceConfig.shoulder || '坐姿哑铃推举' },
  { key: 'verticalPull', cn: '上背部 #2 (垂直拉举)', en: 'Vertical Pull', current: activeCycle?.assistanceConfig.verticalPull || '负重引体向上' },
])

const assistanceSelections: Record<string, string[]> = {
  horizontalPull: ['哑铃划船', '杠铃划船', '坐姿绳索划船', 'T杠划船'],
  shoulder: ['坐姿哑铃推举', '站姿杠铃推举', '阿诺德推举', '侧平举'],
  verticalPull: ['负重引体向上', '高位下拉', '辅助引体向上', 'TRX划船'],
}

const currentSelectionIndex: Record<string, number> = {
  horizontalPull: 0,
  shoulder: 0,
  verticalPull: 0,
}

function roundWeight(value: number): number {
  return Math.round(value / rounding.value) * rounding.value
}

function displayWeight(key: string): string {
  const val = oneRM[key as keyof typeof oneRM]
  if (Number.isInteger(val)) return String(val)
  return val.toFixed(1)
}

function weekWeight(key: string, pct: number): string {
  const val = oneRM[key as keyof typeof oneRM]
  return formatDisplay(val * pct / 100)
}

function previewCellValue(key: string, weekIdx: number): string {
  const pcts = WEEK_PCTS[key]
  return formatDisplay(oneRM[key as keyof typeof oneRM] * pcts[weekIdx] / 100)
}

function adjustWeight(key: string, delta: number): void {
  const current = oneRM[key as keyof typeof oneRM]
  const newVal = roundWeight(current + delta)
  if (newVal > 0) {
    oneRM[key as keyof typeof oneRM] = newVal
  }
}

function handleWeightInput(key: string, value: string): void {
  const parsed = parseFloat(value)
  if (!isNaN(parsed) && parsed > 0) {
    oneRM[key as keyof typeof oneRM] = parsed
  }
}

function switchAssistance(key: string): void {
  const options = assistanceSelections[key]
  currentSelectionIndex[key] = (currentSelectionIndex[key] + 1) % options.length
  const item = assistanceItems.find(i => i.key === key)
  if (item) {
    item.current = options[currentSelectionIndex[key]]
  }
}

function goBack(): void {
  router.back()
}

function goCustom(): void {
  router.push({ name: 'custom-exercise' })
}

function handleSave(): void {
  if (!activeCycle) return
  const newConfig = {
    horizontalPull: assistanceItems[0].current,
    shoulder: assistanceItems[1].current,
    verticalPull: assistanceItems[2].current,
  }
  const newWeeks = buildWeeks(
    { squat: oneRM.squat, bench: oneRM.bench, deadlift: oneRM.deadlift },
    rounding.value,
    newConfig,
    activeCycle.startDate,
  )
  cycleStore.updateCycle(activeCycle.id, {
    oneRM: { squat: oneRM.squat, bench: oneRM.bench, deadlift: oneRM.deadlift },
    unit: unit.value,
    assistanceConfig: newConfig,
    weeks: newWeeks,
  })
  router.push('/today')
}
</script>
