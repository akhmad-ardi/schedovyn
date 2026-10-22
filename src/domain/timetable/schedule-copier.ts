import type { TeachingRequirement, TimetableSession } from "@/domain/types/entities"

export type TeacherCopyStrategy =
  | "keep-source"
  | "use-target-default"
  | "clear"

export type RoomCopyStrategy =
  | "keep-source"
  | "use-target-default"
  | "clear"

export type CopyConflictResolution = "replace" | "merge"

export interface CopyScheduleOptions {
  sourceClassId: string
  targetClassId: string
  conflictResolution: CopyConflictResolution
  teacherStrategy: TeacherCopyStrategy
  roomStrategy: RoomCopyStrategy
}

export interface CloneClassScheduleParams {
  sourceSessions: readonly TimetableSession[]
  targetRequirements: readonly TeachingRequirement[]
  options: CopyScheduleOptions
  generateId?: () => string
}

export interface CloneClassScheduleResult {
  ok: boolean
  copiedSessions: TimetableSession[]
  unmatchedSubjectIds: string[]
  error?: string
}

/**
 * Menduplikasi sesi dari kelas sumber ke kelas tujuan secara murni (pure function).
 * Setiap sesi hasil kloning memperoleh ID unik baru.
 */
export function cloneClassSchedule(
  params: CloneClassScheduleParams
): CloneClassScheduleResult {
  const {
    sourceSessions,
    targetRequirements,
    options,
    generateId = () => crypto.randomUUID(),
  } = params

  if (options.sourceClassId === options.targetClassId) {
    return {
      ok: false,
      copiedSessions: [],
      unmatchedSubjectIds: [],
      error: "Kelas sumber dan kelas tujuan tidak boleh sama.",
    }
  }

  const sourceClassSessions = sourceSessions.filter(
    (s) => s.classId === options.sourceClassId
  )

  if (sourceClassSessions.length === 0) {
    return {
      ok: false,
      copiedSessions: [],
      unmatchedSubjectIds: [],
      error: "Kelas sumber belum memiliki sesi yang dijadwalkan.",
    }
  }

  // Bangun peta requirement kelas target berdasarkan subjectId
  const targetReqBySubject = new Map<string, TeachingRequirement>()
  for (const req of targetRequirements) {
    if (req.classId === options.targetClassId) {
      targetReqBySubject.set(req.subjectId, req)
    }
  }

  const unmatchedSubjectIds = new Set<string>()
  const copiedSessions: TimetableSession[] = []

  for (const session of sourceClassSessions) {
    const matchingReq = targetReqBySubject.get(session.subjectId)
    if (!matchingReq) {
      unmatchedSubjectIds.add(session.subjectId)
    }

    // Tentukan penugasan guru
    let resolvedTeacherId: string | null = null
    switch (options.teacherStrategy) {
      case "keep-source":
        resolvedTeacherId = session.teacherId
        break
      case "use-target-default":
        resolvedTeacherId = matchingReq?.defaultTeacherId ?? null
        break
      case "clear":
        resolvedTeacherId = null
        break
    }

    // Tentukan penugasan ruangan
    let resolvedRoomId: string | null = null
    switch (options.roomStrategy) {
      case "keep-source":
        resolvedRoomId = session.roomId
        break
      case "use-target-default":
        resolvedRoomId = matchingReq?.defaultRoomId ?? null
        break
      case "clear":
        resolvedRoomId = null
        break
    }

    const clonedSession: TimetableSession = {
      id: generateId(),
      workspaceId: session.workspaceId,
      requirementId: matchingReq ? matchingReq.id : null,
      classId: options.targetClassId,
      subjectId: session.subjectId,
      teacherId: resolvedTeacherId,
      roomId: resolvedRoomId,
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.durationMinutes,
      notes: session.notes,
    }

    copiedSessions.push(clonedSession)
  }

  return {
    ok: true,
    copiedSessions,
    unmatchedSubjectIds: Array.from(unmatchedSubjectIds),
  }
}
