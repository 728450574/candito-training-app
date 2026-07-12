"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 自定义动作页 — 1:1 迁移自 CustomExercise.vue
// 为周期辅助训练配置添加自定义动作名称（覆盖 assistanceConfig 中对应位置）
const cycleStore_1 = require("../../stores/cycleStore");
const CATEGORIES = [
    { key: 'horizontalPull', label: '上背部 #1 (水平拉举)', subLabel: 'Back Row' },
    { key: 'shoulder', label: '肩部训练', subLabel: 'Shoulder' },
    { key: 'verticalPull', label: '上背部 #2 (垂直拉举)', subLabel: 'Vertical Pull' },
];
const PRESET_MAP = {
    horizontalPull: ['哑铃划船', '杠铃划船', '划船器械', 'T杠划船'],
    shoulder: ['坐姿哑铃推举', '站立哑铃推举', '实力举', '哑铃侧平举'],
    verticalPull: ['负重引体向上(反手)', '负重引体向上(正手)', '坐姿下拉'],
};
Page({
    data: {
        categories: [],
        presetExercises: [],
        selectedCategory: 'horizontalPull',
        customName: '',
        selectedPreset: null,
        defaultSets: 3,
        defaultReps: 10,
    },
    _unsub: null,
    _activeCycle: null,
    onLoad() {
        this._unsub = cycleStore_1.cycleStore.subscribe(() => this.syncActiveCycle());
        this.syncActiveCycle();
        this.recompute();
    },
    onUnload() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    },
    syncActiveCycle() {
        this._activeCycle = cycleStore_1.cycleStore.getActiveCycle();
    },
    recompute() {
        const selected = this.data.selectedCategory;
        const categories = CATEGORIES.map((c) => {
            const isSelected = c.key === selected;
            const style = isSelected
                ? 'background: var(--state-info-bg); border-left: 6rpx solid var(--color-training-main);'
                : 'background: var(--color-surface); border-bottom: 1rpx solid var(--color-border-light);';
            const radioStyle = isSelected
                ? 'background: var(--color-training-main);'
                : 'border: 3rpx solid var(--color-border);';
            return {
                key: c.key,
                label: c.label,
                subLabel: c.subLabel,
                style,
                radioStyle,
            };
        });
        const presetNames = PRESET_MAP[selected] || [];
        const selectedPreset = this.data.selectedPreset;
        const presetExercises = presetNames.map((name) => {
            const isActive = selectedPreset === name;
            const style = isActive
                ? 'background: var(--state-info-bg); color: var(--color-training-main); border-radius: var(--radius-full); border: 1rpx solid var(--color-training-main);'
                : 'background: var(--color-surface-muted); color: var(--color-primary); border-radius: var(--radius-full); border: 1rpx solid var(--color-border-light);';
            return { name, style };
        });
        this.setData({ categories, presetExercises });
    },
    selectCategory(e) {
        const key = e.currentTarget.dataset.key;
        if (key === this.data.selectedCategory)
            return;
        this.setData({ selectedCategory: key, selectedPreset: null, customName: '' });
        this.recompute();
    },
    handleNameInput(e) {
        this.setData({ customName: e.detail.value, selectedPreset: null });
        this.recompute();
    },
    selectPreset(e) {
        const name = e.currentTarget.dataset.name;
        if (this.data.selectedPreset === name) {
            // 二次点击取消选中
            this.setData({ selectedPreset: null, customName: '' });
        }
        else {
            this.setData({ selectedPreset: name, customName: name });
        }
        this.recompute();
    },
    handleConfirm() {
        const name = this.data.customName.trim();
        if (!name)
            return;
        const ac = this._activeCycle;
        if (!ac)
            return;
        const key = this.data.selectedCategory;
        cycleStore_1.cycleStore.updateCycle(ac.id, {
            assistanceConfig: {
                ...ac.assistanceConfig,
                [key]: name,
            },
        });
        wx.navigateBack();
    },
    goBack() {
        wx.navigateBack();
    },
});
