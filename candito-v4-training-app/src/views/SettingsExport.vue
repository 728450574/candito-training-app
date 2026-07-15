<template>
  <main class="pb-24 px-4 pt-6 max-w-lg mx-auto">
    <header class="px-4 pb-4">
      <h1 class="typography-hero">设置</h1>
    </header>

    <!-- 训练偏好 -->
    <section class="px-4 mb-6">
      <h2 class="typography-caption settings-section-title">训练偏好</h2>
      <div class="settings-card">
        <div class="settings-row settings-row-clickable" @click="toggleUnit">
          <span class="typography-body">默认单位</span>
          <span class="settings-value settings-unit-value">
            {{ settingsStore.settings.defaultUnit }}
            <i data-lucide="chevron-down" class="settings-icon-sm"></i>
          </span>
        </div>
        <div class="settings-row settings-row-divider">
          <span class="typography-body">组间休息</span>
          <span class="settings-value settings-mono-value">
            <span class="settings-icon-btn" @click="decrementRest"><i data-lucide="minus" class="settings-icon-sm settings-icon-light"></i></span>
            {{ settingsStore.settings.defaultRestSeconds }}秒
            <span class="settings-icon-btn" @click="incrementRest"><i data-lucide="plus" class="settings-icon-sm settings-icon-light"></i></span>
          </span>
        </div>
        <div class="settings-row settings-row-clickable" @click="toggleRounding">
          <span class="typography-body">重量取整</span>
          <span class="settings-value settings-unit-value">
            {{ settingsStore.settings.weightRounding }}kg
            <i data-lucide="chevron-down" class="settings-icon-sm"></i>
          </span>
        </div>
        <!-- 训练提醒开关 -->
        <div class="settings-row settings-row-last">
          <span class="typography-body">训练提醒</span>
          <div
            :class="['toggle-track', settingsStore.settings.reminderEnabled ? 'toggle-track-on' : 'toggle-track-off']"
            @click="toggleReminder"
          >
            <div
              :class="['toggle-thumb', settingsStore.settings.reminderEnabled ? 'toggle-thumb-on' : 'toggle-thumb-off']"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="px-4 mb-6">
      <h2 class="typography-caption settings-section-title">数据管理</h2>
      <div class="settings-card">
        <div class="settings-row settings-row-divider">
          <div class="settings-row-label">
            <span class="typography-body block truncate">导出 JSON 备份</span>
            <span class="typography-caption block truncate">完整数据</span>
          </div>
          <span class="settings-link" @click="handleExportJSON">导出</span>
        </div>
        <div class="settings-row settings-row-divider">
          <div class="settings-row-label">
            <span class="typography-body block truncate">导出 CSV 训练记录</span>
            <span class="typography-caption block truncate">表格格式</span>
          </div>
          <span class="settings-link" @click="handleExportCSV">导出</span>
        </div>
        <div class="settings-row settings-row-divider">
          <div class="settings-row-label">
            <span class="typography-body block truncate">导入数据</span>
            <span class="typography-caption block truncate">从备份恢复</span>
          </div>
          <span class="settings-link" @click="triggerImport">导入</span>
          <input ref="fileInputRef" type="file" accept=".json" class="hidden-input" @change="handleImportFile" />
        </div>
        <!-- 导入冲突提示 -->
        <div v-if="importConflict" class="px-4 py-3 import-conflict-section">
          <div class="flex items-start gap-2 mb-2">
            <i data-lucide="alert-triangle" class="warn-icon"></i>
            <div>
              <p class="import-conflict-title">检测到数据冲突</p>
              <p class="import-conflict-desc">导入数据包含 {{ importConflict.conflictCount }} 个已存在的{{ importConflict.conflictType }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="flex-1 h-9 rounded-full text-xs font-medium merge-btn" @click="handleSmartMerge">智能合并</button>
            <button class="flex-1 h-9 rounded-full text-xs font-medium overwrite-btn" @click="handleOverwrite">覆盖现有</button>
            <button class="flex-1 h-9 rounded-full text-xs font-medium cancel-import-btn" @click="cancelImport">取消导入</button>
          </div>
        </div>
        <div class="settings-row settings-row-last">
          <div class="settings-row-label">
            <span class="typography-body block truncate">上次备份</span>
            <span class="typography-caption block truncate">{{ lastBackupDate }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 存储模式 -->
    <section class="px-4 mb-6">
      <h2 class="typography-caption settings-section-title">存储模式</h2>
      <div class="settings-card">
        <!-- 当前模式 -->
        <div class="settings-row settings-row-divider">
          <div class="settings-row-label">
            <span class="typography-body block truncate">当前模式</span>
            <span class="typography-caption block truncate" :class="storageMode === 'cloud' ? 'storage-mode-cloud' : 'storage-mode-local'">
              {{ storageMode === 'cloud' ? '云端同步' : '本地存储' }}
            </span>
          </div>
          <i :data-lucide="storageMode === 'cloud' ? 'cloud' : 'hard-drive'" class="storage-mode-icon"></i>
        </div>

        <!-- 云端模式 -->
        <template v-if="storageMode === 'cloud'">
          <div class="settings-row settings-row-divider">
            <div class="settings-row-label">
              <span class="typography-body block truncate">已登录</span>
              <span class="typography-caption block truncate">{{ authUser?.username || authUser?.email || authUser?.uid || '未知用户' }}</span>
            </div>
            <span class="settings-danger-link" @click="handleLogout">退出</span>
          </div>
          <div class="settings-row settings-row-last">
            <div class="settings-row-label">
              <span class="typography-body block truncate">切换到本地存储</span>
              <span class="typography-caption block truncate">数据将下载到本设备</span>
            </div>
            <span class="settings-link" @click="handleSwitchToLocal">切换</span>
          </div>
        </template>

        <!-- 本地模式 -->
        <template v-else>
          <!-- 云端未配置 -->
          <template v-if="!isConfigured">
            <div class="settings-row settings-row-last">
              <div class="settings-row-label">
                <span class="typography-body block truncate">云端同步不可用</span>
                <span class="typography-caption block truncate">未配置 CloudBase 环境变量</span>
              </div>
              <i data-lucide="cloud-off" class="storage-disabled-icon"></i>
            </div>
          </template>

          <!-- 已配置但未登录 -->
          <template v-else-if="!authUser">
            <div class="settings-row settings-row-last">
              <div class="settings-row-label">
                <span class="typography-body block truncate">登录 CloudBase</span>
                <span class="typography-caption block truncate">登录后可同步到云端</span>
              </div>
              <span class="settings-link" @click="goLogin">前往登录</span>
            </div>
          </template>

          <!-- 已配置且已登录：可切换 -->
          <template v-else>
            <div class="settings-row settings-row-divider">
              <div class="settings-row-label">
                <span class="typography-body block truncate">已登录</span>
                <span class="typography-caption block truncate">{{ authUser.username || authUser.email || authUser.uid }}</span>
              </div>
            </div>
            <div class="settings-row settings-row-last">
              <div class="settings-row-label">
                <span class="typography-body block truncate">切换到云端同步</span>
                <span class="typography-caption block truncate">数据将上传到云端</span>
              </div>
              <span class="settings-link" @click="handleSwitchToCloud">切换</span>
            </div>
          </template>

          <!-- 切换提示 -->
          <div v-if="switchError" class="px-4 py-3 settings-warning-bar">
            <p class="typography-caption settings-warning-text">{{ switchError }}</p>
          </div>
          <div v-if="switching" class="px-4 py-3 settings-info-bar">
            <p class="typography-caption settings-info-text">正在迁移数据，请稍候...</p>
          </div>
        </template>
      </div>
    </section>

    <!-- 周期 -->
    <section class="px-4 mb-6">
      <h2 class="typography-caption settings-section-title">周期</h2>
      <div class="settings-card">
        <div class="settings-row settings-row-clickable" @click="goCycle">
          <div class="settings-row-label">
            <span class="typography-body block truncate">周期管理</span>
            <span class="typography-caption block truncate">{{ cycleSummary }}</span>
          </div>
          <i data-lucide="chevron-right" class="settings-chevron-icon"></i>
        </div>
        <div class="settings-row settings-row-clickable settings-top-divider" @click="goOneRM">
          <div>
            <span class="typography-body block">1RM 设置</span>
            <span class="typography-caption block">调整三大项最大重量</span>
          </div>
          <i data-lucide="chevron-right" class="settings-chevron-icon"></i>
        </div>
      </div>
    </section>

    <!-- 关于 -->
    <section class="px-4 mb-6">
      <h2 class="typography-caption settings-section-title">关于</h2>
      <div class="settings-card">
        <div class="settings-row settings-row-divider">
          <span class="typography-body">Candito 训练助手</span>
          <span class="typography-caption">v1.0.0</span>
        </div>
        <div class="settings-row settings-row-last">
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
import { isCloudBaseConfigured } from '@/services/cloudbaseConfig'
import type { WorkoutRecord } from '@/types/record'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()
const bodyMetricStore = useBodyMetricStore()

const { storageMode, switching, switchError, enableCloud, enableLocal, reinitStorage, flush } = useStorageMode()
const { user: authUser, checkAuthState, logout } = useAuth()

const isConfigured = isCloudBaseConfigured()

const fileInputRef = ref<HTMLInputElement | null>(null)
const importConflict = ref<{ conflictType: string; conflictCount: number; data: any } | null>(null)
let pendingImportData: any = null

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
  recordStore.reset()
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

<style scoped>
/* ===== 区域标题 ===== */
.settings-section-title {
  text-transform: uppercase;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  margin-bottom: 0.375rem;
}

/* ===== 设置卡片 ===== */
.settings-card {
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* ===== 设置行 ===== */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}

.settings-row-divider {
  border-bottom: 0.5px solid var(--color-border);
}

.settings-row-clickable {
  border-bottom: 0.5px solid var(--color-border);
  cursor: pointer;
}

.settings-row-last {
  /* 最后一行无底边框 */
}

.settings-top-divider {
  border-top: 0.5px solid var(--color-border-light);
}

/* ===== 设置行标签区域 ===== */
.settings-row-label {
  min-width: 0;
  flex: 1;
  margin-right: 0.75rem;
}

/* ===== 设置值文本 ===== */
.settings-value {
  color: var(--color-primary-light);
  font-family: var(--font-sans);
  font-size: var(--text-base);
}

.settings-unit-value {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.settings-mono-value {
  font-family: var(--font-mono);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ===== 图标 ===== */
.settings-icon-sm {
  width: 14px;
  height: 14px;
}

.settings-icon-light {
  color: var(--color-primary-light);
}

.settings-icon-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.settings-chevron-icon {
  width: 16px;
  height: 16px;
  color: var(--color-border);
  flex-shrink: 0;
}

.storage-mode-icon {
  width: 18px;
  height: 18px;
  color: var(--color-primary-light);
}

.storage-disabled-icon {
  width: 18px;
  height: 18px;
  color: var(--color-border);
}

/* ===== 操作链接 ===== */
.settings-link {
  color: var(--color-training-main);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  flex-shrink: 0;
}

.settings-danger-link {
  color: var(--state-error);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  flex-shrink: 0;
}

/* ===== 隐藏文件输入 ===== */
.hidden-input {
  display: none;
}

/* ===== 导入冲突提示 ===== */
.import-conflict-section {
  border-bottom: 0.5px solid var(--color-border-light);
  background: var(--state-warning-bg);
}

.warn-icon {
  width: 14px;
  height: 14px;
  color: var(--state-warning);
  flex-shrink: 0;
  margin-top: 1px;
}

.import-conflict-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.import-conflict-desc {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

.merge-btn {
  background: var(--color-training-main);
  color: var(--color-surface);
}

.overwrite-btn {
  background: var(--color-surface);
  color: var(--state-error);
  border: 1px solid var(--state-error);
}

.cancel-import-btn {
  color: var(--color-primary-light);
}

/* ===== 存储模式文字颜色 ===== */
.storage-mode-cloud {
  color: var(--state-success);
}

.storage-mode-local {
  color: var(--color-primary-light);
}

/* ===== 切换提示 ===== */
.settings-warning-bar {
  border-top: 0.5px solid var(--color-border-light);
  background: var(--state-warning-bg);
}

.settings-warning-text {
  color: var(--state-warning);
}

.settings-info-bar {
  border-top: 0.5px solid var(--color-border-light);
}

.settings-info-text {
  color: var(--color-primary-light);
}

/* ===== 开关Toggle ===== */
.toggle-track {
  width: 51px;
  height: 31px;
  border-radius: 15.5px;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-default);
}

.toggle-track-on {
  background: var(--state-success);
}

.toggle-track-off {
  background: var(--color-border);
}

.toggle-thumb {
  width: 27px;
  height: 27px;
  background: var(--color-surface);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: right var(--duration-normal) var(--ease-default);
}

.toggle-thumb-on {
  right: 2px;
}

.toggle-thumb-off {
  right: 22px;
}
</style>
