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

export type RequirementAllocationStatus =
  | "unfulfilled" // Sesi terjadwal < sessionsPerWeek
  | "fulfilled" // Sesi terjadwal === sessionsPerWeek
  | "over_scheduled" // Sesi terjadwal > sessionsPerWeek

export interface SubjectUnscheduledSummary {
  subjectId: string
  requirementId: string
  classId: string
  requiredSessions: number
  scheduledSessions: number
  remainingSessions: number
  durationMinutes: number
  defaultTeacherId: string | null
  defaultRoomId: string | null
  roomRequired: boolean
  notes?: string
  completionPercentage: number // 0 .. 100 (dibulatkan)
  status: RequirementAllocationStatus
}

export interface ClassUnscheduledSummary {
  classId: string
  items: UnscheduledSessionItem[]
  bySubject: SubjectUnscheduledSummary[]
  totalRequiredSessions: number
  totalScheduledSessions: number
  totalRemainingSessions: number
  overallCompletionPercentage: number // 0 .. 100
  isFullyScheduled: boolean
}

/**
 * Menghitung daftar sesi belum terjadwal dan rekapitulasi progres alokasi
 * untuk kelas tertentu berdasarkan daftar TeachingRequirement dan TimetableSession saat ini.
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
  const bySubject: SubjectUnscheduledSummary[] = []

  for (const req of classReqs) {
    totalRequiredSessions += req.sessionsPerWeek
    const scheduledForReq = classSessions.filter(
      (ses) => ses.requirementId === req.id
    ).length
    const remainingCount = Math.max(0, req.sessionsPerWeek - scheduledForReq)
    totalRemainingSessions += remainingCount

    const completionPercentage =
      req.sessionsPerWeek > 0
        ? Math.min(100, Math.round((scheduledForReq / req.sessionsPerWeek) * 100))
        : 100

    let status: RequirementAllocationStatus
    if (scheduledForReq < req.sessionsPerWeek) {
      status = "unfulfilled"
    } else if (scheduledForReq === req.sessionsPerWeek) {
      status = "fulfilled"
    } else {
      status = "over_scheduled"
    }

    bySubject.push({
      subjectId: req.subjectId,
      requirementId: req.id,
      classId: req.classId,
      requiredSessions: req.sessionsPerWeek,
      scheduledSessions: scheduledForReq,
      remainingSessions: remainingCount,
      durationMinutes: req.durationMinutes,
      defaultTeacherId: req.defaultTeacherId,
      defaultRoomId: req.defaultRoomId,
      roomRequired: req.roomRequired,
      notes: req.notes,
      completionPercentage,
      status,
    })

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

  const overallCompletionPercentage =
    totalRequiredSessions > 0
      ? Math.min(
          100,
          Math.round((classSessions.length / totalRequiredSessions) * 100)
        )
      : 100

  const isFullyScheduled =
    totalRequiredSessions > 0 && totalRemainingSessions === 0

  return {
    classId,
    items,
    bySubject,
    totalRequiredSessions,
    totalScheduledSessions: classSessions.length,
    totalRemainingSessions,
    overallCompletionPercentage,
    isFullyScheduled,
  }
}

export interface UnscheduledFilterOptions {
  searchQuery?: string
  subjectId?: string | null
  statusFilter?: "all" | "unfulfilled_only" | "fulfilled_only"
  sortBy?: "subject_name_asc" | "remaining_desc" | "duration_desc"
}

/**
 * Menyaring dan mengurutkan daftar kartu sesi belum terjadwal berdasarkan
 * kriteria pencarian nama mata pelajaran, filter status, dan pengurutan.
 */
export function filterAndSortUnscheduledItems(
  items: readonly UnscheduledSessionItem[],
  subjectNameMap: ReadonlyMap<string, string>,
  options: UnscheduledFilterOptions
): UnscheduledSessionItem[] {
  let result = [...items]

  // 1. Filter pencarian teks nama mata pelajaran
  if (options.searchQuery !== undefined) {
    const query = options.searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter((item) => {
        const subjectName = subjectNameMap.get(item.subjectId) ?? ""
        return subjectName.toLowerCase().includes(query)
      })
    }
  }

  // 2. Filter berdasarkan subjectId
  if (options.subjectId !== undefined && options.subjectId !== null) {
    result = result.filter((item) => item.subjectId === options.subjectId)
  }

  // 3. Filter status pemenuhan
  if (options.statusFilter === "unfulfilled_only") {
    result = result.filter((item) => item.remainingCount > 0)
  } else if (options.statusFilter === "fulfilled_only") {
    result = result.filter((item) => item.remainingCount === 0)
  }

  // 4. Pengurutan
  if (options.sortBy === "subject_name_asc") {
    result.sort((a, b) => {
      const nameA = subjectNameMap.get(a.subjectId) ?? ""
      const nameB = subjectNameMap.get(b.subjectId) ?? ""
      return nameA.localeCompare(nameB)
    })
  } else if (options.sortBy === "remaining_desc") {
    result.sort((a, b) => b.remainingCount - a.remainingCount)
  } else if (options.sortBy === "duration_desc") {
    result.sort((a, b) => b.durationMinutes - a.durationMinutes)
  }

  return result
}
