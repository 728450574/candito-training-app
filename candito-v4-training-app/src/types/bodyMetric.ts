export interface BodyMetric {
  id: string
  date: string
  weight: number
  unit: 'kg' | 'lb'
  updatedAt?: string
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    leftArm?: number
    rightArm?: number
    leftThigh?: number
    rightThigh?: number
  }
}
