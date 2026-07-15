<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <header class="sticky top-0 z-30 flex h-11 items-center justify-between border-b px-4 -mx-4 onerm-header">
      <button class="flex h-9 w-9 items-center justify-center rounded-md" aria-label="返回" @click="goBack">
        <ChevronLeft class="h-5 w-5 icon-primary" />
      </button>
      <h1 class="text-base font-semibold tracking-tight header-title">设置 1RM</h1>
      <div class="w-9"></div>
    </header>

    <div class="px-4 pt-4 -mx-4">
      <!-- 单位切换 -->
      <div class="flex rounded-lg p-1 unit-toggle-bar">
        <button
          class="flex-1 py-2 text-center text-sm font-semibold rounded-md"
          :class="unit === 'kg' ? 'unit-btn-active' : 'unit-btn-inactive'"
          @click="unit = 'kg'"
        >kg</button>
        <button
          class="flex-1 py-2 text-center text-sm font-medium rounded-md"
          :class="unit === 'lb' ? 'unit-btn-active' : 'unit-btn-inactive'"
          @click="unit = 'lb'"
        >lb</button>
      </div>

      <!-- 三大项1RM输入 -->
      <div class="mt-5 flex flex-col gap-3">
        <div v-for="lift in lifts" :key="lift.key" class="rounded-xl p-4 lift-card">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center lift-icon-bg">
              <!-- 深蹲图标 -->
              <div v-if="lift.key === 'squat'" class="flex flex-col items-center icon-training">
                <div class="h-3 w-3 rounded-full border-2 squat-circle"></div>
                <ArrowDown class="-mt-1.5 h-3.5 w-3.5 icon-training" />
              </div>
              <!-- 卧推图标 -->
              <div v-else-if="lift.key === 'bench'" class="flex items-center gap-0.5 icon-training">
                <div class="h-0.5 w-5 bench-bar"></div>
                <div class="h-2.5 w-2.5 rounded-sm bench-plate"></div>
              </div>
              <!-- 硬拉图标 -->
              <div v-else class="flex flex-col items-center icon-training">
                <div class="h-4 w-0.5 deadlift-bar"></div>
                <div class="h-2.5 w-2.5 rounded-sm -mt-0.5 deadlift-plate"></div>
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold lift-name">{{ lift.cn }}</p>
              <p class="text-xs lift-en">{{ lift.en }}</p>
            </div>
          </div>

          <div class="mt-4 pb-1 weight-input-row">
            <div class="flex items-baseline gap-1.5">
              <input
                type="number"
                :value="oneRM[lift.key as keyof typeof oneRM]"
                @input="handleWeightInput(lift.key, ($event.target as HTMLInputElement).value)"
                step="0.5"
                min="0"
                class="w-full bg-transparent border-none outline-none text-4xl font-bold tracking-tight weight-input"
                :aria-label="lift.cn + '1RM'"
              />
              <span class="text-sm font-medium weight-unit">{{ unit }}</span>
            </div>
          </div>

          <!-- 微调按钮 -->
          <div class="mt-3 flex items-center justify-center gap-2">
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold adj-btn adj-btn-neg" @click="adjustWeight(lift.key, -5)">-5</button>
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold adj-btn adj-btn-neg" @click="adjustWeight(lift.key, -2.5)">-2.5</button>
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold adj-btn adj-btn-pos" @click="adjustWeight(lift.key, 2.5)">+2.5</button>
            <button class="flex h-8 w-14 items-center justify-center text-xs font-semibold adj-btn adj-btn-pos-secure" @click="adjustWeight(lift.key, 5)">+5</button>
          </div>

          <!-- 每周重量预览 -->
          <div class="mt-3 flex items-center gap-1 text-xs week-preview">
            <span>W1: {{ weekWeight(lift.key, WEEK_PCTS[lift.key][0]) }}{{ unit }}</span>
            <span class="preview-sep">|</span>
            <span>W3: {{ weekWeight(lift.key, WEEK_PCTS[lift.key][2]) }}{{ unit }}</span>
            <span class="preview-sep">|</span>
            <span>W5: {{ weekWeight(lift.key, WEEK_PCTS[lift.key][4]) }}{{ unit }}</span>
          </div>
        </div>
      </div>

      <!-- 辅助训练配置 -->
      <div class="mt-6">
        <button type="button" class="flex w-full items-center justify-between py-3" @click="showAssistance = !showAssistance">
          <h2 class="text-base font-semibold tracking-tight section-title">辅助训练配置</h2>
          <ChevronDown class="h-4 w-4 icon-light" :style="{ transform: showAssistance ? 'rotate(180deg)' : 'none' }" />
        </button>

        <div v-show="showAssistance" class="flex flex-col gap-0 rounded-xl assistance-panel">
          <div v-for="(item, idx) in assistanceItems" :key="idx" class="flex items-center justify-between px-4 py-3.5" :class="{ 'assistance-divider': idx < assistanceItems.length - 1 }">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate assistance-name">{{ item.cn }}</p>
              <p class="text-xs assistance-en">{{ item.en }}</p>
            </div>
            <button type="button" class="flex items-center gap-1 shrink-0 ml-3">
              <span class="text-sm assistance-current">{{ item.current }}</span>
            </button>
            <button type="button" class="shrink-0 text-xs font-medium ml-1 switch-btn" @click="switchAssistance(item.key)">切换</button>
          </div>
        </div>

        <div class="mt-2 flex justify-end">
          <button type="button" class="text-xs font-medium custom-btn" @click="goCustom">自定义</button>
        </div>
      </div>

      <!-- 6周计划预览 -->
      <div class="mt-6">
        <h2 class="mb-3 text-base font-semibold tracking-tight section-title">6周计划预览</h2>
        <div class="rounded-xl p-4 preview-card">
          <div class="overflow-x-auto">
            <table class="w-full preview-table">
              <thead>
                <tr class="preview-thead-row">
                  <th class="py-2 pr-3 text-left text-xs font-medium preview-th-label"></th>
                  <th v-for="w in 5" :key="w" class="py-2 px-2 text-center text-xs font-medium preview-th-week">W{{ w }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(lift, li) in previewLifts" :key="lift.key" class="preview-tbody-row">
                  <td class="py-2.5 pr-3 text-xs font-medium preview-td-label">{{ lift.cn }}</td>
                  <td v-for="w in 5" :key="w" class="py-2.5 px-2 text-center text-xs font-semibold whitespace-nowrap" :class="['preview-cell', w === 5 ? 'preview-cell-intensity' : 'preview-cell-normal']">{{ previewCellValue(lift.key, w - 1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-2 flex items-center justify-center gap-3 text-xs preview-legend">
            <span class="flex items-center gap-1">
              <span class="inline-block h-1.5 w-1.5 rounded-full legend-dot-normal"></span>
              累积周
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block h-1.5 w-1.5 rounded-full legend-dot-intensity"></span>
              强度周
            </span>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="mt-6">
        <button
          class="flex w-full items-center justify-center py-3.5 text-base font-semibold save-btn"
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

<style scoped>
/* ===== 顶部导航栏 ===== */
.onerm-header {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-color: var(--color-border);
}

.icon-primary {
  color: var(--color-primary);
}

.icon-light {
  color: var(--color-primary-light);
}

.icon-training {
  color: var(--color-training-main);
}

.header-title {
  color: var(--color-primary);
}

.section-title {
  color: var(--color-primary);
}

/* ===== 单位切换 ===== */
.unit-toggle-bar {
  background: var(--color-surface-muted);
  box-shadow: var(--shadow-card);
}

.unit-btn-active {
  background: var(--color-surface);
  color: var(--color-training-main);
  box-shadow: var(--shadow-elevated);
  font-family: var(--font-mono);
}

.unit-btn-inactive {
  color: var(--color-primary-light);
}

/* ===== 举重项卡片 ===== */
.lift-card {
  background: var(--color-surface);
  box-shadow: var(--shadow-elevated);
}

.lift-icon-bg {
  background: var(--state-info-bg);
  border-radius: var(--radius-md);
}

/* 深蹲图标 */
.squat-circle {
  border-color: var(--color-training-main);
}

/* 卧推图标 */
.bench-bar {
  background: var(--color-training-main);
}

.bench-plate {
  background: var(--color-training-main);
  opacity: 0.6;
}

/* 硬拉图标 */
.deadlift-bar {
  background: var(--color-training-main);
}

.deadlift-plate {
  background: var(--color-training-main);
  opacity: 0.6;
}

/* 举重项名称 */
.lift-name {
  color: var(--color-primary);
}

.lift-en {
  color: var(--color-primary-light);
}

/* ===== 重量输入区 ===== */
.weight-input-row {
  border-bottom: 1.5px solid var(--color-primary);
}

.weight-input {
  font-family: var(--font-mono);
  color: var(--color-primary);
  line-height: 1.1;
}

.weight-unit {
  color: var(--color-primary-light);
  font-family: var(--font-mono);
}

/* ===== 微调按钮 ===== */
.adj-btn {
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  font-family: var(--font-mono);
}

.adj-btn-neg {
  color: var(--state-error);
}

.adj-btn-pos {
  color: var(--color-primary);
}

.adj-btn-pos-secure {
  color: var(--state-success);
}

/* ===== 每周重量预览 ===== */
.week-preview {
  color: var(--color-primary-light);
  font-family: var(--font-mono);
}

.preview-sep {
  color: var(--color-border);
}

/* ===== 辅助训练配置 ===== */
.assistance-panel {
  background: var(--color-surface);
  box-shadow: var(--shadow-elevated);
}

.assistance-divider {
  border-bottom: 0.5px solid var(--color-border-light);
}

.assistance-name {
  color: var(--color-primary);
}

.assistance-en {
  color: var(--color-primary-light);
}

.assistance-current {
  color: var(--color-primary);
}

.switch-btn {
  color: var(--color-training-main);
}

.custom-btn {
  color: var(--color-training-main);
}

/* ===== 6周预览卡片 ===== */
.preview-card {
  background: var(--color-surface);
  box-shadow: var(--shadow-elevated);
}

.preview-table {
  min-width: 280px;
}

.preview-thead-row {
  border-bottom: 1px solid var(--color-border);
}

.preview-th-label {
  color: var(--color-primary-light);
  width: 56px;
}

.preview-th-week {
  color: var(--color-primary-light);
  font-family: var(--font-mono);
}

.preview-tbody-row {
  border-bottom: 0.5px solid var(--color-border-light);
}

.preview-td-label {
  color: var(--color-primary);
}

.preview-cell {
  font-family: var(--font-mono);
}

.preview-cell-normal {
  color: var(--color-primary);
}

.preview-cell-intensity {
  color: var(--color-training-main);
}

/* ===== 预览图例 ===== */
.preview-legend {
  color: var(--color-primary-light);
  font-family: var(--font-mono);
}

.legend-dot-normal {
  background: var(--color-primary);
}

.legend-dot-intensity {
  background: var(--color-training-main);
}

/* ===== 保存按钮 ===== */
.save-btn {
  background: var(--color-training-main);
  color: var(--color-surface);
  border-radius: var(--radius-full);
}
</style>
