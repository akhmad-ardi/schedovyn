import {
  DAY_OF_WEEK_LABELS,
  ROOM_TYPE_OPTIONS,
  SUBJECT_COLOR_OPTIONS,
  type ClassGroup,
  type Room,
  type RoomType,
  type Subject,
  type SubjectColorKey,
  type Teacher,
  type TeachingRequirement,
  type TimeInterval,
} from "@/domain/types/entities"
import { doIntervalsOverlap } from "@/domain/time/interval-utils"
import { isValidTimeString, timeToMinutes } from "@/domain/time/time-utils"

export type MasterDataValidationErrorCode =
  | "EMPTY_CLASS_NAME"
  | "EMPTY_CLASS_GRADE"
  | "DUPLICATE_CLASS_NAME"
  | "EMPTY_SUBJECT_NAME"
  | "DUPLICATE_SUBJECT_NAME"
  | "INVALID_SUBJECT_COLOR"
  | "EMPTY_TEACHER_NAME"
  | "EMPTY_ROOM_NAME"
  | "DUPLICATE_ROOM_NAME"
  | "INVALID_ROOM_TYPE"
  | "INVALID_UNAVAILABLE_TIME_FORMAT"
  | "UNAVAILABLE_END_BEFORE_START"
  | "UNAVAILABLE_INTERVAL_OVERLAP"
  | "REQUIREMENT_INVALID_CLASS"
  | "REQUIREMENT_INVALID_SUBJECT"
  | "REQUIREMENT_DUPLICATE_CLASS_SUBJECT"
  | "REQUIREMENT_INVALID_SESSIONS_PER_WEEK"
  | "REQUIREMENT_INVALID_DURATION"
  | "REQUIREMENT_INVALID_TEACHER"
  | "REQUIREMENT_INVALID_ROOM"

export interface MasterDataValidationIssue {
  code: MasterDataValidationErrorCode
  field: string
  intervalId?: string
  message: string
}

export interface MasterDataValidationResult {
  isValid: boolean
  issues: MasterDataValidationIssue[]
}

export interface ClassGroupInput {
  name: string
  grade: string
  notes?: string
}

export interface SubjectInput {
  name: string
  colorKey: SubjectColorKey
  notes?: string
}

export interface TeacherInput {
  name: string
  notes?: string
  unavailableIntervals?: TimeInterval[]
}

export interface RoomInput {
  name: string
  type: RoomType
  notes?: string
  unavailableIntervals?: TimeInterval[]
}

export interface TeachingRequirementInput {
  classId: string
  subjectId: string
  defaultTeacherId: string | null
  defaultRoomId: string | null
  sessionsPerWeek: number
  durationMinutes: number
  roomRequired: boolean
  notes?: string
}

function validateUnavailableIntervals(
  intervals: readonly TimeInterval[]
): MasterDataValidationIssue[] {
  const issues: MasterDataValidationIssue[] = []

  for (const item of intervals) {
    const dayLabel = DAY_OF_WEEK_LABELS[item.dayOfWeek] ?? item.dayOfWeek
    const isStartValid = isValidTimeString(item.startTime)
    const isEndValid = isValidTimeString(item.endTime)

    if (!isStartValid || !isEndValid) {
      issues.push({
        code: "INVALID_UNAVAILABLE_TIME_FORMAT",
        field: "unavailableIntervals",
        intervalId: item.id,
        message: `Format waktu tidak tersedia pada hari ${dayLabel} harus menggunakan format 24 jam (HH:mm).`,
      })
      continue
    }

    if (timeToMinutes(item.startTime) >= timeToMinutes(item.endTime)) {
      issues.push({
        code: "UNAVAILABLE_END_BEFORE_START",
        field: "unavailableIntervals",
        intervalId: item.id,
        message: `Waktu selesai tidak tersedia (${item.endTime}) pada hari ${dayLabel} harus lebih akhir daripada waktu mulai (${item.startTime}).`,
      })
    }
  }

  for (let i = 0; i < intervals.length; i++) {
    const intervalA = intervals[i]
    if (
      !isValidTimeString(intervalA.startTime) ||
      !isValidTimeString(intervalA.endTime) ||
      timeToMinutes(intervalA.startTime) >= timeToMinutes(intervalA.endTime)
    ) {
      continue
    }

    for (let j = i + 1; j < intervals.length; j++) {
      const intervalB = intervals[j]
      if (intervalA.dayOfWeek !== intervalB.dayOfWeek) {
        continue
      }

      if (
        !isValidTimeString(intervalB.startTime) ||
        !isValidTimeString(intervalB.endTime) ||
        timeToMinutes(intervalB.startTime) >= timeToMinutes(intervalB.endTime)
      ) {
        continue
      }

      if (
        doIntervalsOverlap(
          intervalA.startTime,
          intervalA.endTime,
          intervalB.startTime,
          intervalB.endTime
        )
      ) {
        const dayLabel =
          DAY_OF_WEEK_LABELS[intervalA.dayOfWeek] ?? intervalA.dayOfWeek
        issues.push({
          code: "UNAVAILABLE_INTERVAL_OVERLAP",
          field: "unavailableIntervals",
          intervalId: intervalB.id,
          message: `Rentang waktu tidak tersedia pada hari ${dayLabel} (${intervalA.startTime} - ${intervalA.endTime} dan ${intervalB.startTime} - ${intervalB.endTime}) saling bertabrakan.`,
        })
      }
    }
  }

  return issues
}

