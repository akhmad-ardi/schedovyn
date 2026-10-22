import {
  DAY_OF_WEEK_LABELS,
  ORDERED_DAYS_OF_WEEK,
  type ClassGroup,
  type DayScheduleConfig,
  type Room,
  type Subject,
  type Teacher,
  type TimetableSession,
  type Workspace,
} from "@/domain/types/entities"
import { timeToMinutes } from "@/domain/time/time-utils"
import {
  CONFLICT_TYPE_LABELS,
  type ScheduleConflict,
  type ScopeValidationSummary,
} from "@/domain/types/validation"
import type {
  ExcelConflictRow,
  ExcelExportPayload,
  ExcelRoomSummaryRow,
  ExcelScheduleRow,
  ExcelTeacherSummaryRow,
} from "@/services/export/excel-types"
import type { ExportScope } from "@/services/export/export-types"

/**
 * Sanitasi nilai teks untuk mencegah Formula Injection (FR-09 Ketentuan Teknis 3).
 * Menambahkan awalan kutip tunggal (') jika string diawali karakter '=', '+', '-', '@', '\t', '\r'.
 */
export function sanitizeSpreadsheetText(
  raw: string | null | undefined
): string {
  if (raw === null || raw === undefined) return ""
  const str = String(raw)
  if (str === "") return ""
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

/**
 * Menghasilkan nama berkas unduhan spreadsheet yang aman dari karakter ilegal.
 */
export function formatExcelDownloadFileName(
  scope: ExportScope,
  workspaceName: string,
  className?: string
): string {
  const sanitize = (name: string): string =>
    name
      .replace(/[/\\:*?"<>|]/g, "_")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")

  const cleanWorkspace = sanitize(workspaceName)
  if (scope === "ACTIVE_CLASS") {
    const cleanClass = sanitize(className ?? "Kelas")
    return `Jadwal_${cleanWorkspace}_Kelas_${cleanClass}.xlsx`
  }
  return `Jadwal_${cleanWorkspace}_Semua_Kelas.xlsx`
}

/**
 * Memetakan baris-baris sesi jadwal menjadi tabel flat siap filter.
 */
export function mapExcelScheduleRows(params: {
  sessions: readonly TimetableSession[]
  classes: readonly ClassGroup[]
  subjects: readonly Subject[]
  teachers: readonly Teacher[]
  rooms: readonly Room[]
  conflicts: readonly ScheduleConflict[]
  filterClassId?: string | null
}): ExcelScheduleRow[] {
  const {
    sessions,
    classes,
    subjects,
    teachers,
    rooms,
    conflicts,
    filterClassId,
  } = params

  const classMap = new Map<string, ClassGroup>(
    classes.map((cls) => [cls.id, cls])
  )
  const subjectMap = new Map<string, Subject>(
    subjects.map((sub) => [sub.id, sub])
  )
  const teacherMap = new Map<string, Teacher>(
    teachers.map((tch) => [tch.id, tch])
  )
  const roomMap = new Map<string, Room>(rooms.map((rm) => [rm.id, rm]))

  const dayIndexMap = new Map<string, number>(
    ORDERED_DAYS_OF_WEEK.map((day, idx) => [day, idx])
  )

  const filteredSessions = filterClassId
    ? sessions.filter((s) => s.classId === filterClassId)
    : [...sessions]

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dayA = dayIndexMap.get(a.dayOfWeek) ?? 99
    const dayB = dayIndexMap.get(b.dayOfWeek) ?? 99
    if (dayA !== dayB) return dayA - dayB

    const startA = timeToMinutes(a.startTime)
    const startB = timeToMinutes(b.startTime)
    if (startA !== startB) return startA - startB

    return timeToMinutes(a.endTime) - timeToMinutes(b.endTime)
  })

  return sortedSessions.map((session) => {
    const cls = classMap.get(session.classId)
    const subject = subjectMap.get(session.subjectId)
    const teacher = session.teacherId
      ? teacherMap.get(session.teacherId)
      : undefined
    const room = session.roomId ? roomMap.get(session.roomId) : undefined

    const matchedConflicts = conflicts.filter((c) => {
      type ConflictWithSessionIds = ScheduleConflict & {
        sessionIds?: string[]
        message?: string
      }
      const extendedConflict = c as ConflictWithSessionIds
      const sessionIds =
        extendedConflict.affectedSessionIds ??
        extendedConflict.sessionIds ??
        []
      return sessionIds.includes(session.id)
    })

    const hasConflict = matchedConflicts.length > 0
    let statusValidasi = "Valid"
    if (hasConflict) {
      type ConflictWithDetails = ScheduleConflict & {
        message?: string
      }
      const reasons = matchedConflicts
        .map(
          (c) =>
            c.title ||
            (c as ConflictWithDetails).message ||
            CONFLICT_TYPE_LABELS[c.conflictType] ||
            "Bentrokan Waktu"
        )
        .join("; ")
      statusValidasi = `Konflik: ${reasons}`
    }

    return {
      hari: DAY_OF_WEEK_LABELS[session.dayOfWeek] ?? session.dayOfWeek,
      waktuMulai: session.startTime,
      waktuSelesai: session.endTime,
      durasiMenit: session.durationMinutes,
      kelas: sanitizeSpreadsheetText(cls?.name ?? "Tidak Diketahui"),
      tingkat: sanitizeSpreadsheetText(cls?.grade ?? "-"),
      mataPelajaran: sanitizeSpreadsheetText(
        subject?.name ?? "Tidak Diketahui"
      ),
      guru: teacher
        ? sanitizeSpreadsheetText(teacher.name)
        : "Belum Ditentukan",
      ruangan: room ? sanitizeSpreadsheetText(room.name) : "-",
      statusValidasi,
    }
  })
}

