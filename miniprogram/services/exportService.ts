// 导出/导入服务 — 小程序版
// 由原 H5 `candito-v4-training-app/src/services/exportService.ts` 1:1 迁移。
// 业务逻辑（校验和算法、数据校验、冲突检测、CSV 生成）逐行等价，
// 仅将浏览器 IO（Blob / URL.createObjectURL / a.click）替换为小程序 wx 文件 API：
//   - downloadBlob          → wx.getFileSystemManager().writeFile + wx.shareFileMessage / wx.openDocument
//   - importJSON(string)    → importJSON(filePath) 走 wx.getFileSystemManager().readFile
//
// 必须保真（不得改写）：
//   - EXPORT_VERSION / simpleHash / calculateChecksum（校验和算法）
//   - ExportData 接口
//   - validateImportData（纯逻辑校验）
//   - CSV 生成逻辑（header / esc / rows）

import { getToday } from './dateService'
import { cycleStore } from '../stores/cycleStore'
import { recordStore } from '../stores/recordStore'
import { bodyMetricStore } from '../stores/bodyMetricStore'
import { settingsStore } from '../stores/settingsStore'
import { storageManager } from '../utils/storage/storageManager'
import type { WorkoutRecord } from '../types/record'

export interface ExportData {
  version: string
  exportedAt: string
  checksum: string
  data: {
    cycles: any[]
    records: Record<string, any[]>
    bodyMetrics: any[]
    settings: any
  }
}

export interface ImportResult {
  success: boolean
  conflicts?: Array<{ type: string; id: string; message: string }>
  error?: string
}

const EXPORT_VERSION = '1.0.0'

// ---- 校验和算法（逐行等价保真，不得改写） ----

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function calculateChecksum(payload: string): string {
  return simpleHash(payload)
}

// ---- 内部：序列化 data 为 checksum 输入字符串 ----
// 与原 H5 buildExportPayload(data) 1:1 等价，用于计算 / 校验 checksum。
function serializePayload(data: ExportData['data']): string {
  return JSON.stringify({ cycles: data.cycles, records: data.records, bodyMetrics: data.bodyMetrics, settings: data.settings })
}

// ---- 从各 store 收集数据，构建导出数据对象 ----
export async function buildExportPayload(): Promise<ExportData['data']> {
  const cycles = cycleStore.getCycles()
  const records: Record<string, any[]> = {}
  for (const cycle of cycles) {
    records[cycle.id] = await recordStore.getRecordsForCycle(cycle.id)
  }
  const bodyMetrics = bodyMetricStore.getMetrics()
  const settings = settingsStore.getSettings()
  return { cycles, records, bodyMetrics, settings }
}

// ---- 导出 JSON ----
export async function exportJSON(): Promise<void> {
  const data = await buildExportPayload()
  const payload = serializePayload(data)
  const checksum = calculateChecksum(payload)

  const exportData: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: getToday(),
    checksum,
    data,
  }

  const json = JSON.stringify(exportData, null, 2)
  const timestamp = Date.now()
  const filePath = `${wx.env.USER_DATA_PATH}/candito-export-${timestamp}.json`

  await new Promise<void>((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath,
      data: json,
      encoding: 'utf8',
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg || '写入文件失败')),
    })
  })

  // 分享文件到聊天（失败时回退到预览）
  await new Promise<void>((resolve, reject) => {
    wx.shareFileMessage({
      filePath,
      success: () => resolve(),
      fail: () => {
        wx.openDocument({
          filePath,
          showMenu: true,
          success: () => resolve(),
          fail: (err2) => reject(new Error(err2.errMsg || '打开文件失败')),
        })
      },
    })
  })
}

