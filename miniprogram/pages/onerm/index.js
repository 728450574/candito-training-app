"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 1RM 设置页 — 1:1 迁移自 OneRMSetup.vue
// 输入深蹲/卧推/硬拉 1RM、单位、辅助训练配置，保存后重新生成计划
const cycleStore_1 = require("../../stores/cycleStore");
const planGenerator_1 = require("../../services/planGenerator");
const SQUAT_PCTS = [80, 82.5, 87.5, 92.5, 97.5];
const BENCH_PCTS = [70, 72, 77.5, 83.2, 87.5];
const DEADLIFT_PCTS = [75, 77.5, 82.5, 87.5, 92.5];
const WEEK_PCTS = {
    squat: SQUAT_PCTS,
    bench: BENCH_PCTS,
    deadlift: DEADLIFT_PCTS,
};
const ASSISTANCE_SELECTIONS = {
    horizontalPull: ['哑铃划船', '杠铃划船', '坐姿绳索划船', 'T杠划船'],
    shoulder: ['坐姿哑铃推举', '站姿杠铃推举', '阿诺德推举', '侧平举'],
    verticalPull: ['负重引体向上', '高位下拉', '辅助引体向上', 'TRX划船'],
};
Page({
    data: {
        unit: 'kg',
        showAssistance: true,
        lifts: [],
        assistanceItems: [],
        previewRows: [],
    },
    _unsub: null,
    _activeCycle: null,
    _rounding: 2.5,
    _oneRM: { squat: 100, bench: 85, deadlift: 120 },
    _currentSelectionIndex: {
        horizontalPull: 0,
        shoulder: 0,
        verticalPull: 0,
    },
    _assistanceCurrent: {
        horizontalPull: '哑铃划船',
        shoulder: '坐姿哑铃推举',
        verticalPull: '负重引体向上',
    },
    onLoad() {
        var _a, _b, _c, _d;
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        if (!activeCycle) {
            wx.switchTab({ url: '/pages/today/index' });
            return;
        }
        this._activeCycle = activeCycle;
        this._rounding = (_a = activeCycle.weightRounding) !== null && _a !== void 0 ? _a : 2.5;
        this._oneRM = {
            squat: (_b = activeCycle.oneRM.squat) !== null && _b !== void 0 ? _b : 100,
            bench: (_c = activeCycle.oneRM.bench) !== null && _c !== void 0 ? _c : 85,
            deadlift: (_d = activeCycle.oneRM.deadlift) !== null && _d !== void 0 ? _d : 120,
        };
        this._assistanceCurrent = {
            horizontalPull: activeCycle.assistanceConfig.horizontalPull || '哑铃划船',
            shoulder: activeCycle.assistanceConfig.shoulder || '坐姿哑铃推举',
            verticalPull: activeCycle.assistanceConfig.verticalPull || '负重引体向上',
        };
        Object.keys(ASSISTANCE_SELECTIONS).forEach((key) => {
            const idx = ASSISTANCE_SELECTIONS[key].indexOf(this._assistanceCurrent[key]);
            this._currentSelectionIndex[key] = idx >= 0 ? idx : 0;
        });
        this.setData({ unit: activeCycle.unit || 'kg' });
        this.recompute();
    },
    onUnload() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    },
    // 等价 useWeightFormat.displayWeight
    displayWeight(weight) {
        const step = this._rounding;
        const rounded = Math.round(weight / step) * step;
        if (Number.isInteger(rounded)) {
            return String(rounded);
        }
        return rounded.toFixed(1);
    },
    recompute() {
        const lifts = [
            { key: 'squat', cn: '深蹲', en: 'Squat' },
            { key: 'bench', cn: '卧推', en: 'Bench Press' },
            { key: 'deadlift', cn: '硬拉', en: 'Deadlift' },
        ].map((l) => {
            const val = this._oneRM[l.key];
            const pcts = WEEK_PCTS[l.key];
            return {
                key: l.key,
                cn: l.cn,
                en: l.en,
                displayValue: String(val),
                w1: this.displayWeight(val * pcts[0] / 100),
                w3: this.displayWeight(val * pcts[2] / 100),
                w5: this.displayWeight(val * pcts[4] / 100),
            };
        });
        const assistanceItems = [
            { key: 'horizontalPull', cn: '上背部 #1 (水平拉举)', en: 'Back Row', current: this._assistanceCurrent.horizontalPull },
            { key: 'shoulder', cn: '肩部训练', en: 'Shoulder', current: this._assistanceCurrent.shoulder },
            { key: 'verticalPull', cn: '上背部 #2 (垂直拉举)', en: 'Vertical Pull', current: this._assistanceCurrent.verticalPull },
        ];
        const previewRows = [
            { key: 'squat', cn: '深蹲' },
            { key: 'bench', cn: '卧推' },
            { key: 'deadlift', cn: '硬拉' },
        ].map((l) => {
            const pcts = WEEK_PCTS[l.key];
            const cells = [0, 1, 2, 3, 4].map((idx) => this.displayWeight(this._oneRM[l.key] * pcts[idx] / 100));
            return { key: l.key, cn: l.cn, cells };
        });
        this.setData({ lifts, assistanceItems, previewRows });
    },
    selectUnit(e) {
        const unit = e.currentTarget.dataset.unit;
        this.setData({ unit });
    },
    handleWeightInput(e) {
        const key = e.currentTarget.dataset.key;
        const parsed = parseFloat(e.detail.value);
        if (!isNaN(parsed) && parsed > 0) {
            this._oneRM[key] = parsed;
            this.recompute();
        }
    },
    adjustWeight(e) {
        const key = e.currentTarget.dataset.key;
        const delta = Number(e.currentTarget.dataset.delta);
        const current = this._oneRM[key];
        const newVal = Math.round((current + delta) / this._rounding) * this._rounding;
        if (newVal > 0) {
            this._oneRM[key] = newVal;
            this.recompute();
        }
    },
    switchAssistance(e) {
        const key = e.currentTarget.dataset.key;
        const options = ASSISTANCE_SELECTIONS[key];
        this._currentSelectionIndex[key] = (this._currentSelectionIndex[key] + 1) % options.length;
        this._assistanceCurrent[key] = options[this._currentSelectionIndex[key]];
        this.recompute();
    },
    toggleAssistance() {
        this.setData({ showAssistance: !this.data.showAssistance });
    },
    goBack() {
        wx.navigateBack();
    },
    goCustom() {
        wx.navigateTo({ url: '/pages/custom-exercise/index' });
    },
    handleSave() {
        if (!this._activeCycle)
            return;
        const activeCycle = this._activeCycle;
        const newConfig = {
            horizontalPull: this._assistanceCurrent.horizontalPull,
            shoulder: this._assistanceCurrent.shoulder,
            verticalPull: this._assistanceCurrent.verticalPull,
        };
        const newWeeks = (0, planGenerator_1.buildWeeks)({ squat: this._oneRM.squat, bench: this._oneRM.bench, deadlift: this._oneRM.deadlift }, this._rounding, newConfig, activeCycle.startDate);
        cycleStore_1.cycleStore.updateCycle(activeCycle.id, {
            oneRM: { squat: this._oneRM.squat, bench: this._oneRM.bench, deadlift: this._oneRM.deadlift },
            unit: this.data.unit,
            assistanceConfig: newConfig,
            weeks: newWeeks,
        });
        wx.switchTab({ url: '/pages/today/index' });
    },
});
