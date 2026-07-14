<template>
  <main class="min-h-screen flex flex-col items-center justify-center px-6" style="background: var(--color-surface);">
    <div class="w-full max-w-sm">
      <header class="text-center mb-8">
        <h1 class="typography-hero">Candito 训练助手</h1>
        <p class="typography-caption mt-2" style="color: var(--color-primary-light);">登录以同步数据到云端</p>
      </header>

      <!-- 登录方式切换 -->
      <div class="flex mb-6 rounded-[var(--radius-sm)] overflow-hidden" style="border: 1px solid var(--color-border);">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 h-10 typography-body font-medium transition-colors"
          :style="activeTab === tab.key
            ? { background: 'var(--color-training-main)', color: 'var(--color-surface)' }
            : { background: 'transparent', color: 'var(--color-primary)' }"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 用户名密码登录 -->
      <form v-if="activeTab === 'password'" @submit.prevent="handleLogin" class="mb-6">
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
        <button
          type="submit"
          class="w-full h-12 rounded-full typography-body font-medium"
          style="background: var(--color-training-main); color: var(--color-surface);"
          :disabled="authLoading || !username || !password"
        >
          {{ authLoading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 短信验证码登录 -->
      <form v-else-if="activeTab === 'sms'" @submit.prevent="handleSmsLogin" class="mb-6">
        <div class="mb-4">
          <input
            v-model="phone"
            type="tel"
            placeholder="手机号"
            class="w-full h-12 px-4 rounded-[var(--radius-sm)] typography-body"
            style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
            :disabled="authLoading"
          />
        </div>
        <div class="mb-4 flex gap-3">
          <input
            v-model="smsCode"
            type="text"
            placeholder="验证码"
            maxlength="6"
            class="flex-1 h-12 px-4 rounded-[var(--radius-sm)] typography-body"
            style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
            :disabled="authLoading"
          />
          <button
            type="button"
            @click="handleSendCode"
            :disabled="authLoading || !phone || countdown > 0"
            class="h-12 px-4 rounded-[var(--radius-sm)] typography-body whitespace-nowrap"
            style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
          >
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </button>
        </div>
        <button
          type="submit"
          class="w-full h-12 rounded-full typography-body font-medium"
          style="background: var(--color-training-main); color: var(--color-surface);"
          :disabled="authLoading || !phone || !smsCode"
        >
          {{ authLoading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 错误提示 -->
      <p v-if="authError" class="mb-3 typography-caption text-center" style="color: var(--state-error);">
        {{ authError }}
      </p>

      <!-- 分隔线 -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex-1 h-px" style="background: var(--color-border);"></div>
        <span class="typography-caption" style="color: var(--color-primary-light);">或</span>
        <div class="flex-1 h-px" style="background: var(--color-border);"></div>
      </div>

      <!-- 本地存储 -->
      <div class="text-center">
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
import { ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { setStorageMode } from '@/services/storage'
import { initStorage } from '@/services/storage'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { useSettingsStore } from '@/stores/settingsStore'

type LoginTab = 'password' | 'sms'
const tabs: { key: LoginTab; label: string }[] = [
  { key: 'password', label: '密码登录' },
  { key: 'sms', label: '短信登录' },
]

const router = useRouter()
const route = useRoute()
const {
  login,
  sendSmsCode,
  loginWithSmsCode,
  loading: authLoading,
  error: authError,
} = useAuth()

const activeTab = ref<LoginTab>('password')
const username = ref('')
const password = ref('')
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

/** 登录成功后的通用处理 */
async function onLoginSuccess() {
  await initStorage()
  // 容错：即使云端数据加载失败也要跳转，避免卡在登录页
  try {
    const cycleStore = useCycleStore()
    await cycleStore.load()
    const recordStore = useRecordStore()
    await recordStore.loadAll(cycleStore.cycles.map(c => c.id))
    const bodyMetricStore = useBodyMetricStore()
    await bodyMetricStore.load()
    const settingsStore = useSettingsStore()
    await settingsStore.load()
  } catch (err) {
    console.error('登录后数据加载失败，以空状态继续:', err)
  }

  const redirect = (route.query.redirect as string) || '/today'
  router.replace(redirect)
}

/** 用户名密码登录 */
async function handleLogin() {
  try {
    await login(username.value, password.value)
    await onLoginSuccess()
  } catch {
    // 错误已在 composable 中处理
  }
}

/** 发送短信验证码 */
async function handleSendCode() {
  try {
    await sendSmsCode(phone.value)
    startCountdown()
  } catch {
    // 错误已在 composable 中处理
  }
}

/** 短信验证码登录 */
async function handleSmsLogin() {
  try {
    await loginWithSmsCode(smsCode.value)
    await onLoginSuccess()
  } catch {
    // 错误已在 composable 中处理
  }
}

/** 使用本地存储 */
async function useLocalOnly() {
  setStorageMode('local')
  const redirect = (route.query.redirect as string) || '/today'
  router.replace(redirect)
}
</script>
