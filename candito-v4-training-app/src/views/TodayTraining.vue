<template>
  <main class="page">
    <div class="h-11"></div>

    <!-- ========== No Active Cycle ========== -->
    <template v-if="!activeCycle">
      <section class="px-5 pt-8 pb-4 text-center">
        <div class="no-cycle-icon-bg">
          <i data-lucide="dumbbell" class="lucide-2xl icon-training"></i>
        </div>
        <h1 class="typography-title mt-5">还没有训练周期</h1>
        <p class="typography-caption mt-2 caption-light">开始你的第一个 Candito 6周训练计划</p>
        <button class="create-cycle-btn" @click="goStart">创建训练周期</button>
      </section>
    </template>

    <!-- ========== Has Active Cycle ========== -->
    <template v-else-if="pageState === 'paused'">
      <section class="px-5 pt-8 pb-4">
        <p class="typography-caption">{{ greetingDate }}</p>
        <h1 class="typography-title mt-1">周期已暂停</h1>
      </section>
      <section class="px-5">
        <div class="elevated-card">
          <div class="flex items-center gap-3 mb-3">
            <div class="status-icon-bg warning">
              <i data-lucide="pause" class="lucide-xl icon-warning"></i>
            </div>
            <div>
              <h2 class="typography-subtitle" style="font-size: var(--text-lg);">当前训练周期已暂停</h2>
              <p class="text-sm text-light">恢复后即可继续训练</p>
            </div>
          </div>
          <div class="pt-3 divider-top">
            <button class="muted-action-btn" @click="goCycle">
              <i data-lucide="settings" class="lucide-md mr-1.5"></i>
              前往周期管理
            </button>
          </div>
        </div>
      </section>
      <section class="px-5 mt-6">
        <div class="flex gap-3">
          <button class="quick-action-btn" @click="goWeight">
            <i data-lucide="scale" class="lucide-lg mb-1 icon-training"></i>
            <p class="quick-action-label">记录体重</p>
          </button>
          <button class="quick-action-btn" @click="goStats">
            <i data-lucide="bar-chart-3" class="lucide-lg mb-1 icon-training"></i>
            <p class="quick-action-label">查看统计</p>
          </button>
          <button class="quick-action-btn" @click="goCycle">
            <i data-lucide="list" class="lucide-lg mb-1 icon-training"></i>
            <p class="quick-action-label">周期管理</p>
          </button>
        </div>
      </section>
    </template>

    <template v-else>
      <!-- ========== STATE: Rest Day ========== -->
      <template v-if="pageState === 'rest'">
        <section class="px-5">
          <div class="pb-4">
            <h1 class="typography-title">今天是休息日</h1>
            <p class="typography-caption mt-1.5 caption-light">充分休息，为下次训练做好准备</p>
          </div>

          <div v-if="nextTrainingDay" class="training-card">
            <p class="typography-caption mb-3">下次训练</p>
            <h2 class="typography-subtitle mb-1">{{ workoutTypeLabel(nextTrainingDay.type) }} · W{{ nextTrainingDay.weekNumber }}D{{ nextTrainingDay.dayNumber }}</h2>
            <p class="typography-caption mb-5">{{ formatDateDisplay(nextTrainingDay.scheduledDate) }}</p>
            <p class="countdown-number">还有 {{ countdownDays }} 天</p>
            <div class="pt-4 divider-top">
              <p class="typography-caption mb-2">训练内容</p>
              <ul class="space-y-2">
                <li v-for="ex in nextTrainingDay.exercises" :key="ex.id" class="flex items-center gap-2">
                  <span :class="['exercise-dot', ex.type]"></span>
                  <span class="typography-body truncate">{{ ex.name }}</span>
                </li>
              </ul>
            </div>
          </div>
          <div v-else class="training-card">
            <p class="typography-caption">没有安排训练</p>
          </div>
        </section>

        <section class="px-5 mt-6">
          <div class="flex gap-3">
            <button class="quick-action-btn" @click="goWeight">
              <i data-lucide="scale" class="lucide-lg mb-1 icon-training"></i>
              <p class="quick-action-label">记录体重</p>
            </button>
            <button class="quick-action-btn" @click="goStats">
              <i data-lucide="bar-chart-3" class="lucide-lg mb-1 icon-training"></i>
              <p class="quick-action-label">查看统计</p>
            </button>
            <button class="quick-action-btn" @click="goPlan">
              <i data-lucide="pen-line" class="lucide-lg mb-1 icon-training"></i>
              <p class="quick-action-label">训练笔记</p>
            </button>
          </div>
        </section>
      </template>

      <!-- ========== STATE: Training Day - Not Yet Done ========== -->
      <template v-else-if="pageState === 'pending'">
        <section class="px-5 pt-2 pb-4">
          <p class="typography-caption">{{ greetingDate }}</p>
          <h1 class="typography-title mt-1">准备好了吗？</h1>
        </section>

        <section class="px-5">
          <div class="training-card-warm">
            <div class="flex items-center justify-between mb-4">
              <span class="week-badge">第{{ todayDayInfo.weekNumber }}周 · {{ todayDayInfo.weekTheme }}</span>
              <span class="typography-caption flex items-center gap-1">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                预计 {{ estimatedDuration }} 分钟
              </span>
            </div>
            <h2 class="typography-subtitle mb-4">{{ workoutTypeLabel(todayDayInfo.type) }}</h2>
            <ul class="space-y-3 mb-6">
              <li v-for="ex in todayDayInfo.exercises" :key="ex.id" class="flex items-center gap-3">
                <span :class="['exercise-dot', ex.type]"></span>
                <span class="typography-body truncate">{{ ex.name }}</span>
              </li>
            </ul>
            <button class="start-training-btn" @click="goExecute">开始训练</button>
          </div>
        </section>

        <!-- Stats Bar -->
        <section class="px-5 mt-6">
          <div class="stats-bar">
            <div class="stats-item">
              <span class="mono-stat">
                {{ weekCompletedCount }}<span class="stat-fraction">/{{ weekTotalDays }}</span>
              </span>
              <span class="typography-caption mt-1">本周完成</span>
            </div>
            <div class="stats-divider"></div>
            <div class="stats-item">
              <span class="mono-stat">
                {{ todayDayInfo.weekNumber }}<span class="stat-fraction">/6</span>
              </span>
              <span class="typography-caption mt-1">当前周期</span>
            </div>
            <div class="stats-divider"></div>
            <div class="stats-item">
              <span class="mono-stat-accent">
                {{ streakDays }}<span class="stat-unit">天</span>
              </span>
              <span class="typography-caption mt-1">连续训练</span>
            </div>
          </div>
        </section>

        <div v-if="todayDayInfo.weekNumber === 6" class="flex justify-center mt-4">
          <button class="text-link accent" @click="goWeek6">
            <i data-lucide="trophy" class="lucide-sm"></i>
            第6周决策
          </button>
        </div>

        <div class="flex justify-center mt-2">
          <button class="text-link muted" @click="handleSkipTraining">
            <i data-lucide="skip-forward" class="lucide-sm"></i>
            跳过本次训练
          </button>
        </div>

        <div class="flex justify-center mt-1">
          <button class="text-link warning" @click="goMissed">
            <i data-lucide="alert-triangle" class="lucide-sm"></i>
            处理错过训练
          </button>
        </div>
      </template>

      <!-- ========== STATE: Training Day - Skipped ========== -->
      <template v-else-if="pageState === 'skipped'">
        <section class="px-5 pt-2 pb-4">
          <p class="typography-caption">{{ greetingDate }}</p>
          <h1 class="typography-title mt-1">今日已跳过</h1>
        </section>
        <section class="px-5">
          <div class="training-card-muted">
            <div class="flex items-center gap-3 mb-3">
              <div class="status-icon-bg subtle">
                <i data-lucide="skip-forward" class="lucide-xl icon-light"></i>
              </div>
              <div>
                <h2 class="typography-subtitle" style="font-size: var(--text-lg);">本次训练已跳过</h2>
                <p class="text-sm text-light">{{ workoutTypeLabel(todayDayInfo.type) }} · W{{ todayDayInfo.weekNumber }}D{{ todayDayInfo.dayNumber }}</p>
              </div>
            </div>
            <div class="pt-3 divider-top">
              <p class="typography-caption" style="font-size: var(--text-xs);">已标记为跳过，不会影响后续训练计划</p>
            </div>
          </div>
        </section>
        <section class="px-5 mt-6">
          <div class="flex gap-3">
            <button class="quick-action-btn" @click="goWeight">
              <i data-lucide="scale" class="lucide-lg mb-1 icon-training"></i>
              <p class="quick-action-label">记录体重</p>
            </button>
            <button class="quick-action-btn" @click="goStats">
              <i data-lucide="bar-chart-3" class="lucide-lg mb-1 icon-training"></i>
              <p class="quick-action-label">查看统计</p>
            </button>
            <button class="quick-action-btn" @click="goPlan">
              <i data-lucide="pen-line" class="lucide-lg mb-1 icon-training"></i>
              <p class="quick-action-label">训练计划</p>
            </button>
          </div>
        </section>
      </template>

      <!-- ========== STATE: Training Day - Completed ========== -->
      <template v-else>
        <section class="px-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="status-icon-bg success">
              <i data-lucide="check" class="lucide-xl icon-success"></i>
            </div>
            <div>
              <h2 class="typography-subtitle" style="font-size: var(--text-lg);">今日训练已完成</h2>
              <p class="text-sm text-light">{{ completedInfo }}</p>
            </div>
          </div>

          <!-- Today's Data Card -->
          <div class="elevated-card mb-4">
            <div class="flex items-center justify-between mb-3">
              <span class="section-title">本次训练数据</span>
              <button class="detail-link" @click="goDetail">
                查看详情
                <i data-lucide="chevron-right" class="lucide-xs"></i>
              </button>
            </div>
            <div class="data-row">
              <div class="data-item">
                <span class="mono-stat">{{ totalVolume }}</span>
                <span class="data-label">总容量 kg</span>
              </div>
              <div class="data-item">
                <span class="mono-stat">{{ totalCompletedSets }}</span>
                <span class="data-label">总组数</span>
              </div>
              <div class="data-item">
                <span class="mono-stat">{{ durationMinutes }}</span>
                <span class="data-label">分钟</span>
              </div>
            </div>
            <div class="feeling-row">
              <span class="data-label">训练感受</span>
              <span class="feeling-value">{{ feelingStars }} {{ feelingLabel }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <div class="muted-row">
              <span class="text-sm text-primary">记录今日体重</span>
              <span class="body-weight-value">{{ bodyWeightDisplay || '--' }}</span>
            </div>
          </div>

          <button v-if="nextTrainingDay" class="next-training-card" @click="goPlan">
            <div class="flex items-center justify-between mb-2">
              <span class="section-title">下次训练</span>
              <span class="next-badge">明天</span>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <span class="next-training-title">
                  {{ workoutTypeLabel(nextTrainingDay.type) }} · W{{ nextTrainingDay.weekNumber }}D{{ nextTrainingDay.dayNumber }}
                </span>
                <p class="next-training-detail">{{ formatDateDisplay(nextTrainingDay.scheduledDate) }} · 预计 {{ estimateDuration(nextTrainingDay.exercises) }} 分钟</p>
              </div>
              <i data-lucide="chevron-right" class="lucide-md icon-light"></i>
            </div>
          </button>
        </section>
      </template>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createIcons, icons } from 'lucide'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getToday, formatDate, getWeekday, addDays, diffDays } from '@/services/dateService'
