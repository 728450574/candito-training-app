export interface SetRecord {
  setNumber: number
  targetWeight?: number
  targetReps?: string
  actualWeight?: number
  actualReps?: number
  isCompleted: boolean
  isSkipped: boolean
  restSeconds?: number
}

export interface ExerciseRecord {
  exerciseId: string
  name: string
  type: 'main' | 'assistance' | 'optional'
  sets: SetRecord[]
}

export interface WorkoutRecord {
  id: string
  cycleId: string
  branchId?: string
  weekNumber: number
  dayNumber: number
  date: string
  originalDate: string
  scheduledDate: string
  isRescheduled: boolean
  startTime: string
  endTime: string
  duration: number
  bodyWeight?: number
  exercises: ExerciseRecord[]
  notes: string
  feeling: 1 | 2 | 3 | 4 | 5
  status: 'completed' | 'makeup'
  mr10TotalReps?: number
  wasPausedBefore?: boolean
  isRestartPoint?: boolean
  updatedAt?: string
}
