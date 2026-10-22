import type {
  ClassGroup,
  DayOfWeek,
  TimeString,
  Workspace,
} from "@/domain/types/entities"
import type { ScopeValidationSummary } from "@/domain/types/validation"

export type ExportScope = "ACTIVE_CLASS" | "ENTIRE_WORKSPACE"

export interface ExportSessionRow {
  sessionId: string
  dayOfWeek: DayOfWeek
  dayLabel: string // "Senin", "Selasa", dst.
  timeRange: string // "07:30 - 08:15"
  startTime: TimeString
  endTime: TimeString
  durationMinutes: number
  subjectName: string
  teacherName: string // Nama guru atau "-" jika kosong
  roomName: string // Nama ruangan atau "-" jika kosong
  hasConflict: boolean // True jika sesi ini terlibat bentrokan waktu
  conflictBadges: string[] // Contoh: ["[KONFLIK]"]
  conflictNotes: string // Keterangan singkat bentrokan
}

export interface ExportConflictAppendixItem {
  conflictId: string
  title: string
  description: string
  dayLabel: string
  timeRange: string
  affectedClasses: string[]
}

export interface ExportClassPayload {
  classGroup: ClassGroup
  workspace: Workspace
  rows: ExportSessionRow[]
  conflictAppendix: ExportConflictAppendixItem[]
  hasConflicts: boolean
  totalSessions: number
  totalDurationMinutes: number
  validationSummary?: ScopeValidationSummary | null
}

export interface PdfExportOptions {
  scope: ExportScope
  includeConflictAppendix: boolean
  customNotes?: string
}

export interface PdfExportMetadata {
  workspaceName: string
  academicPeriod: string
  exportedAt: string // Tanggal cetak terformat, misal: "22 Oktober 2026, 10:45"
  scope: ExportScope
}
