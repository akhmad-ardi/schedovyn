import { describe, expect, it } from "vitest"
import { evaluateWorkspaceValidation } from "@/domain/validation/workspace-validator"
import type {
  ClassGroup,
  DayScheduleConfig,
  Room,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

describe("FR-11, AC-13: evaluateWorkspaceValidation & Derivasi 4 Status Validasi", () => {
  const dayConfigs: DayScheduleConfig[] = [
    {
      id: "day-mon",
      workspaceId: "ws-1",
      dayOfWeek: "monday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
  ]

  const classes: ClassGroup[] = [
    { id: "cls-7a", workspaceId: "ws-1", name: "VII-A", grade: "VII" },
    { id: "cls-8a", workspaceId: "ws-1", name: "VIII-A", grade: "VIII" },
  ]

  const teachers: Teacher[] = [
    { id: "tch-1", workspaceId: "ws-1", name: "Budi", unavailableIntervals: [] },
  ]
  const rooms: Room[] = []
  const subjects: Subject[] = [
    { id: "sub-1", workspaceId: "ws-1", name: "Matematika", colorKey: "blue" },
  ]

  const requirements: TeachingRequirement[] = [
    {
      id: "req-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-1",
      defaultTeacherId: "tch-1",
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    },
    {
      id: "req-8a",
      workspaceId: "ws-1",
      classId: "cls-8a",
      subjectId: "sub-1",
      defaultTeacherId: "tch-1",
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    },
  ]

  it("1. status CONFLICT_DETECTED ketika terdapat minimal satu bentrokan waktu aktif", () => {
    // Sesi 7A dan Sesi 8A dengan guru yang sama pada waktu yang sama
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
        classId: "cls-7a",
        subjectId: "sub-1",
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
        requirementId: "req-8a",
        classId: "cls-8a",
        subjectId: "sub-1",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      requirements,
      sessions,
      activeClassId: "cls-7a",
    })

    expect(report.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(report.workspaceSummary.activeConflictsCount).toBeGreaterThan(0)
    expect(report.byClassId["cls-7a"]?.status).toBe("CONFLICT_DETECTED")
    expect(report.conflictsBySessionId["ses-1"]).toBeDefined()
  })

  it("2. status INCOMPLETE saat 0 konflik namun masih ada alokasi sesi yang belum terjadwal", () => {
    // Baru 1 sesi 7A ditempatkan, sesi 8A masih kosong
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
        classId: "cls-7a",
        subjectId: "sub-1",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      requirements,
      sessions,
      activeClassId: "cls-8a", // Kelas aktif 8A masih belum punya sesi
    })

    expect(report.workspaceSummary.status).toBe("INCOMPLETE")
    expect(report.workspaceSummary.activeConflictsCount).toBe(0)
    expect(report.workspaceSummary.unscheduledSessionsCount).toBe(1)
    expect(report.byClassId["cls-8a"]?.status).toBe("INCOMPLETE")
  })

  it("3. status NO_CONFLICT_CURRENT_DATA saat kelas aktif lengkap tetapi kelas lain belum lengkap/berkonflik (AC-13)", () => {
    // Sesi 7A lengkap, 8A belum terjadwal
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
        classId: "cls-7a",
        subjectId: "sub-1",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      requirements,
      sessions,
      activeClassId: "cls-7a", // 7A lengkap dan 0 konflik
    })

    // Kelas aktif 7A berstatus NO_CONFLICT_CURRENT_DATA (tidak ada konflik pada data saat ini)
    expect(report.byClassId["cls-7a"]?.status).toBe("NO_CONFLICT_CURRENT_DATA")
    // Dan sistem TIDAK menyatakan workspace global COMPLETE_AND_VALID
    expect(report.workspaceSummary.status).not.toBe("COMPLETE_AND_VALID")
  })

  it("4. status COMPLETE_AND_VALID saat seluruh kelas di ruang kerja terisi penuh dan 0 konflik", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
        classId: "cls-7a",
        subjectId: "sub-1",
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
        requirementId: "req-8a",
        classId: "cls-8a",
        subjectId: "sub-1",
        teacherId: "tch-1",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "08:15",
        endTime: "09:00",
        durationMinutes: 45,
      },
    ]

    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      requirements,
      sessions,
      activeClassId: "cls-7a",
    })

    expect(report.workspaceSummary.status).toBe("COMPLETE_AND_VALID")
    expect(report.workspaceSummary.statusLabel).toBe("Jadwal lengkap dan valid")
    expect(report.workspaceSummary.activeConflictsCount).toBe(0)
    expect(report.workspaceSummary.unscheduledSessionsCount).toBe(0)
  })

  it("5. menyediakan pemetaan cepat conflictsBySessionId dan warningsBySessionId untuk pencarian O(1)", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-x",
        workspaceId: "ws-1",
        requirementId: "req-7a",
        classId: "cls-7a",
        subjectId: "sub-1",
        teacherId: null, // Peringatan MISSING_TEACHER
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      requirements,
      sessions,
      activeClassId: "cls-7a",
    })

    expect(report.warningsBySessionId["ses-x"]).toBeDefined()
    expect(report.warningsBySessionId["ses-x"].some((w) => w.warningType === "MISSING_TEACHER")).toBe(true)
  })
})
