import type { Cycle } from '@/types/cycle'
import type { WorkoutRecord } from '@/types/record'
import type { BodyMetric } from '@/types/bodyMetric'
import type { UserSettings } from '@/types/settings'

export type StorageMode = 'local' | 'cloud'

export interface StorageProvider {
  readonly mode: StorageMode
  init(): Promise<void>
  flush(): Promise<void>
  syncBackup?(cycles: Cycle[], activeCycleId: string | null, recordsByCycle: Record<string, WorkoutRecord[]>, metrics: BodyMetric[], settings: UserSettings): void
  loadCycles(): Promise<Cycle[]>
  saveCycles(cycles: Cycle[]): void
  loadActiveCycleId(): Promise<string | null>
  saveActiveCycleId(id: string | null): void
  loadRecords(cycleId: string): Promise<WorkoutRecord[]>
  saveRecords(cycleId: string, records: WorkoutRecord[]): void
  loadAllRecordCycleIds(): Promise<string[]>
  removeAllRecordsForCycle(cycleId: string): void
  loadMetrics(): Promise<BodyMetric[]>
  saveMetrics(metrics: BodyMetric[]): void
  loadSettings(): Promise<Partial<UserSettings> | null>
  saveSettings(settings: UserSettings): void
}

export interface ExportData {
  cycles: Cycle[]
  activeCycleId: string | null
  recordsByCycle: Record<string, WorkoutRecord[]>
  metrics: BodyMetric[]
  settings: Partial<UserSettings> | null
}
