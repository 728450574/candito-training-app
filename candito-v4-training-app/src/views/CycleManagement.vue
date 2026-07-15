<template>
  <main class="page">
    <header class="mb-6">
      <h1 class="typography-title">周期管理</h1>
      <p class="typography-caption mt-1">Candito 6-Week 力量举计划</p>
    </header>

    <template v-if="activeCycle">
      <!-- Active Cycle Card -->
      <section class="active-cycle-card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="typography-subtitle">{{ activeCycle.name }}</h2>
          <span :class="['status-badge', activeCycle.status]">{{ statusLabel }}</span>
        </div>

        <div class="mb-4">
          <div class="flex items-baseline justify-between mb-1.5">
            <span class="progress-text">{{ progressText }}</span>
            <span class="progress-percent">{{ progressPercent }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 mb-4">
          <Calendar class="w-3.5 h-3.5 shrink-0 icon-light" />
          <span class="start-date">开始日期: {{ formattedStartDate }}</span>
        </div>

        <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          <div v-for="rm in oneRMCards" :key="rm.key" class="rm-card">
            <p class="rm-name">{{ rm.name }}</p>
            <p class="rm-value">{{ rm.value }}{{ activeCycle.unit }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <template v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'">
            <button class="action-btn-secondary" @click="goPause">
              <Pause class="w-3.5 h-3.5 shrink-0" />暂停周期
            </button>
            <button class="action-btn-primary" @click="goOneRM">
              <Dumbbell class="w-3.5 h-3.5 shrink-0" />设置1RM
            </button>
          </template>
          <template v-else>
            <button class="action-btn-primary" @click="goStart">
              <Dumbbell class="w-3.5 h-3.5 shrink-0" />创建新周期
            </button>
          </template>
        </div>
      </section>

      <!-- Timeline -->
      <section class="mb-6">
        <h2 class="timeline-title">训练周进度</h2>
        <div class="relative ml-3.5">
          <div class="timeline-line"></div>
          <div v-for="week in weekTimeline" :key="week.weekNumber" class="timeline-item">
            <!-- Dot -->
            <div v-if="week.state === 'completed'" class="timeline-dot completed"><Check class="w-2.5 h-2.5 text-white" /></div>
            <div v-else-if="week.state === 'in-progress'" class="timeline-dot active"></div>
            <div v-else class="timeline-dot pending"></div>

            <div :class="['timeline-card', week.state]">
              <div class="flex items-center justify-between mb-0.5">
                <span :class="['timeline-week-title', week.state]">W{{ week.weekNumber }} {{ week.theme }}</span>
                <span v-if="week.state === 'completed'" class="timeline-status-label completed">完成</span>
                <span v-else-if="week.state === 'in-progress'" class="timeline-status-label active">进行中</span>
                <span v-else-if="week.weekNumber === 6" class="timeline-status-label pending-decision">等待决策</span>
                <span v-else class="timeline-status-label pending">未开始</span>
              </div>
              <div v-if="week.completedDays > 0 || week.totalDays > 0">
                <span class="timeline-days">{{ week.completedDays }}/{{ week.totalDays }}天</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pause History -->
      <section v-if="activeCycle.pauseHistory.length > 0" class="mb-6">
        <button class="pause-history-toggle" @click="showPauseHistory = !showPauseHistory">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 shrink-0 icon-light" />
            <span class="pause-history-label">暂停记录</span>
          </div>
          <ChevronDown class="w-4 h-4 shrink-0 icon-light" :style="{ transform: showPauseHistory ? 'rotate(180deg)' : 'none' }" />
        </button>
        <div v-if="showPauseHistory" class="mt-2 space-y-2">
          <div v-for="pause in activeCycle.pauseHistory" :key="pause.id" class="pause-record">
            <CalendarOff class="w-4 h-4 shrink-0 icon-warning" />
            <div class="min-w-0 flex-1">
              <p class="pause-record-title">{{ pauseLabel(pause) }}</p>
              <p class="pause-record-date">{{ pauseRange(pause) }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Historical Cycles -->
    <section class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="typography-subtitle text-md">历史周期</h3>
        <span class="typography-caption">共 {{ historicalCycles.length }} 个</span>
      </div>

      <div v-for="cycle in historicalCycles" :key="cycle.id" class="history-card" @click="goCycleDetail(cycle)">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span :class="['history-badge', cycle.status]">{{ cycle.status === 'completed' ? '已完成' : '已终止' }}</span>
            <span class="history-name">{{ cycle.name }}</span>
          </div>
          <ChevronRight class="icon-sm icon-light" />
        </div>
        <div class="history-date-row">
          <span>{{ formatShortDate(cycle.startDate) }} - {{ formatShortDate(cycle.completedAt || cycle.terminatedAt || '') }}</span>
          <span>|</span>
          <span>{{ cycleSubtitle(cycle) }}</span>
        </div>
        <div class="history-rm-row">
          <span>深蹲 {{ cycle.oneRM.squat }}</span>
          <span>卧推 {{ cycle.oneRM.bench }}</span>
          <span>硬拉 {{ cycle.oneRM.deadlift }}</span>
          <span class="text-light">{{ cycle.unit }}</span>
        </div>
      </div>

      <div v-if="historicalCycles.length === 0" class="py-8 text-center">
        <p class="typography-caption">暂无历史周期</p>
      </div>
    </section>

    <template v-if="activeCycle">
      <!-- Restart Section -->
      <section v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'" class="mb-6">
        <h3 class="typography-subtitle text-md mb-3">重新开始</h3>
        <div class="space-y-2">
          <button class="restart-btn" @click="restartCurrent">
            <span class="flex items-center gap-2">
              <RotateCcw class="w-3.5 h-3.5 icon-accent" />从当前周重新开始
            </span>
            <ChevronRight class="w-4 h-4 icon-light" />
          </button>
          <button class="restart-btn" @click="showRestartModal = true">
            <span class="flex items-center gap-2">
              <Undo2 class="w-3.5 h-3.5 icon-accent" />从指定周重新开始 + 调整1RM
            </span>
            <ChevronRight class="w-4 h-4 icon-light" />
          </button>
        </div>
      </section>

      <section v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'" class="mb-3">
        <button class="restart-btn" @click="goPause">
          <span class="flex items-center gap-2">
            <PauseCircle class="w-3.5 h-3.5 icon-warning" />暂停周期
          </span>
          <div class="flex items-center gap-2">
            <span class="pause-hint">小长假/出差/受伤</span>
            <ChevronRight class="w-4 h-4 icon-light" />
          </div>
        </button>
      </section>

      <section v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'" class="terminate-section">
        <button class="terminate-btn" @click="handleTerminate">
          <OctagonX class="w-3.5 h-3.5 shrink-0" />终止周期
        </button>
        <p class="terminate-hint">终止后训练数据保留为只读</p>
      </section>
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">没有活跃的训练周期</p>
        <button class="empty-create-btn" @click="goStart">创建训练周期</button>
      </div>
    </template>
  </main>

  <!-- Restart Modal -->
  <Teleport to="body">
    <div v-if="showRestartModal" class="modal-overlay" @click.self="showRestartModal = false">
      <div class="modal-content" @click.stop>
        <h3 class="typography-subtitle mb-4">重新开始 · 指定周</h3>

        <div class="mb-4">
          <p class="modal-label">选择起始周</p>
          <div class="flex gap-2 flex-wrap">
            <button v-for="w in 6" :key="w" :class="['week-option', { active: restartWeek === w }]" @click="restartWeek = w">{{ w }}</button>
          </div>
        </div>

        <div class="mb-4">
          <p class="modal-label">1RM（可选调整）</p>
          <div class="flex flex-col gap-2">
            <div v-for="lift in restartLifts" :key="lift.key" class="flex items-center gap-3">
              <span class="modal-lift-name">{{ lift.cn }}</span>
              <input v-model.number="restartOneRM[lift.key]" type="number" step="0.5" class="modal-input" />
              <span class="modal-unit">{{ activeCycle?.unit || 'kg' }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="modal-cancel-btn" @click="showRestartModal = false">取消</button>
          <button class="modal-confirm-btn" @click="confirmRestart">确认重新开始</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { v4 as uuid } from 'uuid'
import { Calendar, ChevronDown, ChevronRight, Check, Clock, CalendarOff, Pause, Dumbbell, RotateCcw, Undo2, PauseCircle, OctagonX } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { useRecordStore } from '@/stores/recordStore'
import { formatDateFull, getToday } from '@/services/dateService'
import { createCycle } from '@/services/planGenerator'
import { flushStorage } from '@/services/storage'
import type { Cycle, PauseRecord, Week, TrainingDay } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()
const activeCycle = computed(() => cycleStore.activeCycle)
const showPauseHistory = ref(true)
const showRestartModal = ref(false)
const restartWeek = ref(1)
const restartOneRM = reactive({ squat: 100, bench: 85, deadlift: 120 })
const restartLifts = [
  { key: 'squat' as const, cn: '深蹲' },
  { key: 'bench' as const, cn: '卧推' },
  { key: 'deadlift' as const, cn: '硬拉' },
]

watch(showRestartModal, (v) => {
  if (v && activeCycle.value) {
    restartWeek.value = currentWeekNumber.value
    restartOneRM.squat = activeCycle.value.oneRM.squat
    restartOneRM.bench = activeCycle.value.oneRM.bench
    restartOneRM.deadlift = activeCycle.value.oneRM.deadlift
  }
})

const statusLabel = computed(() => {
  if (!activeCycle.value) return ''
  const s = activeCycle.value.status
  if (s === 'active') return '进行中'
  if (s === 'paused') return '已暂停'
  if (s === 'week6_pending') return '等待决策'
  if (s === 'completed') return '已完成'
  if (s === 'terminated') return '已终止'
  return ''
})

const currentWeekNumber = computed(() => {
  if (!activeCycle.value) return 1
  const today = getToday()
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === today) return week.weekNumber
    }
  }
  const firstIncomplete = activeCycle.value.weeks.find((w: Week) =>
    w.days.some((d: TrainingDay) => d.status === 'pending' && d.type !== 'rest')
  )
  return firstIncomplete?.weekNumber || 6
})
const completedWeekCount = computed(() => {
  if (!activeCycle.value) return 0
  return activeCycle.value.weeks.filter((w: Week) =>
    w.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
  ).length
})
const progressText = computed(() => activeCycle.value ? `第${currentWeekNumber.value}周 / 共6周` : '')
const progressPercent = computed(() => Math.round((completedWeekCount.value / 6) * 100))
const formattedStartDate = computed(() => activeCycle.value ? formatDateFull(activeCycle.value.startDate) : '')
const oneRMCards = computed(() => {
  if (!activeCycle.value) return []
  return [
    { key: 'squat', name: '深蹲', value: activeCycle.value.oneRM.squat },
    { key: 'bench', name: '卧推', value: activeCycle.value.oneRM.bench },
    { key: 'deadlift', name: '硬拉', value: activeCycle.value.oneRM.deadlift },
  ]
})

interface WeekTimelineItem { weekNumber: number; theme: string; state: 'completed' | 'in-progress' | 'pending'; completedDays: number; totalDays: number }
const weekTimeline = computed<WeekTimelineItem[]>(() => {
  if (!activeCycle.value) return []
  const cycle = activeCycle.value
  return cycle.weeks.map((w: Week) => {
    const totalDays = w.days.filter((d: TrainingDay) => d.type !== 'rest').length
    const completedDays = w.days.filter((d: TrainingDay) => d.status === 'completed').length
    let state: WeekTimelineItem['state'] = 'pending'
    if (completedDays === totalDays && totalDays > 0) state = 'completed'
    else if (completedDays > 0) state = 'in-progress'
    return { weekNumber: w.weekNumber, theme: w.theme, state, completedDays, totalDays }
  })
})

const historicalCycles = computed(() => {
  return cycleStore.cycles.filter((c: Cycle) => c.status === 'completed' || c.status === 'terminated')
})

function pauseLabel(pause: PauseRecord): string {
  const reasonMap: Record<string, string> = { holiday: '假期', travel: '出差', injury: '伤病', other: '其他' }
  return `暂停 · ${reasonMap[pause.reason] || pause.reason}`
}
function pauseRange(pause: PauseRecord): string {
  const from = pause.pausedAt
  const to = pause.resumedAt || '至今'
  return `${from} ~ ${to}`
}
function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.slice(5)
}
function cycleSubtitle(cycle: Cycle): string {
  const records = recordStore.getRecordsForCycle(cycle.id)
  return `${records.length}次训练`
}
function goPause() { router.push('/pause') }
function goOneRM() { router.push('/onerm') }
function goStart() { router.push('/start') }
function goCycleDetail(cycle: Cycle) {
  router.push({ name: 'cycle-detail', query: { cycleId: cycle.id } })
}
function restartCurrent() {
  if (!activeCycle.value) return
  const oneRM = { ...activeCycle.value.oneRM }
  const newCycle = createCycle({
    oneRM, unit: activeCycle.value.unit, weightRounding: activeCycle.value.weightRounding,
    startDate: getToday(), assistanceConfig: activeCycle.value.assistanceConfig,
  })
  cycleStore.addCycle(newCycle)
}
function confirmRestart() {
  if (!activeCycle.value) return
  const newCycle = createCycle({
    oneRM: { ...restartOneRM }, unit: activeCycle.value.unit, weightRounding: activeCycle.value.weightRounding,
    startDate: getToday(), assistanceConfig: activeCycle.value.assistanceConfig,
  })
  cycleStore.addCycle(newCycle)
  showRestartModal.value = false
}
async function handleTerminate() {
  if (!activeCycle.value) return
  const reason = prompt('请输入终止原因（可选）：')
  cycleStore.updateCycle(activeCycle.value.id, { status: 'terminated', terminatedAt: new Date().toISOString(), terminateReason: reason || undefined })
  await flushStorage()
}
</script>

