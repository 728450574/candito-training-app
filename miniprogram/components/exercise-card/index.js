// exercise-card 训练动作卡片组件
// 迁移自 TrainingDetail.vue 的主项/辅助项卡片
// 接收 exercise 数据，内部计算徽章样式、目标显示、组状态、小计与容量
Component({
    properties: {
        // 动作记录数据
        exercise: {
            type: Object,
            value: {},
        },
        // 是否展示目标行（主项展示，辅助项不展示）
        showTarget: {
            type: Boolean,
            value: true,
        },
    },
    data: {
        typeLabel: '',
        badgeStyle: '',
        targetDisplay: '',
        completedSetsCount: 0,
        volume: '0',
        // 预计算后的组列表（含每组的行/图标/值样式字符串）
        // WXML 不支持在模板里调用函数，故样式在此预生成
        setsDisplay: [],
    },
    observers: {
        exercise() {
            this.recompute();
        },
    },
    lifetimes: {
        attached() {
            this.recompute();
        },
    },
    methods: {
        recompute() {
            const ex = this.data.exercise;
            if (!ex || !ex.name)
                return;
            // 类型标签与徽章样式
            let typeLabel = '补充项';
            let badgeStyle = 'font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-training-assist); background: rgba(94, 92, 230, 0.08);';
            if (ex.type === 'main') {
                typeLabel = '主项';
                badgeStyle =
                    'font-family: var(--font-sans); font-size: var(--text-xs); font-weight: var(--font-weight-semibold); color: var(--color-training-main); background: var(--state-info-bg);';
            }
            else if (ex.type === 'assistance') {
                typeLabel = '辅助项';
            }
            // 目标显示
            let targetDisplay = '--';
            const firstSet = ex.sets && ex.sets[0];
            if (firstSet) {
                const w = firstSet.targetWeight != null ? firstSet.targetWeight : 0;
                const r = firstSet.targetReps != null ? firstSet.targetReps : '--';
                targetDisplay = `${w}kg x MR${r}`;
            }
            // 预计算每组的展示数据与样式
            const setsDisplay = [];
            let completedSetsCount = 0;
            let total = 0;
            if (ex.sets) {
                for (const s of ex.sets) {
                    if (s.isCompleted)
                        completedSetsCount++;
                    const w = s.actualWeight != null ? s.actualWeight : (s.targetWeight != null ? s.targetWeight : 0);
                    const r = s.actualReps != null ? s.actualReps : 0;
                    total += w * r;
                    // 组行背景：未完成或跳过 → 警告底；完成 → 灰底
                    const incomplete = !s.isCompleted || s.isSkipped;
                    setsDisplay.push({
                        setNumber: s.setNumber,
                        isCompleted: s.isCompleted,
                        isSkipped: s.isSkipped,
                        weightDisplay: String(w),
                        repsDisplay: String(r),
                        rowStyle: incomplete ? 'background: var(--state-warning-bg);' : 'background: var(--color-surface-muted);',
                        iconStyle: incomplete ? 'background: var(--state-warning);' : 'background: var(--state-success);',
                        valueStyle: incomplete ? 'color: var(--state-warning);' : 'color: var(--color-primary);',
                    });
                }
            }
            this.setData({
                typeLabel,
                badgeStyle,
                targetDisplay,
                completedSetsCount,
                volume: total.toLocaleString(),
                setsDisplay,
            });
        },
    },
});
