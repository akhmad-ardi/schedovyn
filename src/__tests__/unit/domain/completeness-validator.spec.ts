import { describe, expect, it } from "vitest"
import { evaluateCompletenessWarnings } from "@/domain/validation/completeness-validator"
import type {
  ClassGroup,
  Subject,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

describe("FR-05.6 & AC-08: evaluateCompletenessWarnings", () => {
  const classes: ClassGroup[] = [
    { id: "cls-7a", workspaceId: "ws-1", name: "VII-A", grade: "VII" },
    { id: "cls-7b", workspaceId: "ws-1", name: "VII-B", grade: "VII" },
    { id: "cls-7c", workspaceId: "ws-1", name: "VII-C", grade: "VII" }, // unconfigured
  ]

  const subjects: Subject[] = [
    { id: "sub-math", workspaceId: "ws-1", name: "Matematika", colorKey: "blue" },
    { id: "sub-eng", workspaceId: "ws-1", name: "Bahasa Inggris", colorKey: "emerald" },
  ]

  it("1. mendeteksi UNFULFILLED_REQUIREMENT saat alokasi sesi belum lengkap (AC-08)", () => {
    const requirements: TeachingRequirement[] = [
      {
        id: "req-math-7a",
        workspaceId: "ws-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        defaultTeacherId: "tch-1",
        defaultRoomId: null,
        sessionsPerWeek: 4,
        durationMinutes: 45,
        roomRequired: false,
      },
      {
        id: "req-eng-7a",
        workspaceId: "ws-1",
        classId: "cls-7a",
        subjectId: "sub-eng",
        defaultTeacherId: "tch-2",
        defaultRoomId: null,
        sessionsPerWeek: 2,
        durationMinutes: 45,
        roomRequired: false,
      },
    ]

    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-2",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "tuesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-3",
        workspaceId: "ws-1",
        requirementId: "req-eng-7a",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "wednesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-4",
        workspaceId: "ws-1",
        requirementId: "req-eng-7a",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "thursday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const unfulfilled = warnings.filter((w) => w.warningType === "UNFULFILLED_REQUIREMENT")
    expect(unfulfilled.length).toBeGreaterThan(0)

    const mathWarn = unfulfilled.find((w) => w.requirementId === "req-math-7a")
    expect(mathWarn).toBeDefined()
    expect(mathWarn?.missingSessionCount).toBe(2)
    expect(mathWarn?.description).toContain("2 sesi belum terjadwal")
  })

  it("2. mendeteksi OVER_SCHEDULED_SESSION saat sesi terjadwal melebihi kebutuhan alokasi", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-math-7b",
        classId: "cls-7b",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-2",
        workspaceId: "ws-1",
        requirementId: "req-math-7b",
        classId: "cls-7b",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "tuesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-3",
        workspaceId: "ws-1",
        requirementId: "req-math-7b",
        classId: "cls-7b",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "wednesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
    ]

    const requirements: TeachingRequirement[] = [
      {
        id: "req-math-7b",
        workspaceId: "ws-1",
        classId: "cls-7b",
        subjectId: "sub-math",
        defaultTeacherId: "tch-1",
        defaultRoomId: null,
        sessionsPerWeek: 2,
        durationMinutes: 45,
        roomRequired: false,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const overScheduled = warnings.filter((w) => w.warningType === "OVER_SCHEDULED_SESSION")
    expect(overScheduled).toHaveLength(1)
    expect(overScheduled[0].requirementId).toBe("req-math-7b")
    expect(overScheduled[0].description).toContain("1 sesi lebih")
  })

  it("3. mendeteksi MISSING_TEACHER saat sesi terjadwal belum memiliki guru", () => {
    const requirements: TeachingRequirement[] = [
      {
        id: "req-1",
        workspaceId: "ws-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        defaultTeacherId: null,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      },
    ]

    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: null,
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const missingTeacher = warnings.filter((w) => w.warningType === "MISSING_TEACHER")
    expect(missingTeacher).toHaveLength(1)
    expect(missingTeacher[0].sessionId).toBe("ses-1")
  })

  it("4. mendeteksi MISSING_REQUIRED_ROOM saat kebutuhan mewajibkan ruangan namun sesi belum ditentukan ruangannya", () => {
    const requirements: TeachingRequirement[] = [
      {
        id: "req-1",
        workspaceId: "ws-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        defaultTeacherId: "tch-1",
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: true,
      },
    ]

    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const missingRoom = warnings.filter((w) => w.warningType === "MISSING_REQUIRED_ROOM")
    expect(missingRoom).toHaveLength(1)
    expect(missingRoom[0].sessionId).toBe("ses-1")
  })

  it("5. mendeteksi UNCONFIGURED_CLASS pada kelas yang belum memiliki kebutuhan pembelajaran sama sekali", () => {
    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements: [],
      sessions: [],
    })

    const unconfigured = warnings.filter((w) => w.warningType === "UNCONFIGURED_CLASS")
    expect(unconfigured).toHaveLength(3)
    const classIds = unconfigured.map((u) => u.classId)
    expect(classIds).toContain("cls-7a")
    expect(classIds).toContain("cls-7b")
    expect(classIds).toContain("cls-7c")
  })
})
