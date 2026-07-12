// stat-chart 图表组件
// 替代 H5 项目 ProgressStats.vue 的内联 SVG 图表
// （1RM 跨周期趋势折线图 / 体重迷你折线图）
//
// 使用原生 canvas 2d 绘制：坐标轴 + 网格 + 多系列折线 + 数据点 + 数值标签 + 末点高亮。
// 无需引入 echarts-for-weixin，避免增加包体积。
// 支持多系列折线（如深蹲/卧推/硬拉），并通过 height 自适应完整图/迷你图两种布局。

interface ChartPoint {
  label: string
  value: number
}

interface ChartSeries {
  name: string
  color: string
  points: ChartPoint[]
}

// canvas 不支持 CSS 变量 var(...)，stats 页体重系列传入的是 var(--color-training-main)，
// 需在此解析为具体颜色值（参照 assets/styles/theme.wxss 设计 token）
const CSS_VAR_MAP: Record<string, string> = {
  'var(--color-training-main)': '#0A84FF',
  'var(--color-training-assist)': '#5E5CE6',
  'var(--color-training-optional)': '#30D158',
  'var(--color-training-rest)': '#86868B',
  'var(--color-warm)': '#FF6B35',
  'var(--color-primary)': '#1D1D1F',
  'var(--color-primary-light)': '#86868B',
  'var(--state-info)': '#0A84FF',
  'var(--state-success)': '#30D158',
  'var(--state-warning)': '#FF9F0A',
  'var(--state-error)': '#FF3B30',
}

const COLOR_GRID = '#F0F0F5'
const COLOR_TEXT = '#86868B'
const COLOR_TEXT_STRONG = '#1D1D1F'
const COLOR_SURFACE = '#FFFFFF'

function resolveColor(color: string | undefined | null): string {
  if (!color) return '#0A84FF'
  const trimmed = color.trim()
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) return trimmed
  return CSS_VAR_MAP[trimmed] || '#0A84FF'
}

// 数值格式化：整数显示整数，小数保留 1 位
function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

// 在 [min, max] 区间内生成“好看”的网格刻度（步长取 1/2/5 × 10^n），
// 保证 Y 轴标签为整洁数字（如 80/90/100/110/120），且不超出坐标范围
function niceTicksInRange(min: number, max: number, target = 4): number[] {
  const range = max - min || 1
  const roughStep = range / target
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const norm = roughStep / mag
  let step: number
  if (norm < 1.5) step = mag
  else if (norm < 3) step = 2 * mag
  else if (norm < 7) step = 5 * mag
  else step = 10 * mag
  const ticks: number[] = []
  const start = Math.ceil(min / step - 1e-9) * step
  for (let v = start; v <= max + 1e-9; v += step) {
    ticks.push(v)
  }
  return ticks
}

