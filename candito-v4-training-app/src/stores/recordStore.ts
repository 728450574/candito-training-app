import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { WorkoutRecord } from '@/types/record'

const STORAGE_PREFIX = 'candito_records_'

export const useRecordStore = defineStore('record', () => {
  const recordsByCycle = ref<Record<string, WorkoutRecord[]>>({})

  function storageKey(cycleId: string): string {
    return STORAGE_PREFIX + cycleId
  }

  function loadRecords(cycleId: string): WorkoutRecord[] {
    try {
      const raw = localStorage.getItem(storageKey(cycleId))
      const records: WorkoutRecord[] = raw ? JSON.parse(raw) as WorkoutRecord[] : []
      recordsByCycle.value[cycleId] = records
      return records
    } catch {
      recordsByCycle.value[cycleId] = []
      return []
    }
  }

  function saveRecords(cycleId: string): void {
    const records = recordsByCycle.value[cycleId]
    if (!records) {
      return
    }
    try {
      localStorage.setItem(storageKey(cycleId), JSON.stringify(records))
    } catch {
      // storage full or unavailable
    }
  }

  function addRecord(record: WorkoutRecord): void {
    const { cycleId } = record
    if (!recordsByCycle.value[cycleId]) {
      recordsByCycle.value[cycleId] = loadRecords(cycleId)
    }
    recordsByCycle.value[cycleId].push(record)
    saveRecords(cycleId)
  }

  function getRecordsForCycle(cycleId: string): WorkoutRecord[] {
    if (!recordsByCycle.value[cycleId]) {
      return loadRecords(cycleId)
    }
    return recordsByCycle.value[cycleId]
  }

  function getRecordsForWeek(cycleId: string, weekNumber: number): WorkoutRecord[] {
    return getRecordsForCycle(cycleId).filter(r => r.weekNumber === weekNumber)
  }

  function getRecordForDay(cycleId: string, weekNumber: number, dayNumber: number): WorkoutRecord | undefined {
    return getRecordsForCycle(cycleId).find(r => r.weekNumber === weekNumber && r.dayNumber === dayNumber)
  }

  function getCycleIds(): string[] {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        ids.push(key.slice(STORAGE_PREFIX.length))
      }
    }
    return ids
  }

  return {
    recordsByCycle,
    loadRecords,
    saveRecords,
    addRecord,
    getRecordsForCycle,
    getRecordsForWeek,
    getRecordForDay,
    getCycleIds,
  }
})
