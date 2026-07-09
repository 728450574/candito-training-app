<template>
  <main class="pb-[100px] max-w-lg mx-auto px-4">
    <div class="h-11"></div>

    <!-- ========== No Active Cycle ========== -->
    <template v-if="!activeCycle">
      <section class="px-5 pt-8 pb-4 text-center">
        <div
          class="flex items-center justify-center w-16 h-16 mx-auto rounded-full"
          style="background: var(--color-training-main); opacity: 0.1;"
        >
          <i data-lucide="dumbbell" style="width: 28px; height: 28px; color: var(--color-training-main);"></i>
        </div>
        <h1 class="typography-title mt-5">还没有训练周期</h1>
        <p class="typography-caption mt-2" style="color: var(--color-primary-light);">
          开始你的第一个 Candito 6周训练计划
        </p>
        <button
          class="mt-8 w-full flex items-center justify-center h-12 rounded-full font-semibold"
          style="background: var(--color-training-main); color: var(--color-surface); font-size: var(--text-md);"
          @click="goStart"
        >
          创建训练周期
        </button>
      </section>
    </template>

    <!-- ========== Has Active Cycle ========== -->
    <template v-else-if="pageState === 'paused'">
      <section class="px-5 pt-8 pb-4">
        <p class="typography-caption">{{ greetingDate }}</p>
        <h1 class="typography-title mt-1">周期已暂停</h1>
      </section>
      <section class="px-5">
        <div class="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5" style="box-shadow: var(--shadow-elevated);">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-full" style="background: var(--state-warning-bg);">
              <i data-lucide="pause" style="width: 20px; height: 20px; color: var(--state-warning);"></i>
            </div>
            <div>
              <h2 class="typography-subtitle" style="font-size: var(--text-lg);">当前训练周期已暂停</h2>
              <p style="font-size: var(--text-sm); color: var(--color-primary-light);">恢复后即可继续训练</p>
            </div>
          </div>
          <div class="pt-3" style="border-top: 1px solid var(--color-border-light);">
            <button class="w-full flex items-center justify-center h-11 rounded-full font-semibold" style="background: var(--color-surface-muted); color: var(--color-primary); font-size: var(--text-sm);" @click="goCycle">
              <i data-lucide="settings" style="width: 16px; height: 16px; margin-right: 6px;"></i>
              前往周期管理
            </button>
          </div>
        </div>
      </section>
      <section class="px-5 mt-6">
        <div class="flex gap-3">
          <button class="flex-1 rounded-lg p-3 text-center" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="goWeight">
            <i data-lucide="scale" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
            <p style="font-size: var(--text-xs); color: var(--color-primary);">记录体重</p>
          </button>
          <button class="flex-1 rounded-lg p-3 text-center" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="goStats">
            <i data-lucide="bar-chart-3" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
            <p style="font-size: var(--text-xs); color: var(--color-primary);">查看统计</p>
          </button>
          <button class="flex-1 rounded-lg p-3 text-center" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="goCycle">
            <i data-lucide="list" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
            <p style="font-size: var(--text-xs); color: var(--color-primary);">周期管理</p>
          </button>
        </div>
      </section>
    </template>

    <template v-else>
      <!-- ========== STATE 3: Rest Day ========== -->
      <template v-if="pageState === 'rest'">
        <section class="px-5">
          <div class="pb-4">
            <h1 class="typography-title">今天是休息日</h1>
            <p class="typography-caption mt-1.5" style="color: var(--color-primary-light);">
              充分休息，为下次训练做好准备
            </p>
          </div>

          <div
            class="rounded-[var(--radius-lg)] border-l-[3px] border-l-[var(--color-training-main)] bg-[var(--color-surface)] p-5"
            style="box-shadow: var(--shadow-elevated);"
          >
            <template v-if="nextTrainingDay">
              <p class="typography-caption mb-3">下次训练</p>
              <h2 class="typography-subtitle mb-1">
                {{ workoutTypeLabel(nextTrainingDay.type) }} · W{{ nextTrainingDay.weekNumber }}D{{ nextTrainingDay.dayNumber }}
              </h2>
              <p class="typography-caption mb-5">{{ formatDateDisplay(nextTrainingDay.scheduledDate) }}</p>
              <p
                class="mb-5"
                style="font-family: var(--font-mono); font-size: 2.25rem; font-weight: var(--font-weight-bold); color: var(--color-training-main); letter-spacing: -0.02em; line-height: var(--leading-tight);"
              >
                还有 {{ countdownDays }} 天
              </p>
              <div class="pt-4 border-t" style="border-color: var(--color-border-light);">
                <p class="typography-caption mb-2">训练内容</p>
                <ul class="space-y-2">
                  <li
                    v-for="ex in nextTrainingDay.exercises"
                    :key="ex.id"
                    class="flex items-center gap-2"
                  >
                    <span
                      class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full shrink-0"
                      :style="{ backgroundColor: ex.type === 'optional' ? 'var(--color-training-optional)' : 'var(--color-training-main)' }"
                    ></span>
                    <span class="typography-body truncate">{{ ex.name }}</span>
                  </li>
                </ul>
              </div>
            </template>
            <template v-else>
              <p class="typography-caption">没有安排训练</p>
            </template>
          </div>
        </section>

        <section class="px-5 mt-6">
          <div class="flex gap-3">
            <button
              class="flex-1 rounded-lg p-3 text-center"
              style="background: var(--color-surface); box-shadow: var(--shadow-card);"
              @click="goWeight"
            >
              <i data-lucide="scale" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
              <p style="font-size: var(--text-xs); color: var(--color-primary);">记录体重</p>
            </button>
            <button
              class="flex-1 rounded-lg p-3 text-center"
              style="background: var(--color-surface); box-shadow: var(--shadow-card);"
              @click="goStats"
            >
              <i data-lucide="bar-chart-3" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
              <p style="font-size: var(--text-xs); color: var(--color-primary);">查看统计</p>
            </button>
            <button
              class="flex-1 rounded-lg p-3 text-center"
              style="background: var(--color-surface); box-shadow: var(--shadow-card);"
              @click="goPlan"
            >
              <i data-lucide="pen-line" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
              <p style="font-size: var(--text-xs); color: var(--color-primary);">训练笔记</p>
            </button>
          </div>
        </section>
      </template>

      <!-- ========== STATE 1: Training Day - Not Yet Done ========== -->
      <template v-else-if="pageState === 'pending'">
        <section class="px-5 pt-2 pb-4">
          <p class="typography-caption">{{ greetingDate }}</p>
          <h1 class="typography-title mt-1">准备好了吗？</h1>
        </section>

        <section class="px-5">
          <div
            class="rounded-[var(--radius-lg)] border-l-[3px] border-l-[var(--color-warm)] bg-[var(--color-surface)] p-5"
            style="box-shadow: var(--shadow-elevated);"
          >
            <div class="flex items-center justify-between mb-4">
              <span
                class="inline-flex items-center rounded-[var(--radius-sm)] px-2.5 py-1"
                style="background: var(--color-primary-subtle); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); font-family: var(--font-sans);"
              >
                第{{ todayDayInfo.weekNumber }}周 · {{ todayDayInfo.weekTheme }}
              </span>
              <span class="typography-caption flex items-center gap-1">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                预计 {{ estimatedDuration }} 分钟
              </span>
            </div>
            <h2 class="typography-subtitle mb-4">{{ workoutTypeLabel(todayDayInfo.type) }}</h2>
            <ul class="space-y-3 mb-6">
              <li
                v-for="ex in todayDayInfo.exercises"
                :key="ex.id"
                class="flex items-center gap-3"
              >
                <span
                  class="inline-flex items-center justify-center w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: ex.type === 'optional' ? 'var(--color-training-optional)' : 'var(--color-training-main)' }"
                ></span>
                <span class="typography-body truncate">{{ ex.name }}</span>
              </li>
            </ul>
            <button
              class="w-full flex items-center justify-center rounded-[var(--radius-full)] px-6 py-3.5 font-semibold"
              style="background-color: var(--color-training-main); color: var(--color-surface); font-family: var(--font-sans); font-size: var(--text-md);"
              @click="goExecute"
            >
              开始训练
            </button>
          </div>
        </section>

        <section class="px-5 mt-6">
          <div
            class="flex items-stretch rounded-[var(--radius-lg)] overflow-hidden"
            style="box-shadow: var(--shadow-card);"
          >
            <div class="flex-1 flex flex-col items-center justify-center py-4 px-3">
              <span
                class="whitespace-nowrap"
                style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);"
              >
                {{ weekCompletedCount }}<span style="color: var(--color-primary-light);">/{{ weekTotalDays }}</span>
              </span>
              <span class="typography-caption mt-1">本周完成</span>
            </div>
            <div class="w-px self-stretch" style="background: var(--color-border);"></div>
            <div class="flex-1 flex flex-col items-center justify-center py-4 px-3">
              <span
                class="whitespace-nowrap"
                style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);"
              >
                {{ todayDayInfo.weekNumber }}<span style="color: var(--color-primary-light);">/6</span>
              </span>
              <span class="typography-caption mt-1">当前周期</span>
            </div>
            <div class="w-px self-stretch" style="background: var(--color-border);"></div>
            <div class="flex-1 flex flex-col items-center justify-center py-4 px-3">
              <span
                class="whitespace-nowrap"
                style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-training-main);"
              >
                {{ streakDays }}<span class="typography-caption" style="font-size: var(--text-sm);">天</span>
              </span>
              <span class="typography-caption mt-1">连续训练</span>
            </div>
          </div>
        </section>

        <div v-if="todayDayInfo.weekNumber === 6" class="flex justify-center mt-4">
          <button
            class="inline-flex items-center gap-1.5"
            style="font-size: var(--text-sm); color: var(--color-training-main);"
            @click="goWeek6"
          >
            <i data-lucide="trophy" style="width: 14px; height: 14px;"></i>
            第6周决策
          </button>
        </div>

        <div class="flex justify-center mt-2">
          <button
            class="inline-flex items-center gap-1.5"
            style="font-size: var(--text-sm); color: var(--color-primary-light);"
            @click="handleSkipTraining"
          >
            <i data-lucide="skip-forward" style="width: 14px; height: 14px;"></i>
            跳过本次训练
          </button>
        </div>

        <div class="flex justify-center mt-1">
          <button
            class="inline-flex items-center gap-1.5"
            style="font-size: var(--text-sm); color: var(--state-warning);"
            @click="goMissed"
          >
            <i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i>
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
          <div class="rounded-[var(--radius-lg)] border-l-[3px] border-l-[var(--color-primary-light)] bg-[var(--color-surface)] p-5" style="box-shadow: var(--shadow-elevated);">
            <div class="flex items-center gap-3 mb-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-full" style="background: var(--color-primary-subtle);">
                <i data-lucide="skip-forward" style="width: 20px; height: 20px; color: var(--color-primary-light);"></i>
              </div>
              <div>
                <h2 class="typography-subtitle" style="font-size: var(--text-lg);">本次训练已跳过</h2>
                <p style="font-size: var(--text-sm); color: var(--color-primary-light);">{{ workoutTypeLabel(todayDayInfo.type) }} · W{{ todayDayInfo.weekNumber }}D{{ todayDayInfo.dayNumber }}</p>
              </div>
            </div>
            <div class="pt-3" style="border-top: 1px solid var(--color-border-light);">
              <p class="typography-caption" style="font-size: var(--text-xs);">已标记为跳过，不会影响后续训练计划</p>
            </div>
          </div>
        </section>
        <section class="px-5 mt-6">
          <div class="flex gap-3">
            <button class="flex-1 rounded-lg p-3 text-center" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="goWeight">
              <i data-lucide="scale" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
              <p style="font-size: var(--text-xs); color: var(--color-primary);">记录体重</p>
            </button>
            <button class="flex-1 rounded-lg p-3 text-center" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="goStats">
              <i data-lucide="bar-chart-3" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
              <p style="font-size: var(--text-xs); color: var(--color-primary);">查看统计</p>
            </button>
            <button class="flex-1 rounded-lg p-3 text-center" style="background: var(--color-surface); box-shadow: var(--shadow-card);" @click="goPlan">
              <i data-lucide="pen-line" style="width: 18px; height: 18px; color: var(--color-training-main); margin-bottom: 4px;"></i>
              <p style="font-size: var(--text-xs); color: var(--color-primary);">训练计划</p>
            </button>
          </div>
        </section>
      </template>

      <!-- ========== STATE 2: Training Day - Completed ========== -->
      <template v-else>
        <section class="px-5">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full"
              style="background: var(--state-success-bg);"
            >
              <i data-lucide="check" style="width: 20px; height: 20px; color: var(--state-success);"></i>
            </div>
            <div>
              <h2 class="typography-subtitle" style="font-size: var(--text-lg);">今日训练已完成</h2>
              <p style="font-size: var(--text-sm); color: var(--color-primary-light);">
                {{ completedInfo }}
              </p>
            </div>
          </div>

          <div
            class="rounded-xl p-5 mb-4"
            style="background: var(--color-surface); box-shadow: var(--shadow-elevated);"
          >
            <div class="flex items-center justify-between mb-3">
              <span
                style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);"
              >
                本次训练数据
              </span>
              <button
                class="inline-flex items-center gap-1"
                style="font-size: var(--text-xs); color: var(--color-training-main);"
                @click="goDetail"
              >
                查看详情
                <i data-lucide="chevron-right" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
            <div
              class="flex items-stretch divide-x"
              style="border-color: var(--color-border-light);"
            >
              <div class="flex-1 flex flex-col items-center py-2">
                <span
                  style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);"
                >
                  {{ totalVolume }}
                </span>
                <span style="font-size: var(--text-xs); color: var(--color-primary-light);">总容量 kg</span>
              </div>
              <div class="flex-1 flex flex-col items-center py-2">
                <span
                  style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);"
                >
                  {{ totalCompletedSets }}
                </span>
                <span style="font-size: var(--text-xs); color: var(--color-primary-light);">总组数</span>
              </div>
              <div class="flex-1 flex flex-col items-center py-2">
                <span
                  style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);"
                >
                  {{ durationMinutes }}
                </span>
                <span style="font-size: var(--text-xs); color: var(--color-primary-light);">分钟</span>
              </div>
            </div>
            <div
              class="flex items-center gap-2 mt-3 pt-3"
              style="border-top: 1px solid var(--color-border-light);"
            >
              <span style="font-size: var(--text-xs); color: var(--color-primary-light);">训练感受</span>
              <span style="font-size: var(--text-sm); color: var(--color-primary);">
                {{ feelingStars }} {{ feelingLabel }}
              </span>
            </div>
          </div>

          <div class="space-y-2">
            <div
              class="flex items-center justify-between rounded-lg p-3"
              style="background: var(--color-surface-muted);"
            >
              <span style="font-size: var(--text-sm); color: var(--color-primary);">记录今日体重</span>
              <span
                style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-training-main);"
              >
                {{ bodyWeightDisplay || '--' }}
              </span>
            </div>
          </div>

          <button
            v-if="nextTrainingDay"
            class="w-full rounded-xl p-4 mt-4 text-left"
            style="background: var(--color-surface); box-shadow: var(--shadow-card);"
            @click="goPlan"
          >
            <div class="flex items-center justify-between mb-2">
              <span style="font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-primary);">下次训练</span>
              <span style="font-size: var(--text-xs); color: var(--color-training-main);">明天</span>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <span style="font-size: var(--text-base); font-weight: var(--font-weight-medium); color: var(--color-primary);">
                  {{ workoutTypeLabel(nextTrainingDay.type) }} · W{{ nextTrainingDay.weekNumber }}D{{ nextTrainingDay.dayNumber }}
                </span>
                <p style="font-size: var(--text-xs); color: var(--color-primary-light); margin-top: 2px;">
                  {{ formatDateDisplay(nextTrainingDay.scheduledDate) }} · 预计 {{ estimateDuration(nextTrainingDay.exercises) }} 分钟
                </p>
              </div>
              <i data-lucide="chevron-right" style="width: 16px; height: 16px; color: var(--color-primary-light);"></i>
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

