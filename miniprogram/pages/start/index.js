"use strict";
// 开始训练页 — 迁移自 StartTraining.vue
// 业务逻辑 1:1 保真：1RM 输入、单位选择、辅助训练配置、日期选择、创建周期
// Store: cycleStore (getActiveCycle, addCycle), settingsStore
// Service: planGenerator (createCycle), dateService (getToday)
Object.defineProperty(exports, "__esModule", { value: true });
const planGenerator_1 = require("../../services/planGenerator");
const cycleStore_1 = require("../../stores/cycleStore");
const settingsStore_1 = require("../../stores/settingsStore");
const dateService_1 = require("../../services/dateService");
const ASSISTANCE_SELECTIONS = {
    horizontalPull: ['哑铃划船', '杠铃划船', '坐姿绳索划船', 'T杠划船'],
    shoulder: ['坐姿哑铃推举', '站姿杠铃推举', '阿诺德推举', '侧平举'],
    verticalPull: ['负重引体向上', '高位下拉', '辅助引体向上', 'TRX划船'],
};
const CURRENT_SELECTION_INDEX = {
    horizontalPull: 1,
    shoulder: 1,
    verticalPull: 2,
};
Page({
    data: {
        unit: 'kg',
        squatInput: '',
        benchInput: '',
        deadliftInput: '',
        isSubmitting: false,
        showAssistance: true,
        assistanceItems: [
            { key: 'horizontalPull', cn: '上背部 #1 (水平拉举)', current: '杠铃划船' },
            { key: 'shoulder', cn: '肩部训练', current: '哑铃推举' },
            { key: 'verticalPull', cn: '上背部 #2 (垂直拉举)', current: '引体向上' },
        ],
        startDate: '',
        todayDisplay: '',
    },
    onLoad() {
        // 等价原 Vue：若有活跃周期（非 terminated/completed），重定向到今日
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        if (activeCycle && activeCycle.status !== 'terminated' && activeCycle.status !== 'completed') {
            wx.switchTab({ url: '/pages/today/index' });
            return;
        }
        const settings = settingsStore_1.settingsStore.getSettings();
        const today = (0, dateService_1.getToday)();
        const [y, m, d] = today.split('-').map(Number);
        const todayDisplay = `${y}年${m}月${d}日`;
        this.setData({
            unit: settings.defaultUnit || 'kg',
            startDate: today,
            todayDisplay,
        });
    },
    // ── 单位选择 ──
    selectUnit(e) {
        const unit = e.currentTarget.dataset.unit;
        this.setData({ unit });
    },
    // ── 1RM 输入 ──
    onSquatInput(e) {
        this.setData({ squatInput: e.detail.value });
    },
    onBenchInput(e) {
        this.setData({ benchInput: e.detail.value });
    },
    onDeadliftInput(e) {
        this.setData({ deadliftInput: e.detail.value });
    },
    // ── 辅助训练配置 ──
    toggleAssistance() {
        this.setData({ showAssistance: !this.data.showAssistance });
    },
    switchAssistance(e) {
        const key = e.currentTarget.dataset.key;
        const options = ASSISTANCE_SELECTIONS[key];
        CURRENT_SELECTION_INDEX[key] = (CURRENT_SELECTION_INDEX[key] + 1) % options.length;
        const items = this.data.assistanceItems.map((item) => {
            if (item.key === key) {
                return { ...item, current: options[CURRENT_SELECTION_INDEX[key]] };
            }
            return item;
        });
        this.setData({ assistanceItems: items });
    },
    goCustom() {
        wx.navigateTo({ url: '/pages/custom-exercise/index' });
    },
    // ── 日期选择 ──
    onDateChange(e) {
        const date = e.detail.value;
        const [y, m, d] = date.split('-').map(Number);
        this.setData({
            startDate: date,
            todayDisplay: `${y}年${m}月${d}日`,
        });
    },
    // ── 提交创建周期 ──
    handleSubmit() {
        if (this.data.isSubmitting)
            return;
        const squat = Number(this.data.squatInput) || 0;
        const bench = Number(this.data.benchInput) || 0;
        const deadlift = Number(this.data.deadliftInput) || 0;
        const oneRM = { squat, bench, deadlift };
        if (!oneRM.squat && !oneRM.bench && !oneRM.deadlift)
            return;
        this.setData({ isSubmitting: true });
        const cycle = (0, planGenerator_1.createCycle)({
            oneRM,
            unit: this.data.unit,
            weightRounding: settingsStore_1.settingsStore.getSettings().weightRounding,
            startDate: this.data.startDate,
            assistanceConfig: {
                horizontalPull: this.data.assistanceItems[0].current,
                shoulder: this.data.assistanceItems[1].current,
                verticalPull: this.data.assistanceItems[2].current,
            },
        });
        cycleStore_1.cycleStore.addCycle(cycle);
        wx.switchTab({ url: '/pages/today/index' });
        this.setData({ isSubmitting: false });
    },
});
