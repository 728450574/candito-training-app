"use strict";
// 进度统计页 — tab
// 迁移自 ProgressStats.vue
// 业务逻辑 1:1 等价：周期筛选 + 概览卡 + 1RM 趋势图 + 每周完成 + 体重趋势
// 适配：
//   - recordStore 为异步 API（await getRecordsForCycle）
//   - SVG 图表改用 stat-chart 组件（canvas 2d，绘制逻辑由组件负责）
//   - 星级评分 SVG 改用 ★/☆ 字符串
Object.defineProperty(exports, "__esModule", { value: true });
const cycleStore_1 = require("../../stores/cycleStore");
const recordStore_1 = require("../../stores/recordStore");
const bodyMetricStore_1 = require("../../stores/bodyMetricStore");
const statsService_1 = require("../../services/statsService");
const dateService_1 = require("../../services/dateService");
const DUMBBELL_COLORS = [
    'var(--color-training-main)',
    'var(--color-training-assist)',
    'var(--color-warm)',
];
Page({
    data: {
        periodOptions: [
            { key: 'current', label: '本周期' },
            { key: 'history', label: '历史' },
            { key: 'all', label: '全部' },
        ],
        selectedPeriod: 'current',
        cycleWeeksCount: '--',
        totalSessions: 0,
        formattedVolume: '0',
        averageFeeling: '0.0',
        feelingStars: '☆☆☆☆☆',
        rmTrendSeries: [],
        rmTrendCategories: [],
        rmTrendYMin: 80,
        rmTrendYMax: 120,
        weeklyCompletion: [],
        weightSeries: [],
        weightYMin: 80,
        weightYMax: 85,
        latestWeight: '--',
        latestWeightDate: '--',
        hasWeightData: false,
    },
    unsubCycle: null,
    unsubRecord: null,
    unsubBodyMetric: null,
    onLoad() {
        this.unsubCycle = cycleStore_1.cycleStore.subscribe(() => { void this.refresh(); });
        this.unsubRecord = recordStore_1.recordStore.subscribe(() => { void this.refresh(); });
        this.unsubBodyMetric = bodyMetricStore_1.bodyMetricStore.subscribe(() => { void this.refresh(); });
        void this.refresh();
    },
    onShow() {
        void this.refresh();
    },
    onUnload() {
        this.unsubCycle?.();
        this.unsubRecord?.();
        this.unsubBodyMetric?.();
    },
    async refresh() {
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        const completedCycles = cycleStore_1.cycleStore.getCompletedCycles();
        const allCycles = cycleStore_1.cycleStore.getCycles();
        const period = this.data.selectedPeriod;
        // 根据周期筛选确定相关周期
        let relevantCycles;
        if (period === 'current') {
            relevantCycles = activeCycle ? [activeCycle] : [];
        }
        else if (period === 'history') {
            relevantCycles = completedCycles;
        }
        else {
            relevantCycles = allCycles;
        }
        // 异步获取每个周期的训练记录
        const recordsByCycle = {};
        for (const c of relevantCycles) {
            recordsByCycle[c.id] = await recordStore_1.recordStore.getRecordsForCycle(c.id);
        }
        // 汇总所有记录
        const allRecords = [];
        for (const c of relevantCycles) {
            allRecords.push(...(recordsByCycle[c.id] ?? []));
        }
        // 概览统计
        const totalSessions = allRecords.length;
        const totalVolume = (0, statsService_1.calculateTotalVolume)(allRecords);
        const formattedVolume = totalVolume.toLocaleString();
        const avgFeeling = (0, statsService_1.getAverageFeeling)(allRecords);
        const averageFeeling = avgFeeling.toFixed(1);
        const filledCount = Math.round(avgFeeling);
        const feelingStars = '★'.repeat(filledCount) + '☆'.repeat(5 - filledCount);
        // 头部周期周数
        const cycleWeeksCount = activeCycle ? activeCycle.weeks.length : '--';
        // 1RM 趋势
        const rmTrend = (0, statsService_1.get1rmTrend)(relevantCycles, recordsByCycle);
        const rmTrendSeries = [
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
        ];
        const rmTrendCategories = relevantCycles.map((c, i) => c.name || `C${i + 1}`);
        // 1RM Y 轴范围
        const all1RMValues = [];
        for (const arr of [rmTrend.squat, rmTrend.bench, rmTrend.deadlift]) {
            for (const pt of arr)
                all1RMValues.push(pt.value);
        }
        let rmTrendYMin = 80;
        let rmTrendYMax = 120;
        if (all1RMValues.length > 0) {
            rmTrendYMax = Math.ceil(Math.max(...all1RMValues) / 10) * 10;
            rmTrendYMin = Math.floor(Math.min(...all1RMValues) / 10) * 10;
        }
        // 每周完成情况
        let weeklyCycle = null;
        if (period === 'current') {
            weeklyCycle = activeCycle;
        }
        else if (period === 'history') {
            weeklyCycle = completedCycles.length > 0 ? completedCycles[completedCycles.length - 1] : null;
        }
        else {
            weeklyCycle = allCycles.length > 0 ? allCycles[allCycles.length - 1] : null;
        }
        let weeklyCompletion = [];
        if (weeklyCycle) {
            const completion = (0, statsService_1.calculateWeeklyCompletion)(weeklyCycle);
            weeklyCompletion = completion.map((week, i) => {
                const isInProgress = week.completed > 0 && week.completed < week.total;
                const dumbbellCount = Math.min(week.completed, 3);
                const dumbbells = [];
                for (let n = 0; n < dumbbellCount; n++) {
                    dumbbells.push(DUMBBELL_COLORS[n]);
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
                };
            });
        }
        // 体重数据
        const weightMetrics = [...bodyMetricStore_1.bodyMetricStore.getMetrics()].sort((a, b) => a.date.localeCompare(b.date));
        const recentWeights = weightMetrics.slice(-7);
        const weightPoints = recentWeights.map((m) => ({
            label: m.weight.toFixed(1),
            value: m.weight,
        }));
        const weightSeries = weightPoints.length > 0
            ? [{ name: '体重', color: 'var(--color-training-main)', points: weightPoints }]
            : [];
        let weightYMin = 80;
        let weightYMax = 85;
        if (weightPoints.length > 0) {
            const values = weightPoints.map((p) => p.value);
            weightYMin = Math.floor(Math.min(...values)) - 1;
            weightYMax = Math.ceil(Math.max(...values)) + 1;
        }
        const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].label : '--';
        const latestWeightDate = weightMetrics.length > 0 ? (0, dateService_1.formatDate)(weightMetrics[weightMetrics.length - 1].date) : '--';
        const hasWeightData = weightPoints.length > 0;
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
        });
    },
    selectPeriod(e) {
        const key = e.currentTarget.dataset.key;
        if (!key || key === this.data.selectedPeriod)
            return;
        this.setData({ selectedPeriod: key });
        void this.refresh();
    },
    goWeight() {
        wx.navigateTo({ url: '/pages/weight/index' });
    },
});
