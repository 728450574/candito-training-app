// 进度统计页 — tab
// 迁移自 ProgressStats.vue
// 业务逻辑 1:1 等价：周期筛选 + 概览卡 + 1RM 趋势图 + 每周完成 + 体重趋势
// 适配：
//   - recordStore 为异步 API（await getRecordsForCycle）
//   - SVG 图表改用 stat-chart 组件（canvas 2d，绘制逻辑由组件负责）
//   - 星级评分 SVG 改用 ★/☆ 字符串

import { cycleStore } from '../../stores/cycleStore'
import { recordStore } from '../../stores/recordStore'
import { bodyMetricStore } from '../../stores/bodyMetricStore'
import {
  calculateTotalVolume,
  getAverageFeeling,
  get1rmTrend,
  calculateWeeklyCompletion,
} from '../../services/statsService'
import { formatDate } from '../../services/dateService'
import type { Cycle } from '../../types/cycle'
import type { WorkoutRecord } from '../../types/record'

type PeriodKey = 'current' | 'history' | 'all'

interface PeriodOption {
  key: PeriodKey
  label: string
}

interface ChartPoint {
  label: string
  value: number
}

interface ChartSeries {
  name: string
  color: string
  points: ChartPoint[]
}

interface WeekCompletionDisplay {
  weekNumber: number
  completed: number
  total: number
  percent: number
  isInProgress: boolean
  isLast: boolean
  dumbbells: string[]
  showDumbbells: boolean
}

const DUMBBELL_COLORS = [
  'var(--color-training-main)',
  'var(--color-training-assist)',
  'var(--color-warm)',
]

