import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { BodyMetric } from '@/types/bodyMetric'
import { getProvider } from '@/services/storage'

/**
 * 体测数据 Store。
 * 类比 Java：BodyMetricService + BodyMetricRepository 的结合体。
 * 管理体重和围度测量记录，跨训练周期共享。
 */
export const useBodyMetricStore = defineStore('bodyMetric', () => {
  /** 体测记录列表（按日期排序） */
  const metrics = ref<BodyMetric[]>([])

  /** 从持久化存储加载所有体测记录 */
  async function load(): Promise<void> {
    const provider = getProvider()
    metrics.value = await provider.loadMetrics()
  }

  /** 持久化当前体测记录 */
  function save(): void {
    const provider = getProvider()
    provider.saveMetrics(metrics.value)
  }

  /**
   * 添加或更新体测记录（同日期则覆盖）。
   *
   * @param metric - 体测数据
   */
  function addMetric(metric: BodyMetric): void {
    const now = new Date().toISOString()
    const entry = { ...metric, updatedAt: now }
    const existingIndex = metrics.value.findIndex((m: BodyMetric) => m.date === entry.date)
    if (existingIndex >= 0) {
      metrics.value[existingIndex] = entry
    } else {
      metrics.value.push(entry)
    }
    save()
  }

  /**
   * 获取最新的体测记录（按日期降序取第一条）。
   *
   * @returns 最新的体测记录，若没有任何记录则返回 undefined
   */
  function getLatestMetric(): BodyMetric | undefined {
    if (metrics.value.length === 0) {
      return undefined
    }
    return [...metrics.value].sort((a, b) => b.date.localeCompare(a.date))[0]
  }

  /**
   * 获取指定日期范围内的体测记录。
   *
   * @param startDate - 起始日期（含），格式 "YYYY-MM-DD"
   * @param endDate - 结束日期（含），格式 "YYYY-MM-DD"
   * @returns 范围内的体测记录列表
   */
  function getMetricsInRange(startDate: string, endDate: string): BodyMetric[] {
    return metrics.value.filter((m: BodyMetric) => m.date >= startDate && m.date <= endDate)
  }

  /**
   * 删除指定 ID 的体测记录。
   *
   * @param id - 体测记录 ID
   */
  function deleteMetric(id: string): void {
    metrics.value = metrics.value.filter((m: BodyMetric) => m.id !== id)
    save()
  }

  return { metrics, load, save, addMetric, getLatestMetric, getMetricsInRange, deleteMetric }
})
