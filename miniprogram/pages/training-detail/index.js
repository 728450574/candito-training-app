"use strict";
// 训练详情页 — 迁移自 TrainingDetail.vue
// 业务逻辑 1:1 保真：展示训练记录详情（会话头、笔记、主项卡片、辅助项简行、统计）
// Store: cycleStore (getCycleById, getActiveCycle), recordStore (getRecordForDay)
// Service: dateService (formatDateFull, getWeekday), statsService (calculateVolume)
// 主项使用 exercise-card 组件渲染，辅助项按设计稿渲染为简行
Object.defineProperty(exports, "__esModule", { value: true });
const cycleStore_1 = require("../../stores/cycleStore");
const recordStore_1 = require("../../stores/recordStore");
const dateService_1 = require("../../services/dateService");
const statsService_1 = require("../../services/statsService");
const FEELING_LABELS = ['', '很差', '较差', '一般', '不错', '很棒'];
Page({
    data: {
        hasRecord: false,
        // Session header
        displayDate: '',
        workoutTypeLabel: '',
        weekNum: 0,
        dayNum: 0,
        durationMinutes: 0,
        showBodyWeight: false,
        bodyWeightDisplay: '',
        unit: 'kg',
        feelingStars: '',
        feelingLabel: '',
        // Notes
        showNotes: false,
        notesContent: '',
        // Exercises
        mainExercises: [],
        assistanceExercises: [],
        // Summary
        totalVolumeValue: 0,
        totalSetsCount: 0,
        avgRestSeconds: 0,
    },
    // ── 实例属性（非 data） ──
    _record: null,
    _weekNum: 0,
    _dayNum: 0,
    _cycleId: '',
    onLoad(options) {
        const w = options.week ? Number(options.week) : NaN;
        const d = options.day ? Number(options.day) : NaN;
        const cId = options.cycleId || '';
        this._weekNum = w;
        this._dayNum = d;
        this._cycleId = cId;
        void this.loadRecord();
    },
    async loadRecord() {
        const cycle = this._cycleId ? cycleStore_1.cycleStore.getCycleById(this._cycleId) : cycleStore_1.cycleStore.getActiveCycle();
        if (!cycle) {
            this.setData({ hasRecord: false });
            return;
        }
        // 等价 Vue dayData：在 cycle.weeks 中查找 weekNum/dayNum
        let dayData = null;
        for (const week of cycle.weeks) {
            if (week.weekNumber === this._weekNum) {
                for (const day of week.days) {
                    if (day.dayNumber === this._dayNum) {
                        dayData = day;
                        break;
                    }
                }
            }
        }
        // 等价 Vue record：recordStore.getRecordForDay（async）
        const record = await recordStore_1.recordStore.getRecordForDay(cycle.id, this._weekNum, this._dayNum);
        if (!record || !dayData) {
            this.setData({ hasRecord: false });
            return;
        }
        this._record = record;
        this.setData({ hasRecord: true });
        this.recomputeAll(record, dayData, cycle.unit);
    },
    recomputeAll(record, dayData, unit) {
        // ── Session header ──
        const displayDate = (0, dateService_1.formatDateFull)(record.date) + ' ' + (0, dateService_1.getWeekday)(record.date);
        const workoutTypeLabel = dayData.type === 'lower' ? '下肢训练' : '上肢训练';
        // duration 存储为秒，转为分钟展示（等价设计稿 "52分钟"）
        const durationMinutes = Math.floor((record.duration || 0) / 60);
        const showBodyWeight = record.bodyWeight != null;
        const bodyWeightDisplay = record.bodyWeight != null ? String(record.bodyWeight) : '';
        const cycleUnit = unit || 'kg';
        // ── Feeling ──
        const f = record.feeling ?? 0;
        const feelingStars = '★'.repeat(f) + '☆'.repeat(5 - f);
        const feelingLabel = FEELING_LABELS[record.feeling ?? 0] || '';
        // ── Notes ──
        const showNotes = !!(record.notes && record.notes.length > 0);
        const notesContent = record.notes || '';
        // ── Exercises（等价 Vue mainExercises / assistanceExercises 过滤逻辑） ──
        const mainExercises = record.exercises.filter((e) => e.type === 'main');
        const assistanceRaw = record.exercises.filter((e) => e.type === 'assistance' || e.type === 'optional');
        const assistanceExercises = assistanceRaw.map((ex, idx) => ({
            exKey: ex.exerciseId || `assist-${idx}`,
            name: ex.name,
            completedCount: this.completedSetsCount(ex),
        }));
        // ── Summary ──
        const totalVolumeValue = (0, statsService_1.calculateVolume)(record);
        let totalSetsCount = 0;
        for (const ex of record.exercises) {
            totalSetsCount += ex.sets.filter((s) => s.isCompleted).length;
        }
        const restTimes = [];
        for (const ex of record.exercises) {
            for (const set of ex.sets) {
                if (set.restSeconds != null && set.restSeconds > 0) {
                    restTimes.push(set.restSeconds);
                }
            }
        }
        const avgRestSeconds = restTimes.length === 0 ? 0 : Math.round(restTimes.reduce((a, b) => a + b, 0) / restTimes.length);
        this.setData({
            displayDate,
            workoutTypeLabel,
            weekNum: this._weekNum,
            dayNum: this._dayNum,
            durationMinutes,
            showBodyWeight,
            bodyWeightDisplay,
            unit: cycleUnit,
            feelingStars,
            feelingLabel,
            showNotes,
            notesContent,
            mainExercises,
            assistanceExercises,
            totalVolumeValue,
            totalSetsCount,
            avgRestSeconds,
        });
    },
    // ── 辅助方法（等价 Vue 函数） ──
    completedSetsCount(exercise) {
        return exercise.sets.filter((s) => s.isCompleted).length;
    },
    // ── 导航 ──
    goBack() {
        wx.navigateBack({
            delta: 1,
            fail: () => {
                // 无上一页时回退到日历 tab
                wx.switchTab({ url: '/pages/calendar/index' });
            },
        });
    },
    onUnload() {
        this._record = null;
    },
});
