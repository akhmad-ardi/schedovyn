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

/**
 * Mode inisialisasi saat membuat ruang kerja baru (FR-13).
 * - BLANK: Hanya membuat Workspace + 7 DayScheduleConfig bawaan (Senin-Jumat aktif, Sabtu-Minggu nonaktif).
 * - SEED_DEFAULT: Mengisi Workspace baru dengan data contoh SMP Negeri 1 Nusantara menggunakan ID unik.
 */
export type WorkspaceInitMode = "BLANK" | "SEED_DEFAULT"

/**
 * Mode penyalinan saat menduplikasi ruang kerja yang sudah ada (FR-13).
 * - MASTER_DATA_ONLY: Menyalin konfigurasi hari, kelas, guru, mata pelajaran, ruangan, dan kebutuhan pembelajaran
 *   tanpa menyalin penempatan sesi jadwal (sessions = []), sehingga siap dijadwalkan ulang untuk semester baru.
 * - FULL_COPY: Menyalin seluruh konfigurasi, data master, kebutuhan pembelajaran, beserta posisi sesi terjadwal.
 */
export type WorkspaceDuplicateMode = "MASTER_DATA_ONLY" | "FULL_COPY"
export type DuplicateWorkspaceMode = WorkspaceDuplicateMode

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

export const ROOM_TYPE_OPTIONS: readonly RoomType[] = [
  "classroom",
  "laboratory",
  "sports",
  "hall",
  "other",
] as const

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  classroom: "Ruang Kelas",
  laboratory: "Laboratorium",
  sports: "Lapangan / Olahraga",
  hall: "Aula",
  other: "Lainnya",
}

export const SUBJECT_COLOR_OPTIONS: readonly SubjectColorKey[] = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "cyan",
  "orange",
  "teal",
  "indigo",
  "slate",
] as const

export const SUBJECT_COLOR_LABELS: Record<SubjectColorKey, string> = {
  blue: "Biru",
  emerald: "Zamrud",
  amber: "Kuning Amber",
  rose: "Merah Muda",
  violet: "Ungu Violet",
  cyan: "Biru Sian",
  orange: "Oranye",
  teal: "Hijau Toska",
  indigo: "Nila (Indigo)",
  slate: "Abu-abu Batu",
}

export const WORKSPACE_INIT_MODE_OPTIONS: readonly WorkspaceInitMode[] = [
  "BLANK",
  "SEED_DEFAULT",
] as const

export const WORKSPACE_INIT_MODE_LABELS: Record<WorkspaceInitMode, string> = {
  BLANK: "Ruang Kerja Kosong",
  SEED_DEFAULT: "Muat Data Contoh (SMPN 1 Nusantara)",
}

export const WORKSPACE_DUPLICATE_MODE_OPTIONS: readonly WorkspaceDuplicateMode[] = [
  "MASTER_DATA_ONLY",
  "FULL_COPY",
] as const

export const WORKSPACE_DUPLICATE_MODE_LABELS: Record<
  WorkspaceDuplicateMode,
  string
> = {
  MASTER_DATA_ONLY: "Konfigurasi & Data Master Saja (Semester Baru)",
  FULL_COPY: "Salin Penuh Beserta Jadwal (Simulasi / Cadangan)",
}

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

export interface CreateWorkspaceInput {
  name: string
  academicPeriod: string
  defaultSnapIntervalMinutes: SnapIntervalMinutes
  initMode: WorkspaceInitMode
}

export interface DuplicateWorkspaceInput {
  sourceWorkspaceId: string
  name: string
  academicPeriod: string
  mode: WorkspaceDuplicateMode
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
