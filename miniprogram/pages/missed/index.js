"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 处理错过训练页 — 1:1 迁移自 MissedWorkouts.vue
// 展示错过的训练日，选择补练/跳过/顺延，批量处理
const cycleStore_1 = require("../../stores/cycleStore");
const dateService_1 = require("../../services/dateService");
const DAY_ACTIONS = [
    { value: 'makeup', label: '补练' },
    { value: 'skip', label: '跳过' },
    { value: 'postpone', label: '顺延' },
];
Page({
    data: {
        hasActiveCycle: false,
        missedCount: 0,
        missedDayCards: [],
        travelSkipOpen: false,
        travelStartDate: '',
        travelEndDate: '',
    },
    _unsub: null,
    _activeCycle: null,
    _todayStr: '',
    _missedDayInfos: [],
    _dayActions: {},
    onLoad() {
        this._todayStr = (0, dateService_1.getToday)();
        this._unsub = cycleStore_1.cycleStore.subscribe(() => this.recompute());
        this.recompute();
    },
    onUnload() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    },
    recompute() {
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        this._activeCycle = activeCycle;
        if (!activeCycle) {
            this.setData({ hasActiveCycle: false, missedCount: 0, missedDayCards: [] });
            return;
        }
        this._missedDayInfos = this.buildMissedDays(activeCycle);
        // travel dates (display only)
        const travelStartDate = this._missedDayInfos.length > 0 ? this._missedDayInfos[0].date : (0, dateService_1.formatDate)(this._todayStr);
        const travelEndDate = (0, dateService_1.formatDate)(this._todayStr);
        this.setData({
            hasActiveCycle: true,
            missedCount: this._missedDayInfos.length,
            travelStartDate,
            travelEndDate,
        });
        this.recomputeCards();
    },
    buildMissedDays(cycle) {
        const days = [];
        for (const week of cycle.weeks) {
            for (const day of week.days) {
                if (day.type === 'rest')
                    continue;
                if (day.status === 'pending' && day.scheduledDate < this._todayStr) {
                    const diff = (0, dateService_1.diffDays)(day.scheduledDate, this._todayStr);
                    let agoText = '';
                    if (diff === 0)
                        agoText = '今天';
                    else if (diff === 1)
                        agoText = '昨天';
                    else
                        agoText = `${diff}天前`;
                    days.push({
                        key: `W${week.weekNumber}D${day.dayNumber}`,
                        weekNumber: week.weekNumber,
                        dayNumber: day.dayNumber,
                        label: `W${week.weekNumber}D${day.dayNumber}`,
                        typeLabel: day.type === 'lower' ? '下肢训练' : '上肢训练',
                        type: day.type,
                        date: (0, dateService_1.formatDate)(day.scheduledDate),
                        dateDisplay: `${(0, dateService_1.formatDate)(day.scheduledDate)} (${agoText})`,
                        scheduledDate: day.scheduledDate,
                    });
                }
            }
        }
        return days;
    },
    recomputeCards() {
        const missedDayCards = this._missedDayInfos.map((info) => {
            const selected = this._dayActions[info.key];
            const actions = DAY_ACTIONS.map((a) => {
                const isSelected = selected === a.value;
                const style = isSelected
                    ? 'color: var(--color-surface); background: var(--color-training-main);'
                    : 'color: var(--color-primary); background: var(--color-surface-muted);';
                return { value: a.value, label: a.label, style };
            });
            return {
                key: info.key,
                label: info.label,
                typeLabel: info.typeLabel,
                dateDisplay: info.dateDisplay,
                actions,
            };
        });
        this.setData({ missedDayCards });
    },
    selectAction(e) {
        const key = e.currentTarget.dataset.key;
        const action = e.currentTarget.dataset.action;
        this._dayActions[key] = action;
        this.recomputeCards();
    },
    toggleTravelSkip() {
        this.setData({ travelSkipOpen: !this.data.travelSkipOpen });
    },
    applyTravelSkip() {
        for (const day of this._missedDayInfos) {
            this._dayActions[day.key] = 'skip';
        }
        this.setData({ travelSkipOpen: false });
        this.recomputeCards();
    },
    applyAllPostpone() {
        for (const day of this._missedDayInfos) {
            this._dayActions[day.key] = 'postpone';
        }
        this.recomputeCards();
    },
    applyAllSkip() {
        for (const day of this._missedDayInfos) {
            this._dayActions[day.key] = 'skip';
        }
        this.recomputeCards();
    },
    goBack() {
        wx.navigateBack();
    },
    handleConfirm() {
        if (!this._activeCycle)
            return;
        const activeCycle = this._activeCycle;
        const todayStr = this._todayStr;
        const updatedWeeks = activeCycle.weeks.map((week) => {
            return {
                ...week,
                days: week.days.map((day) => {
                    const actionKey = `W${week.weekNumber}D${day.dayNumber}`;
                    const action = this._dayActions[actionKey];
                    if (action && day.status === 'pending') {
                        if (action === 'postpone') {
                            return { ...day, status: 'postponed' };
                        }
                        if (action === 'skip') {
                            return { ...day, status: 'skipped' };
                        }
                        if (action === 'makeup') {
                            return { ...day, status: 'makeup', completedDate: todayStr };
                        }
                    }
                    return day;
                }),
            };
        });
        cycleStore_1.cycleStore.updateCycle(activeCycle.id, { weeks: updatedWeeks });
        wx.navigateBack();
    },
});