Page({
  data: {
    periodOptions: [
      { key: 'current', label: '本周期' },
      { key: 'history', label: '历史' },
      { key: 'all', label: '全部' },
    ] as PeriodOption[],
    selectedPeriod: 'current' as PeriodKey,
    cycleWeeksCount: '--' as string | number,
    totalSessions: 0,
    formattedVolume: '0',
    averageFeeling: '0.0',
    feelingStars: '☆☆☆☆☆',
    rmTrendSeries: [] as ChartSeries[],
    rmTrendCategories: [] as string[],
    rmTrendYMin: 80,
    rmTrendYMax: 120,
    weeklyCompletion: [] as WeekCompletionDisplay[],
    weightSeries: [] as ChartSeries[],
    weightYMin: 80,
    weightYMax: 85,
    latestWeight: '--',
    latestWeightDate: '--',
    hasWeightData: false,
  },

  unsubCycle: null as null | (() => void),
  unsubRecord: null as null | (() => void),
  unsubBodyMetric: null as null | (() => void),

  onLoad() {
    this.unsubCycle = cycleStore.subscribe(() => { void this.refresh() })
    this.unsubRecord = recordStore.subscribe(() => { void this.refresh() })
    this.unsubBodyMetric = bodyMetricStore.subscribe(() => { void this.refresh() })
    void this.refresh()
  },

  onShow() {
    void this.refresh()
  },

  onUnload() {
    this.unsubCycle?.()
    this.unsubRecord?.()
    this.unsubBodyMetric?.()
  },

  async refresh() {
    const activeCycle = cycleStore.getActiveCycle()
    const completedCycles = cycleStore.getCompletedCycles()
    const allCycles = cycleStore.getCycles()
    const period = this.data.selectedPeriod

    // 根据周期筛选确定相关周期
    let relevantCycles: Cycle[]
    if (period === 'current') {
      relevantCycles = activeCycle ? [activeCycle] : []
    } else if (period === 'history') {
      relevantCycles = completedCycles
    } else {
      relevantCycles = allCycles
    }

    // 异步获取每个周期的训练记录
    const recordsByCycle: Record<string, WorkoutRecord[]> = {}
    for (const c of relevantCycles) {
      recordsByCycle[c.id] = await recordStore.getRecordsForCycle(c.id)
    }

    // 汇总所有记录
    const allRecords: WorkoutRecord[] = []
    for (const c of relevantCycles) {
      allRecords.push(...(recordsByCycle[c.id] ?? []))
    }

    // 概览统计
    const totalSessions = allRecords.length
    const totalVolume = calculateTotalVolume(allRecords)
    const formattedVolume = totalVolume.toLocaleString()
    const avgFeeling = getAverageFeeling(allRecords)
    const averageFeeling = avgFeeling.toFixed(1)
    const filledCount = Math.round(avgFeeling)
    const feelingStars = '★'.repeat(filledCount) + '☆'.repeat(5 - filledCount)

    // 头部周期周数
    const cycleWeeksCount: string | number = activeCycle ? activeCycle.weeks.length : '--'

    // 1RM 趋势
    const rmTrend = get1rmTrend(relevantCycles, recordsByCycle)
    const rmTrendSeries: ChartSeries[] = [
      {
        name: '深蹲',
        color: '#0A84FF',
        points: rmTrend.squat.map((p) => ({ label: p.cycleName, value: p.value })),
      },
      {
        name: '卧推',
        color: '#5E5CE6',
        points: rmTrend.bench.map((p) => ({ label: p.cycleName, value: p.value })),
      },
      {
        name: '硬拉',
        color: '#FF6B35',
        points: rmTrend.deadlift.map((p) => ({ label: p.cycleName, value: p.value })),
      },
    ]
    const rmTrendCategories = relevantCycles.map((c, i) => c.name || `C${i + 1}`)

    // 1RM Y 轴范围
    const all1RMValues: number[] = []
    for (const arr of [rmTrend.squat, rmTrend.bench, rmTrend.deadlift]) {
      for (const pt of arr) all1RMValues.push(pt.value)
    }
    let rmTrendYMin = 80
    let rmTrendYMax = 120
    if (all1RMValues.length > 0) {
      rmTrendYMax = Math.ceil(Math.max(...all1RMValues) / 10) * 10
      rmTrendYMin = Math.floor(Math.min(...all1RMValues) / 10) * 10
    }

    // 每周完成情况
    let weeklyCycle: Cycle | null = null
    if (period === 'current') {
      weeklyCycle = activeCycle
    } else if (period === 'history') {
      weeklyCycle = completedCycles.length > 0 ? completedCycles[completedCycles.length - 1] : null
    } else {
      weeklyCycle = allCycles.length > 0 ? allCycles[allCycles.length - 1] : null
    }

    let weeklyCompletion: WeekCompletionDisplay[] = []
    if (weeklyCycle) {
      const completion = calculateWeeklyCompletion(weeklyCycle)
      weeklyCompletion = completion.map((week, i) => {
        const isInProgress = week.completed > 0 && week.completed < week.total
        const dumbbellCount = Math.min(week.completed, 3)
        const dumbbells: string[] = []
        for (let n = 0; n < dumbbellCount; n++) {
          dumbbells.push(DUMBBELL_COLORS[n])
        }
        return {
          weekNumber: week.weekNumber,
          completed: week.completed,
          total: week.total,
          percent: week.percent,
          isInProgress,
          isLast: i === completion.length - 1,
          dumbbells,
          showDumbbells: week.completed > 0,
        }
      })
    }

    // 体重数据
    const weightMetrics = [...bodyMetricStore.getMetrics()].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    const recentWeights = weightMetrics.slice(-7)
    const weightPoints: ChartPoint[] = recentWeights.map((m) => ({
      label: m.weight.toFixed(1),
      value: m.weight,
    }))

    const weightSeries: ChartSeries[] =
      weightPoints.length > 0
        ? [{ name: '体重', color: 'var(--color-training-main)', points: weightPoints }]
        : []

    let weightYMin = 80
    let weightYMax = 85
    if (weightPoints.length > 0) {
      const values = weightPoints.map((p) => p.value)
      weightYMin = Math.floor(Math.min(...values)) - 1
      weightYMax = Math.ceil(Math.max(...values)) + 1
    }

    const latestWeight =
      weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].label : '--'
    const latestWeightDate =
      weightMetrics.length > 0 ? formatDate(weightMetrics[weightMetrics.length - 1].date) : '--'
    const hasWeightData = weightPoints.length > 0

    this.setData({
      cycleWeeksCount,
      totalSessions,
      formattedVolume,
      averageFeeling,
      feelingStars,
      rmTrendSeries,
      rmTrendCategories,
      rmTrendYMin,
      rmTrendYMax,
      weeklyCompletion,
      weightSeries,
      weightYMin,
      weightYMax,
      latestWeight,
      latestWeightDate,
      hasWeightData,
    })
  },

  selectPeriod(e: WechatMiniprogram.TouchEvent) {
    const key = (e.currentTarget.dataset as { key?: PeriodKey }).key
    if (!key || key === this.data.selectedPeriod) return
    this.setData({ selectedPeriod: key })
    void this.refresh()
  },

  goWeight() {
    wx.navigateTo({ url: '/pages/weight/index' })
  },
})
