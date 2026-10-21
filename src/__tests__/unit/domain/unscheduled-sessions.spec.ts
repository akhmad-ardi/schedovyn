import { describe, expect, it } from "vitest"
import {
  calculateUnscheduledSessions,
  type UnscheduledSessionItem,
} from "@/domain/timetable/unscheduled-sessions"
import type { TeachingRequirement, TimetableSession } from "@/domain/types/entities"

describe("FR-04.A & AC-08: calculateUnscheduledSessions", () => {
  const reqMath: TeachingRequirement = {
    id: "req-math",
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
    id: "req-eng",
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
    id: "req-other",
    workspaceId: "ws-1",
    classId: "cls-8a",
    subjectId: "sub-math",
    defaultTeacherId: "tch-1",
    defaultRoomId: "rm-1",
    sessionsPerWeek: 4,
    durationMinutes: 45,
    roomRequired: false,
  }

  it("1. mengembalikan pool kosong jika tidak ada kebutuhan pembelajaran untuk kelas aktif", () => {
    const summary = calculateUnscheduledSessions([], [], "cls-7a")
    expect(summary).toEqual({
      classId: "cls-7a",
      items: [],
      bySubject: [],
      totalRequiredSessions: 0,
      totalScheduledSessions: 0,
      totalRemainingSessions: 0,
      overallCompletionPercentage: 100,
      isFullyScheduled: false,
    })
  })

  it("2. menghasilkan UnscheduledSessionItem sesuai sessionsPerWeek saat belum ada sesi terjadwal", () => {
    const summary = calculateUnscheduledSessions([reqMath, reqEnglish], [], "cls-7a")

    expect(summary.totalRequiredSessions).toBe(5)
    expect(summary.totalScheduledSessions).toBe(0)
    expect(summary.totalRemainingSessions).toBe(5)
    expect(summary.items).toHaveLength(5)

    const mathItems = summary.items.filter((item) => item.requirementId === "req-math")
    expect(mathItems).toHaveLength(3)
    expect(mathItems[0]).toEqual({
      virtualId: "req-math::slot-0",
      requirementId: "req-math",
      classId: "cls-7a",
      subjectId: "sub-math",
      defaultTeacherId: "tch-1",
      defaultRoomId: "rm-1",
      durationMinutes: 45,
      roomRequired: true,
      notes: "Matematika Wajib",
      slotIndex: 0,
      remainingCount: 3,
      totalRequiredCount: 3,
    })
    expect(mathItems[1].virtualId).toBe("req-math::slot-1")
    expect(mathItems[2].virtualId).toBe("req-math::slot-2")

    const engItems = summary.items.filter((item) => item.requirementId === "req-eng")
    expect(engItems).toHaveLength(2)
    expect(engItems[0].virtualId).toBe("req-eng::slot-0")
    expect(engItems[1].virtualId).toBe("req-eng::slot-1")
  })

  it("3. mengurangi jumlah sesi sisa ketika sebagian sesi telah dijadwalkan (AC-08)", () => {
    const scheduledSessions: TimetableSession[] = [
      {
        id: "ses-math-1",
        workspaceId: "ws-1",
        requirementId: "req-math",
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
        requirementId: "req-eng",
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

    const summary = calculateUnscheduledSessions(
      [reqMath, reqEnglish],
      scheduledSessions,
      "cls-7a"
    )

    // Math: 3 - 1 = 2 sesi tersisa
    // Eng: 2 - 1 = 1 sesi tersisa
    expect(summary.totalRequiredSessions).toBe(5)
    expect(summary.totalScheduledSessions).toBe(2)
    expect(summary.totalRemainingSessions).toBe(3)
    expect(summary.items).toHaveLength(3)

    const remainingMath = summary.items.filter(
      (item) => item.requirementId === "req-math"
    )
    expect(remainingMath).toHaveLength(2)
    expect(remainingMath[0].remainingCount).toBe(2)
    expect(remainingMath[1].remainingCount).toBe(2)

    const remainingEng = summary.items.filter(
      (item) => item.requirementId === "req-eng"
    )
    expect(remainingEng).toHaveLength(1)
    expect(remainingEng[0].remainingCount).toBe(1)
  })

  it("4. menghasilkan array kosong untuk kebutuhan yang seluruh sesinya telah terjadwal penuh", () => {
    const fullSessions: TimetableSession[] = [
      {
        id: "ses-eng-1",
        workspaceId: "ws-1",
        requirementId: "req-eng",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "08:30",
        durationMinutes: 90,
      },
      {
        id: "ses-eng-2",
        workspaceId: "ws-1",
        requirementId: "req-eng",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-2",
        roomId: null,
        dayOfWeek: "wednesday",
        startTime: "07:00",
        endTime: "08:30",
        durationMinutes: 90,
      },
    ]

    const summary = calculateUnscheduledSessions([reqEnglish], fullSessions, "cls-7a")

    expect(summary.totalRequiredSessions).toBe(2)
    expect(summary.totalScheduledSessions).toBe(2)
    expect(summary.totalRemainingSessions).toBe(0)
    expect(summary.items).toHaveLength(0)
  })

  it("5. menjaga isolasi kelas: kebutuhan kelas lain tidak muncul pada kelas aktif", () => {
    const summary = calculateUnscheduledSessions(
      [reqMath, reqOtherClass],
      [],
      "cls-7a"
    )

    expect(summary.classId).toBe("cls-7a")
    expect(summary.totalRequiredSessions).toBe(3)
    expect(summary.totalRemainingSessions).toBe(3)
    expect(summary.items).toHaveLength(3)
    expect(summary.items.every((item) => item.classId === "cls-7a")).toBe(true)
  })

  it("6. menyalin seluruh atribut default kebutuhan ke setiap UnscheduledSessionItem", () => {
    const summary = calculateUnscheduledSessions([reqMath], [], "cls-7a")

    const firstItem: UnscheduledSessionItem = summary.items[0]
    expect(firstItem.classId).toBe("cls-7a")
    expect(firstItem.subjectId).toBe("sub-math")
    expect(firstItem.defaultTeacherId).toBe("tch-1")
    expect(firstItem.defaultRoomId).toBe("rm-1")
    expect(firstItem.durationMinutes).toBe(45)
    expect(firstItem.roomRequired).toBe(true)
    expect(firstItem.notes).toBe("Matematika Wajib")
  })
})
