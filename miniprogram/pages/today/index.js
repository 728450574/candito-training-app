"use strict";
// 今日训练页 — 首页 tab
// 迁移自 TodayTraining.vue
// 业务逻辑 1:1 等价：5 种状态分支 + 训练进度 + 快速操作入口
// 适配：recordStore 为异步 API（await getRecordForDay / getRecordsForWeek / getRecordsForCycle）
Object.defineProperty(exports, "__esModule", { value: true });
const cycleStore_1 = require("../../stores/cycleStore");
const recordStore_1 = require("../../stores/recordStore");
const settingsStore_1 = require("../../stores/settingsStore");
const dateService_1 = require("../../services/dateService");
const statsService_1 = require("../../services/statsService");
function workoutTypeLabel(type) {
    return type === 'lower' ? '下肢训练' : '上肢训练';
}
function formatDateDisplay(dateStr) {
    return (0, dateService_1.formatDate)(dateStr) + ' ' + (0, dateService_1.getWeekday)(dateStr);
}
function estimateDuration(exercises) {
    let total = 0;
    for (const ex of exercises) {
        for (const _ of ex.sets) {
            total += ex.type === 'main' ? 3 : 2;
        }
    }
    total += Math.max(0, exercises.length - 1) * 2;
    return total;
}
Page({
    data: {
        pageState: 'noCycle',
        greetingDate: '',
        activeCycle: null,
        todayDayInfo: null,
        nextTrainingDay: null,
        countdownDays: 0,
        estimatedDuration: 0,
        completedInfo: '',
        totalVolume: 0,
        totalCompletedSets: 0,
        durationMinutes: 0,
        feelingStars: '',
        feelingLabel: '',
        bodyWeightDisplay: '',
        unit: 'kg',
        weekCompletedCount: 0,
        weekTotalDays: 0,
        streakDays: 0,
    },
    unsubCycle: null,
    unsubRecord: null,
    unsubSettings: null,
    todayStr: '',
    onLoad() {
        this.todayStr = (0, dateService_1.getToday)();
        this.unsubCycle = cycleStore_1.cycleStore.subscribe(() => { void this.refresh(); });
        this.unsubRecord = recordStore_1.recordStore.subscribe(() => { void this.refresh(); });
        this.unsubSettings = settingsStore_1.settingsStore.subscribe(() => { void this.refresh(); });
        void this.refresh();
    },
    onShow() {
        void this.refresh();
    },
    onUnload() {
        var _a, _b, _c;
        (_a = this.unsubCycle) === null || _a === void 0 ? void 0 : _a.call(this);
        (_b = this.unsubRecord) === null || _b === void 0 ? void 0 : _b.call(this);
        (_c = this.unsubSettings) === null || _c === void 0 ? void 0 : _c.call(this);
    },
    async refresh() {
        var _a, _b;
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        const settings = settingsStore_1.settingsStore.getSettings();
        if (!activeCycle) {
            this.setData({
                pageState: 'noCycle',
                activeCycle: null,
                unit: settings.defaultUnit,
            });
            return;
        }
        const todayStr = this.todayStr;
        // 查找今日训练信息
        let todayDayInfo = null;
        for (const week of activeCycle.weeks) {
            for (const day of week.days) {
                if (day.scheduledDate === todayStr) {
                    todayDayInfo = {
                        ...day,
                        weekNumber: week.weekNumber,
                        weekTheme: week.theme,
                        workoutTypeLabel: workoutTypeLabel(day.type),
                    };
                    break;
                }
            }
            if (todayDayInfo)
                break;
        }
        // 计算 pageState
        let pageState;
        let todayRecord;
        if (!todayDayInfo) {
            pageState = 'rest';
        }
        else if (activeCycle.isPaused) {
            pageState = 'paused';
        }
        else if (todayDayInfo.type === 'rest') {
            pageState = 'rest';
        }
        else if (todayDayInfo.status === 'skipped') {
            pageState = 'skipped';
        }
        else {
            todayRecord = await recordStore_1.recordStore.getRecordForDay(activeCycle.id, todayDayInfo.weekNumber, todayDayInfo.dayNumber);
            pageState = todayRecord ? 'completed' : 'pending';
        }
        // 问候日期
        const [m, d] = todayStr.split('-').slice(1).map(Number);
        const greetingDate = `${m}月${d}日 ${(0, dateService_1.getWeekday)(todayStr)}`;
        // 下次训练日
        const allDays = [];
        for (const w of activeCycle.weeks) {
            for (const day of w.days) {
                allDays.push({
                    ...day,
                    weekNumber: w.weekNumber,
                    weekTheme: w.theme,
                    workoutTypeLabel: workoutTypeLabel(day.type),
                    formatDateDisplay: formatDateDisplay(day.scheduledDate),
                    estimatedDuration: estimateDuration(day.exercises),
                });
            }
        }
        const future = allDays.filter((day) => day.scheduledDate > todayStr && day.type !== 'rest' && day.status === 'pending');
        future.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        const nextTrainingDay = future[0] || null;
        const countdownDays = nextTrainingDay ? (0, dateService_1.diffDays)(todayStr, nextTrainingDay.scheduledDate) : 0;
        // 基础数据
        const data = {
            activeCycle,
            pageState,
            greetingDate,
            todayDayInfo,
            nextTrainingDay,
            countdownDays,
            unit: activeCycle.unit || settings.defaultUnit,
        };
        // 待训练状态：本周完成 / 本周总天数 / 连续训练 / 预计时长
        if (pageState === 'pending' && todayDayInfo) {
            const weekRecords = await recordStore_1.recordStore.getRecordsForWeek(activeCycle.id, todayDayInfo.weekNumber);
            const weekCompletedCount = weekRecords.length;
            const week = activeCycle.weeks.find((w) => w.weekNumber === todayDayInfo.weekNumber);
            const weekTotalDays = week ? week.days.filter((day) => day.type !== 'rest').length : 0;
            const allRecords = await recordStore_1.recordStore.getRecordsForCycle(activeCycle.id);
            let streakDays = 0;
            if (allRecords.length > 0) {
                const sorted = [...allRecords].sort((a, b) => b.date.localeCompare(a.date));
                streakDays = 1;
                let current = sorted[0].date;
                for (let i = 1; i < sorted.length; i++) {
                    const prev = (0, dateService_1.addDays)(current, -1);
                    if (sorted[i].date === prev) {
                        streakDays++;
                        current = prev;
                    }
                    else {
                        break;
                    }
                }
            }
            data.estimatedDuration = estimateDuration(todayDayInfo.exercises);
            data.weekCompletedCount = weekCompletedCount;
            data.weekTotalDays = weekTotalDays;
            data.streakDays = streakDays;
        }
        // 已完成状态：训练数据
        if (pageState === 'completed' && todayRecord && todayDayInfo) {
            const type = workoutTypeLabel(todayDayInfo.type);
            data.completedInfo = `${type} · ${todayRecord.duration}分钟`;
            data.totalVolume = (0, statsService_1.calculateVolume)(todayRecord);
            let totalCompletedSets = 0;
            for (const ex of todayRecord.exercises) {
                totalCompletedSets += ex.sets.filter((s) => s.isCompleted).length;
            }
            data.totalCompletedSets = totalCompletedSets;
            data.durationMinutes = (_a = todayRecord.duration) !== null && _a !== void 0 ? _a : 0;
            const feeling = (_b = todayRecord.feeling) !== null && _b !== void 0 ? _b : 0;
            data.feelingStars = '★'.repeat(feeling) + '☆'.repeat(5 - feeling);
            const labels = ['', '很差', '较差', '一般', '不错', '很棒'];
            data.feelingLabel = labels[feeling] || '';
            const bw = todayRecord.bodyWeight;
            data.bodyWeightDisplay = bw ? `${bw} ${activeCycle.unit || 'kg'}` : '';
        }
        this.setData(data);
    },
    // ── 导航 ──
    goStart() {
        wx.navigateTo({ url: '/pages/start/index' });
    },
    goExecute() {
        const dayInfo = this.data.todayDayInfo;
        const cycle = this.data.activeCycle;
        if (!dayInfo || !cycle)
            return;
        wx.navigateTo({
            url: `/pages/training-execute/index?week=${dayInfo.weekNumber}&day=${dayInfo.dayNumber}&cycleId=${cycle.id}`,
        });
    },
    goDetail() {
        const dayInfo = this.data.todayDayInfo;
        if (!dayInfo)
            return;
        wx.navigateTo({
            url: `/pages/training-detail/index?week=${dayInfo.weekNumber}&day=${dayInfo.dayNumber}`,
        });
    },
    goWeek6() {
        wx.navigateTo({ url: '/pages/week6/index' });
    },
    goMissed() {
        wx.navigateTo({ url: '/pages/missed/index' });
    },
    goWeight() {
        wx.navigateTo({ url: '/pages/weight/index' });
    },
    goCycle() {
        wx.navigateTo({ url: '/pages/cycle/index' });
    },
    goStats() {
        wx.switchTab({ url: '/pages/stats/index' });
    },
    goPlan() {
        wx.navigateTo({ url: '/pages/plan/index' });
    },
    // ── 跳过训练 ──
    handleSkipTraining() {
        const activeCycle = this.data.activeCycle;
        const todayDayInfo = this.data.todayDayInfo;
        if (!activeCycle || !todayDayInfo)
            return;
        const updatedWeeks = activeCycle.weeks.map((week) => {
            if (week.weekNumber !== todayDayInfo.weekNumber)
                return week;
            return {
                ...week,
                days: week.days.map((day) => {
                    if (day.dayNumber !== todayDayInfo.dayNumber)
                        return day;
                    return { ...day, status: 'skipped' };
                }),
            };
        });
        cycleStore_1.cycleStore.updateCycle(activeCycle.id, { weeks: updatedWeeks });
    },
});
