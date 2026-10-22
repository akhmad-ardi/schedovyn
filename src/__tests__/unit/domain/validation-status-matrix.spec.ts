import { describe, expect, it } from "vitest"
import type {
  ClassGroup,
  DayScheduleConfig,
  Room,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"
import { VALIDATION_STATUS_LABELS } from "@/domain/types/validation"
import { evaluateWorkspaceValidation } from "@/domain/validation/workspace-validator"

describe("QA-11.1 & FR-11: Validation Status Matrix & AC-13 (validation-status-matrix)", () => {
  const dayConfigs: DayScheduleConfig[] = [
    {
      id: "dc-mon",
      workspaceId: "ws-1",
      dayOfWeek: "monday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
  ]

  const class7A: ClassGroup = {
    id: "cls-7a",
    workspaceId: "ws-1",
    name: "VII-A",
    grade: "VII",
  }

  const class8A: ClassGroup = {
    id: "cls-8a",
    workspaceId: "ws-1",
    name: "VIII-A",
    grade: "VIII",
  }

  const subMath: Subject = {
    id: "sub-math",
    workspaceId: "ws-1",
    name: "Matematika",
    colorKey: "blue",
  }

  const teacherBudi: Teacher = {
    id: "tch-1",
    workspaceId: "ws-1",
    name: "Budi Santoso",
    unavailableIntervals: [],
  }

  const room101: Room = {
    id: "rm-1",
    workspaceId: "ws-1",
    name: "Ruang 101",
    type: "classroom",
    unavailableIntervals: [],
  }

  it("1. skenario CONFLICT_DETECTED: ada bentrokan guru menghasilkan status CONFLICT_DETECTED", () => {
    // Kebutuhan masing-masing kelas 1 sesi
    const req7A: TeachingRequirement = {
      id: "req-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: "rm-1",
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    }

    const req8A: TeachingRequirement = {
      id: "req-8a",
      workspaceId: "ws-1",
      classId: "cls-8a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    }

    // Kedua sesi dijadwalkan pada waktu yang sama dengan guru yang sama (Budi)
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
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
        requirementId: "req-8a",
        classId: "cls-8a",
        subjectId: "sub-math",
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
      classes: [class7A, class8A],
      teachers: [teacherBudi],
      rooms: [room101],
      subjects: [subMath],
      requirements: [req7A, req8A],
      sessions,
      activeClassId: "cls-7a",
    })

    // Global berstatus CONFLICT_DETECTED
    expect(report.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(report.workspaceSummary.statusLabel).toBe(
      VALIDATION_STATUS_LABELS.CONFLICT_DETECTED
    )
    expect(report.workspaceSummary.activeConflictsCount).toBeGreaterThanOrEqual(1)

    // Kedua kelas terlibat konflik
    expect(report.byClassId["cls-7a"].status).toBe("CONFLICT_DETECTED")
    expect(report.byClassId["cls-8a"].status).toBe("CONFLICT_DETECTED")
  })

  it("2. skenario INCOMPLETE & AC-13: 0 konflik waktu tetapi masih ada kebutuhan sesi yang belum terjadwal DILARANG berstatus COMPLETE_AND_VALID", () => {
    // Kelas 7A butuh 2 sesi, baru 1 yang ditempatkan (tanpa bentrokan)
    const req7A: TeachingRequirement = {
      id: "req-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: "rm-1",
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    }

    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:15",
        durationMinutes: 45,
      },
    ]

    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes: [class7A],
      teachers: [teacherBudi],
      rooms: [room101],
      subjects: [subMath],
      requirements: [req7A],
      sessions,
      activeClassId: "cls-7a",
    })

    // DILARANG bernilai COMPLETE_AND_VALID
    expect(report.workspaceSummary.status).not.toBe("COMPLETE_AND_VALID")
    expect(report.workspaceSummary.status).toBe("INCOMPLETE")
    expect(report.workspaceSummary.statusLabel).toBe(
      VALIDATION_STATUS_LABELS.INCOMPLETE
    )
    expect(report.workspaceSummary.activeConflictsCount).toBe(0)
    expect(report.workspaceSummary.unscheduledSessionsCount).toBe(1)
  })

  it("3. skenario NO_CONFLICT_CURRENT_DATA: kelas aktif telah lengkap & bebas konflik, namun sekolah global belum selesai (AC-FR11-05)", () => {
    // Kelas 8A butuh 1 sesi (telah ditempatkan, lengkap 100%)
    const req8A: TeachingRequirement = {
      id: "req-8a",
      workspaceId: "ws-1",
      classId: "cls-8a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    }

    // Kelas 7A butuh 1 sesi (belum ditempatkan sama sekali)
    const req7A: TeachingRequirement = {
      id: "req-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    }

    const sessions: TimetableSession[] = [
      {
        id: "ses-8a-1",
        workspaceId: "ws-1",
        requirementId: "req-8a",
        classId: "cls-8a",
        subjectId: "sub-math",
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
      classes: [class7A, class8A],
      teachers: [teacherBudi],
      rooms: [room101],
      subjects: [subMath],
      requirements: [req7A, req8A],
      sessions,
      activeClassId: "cls-8a", // Kelas aktif adalah 8A
    })

    // Kelas 8A berstatus NO_CONFLICT_CURRENT_DATA karena dirinya lengkap dan bebas konflik,
    // tetapi ruang kerja global masih belum selesai.
    expect(report.byClassId["cls-8a"].status).toBe("NO_CONFLICT_CURRENT_DATA")
    expect(report.byClassId["cls-8a"].statusLabel).toBe(
      VALIDATION_STATUS_LABELS.NO_CONFLICT_CURRENT_DATA
    )

    // Ruang kerja global tetap INCOMPLETE
    expect(report.workspaceSummary.status).toBe("INCOMPLETE")
    expect(report.byClassId["cls-7a"].status).toBe("INCOMPLETE")
  })

  it("4. skenario COMPLETE_AND_VALID: 100% kebutuhan seluruh kelas terpenuhi tanpa konflik", () => {
    const req7A: TeachingRequirement = {
      id: "req-7a",
      workspaceId: "ws-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: "rm-1",
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    }

    const req8A: TeachingRequirement = {
      id: "req-8a",
      workspaceId: "ws-1",
      classId: "cls-8a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    }

    // Dua sesi pada jam berbeda (tidak bentrok)
    const sessions: TimetableSession[] = [
      {
        id: "ses-7a-1",
        workspaceId: "ws-1",
        requirementId: "req-7a",
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
        id: "ses-8a-1",
        workspaceId: "ws-1",
        requirementId: "req-8a",
        classId: "cls-8a",
        subjectId: "sub-math",
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
      classes: [class7A, class8A],
      teachers: [teacherBudi],
      rooms: [room101],
      subjects: [subMath],
      requirements: [req7A, req8A],
      sessions,
      activeClassId: "cls-7a",
    })

    expect(report.workspaceSummary.status).toBe("COMPLETE_AND_VALID")
    expect(report.workspaceSummary.statusLabel).toBe(
      VALIDATION_STATUS_LABELS.COMPLETE_AND_VALID
    )
    expect(report.workspaceSummary.activeConflictsCount).toBe(0)
    expect(report.workspaceSummary.unscheduledSessionsCount).toBe(0)
    expect(report.byClassId["cls-7a"].status).toBe("COMPLETE_AND_VALID")
    expect(report.byClassId["cls-8a"].status).toBe("COMPLETE_AND_VALID")
  })

  it("5. memverifikasi kehadiran 5 metrik minimal pada objek ScopeValidationSummary (AC-FR11-01)", () => {
    const report = evaluateWorkspaceValidation({
      dayConfigs,
      classes: [class7A],
      teachers: [teacherBudi],
      rooms: [room101],
      subjects: [subMath],
      requirements: [],
      sessions: [],
      activeClassId: "cls-7a",
    })

    const summary = report.workspaceSummary
    expect(typeof summary.scheduledSessionsCount).toBe("number")
    expect(typeof summary.unscheduledSessionsCount).toBe("number")
    expect(typeof summary.activeConflictsCount).toBe("number")
    expect(typeof summary.completenessWarningsCount).toBe("number")
    expect(typeof summary.status).toBe("string")
    expect(typeof summary.statusLabel).toBe("string")
  })
})