<style scoped>
/* ===== 页面 ===== */
.page { padding-bottom: 6rem; padding-left: 1rem; padding-right: 1rem; padding-top: 1.5rem; max-width: 32rem; margin: 0 auto; }

/* ===== 活跃周期卡片 ===== */
.active-cycle-card { border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1.5rem; background: var(--color-surface); box-shadow: var(--shadow-elevated); }
.status-badge { display: inline-flex; align-items: center; white-space: nowrap; border-radius: var(--radius-full); padding: 0.125rem 0.625rem; font-size: var(--text-xs); font-weight: var(--font-weight-medium); }
.status-badge.active, .status-badge.week6_pending { background: var(--state-success-bg); color: var(--state-success); }
.status-badge.paused { background: var(--state-warning-bg); color: var(--state-warning); }
.status-badge.completed, .status-badge.terminated { background: var(--color-primary-subtle); color: var(--color-primary-light); }

/* ===== 进度条 ===== */
.progress-text { font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); }
.progress-percent { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary-light); }
.progress-bar-bg { height: 0.375rem; border-radius: var(--radius-full); overflow: hidden; background: var(--color-primary-subtle); }
.progress-bar-fill { height: 100%; border-radius: var(--radius-full); background: var(--color-training-main); transition: width 0.3s ease; }
.start-date { font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; color: var(--color-primary-light); }

