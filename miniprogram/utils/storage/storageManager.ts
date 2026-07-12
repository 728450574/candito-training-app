// 存储管理器
// 管理当前激活的存储后端（local / cloud），并提供模式切换的订阅通知。
// 默认 local 模式（避免循环依赖：storageMode 本身存本地，由 settingsStore 直接读写）。

import type { StorageAdapter } from './StorageAdapter'
import { LocalStorageAdapter } from './LocalStorageAdapter'
import { CloudStorageAdapter } from './CloudStorageAdapter'

export type StorageMode = 'local' | 'cloud'

class StorageManager {
  private adapter: StorageAdapter = new LocalStorageAdapter()
  private mode: StorageMode = 'local'
  private listeners: Array<(mode: StorageMode) => void> = []

  getActiveAdapter(): StorageAdapter {
    return this.adapter
  }

  getMode(): StorageMode {
    return this.mode
  }

  setMode(mode: StorageMode): void {
    this.mode = mode
    this.adapter = mode === 'cloud' ? new CloudStorageAdapter() : new LocalStorageAdapter()
    this.listeners.forEach((fn) => fn(mode))
  }

  onModeChange(fn: (mode: StorageMode) => void): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn)
    }
  }
}

export const storageManager = new StorageManager()
