"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWeeks = buildWeeks;
exports.createCycle = createCycle;
const uuid_1 = require("../utils/uuid");
const dateService_1 = require("./dateService");
function roundWeight(weight, rounding) {
    return Math.round(weight / rounding) * rounding;
}
function pct(value, percent, rounding) {
    return roundWeight(value * percent / 100, rounding);
}
function mainSet(setNumber, weight, reps, isAMRAP = false) {
    return { setNumber, targetWeight: weight, targetReps: reps, isAMRAP };
}
function mainSets(count, weight, reps, startFrom = 1) {
    return Array.from({ length: count }, (_, i) => ({
        setNumber: startFrom + i,
        targetWeight: weight,
        targetReps: reps,
    }));
}
function amrapSet(setNumber, weight, reps) {
    return { setNumber, targetWeight: weight, targetReps: reps, isAMRAP: true };
}
function assistanceExercise(name, sets) {
    return {
        id: (0, uuid_1.uuidv4)(),
        name,
        type: 'assistance',
        sets,
    };
}
function buildAssistanceExercises(config) {
    const result = [];
    const add = (name, setsCount, reps) => {
        const sets = Array.from({ length: setsCount }, (_, i) => ({
            setNumber: i + 1,
            targetReps: reps,
        }));
        result.push(assistanceExercise(name, sets));
    };
    add(config.horizontalPull, 3, '8-12');
    add(config.shoulder, 3, '8-12');
    add(config.verticalPull, 3, '8-12');
    if (config.optional1) {
        add(config.optional1, 3, '8-12');
    }
    if (config.optional2) {
        add(config.optional2, 3, '8-12');
    }
    return result;
}
// ---------- Week 1: 肌肉调理 ----------
function buildWeek1Days(oneRM, rounding, assistance, startDate) {
    const offsets = [0, 1, 3, 4, 5];
    const types = ['lower', 'upper', 'upper', 'lower', 'upper'];
    return offsets.map((offset, i) => {
        const date = (0, dateService_1.addDays)(startDate, offset);
        const dayType = types[i];
        const dayNumber = i + 1;
        const exercises = [];
        if (dayType === 'lower') {
            if (i === 0) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.squat, 80, rounding), '6'),
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.deadlift, 75, rounding), '6'),
                });
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.squat, 75, rounding), '8'),
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.deadlift, 70, rounding), '8'),
                });
            }
        }
        else {
            if (i === 1 || i === 2) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: [
                        mainSet(1, pct(oneRM.bench, 45, rounding), '10'),
                        mainSet(2, pct(oneRM.bench, 60, rounding), '10'),
                        mainSet(3, pct(oneRM.bench, 67.5, rounding), '8'),
                        mainSet(4, pct(oneRM.bench, 70, rounding), '6'),
                    ],
                });
                exercises.push(...buildAssistanceExercises(assistance));
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.bench, 75, rounding), 'MR')],
                });
                exercises.push(...buildAssistanceExercises(assistance));
            }
        }
        return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' };
    });
}
// ---------- Week 2: 肌肉调理/增肌 ----------
function buildWeek2Days(oneRM, rounding, assistance, startDate) {
    const offsets = [0, 1, 3, 4, 6];
    const types = ['lower', 'upper', 'lower', 'upper', 'upper'];
    return offsets.map((offset, i) => {
        const date = (0, dateService_1.addDays)(startDate, offset);
        const dayType = types[i];
        const dayNumber = i + 1;
        const exercises = [];
        if (dayType === 'lower') {
            if (i === 0) {
                // Day 1: 深蹲 MR10 (80%) + 硬拉变式
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.squat, 80, rounding), 'MR10')],
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉变式',
                    type: 'main',
                    sets: mainSets(3, pct(oneRM.deadlift, 70, rounding), '8'),
                });
            }
            else {
                // Day 3: 深蹲 MR10 (82.5%) + 硬拉变式
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.squat, 82.5, rounding), 'MR10')],
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉变式',
                    type: 'main',
                    sets: mainSets(3, pct(oneRM.deadlift, 70, rounding), '8'),
                });
            }
            // 可选项目
            if (assistance.optional1) {
                exercises.push(assistanceExercise(assistance.optional1, mainSets(3, undefined, '8-12')));
            }
            if (assistance.optional2) {
                exercises.push(assistanceExercise(assistance.optional2, mainSets(3, undefined, '8-12')));
            }
        }
        else {
            if (i === 4) {
                // Day 5: 卧推 MR
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.bench, 75, rounding), 'MR')],
                });
                exercises.push(...buildAssistanceExercises(assistance));
            }
            else {
                const benchWeight = i === 1 ? pct(oneRM.bench, 72.5, rounding) : pct(oneRM.bench, 70, rounding);
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: mainSets(3, benchWeight, '8'),
                });
                exercises.push(...buildAssistanceExercises(assistance));
            }
        }
        return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' };
    });
}
// ---------- Week 3: 线性最大超负荷 ----------
function buildWeek3Days(oneRM, rounding, assistance, startDate) {
    const offsets = [0, 2, 4, 5];
    const types = ['lower', 'upper', 'lower', 'upper'];
    return offsets.map((offset, i) => {
        const date = (0, dateService_1.addDays)(startDate, offset);
        const dayType = types[i];
        const dayNumber = i + 1;
        const exercises = [];
        if (dayType === 'lower') {
            if (i === 0) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: [
                        mainSet(1, pct(oneRM.squat, 87.5, rounding), '3'),
                        mainSet(2, pct(oneRM.squat, 90, rounding), '3'),
                    ],
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.deadlift, 82.5, rounding), '3'),
                });
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.squat, 85, rounding), '3'),
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.deadlift, 80, rounding), '3'),
                });
            }
        }
        else {
            const benchWeight1 = pct(oneRM.bench, 77.5, rounding);
            const benchWeight2 = pct(oneRM.bench, 80, rounding);
            if (i === 1) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: [
                        mainSet(1, benchWeight1, '4'),
                        mainSet(2, benchWeight2, '4'),
                    ],
                });
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: mainSets(3, pct(oneRM.bench, 75, rounding), '4'),
                });
            }
            exercises.push(...buildAssistanceExercises(assistance));
        }
        return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' };
    });
}
// ---------- Week 4: 适应大重量 ----------
function buildWeek4Days(oneRM, rounding, assistance, startDate) {
    const offsets = [0, 1, 3, 4];
    const types = ['lower', 'upper', 'lower', 'upper'];
    return offsets.map((offset, i) => {
        const date = (0, dateService_1.addDays)(startDate, offset);
        const dayType = types[i];
        const dayNumber = i + 1;
        const exercises = [];
        if (dayType === 'lower') {
            if (i === 0) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: [
                        mainSet(1, pct(oneRM.squat, 85, rounding), '3'),
                        mainSet(2, pct(oneRM.squat, 90, rounding), '3'),
                        mainSet(3, pct(oneRM.squat, 92.5, rounding), '3'),
                    ],
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: [
                        mainSet(1, pct(oneRM.deadlift, 87.5, rounding), '3'),
                        mainSet(2, pct(oneRM.deadlift, 90, rounding), '3'),
                    ],
                });
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.squat, 87.5, rounding), '3'),
                });
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.deadlift, 85, rounding), '3'),
                });
            }
        }
        else {
            if (i === 1) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: [
                        mainSet(1, pct(oneRM.bench, 80, rounding), '3'),
                        mainSet(2, pct(oneRM.bench, 85, rounding), '3'),
                        mainSet(3, pct(oneRM.bench, 87.5, rounding), '3'),
                    ],
                });
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: mainSets(2, pct(oneRM.bench, 82.5, rounding), '3'),
                });
            }
            exercises.push(...buildAssistanceExercises(assistance));
        }
        return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' };
    });
}
// ---------- Week 5: 高强度力量训练 ----------
function buildWeek5Days(oneRM, rounding, assistance, startDate) {
    const offsets = [0, 2, 4];
    const types = ['lower', 'upper', 'lower'];
    return offsets.map((offset, i) => {
        const date = (0, dateService_1.addDays)(startDate, offset);
        const dayType = types[i];
        const dayNumber = i + 1;
        const exercises = [];
        if (dayType === 'lower') {
            if (i === 0) {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.squat, 97.5, rounding), '1-4')],
                });
            }
            else {
                exercises.push({
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.deadlift, 92.5, rounding), '1-4')],
                });
            }
        }
        else {
            exercises.push({
                id: (0, uuid_1.uuidv4)(),
                name: '卧推',
                type: 'main',
                sets: [amrapSet(1, pct(oneRM.bench, 87.5, rounding), '1-4')],
            });
            exercises.push(...buildAssistanceExercises(assistance));
        }
        return { dayNumber, dayOffset: offset, type: dayType, originalDate: date, scheduledDate: date, exercises, status: 'pending' };
    });
}
// ---------- Week 6: 测试/减载/跳过 ----------
function buildWeek6Days(oneRM, rounding, assistance, startDate) {
    const offsets = [0, 2, 4];
    const date = (offset) => (0, dateService_1.addDays)(startDate, offset);
    return [
        {
            dayNumber: 1,
            dayOffset: 0,
            type: 'lower',
            originalDate: date(0),
            scheduledDate: date(0),
            exercises: [
                {
                    id: (0, uuid_1.uuidv4)(),
                    name: '深蹲',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.squat, 85, rounding), '3-5')],
                    notes: '第6周 — 根据选择进行调整：测试1RM / 减载 / 跳过',
                },
            ],
            status: 'pending',
        },
        {
            dayNumber: 2,
            dayOffset: 2,
            type: 'upper',
            originalDate: date(2),
            scheduledDate: date(2),
            exercises: [
                {
                    id: (0, uuid_1.uuidv4)(),
                    name: '卧推',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.bench, 85, rounding), '3-5')],
                    notes: '第6周 — 根据选择进行调整：测试1RM / 减载 / 跳过',
                },
            ],
            status: 'pending',
        },
        {
            dayNumber: 3,
            dayOffset: 4,
            type: 'lower',
            originalDate: date(4),
            scheduledDate: date(4),
            exercises: [
                {
                    id: (0, uuid_1.uuidv4)(),
                    name: '硬拉',
                    type: 'main',
                    sets: [amrapSet(1, pct(oneRM.deadlift, 85, rounding), '3-5')],
                    notes: '第6周 — 根据选择进行调整：测试1RM / 减载 / 跳过',
                },
            ],
            status: 'pending',
        },
    ];
}
const WEEK_BUILDERS = [
    buildWeek1Days,
    buildWeek2Days,
    buildWeek3Days,
    buildWeek4Days,
    buildWeek5Days,
    buildWeek6Days,
];
const WEEK_THEMES = [
    '肌肉调理',
    '肌肉调理/增肌',
    '线性最大超负荷',
    '适应大重量',
    '高强度力量训练',
    '测试/减载/跳过',
];
const WEEK_OFFSETS = [
    0, // week 1 starts at startDate
    7, // week 2 starts at startDate + 7
    14, // week 3 starts at startDate + 14
    21, // week 4 starts at startDate + 21
    28, // week 5 starts at startDate + 28
    35, // week 6 starts at startDate + 35
];
function buildWeeks(oneRM, weightRounding, assistanceConfig, startDate) {
    return WEEK_BUILDERS.map((builder, index) => {
        const weekNumber = index + 1;
        const weekStartDate = (0, dateService_1.addDays)(startDate, WEEK_OFFSETS[index]);
        const days = builder(oneRM, weightRounding, assistanceConfig, weekStartDate);
        return {
            weekNumber,
            theme: WEEK_THEMES[index],
            days,
        };
    });
}
function createCycle(input) {
    const id = (0, uuid_1.uuidv4)();
    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}Z`;
    const weeks = buildWeeks(input.oneRM, input.weightRounding, input.assistanceConfig, input.startDate);
    const startLocal = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const name = `周期 ${startLocal}`;
    return {
        id,
        name,
        startDate: input.startDate,
        status: 'active',
        oneRM: { ...input.oneRM },
        unit: input.unit,
        weightRounding: input.weightRounding,
        assistanceConfig: { ...input.assistanceConfig },
        weeks,
        pauseHistory: [],
        restartBranches: [],
        batchProcessHistory: [],
        isPaused: false,
        createdAt,
    };
}
