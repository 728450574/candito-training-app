import type { Cycle } from '@/types/cycle'
import type { WorkoutRecord } from '@/types/record'
import type { BodyMetric } from '@/types/bodyMetric'
import type { UserSettings } from '@/types/settings'
import type { StorageProvider } from './types'
import { getDb, isAuthenticated } from '@/services/cloudbase'

/**
 * CloudBase NoSQL 云端存储提供者。
 *
 * 集合设计：
 * - cycles: 每个周期一个文档，doc._id = cycle.id
 * - records: 每条训练记录一个文档，doc._id = record.id，含 cycleId 字段
 * - metrics: 每条体重记录一个文档，doc._id = metric.id
 * - user_state: 单文档，包含 { activeCycleId, settings }
 *
 * 安全规则：PRIVATE（用户只能读写自己的数据，_openid 自动注入）
 *
 * save 方法为 sync 接口，内部使用写队列 + debounce 异步同步到云端。
 */

const COLLECTIONS = {
  cycles: 'cycles',
  records: 'records',
  metrics: 'metrics',
  userState: 'user_state',
} as const

const USER_STATE_DOC = 'state'

type WriteFn = () => Promise<void>

export class CloudBaseProvider implements StorageProvider {
  readonly mode = 'cloud' as const
  private initialized = false
  private writeQueue = new Map<string, WriteFn>()
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private cachedCycleIds: Set<string> = new Set()
  private cachedMetricIds: Set<string> = new Set()

  async init(): Promise<void> {
    if (this.initialized) return
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      throw new Error('未登录，无法初始化云端存储')
    }
    this.initialized = true
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    const writes = Array.from(this.writeQueue.values())
    this.writeQueue.clear()
    await Promise.allSettled(writes.map(fn => fn()))
  }

  private queueWrite(key: string, fn: WriteFn): void {
    this.writeQueue.set(key, fn)
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => {
      void this.flush()
    }, 1000)
  }

  // --- Cycles ---
  async loadCycles(): Promise<Cycle[]> {
    const db = getDb()
    if (!db) return []
    try {
      const result = await db.collection(COLLECTIONS.cycles).get()
      const cycles = (result.data || []) as unknown as Cycle[]
      this.cachedCycleIds = new Set(cycles.map(c => c.id))
      return cycles
    } catch (err) {
      console.error('加载周期失败:', err)
      return []
    }
  }

  saveCycles(cycles: Cycle[]): void {
    this.queueWrite('cycles', async () => {
      const db = getDb()
      if (!db) return
      const collection = db.collection(COLLECTIONS.cycles)
      const newIds = new Set(cycles.map(c => c.id))

      for (const cycle of cycles) {
        await collection.doc(cycle.id).set({ ...cycle })
      }

      for (const oldId of this.cachedCycleIds) {
        if (!newIds.has(oldId)) {
          await collection.doc(oldId).remove()
        }
      }

      this.cachedCycleIds = newIds
    })
  }

  // --- Active Cycle ID ---
  async loadActiveCycleId(): Promise<string | null> {
    const db = getDb()
    if (!db) return null
    try {
      const result = await db.collection(COLLECTIONS.userState).doc(USER_STATE_DOC).get()
      const data = result.data as { activeCycleId?: string } | null
      return data?.activeCycleId ?? null
    } catch {
      return null
    }
  }

  saveActiveCycleId(id: string | null): void {
    this.queueWrite('activeCycleId', async () => {
      const db = getDb()
      if (!db) return
      await db.collection(COLLECTIONS.userState).doc(USER_STATE_DOC).set({
        activeCycleId: id ?? '',
      })
    })
  }

  // --- Records ---
  async loadRecords(cycleId: string): Promise<WorkoutRecord[]> {
    const db = getDb()
    if (!db) return []
    try {
      const result = await db.collection(COLLECTIONS.records)
        .where({ cycleId })
        .get()
      const records = (result.data || []) as unknown as WorkoutRecord[]
      return records
    } catch (err) {
      console.error('加载训练记录失败:', err)
      return []
    }
  }

  saveRecords(cycleId: string, records: WorkoutRecord[]): void {
    this.queueWrite(`records_${cycleId}`, async () => {
      const db = getDb()
      if (!db) return
      const collection = db.collection(COLLECTIONS.records)

      try {
        await collection.where({ cycleId }).remove()
      } catch (err) {
        console.error('删除旧记录失败:', err)
      }

      for (const record of records) {
        try {
          await collection.doc(record.id).set({ ...record, cycleId })
        } catch (err) {
          console.error('写入训练记录失败:', record.id, err)
        }
      }
    })
  }

  async loadAllRecordCycleIds(): Promise<string[]> {
    const db = getDb()
    if (!db) return []
    try {
      const result = await db.collection(COLLECTIONS.records).get()
      const records = (result.data || []) as { cycleId: string }[]
      const ids = [...new Set(records.map(r => r.cycleId))]
      return ids
    } catch (err) {
      console.error('加载记录 cycleId 列表失败:', err)
      return []
    }
  }

  removeAllRecordsForCycle(cycleId: string): void {
    this.queueWrite(`records_${cycleId}`, async () => {
      const db = getDb()
      if (!db) return
      try {
        await db.collection(COLLECTIONS.records).where({ cycleId }).remove()
      } catch (err) {
        console.error('删除周期记录失败:', err)
      }
    })
  }

  // --- Body Metrics ---
  async loadMetrics(): Promise<BodyMetric[]> {
    const db = getDb()
    if (!db) return []
    try {
      const result = await db.collection(COLLECTIONS.metrics).get()
      const metrics = (result.data || []) as unknown as BodyMetric[]
      this.cachedMetricIds = new Set(metrics.map(m => m.id))
      return metrics
    } catch (err) {
      console.error('加载体重记录失败:', err)
      return []
    }
  }

  saveMetrics(metrics: BodyMetric[]): void {
    this.queueWrite('metrics', async () => {
      const db = getDb()
      if (!db) return
      const collection = db.collection(COLLECTIONS.metrics)
      const newIds = new Set(metrics.map(m => m.id))

      for (const metric of metrics) {
        await collection.doc(metric.id).set({ ...metric })
      }

      for (const oldId of this.cachedMetricIds) {
        if (!newIds.has(oldId)) {
          await collection.doc(oldId).remove()
        }
      }

      this.cachedMetricIds = newIds
    })
  }

  // --- Settings ---
  async loadSettings(): Promise<Partial<UserSettings> | null> {
    const db = getDb()
    if (!db) return null
    try {
      const result = await db.collection(COLLECTIONS.userState).doc('settings').get()
      const data = result.data as Partial<UserSettings> | null
      return data
    } catch {
      return null
    }
  }

  saveSettings(settings: UserSettings): void {
    this.queueWrite('settings', async () => {
      const db = getDb()
      if (!db) return
      // 确保至少有一个字段，避免空对象导致 API 报 "data is required"
      const payload = { ...settings }
      if (Object.keys(payload).length === 0) return
      await db.collection(COLLECTIONS.userState).doc('settings').set(payload)
    })
  }
}
