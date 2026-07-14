<template>
  <main class="pb-24 px-4 pt-6 max-w-lg mx-auto">
    <header class="px-4 pb-4">
      <h1 class="typography-hero">设置</h1>
    </header>

    <section class="px-4 mb-6">
      <h2 class="typography-caption px-1 mb-1.5" style="text-transform: uppercase;">训练偏好</h2>
      <div class="rounded-[var(--radius-lg)] overflow-hidden" style="background: var(--color-surface); box-shadow: var(--shadow-card);">
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border); cursor: pointer;" @click="toggleUnit">
          <span class="typography-body">默认单位</span>
          <span class="flex items-center gap-1" style="color: var(--color-primary-light); font-family: var(--font-sans); font-size: var(--text-base);">
            {{ settingsStore.settings.defaultUnit }}
            <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
          </span>
        </div>
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
          <span class="typography-body">组间休息</span>
          <span class="flex items-center gap-2" style="font-family: var(--font-mono); font-size: var(--text-base); font-weight: var(--font-weight-medium); color: var(--color-primary);">
            <span style="cursor: pointer; display: flex; align-items: center;" @click="decrementRest"><i data-lucide="minus" style="width: 14px; height: 14px; color: var(--color-primary-light);"></i></span>
            {{ settingsStore.settings.defaultRestSeconds }}秒
            <span style="cursor: pointer; display: flex; align-items: center;" @click="incrementRest"><i data-lucide="plus" style="width: 14px; height: 14px; color: var(--color-primary-light);"></i></span>
          </span>
        </div>
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border); cursor: pointer;" @click="toggleRounding">
          <span class="typography-body">重量取整</span>
          <span class="flex items-center gap-1" style="color: var(--color-primary-light); font-family: var(--font-sans); font-size: var(--text-base);">
            {{ settingsStore.settings.weightRounding }}kg
            <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
          </span>
        </div>
        <div class="flex items-center justify-between px-4 py-3">
          <span class="typography-body">训练提醒</span>
          <div
            :style="toggleStyle"
            style="width: 51px; height: 31px; border-radius: 15.5px; position: relative; flex-shrink: 0; cursor: pointer; transition: background var(--duration-normal) var(--ease-default);"
            @click="toggleReminder"
          >
            <div
              :style="toggleThumbStyle"
              style="width: 27px; height: 27px; background: var(--color-surface); border-radius: 50%; position: absolute; top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: right var(--duration-normal) var(--ease-default);"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 mb-6">
      <h2 class="typography-caption px-1 mb-1.5" style="text-transform: uppercase;">数据管理</h2>
      <div class="rounded-[var(--radius-lg)] overflow-hidden" style="background: var(--color-surface); box-shadow: var(--shadow-card);">
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
          <div class="min-w-0 flex-1 mr-3">
            <span class="typography-body block truncate">导出 JSON 备份</span>
            <span class="typography-caption block truncate">完整数据</span>
          </div>
          <span class="shrink-0" style="color: var(--color-training-main); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="handleExportJSON">导出</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
          <div class="min-w-0 flex-1 mr-3">
            <span class="typography-body block truncate">导出 CSV 训练记录</span>
            <span class="typography-caption block truncate">表格格式</span>
          </div>
          <span class="shrink-0" style="color: var(--color-training-main); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="handleExportCSV">导出</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
          <div class="min-w-0 flex-1 mr-3">
            <span class="typography-body block truncate">导入数据</span>
            <span class="typography-caption block truncate">从备份恢复</span>
          </div>
          <span class="shrink-0" style="color: var(--color-training-main); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="triggerImport">导入</span>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            style="display: none;"
            @change="handleImportFile"
          />
        </div>
        <div v-if="importConflict" class="px-4 py-3" style="border-bottom: 0.5px solid var(--color-border-light); background: var(--state-warning-bg);">
          <div class="flex items-start gap-2 mb-2">
            <i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--state-warning); flex-shrink: 0; margin-top: 1px;"></i>
            <div>
              <p style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);">检测到数据冲突</p>
              <p style="font-size: var(--text-xs); color: var(--color-primary-light);">导入数据包含 {{ importConflict.conflictCount }} 个已存在的{{ importConflict.conflictType }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="flex-1 h-9 rounded-full text-xs font-medium" style="background: var(--color-training-main); color: var(--color-surface);" @click="handleSmartMerge">智能合并</button>
            <button class="flex-1 h-9 rounded-full text-xs font-medium" style="background: var(--color-surface); color: var(--state-error); border: 1px solid var(--state-error);" @click="handleOverwrite">覆盖现有</button>
            <button class="flex-1 h-9 rounded-full text-xs font-medium" style="color: var(--color-primary-light);" @click="cancelImport">取消导入</button>
          </div>
        </div>
        <div class="flex items-center justify-between px-4 py-3">
          <div class="min-w-0 flex-1 mr-3">
            <span class="typography-body block truncate">上次备份</span>
            <span class="typography-caption block truncate">{{ lastBackupDate }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 mb-6">
      <h2 class="typography-caption px-1 mb-1.5" style="text-transform: uppercase;">存储模式</h2>
      <div class="rounded-[var(--radius-lg)] overflow-hidden" style="background: var(--color-surface); box-shadow: var(--shadow-card);">
        <!-- 当前模式 -->
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
          <div class="min-w-0 flex-1 mr-3">
            <span class="typography-body block truncate">当前模式</span>
            <span class="typography-caption block truncate" :style="{ color: storageMode === 'cloud' ? 'var(--state-success)' : 'var(--color-primary-light)' }">
              {{ storageMode === 'cloud' ? '云端同步' : '本地存储' }}
            </span>
          </div>
          <i :data-lucide="storageMode === 'cloud' ? 'cloud' : 'hard-drive'" style="width: 18px; height: 18px; color: var(--color-primary-light);"></i>
        </div>

        <!-- 云端模式：显示用户信息 + 退出 -->
        <template v-if="storageMode === 'cloud'">
          <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
            <div class="min-w-0 flex-1 mr-3">
              <span class="typography-body block truncate">已登录</span>
              <span class="typography-caption block truncate">{{ authUser?.username || authUser?.email || authUser?.uid || '未知用户' }}</span>
            </div>
            <span class="shrink-0" style="color: var(--state-error); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="handleLogout">退出</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <div class="min-w-0 flex-1 mr-3">
              <span class="typography-body block truncate">切换到本地存储</span>
              <span class="typography-caption block truncate">数据将下载到本设备</span>
            </div>
            <span class="shrink-0" style="color: var(--color-training-main); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="handleSwitchToLocal">切换</span>
          </div>
        </template>

        <!-- 本地模式：切换到云端 -->
        <template v-else>
          <!-- CloudBase 配置（未配置时显示） -->
          <template v-if="!isConfigured">
            <div class="px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
              <span class="typography-body block mb-2">CloudBase 配置</span>
              <input
                v-model="cbConfig.env"
                type="text"
                placeholder="环境 ID (Env ID)"
                class="w-full h-10 px-3 mb-2 rounded-[var(--radius-sm)] typography-caption"
                style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
              />
              <input
                v-model="cbConfig.region"
                type="text"
                placeholder="区域 (如 ap-shanghai)"
                class="w-full h-10 px-3 mb-2 rounded-[var(--radius-sm)] typography-caption"
                style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
              />
              <input
                v-model="cbConfig.accessKey"
                type="text"
                placeholder="Publishable Key"
                class="w-full h-10 px-3 mb-2 rounded-[var(--radius-sm)] typography-caption"
                style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-primary);"
              />
              <button
                @click="saveCloudBaseConfig"
                class="w-full h-9 rounded-full text-xs font-medium"
                style="background: var(--color-training-main); color: var(--color-surface);"
              >
                保存配置
              </button>
            </div>
          </template>

          <!-- 已配置但未登录 -->
          <template v-else-if="!authUser">
            <div class="flex items-center justify-between px-4 py-3">
              <div class="min-w-0 flex-1 mr-3">
                <span class="typography-body block truncate">登录 CloudBase</span>
                <span class="typography-caption block truncate">登录后可同步到云端</span>
              </div>
              <span class="shrink-0" style="color: var(--color-training-main); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="goLogin">前往登录</span>
            </div>
          </template>

          <!-- 已配置且已登录：可切换 -->
          <template v-else>
            <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
              <div class="min-w-0 flex-1 mr-3">
                <span class="typography-body block truncate">已登录</span>
                <span class="typography-caption block truncate">{{ authUser.username || authUser.email || authUser.uid }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="min-w-0 flex-1 mr-3">
                <span class="typography-body block truncate">切换到云端同步</span>
                <span class="typography-caption block truncate">数据将上传到云端</span>
              </div>
              <span class="shrink-0" style="color: var(--color-training-main); font-size: var(--text-base); font-weight: var(--font-weight-medium); cursor: pointer;" @click="handleSwitchToCloud">切换</span>
            </div>
          </template>

          <!-- 切换确认提示 -->
          <div v-if="switchError" class="px-4 py-3" style="border-top: 0.5px solid var(--color-border-light); background: var(--state-warning-bg);">
            <p class="typography-caption" style="color: var(--state-warning);">{{ switchError }}</p>
          </div>
          <div v-if="switching" class="px-4 py-3" style="border-top: 0.5px solid var(--color-border-light);">
            <p class="typography-caption" style="color: var(--color-primary-light);">正在迁移数据，请稍候...</p>
          </div>
        </template>
      </div>
    </section>

    <section class="px-4 mb-6">
      <h2 class="typography-caption px-1 mb-1.5" style="text-transform: uppercase;">周期</h2>
      <div class="rounded-[var(--radius-lg)] overflow-hidden" style="background: var(--color-surface); box-shadow: var(--shadow-card);">
        <div class="flex items-center justify-between px-4 py-3" style="cursor: pointer;" @click="goCycle">
          <div class="min-w-0 flex-1 mr-3">
            <span class="typography-body block truncate">周期管理</span>
            <span class="typography-caption block truncate">{{ cycleSummary }}</span>
          </div>
          <i data-lucide="chevron-right" style="width: 16px; height: 16px; color: var(--color-border); flex-shrink: 0;"></i>
        </div>
        <div class="flex items-center justify-between px-4 py-3" style="border-top: 0.5px solid var(--color-border-light); cursor: pointer;" @click="goOneRM">
          <div>
            <span class="typography-body block">1RM 设置</span>
            <span class="typography-caption block">调整三大项最大重量</span>
          </div>
          <i data-lucide="chevron-right" style="width: 16px; height: 16px; color: var(--color-border); flex-shrink: 0;"></i>
        </div>
      </div>
    </section>

    <section class="px-4 mb-6">
      <h2 class="typography-caption px-1 mb-1.5" style="text-transform: uppercase;">关于</h2>
      <div class="rounded-[var(--radius-lg)] overflow-hidden" style="background: var(--color-surface); box-shadow: var(--shadow-card);">
        <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 0.5px solid var(--color-border);">
          <span class="typography-body">Candito 训练助手</span>
          <span class="typography-caption">v1.0.0</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3">
          <span class="typography-body">数据来源</span>
          <span class="typography-caption truncate">Johnnie Candito / 力量营翻译</span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createIcons, icons } from 'lucide'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useBodyMetricStore } from '@/stores/bodyMetricStore'
