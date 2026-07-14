import type { StorageProvider, StorageMode } from './types'
import type { UserSettings } from '@/types/settings'
import { LocalStorageProvider } from './localProvider'
import { CloudBaseProvider } from './cloudProvider'
import { isCloudBaseConfigured } from '@/services/cloudbaseConfig'
import { isAuthenticated } from '@/services/cloudbase'

/**
 * 存储提供者工厂与状态管理。
 *
 * 存储模式偏好始终保存在 localStorage（key: candito_storage_mode），
 * 因为在读取云端数据之前需要知道使用哪种模式。
 */

const MODE_KEY = 'candito_storage_mode'

let currentProvider: StorageProvider | null = null
let currentMode: StorageMode = 'local'

/** 读取存储模式偏好（始终从 localStorage） */
export function getStorageMode(): StorageMode {
  try {
    const mode = localStorage.getItem(MODE_KEY)
    return mode === 'cloud' ? 'cloud' : 'local'
  } catch {
    return 'local'
  }
}

/** 设置存储模式偏好（始终写入 localStorage） */
export function setStorageMode(mode: StorageMode): void {
  localStorage.setItem(MODE_KEY, mode)
}

/** 获取当前活跃的 Provider */
export function getProvider(): StorageProvider {
  if (!currentProvider) {
    currentProvider = new LocalStorageProvider()
    currentMode = 'local'
  }
  return currentProvider
}

/** 获取当前存储模式 */
export function getCurrentMode(): StorageMode {
  return currentMode
}

/**
 * 初始化存储系统。
 * 在应用挂载前调用，根据存储模式加载对应 Provider。
 *
 * 如果云端模式但未配置/未登录，回退到本地模式。
 */
export async function initStorage(): Promise<StorageMode> {
  const mode = getStorageMode()

  if (mode === 'cloud') {
    if (!isCloudBaseConfigured()) {
      console.warn('CloudBase 环境变量未配置，回退到本地存储模式')
      currentProvider = new LocalStorageProvider()
      currentMode = 'local'
    } else {
      const authenticated = await isAuthenticated()
      if (!authenticated) {
        console.warn('CloudBase 未登录，回退到本地存储模式')
        currentProvider = new LocalStorageProvider()
        currentMode = 'local'
      } else {
        currentProvider = new CloudBaseProvider()
        currentMode = 'cloud'
      }
    }
  } else {
    currentProvider = new LocalStorageProvider()
    currentMode = 'local'
  }

  await currentProvider.init()
  return currentMode
}

/**
 * 切换到云端模式。
 * 调用前需确保 CloudBase 已配置且用户已登录。
 * 逐项迁移数据，部分失败不阻断整体切换。
 */
export async function switchToCloud(): Promise<void> {
  const localProvider = new LocalStorageProvider()
  await localProvider.init()

  const cloudProvider = new CloudBaseProvider()
  await cloudProvider.init()

  await migrateData(localProvider, cloudProvider)

  currentProvider = cloudProvider
  currentMode = 'cloud'
  setStorageMode('cloud')
}

/**
 * 切换到本地模式。
 * 从云端下载数据到本地（若云端不可用则直接切换，保留本地已有数据）。
 */
export async function switchToLocal(): Promise<void> {
  const localProvider = new LocalStorageProvider()
  await localProvider.init()

  // 尝试从云端导出数据，失败则直接切换到本地（保留本地已有数据）
  try {
    const cloudProvider = new CloudBaseProvider()
    await cloudProvider.init()
    await migrateData(cloudProvider, localProvider)
  } catch (err) {
    console.warn('云端数据导出失败，直接切换到本地模式:', err)
  }

  currentProvider = localProvider
  currentMode = 'local'
  setStorageMode('local')
}

/** 等待所有挂起的写入完成 */
export async function flushStorage(): Promise<void> {
  if (currentProvider) {
    await currentProvider.flush()
  }
}

// --- 内部工具 ---

/**
 * 逐项迁移数据，每类数据独立 try-catch，部分失败不阻断整体。
 */
async function migrateData(from: StorageProvider, to: StorageProvider): Promise<void> {
  // 1. 周期
  try {
    const cycles = await from.loadCycles()
    to.saveCycles(cycles)
  } catch (err) {
    console.warn('迁移周期数据失败:', err)
  }

  // 2. 活跃周期 ID
  try {
    const activeCycleId = await from.loadActiveCycleId()
    to.saveActiveCycleId(activeCycleId)
  } catch (err) {
    console.warn('迁移活跃周期 ID 失败:', err)
  }

  // 3. 训练记录
  try {
    const cycleIds = await from.loadAllRecordCycleIds()
    for (const cycleId of cycleIds) {
      try {
        const records = await from.loadRecords(cycleId)
        to.saveRecords(cycleId, records)
      } catch (err) {
        console.warn(`迁移周期 ${cycleId} 的训练记录失败:`, err)
      }
    }
  } catch (err) {
    console.warn('加载训练记录 cycleId 列表失败:', err)
  }

  // 4. 体重记录
  try {
    const metrics = await from.loadMetrics()
    to.saveMetrics(metrics)
  } catch (err) {
    console.warn('迁移体重记录失败:', err)
  }

  // 5. 设置
  try {
    const settings = await from.loadSettings()
    if (settings && Object.keys(settings).length > 0) {
      to.saveSettings(settings as UserSettings)
    }
  } catch (err) {
    console.warn('迁移设置数据失败:', err)
  }

  // 确保所有队列写入完成
  await to.flush()
}