// ---- 导出 CSV ----
export async function exportCSV(): Promise<void> {
  const cycles = cycleStore.getCycles()
  const allRecords: WorkoutRecord[] = []
  for (const cycle of cycles) {
    const records = await recordStore.getRecordsForCycle(cycle.id)
    allRecords.push(...records)
  }

  const header = '日期,训练日,周次,动作,类型,组号,目标重量,目标次数,实际重量,实际次数,已完成,跳过,休息秒数,感想,备注'
  const rows: string[] = [header]

  const esc = (val: string | number | undefined | null): string => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  for (const record of allRecords) {
    for (const exercise of record.exercises) {
      for (const set of exercise.sets) {
        rows.push([
          esc(record.scheduledDate || record.originalDate || record.date),
          esc(record.dayNumber),
          esc(record.weekNumber),
          esc(exercise.name),
          esc(exercise.type),
          esc(set.setNumber),
          esc(set.targetWeight),
          esc(set.targetReps),
          esc(set.actualWeight),
          esc(set.actualReps),
          esc(set.isCompleted ? '是' : '否'),
          esc(set.isSkipped ? '是' : '否'),
          esc(set.restSeconds),
          esc(record.feeling),
          esc(record.notes),
        ].join(','))
      }
    }
  }

  const bom = '\uFEFF'
  const csvContent = bom + rows.join('\n')
  const timestamp = Date.now()
  const filePath = `${wx.env.USER_DATA_PATH}/candito-records-${timestamp}.csv`

  await new Promise<void>((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath,
      data: csvContent,
      encoding: 'utf8',
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg || '写入文件失败')),
    })
  })

  await new Promise<void>((resolve, reject) => {
    wx.openDocument({
      filePath,
      showMenu: true,
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg || '打开文件失败')),
    })
  })
}

// ---- 导入 JSON ----
export async function importJSON(filePath: string): Promise<ImportResult> {
  // 1. 读取文件
  let fileContent: string
  try {
    fileContent = await new Promise<string>((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'utf8',
        success: (res) => resolve(res.data as string),
        fail: (err) => reject(new Error(err.errMsg || '读取文件失败')),
      })
    })
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '读取文件失败' }
  }

  // 2. JSON.parse
  let parsed: any
  try {
    parsed = JSON.parse(fileContent)
  } catch {
    return { success: false, error: 'JSON 格式无效，无法解析' }
  }

  // 3. 验证数据结构
  const errors = validateImportData(parsed)
  if (errors.length > 0) {
    return { success: false, error: errors.join('；') }
  }

  // 4. 校验 checksum
  const payload = serializePayload(parsed.data)
  const expectedChecksum = calculateChecksum(payload)
  if (parsed.checksum !== expectedChecksum) {
    return { success: false, error: '数据校验和不匹配，文件可能已损坏' }
  }

  // 5. 冲突检测（与现有数据对比）
  const existingData = await buildExportPayload()
  const conflicts = detectConflicts(parsed.data, existingData)
  if (conflicts.length > 0) {
    return { success: true, conflicts, error: undefined }
  }

  // 6. 写回各 store
  try {
    await writeImportDataToStores(parsed.data)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '写入数据失败' }
  }

  return { success: true }
}

// ---- 验证导入数据（纯逻辑，与原 H5 1:1 等价） ----
export function validateImportData(data: any): string[] {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    errors.push('导入数据为空或格式错误')
    return errors
  }

  if (typeof data.version !== 'string') {
    errors.push('缺少版本号 (version)')
  }

  if (typeof data.exportedAt !== 'string') {
    errors.push('缺少导出时间 (exportedAt)')
  }

  if (typeof data.checksum !== 'string') {
    errors.push('缺少校验和 (checksum)')
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push('缺少数据内容 (data)')
    return errors
  }

  if (!Array.isArray(data.data.cycles)) {
    errors.push('cycles 必须为数组')
  }

  if (!data.data.records || typeof data.data.records !== 'object' || Array.isArray(data.data.records)) {
    errors.push('records 必须为对象')
  }

  if (!Array.isArray(data.data.bodyMetrics)) {
    errors.push('bodyMetrics 必须为数组')
  }

  if (!data.data.settings || typeof data.data.settings !== 'object' || Array.isArray(data.data.settings)) {
    errors.push('settings 必须为对象')
  }

  if (data.version && typeof data.version === 'string') {
    const parts = data.version.split('.').map(Number)
    const currentParts = EXPORT_VERSION.split('.').map(Number)
    if (parts[0] > currentParts[0]) {
      errors.push(`版本 ${data.version} 不兼容，当前最高支持版本 ${EXPORT_VERSION}`)
    }
  }

  return errors
}

