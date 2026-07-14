import type { Cycle } from '@/types/cycle'
import type { WorkoutRecord } from '@/types/record'
import type { BodyMetric } from '@/types/bodyMetric'
import type { UserSettings } from '@/types/settings'
import type { StorageProvider } from './types'

/**
 * 数据合并工具。
 *
 * 合并原则：两端数据按 id 匹配，冲突时取"更先进"的版本。
 * 合并后两端写入相同结果，确保数据一致。
 */

export interface MergedData {
  cycles: Cycle[]
  activeCycleId: string | null
  recordsByCycle: Record<string, WorkoutRecord[]>
  metrics: BodyMetric[]
  settings: Partial<UserSettings> | null
}

// --- 周期合并 ---

/** 计算周期已完成训练日数量 */
function countCompletedDays(cycle: Cycle): number {
  return cycle.weeks.reduce(
    (sum, w) => sum + w.days.filter(d => d.status === 'completed' || d.status === 'makeup').length,
    0,
  )
}

/** 获取周期最近一次训练完成时间 */
function getLastCompletedDate(cycle: Cycle): string {
  let latest = ''
  for (const w of cycle.weeks) {
    for (const d of w.days) {
      if (d.completedDate && d.completedDate > latest) {
        latest = d.completedDate
      }
    }
  }
  return latest || cycle.completedAt || cycle.createdAt
}

/**
 * 周期状态优先级（数值越大越优先）。
 * terminated 是用户主动终止的终态，优先级应高于 active/paused，仅次于 completed。
 */
const STATUS_PRIORITY: Record<string, number> = {
  active: 1,
  paused: 1,
  week6_pending: 2,
  terminated: 3,
  completed: 4,
}

/** 比较两个同 id 的周期，返回更先进的版本 */
function mergeCycle(local: Cycle, remote: Cycle): Cycle {
  const localP = STATUS_PRIORITY[local.status] ?? 0
  const remoteP = STATUS_PRIORITY[remote.status] ?? 0

  // 1. 状态不同：取更优先的
  if (localP !== remoteP) {
    return localP > remoteP ? local : remote
  }

  // 2. 状态相同：比较已完成训练日数量
  const localDays = countCompletedDays(local)
  const remoteDays = countCompletedDays(remote)
  if (localDays !== remoteDays) {
    return localDays > remoteDays ? local : remote
  }

  // 3. 完成数相同：比较最近完成时间
  const localDate = getLastCompletedDate(local)
  const remoteDate = getLastCompletedDate(remote)
  if (localDate !== remoteDate) {
    return localDate >= remoteDate ? local : remote
  }

  // 4. 完成时间相同：取 updatedAt 更晚的
  return getUpdatedAt(local) >= getUpdatedAt(remote) ? local : remote
}

/** 合并周期列表（按 id 去重，冲突取更先进的版本） */
function mergeCycles(local: Cycle[], remote: Cycle[]): Cycle[] {
  const map = new Map<string, Cycle>()
  for (const c of local) map.set(c.id, c)
  for (const c of remote) {
    const existing = map.get(c.id)
    if (existing) {
      map.set(c.id, mergeCycle(existing, c))
    } else {
      map.set(c.id, c)
    }
  }
  return Array.from(map.values())
}

// --- 活跃周期 ID 合并 ---

function mergeActiveCycleId(
  localId: string | null,
  remoteId: string | null,
  mergedCycles: Cycle[],
): string | null {
  if (localId === remoteId) return localId
  if (!localId) return remoteId
  if (!remoteId) return localId

  // 两端不同：优先选仍为 active 的周期
  const localCycle = mergedCycles.find(c => c.id === localId)
  const remoteCycle = mergedCycles.find(c => c.id === remoteId)

  const localActive = localCycle && localCycle.status === 'active'
  const remoteActive = remoteCycle && remoteCycle.status === 'active'

  if (localActive && !remoteActive) return localId
  if (remoteActive && !localActive) return remoteId

  // 都 active 或都不 active：取 createdAt 更新的
  const localCreated = localCycle?.createdAt ?? ''
  const remoteCreated = remoteCycle?.createdAt ?? ''
  return remoteCreated > localCreated ? remoteId : localId
}

