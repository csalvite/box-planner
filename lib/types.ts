export interface Block {
  id: string
  name: string
  category: "warm-up" | "technique" | "cardio" | "strength" | "cooldown" | "sparring"
  duration: number // in minutes
  description?: string
  exercises?: string[]
  _count?: {
    exercises: number
  }
  createdAt: Date
}

export interface Training {
  id: string
  name: string
  blocks: Block[]
  totalDuration: number
  createdAt: Date
  notes?: string
}

export interface Stats {
  trainingsThisMonth: number
  totalTimeMinutes: number
  currentStreak: number
  weeklyGoalMinutes: number
  weeklyProgressMinutes: number
}

export type TrainingType = "personal" | "group"
export type TrainingLevel = "beginner" | "intermediate" | "advanced"

export interface TrainingFormData {
  title: string
  type: TrainingType
  level: TrainingLevel
  notes?: string
}
