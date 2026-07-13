"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 第6周决策页 — 1:1 迁移自 Week6Decision.vue
// 基于第5周完成数据预估新1RM，让用户选择下一步：直接开始新周期/减载周/实测1RM
const cycleStore_1 = require("../../stores/cycleStore");
const recordStore_1 = require("../../stores/recordStore");
const statsService_1 = require("../../services/statsService");
const dateService_1 = require("../../services/dateService");
// 与原 H5 Week6Decision.vue 内部常量保持一致
const ONE_RM_MULTIPLIERS = {
    1: 1.00,
    2: 1.03,
    3: 1.06,
    4: 1.09,
};
const LIFT_NAMES = {
    squat: '深蹲',
    bench: '卧推',
    deadlift: '硬拉',
};
Page({
    data: {
        hasActiveCycle: false,
        unit: 'kg',
        selectedDecision: 'new_cycle',
        liftData: [],
        // 预计算的样式字符串
        decisionCardStyleNewCycle: '',
        decisionCardStyleDeload: '',
        decisionCardStyleTest1rm: '',
        radioStyleNewCycle: '',
        radioStyleDeload: '',
        radioStyleTest1rm: '',
    },
    _unsub: null,
    _activeCycle: null,
    onLoad() {
        this._unsub = cycleStore_1.cycleStore.subscribe(() => this.handleCycleChange());
        this.handleCycleChange();
    },
    onUnload() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    },
    // 周期变化时重新加载记录并重算 liftData
    handleCycleChange() {
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        this._activeCycle = activeCycle;
        if (!activeCycle) {
            this.setData({
                hasActiveCycle: false,
                liftData: [],
                decisionCardStyleNewCycle: '',
                decisionCardStyleDeload: '',
                decisionCardStyleTest1rm: '',
                radioStyleNewCycle: '',
                radioStyleDeload: '',
                radioStyleTest1rm: '',
            });
            return;
        }
        this.setData({ hasActiveCycle: true, unit: activeCycle.unit || 'kg' });
        void this.loadWeek5AndRecompute(activeCycle);
    },
    async loadWeek5AndRecompute(activeCycle) {
        const week5Records = await recordStore_1.recordStore.getRecordsForWeek(activeCycle.id, 5);
        const liftData = this.buildLiftData(week5Records);
        this.setData({ liftData });
        this.applyDecisionStyles();
    },
    // 等价原 liftData computed：按动作名分组找最佳组并预估1RM
    buildLiftData(week5Records) {
        if (week5Records.length === 0)
            return [];
        const exerciseRecordsByName = {};
        for (const record of week5Records) {
            for (const ex of record.exercises) {
                if (!exerciseRecordsByName[ex.name]) {
                    exerciseRecordsByName[ex.name] = [];
                }
                exerciseRecordsByName[ex.name].push(ex);
            }
        }
        const result = [];
        for (const [key, name] of Object.entries(LIFT_NAMES)) {
            const exRecords = exerciseRecordsByName[name];
            if (!exRecords || exRecords.length === 0)
                continue;
            const best = this.findBestSet(exRecords);
            if (!best)
                continue;
            const multiplier = this.getMultiplier(best.reps);
            const estimated = Math.round((0, statsService_1.estimateNew1RM)(best.weight, best.reps) * 10) / 10;
            result.push({
                key,
                name,
                weight: best.weight,
                reps: best.reps,
                multiplier,
                estimated1RM: estimated,
                weightDisplay: this.formatWeight(best.weight),
                estimated1RMDisplay: this.formatWeight(estimated),
            });
        }
        return result;
    },
    // 等价原 findBestSet：找出最大重量(并列时取更高次数)的完成组
    findBestSet(exerciseRecords) {
        var _a, _b;
        let bestWeight = 0;
        let bestReps = 0;
        for (const ex of exerciseRecords) {
            for (const set of ex.sets) {
                const w = (_a = set.actualWeight) !== null && _a !== void 0 ? _a : 0;
                const r = (_b = set.actualReps) !== null && _b !== void 0 ? _b : 0;
                if (w > 0 && r > 0 && set.isCompleted) {
                    if (w > bestWeight || (w === bestWeight && r > bestReps)) {
                        bestWeight = w;
                        bestReps = r;
                    }
                }
            }
        }
        if (bestWeight > 0 && bestReps > 0) {
            return { weight: bestWeight, reps: bestReps };
        }
        return null;
    },
    // 等价原 getMultiplier：查表或回退到 Epley 系数（保留两位小数）
    getMultiplier(reps) {
        if (reps in ONE_RM_MULTIPLIERS) {
            return ONE_RM_MULTIPLIERS[reps];
        }
        return parseFloat((1 + reps / 30).toFixed(2));
    },
    // 等价原 formatWeight：整数返回字符串，小数保留1位
    formatWeight(value) {
        if (Number.isInteger(value))
            return value.toString();
        return value.toFixed(1);
    },
    // 等价原 decisionCardStyle：返回内联 style 字符串
    decisionCardStyle(value) {
        const base = 'box-shadow: var(--shadow-card); background: var(--color-surface);';
        if (this.data.selectedDecision === value) {
            return `${base} border-left-color: var(--color-training-main);`;
        }
        return `${base} border-left-color: transparent;`;
    },
    // 等价原 radioStyle：返回内联 style 字符串
    radioStyle(value) {
        if (this.data.selectedDecision === value) {
            return 'background-color: var(--color-training-main); border-color: var(--color-training-main);';
        }
        return 'border-color: var(--color-border);';
    },
    applyDecisionStyles() {
        this.setData({
            decisionCardStyleNewCycle: this.decisionCardStyle('new_cycle'),
            decisionCardStyleDeload: this.decisionCardStyle('deload'),
            decisionCardStyleTest1rm: this.decisionCardStyle('test_1rm'),
            radioStyleNewCycle: this.radioStyle('new_cycle'),
            radioStyleDeload: this.radioStyle('deload'),
            radioStyleTest1rm: this.radioStyle('test_1rm'),
        });
    },
    selectDecision(e) {
        const value = e.currentTarget.dataset.value;
        this.setData({ selectedDecision: value });
        this.applyDecisionStyles();
    },
    // 直接开始新周期（无第5周数据时的兜底入口）
    handleDirectNewCycle() {
        if (!this._activeCycle)
            return;
        const activeCycle = this._activeCycle;
        cycleStore_1.cycleStore.updateCycle(activeCycle.id, {
            week6Decision: 'new_cycle',
            status: 'completed',
            completedAt: (0, dateService_1.getToday)(),
        });
        wx.navigateTo({ url: '/pages/start/index' });
    },
    // 确认选择：更新周期 week6Decision + status='completed' + completedAt，按选择跳转
    handleConfirm() {
        if (!this._activeCycle)
            return;
        const activeCycle = this._activeCycle;
        const decision = this.data.selectedDecision;
        cycleStore_1.cycleStore.updateCycle(activeCycle.id, {
            week6Decision: decision,
            status: 'completed',
            completedAt: (0, dateService_1.getToday)(),
        });
        if (decision === 'new_cycle') {
            wx.navigateTo({ url: '/pages/start/index' });
        }
        else if (decision === 'deload') {
            wx.navigateTo({ url: '/pages/plan/index' });
        }
        else {
            wx.switchTab({ url: '/pages/today/index' });
        }
    },
    goBack() {
        wx.navigateBack();
    },
});
