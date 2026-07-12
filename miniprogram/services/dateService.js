"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDays = addDays;
exports.getToday = getToday;
exports.diffDays = diffDays;
exports.formatDate = formatDate;
exports.formatDateFull = formatDateFull;
exports.getWeekday = getWeekday;
exports.isToday = isToday;
exports.calculateShiftedDates = calculateShiftedDates;
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function toDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}
function pad(n) {
    return n.toString().padStart(2, '0');
}
function toDateStr(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addDays(dateStr, days) {
    const date = toDate(dateStr);
    date.setDate(date.getDate() + days);
    return toDateStr(date);
}
function getToday() {
    return toDateStr(new Date());
}
function diffDays(date1, date2) {
    const d1 = toDate(date1);
    const d2 = toDate(date2);
    const ms = d2.getTime() - d1.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}
function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${m}月${d}日`;
}
function formatDateFull(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${y}年${m}月${d}日`;
}
function getWeekday(dateStr) {
    const date = toDate(dateStr);
    return WEEKDAY_NAMES[date.getDay()];
}
function isToday(dateStr) {
    return dateStr === getToday();
}
function calculateShiftedDates(cycleStartDate, pauseDuration, resumeOption) {
    if (resumeOption === 'postpone') {
        return { adjustedDays: pauseDuration };
    }
    return { adjustedDays: 0 };
}
