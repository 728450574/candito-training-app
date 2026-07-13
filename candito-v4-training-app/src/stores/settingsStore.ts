import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserSettings } from '@/types/settings'
import { getProvider } from '@/services/storage'

const DEFAULT_SETTINGS: UserSettings = {
  defaultUnit: 'kg',
  defaultRestSeconds: 90,
  weightRounding: 2.5,
  reminderEnabled: false,
  reminderTime: '08:00',
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })

  async function load(): Promise<void> {
    const provider = getProvider()
    const loaded = await provider.loadSettings()
    if (loaded) {
      settings.value = { ...DEFAULT_SETTINGS, ...loaded }
    }
  }

  function save(): void {
    const provider = getProvider()
    provider.saveSettings(settings.value)
  }

  function update(partial: Partial<UserSettings>): void {
    settings.value = { ...settings.value, ...partial }
    save()
  }

  return { settings, update, load, save }
})
