<template>
  <main class="pb-24 px-4 pt-6 max-w-lg mx-auto">
    <header class="mb-6">
      <h1 class="typography-title">周期管理</h1>
      <p class="typography-caption mt-1">Candito 6-Week 力量举计划</p>
    </header>

    <template v-if="activeCycle">
      <section class="rounded-[var(--radius-lg)] p-4 mb-6" style="background: var(--color-surface); box-shadow: var(--shadow-elevated);">
        <div class="flex items-center justify-between mb-4">
          <h2 class="typography-subtitle">{{ activeCycle.name }}</h2>
          <span class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium" :style="statusBadgeStyle">{{ statusLabel }}</span>
        </div>

        <div class="mb-4">
          <div class="flex items-baseline justify-between mb-1.5">
            <span class="text-sm font-medium" style="color: var(--color-primary);">{{ progressText }}</span>
            <span class="typography-data" style="font-size: var(--text-sm); color: var(--color-primary-light);">{{ progressPercent }}%</span>
          </div>
          <div class="h-1.5 rounded-full overflow-hidden" style="background: var(--color-primary-subtle);">
            <div class="h-full rounded-full" :style="{ width: progressPercent + '%', background: 'var(--color-training-main)' }"></div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 mb-4">
          <Calendar class="w-3.5 h-3.5 shrink-0" style="color: var(--color-primary-light);" />
          <span class="text-sm truncate" style="color: var(--color-primary-light);">开始日期: {{ formattedStartDate }}</span>
        </div>

        <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          <div v-for="rm in oneRMCards" :key="rm.key" class="flex-1 min-w-0 rounded-[var(--radius-md)] p-2.5 text-center" style="background: var(--color-primary-subtle);">
            <p class="text-xs truncate mb-0.5" style="color: var(--color-primary-light);">{{ rm.name }}</p>
            <p class="typography-data truncate" style="font-size: var(--text-md);">{{ rm.value }}{{ activeCycle.unit }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <template v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'">
            <button class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-md)] text-sm font-medium whitespace-nowrap" style="background: var(--color-primary-subtle); color: var(--color-primary);" @click="goPause">
              <Pause class="w-3.5 h-3.5 shrink-0" />
              暂停周期
            </button>
            <button class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-md)] text-sm font-medium whitespace-nowrap" style="background: var(--color-training-main); color: var(--color-surface);" @click="goOneRM">
              <Dumbbell class="w-3.5 h-3.5 shrink-0" />
              设置1RM
            </button>
          </template>
          <template v-else>
            <button class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-md)] text-sm font-medium whitespace-nowrap" style="background: var(--color-training-main); color: var(--color-surface);" @click="goStart">
              <Dumbbell class="w-3.5 h-3.5 shrink-0" />
              创建新周期
            </button>
          </template>
        </div>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-semibold mb-3 pl-7" style="color: var(--color-primary-light);">训练周进度</h2>

        <div class="relative ml-3.5">
          <div class="absolute left-[7px] top-3 bottom-3 w-px" style="background: var(--color-border);"></div>

          <div v-for="week in weekTimeline" :key="week.weekNumber" class="relative flex items-start gap-3 py-3">
            <div v-if="week.state === 'completed'" class="relative z-10 mt-0.5 w-[15px] h-[15px] rounded-full shrink-0 flex items-center justify-center" style="background: var(--state-success);">
              <Check class="w-2.5 h-2.5 text-white" />
            </div>
            <div v-else-if="week.state === 'in-progress'" class="relative z-10 mt-0.5 w-[15px] h-[15px] rounded-full shrink-0" style="background: var(--color-training-main); box-shadow: 0 0 0 3px var(--state-info-bg);"></div>
            <div v-else class="relative z-10 mt-0.5 w-[15px] h-[15px] rounded-full shrink-0 border-2" style="background: var(--color-surface); border-color: var(--color-border);"></div>

            <div class="flex-1 min-w-0 rounded-[var(--radius-md)] p-3" :style="weekCardStyle(week)">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-sm truncate" :style="{ fontWeight: week.state === 'completed' || week.state === 'in-progress' ? '600' : '400', color: week.state === 'pending' ? 'var(--color-primary-light)' : 'var(--color-primary)' }">W{{ week.weekNumber }} {{ week.theme }}</span>
                <span v-if="week.state === 'completed'" class="text-xs font-medium whitespace-nowrap shrink-0 ml-2" style="color: var(--state-success);">完成</span>
                <span v-else-if="week.state === 'in-progress'" class="text-xs font-medium whitespace-nowrap shrink-0 ml-2" style="color: var(--color-training-main);">进行中</span>
                <span v-else-if="week.weekNumber === 6" class="text-xs whitespace-nowrap shrink-0 ml-2" style="color: var(--state-warning);">等待决策</span>
                <span v-else class="text-xs whitespace-nowrap shrink-0 ml-2" style="color: var(--color-primary-light);">未开始</span>
              </div>
              <div v-if="week.completedDays > 0 || week.totalDays > 0">
                <span class="text-xs" style="color: var(--color-primary-light);">{{ week.completedDays }}/{{ week.totalDays }}天</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeCycle.pauseHistory.length > 0" class="mb-6">
        <button class="flex w-full items-center justify-between rounded-[var(--radius-lg)] p-4" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="showPauseHistory = !showPauseHistory">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 shrink-0" style="color: var(--color-primary-light);" />
            <span class="text-sm font-semibold" style="color: var(--color-primary);">暂停记录</span>
          </div>
          <ChevronDown class="w-4 h-4 shrink-0" :style="{ color: 'var(--color-primary-light)', transform: showPauseHistory ? 'rotate(180deg)' : 'none' }" />
        </button>
        <div v-if="showPauseHistory" class="mt-2 space-y-2">
          <div v-for="pause in activeCycle.pauseHistory" :key="pause.id" class="rounded-[var(--radius-md)] p-3 flex items-center gap-3" style="background: var(--state-warning-bg);">
            <CalendarOff class="w-4 h-4 shrink-0" style="color: var(--state-warning);" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate" style="color: var(--color-primary);">{{ pauseLabel(pause) }}</p>
              <p class="text-xs truncate" style="color: var(--color-primary-light);">{{ pauseRange(pause) }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Historical cycles section — always visible -->
    <section class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="typography-subtitle" style="font-size: var(--text-md);">历史周期</h3>
        <span class="typography-caption">共 {{ historicalCycles.length }} 个</span>
      </div>

      <div v-for="cycle in historicalCycles" :key="cycle.id" class="mb-3 p-4" style="background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); cursor: pointer;" @click="goCycleDetail(cycle)">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5" style="font-size: var(--text-xs); font-weight: var(--font-weight-medium); border-radius: var(--radius-full);" :style="cycle.status === 'completed' ? { color: 'var(--state-success)', background: 'var(--state-success-bg)' } : { color: 'var(--color-primary-light)', background: 'var(--color-primary-subtle)' }">{{ cycle.status === 'completed' ? '已完成' : '已终止' }}</span>
            <span style="font-size: var(--text-base); font-weight: var(--font-weight-medium); color: var(--color-primary);">{{ cycle.name }}</span>
          </div>
          <ChevronRight style="width: 16px; height: 16px; color: var(--color-primary-light);" />
        </div>
        <div class="flex items-center gap-4" style="font-size: var(--text-sm); color: var(--color-primary-light);">
          <span>{{ formatShortDate(cycle.startDate) }} - {{ formatShortDate(cycle.completedAt || cycle.terminatedAt || '') }}</span>
          <span>|</span>
          <span>{{ cycleSubtitle(cycle) }}</span>
        </div>
        <div class="flex items-center gap-3 mt-2" style="font-family: var(--font-mono); font-size: var(--text-sm);">
          <span style="color: var(--color-primary);">深蹲 {{ cycle.oneRM.squat }}</span>
          <span style="color: var(--color-primary);">卧推 {{ cycle.oneRM.bench }}</span>
          <span style="color: var(--color-primary);">硬拉 {{ cycle.oneRM.deadlift }}</span>
          <span style="color: var(--color-primary-light);">{{ cycle.unit }}</span>
        </div>
      </div>

      <div v-if="historicalCycles.length === 0" class="py-8 text-center">
        <p class="typography-caption">暂无历史周期</p>
      </div>
    </section>

    <template v-if="activeCycle">
      <section v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'" class="mb-6">
        <h3 class="typography-subtitle mb-3" style="font-size: var(--text-md);">重新开始</h3>
        <div class="space-y-2">
          <button class="w-full inline-flex items-center justify-between h-11 px-4 rounded-full text-sm font-medium" style="background: var(--color-surface); box-shadow: var(--shadow-card); color: var(--color-primary);" @click="restartCurrent">
            <span class="flex items-center gap-2">
              <RotateCcw class="w-3.5 h-3.5" style="color: var(--color-training-main);" />
              从当前周重新开始
            </span>
            <ChevronRight class="w-4 h-4" style="color: var(--color-primary-light);" />
          </button>
          <button class="w-full inline-flex items-center justify-between h-11 px-4 rounded-full text-sm font-medium" style="background: var(--color-surface); box-shadow: var(--shadow-card); color: var(--color-primary);" @click="showRestartModal = true">
            <span class="flex items-center gap-2">
              <Undo2 class="w-3.5 h-3.5" style="color: var(--color-training-main);" />
              从指定周重新开始 + 调整1RM
            </span>
            <ChevronRight class="w-4 h-4" style="color: var(--color-primary-light);" />
          </button>
        </div>
      </section>

      <section v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'" class="mb-3">
        <button class="w-full inline-flex items-center justify-between h-11 px-4 rounded-full text-sm font-medium" style="background: var(--color-surface); box-shadow: var(--shadow-card); color: var(--color-primary);" @click="goPause">
          <span class="flex items-center gap-2">
            <PauseCircle class="w-3.5 h-3.5" style="color: var(--state-warning);" />
            暂停周期
          </span>
          <div class="flex items-center gap-2">
            <span style="font-size: var(--text-xs); color: var(--color-primary-light);">小长假/出差/受伤</span>
            <ChevronRight class="w-4 h-4" style="color: var(--color-primary-light);" />
          </div>
        </button>
      </section>

      <section v-if="activeCycle.status !== 'terminated' && activeCycle.status !== 'completed'" class="pt-4 mb-2" style="border-top: 1px solid var(--color-border-light);">
        <button class="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-medium whitespace-nowrap" style="color: var(--state-error);" @click="handleTerminate">
          <OctagonX class="w-3.5 h-3.5 shrink-0" />
          终止周期
        </button>
        <p class="text-center mt-2" style="font-size: var(--text-xs); color: var(--color-primary-light);">终止后训练数据保留为只读</p>
      </section>
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">没有活跃的训练周期</p>
        <button class="px-6 py-2 rounded-full" style="background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-sm); font-weight: var(--font-weight-semibold);" @click="goStart">创建训练周期</button>
      </div>
    </template>
  </main>

  <!-- Restart Modal -->
  <Teleport to="body">
    <div v-if="showRestartModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style="background: rgba(0,0,0,0.4);" @click.self="showRestartModal = false">
      <div class="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-6" style="background: var(--color-surface); max-height: 90vh; overflow-y: auto;" @click.stop>
        <h3 class="typography-subtitle mb-4">重新开始 · 指定周</h3>

        <div class="mb-4">
          <p class="text-sm font-medium mb-2" style="color: var(--color-primary-light);">选择起始周</p>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="w in 6"
              :key="w"
              class="w-10 h-10 rounded-full text-sm font-semibold"
              :style="restartWeek === w ? { background: 'var(--color-training-main)', color: 'var(--color-surface)' } : { background: 'var(--color-surface-muted)', color: 'var(--color-primary)' }"
              @click="restartWeek = w"
            >{{ w }}</button>
          </div>
        </div>

        <div class="mb-4">
          <p class="text-sm font-medium mb-2" style="color: var(--color-primary-light);">1RM（可选调整）</p>
          <div class="flex flex-col gap-2">
            <div v-for="lift in restartLifts" :key="lift.key" class="flex items-center gap-3">
              <span class="text-sm w-10" style="color: var(--color-primary);">{{ lift.cn }}</span>
              <input
                v-model.number="restartOneRM[lift.key]"
                type="number"
                step="0.5"
                class="flex-1 rounded-lg px-3 py-2 outline-none text-right"
                style="background: var(--color-surface-muted); font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-primary);"
              />
              <span class="text-xs" style="color: var(--color-primary-light);">{{ activeCycle?.unit || 'kg' }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="flex-1 h-11 rounded-full text-sm font-medium" style="background: var(--color-surface-muted); color: var(--color-primary);" @click="showRestartModal = false">取消</button>
          <button class="flex-1 h-11 rounded-full text-sm font-semibold" style="background: var(--color-training-main); color: var(--color-surface);" @click="confirmRestart">确认重新开始</button>
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
import type { Cycle, PauseRecord, Week, TrainingDay } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()
const recordStore = useRecordStore()

const activeCycle = computed(() => cycleStore.activeCycle)

const showPauseHistory = ref(true)

/* Restart modal */
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

const statusBadgeStyle = computed(() => {
  if (!activeCycle.value) return {}
  const s = activeCycle.value.status
  if (s === 'active' || s === 'week6_pending') {
    return { background: 'var(--state-success-bg)', color: 'var(--state-success)' }
  }
  if (s === 'paused') {
    return { background: 'var(--state-warning-bg)', color: 'var(--state-warning)' }
  }
  return { background: 'var(--color-primary-subtle)', color: 'var(--color-primary-light)' }
})

const currentWeekNumber = computed(() => {
  if (!activeCycle.value) return 1
  const today = getToday()
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === today) {
        return week.weekNumber
      }
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

const progressText = computed(() => {
  if (!activeCycle.value) return ''
  return `第${currentWeekNumber.value}周 / 共6周`
})

const progressPercent = computed(() => {
  return Math.round((completedWeekCount.value / 6) * 100)
})

const formattedStartDate = computed(() => {
  if (!activeCycle.value) return ''
  return formatDateFull(activeCycle.value.startDate)
})

const oneRMCards = computed(() => {
  if (!activeCycle.value) return []
  return [
    { key: 'squat', name: '深蹲', value: activeCycle.value.oneRM.squat },
    { key: 'bench', name: '卧推', value: activeCycle.value.oneRM.bench },
    { key: 'deadlift', name: '硬拉', value: activeCycle.value.oneRM.deadlift },
  ]
})

interface WeekTimelineItem {
  weekNumber: number
  theme: string
  state: 'completed' | 'in-progress' | 'pending'
  completedDays: number
  totalDays: number
}

const weekTimeline = computed<WeekTimelineItem[]>(() => {
  if (!activeCycle.value) return []
  const today = getToday()
  return activeCycle.value.weeks.map((week: Week) => {
    const trainingDays = week.days.filter((d: TrainingDay) => d.type !== 'rest')
    const totalDays = trainingDays.length
    const completedDays = trainingDays.filter((d: TrainingDay) => d.status === 'completed').length

    let state: 'completed' | 'in-progress' | 'pending' = 'pending'
    if (completedDays === totalDays && totalDays > 0) {
      state = 'completed'
    } else if (week.days.some((d: TrainingDay) => d.scheduledDate === today) && completedDays < totalDays) {
      state = 'in-progress'
    } else if (completedDays > 0 && completedDays < totalDays) {
      state = 'in-progress'
    }

    return {
      weekNumber: week.weekNumber,
      theme: week.theme,
      state,
      completedDays,
      totalDays,
    }
  })
})

function weekCardStyle(week: WeekTimelineItem): Record<string, string> {
  if (week.state === 'in-progress') {
    return {
      background: 'var(--state-info-bg)',
      boxShadow: 'var(--shadow-card)',
    }
  }
  return {
    background: 'var(--color-surface)',
    boxShadow: 'var(--shadow-card)',
  }
}

function getCompletedDaysForWeek(weekNumber: number): number {
  if (!activeCycle.value) return 0
  return recordStore.getRecordsForWeek(activeCycle.value.id, weekNumber).length
}

const historicalCycles = computed<Cycle[]>(() => {
  return cycleStore.getCompletedCycles()
})

function pauseLabel(pause: PauseRecord): string {
  const reasonMap: Record<string, string> = {
    holiday: '假期',
    travel: '出差',
    injury: '受伤',
    other: '其他',
  }
  return pause.customReason || reasonMap[pause.reason] || '暂停'
}

function pauseRange(pause: PauseRecord): string {
  const start = formatShortDate(pause.pausedAt)
  const end = pause.resumedAt ? formatShortDate(pause.resumedAt) : '进行中'
  const days = pause.daysShifted || 0
  return `${start}-${end} (${days}天) → 顺延`
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '--'
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length < 3) return dateStr
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`
}

function cycleSubtitle(cycle: Cycle): string {
  if (cycle.status === 'completed') {
    const weeksDone = cycle.weeks.filter((w: Week) =>
      w.days.filter((d: TrainingDay) => d.type !== 'rest').every((d: TrainingDay) => d.status === 'completed')
    ).length
    return `${weeksDone}周完成`
  }
  if (cycle.status === 'terminated') {
    const lastWeek = [...cycle.weeks].reverse().find((w: Week) =>
      w.days.some((d: TrainingDay) => d.status === 'completed')
    )
    const weekNum = lastWeek?.weekNumber || 0
    const reason = cycle.terminateReason ? ` · ${cycle.terminateReason}` : '因伤终止'
    return `完成至第${weekNum}周${reason}`
  }
  return ''
}

function goPause(): void {
  router.push({ name: 'pause' })
}

function goOneRM(): void {
  router.push({ name: '1rm' })
}

function goStart(): void {
  router.push('/start')
}

function goCycleDetail(cycle: Cycle): void {
  router.push({ path: '/plan', query: { cycleId: cycle.id } })
}

function restartCurrent(): void {
  if (!activeCycle.value) return
  const cycle = activeCycle.value
  const data = createCycle({
    oneRM: cycle.oneRM,
    unit: cycle.unit,
    weightRounding: cycle.weightRounding,
    startDate: getToday(),
    assistanceConfig: cycle.assistanceConfig,
  })
  cycleStore.updateCycle(cycle.id, {
    status: 'completed',
    completedAt: getToday(),
  })
  cycleStore.addCycle(data as any)
  router.push('/today')
}

function confirmRestart(): void {
  if (!activeCycle.value) return
  const cycle = activeCycle.value
  const data = createCycle({
    oneRM: { squat: restartOneRM.squat, bench: restartOneRM.bench, deadlift: restartOneRM.deadlift },
    unit: cycle.unit,
    weightRounding: cycle.weightRounding,
    startDate: getToday(),
    assistanceConfig: cycle.assistanceConfig,
  })
  cycleStore.updateCycle(cycle.id, {
    status: 'completed',
    completedAt: getToday(),
  })
  cycleStore.addCycle(data as any)
  showRestartModal.value = false
  router.push('/today')
}

function handleTerminate(): void {
  if (!activeCycle.value) return
  if (confirm('确定要终止当前周期吗？终止后训练数据保留为只读。')) {
    cycleStore.updateCycle(activeCycle.value.id, {
      status: 'terminated',
      terminatedAt: getToday(),
      terminateReason: '因伤终止',
    })
    cycleStore.setActiveCycle('')
  }
}
</script>
