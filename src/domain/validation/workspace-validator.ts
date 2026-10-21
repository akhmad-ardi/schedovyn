import type {
  ClassGroup,
  DayScheduleConfig,
  Room,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"
import {
  VALIDATION_STATUS_LABELS,
  type CompletenessWarning,
  type ScheduleConflict,
  type ScopeValidationSummary,
  type ValidationStatus,
  type WorkspaceValidationReport,
} from "@/domain/types/validation"
import { detectScheduleConflicts } from "./conflict-engine"
import { evaluateCompletenessWarnings } from "./completeness-validator"

export interface WorkspaceValidationData {
  dayConfigs: readonly DayScheduleConfig[]
  classes: readonly ClassGroup[]
  teachers: readonly Teacher[]
  rooms: readonly Room[]
  subjects: readonly Subject[]
  requirements: readonly TeachingRequirement[]
  sessions: readonly TimetableSession[]
  activeClassId: string | null
}

/**
 * Mengompilasi laporan validasi menyeluruh ruang kerja.
 * Menghitung konflik waktu (conflict engine), peringatan kelengkapan (completeness validator),
 * indeks pencarian cepat O(1), serta menurunkan 4 status validasi eksplisit sesuai PRD FR-11 & AC-13.
 */
export function evaluateWorkspaceValidation(
  data: WorkspaceValidationData
): WorkspaceValidationReport {
  const {
    dayConfigs,
    classes,
    teachers,
    rooms,
    subjects,
    requirements,
    sessions,
  } = data

  const conflicts = detectScheduleConflicts({
    dayConfigs,
    classes,
    teachers,
    rooms,
    subjects,
    sessions,
  })

  const warnings = evaluateCompletenessWarnings({
    classes,
    subjects,
    requirements,
    sessions,
  })

  // 1. Bangun indeks pemetaan cepat per sessionId
  const conflictsBySessionId: Record<string, ScheduleConflict[]> = {}
  for (const c of conflicts) {
    for (const sid of c.affectedSessionIds) {
      if (!conflictsBySessionId[sid]) {
        conflictsBySessionId[sid] = []
      }
      conflictsBySessionId[sid].push(c)
    }
  }

  const warningsBySessionId: Record<string, CompletenessWarning[]> = {}
  for (const w of warnings) {
    if (w.sessionId) {
      if (!warningsBySessionId[w.sessionId]) {
        warningsBySessionId[w.sessionId] = []
      }
      warningsBySessionId[w.sessionId].push(w)
    }
  }

  // 2. Hitung statistik pemenuhan kebutuhan sesi
  const sessionsCountByReqId = new Map<string, number>()
  for (const ses of sessions) {
    if (ses.requirementId) {
      const cur = sessionsCountByReqId.get(ses.requirementId) ?? 0
      sessionsCountByReqId.set(ses.requirementId, cur + 1)
    }
  }

  // Helper untuk mengecek kelengkapan per kelas
  interface ClassComputedStats {
    cls: ClassGroup
    classSessions: TimetableSession[]
    classConflicts: ScheduleConflict[]
    classWarnings: CompletenessWarning[]
    classRequirements: TeachingRequirement[]
    unscheduledCount: number
    isComplete: boolean
  }

  const classStatsList: ClassComputedStats[] = classes.map((cls) => {
    const classSessions = sessions.filter((s) => s.classId === cls.id)
    const classConflicts = conflicts.filter((c) =>
      c.affectedClassIds.includes(cls.id)
    )
    const classWarnings = warnings.filter((w) => w.classId === cls.id)
    const classRequirements = requirements.filter((r) => r.classId === cls.id)

    let unscheduledCount = 0
    for (const req of classRequirements) {
      const scheduled = sessionsCountByReqId.get(req.id) ?? 0
      unscheduledCount += Math.max(0, req.sessionsPerWeek - scheduled)
    }

    const isComplete =
      classRequirements.length > 0 &&
      unscheduledCount === 0 &&
      classWarnings.length === 0 &&
      classSessions.length > 0

    return {
      cls,
      classSessions,
      classConflicts,
      classWarnings,
      classRequirements,
      unscheduledCount,
      isComplete,
    }
  })

  // Hitung total sesi belum terjadwal global
  let totalUnscheduledCount = 0
  for (const stat of classStatsList) {
    totalUnscheduledCount += stat.unscheduledCount
  }

  // Penentuan status global ruang kerja
  const isGlobalConflictFree = conflicts.length === 0
  const isGlobalComplete =
    classes.length > 0 &&
    classStatsList.every((s) => s.isComplete) &&
    totalUnscheduledCount === 0 &&
    warnings.length === 0

  let globalStatus: ValidationStatus
  if (!isGlobalConflictFree) {
    globalStatus = "CONFLICT_DETECTED"
  } else if (isGlobalComplete) {
    globalStatus = "COMPLETE_AND_VALID"
  } else {
    globalStatus = "INCOMPLETE"
  }

  const workspaceSummary: ScopeValidationSummary = {
    status: globalStatus,
    statusLabel: VALIDATION_STATUS_LABELS[globalStatus],
    scheduledSessionsCount: sessions.length,
    unscheduledSessionsCount: totalUnscheduledCount,
    activeConflictsCount: conflicts.length,
    completenessWarningsCount: warnings.length,
    conflicts,
    warnings,
  }

  // 3. Ringkasan per kelas (byClassId)
  const byClassId: Record<string, ScopeValidationSummary> = {}
  for (const stat of classStatsList) {
    let classStatus: ValidationStatus

    if (stat.classConflicts.length > 0) {
      classStatus = "CONFLICT_DETECTED"
    } else if (!stat.isComplete) {
      classStatus = "INCOMPLETE"
    } else {
      // Kelas ini lengkap dan bebas konflik
      if (isGlobalComplete) {
        classStatus = "COMPLETE_AND_VALID"
      } else {
        classStatus = "NO_CONFLICT_CURRENT_DATA"
      }
    }

    byClassId[stat.cls.id] = {
      status: classStatus,
      statusLabel: VALIDATION_STATUS_LABELS[classStatus],
      scheduledSessionsCount: stat.classSessions.length,
      unscheduledSessionsCount: stat.unscheduledCount,
      activeConflictsCount: stat.classConflicts.length,
      completenessWarningsCount: stat.classWarnings.length,
      conflicts: stat.classConflicts,
      warnings: stat.classWarnings,
    }
  }

  return {
    evaluatedAt: Date.now(),
    workspaceSummary,
    byClassId,
    conflictsBySessionId,
    warningsBySessionId,
  }
}