/* ===== 1RM 卡片 ===== */
.rm-card { flex: 1; min-width: 0; border-radius: var(--radius-md); padding: 0.625rem; text-align: center; background: var(--color-primary-subtle); }
.rm-name { font-size: var(--text-xs); overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.125rem; color: var(--color-primary-light); }
.rm-value { font-family: var(--font-mono); font-size: var(--text-md); font-weight: var(--font-weight-semibold); overflow: hidden; text-overflow: ellipsis; color: var(--color-primary); }

/* ===== 操作按钮 ===== */
.action-btn-secondary { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; height: 2.25rem; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--font-weight-medium); white-space: nowrap; background: var(--color-primary-subtle); color: var(--color-primary); }
.action-btn-primary { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; height: 2.25rem; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--font-weight-medium); white-space: nowrap; background: var(--color-training-main); color: var(--color-surface); }

/* ===== 时间线 ===== */
.timeline-title { font-size: var(--text-sm); font-weight: var(--font-weight-semibold); margin-bottom: 0.75rem; padding-left: 1.75rem; color: var(--color-primary-light); }
.timeline-line { position: absolute; left: 7px; top: 0.75rem; bottom: 0.75rem; width: 1px; background: var(--color-border); }
.timeline-item { position: relative; display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; }
.timeline-dot { position: relative; z-index: 10; margin-top: 0.125rem; width: 15px; height: 15px; border-radius: var(--radius-full); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.timeline-dot.completed { background: var(--state-success); }
.timeline-dot.active { background: var(--color-training-main); box-shadow: 0 0 0 3px var(--state-info-bg); }
.timeline-dot.pending { background: var(--color-surface); border: 2px solid var(--color-border); }
.timeline-card { flex: 1; min-width: 0; border-radius: var(--radius-md); padding: 0.75rem; box-shadow: var(--shadow-card); }
.timeline-card.in-progress { background: var(--state-info-bg); }
.timeline-card.completed, .timeline-card.pending { background: var(--color-surface); }
.timeline-week-title { font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; }
.timeline-week-title.completed, .timeline-week-title.in-progress { font-weight: var(--font-weight-semibold); color: var(--color-primary); }
.timeline-week-title.pending { font-weight: var(--font-weight-normal); color: var(--color-primary-light); }
.timeline-status-label { font-size: var(--text-xs); font-weight: var(--font-weight-medium); white-space: nowrap; flex-shrink: 0; margin-left: 0.5rem; }
.timeline-status-label.completed { color: var(--state-success); }
.timeline-status-label.active { color: var(--color-training-main); }
.timeline-status-label.pending-decision { color: var(--state-warning); }
.timeline-status-label.pending { color: var(--color-primary-light); }
.timeline-days { font-size: var(--text-xs); color: var(--color-primary-light); }

/* ===== 暂停历史 ===== */
.pause-history-toggle { display: flex; width: 100%; align-items: center; justify-content: space-between; border-radius: var(--radius-lg); padding: 1rem; background: var(--color-surface); box-shadow: var(--shadow-card); }
.pause-history-label { font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-primary); }
.pause-record { border-radius: var(--radius-md); padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; background: var(--state-warning-bg); }
.pause-record-title { font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; color: var(--color-primary); }
.pause-record-date { font-size: var(--text-xs); overflow: hidden; text-overflow: ellipsis; color: var(--color-primary-light); }

