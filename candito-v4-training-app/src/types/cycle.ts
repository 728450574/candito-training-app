export type DayStatus = 'pending' | 'completed' | 'skipped' | 'makeup' | 'postponed'
export type CycleStatus = 'active' | 'paused' | 'week6_pending' | 'completed' | 'terminated'
export type Week6Decision = 'new_cycle' | 'test_1rm' | 'deload'
export type DayType = 'lower' | 'upper' | 'rest'

export interface BatchProcessRecord {
  id: string
  type: 'missed_workouts' | 'travel_skip'
  dateRange: { start: string; end: string }
  affectedDays: { week: number; day: number; action: string }[]
  processedAt: string
}

export interface PauseRecord {
  id: string
  pausedAt: string
  pausedWeek: number
  pausedDay: number
  reason: 'holiday' | 'travel' | 'injury' | 'other'
  customReason?: string
  resumedAt?: string
  resumeOption?: 'postpone' | 'skip'
  daysShifted: number
  note?: string
}

export interface RestartRecord {
  id: string
  fromWeek: number
  fromDay: number
  restartDate: string
  originalOneRM?: { squat: number; bench: number; deadlift: number }
  previousBranchId?: string
  isActive: boolean
}

export interface PlannedSet {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  isAMRAP?: boolean
}

export interface PlannedExercise {
  id: string
  name: string
  type: 'main' | 'assistance' | 'optional'
  sets: PlannedSet[]
  notes?: string
}

export interface TrainingDay {
  dayNumber: number
  dayOffset: number
  type: DayType
  originalDate: string
  scheduledDate: string
  exercises: PlannedExercise[]
  status: DayStatus
  completedDate?: string
  isRestartPoint?: boolean
}

export interface Week {
  weekNumber: number
  theme: string
  days: TrainingDay[]
}

export interface Cycle {
  id: string
  name: string
  startDate: string
  actualStartDate?: string
  status: CycleStatus
  week6Decision?: Week6Decision
  oneRM: { squat: number; bench: number; deadlift: number }
  unit: 'kg' | 'lb'
  weightRounding: number
  assistanceConfig: {
    horizontalPull: string
    shoulder: string
    verticalPull: string
    optional1?: string
    optional2?: string
  }
  weeks: Week[]
  pauseHistory: PauseRecord[]
  restartBranches: RestartRecord[]
  batchProcessHistory: BatchProcessRecord[]
  isPaused: boolean
  currentPause?: PauseRecord
  terminatedAt?: string
  terminateReason?: string
  createdAt: string
  completedAt?: string
  updatedAt?: string
}
