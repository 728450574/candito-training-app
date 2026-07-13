import type { Cycle } from '@/types/cycle'
import type { WorkoutRecord } from '@/types/record'
import type { BodyMetric } from '@/types/bodyMetric'
import type { UserSettings } from '@/types/settings'
import type { StorageProvider } from './types'

/**
 * 本地存储提供者，包装 localStorage。
 * 行为与重构前完全一致，load 方法返回 Promise 但实际同步。
 */

const CYCLES_KEY = 'candito_cycles'
const ACTIVE_KEY = 'candito_active_cycle'
const RECORDS_PREFIX = 'candito_records_'
const METRICS_KEY = 'candito_metrics'
const SETTINGS_KEY = 'candito_settings'

export class LocalStorageProvider implements StorageProvider {
  readonly mode = 'local' as const

  async init(): Promise<void> {
    // 无需初始化
  }

  async flush(): Promise<void> {
    // 同步写入，无需 flush
  }

  async loadCycles(): Promise<Cycle[]> {
    try {
      const raw = localStorage.getItem(CYCLES_KEY)
      return raw ? JSON.parse(raw) as Cycle[] : []
    } catch {
      return []
    }
  }

  saveCycles(cycles: Cycle[]): void {
    try {
      localStorage.setItem(CYCLES_KEY, JSON.stringify(cycles))
    } catch {
      // storage full or unavailable
    }
  }

  async loadActiveCycleId(): Promise<string | null> {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY)
      return raw ? JSON.parse(raw) as string : null
    } catch {
      return null
    }
  }

  saveActiveCycleId(id: string | null): void {
    try {
      if (id !== null) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(id))
      } else {
        localStorage.removeItem(ACTIVE_KEY)
      }
    } catch {
      // storage full or unavailable
    }
  }

  async loadRecords(cycleId: string): Promise<WorkoutRecord[]> {
    try {
      const raw = localStorage.getItem(RECORDS_PREFIX + cycleId)
      return raw ? JSON.parse(raw) as WorkoutRecord[] : []
    } catch {
      return []
    }
  }

  saveRecords(cycleId: string, records: WorkoutRecord[]): void {
    try {
      localStorage.setItem(RECORDS_PREFIX + cycleId, JSON.stringify(records))
    } catch {
      // storage full or unavailable
    }
  }

  async loadAllRecordCycleIds(): Promise<string[]> {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(RECORDS_PREFIX)) {
        ids.push(key.slice(RECORDS_PREFIX.length))
      }
    }
    return ids
  }

  removeAllRecordsForCycle(cycleId: string): void {
    localStorage.removeItem(RECORDS_PREFIX + cycleId)
  }

  async loadMetrics(): Promise<BodyMetric[]> {
    try {
      const raw = localStorage.getItem(METRICS_KEY)
      return raw ? JSON.parse(raw) as BodyMetric[] : []
    } catch {
      return []
    }
  }

  saveMetrics(metrics: BodyMetric[]): void {
    try {
      localStorage.setItem(METRICS_KEY, JSON.stringify(metrics))
    } catch {
      // storage full or unavailable
    }
  }

  async loadSettings(): Promise<Partial<UserSettings> | null> {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw ? JSON.parse(raw) as Partial<UserSettings> : null
    } catch {
      return null
    }
  }

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // storage full or unavailable
    }
  }
}
