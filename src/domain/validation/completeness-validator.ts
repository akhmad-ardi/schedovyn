import type {
  ClassGroup,
  Subject,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"
import type { CompletenessWarning } from "@/domain/types/validation"

export interface CompletenessEvaluationInput {
  classes: readonly ClassGroup[]
  subjects: readonly Subject[]
  requirements: readonly TeachingRequirement[]
  sessions: readonly TimetableSession[]
}

/**
 * Menghitung peringatan kelengkapan alokasi pembelajaran di seluruh ruang kerja.
 *
 * Aturan kelengkapan:
 * 1. UNCONFIGURED_CLASS: Kelas belum memiliki satupun teaching requirement.
 * 2. UNFULFILLED_REQUIREMENT: Jumlah sesi terjadwal < sessionsPerWeek pada requirement.
 * 3. OVER_SCHEDULED_SESSION: Jumlah sesi terjadwal > sessionsPerWeek pada requirement.
 * 4. MISSING_TEACHER: Sesi terjadwal memiliki teacherId === null.
 * 5. MISSING_REQUIRED_ROOM: Sesi terjadwal dari requirement dengan roomRequired === true, namun roomId === null.
 */
export function evaluateCompletenessWarnings(
  input: CompletenessEvaluationInput
): CompletenessWarning[] {
  const { classes, subjects, requirements, sessions } = input
  const warnings: CompletenessWarning[] = []

  const classMap = new Map<string, ClassGroup>()
  for (const c of classes) {
    classMap.set(c.id, c)
  }

  const subjectMap = new Map<string, Subject>()
  for (const s of subjects) {
    subjectMap.set(s.id, s)
  }

  const requirementMap = new Map<string, TeachingRequirement>()
  for (const r of requirements) {
    requirementMap.set(r.id, r)
  }

  // Hitung jumlah sesi terjadwal per requirementId
  const sessionCountByReqId = new Map<string, number>()
  for (const ses of sessions) {
    if (ses.requirementId) {
      const current = sessionCountByReqId.get(ses.requirementId) ?? 0
      sessionCountByReqId.set(ses.requirementId, current + 1)
    }
  }

  // Kelompokkan requirement per classId
  const requirementsByClassId = new Map<string, TeachingRequirement[]>()
  for (const req of requirements) {
    let list = requirementsByClassId.get(req.classId)
    if (!list) {
      list = []
      requirementsByClassId.set(req.classId, list)
    }
    list.push(req)
  }

  // 1. Evaluasi Kelas Tanpa Konfigurasi (UNCONFIGURED_CLASS)
  for (const cls of classes) {
    const classReqs = requirementsByClassId.get(cls.id) ?? []
    if (classReqs.length === 0) {
      warnings.push({
        id: `UNCONFIGURED_CLASS::${cls.id}::`,
        warningType: "UNCONFIGURED_CLASS",
        severity: "warning",
        classId: cls.id,
        title: "Kelas Belum Dikonfigurasi",
        description: `Kelas ${cls.name} belum memiliki alokasi kebutuhan mata pelajaran.`,
      })
    }
  }

  // 2. Evaluasi Pemenuhan Sesi Kebutuhan Pembelajaran (UNFULFILLED / OVER_SCHEDULED)
  for (const req of requirements) {
    const scheduledCount = sessionCountByReqId.get(req.id) ?? 0
    const targetCount = req.sessionsPerWeek
    const cls = classMap.get(req.classId)
    const sub = subjectMap.get(req.subjectId)
    const className = cls?.name ?? "Kelas"
    const subjectName = sub?.name ?? "Mata Pelajaran"

    if (scheduledCount < targetCount) {
      const missingCount = targetCount - scheduledCount
      warnings.push({
        id: `UNFULFILLED_REQUIREMENT::${req.classId}::${req.id}`,
        warningType: "UNFULFILLED_REQUIREMENT",
        severity: "warning",
        classId: req.classId,
        requirementId: req.id,
        subjectId: req.subjectId,
        missingSessionCount: missingCount,
        title: "Alokasi Sesi Belum Lengkap",
        description: `Mata pelajaran ${subjectName} untuk kelas ${className} baru dijadwalkan ${scheduledCount} dari target ${targetCount} sesi (${missingCount} sesi belum terjadwal).`,
      })
    } else if (scheduledCount > targetCount) {
      const excessCount = scheduledCount - targetCount
      warnings.push({
        id: `OVER_SCHEDULED_SESSION::${req.classId}::${req.id}`,
        warningType: "OVER_SCHEDULED_SESSION",
        severity: "warning",
        classId: req.classId,
        requirementId: req.id,
        subjectId: req.subjectId,
        title: "Alokasi Sesi Melebihi Kebutuhan",
        description: `Mata pelajaran ${subjectName} untuk kelas ${className} dijadwalkan ${scheduledCount} sesi, melebihi target ${targetCount} sesi (${excessCount} sesi lebih).`,
      })
    }
  }

  // 3. Evaluasi Kelengkapan Data Sesi Terjadwal (MISSING_TEACHER / MISSING_REQUIRED_ROOM)
  for (const ses of sessions) {
    const cls = classMap.get(ses.classId)
    const sub = subjectMap.get(ses.subjectId)
    const req = ses.requirementId
      ? requirementMap.get(ses.requirementId)
      : undefined
    const className = cls?.name ?? "Kelas"
    const subjectName = sub?.name ?? "Mata Pelajaran"

    // 3.1 Guru Belum Ditentukan
    if (ses.teacherId === null) {
      warnings.push({
        id: `MISSING_TEACHER::${ses.classId}::${ses.id}`,
        warningType: "MISSING_TEACHER",
        severity: "warning",
        classId: ses.classId,
        sessionId: ses.id,
        requirementId: ses.requirementId ?? undefined,
        subjectId: ses.subjectId,
        title: "Guru Belum Ditentukan",
        description: `Sesi ${subjectName} pada kelas ${className} (${ses.startTime} - ${ses.endTime}) belum memiliki guru pengajar.`,
      })
    }

    // 3.2 Ruangan Wajib Belum Ditentukan
    if (req?.roomRequired === true && ses.roomId === null) {
      warnings.push({
        id: `MISSING_REQUIRED_ROOM::${ses.classId}::${ses.id}`,
        warningType: "MISSING_REQUIRED_ROOM",
        severity: "warning",
        classId: ses.classId,
        sessionId: ses.id,
        requirementId: ses.requirementId ?? undefined,
        subjectId: ses.subjectId,
        title: "Ruangan Khusus Belum Dipilih",
        description: `Sesi ${subjectName} pada kelas ${className} mewajibkan ruangan khusus namun belum ditentukan ruangannya.`,
      })
    }
  }

  return warnings
}