export function validateClassGroupInput(
  input: ClassGroupInput,
  existingClasses: readonly ClassGroup[],
  editingId?: string
): MasterDataValidationResult {
  const issues: MasterDataValidationIssue[] = []
  const normalizedName = input.name.trim()
  const normalizedGrade = input.grade.trim()

  if (normalizedName.length === 0) {
    issues.push({
      code: "EMPTY_CLASS_NAME",
      field: "name",
      message: "Nama kelas wajib diisi (contoh: VII-A).",
    })
  } else {
    const isDuplicate = existingClasses.some(
      (cls) =>
        cls.id !== editingId &&
        cls.name.trim().toLowerCase() === normalizedName.toLowerCase()
    )

    if (isDuplicate) {
      issues.push({
        code: "DUPLICATE_CLASS_NAME",
        field: "name",
        message: `Kelas dengan nama "${normalizedName}" sudah terdaftar di ruang kerja ini.`,
      })
    }
  }

  if (normalizedGrade.length === 0) {
    issues.push({
      code: "EMPTY_CLASS_GRADE",
      field: "grade",
      message: "Tingkat kelas wajib diisi (contoh: VII, VIII, X).",
    })
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

export function validateSubjectInput(
  input: SubjectInput,
  existingSubjects: readonly Subject[],
  editingId?: string
): MasterDataValidationResult {
  const issues: MasterDataValidationIssue[] = []
  const normalizedName = input.name.trim()

  if (normalizedName.length === 0) {
    issues.push({
      code: "EMPTY_SUBJECT_NAME",
      field: "name",
      message: "Nama mata pelajaran wajib diisi (contoh: Matematika).",
    })
  } else {
    const isDuplicate = existingSubjects.some(
      (sub) =>
        sub.id !== editingId &&
        sub.name.trim().toLowerCase() === normalizedName.toLowerCase()
    )

    if (isDuplicate) {
      issues.push({
        code: "DUPLICATE_SUBJECT_NAME",
        field: "name",
        message: `Mata pelajaran dengan nama "${normalizedName}" sudah terdaftar.`,
      })
    }
  }

  if (!SUBJECT_COLOR_OPTIONS.includes(input.colorKey)) {
    issues.push({
      code: "INVALID_SUBJECT_COLOR",
      field: "colorKey",
      message: "Pilihan warna mata pelajaran tidak valid.",
    })
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

export function validateTeacherInput(
  input: TeacherInput,
  existingTeachers?: readonly Teacher[],
  editingId?: string
): MasterDataValidationResult {
  void existingTeachers
  void editingId

  const issues: MasterDataValidationIssue[] = []
  const normalizedName = input.name.trim()

  if (normalizedName.length === 0) {
    issues.push({
      code: "EMPTY_TEACHER_NAME",
      field: "name",
      message: "Nama guru wajib diisi.",
    })
  }

  if (input.unavailableIntervals && input.unavailableIntervals.length > 0) {
    issues.push(...validateUnavailableIntervals(input.unavailableIntervals))
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

export function validateRoomInput(
  input: RoomInput,
  existingRooms: readonly Room[],
  editingId?: string
): MasterDataValidationResult {
  const issues: MasterDataValidationIssue[] = []
  const normalizedName = input.name.trim()

  if (normalizedName.length === 0) {
    issues.push({
      code: "EMPTY_ROOM_NAME",
      field: "name",
      message: "Nama atau nomor ruangan wajib diisi (contoh: Lab IPA 1).",
    })
  } else {
    const isDuplicate = existingRooms.some(
      (room) =>
        room.id !== editingId &&
        room.name.trim().toLowerCase() === normalizedName.toLowerCase()
    )

    if (isDuplicate) {
      issues.push({
        code: "DUPLICATE_ROOM_NAME",
        field: "name",
        message: `Ruangan dengan nama "${normalizedName}" sudah terdaftar.`,
      })
    }
  }

  if (!ROOM_TYPE_OPTIONS.includes(input.type)) {
    issues.push({
      code: "INVALID_ROOM_TYPE",
      field: "type",
      message: "Jenis ruangan tidak valid.",
    })
  }

  if (input.unavailableIntervals && input.unavailableIntervals.length > 0) {
    issues.push(...validateUnavailableIntervals(input.unavailableIntervals))
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

export function validateTeachingRequirementInput(
  input: TeachingRequirementInput,
  context: {
    classes: readonly ClassGroup[]
    subjects: readonly Subject[]
    teachers: readonly Teacher[]
    rooms: readonly Room[]
    existingRequirements: readonly TeachingRequirement[]
  },
  editingId?: string
): MasterDataValidationResult {
  const issues: MasterDataValidationIssue[] = []

  const classExists = context.classes.some((cls) => cls.id === input.classId)
  if (!classExists) {
    issues.push({
      code: "REQUIREMENT_INVALID_CLASS",
      field: "classId",
      message: "Pilih kelas yang valid dari daftar kelas.",
    })
  }

  const subjectExists = context.subjects.some(
    (sub) => sub.id === input.subjectId
  )
  if (!subjectExists) {
    issues.push({
      code: "REQUIREMENT_INVALID_SUBJECT",
      field: "subjectId",
      message: "Pilih mata pelajaran yang valid dari daftar mata pelajaran.",
    })
  }

  if (classExists && subjectExists) {
    const isDuplicatePair = context.existingRequirements.some(
      (req) =>
        req.id !== editingId &&
        req.classId === input.classId &&
        req.subjectId === input.subjectId
    )

    if (isDuplicatePair) {
      issues.push({
        code: "REQUIREMENT_DUPLICATE_CLASS_SUBJECT",
        field: "subjectId",
        message:
          "Kebutuhan pembelajaran untuk pasangan kelas dan mata pelajaran ini sudah ada.",
      })
    }
  }

  if (
    !Number.isInteger(input.sessionsPerWeek) ||
    input.sessionsPerWeek < 1 ||
    input.sessionsPerWeek > 30
  ) {
    issues.push({
      code: "REQUIREMENT_INVALID_SESSIONS_PER_WEEK",
      field: "sessionsPerWeek",
      message:
        "Jumlah sesi per minggu harus berupa bilangan bulat antara 1 hingga 30 sesi.",
    })
  }

  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 5 ||
    input.durationMinutes > 480
  ) {
    issues.push({
      code: "REQUIREMENT_INVALID_DURATION",
      field: "durationMinutes",
      message:
        "Durasi setiap sesi harus berupa bilangan bulat antara 5 hingga 480 menit.",
    })
  }

  if (input.defaultTeacherId !== null) {
    const teacherExists = context.teachers.some(
      (tch) => tch.id === input.defaultTeacherId
    )
    if (!teacherExists) {
      issues.push({
        code: "REQUIREMENT_INVALID_TEACHER",
        field: "defaultTeacherId",
        message: "Guru default yang dipilih tidak ditemukan di data master.",
      })
    }
  }

  if (input.defaultRoomId !== null) {
    const roomExists = context.rooms.some((rm) => rm.id === input.defaultRoomId)
    if (!roomExists) {
      issues.push({
        code: "REQUIREMENT_INVALID_ROOM",
        field: "defaultRoomId",
        message: "Ruangan default yang dipilih tidak ditemukan di data master.",
      })
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}
