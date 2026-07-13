import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { WorkoutRecord } from '@/types/record'
import { getProvider } from '@/services/storage'

export const useRecordStore = defineStore('record', () => {
  const recordsByCycle = ref<Record<string, WorkoutRecord[]>>({})
  const loadedCycleIds = new Set<string>()

  /**
   * 异步预加载所有周期记录到内存。
   * 在应用启动时调用，之后所有同步读取方法从内存缓存获取。
   */
  async function loadAll(cycleIds: string[]): Promise<void> {
    const provider = getProvider()
    for (const cycleId of cycleIds) {
      if (!loadedCycleIds.has(cycleId)) {
        recordsByCycle.value[cycleId] = await provider.loadRecords(cycleId)
        loadedCycleIds.add(cycleId)
      }
    }
    // 加载孤儿记录（cycleId 不在已知列表中的记录）
    const allCycleIds = await provider.loadAllRecordCycleIds()
    for (const cycleId of allCycleIds) {
      if (!loadedCycleIds.has(cycleId)) {
        recordsByCycle.value[cycleId] = await provider.loadRecords(cycleId)
        loadedCycleIds.add(cycleId)
      }
    }
  }

  function loadRecords(cycleId: string): WorkoutRecord[] {
    if (!loadedCycleIds.has(cycleId)) {
      // 兜底：返回空数组（应在 loadAll 后调用）
      recordsByCycle.value[cycleId] = []
      loadedCycleIds.add(cycleId)
    }
    return recordsByCycle.value[cycleId] ?? []
  }

  function saveRecords(cycleId: string): void {
    const provider = getProvider()
    const records = recordsByCycle.value[cycleId]
    if (!records) return
    provider.saveRecords(cycleId, records)
  }

  function addRecord(record: WorkoutRecord): void {
    const { cycleId } = record
    if (!recordsByCycle.value[cycleId]) {
      recordsByCycle.value[cycleId] = []
      loadedCycleIds.add(cycleId)
    }
    recordsByCycle.value[cycleId].push(record)
    saveRecords(cycleId)
  }

  function getRecordsForCycle(cycleId: string): WorkoutRecord[] {
    return loadRecords(cycleId)
  }

  function getRecordsForWeek(cycleId: string, weekNumber: number): WorkoutRecord[] {
    return getRecordsForCycle(cycleId).filter(r => r.weekNumber === weekNumber)
  }

  function getRecordForDay(cycleId: string, weekNumber: number, dayNumber: number): WorkoutRecord | undefined {
    return getRecordsForCycle(cycleId).find(r => r.weekNumber === weekNumber && r.dayNumber === dayNumber)
  }

  function getCycleIds(): string[] {
    return Object.keys(recordsByCycle.value)
  }

  function removeRecordsForCycle(cycleId: string): void {
    const provider = getProvider()
    delete recordsByCycle.value[cycleId]
    loadedCycleIds.delete(cycleId)
    provider.removeAllRecordsForCycle(cycleId)
  }

  return {
    recordsByCycle,
    loadAll,
    loadRecords,
    saveRecords,
    addRecord,
    getRecordsForCycle,
    getRecordsForWeek,
    getRecordForDay,
    getCycleIds,
    removeRecordsForCycle,
  }
})
