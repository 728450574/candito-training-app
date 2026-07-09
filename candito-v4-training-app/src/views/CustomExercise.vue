<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <header class="sticky top-0 z-30 flex h-11 items-center justify-between" style="background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);">
      <button class="flex h-9 w-9 items-center justify-center" style="border-radius: var(--radius-md);" aria-label="返回" @click="goBack">
        <i data-lucide="chevron-left" class="h-5 w-5" style="color: var(--color-primary);"></i>
      </button>
      <h1 class="text-base font-semibold tracking-tight" style="color: var(--color-primary); font-family: var(--font-sans);">自定义动作</h1>
      <div class="w-9"></div>
    </header>

    <div class="pt-5">
      <section class="mb-5">
        <p class="mb-2.5 text-xs font-medium" style="color: var(--color-primary-light);">为哪个位置添加自定义动作</p>
        <div class="flex flex-col gap-0.5" style="box-shadow: var(--shadow-card); border-radius: var(--radius-lg); overflow: hidden;">
          <div
            v-for="cat in categories"
            :key="cat.key"
            class="flex items-center gap-3 px-3.5 py-3"
            :style="categoryStyle(cat.key)"
            @click="selectedCategory = cat.key"
          >
            <div class="flex h-4 w-4 shrink-0 items-center justify-center">
              <div
                class="h-2.5 w-2.5 rounded-full"
                :style="selectedCategory === cat.key ? 'background: var(--color-training-main);' : 'border: 1.5px solid var(--color-border);'"
              ></div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" style="color: var(--color-primary);">{{ cat.label }}</p>
              <p class="text-xs" style="color: var(--color-primary-light);">{{ cat.subLabel }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-5">
        <label class="mb-2 block text-xs font-medium" style="color: var(--color-primary-light);">动作名称</label>
        <div class="pb-1" style="border-bottom: 1.5px solid var(--color-border);">
          <input
            v-model="customName"
            type="text"
            placeholder="输入自定义动作名称，如：T杠划船"
            class="w-full bg-transparent py-2.5 text-lg font-medium tracking-tight outline-none placeholder:font-normal"
            style="color: var(--color-primary); font-family: var(--font-sans); font-size: var(--text-lg);"
          >
        </div>
      </section>

      <section class="mb-5">
        <p class="mb-2.5 text-xs" style="color: var(--color-primary-light);">推荐选择</p>
        <div class="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            v-for="ex in presetExercises"
            :key="ex"
            class="shrink-0 px-3.5 py-2 text-sm font-medium whitespace-nowrap"
            :style="presetStyle(ex)"
            @click="selectPreset(ex)"
          >
            {{ ex }}
          </button>
        </div>
      </section>

      <section class="mb-8">
        <p class="mb-2.5 text-xs font-medium" style="color: var(--color-primary-light);">默认组数配置</p>
        <div class="rounded-xl p-4" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-sm" style="color: var(--color-primary);">组数</span>
              <div class="flex h-8 w-12 items-center justify-center" style="background: var(--color-surface-muted); border-radius: var(--radius-md);">
                <span class="text-sm font-semibold" style="color: var(--color-primary); font-family: var(--font-mono);">{{ defaultSets }}</span>
              </div>
              <span class="text-sm" style="color: var(--color-primary-light);">组</span>
            </div>
            <div class="h-5 w-px" style="background: var(--color-border-light);"></div>
            <div class="flex items-center gap-3">
              <span class="text-sm" style="color: var(--color-primary);">次数</span>
              <div class="flex h-8 w-12 items-center justify-center" style="background: var(--color-surface-muted); border-radius: var(--radius-md);">
                <span class="text-sm font-semibold" style="color: var(--color-primary); font-family: var(--font-mono);">{{ defaultReps }}</span>
              </div>
              <span class="text-sm" style="color: var(--color-primary-light);">次</span>
            </div>
          </div>
          <p class="mt-2.5 text-xs" style="color: var(--color-primary-light);">训练时可随时调整</p>
        </div>
      </section>

      <section>
        <button
          class="flex w-full items-center justify-center py-3.5 text-base font-semibold"
          style="background: var(--color-training-main); color: var(--color-surface); border-radius: var(--radius-full);"
          @click="handleConfirm"
        >
          添加动作
        </button>
        <div class="mt-4 flex justify-center">
          <button class="text-sm font-medium" style="color: var(--color-primary-light);" @click="goBack">取消</button>
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

function categoryStyle(key: string) {
  const isSelected = selectedCategory.value === key
  if (isSelected) {
    return {
      background: 'var(--state-info-bg)',
      borderLeft: '3px solid var(--color-training-main)',
    }
  }
  return {
    background: 'var(--color-surface)',
    borderBottom: '0.5px solid var(--color-border-light)',
  }
}

const selectedPreset = ref<string | null>(null)

function presetStyle(ex: string) {
  const isActive = selectedPreset.value === ex
  return {
    background: isActive ? 'var(--state-info-bg)' : 'var(--color-surface-muted)',
    color: isActive ? 'var(--color-training-main)' : 'var(--color-primary)',
    borderRadius: 'var(--radius-full)',
    border: isActive ? '0.5px solid var(--color-training-main)' : '0.5px solid var(--color-border-light)',
    transition: 'all var(--duration-fast) var(--ease-default)',
  }
}

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
