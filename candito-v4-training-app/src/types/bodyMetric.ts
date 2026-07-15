/**
 * 体测数据记录。
 * 类比数据库中的 body_metric 表，每次称重/测量产生一条记录。
 * 跨训练周期共享，不绑定特定 Cycle。
 */
export interface BodyMetric {
  /** 主键，UUID v4，类比 VARCHAR(36) PRIMARY KEY */
  id: string
  /** 测量日期，格式 "YYYY-MM-DD"，类比 DATE NOT NULL */
  date: string
  /** 体重数值，类比 DECIMAL(5,1) NOT NULL */
  weight: number
  /** 体重单位，'kg' 或 'lb'，类比 VARCHAR(2) NOT NULL */
  unit: 'kg' | 'lb'
  /** 最后更新时间，ISO 8601 格式，类比 DATETIME */
  updatedAt?: string
  /** 围度测量数据（可选），单位 cm，类比嵌套 JSON 字段 */
  measurements?: {
    /** 胸围，类比 DECIMAL(5,1) */
    chest?: number
    /** 腰围，类比 DECIMAL(5,1) */
    waist?: number
    /** 臀围，类比 DECIMAL(5,1) */
    hips?: number
    /** 左臂围，类比 DECIMAL(5,1) */
    leftArm?: number
    /** 右臂围，类比 DECIMAL(5,1) */
    rightArm?: number
    /** 左大腿围，类比 DECIMAL(5,1) */
    leftThigh?: number
    /** 右大腿围，类比 DECIMAL(5,1) */
    rightThigh?: number
  }
}
