// 训练记录 Store — TS 单例模块
// 由原 H5 Pinia store `candito-v4-training-app/src/stores/recordStore.ts` 1:1 迁移。
// 业务逻辑（按 cycleId 分组存储、CRUD、查询）逐行等价，仅将 Vue ref 改为命令式状态 + 订阅通知，
// 并将 localStorage 同步 IO 改为通过 storageManager 抽象的异步 Promise IO。
//
// 关键适配：原 getCycleIds() 用 localStorage.key(i) 遍历，小程序改用
//   storageManager.getActiveAdapter().list('candito_records_') 获取所有记录 key，提取 cycleId。
//
// Storage key（与原 H5 一致）：
//   - candito_records_{cycleId} — 单个周期的训练记录（WorkoutRecord[]），前缀 candito_records_

import { storageManager } from '../utils/storage/storageManager'
import type { WorkoutRecord } from '../types/record'

const STORAGE_PREFIX = 'candito_records_'

class RecordStore {
  private recordsByCycle: Record<string, WorkoutRecord[]> = {}
  private listeners: Array<() => void> = []

  // ---------- 订阅模式 ----------
  subscribe(fn: () => void): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn)
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }

  // ---------- 状态访问 ----------
  /** 返回 recordsByCycle 的浅拷贝（顶层 key 复制，数组引用保持） */
  getRecordsByCycle(): Record<string, WorkoutRecord[]> {
    return { ...this.recordsByCycle }
  }

  // ---------- 内部工具 ----------
  /** 等价原 storageKey：前缀 + cycleId */
  private storageKey(cycleId: string): string {
    return STORAGE_PREFIX + cycleId
  }

  // ---------- 持久化 / 加载 ----------

  /** 等价原 loadRecords：从存储加载指定周期记录到内存并返回；失败返回空数组 */
  async loadRecords(cycleId: string): Promise<WorkoutRecord[]> {
    try {
      const records = await storageManager.getActiveAdapter().get<WorkoutRecord[]>(this.storageKey(cycleId))
      const list: WorkoutRecord[] = records ? records : []
      this.recordsByCycle[cycleId] = list
      this.notify()
      return list
    } catch {
      this.recordsByCycle[cycleId] = []
      this.notify()
      return []
    }
  }

  /** 等价原 saveRecords：保存指定周期记录到存储；内存中无该周期则不操作 */
  async saveRecords(cycleId: string): Promise<void> {
    const records = this.recordsByCycle[cycleId]
    if (!records) {
      return
    }
    try {
      await storageManager.getActiveAdapter().set(this.storageKey(cycleId), records)
    } catch {
      // storage full or unavailable
    }
  }

  /**
   * 顶层 load：原 recordStore 无此方法（按周期懒加载），此处为 app.ts 统一初始化入口。
   * 保持原懒加载语义：不预加载任何周期数据，仅作为安全 no-op（带 try-catch）。
   * 实际数据在各周期首次访问时通过 loadRecords(cycleId) 加载。
   */
  async load(): Promise<void> {
    try {
      // 懒加载：不预读，保持与原 H5 一致的行为
    } catch {
      // 加载失败使用默认空状态
    }
  }

  // ---------- actions（业务逻辑逐行等价） ----------

  /** 等价原 addRecord：确保该 cycleId 已加载，push 记录，saveRecords */
  async addRecord(record: WorkoutRecord): Promise<void> {
    const { cycleId } = record
    if (!this.recordsByCycle[cycleId]) {
      await this.loadRecords(cycleId)
    }
    this.recordsByCycle[cycleId].push(record)
    await this.saveRecords(cycleId)
    this.notify()
  }

  /** 等价原 getRecordsForCycle：内存无则加载，返回该周期全部记录 */
  async getRecordsForCycle(cycleId: string): Promise<WorkoutRecord[]> {
    if (!this.recordsByCycle[cycleId]) {
      return await this.loadRecords(cycleId)
    }
    return this.recordsByCycle[cycleId]
  }

  /** 等价原 getRecordsForWeek：过滤指定周次记录 */
  async getRecordsForWeek(cycleId: string, weekNumber: number): Promise<WorkoutRecord[]> {
    const records = await this.getRecordsForCycle(cycleId)
    return records.filter((r) => r.weekNumber === weekNumber)
  }

  /** 等价原 getRecordForDay：查找指定周/天的记录 */
  async getRecordForDay(cycleId: string, weekNumber: number, dayNumber: number): Promise<WorkoutRecord | undefined> {
    const records = await this.getRecordsForCycle(cycleId)
    return records.find((r) => r.weekNumber === weekNumber && r.dayNumber === dayNumber)
  }

  /**
   * 等价原 getCycleIds：列出所有存在训练记录的 cycleId。
   * 适配：原用 localStorage.key(i) 遍历，小程序改用 adapter.list(prefix) + 切片提取 cycleId。
   */
  async getCycleIds(): Promise<string[]> {
    try {
      const keys = await storageManager.getActiveAdapter().list(STORAGE_PREFIX)
      return keys.map((k) => k.slice(STORAGE_PREFIX.length))
    } catch {
      return []
    }
  }
}

export const recordStore = new RecordStore()
