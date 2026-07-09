import type { WorkoutRecord, ExerciseRecord, SetRecord } from '@/types/record'
import { getToday } from './dateService'

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

const EXPORT_VERSION = '1.0.0'

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

function buildExportPayload(data: ExportData['data']): string {
  return JSON.stringify({ cycles: data.cycles, records: data.records, bodyMetrics: data.bodyMetrics, settings: data.settings })
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportJSON(data: ExportData['data']): void {
  const payload = buildExportPayload(data)
  const checksum = calculateChecksum(payload)

  const exportData: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: getToday(),
    checksum,
    data,
  }

  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `candito-training-export-${getToday()}.json`
  downloadBlob(blob, filename)
}

export function exportCSV(records: WorkoutRecord[]): void {
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

  for (const record of records) {
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
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const filename = `candito-training-records-${getToday()}.csv`
  downloadBlob(blob, filename)
}

export interface ImportResult {
  success: boolean
  conflicts?: Array<{ type: string; id: string; message: string }>
  error?: string
}

export function importJSON(jsonString: string): ImportResult {
  let parsed: any

  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'JSON 格式无效，无法解析' }
  }

  const errors = validateImportData(parsed)
  if (errors.length > 0) {
    return { success: false, error: errors.join('；') }
  }

  const payload = buildExportPayload(parsed.data)
  const expectedChecksum = calculateChecksum(payload)

  if (parsed.checksum !== expectedChecksum) {
    return { success: false, error: '数据校验和不匹配，文件可能已损坏' }
  }

  const conflicts = detectConflicts(parsed.data)
  if (conflicts.length > 0) {
    return { success: true, conflicts, error: undefined }
  }

  return { success: true }
}

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

function detectConflicts(data: ExportData['data']): Array<{ type: string; id: string; message: string }> {
  const conflicts: Array<{ type: string; id: string; message: string }> = []

  const seenCycleIds = new Set<string>()
  const seenRecordIds = new Set<string>()
  const seenBodyMetricIds = new Set<string>()

  for (const cycle of data.cycles) {
    if (cycle.id) {
      if (seenCycleIds.has(cycle.id)) {
        conflicts.push({ type: 'cycle', id: cycle.id, message: `周期 ID "${cycle.id}" 在导入数据中存在重复` })
      }
      seenCycleIds.add(cycle.id)
    }
  }

  for (const recordId of Object.keys(data.records)) {
    if (seenRecordIds.has(recordId)) {
      conflicts.push({ type: 'record_group', id: recordId, message: `训练记录组 ID "${recordId}" 在导入数据中存在重复` })
    }
    seenRecordIds.add(recordId)
  }

  for (const metric of data.bodyMetrics) {
    if (metric.id) {
      if (seenBodyMetricIds.has(metric.id)) {
        conflicts.push({ type: 'bodyMetric', id: metric.id, message: `身体数据 ID "${metric.id}" 在导入数据中存在重复` })
      }
      seenBodyMetricIds.add(metric.id)
    }
  }

  return conflicts
}