import { calculateVolume } from '@/services/statsService'
import type { PlannedExercise } from '@/types/cycle'

const router = useRouter()
const route = useRoute()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()
const settingsStore = useSettingsStore()

onMounted(() => {
  if (settingsStore.settings.reminderEnabled && 'Notification' in window && Notification.permission === 'granted') {
    if (activeCycle.value && todayDayInfo.value && todayDayInfo.value.type !== 'rest' && !todayRecord.value) {
      new Notification('Candito 训练助手', {
        body: `今天有训练：${workoutTypeLabel(todayDayInfo.value.type)} · ${todayDayInfo.value.exercises.map(e => e.name).join('、')}`,
        icon: '/favicon.svg',
      })
    }
  }
})

const todayStr = getToday()

const activeCycle = computed(() => cycleStore.activeCycle)

const todayDayInfo = computed(() => {
  if (!activeCycle.value) return null
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === todayStr) {
        return { ...day, weekNumber: week.weekNumber, weekTheme: week.theme }
      }
    }
  }
  return null
})

const todayRecord = computed(() => {
  if (!activeCycle.value || !todayDayInfo.value) return null
  return recordStore.getRecordForDay(
    activeCycle.value.id,
    todayDayInfo.value.weekNumber,
    todayDayInfo.value.dayNumber
  )
})

