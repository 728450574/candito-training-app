<template>
  <main class="min-h-screen flex flex-col items-center justify-center px-6" style="background: var(--color-surface);">
    <div class="w-full max-w-sm">
      <header class="text-center mb-8">
        <h1 class="typography-hero">Candito 训练助手</h1>
        <p class="typography-caption mt-2" style="color: var(--color-primary-light);">登录以同步数据到云端</p>
      </header>

      <form @submit.prevent="handleLogin" class="mb-6">
        <div class="mb-4">
          <input
            v-model="username"
            type="text"
            placeholder="用户名"
            class="w-full h-12 px-4 rounded-[var(--radius-sm)] typography-body"
            style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
            :disabled="authLoading"
          />
        </div>
        <div class="mb-4">
          <input
            v-model="password"
            type="password"
            placeholder="密码"
            class="w-full h-12 px-4 rounded-[var(--radius-sm)] typography-body"
            style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
            :disabled="authLoading"
          />
        </div>

        <p v-if="authError" class="mb-3 typography-caption" style="color: var(--state-error);">
          {{ authError }}
        </p>

        <button
          type="submit"
          class="w-full h-12 rounded-full typography-body font-medium"
          style="background: var(--color-training-main); color: var(--color-surface);"
          :disabled="authLoading || !username || !password"
        >
          {{ authLoading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="text-center">
        <p class="typography-caption mb-3" style="color: var(--color-primary-light);">不想登录？</p>
        <button
          @click="useLocalOnly"
          class="w-full h-11 rounded-full typography-body"
          style="background: transparent; color: var(--color-primary); border: 1px solid var(--color-border);"
        >
          使用本地存储（不登录）
        </button>
        <p class="typography-caption mt-3" style="color: var(--color-primary-light);">
          数据仅保存在本设备，不会上传云端
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { setStorageMode } from '@/services/storage'
import { initStorage } from '@/services/storage'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { useSettingsStore } from '@/stores/settingsStore'

const router = useRouter()
const route = useRoute()
const { login, loading: authLoading, error: authError } = useAuth()

const username = ref('')
const password = ref('')

async function handleLogin() {
  try {
    await login(username.value, password.value)
    // 登录成功后重新初始化存储（切换到云端）
    await initStorage()
    const cycleStore = useCycleStore()
    await cycleStore.load()
    const recordStore = useRecordStore()
    await recordStore.loadAll(cycleStore.cycles.map(c => c.id))
    const bodyMetricStore = useBodyMetricStore()
    await bodyMetricStore.load()
    const settingsStore = useSettingsStore()
    await settingsStore.load()

    const redirect = (route.query.redirect as string) || '/today'
    router.replace(redirect)
  } catch {
    // 错误已在 composable 中处理
  }
}

async function useLocalOnly() {
  setStorageMode('local')
  // 本地模式无需重新初始化（默认已是本地）
  const redirect = (route.query.redirect as string) || '/today'
  router.replace(redirect)
}
</script>