// --- 训练记录合并 ---

/** 合并训练记录（按 id 去重，冲突取 endTime 更晚的，endTime 相同取 updatedAt 更晚的） */
function mergeRecords(local: WorkoutRecord[], remote: WorkoutRecord[]): WorkoutRecord[] {
  const map = new Map<string, WorkoutRecord>()
  for (const r of local) map.set(r.id, r)
  for (const r of remote) {
    const existing = map.get(r.id)
    if (existing) {
      if (r.endTime !== existing.endTime) {
        map.set(r.id, r.endTime >= existing.endTime ? r : existing)
      } else {
        map.set(r.id, getUpdatedAt(r) >= getUpdatedAt(existing) ? r : existing)
      }
    } else {
      map.set(r.id, r)
    }
  }
  return Array.from(map.values())
}

/** 合并所有周期的训练记录 */
function mergeAllRecords(
  localIds: string[],
  remoteIds: string[],
  localProvider: StorageProvider,
  remoteProvider: StorageProvider,
  localRecordsCache: Record<string, WorkoutRecord[]>,
  remoteRecordsCache: Record<string, WorkoutRecord[]>,
): Record<string, WorkoutRecord[]> {
  const allCycleIds = new Set([...localIds, ...remoteIds])
  const result: Record<string, WorkoutRecord[]> = {}

  for (const cycleId of allCycleIds) {
    const localRecords = localRecordsCache[cycleId] ?? []
    const remoteRecords = remoteRecordsCache[cycleId] ?? []
    result[cycleId] = mergeRecords(localRecords, remoteRecords)
  }

  return result
}

// --- 体重记录合并 ---

/** 获取带降级的 updatedAt（兼容旧数据） */
function getUpdatedAt(entity: { updatedAt?: string; createdAt?: string }): string {
  return entity.updatedAt ?? entity.createdAt ?? ''
}

/** 合并体重记录（按 date 去重，一天只能有一条记录，冲突取 updatedAt 更晚的） */
function mergeMetrics(local: BodyMetric[], remote: BodyMetric[]): BodyMetric[] {
  const map = new Map<string, BodyMetric>()
  for (const m of local) {
    const key = m.date
    const existing = map.get(key)
    if (existing) {
      map.set(key, getUpdatedAt(m) >= getUpdatedAt(existing) ? m : existing)
    } else {
      map.set(key, m)
    }
  }
  for (const m of remote) {
    const key = m.date
    const existing = map.get(key)
    if (existing) {
      map.set(key, getUpdatedAt(m) >= getUpdatedAt(existing) ? m : existing)
    } else {
      map.set(key, m)
    }
  }
  return Array.from(map.values())
}

// --- 设置合并 ---

/** 合并设置（逐字段，目标端优先） */
function mergeSettings(
  local: Partial<UserSettings> | null,
  remote: Partial<UserSettings> | null,
  preferLocal: boolean,
): Partial<UserSettings> | null {
  if (!local && !remote) return null
  if (!local) return remote
  if (!remote) return local

  const preferred = preferLocal ? local : remote
  const fallback = preferLocal ? remote : local
  return { ...fallback, ...preferred }
}

// --- 主合并函数 ---

/**
 * 从两端 Provider 读取数据并合并。
 * 返回合并后的数据，调用方负责写回两端。
 */
