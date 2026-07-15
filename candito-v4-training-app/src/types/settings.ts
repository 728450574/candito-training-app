/**
 * 用户全局设置。
 * 类比数据库中的 user_config 表，单用户单条记录。
 */
export interface UserSettings {
  /** 默认重量单位：'kg'（公斤）或 'lb'（磅），类比 VARCHAR(2) NOT NULL DEFAULT 'kg' */
  defaultUnit: 'kg' | 'lb'
  /** 默认组间休息秒数，通常为 90 秒，类比 SMALLINT NOT NULL DEFAULT 90 */
  defaultRestSeconds: number
  /** 重量取整步长（kg），如 2.5 表示按 2.5kg 步进取整，类比 DECIMAL(4,1) NOT NULL DEFAULT 2.5 */
  weightRounding: number
  /** 是否开启训练提醒，类比 TINYINT(1) NOT NULL DEFAULT 0 */
  reminderEnabled: boolean
  /** 提醒时间，格式 "HH:mm"，如 "08:00"，reminderEnabled=true 时有效，类比 VARCHAR(5) */
  reminderTime?: string
}
