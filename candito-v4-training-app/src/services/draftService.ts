/**
 * 训练草稿服务。
 *
 * 类比 Java：会话状态持久化（Session State Persistence），
 * 在训练进行中持续保存用户已录入的中间数据到 localStorage，
 * 防止页面意外关闭、刷新或浏览器崩溃后丢失已填写的组数据。
 *
 * 注意：定时保存、路由拦截等 UI 生命周期管理保留在视图层，
 * 本服务仅封装 localStorage 的原子读写操作。
 */

/** 草稿存储键前缀，与业务数据键前缀 `candito_` 区分 */
const DRAFT_PREFIX = 'candito_draft_'

/**
 * 训练草稿的完整数据结构。
 * 序列化到 localStorage 的训练状态快照，包含所有可恢复的 UI 状态。
 */
export interface TrainingDraftData {
  exercises: unknown[]
  currentExerciseIndex: number
  currentSetIndex: number
  inputWeight: number
  inputReps: number
  startTime: string
  mr10TotalReps: number
  mr10Calculated: boolean
  mr10LoadingWeight: number
  elapsedSeconds: number
  isResting: boolean
  restSecondsLeft: number
  defaultRestSeconds: number
  savedAt: number
}

/**
 * 根据训练日标识构建 localStorage 草稿键。
 *
 * 键格式：candito_draft_{cycleId}_{weekNumber}_{dayNumber}
 * 确保不同周期、不同训练日的草稿互不覆盖。
 *
 * @param cycleId - 训练周期 ID
 * @param weekNumber - 周序号（1-6）
 * @param dayNumber - 训练日序号
 * @returns localStorage 键名
 */
export function buildDraftKey(cycleId: string, weekNumber: number, dayNumber: number): string {
  return `${DRAFT_PREFIX}${cycleId}_${weekNumber}_${dayNumber}`
}

/**
 * 保存训练草稿到 localStorage。
 *
 * 在以下时机调用：
 * - 每组完成后自动保存
 * - 页面离开时（beforeunload / 路由切换）
 * - 定时器每 5 秒自动保存
 *
 * @param key - 草稿存储键（由 buildDraftKey 生成）
 * @param data - 当前训练状态的完整快照
 */
export function saveDraft(key: string, data: TrainingDraftData): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage 配额已满或浏览器隐私模式下不可用，静默失败。
    // 用户将通过后续的显式保存失败提示感知问题。
  }
}

/**
 * 从 localStorage 读取训练草稿，返回解析后的 JSON 对象。
 *
 * @param key - 草稿存储键
 * @returns 解析后的草稿数据；若键不存在或 JSON 格式异常则返回 null
 */
export function loadDraft(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * 删除训练草稿。
 *
 * 在以下时机调用：
 * - 训练正常完成后
 * - 用户主动放弃训练并确认丢弃草稿时
 *
 * @param key - 草稿存储键
 */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // 删除失败不影响主流程，残留的过期草稿将在下次加载时被迁移逻辑过滤
  }
}