export async function mergeDataFromProviders(
  localProvider: StorageProvider,
  remoteProvider: StorageProvider,
  preferLocalSettings: boolean,
): Promise<MergedData> {
  // 1. 加载周期
  let localCycles: Cycle[] = []
  let remoteCycles: Cycle[] = []
  try {
    localCycles = await localProvider.loadCycles()
  } catch (err) {
    console.warn('加载本地周期失败:', err)
  }
  try {
    remoteCycles = await remoteProvider.loadCycles()
  } catch (err) {
    console.warn('加载云端周期失败:', err)
  }

  const mergedCycles = mergeCycles(localCycles, remoteCycles)

  // 2. 加载活跃周期 ID
  let localActiveId: string | null = null
  let remoteActiveId: string | null = null
  try {
    localActiveId = await localProvider.loadActiveCycleId()
  } catch (err) {
    console.warn('加载本地活跃周期 ID 失败:', err)
  }
  try {
    remoteActiveId = await remoteProvider.loadActiveCycleId()
  } catch (err) {
    console.warn('加载云端活跃周期 ID 失败:', err)
  }

  const mergedActiveId = mergeActiveCycleId(localActiveId, remoteActiveId, mergedCycles)

  // 3. 加载训练记录
  let localCycleIds: string[] = []
  let remoteCycleIds: string[] = []
  try {
    localCycleIds = await localProvider.loadAllRecordCycleIds()
  } catch (err) {
    console.warn('加载本地训练记录 ID 列表失败:', err)
  }
  try {
    remoteCycleIds = await remoteProvider.loadAllRecordCycleIds()
  } catch (err) {
    console.warn('加载云端训练记录 ID 列表失败:', err)
  }

  const localRecordsCache: Record<string, WorkoutRecord[]> = {}
  for (const cycleId of localCycleIds) {
    try {
      localRecordsCache[cycleId] = await localProvider.loadRecords(cycleId)
    } catch (err) {
      console.warn(`加载本地周期 ${cycleId} 训练记录失败:`, err)
      localRecordsCache[cycleId] = []
    }
  }

  const remoteRecordsCache: Record<string, WorkoutRecord[]> = {}
  for (const cycleId of remoteCycleIds) {
    try {
      remoteRecordsCache[cycleId] = await remoteProvider.loadRecords(cycleId)
    } catch (err) {
      console.warn(`加载云端周期 ${cycleId} 训练记录失败:`, err)
      remoteRecordsCache[cycleId] = []
    }
  }

  const mergedRecordsByCycle = mergeAllRecords(
    localCycleIds, remoteCycleIds,
    localProvider, remoteProvider,
    localRecordsCache, remoteRecordsCache,
  )

  // 4. 加载体重记录
  let localMetrics: BodyMetric[] = []
  let remoteMetrics: BodyMetric[] = []
  try {
    localMetrics = await localProvider.loadMetrics()
  } catch (err) {
    console.warn('加载本地体重记录失败:', err)
  }
  try {
    remoteMetrics = await remoteProvider.loadMetrics()
  } catch (err) {
    console.warn('加载云端体重记录失败:', err)
  }

  const mergedMetrics = mergeMetrics(localMetrics, remoteMetrics)

  // 5. 加载设置
  let localSettings: Partial<UserSettings> | null = null
  let remoteSettings: Partial<UserSettings> | null = null
  try {
    localSettings = await localProvider.loadSettings()
  } catch (err) {
    console.warn('加载本地设置失败:', err)
  }
  try {
    remoteSettings = await remoteProvider.loadSettings()
  } catch (err) {
    console.warn('加载云端设置失败:', err)
  }

  const mergedSettings = mergeSettings(localSettings, remoteSettings, preferLocalSettings)

  return {
    cycles: mergedCycles,
    activeCycleId: mergedActiveId,
    recordsByCycle: mergedRecordsByCycle,
    metrics: mergedMetrics,
    settings: mergedSettings,
  }
}

/**
 * 将合并后的数据写回 Provider。
 */
export async function writeMergedData(provider: StorageProvider, data: MergedData): Promise<void> {
  provider.saveCycles(data.cycles)
  provider.saveActiveCycleId(data.activeCycleId)

  for (const [cycleId, records] of Object.entries(data.recordsByCycle)) {
    provider.saveRecords(cycleId, records)
  }

  provider.saveMetrics(data.metrics)

  if (data.settings && Object.keys(data.settings).length > 0) {
    provider.saveSettings(data.settings as UserSettings)
  }

  await provider.flush()
}
