export interface UserSettings {
  defaultUnit: 'kg' | 'lb'
  defaultRestSeconds: number
  weightRounding: number
  reminderEnabled: boolean
  reminderTime?: string
}