/* ===== 历史周期 ===== */
.text-md { font-size: var(--text-md); }
.history-card { margin-bottom: 0.75rem; padding: 1rem; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); cursor: pointer; }
.history-badge { display: inline-flex; align-items: center; padding: 0 0.5rem 0.125rem; font-size: var(--text-xs); font-weight: var(--font-weight-medium); border-radius: var(--radius-full); }
.history-badge.completed { color: var(--state-success); background: var(--state-success-bg); }
.history-badge.terminated { color: var(--color-primary-light); background: var(--color-primary-subtle); }
.history-name { font-size: var(--text-base); font-weight: var(--font-weight-medium); color: var(--color-primary); }
.history-date-row { display: flex; align-items: center; gap: 1rem; font-size: var(--text-sm); color: var(--color-primary-light); }
.history-rm-row { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-primary); }

/* ===== 重新开始按钮 ===== */
.restart-btn { width: 100%; display: inline-flex; align-items: center; justify-content: space-between; height: 2.75rem; padding: 0 1rem; border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: var(--font-weight-medium); background: var(--color-surface); box-shadow: var(--shadow-card); color: var(--color-primary); }

/* ===== 终止区域 ===== */
.terminate-section { padding-top: 1rem; margin-bottom: 0.5rem; border-top: 1px solid var(--color-border-light); }
.terminate-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; height: 2.5rem; border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: var(--font-weight-medium); white-space: nowrap; color: var(--state-error); }
.terminate-hint { text-align: center; margin-top: 0.5rem; font-size: var(--text-xs); color: var(--color-primary-light); }
.pause-hint { font-size: var(--text-xs); color: var(--color-primary-light); }

