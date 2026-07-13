"use strict";
// 训练完成总结页 — 迁移自 TrainingComplete.vue
// 业务逻辑 1:1 保真：展示训练总结、统计、MR10 提示、体重记录、笔记、感受评分、完成打卡
// Store: cycleStore (getCycleById, getActiveCycle, updateCycle), recordStore (getRecordForDay, getRecordsForCycle, saveRecords), bodyMetricStore (addMetric)
// Service: statsService (calculateVolume)
// 数据来源：刚保存的 record（通过 week/day/cycleId 查询）
Object.defineProperty(exports, "__esModule", { value: true });
const cycleStore_1 = require("../../stores/cycleStore");
const recordStore_1 = require("../../stores/recordStore");
const bodyMetricStore_1 = require("../../stores/bodyMetricStore");
const statsService_1 = require("../../services/statsService");
const uuid_1 = require("../../utils/uuid");
Page({
    data: {
        loading: true,
        hasRecord: false,
        isSubmitting: false,
        // Completion header
        workoutSubtitle: '',
        // Summary
        summaryExercises: [],
        // Stats
        totalVolume: 0,
        durationMinutes: 0,
        averageRest: 0,
        // MR10
        showMR10: false,
        mr10Title: '',
        mr10Description: '',
        // Body weight
        bodyWeightStr: '',
        // Notes
        notes: '',
        // Feeling
        feeling: 3,
        starsDisplay: [],
    },
    // ── 实例属性（非 data） ──
    _record: null,
    _weekNum: 0,
    _dayNum: 0,
    _cycleId: '',
    onLoad(options) {
        const wNum = options.week ? Number(options.week) : 0;
        const dNum = options.day ? Number(options.day) : 0;
        const cId = options.cycleId || '';
        if (!cId || !wNum || !dNum) {
            this.setData({ loading: false });
            return;
        }
        this._weekNum = wNum;
        this._dayNum = dNum;
        this._cycleId = cId;
        void this.loadRecord();
    },
    async loadRecord() {
        var _a;
        const found = await recordStore_1.recordStore.getRecordForDay(this._cycleId, this._weekNum, this._dayNum);
        if (found) {
            this._record = found;
            const bodyWeight = (_a = found.bodyWeight) !== null && _a !== void 0 ? _a : null;
            this.setData({
                loading: false,
                hasRecord: true,
                bodyWeightStr: bodyWeight != null ? String(bodyWeight) : '',
                notes: found.notes || '',
                feeling: found.feeling || 3,
            });
            this.recomputeAll();
        }
        else {
            this.setData({ loading: false, hasRecord: false });
        }
    },
    recomputeAll() {
        this.computeWorkoutSubtitle();
        this.computeSummary();
        this.computeStats();
        this.computeMR10();
        this.computeStars();
    },
    // ── workoutSubtitle computed ──
    computeWorkoutSubtitle() {
        const record = this._record;
        if (!record) {
            this.setData({ workoutSubtitle: '' });
            return;
        }
        const cycle = this._cycleId ? cycleStore_1.cycleStore.getCycleById(this._cycleId) : cycleStore_1.cycleStore.getActiveCycle();
        let typeLabel = '训练';
        if (cycle) {
            for (const week of cycle.weeks) {
                if (week.weekNumber === this._weekNum) {
                    for (const day of week.days) {
                        if (day.dayNumber === this._dayNum) {
                            typeLabel = day.type === 'lower' ? '下肢训练' : day.type === 'upper' ? '上肢训练' : '训练';
                        }
                    }
                }
            }
        }
        const mins = Math.floor((record.duration || 0) / 60);
        const subtitle = `${typeLabel} · W${this._weekNum}D${this._dayNum} · ${mins}分钟`;
        this.setData({ workoutSubtitle: subtitle });
    },
    // ── summaryExercises computed ──
    computeSummary() {
        const record = this._record;
        if (!record) {
            this.setData({ summaryExercises: [] });
            return;
        }
        const exercises = record.exercises;
        const summaryExercises = exercises.map((ex, exIdx) => {
            const completedCount = this.completedSetCount(ex);
            const nameStyle = ex.type === 'main'
                ? 'font-family: var(--font-sans); font-size: var(--text-base); font-weight: var(--font-weight-semibold); color: var(--color-primary);'
                : 'font-family: var(--font-sans); font-size: var(--text-base); font-weight: var(--font-weight-semibold); color: var(--color-primary-light);';
            const countStyle = 'font-family: var(--font-sans); font-size: var(--text-sm); color: var(--state-success);';
            const sets = ex.sets.map((set) => {
                const belowTarget = this.isBelowTarget(set);
                const weightDisplay = set.actualWeight != null ? String(set.actualWeight) : set.targetWeight != null ? String(set.targetWeight) : '--';
                const repsDisplay = set.actualReps != null ? String(set.actualReps) : set.targetReps != null ? set.targetReps : '--';
                // rowStyle: 等价 setSummaryStyle — belowTarget → warning color, else primary color
                const rowStyle = belowTarget
                    ? 'font-family: var(--font-mono); color: var(--state-warning);'
                    : 'font-family: var(--font-mono); color: var(--color-primary);';
                // labelStyle: 等价 setSummaryOpacity — belowTarget → opacity 0.7, else 0.5
                const labelStyle = belowTarget ? 'opacity: 0.7;' : 'opacity: 0.5;';
                // iconStyle: check → success, alert-triangle → warning
                const iconStyle = belowTarget ? 'color: var(--state-warning);' : 'color: var(--state-success);';
                return {
                    setKey: `${ex.exerciseId}-${set.setNumber}`,
                    setNumber: set.setNumber,
                    weightDisplay,
                    repsDisplay,
                    isCompleted: set.isCompleted,
                    belowTarget,
                    rowStyle,
                    labelStyle,
                    iconStyle,
                };
            });
            return {
                exKey: ex.exerciseId || `ex-${exIdx}`,
                name: ex.name,
                nameStyle,
                completedCount,
                countStyle,
                sets,
                showDivider: exIdx < exercises.length - 1,
            };
        });
        this.setData({ summaryExercises });
    },
    // ── stats computed ──
    computeStats() {
        const record = this._record;
        if (!record) {
            this.setData({ totalVolume: 0, durationMinutes: 0, averageRest: 0 });
            return;
        }
        const totalVolume = (0, statsService_1.calculateVolume)(record);
        const durationMinutes = Math.floor((record.duration || 0) / 60);
        const restTimes = [];
        for (const ex of record.exercises) {
            for (const set of ex.sets) {
                if (set.restSeconds != null && set.isCompleted) {
                    restTimes.push(set.restSeconds);
                }
            }
        }
        const averageRest = restTimes.length === 0 ? 0 : Math.round(restTimes.reduce((a, b) => a + b, 0) / restTimes.length);
        this.setData({ totalVolume, durationMinutes, averageRest });
    },
    // ── MR10 computed ──
    computeMR10() {
        var _a, _b;
        const record = this._record;
        if (!record || record.mr10TotalReps == null) {
            this.setData({ showMR10: false, mr10Title: '', mr10Description: '' });
            return;
        }
        const mainExercise = record.exercises.find((ex) => ex.type === 'main');
        const name = (_a = mainExercise === null || mainExercise === void 0 ? void 0 : mainExercise.name) !== null && _a !== void 0 ? _a : '主项';
        const reps = (_b = record.mr10TotalReps) !== null && _b !== void 0 ? _b : 0;
        const mr10Title = `${name} MR10 完成 ${reps}次`;
        let sets;
        if (reps >= 10)
            sets = 10;
        else if (reps >= 8)
            sets = 8;
        else if (reps >= 7)
            sets = 5;
        else
            sets = 0;
        const mr10Description = sets === 0 ? '下次训练将跳过减量组并建议降低1RM' : `下次训练将进行 ${sets}组 × 3次 减量组`;
        this.setData({ showMR10: true, mr10Title, mr10Description });
    },
    // ── stars computed ──
    computeStars() {
        const feeling = this.data.feeling;
        const starsDisplay = [];
        for (let star = 1; star <= 5; star++) {
            const filled = feeling >= star;
            const glyph = filled ? '★' : '☆';
            const btnStyle = filled
                ? 'color: var(--color-warm);'
                : 'color: var(--color-border);';
            const iconStyle = filled
                ? 'font-size: 48rpx; color: var(--color-warm); line-height: 1;'
                : 'font-size: 48rpx; color: var(--color-border); line-height: 1;';
            starsDisplay.push({ star, value: star, filled, glyph, btnStyle, iconStyle });
        }
        this.setData({ starsDisplay });
    },
    // ── 辅助方法（等价 Vue 函数） ──
    completedSetCount(exercise) {
        return exercise.sets.filter((s) => s.isCompleted).length;
    },
    isBelowTarget(set) {
        var _a, _b;
        if (!set.isCompleted)
            return false;
        const targetNum = parseInt((_a = set.targetReps) !== null && _a !== void 0 ? _a : '', 10);
        if (isNaN(targetNum))
            return false;
        return ((_b = set.actualReps) !== null && _b !== void 0 ? _b : 0) < targetNum;
    },
    // ── 输入处理 ──
    onWeightInput(e) {
        this.setData({ bodyWeightStr: e.detail.value });
    },
    onNotesInput(e) {
        this.setData({ notes: e.detail.value });
    },
    selectFeeling(e) {
        const star = Number(e.currentTarget.dataset.star);
        if (star < 1 || star > 5)
            return;
        this.setData({ feeling: star });
        this.computeStars();
    },
    // ── 完成打卡 ──
    async submitRecord() {
        if (this.data.isSubmitting || !this._record)
            return;
        this.setData({ isSubmitting: true });
        const record = this._record;
        const bodyWeightVal = this.data.bodyWeightStr ? Number(this.data.bodyWeightStr) : null;
        // 等价 Vue：更新 record 字段
        const updatedRecord = {
            ...record,
            notes: this.data.notes,
            feeling: this.data.feeling,
            bodyWeight: bodyWeightVal !== null && bodyWeightVal !== void 0 ? bodyWeightVal : undefined,
        };
        this._record = updatedRecord;
        // 等价 Vue：保存 body weight 到 bodyMetricStore
        if (bodyWeightVal) {
            bodyMetricStore_1.bodyMetricStore.addMetric({
                id: (0, uuid_1.uuidv4)(),
                date: record.date,
                weight: bodyWeightVal,
                unit: 'kg',
            });
        }
        // 等价 Vue：更新 recordStore 中的记录
        const cycleIdVal = this._cycleId || record.cycleId;
        const existingRecords = await recordStore_1.recordStore.getRecordsForCycle(cycleIdVal);
        const idx = existingRecords.findIndex((r) => r.id === record.id);
        if (idx !== -1) {
            existingRecords[idx] = updatedRecord;
            await recordStore_1.recordStore.saveRecords(cycleIdVal);
        }
        await this.navigateAfterComplete();
    },
    // ── 导航 ──
    async navigateAfterComplete() {
        const week5Completed = this.checkWeek5Completed();
        if (week5Completed) {
            const cycle = this._cycleId ? cycleStore_1.cycleStore.getCycleById(this._cycleId) : cycleStore_1.cycleStore.getActiveCycle();
            if (cycle) {
                cycleStore_1.cycleStore.updateCycle(cycle.id, { status: 'week6_pending' });
            }
            wx.redirectTo({ url: `/pages/week6/index?cycleId=${this._cycleId}` });
        }
        else {
            wx.switchTab({ url: '/pages/today/index' });
        }
    },
    checkWeek5Completed() {
        if (this._weekNum !== 5)
            return false;
        const cycle = this._cycleId ? cycleStore_1.cycleStore.getCycleById(this._cycleId) : cycleStore_1.cycleStore.getActiveCycle();
        if (!cycle)
            return false;
        const week5 = cycle.weeks.find((w) => w.weekNumber === 5);
        if (!week5)
            return false;
        const trainingDays = week5.days.filter((d) => d.type !== 'rest');
        return trainingDays.length > 0 && trainingDays.every((d) => d.status === 'completed');
    },
    goToday() {
        void this.navigateAfterComplete();
    },
    onUnload() {
        // 页面卸载时清理（无计时器需清除，仅重置状态）
        this._record = null;
    },
});
