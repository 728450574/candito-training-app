<template>
  <main class="pb-8 max-w-lg mx-auto px-4">
    <div class="h-11"></div>

    <header class="flex items-center h-11 px-1 mb-2">
      <button class="inline-flex items-center justify-center w-8 h-8 -ml-1 back-btn" aria-label="返回" @click="router.back()">
        <ChevronLeft class="w-5 h-5" />
      </button>
      <h1 class="flex-1 text-center font-semibold truncate header-title">暂停周期</h1>
      <div class="w-8"></div>
    </header>

    <template v-if="!activeCycle">
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <p class="typography-caption mb-4">没有活跃的训练周期</p>
      </div>
    </template>

    <template v-else>
      <section class="px-1 mt-2 mb-5">
        <div class="rounded-[var(--radius-lg)] px-4 py-3 progress-box">
          <p class="truncate progress-label">当前进度</p>
          <p class="font-semibold truncate mt-0.5 progress-value">{{ progressLabel }}</p>
        </div>
      </section>

      <section class="px-1 mb-5">
        <p class="px-3 mb-2 font-medium section-label">暂停原因</p>
        <div class="rounded-[var(--radius-lg)] overflow-hidden option-card">
          <button
            v-for="(opt, idx) in reasonOptions"
            :key="opt.value"
            class="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            :class="{
              'reason-option-separator': idx < reasonOptions.length - 1,
              'reason-option-selected': selectedReason === opt.value
            }"
            @click="selectedReason = opt.value"
          >
            <component :is="opt.icon" class="w-5 h-5 shrink-0 option-icon" />
            <span class="flex-1 truncate option-label">{{ opt.label }}</span>
            <Check v-if="selectedReason === opt.value" class="w-5 h-5 shrink-0 option-check" />
          </button>
        </div>
      </section>

      <section v-if="selectedReason === 'other'" class="px-1 mb-5">
        <div class="rounded-[var(--radius-lg)] px-4 py-3 option-card">
          <input
            v-model="customReason"
            type="text"
            placeholder="请输入暂停原因（选填）"
            class="w-full outline-none bg-transparent custom-reason-input"
          >
        </div>
      </section>

      <section class="px-1 mb-5">
        <p class="px-3 mb-2 font-medium section-label">预计暂停时长</p>

        <div class="flex gap-2 mb-3 px-1">
          <button
            v-for="opt in durationOptions"
            :key="opt.value"
            class="flex-1 rounded-[var(--radius-lg)] py-2.5 text-center font-medium transition-colors"
            :class="selectedDuration === opt.value ? 'duration-btn-selected' : 'duration-btn-unselected'"
            @click="selectedDuration = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <div v-if="selectedDuration === 'custom'" class="px-1">
          <div class="flex items-center gap-3 rounded-[var(--radius-lg)] p-3 option-card">
            <div class="flex-1 text-center">
              <p class="date-col-label">开始</p>
              <p class="font-semibold mt-0.5 date-col-value">{{ customStartDate }}</p>
            </div>
            <ArrowRight class="w-4 h-4 shrink-0 date-arrow" />
            <div class="flex-1 text-center">
              <p class="date-col-label">结束</p>
              <p class="font-semibold mt-0.5 date-col-value">{{ customEndDate }}</p>
            </div>
          </div>
        </div>

        <div class="px-1 mt-3 text-center">
          <p class="total-days">共 {{ totalDaysNum }} 天</p>
        </div>
      </section>

      <section class="px-1 mb-8">
        <div class="rounded-[var(--radius-lg)] p-4 option-card">
          <p class="font-semibold mb-3 affected-title">受影响训练: {{ affectedDays.length }}个训练日</p>
          <div class="space-y-2">
            <div v-for="day in affectedDays" :key="day.key" class="flex items-center gap-3 py-1.5">
              <span class="inline-flex items-center shrink-0 rounded-[var(--radius-sm)] px-2 py-0.5 font-medium whitespace-nowrap affected-badge">{{ day.label }}</span>
              <span class="flex-1 truncate affected-date">{{ day.date }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="px-1 mb-4">
        <button
          class="w-full flex items-center justify-center rounded-[var(--radius-full)] px-6 py-3.5 font-semibold confirm-btn"
          @click="handleConfirm"
        >
          确认暂停
        </button>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Calendar, Briefcase, HeartPulse, MoreHorizontal, Check, ArrowRight } from 'lucide-vue-next'
import { useCycleStore } from '@/stores/cycleStore'
import { getToday, addDays, formatDate } from '@/services/dateService'
import type { PauseRecord, TrainingDay } from '@/types/cycle'

const router = useRouter()
const cycleStore = useCycleStore()

const activeCycle = computed(() => cycleStore.activeCycle)

const todayStr = getToday()

const currentWeekDay = computed(() => {
  if (!activeCycle.value) return null
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.scheduledDate === todayStr) {
        return { weekNumber: week.weekNumber, dayNumber: day.dayNumber, type: day.type, day }
      }
    }
  }
  for (const week of activeCycle.value.weeks) {
    const pending = week.days.find(d => d.status === 'pending' && d.type !== 'rest')
    if (pending) {
      return { weekNumber: week.weekNumber, dayNumber: pending.dayNumber, type: pending.type, day: pending }
    }
  }
  return null
})

