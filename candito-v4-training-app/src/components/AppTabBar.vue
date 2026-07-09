<template>
  <nav class="fixed bottom-0 inset-x-0 z-30 border-t" style="background: rgba(255,255,255,0.88); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-color: var(--color-border-light);">
    <div class="flex items-center justify-around pt-2 pb-6 max-w-lg mx-auto" style="padding-bottom: calc(0.375rem + env(safe-area-inset-bottom, 0px));">
      <button
        v-for="tab in tabs"
        :key="tab.route"
        class="flex flex-col items-center gap-0.5 min-w-[56px]"
        :style="{ color: currentRoute === tab.route ? 'var(--color-training-main)' : 'var(--color-primary-light)' }"
        @click="navigate(tab.route)"
        :aria-label="tab.label"
      >
        <i :data-lucide="tab.icon" class="w-5 h-5"></i>
        <span class="text-[10px] font-medium" :style="{ fontWeight: currentRoute === tab.route ? '600' : '400' }">
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createIcons, icons } from 'lucide'

const router = useRouter()
const route = useRoute()

const tabs = [
  { route: '/today', label: '今日', icon: 'dumbbell' },
  { route: '/calendar', label: '日历', icon: 'calendar' },
  { route: '/stats', label: '统计', icon: 'bar-chart-3' },
  { route: '/settings', label: '设置', icon: 'settings' },
]

const currentRoute = computed(() => route.path)

function navigate(path: string) {
  router.push(path)
}

// Re-create lucide icons after render
import { watch } from 'vue'
watch(() => route.path, () => {
  setTimeout(() => {
    createIcons({ icons })
  }, 50)
}, { immediate: true })
</script>
