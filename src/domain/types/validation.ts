import type { DayOfWeek, TimeString } from "@/domain/types/entities"

/** Jenis bentrokan waktu nyata (Tingkat Keparahan: ERROR) */
export type ConflictType =
  | "CLASS_OVERLAP"
  | "TEACHER_OVERLAP"
  | "ROOM_OVERLAP"
  | "TEACHER_UNAVAILABLE"
  | "ROOM_UNAVAILABLE"
  | "OUTSIDE_OPERATING_HOURS"
  | "BREAK_TIME_OVERLAP"

export interface ScheduleConflict {
  /** Format unik deterministik: `${conflictType}::${sortedAffectedSessionIds.join("::")}` */
  id: string
  conflictType: ConflictType
  severity: "error"
  dayOfWeek: DayOfWeek
  startTime: TimeString
  endTime: TimeString
  affectedSessionIds: string[]
  affectedClassIds: string[]
  teacherId?: string
  roomId?: string
  title: string
  description: string
}

/** Jenis peringatan kelengkapan jadwal (Tingkat Keparahan: WARNING) */
export type CompletenessWarningType =
  | "UNFULFILLED_REQUIREMENT"
  | "OVER_SCHEDULED_SESSION"
  | "MISSING_TEACHER"
  | "MISSING_REQUIRED_ROOM"
  | "UNCONFIGURED_CLASS"

export interface CompletenessWarning {
  /** Format unik deterministik: `${warningType}::${classId}::${requirementId ?? sessionId ?? ""}` */
  id: string
  warningType: CompletenessWarningType
  severity: "warning"
  classId: string
  requirementId?: string
  sessionId?: string
  subjectId?: string
  missingSessionCount?: number
  title: string
  description: string
}

/** Empat status validasi eksplisit sesuai PRD FR-11 & TDD Bagian 5.4 */
export type ValidationStatus =
  | "CONFLICT_DETECTED"
  | "INCOMPLETE"
  | "NO_CONFLICT_CURRENT_DATA"
  | "COMPLETE_AND_VALID"

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  CONFLICT_DETECTED: "Konflik ditemukan",
  INCOMPLETE: "Belum lengkap",
  NO_CONFLICT_CURRENT_DATA: "Tidak ada konflik pada data saat ini",
  COMPLETE_AND_VALID: "Jadwal lengkap dan valid",
}

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  CLASS_OVERLAP: "Jadwal Kelas Tumpang Tindih",
  TEACHER_OVERLAP: "Bentrokan Jadwal Guru",
  ROOM_OVERLAP: "Bentrokan Pemakaian Ruangan",
  TEACHER_UNAVAILABLE: "Guru Tidak Bersedia",
  ROOM_UNAVAILABLE: "Ruangan Tidak Tersedia",
  OUTSIDE_OPERATING_HOURS: "Sesi di Luar Jam Belajar",
  BREAK_TIME_OVERLAP: "Sesi Beririsan dengan Waktu Istirahat",
}

export const COMPLETENESS_WARNING_TYPE_LABELS: Record<
  CompletenessWarningType,
  string
> = {
  UNFULFILLED_REQUIREMENT: "Alokasi Sesi Belum Lengkap",
  OVER_SCHEDULED_SESSION: "Alokasi Sesi Melebihi Kebutuhan",
  MISSING_TEACHER: "Guru Belum Ditentukan",
  MISSING_REQUIRED_ROOM: "Ruangan Khusus Belum Dipilih",
  UNCONFIGURED_CLASS: "Kelas Belum Dikonfigurasi",
}

export interface ScopeValidationSummary {
  status: ValidationStatus
  statusLabel: string
  scheduledSessionsCount: number
  unscheduledSessionsCount: number
  activeConflictsCount: number
  completenessWarningsCount: number
  conflicts: ScheduleConflict[]
  warnings: CompletenessWarning[]
}

export interface WorkspaceValidationReport {
  evaluatedAt: number
  workspaceSummary: ScopeValidationSummary
  byClassId: Record<string, ScopeValidationSummary>
  conflictsBySessionId: Record<string, ScheduleConflict[]>
  warningsBySessionId: Record<string, CompletenessWarning[]>
}
