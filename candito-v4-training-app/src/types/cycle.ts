/**
 * 训练周期相关类型定义。
 *
 * Candito 6周力量举计划的核心数据结构。
 * Cycle 是顶层聚合，包含 6 个 Week → 多个 TrainingDay → PlannedExercise → PlannedSet。
 * 类比：Cycle = 课程体系，Week = 每周课表，TrainingDay = 单天课程。
 */

// ===== 枚举类型 =====

/** 训练日状态，类比 ENUM 字段 */
export type DayStatus = 'pending' | 'completed' | 'skipped' | 'makeup' | 'postponed'

/** 训练周期状态（状态机），类比 ENUM 字段 */
export type CycleStatus = 'active' | 'paused' | 'week6_pending' | 'completed' | 'terminated'

/** 第6周用户决策，类比 ENUM 字段 */
export type Week6Decision = 'new_cycle' | 'test_1rm' | 'deload'

/** 训练日类型：lower=下肢日, upper=上肢日, rest=休息日，类比 ENUM */
export type DayType = 'lower' | 'upper' | 'rest'

// ===== 嵌入实体 =====

/** 批量处理错过训练的日志记录（嵌入 Cycle 内部），类比 JSON 字段 */
export interface BatchProcessRecord {
  /** 日志 ID */
  id: string
  /** 处理类型：missed_workouts=错过训练处理, travel_skip=出差跳过 */
  type: 'missed_workouts' | 'travel_skip'
  /** 处理的日期范围 */
  dateRange: { start: string; end: string }
  /** 受影响的训练日及对应的处理方式 */
  affectedDays: { week: number; day: number; action: string }[]
  /** 处理时间，ISO 8601 格式 */
  processedAt: string
}

/** 暂停记录（嵌入 Cycle 内部），类比 JSON 字段 */
export interface PauseRecord {
  /** 暂停记录 ID */
  id: string
  /** 暂停发生的日期 */
  pausedAt: string
  /** 暂停时所在周（1-6） */
  pausedWeek: number
  /** 暂停时在该周的第几天 */
  pausedDay: number
  /** 暂停原因 */
  reason: 'holiday' | 'travel' | 'injury' | 'other'
  /** 自定义原因（reason=other 时） */
  customReason?: string
  /** 恢复日期 */
  resumedAt?: string
  /** 恢复方式：postpone=顺延, skip=跳过 */
  resumeOption?: 'postpone' | 'skip'
  /** 实际顺延的天数 */
  daysShifted: number
  /** 备注 */
  note?: string
}

/** 重新开始分支记录（嵌入 Cycle 内部），类比 JSON 字段 */
export interface RestartRecord {
  /** 分支 ID */
  id: string
  /** 从第几周重新开始 */
  fromWeek: number
  /** 从该周第几天重新开始 */
  fromDay: number
  /** 重新开始的日期（用户指定） */
  restartDate: string
  /** 重新开始时的 1RM（用户可能调整） */
  originalOneRM?: { squat: number; bench: number; deadlift: number }
  /** 前一分支 ID（形成时间线链） */
  previousBranchId?: string
  /** 是否当前活跃分支 */
  isActive: boolean
}

// ===== 计划实体 =====

/** 计划中的单组训练，类比数据库 planned_set 表 */
export interface PlannedSet {
  /** 组序号（从 1 开始），类比 TINYINT NOT NULL */
  setNumber: number
  /** 目标重量（kg/lb），主项有值、辅助项可能为空，类比 DECIMAL(5,1) */
  targetWeight?: number
  /** 目标次数描述，"6"=固定6次，"MR10"=最多10次，"4-6"=4到6次范围，类比 VARCHAR(10) */
  targetReps?: string
  /** 是否 AMRAP（力竭组，尽可能多地完成），类比 TINYINT(1) DEFAULT 0 */
  isAMRAP?: boolean
}

/** 计划中的训练动作，类比数据库 planned_exercise 表 */
export interface PlannedExercise {
  /** 动作 ID，UUID v4 */
  id: string
  /** 动作名称，如 "深蹲"、"卧推"、"哑铃划船"，类比 VARCHAR(50) NOT NULL */
  name: string
  /** 动作类型：main=主项（三大项）, assistance=辅助项, optional=补充项 */
  type: 'main' | 'assistance' | 'optional'
  /** 该动作的组计划列表 */
  sets: PlannedSet[]
  /** 变式细节说明，如 "直腿硬拉"，类比 VARCHAR(100) */
  notes?: string
}

