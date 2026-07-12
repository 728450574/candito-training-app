// 本地存储适配器
// 基于 wx.setStorageSync / wx.getStorageSync / wx.removeStorageSync / wx.getStorageInfoSync 实现。
// wx.setStorageSync 原生支持对象序列化，故无需手动 JSON.stringify（与抽象层契约一致：存入什么取出什么）。
// wx.getStorageSync 对不存在的 key 返回 ''（空字符串），此处映射为 null 以契合 StorageAdapter 契约。

import type { StorageAdapter } from './StorageAdapter'

export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = wx.getStorageSync(key)
      // wx.getStorageSync 对不存在的 key 返回 ''；统一映射为 null
      if (raw === '' || raw === undefined || raw === null) {
        return null
      }
      return raw as T
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      wx.setStorageSync(key, value)
    } catch {
      // storage full or unavailable — 静默忽略，与原 H5 行为一致
    }
  }

  async remove(key: string): Promise<void> {
    try {
      wx.removeStorageSync(key)
    } catch {
      // 静默忽略
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const info = wx.getStorageInfoSync()
      const keys: string[] = info.keys || []
      return keys.filter((k) => k.startsWith(prefix))
    } catch {
      return []
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      const info = wx.getStorageInfoSync()
      const keys: string[] = info.keys || []
      const targets = prefix ? keys.filter((k) => k.startsWith(prefix)) : keys
      for (const k of targets) {
        wx.removeStorageSync(k)
      }
    } catch {
      // 静默忽略
    }
  }
}
