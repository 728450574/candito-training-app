export interface UserSettings {
  defaultUnit: 'kg' | 'lb'
  defaultRestSeconds: number
  weightRounding: number
  reminderEnabled: boolean
  reminderTime?: string
  /** 存储后端模式，默认 'local'；切换为 'cloud' 后数据走 CloudBase 云数据库 */
  storageMode: 'local' | 'cloud'
}
