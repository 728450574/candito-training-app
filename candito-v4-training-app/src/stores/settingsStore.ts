import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserSettings } from '@/types/settings'
import { getProvider } from '@/services/storage'

/** 用户设置的默认值，类比数据库 DEFAULT 约束 */
const DEFAULT_SETTINGS: UserSettings = {
  defaultUnit: 'kg',
  defaultRestSeconds: 90,
  weightRounding: 2.5,
  reminderEnabled: false,
  reminderTime: '08:00',
}

/**
 * 用户设置 Store。
 * 类比 Java：SettingsService + SettingsRepository 的结合体。
 * 存储全局偏好（单位、取整步长、休息时长等），跨所有训练周期共享。
 */
export const useSettingsStore = defineStore('settings', () => {
  /** 当前用户设置，初始化时合并默认值 */
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })

  /**
   * 从持久化存储加载用户设置，缺失项用默认值填充。
   * 类比 Spring @PostConstruct 初始化。
   */
  async function load(): Promise<void> {
    const provider = getProvider()
    const loaded = await provider.loadSettings()
    if (loaded) {
      settings.value = { ...DEFAULT_SETTINGS, ...loaded }
    }
  }

  /** 持久化当前设置 */
  function save(): void {
    const provider = getProvider()
    provider.saveSettings(settings.value)
  }

  /**
   * 部分更新设置并自动持久化。
   * 类比 Java Service 的 update 方法，入参只传变更字段。
   *
   * @param partial - 需要更新的设置字段（部分即可）
   */
  function update(partial: Partial<UserSettings>): void {
    settings.value = { ...settings.value, ...partial }
    save()
  }

  return { settings, update, load, save }
})