/**
 * Memetakan rekapitulasi beban mengajar per guru mingguan.
 */
export function mapExcelTeacherSummaryRows(params: {
  teachers: readonly Teacher[]
  sessions: readonly TimetableSession[]
  classes: readonly ClassGroup[]
  conflicts: readonly ScheduleConflict[]
}): ExcelTeacherSummaryRow[] {
  const { teachers, sessions, classes, conflicts } = params
  const classMap = new Map<string, ClassGroup>(
    classes.map((cls) => [cls.id, cls])
  )

  const sortedTeachers = [...teachers].sort((a, b) =>
    a.name.localeCompare(b.name, "id", { numeric: true })
  )

  return sortedTeachers.map((teacher) => {
    const teacherSessions = sessions.filter(
      (s) => s.teacherId === teacher.id
    )
    const jumlahSesi = teacherSessions.length
    const totalMenitMingguan = teacherSessions.reduce(
      (acc, s) => acc + s.durationMinutes,
      0
    )

    const hours = Math.floor(totalMenitMingguan / 60)
    const minutes = totalMenitMingguan % 60
    const totalJamFormat =
      hours > 0 && minutes > 0
        ? `${hours} jam ${minutes} menit`
        : hours > 0
          ? `${hours} jam`
          : `${minutes} menit`

    const uniqueClassNames = [
      ...new Set(
        teacherSessions
          .map((s) => classMap.get(s.classId)?.name)
          .filter((name): name is string => Boolean(name))
      ),
    ].sort()

    type ConflictWithTeacherMeta = ScheduleConflict & {
      sessionIds?: string[]
      details?: { teacherId?: string }
      affectedTeacherIds?: string[]
    }

    const teacherConflicts = conflicts.filter((c) => {
      const ext = c as ConflictWithTeacherMeta
      if (ext.teacherId === teacher.id) return true
      if (ext.details?.teacherId === teacher.id) return true
      if (ext.affectedTeacherIds?.includes(teacher.id)) return true
      if (
        c.conflictType === "TEACHER_OVERLAP" ||
        c.conflictType === "TEACHER_UNAVAILABLE"
      ) {
        const sIds = ext.affectedSessionIds ?? ext.sessionIds ?? []
        return teacherSessions.some((s) => sIds.includes(s.id))
      }
      return false
    })

    return {
      namaGuru: sanitizeSpreadsheetText(teacher.name),
      jumlahSesi,
      totalMenitMingguan,
      totalJamFormat,
      daftarKelas: uniqueClassNames.join(", "),
      jumlahKonflikTerkait: teacherConflicts.length,
    }
  })
}

/**
 * Memetakan rekapitulasi penggunaan ruangan mingguan.
 */
export function mapExcelRoomSummaryRows(params: {
  rooms: readonly Room[]
  sessions: readonly TimetableSession[]
  conflicts: readonly ScheduleConflict[]
}): ExcelRoomSummaryRow[] {
  const { rooms, sessions, conflicts } = params

  const sortedRooms = [...rooms].sort((a, b) =>
    a.name.localeCompare(b.name, "id", { numeric: true })
  )

  return sortedRooms.map((room) => {
    const roomSessions = sessions.filter((s) => s.roomId === room.id)
    const jumlahSesiPenggunaan = roomSessions.length
    const totalMenitPenggunaan = roomSessions.reduce(
      (acc, s) => acc + s.durationMinutes,
      0
    )

    type ConflictWithRoomMeta = ScheduleConflict & {
      sessionIds?: string[]
      details?: { roomId?: string }
      affectedRoomIds?: string[]
    }

    const roomConflicts = conflicts.filter((c) => {
      const ext = c as ConflictWithRoomMeta
      if (ext.roomId === room.id) return true
      if (ext.details?.roomId === room.id) return true
      if (ext.affectedRoomIds?.includes(room.id)) return true
      if (
        c.conflictType === "ROOM_OVERLAP" ||
        c.conflictType === "ROOM_UNAVAILABLE"
      ) {
        const sIds = ext.affectedSessionIds ?? ext.sessionIds ?? []
        return roomSessions.some((s) => sIds.includes(s.id))
      }
      return false
    })

    return {
      namaRuangan: sanitizeSpreadsheetText(room.name),
      jenisRuangan: room.type,
      jumlahSesiPenggunaan,
      totalMenitPenggunaan,
      jumlahKonflikRuangan: roomConflicts.length,
    }
  })
}