const pageState = computed<'rest' | 'pending' | 'completed' | 'skipped' | 'paused'>(() => {
  if (!activeCycle.value || !todayDayInfo.value) return 'rest'
  if (activeCycle.value.isPaused) return 'paused'
  if (todayDayInfo.value.type === 'rest') return 'rest'
  if (todayDayInfo.value.status === 'skipped') return 'skipped'
  if (todayRecord.value) return 'completed'
  return 'pending'
})

const greetingDate = computed(() => {
  const [m, d] = todayStr.split('-').slice(1).map(Number)
  return `${m}月${d}日 ${getWeekday(todayStr)}`
})

const weekCompletedCount = computed(() => {
  if (!activeCycle.value || !todayDayInfo.value) return 0
  return recordStore.getRecordsForWeek(activeCycle.value.id, todayDayInfo.value.weekNumber).length
})

const weekTotalDays = computed(() => {
  if (!activeCycle.value || !todayDayInfo.value) return 0
  const week = activeCycle.value.weeks.find(w => w.weekNumber === todayDayInfo.value!.weekNumber)
  return week ? week.days.filter(d => d.type !== 'rest').length : 0
})

const streakDays = computed(() => {
  if (!activeCycle.value) return 0
  const records = recordStore.getRecordsForCycle(activeCycle.value.id)
  if (records.length === 0) return 0
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  let count = 1
  let current = sorted[0].date
  for (let i = 1; i < sorted.length; i++) {
    const prev = addDays(current, -1)
    if (sorted[i].date === prev) {
      count++
      current = prev
    } else {
      break
    }
  }
  return count
})

