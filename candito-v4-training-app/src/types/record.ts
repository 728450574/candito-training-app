/**
 * 训练记录相关类型定义。
 *
 * 工作流程：Cycle（周期）中的 TrainingDay 是计划，
 * WorkoutRecord 是该训练日的实际执行记录。
 * 类比：Cycle = 课程表，WorkoutRecord = 每次上课的签到+成绩单。
 */

/** 单组训练的实际执行记录，类比数据库 set_record 表的一行 */
export interface SetRecord {
  /** 组序号（从 1 开始），类比 TINYINT NOT NULL */
  setNumber: number
  /** 计划目标重量，类比 DECIMAL(5,1) */
  targetWeight?: number
  /** 计划目标次数（如 "6"、"MR10"、"4-6"），类比 VARCHAR(10) */
  targetReps?: string
  /** 实际使用重量，类比 DECIMAL(5,1) */
  actualWeight?: number
  /** 实际完成次数，类比 TINYINT */
  actualReps?: number
  /** 该组是否已完成，类比 TINYINT(1) NOT NULL DEFAULT 0 */
  isCompleted: boolean
  /** 该组是否被跳过，类比 TINYINT(1) NOT NULL DEFAULT 0 */
  isSkipped: boolean
  /** 该组后的休息秒数，类比 SMALLINT */
  restSeconds?: number
}

/** 单个动作的训练记录，类比数据库 exercise_record 表 */
export interface ExerciseRecord {
  /** 关联的计划动作 ID，类比外键 VARCHAR(36) */
  exerciseId: string
  /** 动作名称，如 "深蹲"、"卧推"，类比 VARCHAR(50) NOT NULL */
  name: string
  /** 动作类型：main=主项, assistance=辅助项, optional=补充项，类比 ENUM */
  type: 'main' | 'assistance' | 'optional'
  /** 该动作的组记录列表，类比一对多子表 */
  sets: SetRecord[]
}

/** 一次完整的训练记录，类比数据库 workout_record 表 */
export interface WorkoutRecord {
  /** 主键，UUID v4，类比 VARCHAR(36) PRIMARY KEY */
  id: string
  /** 所属训练周期 ID，类比外键 VARCHAR(36) NOT NULL */
  cycleId: string
  /** 重新开始分支 ID（有值时表示该记录属于某个 RestartBranch），类比外键 VARCHAR(36) */
  branchId?: string
  /** 周序号（1-6），类比 TINYINT NOT NULL */
  weekNumber: number
  /** 训练日在该周的序号，类比 TINYINT NOT NULL */
  dayNumber: number
  /** 实际训练日期 "YYYY-MM-DD"，类比 DATE NOT NULL */
  date: string
  /** 原始计划日期（基于 startDate 计算，永不变），类比 DATE NOT NULL */
  originalDate: string
  /** 当前排程日期（暂停顺延后可能与 originalDate 不同），类比 DATE NOT NULL */
  scheduledDate: string
  /** 是否因暂停/跳过而调整过日期，类比 TINYINT(1) NOT NULL DEFAULT 0 */
  isRescheduled: boolean
  /** 训练开始时间，ISO 8601 格式，类比 DATETIME NOT NULL */
  startTime: string
  /** 训练结束时间，ISO 8601 格式，类比 DATETIME NOT NULL */
  endTime: string
  /** 训练总时长（秒），类比 INT NOT NULL */
  duration: number
  /** 当日体重，类比 DECIMAL(5,1) */
  bodyWeight?: number
  /** 动作记录列表，类比一对多子表 */
  exercises: ExerciseRecord[]
  /** 训练笔记，类比 TEXT */
  notes: string
  /** 训练感受评分，1-5 星，类比 TINYINT NOT NULL DEFAULT 3 */
  feeling: 1 | 2 | 3 | 4 | 5
  /** 训练状态：completed=正常完成, makeup=补打卡，类比 ENUM('completed','makeup') */
  status: 'completed' | 'makeup'
  /** 第2周 MR10 组实际完成的总次数（仅第2周深蹲记录有此值），类比 SMALLINT */
  mr10TotalReps?: number
  /** 本次训练前是否经历了周期暂停，类比 TINYINT(1) */
  wasPausedBefore?: boolean
  /** 是否重新开始后的第一个训练日，类比 TINYINT(1) */
  isRestartPoint?: boolean
  /** 最后更新时间，ISO 8601 格式，类比 DATETIME */
  updatedAt?: string
}
