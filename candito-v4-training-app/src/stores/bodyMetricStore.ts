import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { BodyMetric } from '@/types/bodyMetric'
import { getProvider } from '@/services/storage'

export const useBodyMetricStore = defineStore('bodyMetric', () => {
  const metrics = ref<BodyMetric[]>([])

  async function load(): Promise<void> {
    const provider = getProvider()
    metrics.value = await provider.loadMetrics()
  }

  function save(): void {
    const provider = getProvider()
    provider.saveMetrics(metrics.value)
  }

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

  function getLatestMetric(): BodyMetric | undefined {
    if (metrics.value.length === 0) {
      return undefined
    }
    return [...metrics.value].sort((a, b) => b.date.localeCompare(a.date))[0]
  }

  function getMetricsInRange(startDate: string, endDate: string): BodyMetric[] {
    return metrics.value.filter((m: BodyMetric) => m.date >= startDate && m.date <= endDate)
  }

  function deleteMetric(id: string): void {
    metrics.value = metrics.value.filter((m: BodyMetric) => m.id !== id)
    save()
  }

  return { metrics, load, save, addMetric, getLatestMetric, getMetricsInRange, deleteMetric }
})