// ---- 冲突检测（纯逻辑） ----
// 导入数据内部的重复检测与原 H5 1:1 等价；
// existingData 提供时额外检测导入数据与现有数据的 ID 冲突。
export function detectConflicts(
  importData: ExportData['data'],
  existingData?: ExportData['data']
): Array<{ type: string; id: string; message: string }> {
  const conflicts: Array<{ type: string; id: string; message: string }> = []

  const seenCycleIds = new Set<string>()
  const seenRecordIds = new Set<string>()
  const seenBodyMetricIds = new Set<string>()

  // 1. 导入数据内部的重复检测（与原 H5 1:1 等价）
  for (const cycle of importData.cycles) {
    if (cycle.id) {
      if (seenCycleIds.has(cycle.id)) {
        conflicts.push({ type: 'cycle', id: cycle.id, message: `周期 ID "${cycle.id}" 在导入数据中存在重复` })
      }
      seenCycleIds.add(cycle.id)
    }
  }

  for (const recordId of Object.keys(importData.records)) {
    if (seenRecordIds.has(recordId)) {
      conflicts.push({ type: 'record_group', id: recordId, message: `训练记录组 ID "${recordId}" 在导入数据中存在重复` })
    }
    seenRecordIds.add(recordId)
  }

  for (const metric of importData.bodyMetrics) {
    if (metric.id) {
      if (seenBodyMetricIds.has(metric.id)) {
        conflicts.push({ type: 'bodyMetric', id: metric.id, message: `身体数据 ID "${metric.id}" 在导入数据中存在重复` })
      }
      seenBodyMetricIds.add(metric.id)
    }
  }

  // 2. 与现有数据的冲突检测（existingData 提供时）
  if (existingData) {
    const existingCycleIds = new Set(existingData.cycles.map((c: any) => c.id).filter(Boolean))
    const existingRecordIds = new Set(Object.keys(existingData.records))
    const existingBodyMetricIds = new Set(existingData.bodyMetrics.map((m: any) => m.id).filter(Boolean))

    for (const cycle of importData.cycles) {
      if (cycle.id && existingCycleIds.has(cycle.id)) {
        conflicts.push({ type: 'cycle', id: cycle.id, message: `周期 ID "${cycle.id}" 已存在于当前数据中` })
      }
    }

    for (const recordId of Object.keys(importData.records)) {
      if (existingRecordIds.has(recordId)) {
        conflicts.push({ type: 'record_group', id: recordId, message: `训练记录组 ID "${recordId}" 已存在于当前数据中` })
      }
    }

    for (const metric of importData.bodyMetrics) {
      if (metric.id && existingBodyMetricIds.has(metric.id)) {
        conflicts.push({ type: 'bodyMetric', id: metric.id, message: `身体数据 ID "${metric.id}" 已存在于当前数据中` })
      }
    }
  }

  return conflicts
}

// ---- 文件选择入口（供设置页调用） ----
export function chooseAndImportFile(): Promise<ImportResult> {
  return new Promise<ImportResult>((resolve) => {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: async (res) => {
        if (!res.tempFiles || res.tempFiles.length === 0) {
          resolve({ success: false, error: '未选择文件' })
          return
        }
        const filePath = res.tempFiles[0].path
        const result = await importJSON(filePath)
        resolve(result)
      },
      fail: () => {
        resolve({ success: false, error: '未选择文件或选择失败' })
      },
    })
  })
}

// ---- 内部：将导入数据写回各 store ----
// 通过 storageManager 写入存储（key 与各 store 内部常量一致，见 store 文件头部注释），
// 再 reload 刷新内存状态。
//   - candito_cycles            — Cycle[]
//   - candito_records_{cycleId} — WorkoutRecord[]
//   - candito_metrics           — BodyMetric[]
// settings 始终走 settingsStore.update（落本地）。
const CYCLES_KEY = 'candito_cycles'
const RECORDS_PREFIX = 'candito_records_'
const METRICS_KEY = 'candito_metrics'

async function writeImportDataToStores(data: ExportData['data']): Promise<void> {
  const adapter = storageManager.getActiveAdapter()

  // 写入 cycles
  await adapter.set(CYCLES_KEY, data.cycles)

  // 写入 records（按 cycleId 分组）
  for (const cycleId of Object.keys(data.records)) {
    await adapter.set(RECORDS_PREFIX + cycleId, data.records[cycleId])
  }

  // 写入 bodyMetrics
  await adapter.set(METRICS_KEY, data.bodyMetrics)

  // settings 走 settingsStore（始终落本地）
  settingsStore.update(data.settings)

  // 刷新内存中的 store 状态
  await cycleStore.load()
  await bodyMetricStore.load()
  // recordStore 懒加载：刷新导入涉及到的 cycle 缓存
  for (const cycleId of Object.keys(data.records)) {
    await recordStore.loadRecords(cycleId)
  }
}
