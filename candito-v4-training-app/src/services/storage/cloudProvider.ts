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
 *
 * 容错机制：每次保存时同时写入 localStorage 备份，加载时若云端为空则从备份恢复。
 * 防止因云端写入未 flush、网络故障等导致数据丢失。
 */

const COLLECTIONS = {
  cycles: 'cycles',
  records: 'records',
  metrics: 'metrics',
  userState: 'user_state',
} as const

const USER_STATE_DOC = 'state'

// localStorage 备份 key（与 LocalStorageProvider 保持一致）
const BACKUP_CYCLES_KEY = 'candito_cycles'
const BACKUP_ACTIVE_KEY = 'candito_active_cycle'
const BACKUP_RECORDS_PREFIX = 'candito_records_'
const BACKUP_METRICS_KEY = 'candito_metrics'
const BACKUP_SETTINGS_KEY = 'candito_settings'

type WriteFn = () => Promise<void>

function writeBackup(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable
  }
}

function readBackup<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

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

  /** 同步写入 localStorage 备份（用于页面关闭前快速保存） */
  syncBackup(cycles: Cycle[], activeCycleId: string | null, recordsByCycle: Record<string, WorkoutRecord[]>, metrics: BodyMetric[], settings: UserSettings): void {
    writeBackup(BACKUP_CYCLES_KEY, cycles)
    if (activeCycleId !== null) {
      writeBackup(BACKUP_ACTIVE_KEY, activeCycleId)
    }
    for (const [cycleId, records] of Object.entries(recordsByCycle)) {
      writeBackup(BACKUP_RECORDS_PREFIX + cycleId, records)
    }
    writeBackup(BACKUP_METRICS_KEY, metrics)
    writeBackup(BACKUP_SETTINGS_KEY, settings)
  }

  private queueWrite(key: string, fn: WriteFn): void {
    this.writeQueue.set(key, fn)
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => {
      void this.flush()
    }, 200)
  }

  // --- Cycles ---
  async loadCycles(): Promise<Cycle[]> {
    const db = getDb()
    if (!db) return []
    try {
      const result = await db.collection(COLLECTIONS.cycles).get()
      const cycles = (result.data || []) as unknown as Cycle[]
      this.cachedCycleIds = new Set(cycles.map(c => c.id))
      if (cycles.length > 0) {
        writeBackup(BACKUP_CYCLES_KEY, cycles)
      } else {
        const backup = readBackup<Cycle[]>(BACKUP_CYCLES_KEY)
        if (backup && backup.length > 0) {
          return backup
        }
      }
      return cycles
    } catch (err) {
      console.error('加载周期失败，尝试从备份恢复:', err)
      const backup = readBackup<Cycle[]>(BACKUP_CYCLES_KEY)
      return backup ?? []
    }
  }

  saveCycles(cycles: Cycle[]): void {
    this.queueWrite('cycles', async () => {
      const db = getDb()
      if (!db) return
      const collection = db.collection(COLLECTIONS.cycles)
      const newIds = new Set(cycles.map(c => c.id))

      for (const cycle of cycles) {
        try {
          const payload = JSON.parse(JSON.stringify(cycle))
          await collection.doc(cycle.id).set(payload)
        } catch (err) {
          console.error('写入周期失败:', cycle.id, err)
        }
      }

      for (const oldId of this.cachedCycleIds) {
        if (!newIds.has(oldId)) {
          try {
            await collection.doc(oldId).remove()
          } catch (err) {
            console.error('删除旧周期失败:', oldId, err)
          }
        }
      }

      this.cachedCycleIds = newIds
      writeBackup(BACKUP_CYCLES_KEY, cycles)
    })
  }

  // --- Active Cycle ID ---
  async loadActiveCycleId(): Promise<string | null> {
    const db = getDb()
    if (!db) return null
    try {
      const result = await db.collection(COLLECTIONS.userState).doc(USER_STATE_DOC).get()
      const data = result.data as { activeCycleId?: string } | null
      const id = data?.activeCycleId ?? null
      if (id) {
        writeBackup(BACKUP_ACTIVE_KEY, id)
      } else {
        const backup = readBackup<string>(BACKUP_ACTIVE_KEY)
        if (backup) return backup
      }
      return id
    } catch {
      return readBackup<string>(BACKUP_ACTIVE_KEY)
    }
  }

  saveActiveCycleId(id: string | null): void {
    this.queueWrite('activeCycleId', async () => {
      const db = getDb()
      if (!db) return
      await db.collection(COLLECTIONS.userState).doc(USER_STATE_DOC).set({
        activeCycleId: id ?? '',
      })
      if (id !== null) {
        writeBackup(BACKUP_ACTIVE_KEY, id)
      } else {
        try {
          localStorage.removeItem(BACKUP_ACTIVE_KEY)
        } catch {
          // ignore
        }
      }
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
      if (records.length > 0) {
        writeBackup(BACKUP_RECORDS_PREFIX + cycleId, records)
      } else {
        const backup = readBackup<WorkoutRecord[]>(BACKUP_RECORDS_PREFIX + cycleId)
        if (backup && backup.length > 0) {
          return backup
        }
      }
      return records
    } catch (err) {
      console.error('加载训练记录失败，尝试从备份恢复:', err)
      const backup = readBackup<WorkoutRecord[]>(BACKUP_RECORDS_PREFIX + cycleId)
      return backup ?? []
    }
  }

  saveRecords(cycleId: string, records: WorkoutRecord[]): void {
    this.queueWrite(`records_${cycleId}`, async () => {
      const db = getDb()
      if (!db) return
      const collection = db.collection(COLLECTIONS.records)

      let existingIds = new Set<string>()
      try {
        const result = await collection.where({ cycleId }).get()
        existingIds = new Set((result.data || []).map((r: any) => r.id))
      } catch (err) {
        console.error('查询云端记录失败:', err)
      }

      const newIds = new Set<string>()
      for (const record of records) {
        newIds.add(record.id)
        try {
          const payload = JSON.parse(JSON.stringify({ ...record, cycleId }))
          await collection.doc(record.id).set(payload)
        } catch (err) {
          console.error('写入训练记录失败:', record.id, err)
        }
      }

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          try {
            await collection.doc(oldId).remove()
          } catch (err) {
            console.error('删除旧记录失败:', oldId, err)
          }
        }
      }

      writeBackup(BACKUP_RECORDS_PREFIX + cycleId, records)
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
      try {
        localStorage.removeItem(BACKUP_RECORDS_PREFIX + cycleId)
      } catch {
        // ignore
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
      if (metrics.length > 0) {
        writeBackup(BACKUP_METRICS_KEY, metrics)
      } else {
        const backup = readBackup<BodyMetric[]>(BACKUP_METRICS_KEY)
        if (backup && backup.length > 0) {
          return backup
        }
      }
      return metrics
    } catch (err) {
      console.error('加载体重记录失败，尝试从备份恢复:', err)
      const backup = readBackup<BodyMetric[]>(BACKUP_METRICS_KEY)
      return backup ?? []
    }
  }

  saveMetrics(metrics: BodyMetric[]): void {
    this.queueWrite('metrics', async () => {
      const db = getDb()
      if (!db) return
      const collection = db.collection(COLLECTIONS.metrics)
      const newIds = new Set(metrics.map(m => m.id))

      for (const metric of metrics) {
        try {
          const payload = JSON.parse(JSON.stringify(metric))
          await collection.doc(metric.id).set(payload)
        } catch (err) {
          console.error('写入体重记录失败:', metric.id, err)
        }
      }

      for (const oldId of this.cachedMetricIds) {
        if (!newIds.has(oldId)) {
          try {
            await collection.doc(oldId).remove()
          } catch (err) {
            console.error('删除旧体重记录失败:', oldId, err)
          }
        }
      }

      this.cachedMetricIds = newIds
      writeBackup(BACKUP_METRICS_KEY, metrics)
    })
  }

  // --- Settings ---
  async loadSettings(): Promise<Partial<UserSettings> | null> {
    const db = getDb()
    if (!db) return null
    try {
      const result = await db.collection(COLLECTIONS.userState).doc('settings').get()
      const data = result.data as Partial<UserSettings> | null
      if (data && Object.keys(data).length > 0) {
        writeBackup(BACKUP_SETTINGS_KEY, data)
      } else {
        const backup = readBackup<Partial<UserSettings>>(BACKUP_SETTINGS_KEY)
        if (backup && Object.keys(backup).length > 0) {
          return backup
        }
      }
      return data
    } catch {
      return readBackup<Partial<UserSettings>>(BACKUP_SETTINGS_KEY)
    }
  }

  saveSettings(settings: UserSettings): void {
    this.queueWrite('settings', async () => {
      const db = getDb()
      if (!db) return
      const payload = JSON.parse(JSON.stringify(settings))
      if (Object.keys(payload).length === 0) return
      await db.collection(COLLECTIONS.userState).doc('settings').set(payload)
      writeBackup(BACKUP_SETTINGS_KEY, payload)
    })
  }
}