function goStart() {
  router.push('/start')
}

function goExecute() {
  if (!todayDayInfo.value || !activeCycle.value) return
  router.push({
    name: 'training-execute',
    query: {
      week: todayDayInfo.value.weekNumber,
      day: todayDayInfo.value.dayNumber,
      cycleId: activeCycle.value.id,
    },
  })
}

function goDetail() {
  if (!todayDayInfo.value) return
  router.push({
    name: 'training-detail',
    query: {
      week: todayDayInfo.value.weekNumber,
      day: todayDayInfo.value.dayNumber,
    },
  })
}

function goWeek6() {
  router.push({ name: 'week6' })
}

function goMissed() {
  router.push({ name: 'missed' })
}

function goWeight() {
  router.push({ name: 'weight' })
}

function goCycle() {
  router.push('/cycle')
}

function goStats() {
  router.push({ name: 'stats' })
}

function goPlan() {
  router.push({ name: 'plan' })
}

function handleSkipTraining() {
  if (!activeCycle.value || !todayDayInfo.value) return
  const updatedWeeks = activeCycle.value.weeks.map(week => {
    if (week.weekNumber !== todayDayInfo.value!.weekNumber) return week
    return {
      ...week,
      days: week.days.map(day => {
        if (day.dayNumber !== todayDayInfo.value!.dayNumber) return day
        return { ...day, status: 'skipped' as const }
      }),
    }
  })
  cycleStore.updateCycle(activeCycle.value.id, { weeks: updatedWeeks })
}

watch(
  () => route.path,
  () => {
    setTimeout(() => {
      createIcons({ icons })
    }, 50)
  },
  { immediate: true }
)
</script>
