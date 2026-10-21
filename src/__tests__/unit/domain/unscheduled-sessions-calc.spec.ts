import { describe, expect, it } from "vitest"
import {
  calculateUnscheduledSessions,
  type ClassUnscheduledSummary,
} from "@/domain/timetable/unscheduled-sessions"
import type { TeachingRequirement, TimetableSession } from "@/domain/types/entities"

export type RequirementAllocationStatus = "unfulfilled" | "fulfilled" | "over_scheduled"

export interface SubjectUnscheduledSummary {
  subjectId: string
  requirementId: string
  classId: string
  requiredSessions: number
  scheduledSessions: number
  remainingSessions: number
  durationMinutes: number
  defaultTeacherId: string | null
  defaultRoomId: string | null
  roomRequired: boolean
  notes?: string
  completionPercentage: number
  status: RequirementAllocationStatus
}

export interface ExtendedClassUnscheduledSummary extends ClassUnscheduledSummary {
  bySubject: SubjectUnscheduledSummary[]
  overallCompletionPercentage: number
  isFullyScheduled: boolean
}

describe("QA-01 & AC-08: Pure Domain Calculator (calculateUnscheduledSessions)", () => {
  const reqMath: TeachingRequirement = {
    id: "req-math-7a",
    workspaceId: "ws-1",
    classId: "cls-7a",
    subjectId: "sub-math",
    defaultTeacherId: "tch-1",
    defaultRoomId: "rm-1",
    sessionsPerWeek: 3,
    durationMinutes: 45,
    roomRequired: true,
    notes: "Matematika Wajib",
  }

  const reqEnglish: TeachingRequirement = {
    id: "req-eng-7a",
    workspaceId: "ws-1",
    classId: "cls-7a",
    subjectId: "sub-eng",
    defaultTeacherId: "tch-2",
    defaultRoomId: null,
    sessionsPerWeek: 2,
    durationMinutes: 90,
    roomRequired: false,
    notes: "Bahasa Inggris Peminatan",
  }

  const reqOtherClass: TeachingRequirement = {
    id: "req-math-8a",
    workspaceId: "ws-1",
    classId: "cls-8a",
    subjectId: "sub-math",
    defaultTeacherId: "tch-1",
    defaultRoomId: "rm-1",
    sessionsPerWeek: 4,
    durationMinutes: 45,
    roomRequired: true,
  }

  it("1. mengembalikan pool sesi kosong dengan progres 100% dan isFullyScheduled false jika tidak ada kebutuhan pembelajaran untuk kelas aktif", () => {
    const rawSummary = calculateUnscheduledSessions([], [], "cls-7a")
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    expect(summary.classId).toBe("cls-7a")
    expect(summary.items).toEqual([])
    expect(summary.totalRequiredSessions).toBe(0)
    expect(summary.totalScheduledSessions).toBe(0)
    expect(summary.totalRemainingSessions).toBe(0)
    expect(summary.overallCompletionPercentage).toBe(100)
    expect(summary.isFullyScheduled).toBe(false)
    expect(summary.bySubject).toEqual([])
  })

  it("2. menghitung alokasi awal saat belum ada sesi di grid: R = N, persentase progres 0%, status 'unfulfilled'", () => {
    const rawSummary = calculateUnscheduledSessions([reqMath, reqEnglish], [], "cls-7a")
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    expect(summary.totalRequiredSessions).toBe(5)
    expect(summary.totalScheduledSessions).toBe(0)
    expect(summary.totalRemainingSessions).toBe(5)
    expect(summary.overallCompletionPercentage).toBe(0)
    expect(summary.isFullyScheduled).toBe(false)
    expect(summary.items).toHaveLength(5)

    expect(summary.bySubject).toBeDefined()
    expect(summary.bySubject).toHaveLength(2)

    const mathSummary = summary.bySubject?.find((s) => s.requirementId === "req-math-7a")
    expect(mathSummary).toBeDefined()
    expect(mathSummary?.requiredSessions).toBe(3)
    expect(mathSummary?.scheduledSessions).toBe(0)
    expect(mathSummary?.remainingSessions).toBe(3)
    expect(mathSummary?.completionPercentage).toBe(0)
    expect(mathSummary?.status).toBe("unfulfilled")

    const engSummary = summary.bySubject?.find((s) => s.requirementId === "req-eng-7a")
    expect(engSummary).toBeDefined()
    expect(engSummary?.requiredSessions).toBe(2)
    expect(engSummary?.scheduledSessions).toBe(0)
    expect(engSummary?.remainingSessions).toBe(2)
    expect(engSummary?.completionPercentage).toBe(0)
    expect(engSummary?.status).toBe("unfulfilled")
  })

  it("3. menghitung alokasi parsial saat sebagian sesi telah ditempatkan: R = N - M (AC-08)", () => {
    const scheduledSessions: TimetableSession[] = [
      {
        id: "ses-math-1",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-eng-1",
        workspaceId: "ws-1",
        requirementId: "req-eng-7a",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "tuesday",
        startTime: "08:00",
        endTime: "09:30",
        durationMinutes: 90,
      },
    ]

    const rawSummary = calculateUnscheduledSessions(
      [reqMath, reqEnglish],
      scheduledSessions,
      "cls-7a"
    )
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    // 2 dijadwalkan dari 5 kebutuhan = 40%
    expect(summary.totalRequiredSessions).toBe(5)
    expect(summary.totalScheduledSessions).toBe(2)
    expect(summary.totalRemainingSessions).toBe(3)
    expect(summary.overallCompletionPercentage).toBe(40)
    expect(summary.isFullyScheduled).toBe(false)

    // Math: 1 dijadwalkan dari 3 target = 33% (round)
    const mathSummary = summary.bySubject?.find((s) => s.requirementId === "req-math-7a")
    expect(mathSummary?.scheduledSessions).toBe(1)
    expect(mathSummary?.remainingSessions).toBe(2)
    expect(mathSummary?.completionPercentage).toBe(33)
    expect(mathSummary?.status).toBe("unfulfilled")

    // English: 1 dijadwalkan dari 2 target = 50%
    const engSummary = summary.bySubject?.find((s) => s.requirementId === "req-eng-7a")
    expect(engSummary?.scheduledSessions).toBe(1)
    expect(engSummary?.remainingSessions).toBe(1)
    expect(engSummary?.completionPercentage).toBe(50)
    expect(engSummary?.status).toBe("unfulfilled")
  })

  it("4. menghitung alokasi saat seluruh sesi telah terjadwal: R = 0, persentase progres 100%, status 'fulfilled', dan isFullyScheduled true", () => {
    const fullyScheduled: TimetableSession[] = [
      {
        id: "ses-math-1",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-math-2",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "tuesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-math-3",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "wednesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-eng-1",
        workspaceId: "ws-1",
        requirementId: "req-eng-7a",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "thursday",
        startTime: "08:00",
        endTime: "09:30",
        durationMinutes: 90,
      },
      {
        id: "ses-eng-2",
        workspaceId: "ws-1",
        requirementId: "req-eng-7a",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "friday",
        startTime: "08:00",
        endTime: "09:30",
        durationMinutes: 90,
      },
    ]

    const rawSummary = calculateUnscheduledSessions(
      [reqMath, reqEnglish],
      fullyScheduled,
      "cls-7a"
    )
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    expect(summary.totalRequiredSessions).toBe(5)
    expect(summary.totalScheduledSessions).toBe(5)
    expect(summary.totalRemainingSessions).toBe(0)
    expect(summary.overallCompletionPercentage).toBe(100)
    expect(summary.isFullyScheduled).toBe(true)
    expect(summary.items).toHaveLength(0)

    const mathSummary = summary.bySubject?.find((s) => s.requirementId === "req-math-7a")
    expect(mathSummary?.scheduledSessions).toBe(3)
    expect(mathSummary?.remainingSessions).toBe(0)
    expect(mathSummary?.completionPercentage).toBe(100)
    expect(mathSummary?.status).toBe("fulfilled")

    const engSummary = summary.bySubject?.find((s) => s.requirementId === "req-eng-7a")
    expect(engSummary?.scheduledSessions).toBe(2)
    expect(engSummary?.remainingSessions).toBe(0)
    expect(engSummary?.completionPercentage).toBe(100)
    expect(engSummary?.status).toBe("fulfilled")
  })

  it("5. menangani alokasi berlebih jika sesi di grid melebihi alokasi: R = 0, status 'over_scheduled'", () => {
    const overScheduledSessions: TimetableSession[] = [
      {
        id: "ses-m1",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-m2",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "tuesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-m3",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "wednesday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
      {
        id: "ses-m4",
        workspaceId: "ws-1",
        requirementId: "req-math-7a",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-1",
        roomId: "rm-1",
        dayOfWeek: "thursday",
        startTime: "07:00",
        endTime: "07:45",
        durationMinutes: 45,
      },
    ]

    const rawSummary = calculateUnscheduledSessions([reqMath], overScheduledSessions, "cls-7a")
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    expect(summary.totalRequiredSessions).toBe(3)
    expect(summary.totalScheduledSessions).toBe(4)
    expect(summary.totalRemainingSessions).toBe(0)
    expect(summary.overallCompletionPercentage).toBe(100)
    expect(summary.isFullyScheduled).toBe(true)
    expect(summary.items).toHaveLength(0)

    const mathSummary = summary.bySubject?.find((s) => s.requirementId === "req-math-7a")
    expect(mathSummary?.scheduledSessions).toBe(4)
    expect(mathSummary?.remainingSessions).toBe(0)
    expect(mathSummary?.completionPercentage).toBe(100)
    expect(mathSummary?.status).toBe("over_scheduled")
  })

  it("6. menyalin atribut defaultTeacherId, defaultRoomId, roomRequired, dan notes ke SubjectUnscheduledSummary", () => {
    const rawSummary = calculateUnscheduledSessions([reqMath], [], "cls-7a")
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    const mathSummary = summary.bySubject?.[0]
    expect(mathSummary).toBeDefined()
    expect(mathSummary?.classId).toBe("cls-7a")
    expect(mathSummary?.subjectId).toBe("sub-math")
    expect(mathSummary?.durationMinutes).toBe(45)
    expect(mathSummary?.defaultTeacherId).toBe("tch-1")
    expect(mathSummary?.defaultRoomId).toBe("rm-1")
    expect(mathSummary?.roomRequired).toBe(true)
    expect(mathSummary?.notes).toBe("Matematika Wajib")
  })

  it("7. memastikan isolasi kelas: kebutuhan dan sesi kelas lain tidak memengaruhi pool kelas aktif", () => {
    const otherClassSession: TimetableSession = {
      id: "ses-other-1",
      workspaceId: "ws-1",
      requirementId: "req-math-8a",
      classId: "cls-8a",
      subjectId: "sub-math",
      teacherId: "tch-1",
      roomId: "rm-1",
      dayOfWeek: "monday",
      startTime: "07:00",
      endTime: "07:45",
      durationMinutes: 45,
    }

    const rawSummary = calculateUnscheduledSessions(
      [reqMath, reqOtherClass],
      [otherClassSession],
      "cls-7a"
    )
    const summary = rawSummary as unknown as ExtendedClassUnscheduledSummary

    expect(summary.classId).toBe("cls-7a")
    expect(summary.totalRequiredSessions).toBe(3)
    expect(summary.totalScheduledSessions).toBe(0)
    expect(summary.totalRemainingSessions).toBe(3)
    expect(summary.items.every((it) => it.classId === "cls-7a")).toBe(true)
    expect(summary.bySubject?.every((s) => s.classId === "cls-7a")).toBe(true)
  })
})
