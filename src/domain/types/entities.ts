export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

/** Format 24 jam "HH:mm", misalnya "07:00" atau "13:45" */
export type TimeString = `${number}${number}:${number}${number}`

export type SnapIntervalMinutes = 5 | 10 | 15 | 30 | 60

export type RoomType = "classroom" | "laboratory" | "sports" | "hall" | "other"

export type SubjectColorKey =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "cyan"
  | "orange"
  | "teal"
  | "indigo"
  | "slate"

export const ORDERED_DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  sunday: "Minggu",
}

export const SNAP_INTERVAL_OPTIONS: readonly SnapIntervalMinutes[] = [
  5, 10, 15, 30, 60,
] as const

export interface TimeInterval {
  id: string
  dayOfWeek: DayOfWeek
  startTime: TimeString
  endTime: TimeString
  label?: string
}

export interface BreakInterval {
  id: string
  startTime: TimeString
  endTime: TimeString
  label: string
}

export interface DayScheduleConfig {
  id: string
  workspaceId: string
  dayOfWeek: DayOfWeek
  isSchoolDay: boolean
  startTime: TimeString
  endTime: TimeString
  snapIntervalMinutes: SnapIntervalMinutes
  breakIntervals: BreakInterval[]
}

export interface Workspace {
  id: string
  name: string
  academicPeriod: string
  activeClassId: string | null
  defaultSnapIntervalMinutes: SnapIntervalMinutes
  createdAt: string
  updatedAt: string
}

export interface ClassGroup {
  id: string
  workspaceId: string
  name: string
  grade: string
  notes?: string
}

export interface Teacher {
  id: string
  workspaceId: string
  name: string
  notes?: string
  unavailableIntervals: TimeInterval[]
}

export interface Subject {
  id: string
  workspaceId: string
  name: string
  colorKey: SubjectColorKey
  notes?: string
}

export interface Room {
  id: string
  workspaceId: string
  name: string
  type: RoomType
  notes?: string
  unavailableIntervals: TimeInterval[]
}

export interface TeachingRequirement {
  id: string
  workspaceId: string
  classId: string
  subjectId: string
  defaultTeacherId: string | null
  defaultRoomId: string | null
  sessionsPerWeek: number
  durationMinutes: number
  roomRequired: boolean
  notes?: string
}

export interface TimetableSession {
  id: string
  workspaceId: string
  requirementId: string | null
  classId: string
  subjectId: string
  teacherId: string | null
  roomId: string | null
  dayOfWeek: DayOfWeek
  startTime: TimeString
  endTime: TimeString
  durationMinutes: number
  notes?: string
}
