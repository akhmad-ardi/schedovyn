import {
  ORDERED_DAYS_OF_WEEK,
  SNAP_INTERVAL_OPTIONS,
  type ClassGroup,
  type CreateWorkspaceInput,
  type DayScheduleConfig,
  type DuplicateWorkspaceInput,
  type Room,
  type Subject,
  type Teacher,
  type TeachingRequirement,
  type TimetableSession,
  type Workspace,
} from "../types/entities"

export interface WorkspaceEntityBundle {
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
  classes: ClassGroup[]
  teachers: Teacher[]
  subjects: Subject[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]
}

export interface CloneWorkspaceParams {
  source: WorkspaceEntityBundle
  input: DuplicateWorkspaceInput
  generateId?: () => string
  nowIso?: string
}

export interface ValidateWorkspaceMetaResult {
  valid: boolean
  errors: string[]
}

/**
 * Memvalidasi input metadata pembuatan atau duplikasi ruang kerja.
 */
export function validateWorkspaceMetaInput(input: {
  name: string
  academicPeriod: string
  defaultSnapIntervalMinutes?: number
}): ValidateWorkspaceMetaResult {
  const errors: string[] = []
  if (input.name.trim().length === 0) {
    errors.push("Nama ruang kerja tidak boleh kosong.")
  }
  if (input.academicPeriod.trim().length === 0) {
    errors.push("Periode akademik tidak boleh kosong.")
  }
  if (
    input.defaultSnapIntervalMinutes !== undefined &&
    !SNAP_INTERVAL_OPTIONS.includes(
      input.defaultSnapIntervalMinutes as (typeof SNAP_INTERVAL_OPTIONS)[number]
    )
  ) {
    errors.push(
      "Interval snap default harus bernilai 5, 10, 15, 30, atau 60 menit."
    )
  }
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Membuat bundel ruang kerja kosong (BLANK) dengan 7 konfigurasi hari bawaan
 * (Senin-Jumat aktif 07:00-14:00 [Jumat 07:00-11:30], Sabtu-Minggu nonaktif).
 */
export function createBlankWorkspaceBundle(params: {
  input: CreateWorkspaceInput
  generateId?: () => string
  nowIso?: string
}): WorkspaceEntityBundle {
  const {
    input,
    generateId = () => crypto.randomUUID(),
    nowIso = new Date().toISOString(),
  } = params

  const workspaceId = generateId()
  const workspace: Workspace = {
    id: workspaceId,
    name: input.name.trim(),
    academicPeriod: input.academicPeriod.trim(),
    activeClassId: null,
    defaultSnapIntervalMinutes: input.defaultSnapIntervalMinutes,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  const dayConfigs: DayScheduleConfig[] = ORDERED_DAYS_OF_WEEK.map((day) => {
    const isWeekend = day === "saturday" || day === "sunday"
    return {
      id: generateId(),
      workspaceId,
      dayOfWeek: day,
      isSchoolDay: !isWeekend,
      startTime: "07:00",
      endTime: day === "friday" ? "11:30" : "14:00",
      snapIntervalMinutes: input.defaultSnapIntervalMinutes,
      breakIntervals: isWeekend
        ? []
        : [
            {
              id: generateId(),
              startTime: "09:45",
              endTime: "10:15",
              label: "Istirahat Pagi",
            },
          ],
    }
  })

  return {
    workspace,
    dayConfigs,
    classes: [],
    teachers: [],
    subjects: [],
    rooms: [],
    requirements: [],
    sessions: [],
  }
}

/**
 * Menduplikasi seluruh entitas dari ruang kerja sumber ke ruang kerja baru
 * dengan ID unik baru dan pemetaan ulang seluruh relasi foreign key.
 */
export function cloneWorkspaceSnapshot(
  params: CloneWorkspaceParams
): WorkspaceEntityBundle {
  const {
    source,
    input,
    generateId = () => crypto.randomUUID(),
    nowIso = new Date().toISOString(),
  } = params

  const newWorkspaceId = generateId()

  const classIdMap = new Map<string, string>()
  const teacherIdMap = new Map<string, string>()
  const subjectIdMap = new Map<string, string>()
  const roomIdMap = new Map<string, string>()
  const requirementIdMap = new Map<string, string>()

  const classes: ClassGroup[] = source.classes.map((cls) => {
    const newId = generateId()
    classIdMap.set(cls.id, newId)
    return {
      ...cls,
      id: newId,
      workspaceId: newWorkspaceId,
    }
  })

  const teachers: Teacher[] = source.teachers.map((teacher) => {
    const newId = generateId()
    teacherIdMap.set(teacher.id, newId)
    return {
      ...teacher,
      id: newId,
      workspaceId: newWorkspaceId,
      unavailableIntervals: teacher.unavailableIntervals.map((interval) => ({
        ...interval,
        id: generateId(),
      })),
    }
  })

  const subjects: Subject[] = source.subjects.map((subject) => {
    const newId = generateId()
    subjectIdMap.set(subject.id, newId)
    return {
      ...subject,
      id: newId,
      workspaceId: newWorkspaceId,
    }
  })

  const rooms: Room[] = source.rooms.map((room) => {
    const newId = generateId()
    roomIdMap.set(room.id, newId)
    return {
      ...room,
      id: newId,
      workspaceId: newWorkspaceId,
      unavailableIntervals: room.unavailableIntervals.map((interval) => ({
        ...interval,
        id: generateId(),
      })),
    }
  })

  const dayConfigs: DayScheduleConfig[] = source.dayConfigs.map((cfg) => ({
    ...cfg,
    id: generateId(),
    workspaceId: newWorkspaceId,
    breakIntervals: cfg.breakIntervals.map((brk) => ({
      ...brk,
      id: generateId(),
    })),
  }))

  const requirements: TeachingRequirement[] = source.requirements.map(
    (req) => {
      const newId = generateId()
      requirementIdMap.set(req.id, newId)
      return {
        ...req,
        id: newId,
        workspaceId: newWorkspaceId,
        classId: classIdMap.get(req.classId) ?? req.classId,
        subjectId: subjectIdMap.get(req.subjectId) ?? req.subjectId,
        defaultTeacherId: req.defaultTeacherId
          ? (teacherIdMap.get(req.defaultTeacherId) ?? null)
          : null,
        defaultRoomId: req.defaultRoomId
          ? (roomIdMap.get(req.defaultRoomId) ?? null)
          : null,
      }
    }
  )

  const sessions: TimetableSession[] =
    input.mode === "MASTER_DATA_ONLY"
      ? []
      : source.sessions.map((session) => ({
          ...session,
          id: generateId(),
          workspaceId: newWorkspaceId,
          requirementId: session.requirementId
            ? (requirementIdMap.get(session.requirementId) ?? null)
            : null,
          classId: classIdMap.get(session.classId) ?? session.classId,
          subjectId: subjectIdMap.get(session.subjectId) ?? session.subjectId,
          teacherId: session.teacherId
            ? (teacherIdMap.get(session.teacherId) ?? null)
            : null,
          roomId: session.roomId
            ? (roomIdMap.get(session.roomId) ?? null)
            : null,
        }))

  const mappedActiveClassId = source.workspace.activeClassId
    ? (classIdMap.get(source.workspace.activeClassId) ??
      classes[0]?.id ??
      null)
    : (classes[0]?.id ?? null)

  const workspace: Workspace = {
    id: newWorkspaceId,
    name: input.name.trim(),
    academicPeriod: input.academicPeriod.trim(),
    activeClassId: mappedActiveClassId,
    defaultSnapIntervalMinutes: source.workspace.defaultSnapIntervalMinutes,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  return {
    workspace,
    dayConfigs,
    classes,
    teachers,
    subjects,
    rooms,
    requirements,
    sessions,
  }
}
