// stat-chart 图表组件骨架
// 替代 H5 项目 ProgressStats.vue 的内联 SVG 图表
// （1RM 跨周期趋势折线图 / 体重迷你折线图）
//
// 评估结论：原图表为折线图（含渐变面积填充、数据点、坐标轴标签），
// 复杂度中等，使用原生 canvas 2d 即可实现，无需引入 echarts-for-weixin
// （避免增加包体积）。多系列折线 + 渐变面积均可通过 canvas 2d API 绘制。
//
// 当前仅创建骨架，具体绘制逻辑（坐标系映射、折线、面积、数据点、标签）
// 留待 stats 页面迁移阶段按实际数据结构完善（见下方 TODO）。

interface ChartPoint {
  label: string
  value: number
}

interface ChartSeries {
  name: string
  color: string
  points: ChartPoint[]
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
    // X 轴标签（如周期名）
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
    // 画布高度（px）
    height: {
      type: Number,
      value: 200,
    },
  },

  lifetimes: {
    attached() {
      // TODO: 页面迁移阶段实现 canvas 2d 绘制
      // 1. 通过 this.createSelectorQuery() 获取 canvas 节点
      // 2. 调用 node.getContext('2d') 拿到 ctx
      // 3. 按 dpr 设置 canvas.width/height（保证清晰度）
      // 4. 绘制流程：
      //    a. 计算 Y 轴范围（yMin/yMax 或自动）
      //    b. 绘制水平网格线 + Y 轴标签
      //    c. 绘制 X 轴标签
      //    d. 对每个 series：绘制渐变面积（polygon）+ 折线（polyline）+ 数据点（circle）
      //    e. 参考 H5 ProgressStats.vue 的 linePoints/areaPoints/yPos/xPos 计算逻辑
      this.initCanvas()
    },
    detached() {
      // 清理可能的动画/重绘定时器（如有）
    },
  },

  observers: {
    series() {
      // 数据更新时重绘
      this.redraw()
    },
  },

  methods: {
    initCanvas() {
      // TODO: 实现首帧绘制（当前为骨架，仅完成 canvas 节点获取与 dpr 适配）
      const query = this.createSelectorQuery()
      query
        .select('#chart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)
          this.draw(ctx, res[0].width, res[0].height)
        })
    },

    redraw() {
      // 重新查询 canvas 节点后重绘（避免在 this 上缓存非响应式对象）
      const query = this.createSelectorQuery()
      query
        .select('#chart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          ctx.clearRect(0, 0, res[0].width, res[0].height)
          this.draw(ctx, res[0].width, res[0].height)
        })
    },

    draw(_ctx: CanvasRenderingContext2D, _width: number, _height: number) {
      // TODO: 实现具体绘制逻辑
      // 参考 H5 ProgressStats.vue：
      // - 1RM 趋势：3 条折线（深蹲#0A84FF / 卧推#5E5CE6 / 硬拉#FF6B35）
      //   + 渐变面积填充 + 数据点圆 + Y 轴网格 + 标签
      // - 体重迷你图：单条折线 + 渐变面积 + 数据标签
    },
  },
})