import { exportJSON, exportCSV, importJSON } from '@/services/exportService'
import { getToday, formatDateFull } from '@/services/dateService'
import { useStorageMode } from '@/composables/useStorageMode'
import { useAuth } from '@/composables/useAuth'
import { getCloudBaseConfig, setCloudBaseConfig, isCloudBaseConfigured } from '@/services/cloudbaseConfig'
import { resetCloudBase } from '@/services/cloudbase'
import type { WorkoutRecord } from '@/types/record'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()
const bodyMetricStore = useBodyMetricStore()

// 存储模式 + 认证
const { storageMode, switching, switchError, enableCloud, enableLocal, reinitStorage, flush } = useStorageMode()
const { user: authUser, checkAuthState, logout } = useAuth()

const isConfigured = ref(isCloudBaseConfigured())
const cbConfig = ref(getCloudBaseConfig())

const fileInputRef = ref<HTMLInputElement | null>(null)
const importConflict = ref<{ conflictType: string; conflictCount: number; data: any } | null>(null)
let pendingImportData: any = null

const toggleStyle = computed(() => ({
  background: settingsStore.settings.reminderEnabled ? 'var(--state-success)' : 'var(--color-border)',
}))

const toggleThumbStyle = computed(() => ({
  right: settingsStore.settings.reminderEnabled ? '2px' : '22px',
}))

