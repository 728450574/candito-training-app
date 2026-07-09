import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { BodyMetric } from '@/types/bodyMetric'

const STORAGE_KEY = 'candito_metrics'

export const useBodyMetricStore = defineStore('bodyMetric', () => {
  const metrics = ref<BodyMetric[]>([])

  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      metrics.value = raw ? JSON.parse(raw) as BodyMetric[] : []
    } catch {
      metrics.value = []
    }
  }

  function save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics.value))
    } catch {
      // storage full or unavailable
    }
  }

  function addMetric(metric: BodyMetric): void {
    const existingIndex = metrics.value.findIndex((m: BodyMetric) => m.date === metric.date)
    if (existingIndex >= 0) {
      metrics.value[existingIndex] = metric
    } else {
      metrics.value.push(metric)
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

  load()

  return { metrics, load, save, addMetric, getLatestMetric, getMetricsInRange, deleteMetric }
})
