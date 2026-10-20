import type {
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

export interface UnscheduledSessionItem {
  /** Format unik virtual id: `${requirement.id}::slot-${slotIndex}` */
  virtualId: string
  requirementId: string
  classId: string
  subjectId: string
  defaultTeacherId: string | null
  defaultRoomId: string | null
  durationMinutes: number
  roomRequired: boolean
  notes?: string
  slotIndex: number // Indeks slot (0 .. remainingCount - 1)
  remainingCount: number // Jumlah sesi kebutuhan ini yang belum terjadwal
  totalRequiredCount: number // Nilai sessionsPerWeek asal
}

export interface ClassUnscheduledSummary {
  classId: string
  items: UnscheduledSessionItem[]
  totalRequiredSessions: number
  totalScheduledSessions: number
  totalRemainingSessions: number
}

/**
 * Menghitung daftar sesi belum terjadwal untuk kelas tertentu berdasarkan
 * daftar TeachingRequirement dan TimetableSession saat ini.
 */
export function calculateUnscheduledSessions(
  requirements: readonly TeachingRequirement[],
  sessions: readonly TimetableSession[],
  classId: string
): ClassUnscheduledSummary {
  const classReqs = requirements.filter((req) => req.classId === classId)
  const classSessions = sessions.filter((ses) => ses.classId === classId)

  let totalRequiredSessions = 0
  let totalRemainingSessions = 0
  const items: UnscheduledSessionItem[] = []

  for (const req of classReqs) {
    totalRequiredSessions += req.sessionsPerWeek
    const scheduledForReq = classSessions.filter(
      (ses) => ses.requirementId === req.id
    ).length
    const remainingCount = Math.max(0, req.sessionsPerWeek - scheduledForReq)
    totalRemainingSessions += remainingCount

    for (let k = 0; k < remainingCount; k++) {
      items.push({
        virtualId: `${req.id}::slot-${k}`,
        requirementId: req.id,
        classId: req.classId,
        subjectId: req.subjectId,
        defaultTeacherId: req.defaultTeacherId,
        defaultRoomId: req.defaultRoomId,
        durationMinutes: req.durationMinutes,
        roomRequired: req.roomRequired,
        notes: req.notes,
        slotIndex: k,
        remainingCount,
        totalRequiredCount: req.sessionsPerWeek,
      })
    }
  }

  return {
    classId,
    items,
    totalRequiredSessions,
    totalScheduledSessions: classSessions.length,
    totalRemainingSessions,
  }
}