const nextTrainingDay = computed(() => {
  if (!activeCycle.value) return null
  const allDays = activeCycle.value.weeks.flatMap(w =>
    w.days.map(d => ({ ...d, weekNumber: w.weekNumber, weekTheme: w.theme }))
  )
  const future = allDays.filter(
    d => d.scheduledDate > todayStr && d.type !== 'rest' && d.status === 'pending'
  )
  future.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  return future[0] || null
})

const countdownDays = computed(() => {
  if (!nextTrainingDay.value) return 0
  return diffDays(todayStr, nextTrainingDay.value.scheduledDate)
})

const estimatedDuration = computed(() => {
  if (!todayDayInfo.value) return 0
  return estimateDuration(todayDayInfo.value.exercises)
})

const completedInfo = computed(() => {
  if (!todayRecord.value || !todayDayInfo.value) return ''
  const type = workoutTypeLabel(todayDayInfo.value.type)
  return `${type} · ${todayRecord.value.duration}分钟`
})

const totalVolume = computed(() => {
  if (!todayRecord.value) return 0
  return calculateVolume(todayRecord.value)
})

const totalCompletedSets = computed(() => {
  if (!todayRecord.value) return 0
  let count = 0
  for (const ex of todayRecord.value.exercises) {
    count += ex.sets.filter(s => s.isCompleted).length
  }
  return count
})