const cycleSummary = computed(() => {
  const ac = cycleStore.activeCycle
  if (!ac) return '暂无活跃周期'
  const lastWeek = ac.weeks.length > 0 ? ac.weeks[ac.weeks.length - 1].weekNumber : 0
  const completedDays = ac.weeks.reduce((sum, w) => sum + w.days.filter(d => d.status === 'completed').length, 0)
  return `当前: ${ac.name} · 已完成 ${completedDays} 天`
})

const lastBackupDate = computed(() => {
  const key = 'candito_last_backup'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  return '暂无备份记录'
})

function toggleReminder() {
  const newValue = !settingsStore.settings.reminderEnabled
  settingsStore.update({ reminderEnabled: newValue })
  if (newValue && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    if (Notification.permission === 'granted') {
      new Notification('Candito 训练助手', {
        body: '训练提醒已开启，训练日打开应用时会收到通知',
        icon: '/favicon.svg',
      })
    }
  }
}

function toggleUnit() {
  const next = settingsStore.settings.defaultUnit === 'kg' ? 'lb' : 'kg'
  settingsStore.update({ defaultUnit: next })
}

function toggleRounding() {
  const current = settingsStore.settings.weightRounding
  const next = current === 2.5 ? 5 : 2.5
  settingsStore.update({ weightRounding: next })
}

