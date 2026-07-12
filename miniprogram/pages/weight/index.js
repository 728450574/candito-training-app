"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 体重记录页 — 1:1 迁移自 WeightRecord.vue
// 体重历史记录、添加新记录、近30天趋势图（canvas 2d 替代 SVG）、历史列表
const bodyMetricStore_1 = require("../../stores/bodyMetricStore");
const dateService_1 = require("../../services/dateService");
Page({
    data: {
        weightInput: '',
        recordDate: (0, dateService_1.getToday)(),
        recordDateDisplay: '',
        showAllHistory: false,
        currentWeight: '--',
        changeColor: 'var(--color-primary-light)',
        changeIndicator: '—',
        lastRecordDate: '暂无记录',
        displayHistory: [],
    },
    _unsub: null,
    _chartPoints: [],
    _chartYMax: 83,
    _chartYMin: 80,
    _chartYMidHigh: 82,
    _chartYMidLow: 81,
    onLoad() {
        this._unsub = bodyMetricStore_1.bodyMetricStore.subscribe(() => this.recompute());
        this.setData({ recordDateDisplay: (0, dateService_1.formatDateFull)(this.data.recordDate) });
        this.recompute();
    },
    onReady() {
        // 首帧布局完成后绘制图表
        this.drawChart();
    },
    onUnload() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    },
    recompute() {
        const metrics = bodyMetricStore_1.bodyMetricStore.getMetrics();
        const sortedDesc = [...metrics].sort((a, b) => b.date.localeCompare(a.date));
        // 当前体重 / 最后记录日期
        let currentWeight = '--';
        let lastRecordDate = '暂无记录';
        if (sortedDesc.length > 0) {
            currentWeight = sortedDesc[0].weight.toFixed(1);
            lastRecordDate = (0, dateService_1.formatDateFull)(sortedDesc[0].date);
        }
        // 较上次变化
        let weightDiff = 0;
        if (sortedDesc.length >= 2) {
            weightDiff = sortedDesc[0].weight - sortedDesc[1].weight;
        }
        let changeColor = 'var(--color-primary-light)';
        if (weightDiff > 0)
            changeColor = 'var(--state-warning)';
        else if (weightDiff < 0)
            changeColor = 'var(--state-success)';
        let changeIndicator = '—';
        if (sortedDesc.length >= 2) {
            const sign = weightDiff > 0 ? '↑' : weightDiff < 0 ? '↓' : '—';
            changeIndicator = `${sign} ${Math.abs(weightDiff).toFixed(1)}kg`;
        }
        // 图表数据（升序，取最后7个）
        const sortedAsc = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
        const chartItems = sortedAsc.slice(-7);
        const chartPoints = chartItems.map((m) => ({
            xLabel: m.date.slice(5).replace('-', '/'),
            value: m.weight,
            valueLabel: m.weight.toFixed(1),
        }));
        const chartValues = chartPoints.map((p) => p.value);
        let chartYMax = 83;
        let chartYMin = 80;
        if (chartValues.length > 0) {
            chartYMax = Math.ceil(Math.max(...chartValues)) + 1;
            chartYMin = Math.floor(Math.min(...chartValues)) - 1;
        }
        const chartYMidHigh = Math.round((chartYMax * 2 + chartYMin) / 3);
        const chartYMidLow = Math.round((chartYMax + chartYMin * 2) / 3);
        this._chartPoints = chartPoints;
        this._chartYMax = chartYMax;
        this._chartYMin = chartYMin;
        this._chartYMidHigh = chartYMidHigh;
        this._chartYMidLow = chartYMidLow;
        // 历史列表
        const items = this.data.showAllHistory ? sortedDesc : sortedDesc.slice(0, 5);
        const displayHistory = items.map((m, i) => {
            const next = i < items.length - 1 ? items[i + 1] : null;
            const diff = next ? m.weight - next.weight : 0;
            let cColor;
            let cLabel;
            if (diff > 0) {
                cColor = 'var(--state-warning)';
                cLabel = `↑ ${diff.toFixed(1)}`;
            }
            else if (diff < 0) {
                cColor = 'var(--state-success)';
                cLabel = `↓ ${Math.abs(diff).toFixed(1)}`;
            }
            else {
                cColor = 'var(--color-primary-light)';
                cLabel = '—';
            }
            return {
                id: m.id,
                dateLabel: (0, dateService_1.formatDate)(m.date),
                weightLabel: `${m.weight.toFixed(1)}kg`,
                changeColor: cColor,
                changeLabel: cLabel,
            };
        });
        this.setData({
            currentWeight,
            changeColor,
            changeIndicator,
            lastRecordDate,
            displayHistory,
        });
        // 数据变化后重绘图表
        this.drawChart();
    },
    // 使用 canvas 2d 绘制折线图（等价原 SVG 绘制）
    drawChart() {
        const query = this.createSelectorQuery();
        query
            .select('#weightChart')
            .fields({ node: true, size: true })
            .exec((res) => {
            if (!res || !res[0] || !res[0].node)
                return;
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = wx.getSystemInfoSync().pixelRatio;
            const width = res[0].width;
            const height = res[0].height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, width, height);
            this.renderChart(ctx, width, height);
        });
    },
    // 等价原 SVG 绘制逻辑（viewBox 0 0 320 200 映射到 canvas 实际像素）
    renderChart(ctx, width, height) {
        const points = this._chartPoints;
        if (points.length === 0)
            return;
        // 原图 viewBox: 320 x 200，按比例缩放到 canvas 实际尺寸
        const sx = width / 320;
        const sy = height / 200;
        const yMax = this._chartYMax;
        const yMin = this._chartYMin;
        // 坐标计算（等价原 chartX/chartY）
        const chartX = (index) => {
            const total = points.length;
            if (total <= 1)
                return 160 * sx;
            return (36 + (index / (total - 1)) * 264) * sx;
        };
        const chartY = (value) => {
            const range = yMax - yMin || 1;
            return (158 - ((value - yMin) / range) * 120) * sy;
        };
        // 解析 CSS 变量颜色（canvas 不支持 var()，需使用具体颜色值）
        const colorBorderLight = '#F0F0F5';
        const colorPrimaryLight = '#86868B';
        const colorPrimary = '#1D1D1F';
        const colorTrainingMain = '#0A84FF';
        const colorSurface = '#FFFFFF';
        // 1. Y 轴标签（4 个：max / midHigh / midLow / min）
        ctx.font = '10px SF Mono, Menlo, Consolas, monospace';
        ctx.fillStyle = colorPrimaryLight;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(yMax), 28 * sx, 38 * sy);
        ctx.fillText(String(this._chartYMidHigh), 28 * sx, 78 * sy);
        ctx.fillText(String(this._chartYMidLow), 28 * sx, 118 * sy);
        ctx.fillText(String(yMin), 28 * sx, 158 * sy);
        // 2. 水平网格线
        ctx.strokeStyle = colorBorderLight;
        ctx.lineWidth = 0.5;
        const gridYs = [38, 78, 118, 158];
        gridYs.forEach((y) => {
            ctx.beginPath();
            ctx.moveTo(36 * sx, y * sy);
            ctx.lineTo(300 * sx, y * sy);
            ctx.stroke();
        });
        // 3. X 轴标签
        ctx.font = '9px SF Mono, Menlo, Consolas, monospace';
        ctx.fillStyle = colorPrimaryLight;
        ctx.textBaseline = 'alphabetic';
        points.forEach((pt, i) => {
            const x = chartX(i);
            ctx.textAlign = i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center';
            ctx.fillText(pt.xLabel, x, 178 * sy);
        });
        // 4. 折线（polyline）
        if (points.length > 1) {
            ctx.beginPath();
            points.forEach((pt, i) => {
                const x = chartX(i);
                const y = chartY(pt.value);
                if (i === 0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
            });
            ctx.strokeStyle = colorTrainingMain;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        // 5. 数据点圆 + 数值标签
        points.forEach((pt, i) => {
            const x = chartX(i);
            const y = chartY(pt.value);
            const isLast = i === points.length - 1;
            ctx.beginPath();
            ctx.arc(x, y, isLast ? 4.5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = colorTrainingMain;
            ctx.fill();
            ctx.strokeStyle = colorSurface;
            ctx.lineWidth = 2;
            ctx.stroke();
            // 数值标签（位于点上方）
            ctx.font = isLast ? '600 9px SF Mono, Menlo, Consolas, monospace' : '9px SF Mono, Menlo, Consolas, monospace';
            ctx.fillStyle = isLast ? colorPrimary : colorPrimaryLight;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(pt.valueLabel, x, y - 10 * sy);
        });
    },
    handleWeightInput(e) {
        this.setData({ weightInput: e.detail.value });
    },
    handleDateChange(e) {
        const date = e.detail.value;
        this.setData({
            recordDate: date,
            recordDateDisplay: (0, dateService_1.formatDateFull)(date),
        });
    },
    handleSave() {
        const w = parseFloat(this.data.weightInput);
        if (isNaN(w) || w <= 0)
            return;
        const id = `bw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const metric = {
            id,
            date: this.data.recordDate,
            weight: w,
            unit: 'kg',
        };
        bodyMetricStore_1.bodyMetricStore.addMetric(metric);
        this.setData({ weightInput: '' });
    },
    toggleShowAll() {
        this.setData({ showAllHistory: !this.data.showAllHistory });
        this.recompute();
    },
    goBack() {
        wx.navigateBack();
    },
});
