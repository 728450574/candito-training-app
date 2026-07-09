<template>
  <main
    class="flex flex-col items-center px-6 pb-6 pt-6 max-w-lg mx-auto min-h-screen"
    style="justify-content: space-between;"
  >
    <!-- Branding Area -->
    <div class="flex flex-col items-center text-center w-full">
      <div
        class="flex items-center justify-center gap-2 mb-1"
        style="color: var(--color-training-main);"
      >
        <svg
          width="32"
          height="24"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="2" y="14" width="8" height="20" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="6" y="10" width="6" height="28" rx="2" fill="currentColor" />
          <rect x="36" y="14" width="8" height="20" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="34" y="10" width="6" height="28" rx="2" fill="currentColor" />
          <rect x="12" y="20" width="24" height="8" rx="4" fill="currentColor" />
        </svg>
        <h1
          style="font-family: var(--font-sans); font-size: var(--text-2xl); font-weight: var(--font-weight-bold); color: var(--color-primary); letter-spacing: -0.02em;"
        >
          Candito 训练助手
        </h1>
      </div>
      <p
        style="font-size: var(--text-sm); color: var(--color-primary-light); font-weight: var(--font-weight-medium);"
      >
        6周力量训练计划 · 基于经典Candito6周计划
      </p>
    </div>

    <!-- 1RM Input Card -->
    <div
      class="w-full rounded-xl p-4"
      style="background: var(--color-surface); box-shadow: var(--shadow-elevated); border-radius: var(--radius-lg);"
    >
      <div class="flex items-center justify-between mb-4">
        <h2
          style="font-family: var(--font-sans); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);"
        >
          输入你的 1RM
        </h2>
        <!-- Unit Selector -->
        <div
          class="flex rounded-md p-0.5"
          style="background: var(--color-surface-muted);"
        >
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-medium whitespace-nowrap"
            :style="unit === 'kg' ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: 'var(--shadow-card)' } : { color: 'var(--color-primary-light)' }"
            @click="unit = 'kg'"
          >
            kg
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded text-xs font-medium whitespace-nowrap"
            :style="unit === 'lb' ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: 'var(--shadow-card)' } : { color: 'var(--color-primary-light)' }"
            @click="unit = 'lb'"
          >
            lb
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span
            style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); min-width: 2.5rem;"
          >
            深蹲
          </span>
          <div
            class="flex-1 mx-3 flex items-center rounded-md px-3 h-10"
            style="background: var(--color-surface-muted);"
          >
            <input
              type="number"
              v-model.number="squat"
              placeholder="100"
              class="w-full text-right bg-transparent outline-none"
              style="font-family: var(--font-mono); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);"
              inputmode="decimal"
              aria-label="深蹲1RM"
            />
            <span
              class="ml-1 shrink-0"
              style="font-size: var(--text-xs); color: var(--color-primary-light);"
            >
              {{ unitLabel }}
            </span>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span
            style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); min-width: 2.5rem;"
          >
            卧推
          </span>
          <div
            class="flex-1 mx-3 flex items-center rounded-md px-3 h-10"
            style="background: var(--color-surface-muted);"
          >
            <input
              type="number"
              v-model.number="bench"
              placeholder="80"
              class="w-full text-right bg-transparent outline-none"
              style="font-family: var(--font-mono); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);"
              inputmode="decimal"
              aria-label="卧推1RM"
            />
            <span
              class="ml-1 shrink-0"
              style="font-size: var(--text-xs); color: var(--color-primary-light);"
            >
              {{ unitLabel }}
            </span>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span
            style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); min-width: 2.5rem;"
          >
            硬拉
          </span>
          <div
            class="flex-1 mx-3 flex items-center rounded-md px-3 h-10"
            style="background: var(--color-surface-muted);"
          >
            <input
              type="number"
              v-model.number="deadlift"
              placeholder="120"
              class="w-full text-right bg-transparent outline-none"
              style="font-family: var(--font-mono); font-size: var(--text-md); font-weight: var(--font-weight-semibold); color: var(--color-primary);"
              inputmode="decimal"
              aria-label="硬拉1RM"
            />
            <span
              class="ml-1 shrink-0"
              style="font-size: var(--text-xs); color: var(--color-primary-light);"
            >
              {{ unitLabel }}
            </span>
          </div>
        </div>
      </div>
      <p
        style="font-size: var(--text-xs); color: var(--color-primary-light); margin-top: 8px;"
      >
        不确定？可输入估算值，后续随时调整
      </p>
    </div>

    <!-- Assistance Config -->
    <div class="w-full mt-6">
      <button class="flex w-full items-center justify-between py-3" type="button" @click="showAssistance = !showAssistance">
        <h2 class="text-base font-semibold tracking-tight" style="color: var(--color-primary);">辅助训练配置</h2>
        <ChevronDown class="h-4 w-4" :style="{ color: 'var(--color-primary-light)', transform: showAssistance ? 'rotate(180deg)' : 'none' }" />
      </button>

      <div v-show="showAssistance" class="flex flex-col gap-0 rounded-xl" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
        <div v-for="(item, idx) in assistanceItems" :key="idx" class="flex items-center justify-between px-4 py-3.5" :style="idx < assistanceItems.length - 1 ? { borderBottom: '0.5px solid var(--color-border-light)' } : {}">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" style="color: var(--color-primary);">{{ item.cn }}</p>
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

    <!-- Start Date + CTA -->
    <div class="w-full">
      <div
        class="flex items-center gap-2 mb-4"
        style="color: var(--color-primary-light);"
      >
        <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
        <span style="font-size: var(--text-xs); color: var(--color-primary-light);">
          开始日期
        </span>
        <span
          style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);"
        >
          {{ todayDisplay }}
        </span>
      </div>
      <button
        class="w-full flex items-center justify-center h-12 rounded-full font-semibold whitespace-nowrap"
        style="background: var(--color-training-main); color: var(--color-surface); border-radius: var(--radius-full); font-size: var(--text-md); font-weight: var(--font-weight-semibold);"
        :disabled="isSubmitting"
        @click="handleSubmit"
      >
        {{ isSubmitting ? '创建中...' : '创建训练周期' }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown } from 'lucide-vue-next'