/* ===== 图标工具类 ===== */
.icon-light { color: var(--color-primary-light); }
.icon-accent { color: var(--color-training-main); }
.icon-warning { color: var(--state-warning); }
.icon-sm { width: 16px; height: 16px; }

/* ===== 空白状态 ===== */
.empty-create-btn { padding: 0.375rem 1.5rem; border-radius: var(--radius-full); background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); }

/* ===== 模态框 ===== */
.modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.4); }
@media (min-width: 640px) { .modal-overlay { align-items: center; } }
.modal-content { width: 100%; max-width: 32rem; background: var(--color-surface); border-radius: 1rem 1rem 0 0; padding: 1.5rem; max-height: 90vh; overflow-y: auto; }
@media (min-width: 640px) { .modal-content { border-radius: 1rem; } }
.modal-label { font-size: var(--text-sm); font-weight: var(--font-weight-medium); margin-bottom: 0.5rem; color: var(--color-primary-light); }
.modal-lift-name { font-size: var(--text-sm); width: 2.5rem; color: var(--color-primary); }
.modal-input { flex: 1; border-radius: var(--radius-lg); padding: 0.5rem 0.75rem; outline: none; text-align: right; background: var(--color-surface-muted); font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-primary); }
.modal-unit { font-size: var(--text-xs); color: var(--color-primary-light); }

.week-option { width: 2.5rem; height: 2.5rem; border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); background: var(--color-surface-muted); color: var(--color-primary); }
.week-option.active { background: var(--color-training-main); color: var(--color-surface); }

.modal-cancel-btn { flex: 1; height: 2.75rem; border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: var(--font-weight-medium); background: var(--color-surface-muted); color: var(--color-primary); }
.modal-confirm-btn { flex: 1; height: 2.75rem; border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); background: var(--color-training-main); color: var(--color-surface); }
</style>