const durationMinutes = computed(() => {
  return todayRecord.value?.duration ?? 0
})

const feelingStars = computed(() => {
  const f = todayRecord.value?.feeling ?? 0
  return '★'.repeat(f) + '☆'.repeat(5 - f)
})

const feelingLabel = computed(() => {
  const labels = ['', '很差', '较差', '一般', '不错', '很棒']
  return labels[todayRecord.value?.feeling ?? 0] || ''
})

const bodyWeightDisplay = computed(() => {
  const bw = todayRecord.value?.bodyWeight
  if (!bw) return null
  return `${bw} ${activeCycle.value?.unit || 'kg'}`
})

function workoutTypeLabel(type: string): string {
  return type === 'lower' ? '下肢训练' : '上肢训练'
}

function formatDateDisplay(dateStr: string): string {
  return formatDate(dateStr) + ' ' + getWeekday(dateStr)
}

function estimateDuration(exercises: PlannedExercise[]): number {
  let total = 0
  for (const ex of exercises) {
    for (const _ of ex.sets) {
      total += ex.type === 'main' ? 3 : 2
    }
  }
  total += Math.max(0, exercises.length - 1) * 2
  return total
}

function goStart() { router.push('/start') }
function goExecute() {
  if (!todayDayInfo.value || !activeCycle.value) return
  router.push({ name: 'training-execute', query: { week: todayDayInfo.value.weekNumber, day: todayDayInfo.value.dayNumber, cycleId: activeCycle.value.id } })
}
function goDetail() {
  if (!todayDayInfo.value) return
  router.push({ name: 'training-detail', query: { week: todayDayInfo.value.weekNumber, day: todayDayInfo.value.dayNumber } })
}
function goWeek6() { router.push({ name: 'week6' }) }
function goMissed() { router.push({ name: 'missed' }) }
function goWeight() { router.push({ name: 'weight' }) }
function goCycle() { router.push('/cycle') }
function goStats() { router.push({ name: 'stats' }) }
function goPlan() { router.push({ name: 'plan' }) }

function handleSkipTraining() {
  if (!activeCycle.value || !todayDayInfo.value) return
  cycleStore.skipDay(activeCycle.value.id, todayDayInfo.value.weekNumber, todayDayInfo.value.dayNumber)
}

watch(() => route.path, () => {
  setTimeout(() => { createIcons({ icons }) }, 50)
}, { immediate: true })
</script>

<style scoped>
/* ===== 页面容器 ===== */
.page {
  padding-bottom: 100px;
  max-width: 32rem;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* ===== 共享工具类 ===== */
.text-sm { font-size: var(--text-sm); }
.text-light { color: var(--color-primary-light); }
.text-primary { color: var(--color-primary); }
.caption-light { color: var(--color-primary-light); }
.divider-top { border-top: 1px solid var(--color-border-light); }

/* ===== Lucide 图标尺寸 ===== */
.lucide-xs { width: 12px; height: 12px; }
.lucide-sm { width: 14px; height: 14px; }
.lucide-md { width: 16px; height: 16px; }
.lucide-lg { width: 18px; height: 18px; }
.lucide-xl { width: 20px; height: 20px; }
.lucide-2xl { width: 28px; height: 28px; }

/* 图标颜色 */
.icon-training { color: var(--color-training-main); }
.icon-warning { color: var(--state-warning); }
.icon-success { color: var(--state-success); }
.icon-light { color: var(--color-primary-light); }

/* ===== 无周期状态 ===== */
.no-cycle-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  margin: 0 auto;
  border-radius: var(--radius-full);
  background: var(--color-training-main);
  opacity: 0.1;
}