const progressLabel = computed(() => {
  if (!currentWeekDay.value) return ''
  const typeLabel = currentWeekDay.value.type === 'lower' ? '下肢训练' : '上肢训练'
  return `第${currentWeekDay.value.weekNumber}周 · Day${currentWeekDay.value.dayNumber} · ${typeLabel}`
})

const reasonOptions = [
  { value: 'holiday', label: '小长假 / 假期', icon: Calendar },
  { value: 'travel', label: '出差 / 旅行', icon: Briefcase },
  { value: 'injury', label: '身体不适 / 受伤', icon: HeartPulse },
  { value: 'other', label: '其他', icon: MoreHorizontal },
] as const

const selectedReason = ref<string | null>(null)
const customReason = ref('')

const durationOptions = [
  { value: '3', label: '3天' },
  { value: '5', label: '5天' },
  { value: '7', label: '7天' },
  { value: 'custom', label: '自定义' },
]

const selectedDuration = ref('5')

const customStartDate = ref(todayStr)
const customEndDate = ref(addDays(todayStr, 4))

const totalDaysNum = computed(() => {
  if (selectedDuration.value === 'custom') {
    const diff = Math.round(
      (new Date(customEndDate.value + 'T00:00:00').getTime() - new Date(customStartDate.value + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
    return Math.max(1, diff)
  }
  return parseInt(selectedDuration.value)
})

interface AffectedDay {
  key: string
  label: string
  date: string
}

const affectedDays = computed<AffectedDay[]>(() => {
  if (!activeCycle.value) return []
  const days: AffectedDay[] = []
  const pauseEnd = addDays(todayStr, totalDaysNum.value - 1)
  for (const week of activeCycle.value.weeks) {
    for (const day of week.days) {
      if (day.type === 'rest') continue
      if (day.scheduledDate >= todayStr && day.scheduledDate <= pauseEnd && day.status === 'pending') {
        days.push({
          key: `W${week.weekNumber}D${day.dayNumber}`,
          label: `W${week.weekNumber}D${day.dayNumber}`,
          date: formatDate(day.scheduledDate),
        })
      }
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date))
})

function handleConfirm(): void {
  if (!activeCycle.value || !currentWeekDay.value) return
  if (!selectedReason.value) return

  const pauseRecord: PauseRecord = {
    id: Date.now().toString(36),
    pausedAt: todayStr,
    pausedWeek: currentWeekDay.value.weekNumber,
    pausedDay: currentWeekDay.value.dayNumber,
    reason: selectedReason.value as PauseRecord['reason'],
    customReason: selectedReason.value === 'other' ? customReason.value : undefined,
    daysShifted: totalDaysNum.value,
    resumeOption: 'postpone',
  }

  const updatedPauseHistory = [...activeCycle.value.pauseHistory, pauseRecord]

  // Update scheduledDate for all future training days (postpone by shiftDays)
  const shiftDays = totalDaysNum.value
  const updatedWeeks = activeCycle.value.weeks.map(week => ({
    ...week,
    days: week.days.map(day => {
      if (day.status === 'pending' && day.scheduledDate >= todayStr) {
        const newDate = addDays(day.scheduledDate, shiftDays)
        return { ...day, scheduledDate: newDate }
      }
      return day
    })
  }))

  cycleStore.updateCycle(activeCycle.value.id, {
    isPaused: true,
    currentPause: pauseRecord,
    pauseHistory: updatedPauseHistory,
    weeks: updatedWeeks,
  })

  router.back()
}
</script>

<style scoped>
/* ===== 顶部导航栏 ===== */
.back-btn {
  color: var(--color-training-main);
}

.header-title {
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--color-primary);
}

/* ===== 当前进度区域 ===== */
.progress-box {
  background: var(--color-surface-muted);
}

.progress-label {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

.progress-value {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-primary);
}

/* ===== 分区标签 ===== */
.section-label {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-primary-light);
}

/* ===== 通用选项卡片 ===== */
.option-card {
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

/* ===== 暂停原因选项 ===== */
.reason-option-separator {
  border-color: var(--color-border-light);
  border-bottom-width: 1px;
}

.reason-option-selected {
  background: var(--state-info-bg);
}

.option-icon {
  color: var(--color-primary-light);
}

.option-label {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-primary);
}

.option-check {
  color: var(--color-training-main);
}

/* ===== 自定义原因输入 ===== */
.custom-reason-input {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-primary);
}

/* ===== 暂停时长按钮 ===== */
.duration-btn-selected {
  color: var(--color-surface);
  background: var(--color-training-main);
  box-shadow: none;
}

.duration-btn-unselected {
  color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

/* ===== 自定义日期列 ===== */
.date-col-label {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--color-primary-light);
}

.date-col-value {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-primary);
}

.date-arrow {
  color: var(--color-primary-light);
}

/* ===== 总天数显示 ===== */
.total-days {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-training-main);
}

/* ===== 受影响训练日 ===== */
.affected-title {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-primary);
}

.affected-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-training-main);
  background: var(--state-info-bg);
}

.affected-date {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-primary);
}

/* ===== 确认暂停按钮 ===== */
.confirm-btn {
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--color-surface);
  background-color: var(--color-training-main);
}
</style>