/** 训练日计划，类比数据库 training_day 表 */
export interface TrainingDay {
  /** 该周第几天（1-based） */
  dayNumber: number
  /** 相对周期 startDate 的天数偏移量 */
  dayOffset: number
  /** 训练日类型 */
  type: DayType
  /** 原始计划日期（基于 startDate + dayOffset，永不变） */
  originalDate: string
  /** 当前排程日期（暂停顺延后更新，可能与 originalDate 不同） */
  scheduledDate: string
  /** 该日的计划动作列表 */
  exercises: PlannedExercise[]
  /** 训练日状态 */
  status: DayStatus
  /** 实际完成（打卡）日期，status=completed/makeup 时有值 */
  completedDate?: string
  /** 是否重新开始分支的第一个训练日 */
  isRestartPoint?: boolean
}

/** 周计划，类比数据库 week 表 */
export interface Week {
  /** 周序号（1-6） */
  weekNumber: number
  /** 本周训练主题，如 "肌肉调理"、"线性最大超负荷" */
  theme: string
  /** 本周的训练日列表（3-5天） */
  days: TrainingDay[]
}

/**
 * 训练周期（顶层聚合根）。
 * 类比：整个 6 周训练计划的"项目"实体。
 */
export interface Cycle {
  /** 主键，UUID v4，类比 VARCHAR(36) PRIMARY KEY */
  id: string
  /** 周期名称，如 "周期 20260715"，类比 VARCHAR(50) NOT NULL */
  name: string
  /** 周期计划开始日期 "YYYY-MM-DD"，类比 DATE NOT NULL */
  startDate: string
  /** 实际开始日期（暂停顺延后可能与 startDate 不同），类比 DATE */
  actualStartDate?: string
  /** 周期状态（状态机） */
  status: CycleStatus
  /** 第6周用户决策（仅 status=week6_pending 时有值） */
  week6Decision?: Week6Decision
  /** 本周期中计算的预估1RM（Week5 完成后自动计算），类比 JSON 字段 */
  estimated1RM?: { squat: number; bench: number; deadlift: number }
  /** 用户设置的 1RM 重量，类比 JSON NOT NULL */
  oneRM: { squat: number; bench: number; deadlift: number }
  /** 重量单位，'kg' 或 'lb' */
  unit: 'kg' | 'lb'
  /** 重量取整步长（kg），优先级 Cycle > UserSettings，类比 DECIMAL(4,1) */
  weightRounding: number
  /** 辅助训练动作配置，用户在创建周期时选择 */
  assistanceConfig: {
    /** 水平拉类动作，如 "哑铃划船" */
    horizontalPull: string
    /** 肩部训练动作，如 "坐姿哑铃推举" */
    shoulder: string
    /** 垂直拉类动作，如 "负重引体向上" */
    verticalPull: string
    /** 额外补充动作1 */
    optional1?: string
    /** 额外补充动作2 */
    optional2?: string
  }
  /** 6 周完整计划（生成后不变，除非暂停顺延更新 scheduledDate） */
  weeks: Week[]
  /** 暂停历史记录（支持多次暂停） */
  pauseHistory: PauseRecord[]
  /** 重新开始分支记录（"继续"功能的时间线分支） */
  restartBranches: RestartRecord[]
  /** 批量处理错过训练的操作日志 */
  batchProcessHistory: BatchProcessRecord[]
  /** 是否当前处于暂停中 */
  isPaused: boolean
  /** 当前暂停记录（isPaused=true 时有值） */
  currentPause?: PauseRecord
  /** 终止时间，ISO 8601 格式 */
  terminatedAt?: string
  /** 终止原因，如 "因伤终止" */
  terminateReason?: string
  /** 创建时间，ISO 8601 格式 */
  createdAt: string
  /** 完成时间，ISO 8601 格式 */
  completedAt?: string
  /** 最后更新时间，ISO 8601 格式 */
  updatedAt?: string
}
