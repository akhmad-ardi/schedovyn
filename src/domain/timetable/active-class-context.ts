import type {
  ClassGroup,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

export interface ActiveClassSessionStats {
  activeClassId: string | null
  requiredSessionsCount: number
  scheduledSessionsCount: number
  unscheduledSessionsCount: number
  workspaceTotalSessionsCount: number
}

/**
 * Mengembalikan objek ClassGroup yang cocok dengan activeClassId,
 * atau null jika activeClassId bernilai null / tidak ditemukan di daftar classes.
 */
export function resolveActiveClass(
  classes: readonly ClassGroup[],
  activeClassId: string | null
): ClassGroup | null {
  if (!activeClassId) {
    return null
  }
  return classes.find((cls) => cls.id === activeClassId) ?? null
}

/**
 * Mengembalikan daftar TeachingRequirement khusus untuk kelas aktif (activeClassId).
 * Jika activeClassId null atau tidak cocok, mengembalikan array kosong [].
 * Tidak memodifikasi array requirements asal.
 */
export function getActiveClassRequirements(
  requirements: readonly TeachingRequirement[],
  activeClassId: string | null
): TeachingRequirement[] {
  if (!activeClassId) {
    return []
  }
  return requirements.filter((req) => req.classId === activeClassId)
}

/**
 * Mengembalikan daftar TimetableSession khusus untuk kelas aktif (activeClassId).
 * Jika activeClassId null atau tidak cocok, mengembalikan array kosong [].
 * Tidak memodifikasi array sessions asal.
 */
export function getActiveClassSessions(
  sessions: readonly TimetableSession[],
  activeClassId: string | null
): TimetableSession[] {
  if (!activeClassId) {
    return []
  }
  return sessions.filter((ses) => ses.classId === activeClassId)
}

/**
 * Menghitung statistik ringkas sesi untuk kelas aktif sekaligus menjaga informasi
 * total sesi di seluruh ruang kerja (FR-03.6).
 */
export function getActiveClassSessionStats(
  requirements: readonly TeachingRequirement[],
  sessions: readonly TimetableSession[],
  activeClassId: string | null
): ActiveClassSessionStats {
  const workspaceTotalSessionsCount = sessions.length

  if (!activeClassId) {
    return {
      activeClassId: null,
      requiredSessionsCount: 0,
      scheduledSessionsCount: 0,
      unscheduledSessionsCount: 0,
      workspaceTotalSessionsCount,
    }
  }

  const classReqs = getActiveClassRequirements(requirements, activeClassId)
  const classSessions = getActiveClassSessions(sessions, activeClassId)

  const requiredSessionsCount = classReqs.reduce(
    (total, req) => total + req.sessionsPerWeek,
    0
  )
  const scheduledSessionsCount = classSessions.length

  const unscheduledSessionsCount = classReqs.reduce((total, req) => {
    const scheduledForReq = classSessions.filter(
      (ses) => ses.requirementId === req.id
    ).length
    return total + Math.max(0, req.sessionsPerWeek - scheduledForReq)
  }, 0)

  return {
    activeClassId,
    requiredSessionsCount,
    scheduledSessionsCount,
    unscheduledSessionsCount,
    workspaceTotalSessionsCount,
  }
}
