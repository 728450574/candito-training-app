<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <header class="sticky top-0 z-30 flex h-11 items-center justify-between sticky-header">
      <button class="flex h-9 w-9 items-center justify-center back-btn-wrapper" aria-label="返回" @click="goBack">
        <i data-lucide="chevron-left" class="h-5 w-5 back-icon"></i>
      </button>
      <h1 class="text-base font-semibold tracking-tight page-title">自定义动作</h1>
      <div class="w-9"></div>
    </header>

    <div class="pt-5">
      <section class="mb-5">
        <p class="mb-2.5 text-xs font-medium section-label">为哪个位置添加自定义动作</p>
        <div class="flex flex-col gap-0.5 category-list">
          <div
            v-for="cat in categories"
            :key="cat.key"
            class="flex items-center gap-3 px-3.5 py-3"
            :class="selectedCategory === cat.key ? 'category-item-selected' : 'category-item-default'"
            @click="selectedCategory = cat.key"
          >
            <div class="flex h-4 w-4 shrink-0 items-center justify-center">
              <div
                class="h-2.5 w-2.5 rounded-full"
                :class="selectedCategory === cat.key ? 'radio-dot-selected' : 'radio-dot-unselected'"
              ></div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate category-item-name">{{ cat.label }}</p>
              <p class="text-xs category-item-sub">{{ cat.subLabel }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-5">
        <label class="mb-2 block text-xs font-medium section-label">动作名称</label>
        <div class="pb-1 name-input-wrapper">
          <input
            v-model="customName"
            type="text"
            placeholder="输入自定义动作名称，如：T杠划船"
            class="w-full bg-transparent py-2.5 text-lg font-medium tracking-tight outline-none placeholder:font-normal name-input"
          >
        </div>
      </section>

      <section class="mb-5">
        <p class="mb-2.5 text-xs section-label">推荐选择</p>
        <div class="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            v-for="ex in presetExercises"
            :key="ex"
            class="shrink-0 px-3.5 py-2 text-sm font-medium whitespace-nowrap"
            :class="selectedPreset === ex ? 'preset-btn-selected' : 'preset-btn-unselected'"
            @click="selectPreset(ex)"
          >
            {{ ex }}
          </button>
        </div>
      </section>

      <section class="mb-8">
        <p class="mb-2.5 text-xs font-medium section-label">默认组数配置</p>
        <div class="rounded-xl p-4 sets-card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-sm sets-label">组数</span>
              <div class="flex h-8 w-12 items-center justify-center sets-badge">
                <span class="text-sm font-semibold sets-badge-value">{{ defaultSets }}</span>
              </div>
              <span class="text-sm sets-unit">组</span>
            </div>
            <div class="h-5 w-px sets-divider"></div>
            <div class="flex items-center gap-3">
              <span class="text-sm sets-label">次数</span>
              <div class="flex h-8 w-12 items-center justify-center sets-badge">
                <span class="text-sm font-semibold sets-badge-value">{{ defaultReps }}</span>
              </div>
              <span class="text-sm sets-unit">次</span>
            </div>
          </div>
          <p class="mt-2.5 text-xs sets-hint">训练时可随时调整</p>
        </div>
      </section>

      <section>
        <button
          class="flex w-full items-center justify-center py-3.5 text-base font-semibold confirm-btn"
          @click="handleConfirm"
        >
          添加动作
        </button>
        <div class="mt-4 flex justify-center">
          <button class="text-sm font-medium cancel-btn" @click="goBack">取消</button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createIcons, icons } from 'lucide'
import { useCycleStore } from '@/stores/cycleStore'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()

const selectedCategory = ref<'horizontalPull' | 'shoulder' | 'verticalPull'>('horizontalPull')
const customName = ref('')
const defaultSets = ref(3)
const defaultReps = ref(10)

const categories = [
  { key: 'horizontalPull' as const, label: '上背部 #1 (水平拉举)', subLabel: 'Back Row' },
  { key: 'shoulder' as const, label: '肩部训练', subLabel: 'Shoulder' },
  { key: 'verticalPull' as const, label: '上背部 #2 (垂直拉举)', subLabel: 'Vertical Pull' },
]

const presetMap: Record<string, string[]> = {
  horizontalPull: ['哑铃划船', '杠铃划船', '划船器械', 'T杠划船'],
  shoulder: ['坐姿哑铃推举', '站立哑铃推举', '实力举', '哑铃侧平举'],
  verticalPull: ['负重引体向上(反手)', '负重引体向上(正手)', '坐姿下拉'],
}

const presetExercises = computed(() => {
  return presetMap[selectedCategory.value] || []
})

const selectedPreset = ref<string | null>(null)

function selectPreset(ex: string) {
  if (selectedPreset.value === ex) {
    selectedPreset.value = null
    customName.value = ''
  } else {
    selectedPreset.value = ex
    customName.value = ex
  }
}

function handleConfirm() {
  const name = customName.value.trim()
  if (!name) return

  const ac = cycleStore.activeCycle
  if (!ac) return

  const key = selectedCategory.value as 'horizontalPull' | 'shoulder' | 'verticalPull'

  cycleStore.updateCycle(ac.id, {
    assistanceConfig: {
      ...ac.assistanceConfig,
      [key]: name,
    },
  })

  router.back()
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

<style scoped>
/* ===== 顶部导航栏（毛玻璃效果） ===== */
.sticky-header {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.back-btn-wrapper {
  border-radius: var(--radius-md);
}

.back-icon {
  color: var(--color-primary);
}

.page-title {
  color: var(--color-primary);
  font-family: var(--font-sans);
}

/* ===== 分区标签 ===== */
.section-label {
  color: var(--color-primary-light);
}

/* ===== 分类选择列表 ===== */
.category-list {
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.category-item-selected {
  background: var(--state-info-bg);
  border-left: 3px solid var(--color-training-main);
}

.category-item-default {
  background: var(--color-surface);
  border-bottom: 0.5px solid var(--color-border-light);
}

.radio-dot-selected {
  background: var(--color-training-main);
}

.radio-dot-unselected {
  border: 1.5px solid var(--color-border);
}

.category-item-name {
  color: var(--color-primary);
}

.category-item-sub {
  color: var(--color-primary-light);
}

/* ===== 动作名称输入 ===== */
.name-input-wrapper {
  border-bottom: 1.5px solid var(--color-border);
}

.name-input {
  color: var(--color-primary);
  font-family: var(--font-sans);
  font-size: var(--text-lg);
}

/* ===== 推荐选择按钮 ===== */
.preset-btn-selected {
  background: var(--state-info-bg);
  color: var(--color-training-main);
  border-radius: var(--radius-full);
  border: 0.5px solid var(--color-training-main);
  transition: all var(--duration-fast) var(--ease-default);
}

.preset-btn-unselected {
  background: var(--color-surface-muted);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  border: 0.5px solid var(--color-border-light);
  transition: all var(--duration-fast) var(--ease-default);
}

/* ===== 默认组数配置 ===== */
.sets-card {
  background: var(--color-surface);
  box-shadow: var(--shadow-elevated);
}

.sets-label {
  color: var(--color-primary);
}

.sets-badge {
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

.sets-badge-value {
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.sets-unit {
  color: var(--color-primary-light);
}

.sets-divider {
  background: var(--color-border-light);
}

.sets-hint {
  color: var(--color-primary-light);
}

/* ===== 操作按钮 ===== */
.confirm-btn {
  background: var(--color-training-main);
  color: var(--color-surface);
  border-radius: var(--radius-full);
}

.cancel-btn {
  color: var(--color-primary-light);
}
</style>