.create-cycle-btn {
  margin-top: 2rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-semibold);
  background: var(--color-training-main);
  color: var(--color-surface);
  font-size: var(--text-md);
}

/* ===== 状态图标背景 ===== */
.status-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-full);
}

.status-icon-bg.warning { background: var(--state-warning-bg); }
.status-icon-bg.success { background: var(--state-success-bg); }
.status-icon-bg.subtle { background: var(--color-primary-subtle); }

/* ===== 高亮卡片 ===== */
.elevated-card {
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: 1.25rem;
  box-shadow: var(--shadow-elevated);
}

/* ===== 操作按钮 ===== */
.muted-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.75rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-semibold);
  background: var(--color-surface-muted);
  color: var(--color-primary);
  font-size: var(--text-sm);
}

/* ===== 快捷入口按钮（记录体重/查看统计/周期管理） ===== */
.quick-action-btn {
  flex: 1;
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  text-align: center;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.quick-action-label {
  font-size: var(--text-xs);
  color: var(--color-primary);
}

/* ===== 训练卡片 ===== */
.training-card {
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-training-main);
  background: var(--color-surface);
  padding: 1.25rem;
  box-shadow: var(--shadow-elevated);
}

.training-card-warm {
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-warm);
  background: var(--color-surface);
  padding: 1.25rem;
  box-shadow: var(--shadow-elevated);
}

.training-card-muted {
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-primary-light);
  background: var(--color-surface);
  padding: 1.25rem;
  box-shadow: var(--shadow-elevated);
}

/* ===== 倒计时数字 ===== */
.countdown-number {
  margin-bottom: 1.25rem;
  font-family: var(--font-mono);
  font-size: 2.25rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-training-main);
  letter-spacing: -0.02em;
  line-height: var(--leading-tight);
}

/* ===== 动作类型圆点 ===== */
.exercise-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  background-color: var(--color-training-main);
}

.exercise-dot.optional {
  background-color: var(--color-training-optional);
}

/* ===== 周标签 ===== */
.week-badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.625rem;
  background: var(--color-primary-subtle);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  font-family: var(--font-sans);
}

/* ===== 开始训练按钮 ===== */
.start-training-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  padding: 0.875rem 1.5rem;
  font-weight: var(--font-weight-semibold);
  background-color: var(--color-training-main);
  color: var(--color-surface);
  font-family: var(--font-sans);
  font-size: var(--text-md);
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.75rem;
}

.stats-divider {
  width: 1px;
  align-self: stretch;
  background: var(--color-border);
}

/* ===== 等宽统计数字 ===== */
.mono-stat {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.mono-stat-accent {
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-training-main);
}

.stat-fraction {
  color: var(--color-primary-light);
}

.stat-unit {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
  font-weight: var(--font-weight-normal);
}

/* ===== 文字链接按钮 ===== */
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
}

.text-link.accent { color: var(--color-training-main); }
.text-link.muted { color: var(--color-primary-light); }
.text-link.warning { color: var(--state-warning); }

/* ===== 完成状态 - 数据卡片 ===== */
.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.detail-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  color: var(--color-training-main);
}

.data-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--color-border-light);
}

.data-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0;
}

.data-label {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

.feeling-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border-light);
}

.feeling-value {
  font-size: var(--text-sm);
  color: var(--color-primary);
}

/* ===== 体重行 ===== */
.muted-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  background: var(--color-surface-muted);
}

.body-weight-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-training-main);
}

/* ===== 下次训练卡片 ===== */
.next-training-card {
  width: 100%;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-top: 1rem;
  text-align: left;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.next-badge {
  font-size: var(--text-xs);
  color: var(--color-training-main);
}

.next-training-title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.next-training-detail {
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  margin-top: 2px;
}
</style>