/**
 * Memetakan daftar konflik waktu dan peringatan kelengkapan menjadi baris tabel konflik.
 */
export function mapExcelConflictRows(params: {
  conflicts: readonly ScheduleConflict[]
  validationSummary?: ScopeValidationSummary | null
  classes: readonly ClassGroup[]
}): ExcelConflictRow[] {
  const { conflicts, validationSummary, classes } = params
  const classMap = new Map<string, ClassGroup>(
    classes.map((cls) => [cls.id, cls])
  )

  const rows: ExcelConflictRow[] = []

  // 1. Bentrokan waktu aktif
  for (const c of conflicts) {
    type ConflictWithExtra = ScheduleConflict & {
      message?: string
    }
    const ext = c as ConflictWithExtra
    const classNames = (c.affectedClassIds ?? []).map(
      (cid) => classMap.get(cid)?.name ?? cid
    )

    rows.push({
      kategori: "Konflik Waktu",
      jenisMasalah:
        c.title ||
        ext.message ||
        CONFLICT_TYPE_LABELS[c.conflictType] ||
        "Bentrokan Waktu",
      hari: DAY_OF_WEEK_LABELS[c.dayOfWeek] ?? c.dayOfWeek,
      rentangWaktu: `${c.startTime} - ${c.endTime}`,
      kelasTerlibat: classNames.join(", "),
      rincianPenyebab:
        c.description || ext.message || "Bentrokan jadwal terdeteksi",
    })
  }

  // 2. Peringatan kelengkapan jika tersedia
  if (validationSummary) {
    type ValidationSummaryExtra = ScopeValidationSummary & {
      unfulfilledRequirements?: number
      unfulfilledRequirementCount?: number
    }
    const extraSummary = validationSummary as ValidationSummaryExtra

    if (validationSummary.warnings && validationSummary.warnings.length > 0) {
      for (const w of validationSummary.warnings) {
        rows.push({
          kategori: "Peringatan Kelengkapan",
          jenisMasalah: w.title,
          hari: "-",
          rentangWaktu: "-",
          kelasTerlibat: classMap.get(w.classId)?.name ?? w.classId,
          rincianPenyebab: w.description,
        })
      }
    } else {
      const unfulfilledCount =
        extraSummary.unfulfilledRequirementCount ??
        extraSummary.unfulfilledRequirements ??
        validationSummary.unscheduledSessionsCount ??
        0

      if (unfulfilledCount > 0) {
        rows.push({
          kategori: "Peringatan Kelengkapan",
          jenisMasalah: "Kebutuhan Sesi Belum Terpenuhi",
          hari: "-",
          rentangWaktu: "-",
          kelasTerlibat: "-",
          rincianPenyebab: `Terdapat ${unfulfilledCount} kebutuhan sesi yang belum terpenuhi di jadwal.`,
        })
      }
    }
  }

  return rows
}

/**
 * Menyusun paket payload lengkap untuk pembuatan berkas Excel.
 */
export function buildExcelExportPayload(params: {
  scope: ExportScope
  workspace: Workspace
  activeClassId: string | null
  classes: readonly ClassGroup[]
  dayConfigs: readonly DayScheduleConfig[]
  sessions: readonly TimetableSession[]
  subjects: readonly Subject[]
  teachers: readonly Teacher[]
  rooms: readonly Room[]
  conflicts: readonly ScheduleConflict[]
  validationSummary?: ScopeValidationSummary | null
}): ExcelExportPayload {
  const {
    scope,
    workspace,
    activeClassId,
    classes,
    sessions,
    subjects,
    teachers,
    rooms,
    conflicts,
    validationSummary,
  } = params

  const filterClassId = scope === "ACTIVE_CLASS" ? activeClassId : null
  const activeClass = classes.find((c) => c.id === activeClassId)

  const scheduleRows = mapExcelScheduleRows({
    sessions,
    classes,
    subjects,
    teachers,
    rooms,
    conflicts,
    filterClassId,
  })

  const teacherSummaryRows = mapExcelTeacherSummaryRows({
    teachers,
    sessions,
    classes,
    conflicts,
  })

  const roomSummaryRows = mapExcelRoomSummaryRows({
    rooms,
    sessions,
    conflicts,
  })

  const conflictRows = mapExcelConflictRows({
    conflicts: filterClassId
      ? conflicts.filter(
          (c) =>
            c.affectedClassIds?.includes(filterClassId) ||
            scheduleRows.some((r) => r.statusValidasi.startsWith("Konflik"))
        )
      : conflicts,
    validationSummary,
    classes,
  })

  const hasConflicts =
    scheduleRows.some((r) => r.statusValidasi.startsWith("Konflik")) ||
    conflictRows.some((c) => c.kategori === "Konflik Waktu")

  return {
    scheduleRows,
    teacherSummaryRows,
    roomSummaryRows,
    conflictRows,
    scope,
    workspaceName: workspace.name,
    className: scope === "ACTIVE_CLASS" ? activeClass?.name : undefined,
    hasConflicts,
  }
}
