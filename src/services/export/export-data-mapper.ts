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
import type {
  ScheduleConflict,
  ScopeValidationSummary,
} from "@/domain/types/validation"
import type {
  ExportClassPayload,
  ExportConflictAppendixItem,
  ExportScope,
  ExportSessionRow,
} from "@/services/export/export-types"

export interface MapClassScheduleParams {
  classGroup: ClassGroup
  workspace: Workspace
  dayConfigs: readonly DayScheduleConfig[]
  sessions: readonly TimetableSession[]
  subjects: readonly Subject[]
  teachers: readonly Teacher[]
  rooms: readonly Room[]
  conflicts: readonly ScheduleConflict[]
  validationSummary?: ScopeValidationSummary | null
  classes?: readonly ClassGroup[]
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function formatPdfDownloadFileName(
  scope: ExportScope,
  workspaceName: string,
  className?: string
): string {
  const cleanWorkspace = sanitizeFileName(workspaceName)
  if (scope === "ACTIVE_CLASS") {
    const cleanClass = sanitizeFileName(className ?? "Kelas")
    return `Jadwal_${cleanWorkspace}_Kelas_${cleanClass}.pdf`
  }
  return `Jadwal_${cleanWorkspace}_Semua_Kelas.pdf`
}

export function mapClassScheduleForExport(
  params: MapClassScheduleParams
): ExportClassPayload {
  const {
    classGroup,
    workspace,
    sessions,
    subjects,
    teachers,
    rooms,
    conflicts,
    validationSummary,
    classes,
  } = params

  const subjectMap = new Map<string, Subject>(
    subjects.map((sub) => [sub.id, sub])
  )
  const teacherMap = new Map<string, Teacher>(
    teachers.map((tch) => [tch.id, tch])
  )
  const roomMap = new Map<string, Room>(rooms.map((rm) => [rm.id, rm]))
  const classMap = new Map<string, ClassGroup>(
    classes
      ? classes.map((cls) => [cls.id, cls])
      : [[classGroup.id, classGroup]]
  )

  const dayIndexMap = new Map<string, number>(
    ORDERED_DAYS_OF_WEEK.map((day, idx) => [day, idx])
  )

  const classSessions = sessions.filter(
    (session) => session.classId === classGroup.id
  )
  const classSessionIds = new Set(classSessions.map((s) => s.id))

  const sortedSessions = [...classSessions].sort((a, b) => {
    const dayA = dayIndexMap.get(a.dayOfWeek) ?? 99
    const dayB = dayIndexMap.get(b.dayOfWeek) ?? 99
    if (dayA !== dayB) {
      return dayA - dayB
    }
    const startA = timeToMinutes(a.startTime)
    const startB = timeToMinutes(b.startTime)
    if (startA !== startB) {
      return startA - startB
    }
    return timeToMinutes(a.endTime) - timeToMinutes(b.endTime)
  })

  const rows: ExportSessionRow[] = sortedSessions.map((session) => {
    const subject = subjectMap.get(session.subjectId)
    const teacher = session.teacherId
      ? teacherMap.get(session.teacherId)
      : undefined
    const room = session.roomId ? roomMap.get(session.roomId) : undefined

    const matchedConflicts = conflicts.filter((conflict) =>
      conflict.affectedSessionIds.includes(session.id)
    )
    const hasConflict = matchedConflicts.length > 0

    const conflictNotes = hasConflict
      ? matchedConflicts.map((c) => c.description).join("; ")
      : ""

    return {
      sessionId: session.id,
      dayOfWeek: session.dayOfWeek,
      dayLabel: DAY_OF_WEEK_LABELS[session.dayOfWeek] ?? session.dayOfWeek,
      timeRange: `${session.startTime} - ${session.endTime}`,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.durationMinutes,
      subjectName: subject?.name ?? "Mata Pelajaran Tidak Diketahui",
      teacherName: teacher?.name ?? "-",
      roomName: room?.name ?? "-",
      hasConflict,
      conflictBadges: hasConflict ? ["[KONFLIK]"] : [],
      conflictNotes,
    }
  })

  const relevantConflicts = conflicts.filter(
    (conflict) =>
      conflict.affectedClassIds.includes(classGroup.id) ||
      conflict.affectedSessionIds.some((sessionId) =>
        classSessionIds.has(sessionId)
      )
  )

  const conflictAppendix: ExportConflictAppendixItem[] = relevantConflicts.map(
    (conflict) => {
      const affectedClassNames = conflict.affectedClassIds.map(
        (clsId) => classMap.get(clsId)?.name ?? clsId
      )

      return {
        conflictId: conflict.id,
        title: conflict.title,
        description: conflict.description,
        dayLabel:
          DAY_OF_WEEK_LABELS[conflict.dayOfWeek] ?? conflict.dayOfWeek,
        timeRange: `${conflict.startTime} - ${conflict.endTime}`,
        affectedClasses:
          affectedClassNames.length > 0
            ? affectedClassNames
            : [classGroup.name],
      }
    }
  )

  const hasConflicts =
    rows.some((row) => row.hasConflict) || conflictAppendix.length > 0
  const totalSessions = rows.length
  const totalDurationMinutes = rows.reduce(
    (acc, row) => acc + row.durationMinutes,
    0
  )

  return {
    classGroup,
    workspace,
    rows,
    conflictAppendix,
    hasConflicts,
    totalSessions,
    totalDurationMinutes,
    validationSummary: validationSummary ?? null,
  }
}

export function mapWorkspaceScheduleForExport(params: {
  classes: readonly ClassGroup[]
  workspace: Workspace
  dayConfigs: readonly DayScheduleConfig[]
  sessions: readonly TimetableSession[]
  subjects: readonly Subject[]
  teachers: readonly Teacher[]
  rooms: readonly Room[]
  conflicts: readonly ScheduleConflict[]
  validationSummaryByClass?: Record<string, ScopeValidationSummary>
}): ExportClassPayload[] {
  const sortedClasses = [...params.classes].sort((a, b) =>
    a.name.localeCompare(b.name, "id", { numeric: true })
  )

  return sortedClasses.map((classGroup) =>
    mapClassScheduleForExport({
      classGroup,
      workspace: params.workspace,
      dayConfigs: params.dayConfigs,
      sessions: params.sessions,
      subjects: params.subjects,
      teachers: params.teachers,
      rooms: params.rooms,
      conflicts: params.conflicts,
      validationSummary:
        params.validationSummaryByClass?.[classGroup.id] ?? null,
      classes: params.classes,
    })
  )
}
