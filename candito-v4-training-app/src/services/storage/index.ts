import type { StorageProvider, StorageMode } from './types'
import { LocalStorageProvider } from './localProvider'
import { CloudBaseProvider } from './cloudProvider'
import { isCloudBaseConfigured } from '@/services/cloudbaseConfig'
import { isAuthenticated } from '@/services/cloudbase'
import { mergeDataFromProviders, writeMergedData } from './mergeData'

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
 * 读取本地+云端数据，双向合并后写回两端，确保数据一致。
 * 调用前需确保 CloudBase 已配置且用户已登录。
 */
export async function switchToCloud(): Promise<void> {
  const localProvider = new LocalStorageProvider()
  await localProvider.init()

  const cloudProvider = new CloudBaseProvider()
  await cloudProvider.init()

  // 双向合并：设置以本地为准
  const merged = await mergeDataFromProviders(localProvider, cloudProvider, true)

  // 写回两端
  await writeMergedData(cloudProvider, merged)
  await writeMergedData(localProvider, merged)

  currentProvider = cloudProvider
  currentMode = 'cloud'
  setStorageMode('cloud')
}

/**
 * 切换到本地模式。
 * 读取本地+云端数据，双向合并后写回两端，确保数据一致。
 * 若云端不可用则直接切换，保留本地已有数据。
 */
export async function switchToLocal(): Promise<void> {
  const localProvider = new LocalStorageProvider()
  await localProvider.init()

  try {
    const cloudProvider = new CloudBaseProvider()
    await cloudProvider.init()

    // 双向合并：设置以云端为准
    const merged = await mergeDataFromProviders(localProvider, cloudProvider, false)

    // 写回两端
    await writeMergedData(localProvider, merged)
    await writeMergedData(cloudProvider, merged)
  } catch (err) {
    console.warn('云端数据合并失败，直接切换到本地模式:', err)
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