Component({
  properties: {
    // 图表类型：line 折线图（含面积）/ bar 柱状图
    type: {
      type: String,
      value: 'line',
    },
    // 数据系列数组（每项含名称、颜色、数据点）
    series: {
      type: Array,
      value: [] as ChartSeries[],
    },
    // X 轴标签（如周期名）；不传则取首条 series 的 points.label
    categories: {
      type: Array,
      value: [] as string[],
    },
    // Y 轴最小值（不传则按数据自动计算）
    yMin: {
      type: Number,
      value: 0,
    },
    // Y 轴最大值（不传则按数据自动计算）
    yMax: {
      type: Number,
      value: 0,
    },
    // 画布高度（px）；< 120 视为迷你图（无坐标轴/网格）
    height: {
      type: Number,
      value: 200,
    },
  },

  lifetimes: {
    // 首帧布局完成后绘制（ready 保证 canvas 节点已布局、尺寸非 0）
    ready() {
      this.render()
    },
    detached() {
      // 清理可能的动画/重绘定时器（如有）
    },
  },

  observers: {
    // 任一绘图相关属性变化时重绘（setData 批量更新只会触发一次）
    'series, categories, yMin, yMax, height': function () {
      this.render()
    },
  },

  methods: {
    // 查询 canvas 节点 → dpr 适配 → 清屏 → 绘制
    // 每次（含 height 变化）都重设 canvas 像素尺寸并重新 scale，避免缓冲区尺寸与 CSS 尺寸不一致
    render() {
      const query = this.createSelectorQuery()
      query
        .select('#chart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const width = res[0].width
          const height = res[0].height
          if (!width || !height) return
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          const dpr = wx.getWindowInfo().pixelRatio
          canvas.width = width * dpr
          canvas.height = height * dpr
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, width, height)
          this.draw(ctx, width, height)
        })
    },

    draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
      const series = (this.data.series as ChartSeries[] | undefined) ?? []
      if (series.length === 0) return

      // 解析每条 series 的颜色（处理 CSS 变量），归一化数据点
      const resolved = series.map((s) => ({
        name: s.name,
        color: resolveColor(s.color),
        points: (s.points ?? []).map((p) => ({
          label: p.label,
          value: Number(p.value) || 0,
        })),
      }))

      // X 轴标签：优先用 categories，否则取首条 series 的 points.label
      const categories = (this.data.categories as string[] | undefined) ?? []
      const firstPoints = resolved[0].points
      const xLabels: string[] =
        categories.length > 0
          ? categories.map((c) => String(c))
          : firstPoints.map((p) => p.label)

      // X 维度点数（各 series 在同一 X 索引对齐）
      const count =
        xLabels.length || Math.max(...resolved.map((s) => s.points.length), 1)

      // Y 轴范围：yMin===yMax===0 表示未传，按数据自动计算
      let yMin = this.data.yMin as number
      let yMax = this.data.yMax as number
      if (yMin === 0 && yMax === 0) {
        const allValues: number[] = []
        for (const s of resolved) {
          for (const p of s.points) allValues.push(p.value)
        }
        if (allValues.length > 0) {
          yMax = Math.ceil(Math.max(...allValues))
          yMin = Math.floor(Math.min(...allValues))
        } else {
          yMin = 0
          yMax = 1
        }
      }
      if (yMin === yMax) yMax = yMin + 1
      const yRange = yMax - yMin

      // 紧凑模式（迷你图，如体重 60px）：不绘制坐标轴/网格/X 标签
      const compact = height < 120

      // 画布边距
      const padTop = compact ? 12 : 24
      const padBottom = compact ? 10 : 26
      const padLeft = compact ? 8 : 34
      const padRight = 14
      const chartW = Math.max(width - padLeft - padRight, 1)
      const chartH = Math.max(height - padTop - padBottom, 1)

      // 坐标映射
      const xPos = (i: number): number => {
        if (count <= 1) return padLeft + chartW / 2
        return padLeft + (i / (count - 1)) * chartW
      }
      const yPos = (v: number): number => {
        const ratio = (v - yMin) / yRange
        return padTop + (1 - ratio) * chartH
      }

      // ── 1. Y 轴网格线 + 数值标签（仅完整模式）──
      if (!compact) {
        const ticks = niceTicksInRange(yMin, yMax)
        ctx.strokeStyle = COLOR_GRID
        ctx.lineWidth = 0.5
        ctx.font = '10px SF Mono, Menlo, Consolas, monospace'
        ctx.fillStyle = COLOR_TEXT
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (const t of ticks) {
          const y = yPos(t)
          // 网格线
          ctx.beginPath()
          ctx.moveTo(padLeft, y)
          ctx.lineTo(padLeft + chartW, y)
          ctx.stroke()
          // Y 轴标签
          ctx.fillText(formatNumber(t), padLeft - 6, y)
        }
      }

      // ── 2. X 轴标签（仅完整模式；过密时稀疏显示避免重叠）──
      if (!compact && count > 0) {
        ctx.font = '9px SF Mono, Menlo, Consolas, monospace'
        ctx.fillStyle = COLOR_TEXT
        ctx.textBaseline = 'alphabetic'
        const maxLabels = Math.max(1, Math.floor(chartW / 36))
        const step = count > maxLabels ? Math.ceil(count / maxLabels) : 1
        for (let i = 0; i < count; i++) {
          // 始终显示首末两个，中间按 step 抽取
          if (i !== 0 && i !== count - 1 && i % step !== 0) continue
          const x = xPos(i)
          ctx.textAlign = i === 0 ? 'left' : i === count - 1 ? 'right' : 'center'
          ctx.fillText(xLabels[i] ?? '', x, padTop + chartH + 16)
        }
      }

      // ── 3 / 4 / 5. 逐系列绘制：折线 + 数据点 + 末点高亮与数值标签 ──
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const s of resolved) {
        const pts = s.points
        if (pts.length === 0) continue

        // 3. 折线
        if (pts.length > 1) {
          ctx.beginPath()
          pts.forEach((p, i) => {
            const x = xPos(i)
            const y = yPos(p.value)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.strokeStyle = s.color
          ctx.lineWidth = compact ? 2 : 2.5
          ctx.stroke()
        }

        // 4. 数据点圆 + 白色描边（末点放大高亮）
        pts.forEach((p, i) => {
          const x = xPos(i)
          const y = yPos(p.value)
          const isLast = i === pts.length - 1
          ctx.beginPath()
          ctx.arc(x, y, isLast ? 4.5 : 3.5, 0, Math.PI * 2)
          ctx.fillStyle = s.color
          ctx.fill()
          ctx.strokeStyle = COLOR_SURFACE
          ctx.lineWidth = 2
          ctx.stroke()
        })

        // 5. 最后一个数据点高亮 + 数值标签
        const lastIdx = pts.length - 1
        const lastPt = pts[lastIdx]
        const lx = xPos(lastIdx)
        const ly = yPos(lastPt.value)
        // 点位过高时标签置于下方，避免溢出顶部
        const above = ly > 18
        const labelY = above ? ly - 8 : ly + 12
        ctx.font = compact
          ? '600 9px SF Mono, Menlo, Consolas, monospace'
          : '600 10px SF Mono, Menlo, Consolas, monospace'
        ctx.fillStyle = COLOR_TEXT_STRONG
        ctx.textAlign = 'right'
        ctx.textBaseline = above ? 'alphabetic' : 'top'
        ctx.fillText(formatNumber(lastPt.value), lx - 6, labelY)
      }
    },
  },
})
