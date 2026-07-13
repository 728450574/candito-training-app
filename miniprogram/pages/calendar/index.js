"use strict";
// 训练日历页 — tab
// 迁移自 TrainingCalendar.vue
// 业务逻辑 1:1 等价：月历视图 + 周视图 + 训练状态标记 + 选中日期详情
// 适配：recordStore 为异步 API（getRecordForDay），trainingDayMap 在 refresh() 内 await 构建
Object.defineProperty(exports, "__esModule", { value: true });
const cycleStore_1 = require("../../stores/cycleStore");
const recordStore_1 = require("../../stores/recordStore");
const dateService_1 = require("../../services/dateService");
const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEK_ABBRS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
function pad(n) {
    return n.toString().padStart(2, '0');
}
function toDateStr(year, month, day) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}
function getFirstDayOfMonth(year, month) {
    const d = new Date(year, month, 1);
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
}
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function getDaysInPrevMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
function workoutTypeLabel(type) {
    return type === 'lower' ? '下肢训练' : '上肢训练';
}
Page({
    data: {
        currentYear: 0,
        currentMonth: 0,
        currentMonthLabel: '',
        activeCycle: null,
        cycleStatusText: '',
        weekRowDays: [],
        calendarRows: [],
        lastRowIndex: 0,
        selectedDayInfo: null,
        weekdayHeaders: WEEKDAY_HEADERS,
    },
    unsubCycle: null,
    unsubRecord: null,
    todayStr: '',
    selectedDate: null,
    trainingDayMap: {},
    onLoad() {
        this.todayStr = (0, dateService_1.getToday)();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        this.setData({
            currentYear: year,
            currentMonth: month,
            currentMonthLabel: String(month + 1),
        });
        this.unsubCycle = cycleStore_1.cycleStore.subscribe(() => { void this.refresh(); });
        this.unsubRecord = recordStore_1.recordStore.subscribe(() => { void this.refresh(); });
        void this.refresh();
    },
    onShow() {
        void this.refresh();
    },
    onUnload() {
        var _a, _b;
        (_a = this.unsubCycle) === null || _a === void 0 ? void 0 : _a.call(this);
        (_b = this.unsubRecord) === null || _b === void 0 ? void 0 : _b.call(this);
    },
    async refresh() {
        const activeCycle = cycleStore_1.cycleStore.getActiveCycle();
        // 构建 trainingDayMap（异步：await getRecordForDay）
        const map = {};
        if (activeCycle) {
            for (const week of activeCycle.weeks) {
                for (const day of week.days) {
                    if (day.type === 'rest')
                        continue;
                    const exNames = day.exercises.map((e) => e.name).join(', ');
                    const record = await recordStore_1.recordStore.getRecordForDay(activeCycle.id, week.weekNumber, day.dayNumber);
                    const status = record ? 'completed' : day.status;
                    map[day.scheduledDate] = {
                        weekNumber: week.weekNumber,
                        dayNumber: day.dayNumber,
                        type: day.type,
                        exercises: exNames,
                        status,
                        scheduledDate: day.scheduledDate,
                    };
                }
            }
        }
        this.trainingDayMap = map;
        this.buildCalendar();
        this.updateSelectedDay();
        this.setData({
            activeCycle,
            cycleStatusText: this.computeCycleStatusText(activeCycle),
        });
    },
    buildCalendar() {
        const year = this.data.currentYear;
        const month = this.data.currentMonth;
        const todayStr = this.todayStr;
        const map = this.trainingDayMap;
        // 周视图：显示当月第一周（含上月末尾日期补齐）
        const weekRowDays = [];
        const firstDay = getFirstDayOfMonth(year, month);
        const daysInMonth = getDaysInMonth(year, month);
        const daysInPrevMonth = getDaysInPrevMonth(year, month);
        for (let i = 0; i < 7; i++) {
            let day, m, y;
            if (i < firstDay) {
                day = daysInPrevMonth - firstDay + i + 1;
                m = month - 1;
                y = year;
                if (m < 0) {
                    m = 11;
                    y--;
                }
            }
            else {
                day = i - firstDay + 1;
                m = month;
                y = year;
            }
            const dateStr = toDateStr(y, m, day);
            const isToday = dateStr === todayStr;
            const info = map[dateStr];
            const trainingStatus = this.getTrainingStatusForDate(dateStr, info);
            weekRowDays.push({
                abbr: WEEK_ABBRS[i],
                date: day,
                dateStr,
                isToday,
                isCurrentMonth: m === month && y === year,
                hasTraining: !!info,
                dotClass: this.dotClassFor(trainingStatus, isToday),
            });
        }
        // 月历网格
        const allCells = [];
        // 上月末尾日期补齐
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            let y = year, m = month - 1;
            if (m < 0) {
                m = 11;
                y--;
            }
            const dateStr = toDateStr(y, m, day);
            allCells.push(this.buildCell(day, dateStr, false, todayStr, null));
        }
        // 当月日期
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = toDateStr(year, month, d);
            const info = map[dateStr];
            const trainingStatus = this.getTrainingStatusForDate(dateStr, info);
            allCells.push(this.buildCell(d, dateStr, true, todayStr, trainingStatus));
        }
        // 下月开头补齐
        const remaining = 7 - (allCells.length % 7);
        if (remaining < 7) {
            let y = year, m = month + 1;
            if (m > 11) {
                m = 0;
                y++;
            }
            for (let d = 1; d <= remaining; d++) {
                const dateStr = toDateStr(y, m, d);
                allCells.push(this.buildCell(d, dateStr, false, todayStr, null));
            }
        }
        const rows = [];
        for (let i = 0; i < allCells.length; i += 7) {
            rows.push(allCells.slice(i, i + 7));
        }
        this.setData({
            weekRowDays,
            calendarRows: rows,
            lastRowIndex: rows.length - 1,
        });
    },
    buildCell(day, dateStr, isCurrentMonth, todayStr, trainingStatus) {
        const isToday = dateStr === todayStr;
        const selectable = isCurrentMonth || isToday;
        let dateClass;
        if (isToday) {
            dateClass = 'cal-date--today';
        }
        else if (isCurrentMonth) {
            dateClass = trainingStatus ? 'cal-date--current-train' : 'cal-date--current-rest';
        }
        else {
            dateClass = 'cal-date--other';
        }
        // 选中修饰（叠加，今日除外）
        if (this.selectedDate === dateStr && !isToday) {
            dateClass += ' cal-date--selected';
        }
        return {
            day,
            dateStr,
            isCurrentMonth,
            isToday,
            selectable,
            trainingStatus,
            dateClass,
            dotClass: this.dotClassFor(trainingStatus, isToday),
        };
    },
    getTrainingStatusForDate(dateStr, info) {
        if (dateStr === this.todayStr)
            return 'today';
        if (!info)
            return null;
        if (info.status === 'completed')
            return 'completed';
        if (dateStr < this.todayStr)
            return 'missed';
        return 'upcoming';
    },
    dotClassFor(status, isToday) {
        if (isToday)
            return 'cal-dot--today';
        switch (status) {
            case 'completed': return 'cal-dot--completed';
            case 'today': return 'cal-dot--today';
            case 'upcoming': return 'cal-dot--upcoming';
            case 'missed': return 'cal-dot--missed';
            default: return '';
        }
    },
    computeCycleStatusText(activeCycle) {
        if (!activeCycle)
            return '';
        const weekNum = this.currentWeekNumber(activeCycle);
        return `第${weekNum}周 · ${activeCycle.status === 'paused' ? '已暂停' : '进行中'}`;
    },
    currentWeekNumber(activeCycle) {
        for (const week of activeCycle.weeks) {
            for (const day of week.days) {
                if (day.scheduledDate === this.todayStr) {
                    return week.weekNumber;
                }
            }
        }
        return 1;
    },
    updateSelectedDay() {
        const dateStr = this.selectedDate;
        if (!dateStr) {
            this.setData({ selectedDayInfo: null });
            return;
        }
        const info = this.trainingDayMap[dateStr];
        const [y, m, d] = dateStr.split('-').map(Number);
        void y; // 仅解析使用，年份不显示
        const display = `${m}月${d}日 · ${(0, dateService_1.getWeekday)(dateStr)}`;
        if (!info) {
            this.setData({
                selectedDayInfo: {
                    displayDate: display,
                    statusLabel: '休息日',
                    statusPillColor: 'var(--color-primary-light)',
                    statusPillBg: 'var(--color-primary-subtle)',
                    workoutType: '',
                    weekNum: 0,
                    dayNum: 0,
                    exercisesSummary: '',
                    dateStr,
                    isCompleted: false,
                },
            });
            return;
        }
        const status = info.status === 'completed'
            ? '已完成'
            : (dateStr === this.todayStr ? '今日待完成' : '待训练');
        const typeLabel = workoutTypeLabel(info.type);
        let pillColor = 'var(--color-training-main)';
        let pillBg = 'var(--state-info-bg)';
        if (info.status === 'completed') {
            pillColor = 'var(--state-success)';
            pillBg = 'var(--state-success-bg)';
        }
        this.setData({
            selectedDayInfo: {
                displayDate: display,
                statusLabel: status,
                statusPillColor: pillColor,
                statusPillBg: pillBg,
                workoutType: typeLabel,
                weekNum: info.weekNumber,
                dayNum: info.dayNumber,
                exercisesSummary: info.exercises,
                dateStr,
                isCompleted: info.status === 'completed',
            },
        });
    },
    selectDay(e) {
        const date = e.currentTarget.dataset.date;
        if (!date)
            return;
        // 查找 cell 校验可选性（仅当月或今日可选）
        const rows = this.data.calendarRows;
        let selectable = false;
        for (const row of rows) {
            for (const c of row) {
                if (c.dateStr === date) {
                    selectable = c.selectable;
                    break;
                }
            }
            if (selectable)
                break;
        }
        if (!selectable)
            return;
        this.selectedDate = date;
        // 重建日历以更新选中态样式
        this.buildCalendar();
        this.updateSelectedDay();
    },
    prevMonth() {
        let m = this.data.currentMonth - 1;
        let y = this.data.currentYear;
        if (m < 0) {
            m = 11;
            y--;
        }
        this.selectedDate = null;
        this.setData({
            currentYear: y,
            currentMonth: m,
            currentMonthLabel: String(m + 1),
        });
        this.buildCalendar();
        this.updateSelectedDay();
    },
    nextMonth() {
        let m = this.data.currentMonth + 1;
        let y = this.data.currentYear;
        if (m > 11) {
            m = 0;
            y++;
        }
        this.selectedDate = null;
        this.setData({
            currentYear: y,
            currentMonth: m,
            currentMonthLabel: String(m + 1),
        });
        this.buildCalendar();
        this.updateSelectedDay();
    },
    goToDetail() {
        const info = this.data.selectedDayInfo;
        const cycle = this.data.activeCycle;
        if (!info || !cycle)
            return;
        const url = info.isCompleted
            ? `/pages/training-detail/index?week=${info.weekNum}&day=${info.dayNum}&cycleId=${cycle.id}`
            : `/pages/training-execute/index?week=${info.weekNum}&day=${info.dayNum}&cycleId=${cycle.id}`;
        wx.navigateTo({ url });
    },
});