import { createIcons, icons } from 'lucide'
import { createCycle } from '@/services/planGenerator'
import { useCycleStore } from '@/stores/cycleStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getToday } from '@/services/dateService'

const router = useRouter()
const cycleStore = useCycleStore()
const settingsStore = useSettingsStore()

const activeCycle = cycleStore.activeCycle
if (activeCycle && activeCycle.status !== 'terminated' && activeCycle.status !== 'completed') {
  router.replace('/today')
}

const today = getToday()

const unit = ref<'kg' | 'lb'>(settingsStore.settings.defaultUnit || 'kg')

const squat = ref<number | null>(null)
const bench = ref<number | null>(null)
const deadlift = ref<number | null>(null)

const isSubmitting = ref(false)
const showAssistance = ref(true)

const assistanceItems = reactive([
  { key: 'horizontalPull', cn: '上背部 #1 (水平拉举)', current: '杠铃划船' },
  { key: 'shoulder', cn: '肩部训练', current: '哑铃推举' },
  { key: 'verticalPull', cn: '上背部 #2 (垂直拉举)', current: '引体向上' },
])

const assistanceSelections: Record<string, string[]> = {
  horizontalPull: ['哑铃划船', '杠铃划船', '坐姿绳索划船', 'T杠划船'],
  shoulder: ['坐姿哑铃推举', '站姿杠铃推举', '阿诺德推举', '侧平举'],
  verticalPull: ['负重引体向上', '高位下拉', '辅助引体向上', 'TRX划船'],
}

const currentSelectionIndex: Record<string, number> = {
  horizontalPull: 1,
  shoulder: 1,
  verticalPull: 2,
}

function switchAssistance(key: string): void {
  const options = assistanceSelections[key]
  currentSelectionIndex[key] = (currentSelectionIndex[key] + 1) % options.length
  const item = assistanceItems.find(i => i.key === key)
  if (item) {
    item.current = options[currentSelectionIndex[key]]
  }
}

const todayDisplay = computed(() => {
  const [y, m, d] = today.split('-').map(Number)
  return `${y}年${m}月${d}日`
})

const unitLabel = computed(() => unit.value)

function goCustom(): void {
  router.push({ name: 'custom-exercise' })
}

async function handleSubmit() {
  if (isSubmitting.value) return

  const oneRM = {
    squat: squat.value ?? 0,
    bench: bench.value ?? 0,
    deadlift: deadlift.value ?? 0,
  }

  if (!oneRM.squat && !oneRM.bench && !oneRM.deadlift) return

  isSubmitting.value = true

  try {
    const cycle = createCycle({
      oneRM,
      unit: unit.value,
      weightRounding: settingsStore.settings.weightRounding,
      startDate: today,
      assistanceConfig: {
        horizontalPull: assistanceItems[0].current,
        shoulder: assistanceItems[1].current,
        verticalPull: assistanceItems[2].current,
      },
    })

    cycleStore.addCycle(cycle)
    router.push('/today')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  createIcons({ icons })
})
</script>