function incrementRest() {
  const current = settingsStore.settings.defaultRestSeconds
  const next = Math.min(current + 15, 300)
  settingsStore.update({ defaultRestSeconds: next })
}

function decrementRest() {
  const current = settingsStore.settings.defaultRestSeconds
  const prev = Math.max(current - 15, 15)
  settingsStore.update({ defaultRestSeconds: prev })
}

function handleExportJSON() {
  const data = {
    cycles: cycleStore.cycles,
    records: Object.fromEntries(
      cycleStore.cycles.map(c => [c.id, recordStore.getRecordsForCycle(c.id)])
    ),
    bodyMetrics: bodyMetricStore.metrics,
    settings: settingsStore.settings,
  }
  exportJSON(data)

  const today = formatDateFull(getToday())
  localStorage.setItem('candito_last_backup', today + ' ' + getToday())
}

function handleExportCSV() {
  const allRecords: WorkoutRecord[] = []
  for (const c of cycleStore.cycles) {
    allRecords.push(...recordStore.getRecordsForCycle(c.id))
  }
  if (allRecords.length === 0) return
  exportCSV(allRecords)
}

function triggerImport() {
  fileInputRef.value?.click()
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (!content) return

    const result = importJSON(content)
    if (!result.success) {
      alert(result.error || '导入失败')
      input.value = ''
      return
    }

    if (result.conflicts && result.conflicts.length > 0) {
      importConflict.value = {
        conflictType: result.conflicts[0].type === 'cycle' ? '周期' : '记录',
        conflictCount: result.conflicts.length,
        data: JSON.parse(content),
      }
      pendingImportData = JSON.parse(content)
    } else {
      applyImport(JSON.parse(content), 'merge')
      alert('导入成功')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function handleSmartMerge() {
  if (pendingImportData) {
    applyImport(pendingImportData, 'merge')
    importConflict.value = null
    pendingImportData = null
    alert('导入成功（智能合并）')
  }
}

function handleOverwrite() {
  if (pendingImportData) {
    applyImport(pendingImportData, 'overwrite')
    importConflict.value = null
    pendingImportData = null
    alert('导入成功（已覆盖）')
  }
}

function cancelImport() {
  importConflict.value = null
  pendingImportData = null
}

function applyImport(data: any, mode: 'merge' | 'overwrite') {
  const imported = data.data || data
  if (!imported) return

  if (Array.isArray(imported.cycles)) {
    for (const cycle of imported.cycles) {
      const existing = cycleStore.getCycleById(cycle.id)
      if (existing && mode === 'merge') {
        cycleStore.updateCycle(cycle.id, { ...cycle })
      } else {
        cycleStore.addCycle(cycle)
      }
    }
  }

  if (imported.records && typeof imported.records === 'object') {
    for (const [cycleId, records] of Object.entries(imported.records)) {
      if (Array.isArray(records)) {
        for (const record of records) {
          recordStore.addRecord(record as unknown as WorkoutRecord)
        }
      }
    }
  }

  if (Array.isArray(imported.bodyMetrics)) {
    for (const metric of imported.bodyMetrics) {
      const exists = bodyMetricStore.metrics.some((m: any) => m.id === metric.id)
      if (!exists || mode === 'overwrite') {
        bodyMetricStore.addMetric(metric)
      }
    }
  }

  if (imported.settings) {
    settingsStore.update(imported.settings)
  }
}

function goCycle() {
  router.push({ name: 'cycle' })
}

function goOneRM() {
  router.push({ name: '1rm' })
}

// --- 存储模式切换 ---

function saveCloudBaseConfig() {
  setCloudBaseConfig(cbConfig.value)
  resetCloudBase()
  isConfigured.value = isCloudBaseConfigured()
  void checkAuthState()
}

function goLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

async function handleSwitchToCloud() {
  await flush()
  const ok = await enableCloud()
  if (ok) {
    await reloadStores()
  }
}

async function handleSwitchToLocal() {
  await flush()
  const ok = await enableLocal()
  if (ok) {
    await reloadStores()
  }
}

async function handleLogout() {
  await flush()
  await logout()
  await reinitStorage()
  await reloadStores()
}

async function reloadStores() {
  await cycleStore.load()
  await recordStore.loadAll(cycleStore.cycles.map(c => c.id))
  await bodyMetricStore.load()
  await settingsStore.load()
}

onMounted(() => {
  void checkAuthState()
})

watch(() => route.path, () => {
  setTimeout(() => {
    createIcons({ icons })
  }, 50)
}, { immediate: true })
</script>
