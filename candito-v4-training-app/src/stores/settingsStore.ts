import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserSettings } from '@/types/settings'

const STORAGE_KEY = 'candito_settings'

const DEFAULT_SETTINGS: UserSettings = {
  defaultUnit: 'kg',
  defaultRestSeconds: 90,
  weightRounding: 2.5,
  reminderEnabled: false,
  reminderTime: '08:00',
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })

  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch {
      settings.value = { ...DEFAULT_SETTINGS }
    }
  }

  function save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch {
      // storage full or unavailable — silently ignore
    }
  }

  function update(partial: Partial<UserSettings>): void {
    settings.value = { ...settings.value, ...partial }
    save()
  }

  load()

  return { settings, update, load, save }
})
