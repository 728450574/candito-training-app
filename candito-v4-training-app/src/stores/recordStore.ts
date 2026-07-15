import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { WorkoutRecord } from '@/types/record'
import { getProvider } from '@/services/storage'

/**
 * 训练记录 Store。
 * 类比 Java：WorkoutRecordRepository，管理所有周期的训练记录读写。
 *
 * 设计特点：
 * - 按 cycleId 分片存储（recordsByCycle），对应 CloudBase 中按 cycleId 筛选的文档集合
 * - 启动时通过 loadAll() 预加载全部记录到内存，后续读取均为同步 O(1)
 * - 写操作先更新内存再异步持久化到 Provider
 */
export const useRecordStore = defineStore('record', () => {
  /** 按 cycleId 分组的训练记录（key: cycleId, value: 该周期的所有记录） */
  const recordsByCycle = ref<Record<string, WorkoutRecord[]>>({})
  /** 已加载过的 cycleId 集合，避免重复加载 */
  const loadedCycleIds = new Set<string>()

  /**
   * 异步预加载所有周期记录到内存。
   * 在应用启动时调用，之后所有同步读取方法从内存缓存获取。
   *
   * @param cycleIds - 需要预加载的周期 ID 列表（通常来自 cycleStore.cycles）
   */
  async function loadAll(cycleIds: string[]): Promise<void> {
    const provider = getProvider()
    for (const cycleId of cycleIds) {
      if (!loadedCycleIds.has(cycleId)) {
        recordsByCycle.value[cycleId] = await provider.loadRecords(cycleId)
        loadedCycleIds.add(cycleId)
      }
    }
    // 加载孤儿记录（cycleId 不在已知列表中的记录，如已删除周期的残留数据）
    const allCycleIds = await provider.loadAllRecordCycleIds()
    for (const cycleId of allCycleIds) {
      if (!loadedCycleIds.has(cycleId)) {
        recordsByCycle.value[cycleId] = await provider.loadRecords(cycleId)
        loadedCycleIds.add(cycleId)
      }
    }
  }

  /**
   * 同步获取某周期的训练记录（从内存缓存）。
   * 调用前需确保 loadAll() 已完成。
   *
   * @param cycleId - 周期 ID
   * @returns 该周期的训练记录列表，未加载则返回空数组
   */
  function loadRecords(cycleId: string): WorkoutRecord[] {
    if (!loadedCycleIds.has(cycleId)) {
      recordsByCycle.value[cycleId] = []
      loadedCycleIds.add(cycleId)
    }
    return recordsByCycle.value[cycleId] ?? []
  }

  /** 持久化指定周期的训练记录到 Provider */
  function saveRecords(cycleId: string): void {
    const provider = getProvider()
    const records = recordsByCycle.value[cycleId]
    if (!records) return
    provider.saveRecords(cycleId, records)
  }

  /**
   * 添加一条训练记录并持久化。
   *
   * @param record - 训练记录实体
   */
  function addRecord(record: WorkoutRecord): void {
    const { cycleId } = record
    if (!recordsByCycle.value[cycleId]) {
      recordsByCycle.value[cycleId] = []
      loadedCycleIds.add(cycleId)
    }
    const entry = { ...record, updatedAt: new Date().toISOString() }
    recordsByCycle.value[cycleId].push(entry)
    saveRecords(cycleId)
  }

  /**
   * 获取某周期的所有训练记录。
   *
   * @param cycleId - 周期 ID
   * @returns 训练记录列表
   */
  function getRecordsForCycle(cycleId: string): WorkoutRecord[] {
    return loadRecords(cycleId)
  }

  /**
   * 获取某周期指定周的所有训练记录。
   *
   * @param cycleId - 周期 ID
   * @param weekNumber - 周序号（1-6）
   * @returns 该周的训练记录列表
   */
  function getRecordsForWeek(cycleId: string, weekNumber: number): WorkoutRecord[] {
    return getRecordsForCycle(cycleId).filter(r => r.weekNumber === weekNumber)
  }

  /**
   * 获取某周期指定训练日的训练记录。
   *
   * @param cycleId - 周期 ID
   * @param weekNumber - 周序号
   * @param dayNumber - 训练日序号
   * @returns 训练记录，若该日未训练则返回 undefined
   */
  function getRecordForDay(cycleId: string, weekNumber: number, dayNumber: number): WorkoutRecord | undefined {
    return getRecordsForCycle(cycleId).find(r => r.weekNumber === weekNumber && r.dayNumber === dayNumber)
  }

  /** 获取所有有记录缓存的周期 ID 列表 */
  function getCycleIds(): string[] {
    return Object.keys(recordsByCycle.value)
  }

  /**
   * 删除某周期的所有训练记录（包括持久化存储）。
   *
   * @param cycleId - 周期 ID
   */
  function removeRecordsForCycle(cycleId: string): void {
    const provider = getProvider()
    delete recordsByCycle.value[cycleId]
    loadedCycleIds.delete(cycleId)
    provider.removeAllRecordsForCycle(cycleId)
  }

  /** 重置所有记录缓存（用于登出/切换用户） */
  function reset(): void {
    recordsByCycle.value = {}
    loadedCycleIds.clear()
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
    reset,
  }
})
