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
    { id: "cls-empty", workspaceId: "ws-1", name: "VIII-C", grade: "VIII" },
  ]

  const subjects: Subject[] = [
    { id: "sub-math", workspaceId: "ws-1", name: "Matematika", colorKey: "blue" },
    { id: "sub-eng", workspaceId: "ws-1", name: "Bahasa Inggris", colorKey: "emerald" },
  ]

  const requirements: TeachingRequirement[] = [
    {
      id: "req-math-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: "rm-1",
      sessionsPerWeek: 4,
      durationMinutes: 45,
      roomRequired: true,
    },
    {
      id: "req-eng-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-eng",
      defaultTeacherId: null,
      defaultRoomId: null,
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    },
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

  it("1. mendeteksi UNFULFILLED_REQUIREMENT saat alokasi sesi belum lengkap (AC-08)", () => {
    // Math 7A butuh 4 sesi, baru dijadwalkan 2 sesi -> kurang 2 sesi
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
      {
        id: "ses-2",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "tuesday",
        startTime: "07:30",
        endTime: "08:15",
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
    expect(mathWarn?.description).toContain("kurang 2 sesi")
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
        startTime: "07:30",
        endTime: "08:15",
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
        startTime: "07:30",
        endTime: "08:15",
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
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const overWarn = warnings.find((w) => w.warningType === "OVER_SCHEDULED_SESSION" && w.requirementId === "req-math-7b")
    expect(overWarn).toBeDefined()
    expect(overWarn?.description).toContain("melebihi")
  })

  it("3. mendeteksi MISSING_TEACHER saat sesi terjadwal belum memiliki guru", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-no-tch",
        workspaceId: "ws-1",
        requirementId: "req-eng-7a",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: null, // Tanpa guru
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const missingTch = warnings.find((w) => w.warningType === "MISSING_TEACHER" && w.sessionId === "ses-no-tch")
    expect(missingTch).toBeDefined()
  })

  it("4. mendeteksi MISSING_REQUIRED_ROOM saat kebutuhan mewajibkan ruangan namun sesi belum ditentukan ruangannya", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-no-rm",
        workspaceId: "ws-1",
        requirementId: "req-math-7a", // roomRequired: true
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: null, // Belum ditentukan ruangan
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions,
    })

    const missingRm = warnings.find((w) => w.warningType === "MISSING_REQUIRED_ROOM" && w.sessionId === "ses-no-rm")
    expect(missingRm).toBeDefined()
  })

  it("5. mendeteksi UNCONFIGURED_CLASS pada kelas yang belum memiliki kebutuhan pembelajaran sama sekali", () => {
    const warnings = evaluateCompletenessWarnings({
      classes,
      subjects,
      requirements,
      sessions: [],
    })

    const unconfigured = warnings.find((w) => w.warningType === "UNCONFIGURED_CLASS" && w.classId === "cls-empty")
    expect(unconfigured).toBeDefined()
  })
})
