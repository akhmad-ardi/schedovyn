import { describe, expect, it } from "vitest"
import {
  getActiveClassRequirements,
  getActiveClassSessions,
  getActiveClassSessionStats,
  resolveActiveClass,
} from "@/domain/timetable/active-class-context"
import type {
  ClassGroup,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

const classesFixture: ClassGroup[] = [
  {
    id: "cls-7a",
    workspaceId: "ws-1",
    name: "VII-A",
    grade: "VII",
    notes: "Gedung A",
  },
  {
    id: "cls-8a",
    workspaceId: "ws-1",
    name: "VIII-A",
    grade: "VIII",
  },
]

const requirementsFixture: TeachingRequirement[] = [
  {
    id: "req-7a-math",
    workspaceId: "ws-1",
    classId: "cls-7a",
    subjectId: "sub-math",
    defaultTeacherId: "tch-1",
    defaultRoomId: null,
    sessionsPerWeek: 3,
    durationMinutes: 90,
    roomRequired: false,
  },
  {
    id: "req-7a-ind",
    workspaceId: "ws-1",
    classId: "cls-7a",
    subjectId: "sub-ind",
    defaultTeacherId: "tch-2",
    defaultRoomId: null,
    sessionsPerWeek: 2,
    durationMinutes: 45,
    roomRequired: false,
  },
  {
    id: "req-8a-math",
    workspaceId: "ws-1",
    classId: "cls-8a",
    subjectId: "sub-math",
    defaultTeacherId: "tch-1",
    defaultRoomId: "rm-1",
    sessionsPerWeek: 4,
    durationMinutes: 45,
    roomRequired: true,
  },
]

const sessionsFixture: TimetableSession[] = [
  {
    id: "ses-7a-1",
    workspaceId: "ws-1",
    requirementId: "req-7a-math",
    classId: "cls-7a",
    subjectId: "sub-math",
    teacherId: "tch-1",
    roomId: null,
    dayOfWeek: "monday",
    startTime: "07:00",
    endTime: "08:30",
    durationMinutes: 90,
  },
  {
    id: "ses-7a-2",
    workspaceId: "ws-1",
    requirementId: "req-7a-ind",
    classId: "cls-7a",
    subjectId: "sub-ind",
    teacherId: "tch-2",
    roomId: null,
    dayOfWeek: "tuesday",
    startTime: "08:00",
    endTime: "08:45",
    durationMinutes: 45,
  },
  {
    id: "ses-8a-1",
    workspaceId: "ws-1",
    requirementId: "req-8a-math",
    classId: "cls-8a",
    subjectId: "sub-math",
    teacherId: "tch-1",
    roomId: "rm-1",
    dayOfWeek: "monday",
    startTime: "09:00",
    endTime: "09:45",
    durationMinutes: 45,
  },
]

describe("FR-03 & AC-01: Selector Domain Konteks Kelas Aktif (active-class-context)", () => {
  describe("resolveActiveClass", () => {
    it("mengembalikan ClassGroup yang sesuai saat activeClassId ditemukan", () => {
      const resolved = resolveActiveClass(classesFixture, "cls-8a")
      expect(resolved).toEqual(classesFixture[1])
    })

    it("mengembalikan null saat activeClassId bernilai null atau tidak ada dalam daftar kelas", () => {
      expect(resolveActiveClass(classesFixture, null)).toBeNull()
      expect(resolveActiveClass(classesFixture, "cls-tidak-ada")).toBeNull()
    })
  })

  describe("getActiveClassRequirements & getActiveClassSessions (AC-01)", () => {
    it("memfilter kebutuhan dan sesi khusus kelas aktif tanpa memutasi array input atau mencampur kelas lain", () => {
      const reqSnapshot = [...requirementsFixture]
      const sesSnapshot = [...sessionsFixture]

      const reqs7a = getActiveClassRequirements(requirementsFixture, "cls-7a")
      const sess7a = getActiveClassSessions(sessionsFixture, "cls-7a")

      expect(reqs7a.map((r) => r.id)).toEqual(["req-7a-math", "req-7a-ind"])
      expect(sess7a.map((s) => s.id)).toEqual(["ses-7a-1", "ses-7a-2"])

      const reqs8a = getActiveClassRequirements(requirementsFixture, "cls-8a")
      const sess8a = getActiveClassSessions(sessionsFixture, "cls-8a")

      expect(reqs8a.map((r) => r.id)).toEqual(["req-8a-math"])
      expect(sess8a.map((s) => s.id)).toEqual(["ses-8a-1"])

      // Immutability check
      expect(requirementsFixture).toEqual(reqSnapshot)
      expect(sessionsFixture).toEqual(sesSnapshot)
    })

    it("mengembalikan array kosong jika activeClassId bernilai null atau tidak cocok", () => {
      expect(getActiveClassRequirements(requirementsFixture, null)).toEqual([])
      expect(getActiveClassSessions(sessionsFixture, null)).toEqual([])
      expect(
        getActiveClassRequirements(requirementsFixture, "cls-unknown")
      ).toEqual([])
      expect(getActiveClassSessions(sessionsFixture, "cls-unknown")).toEqual([])
    })
  })

  describe("getActiveClassSessionStats (FR-03.6)", () => {
    it("menghitung kebutuhan, sesi terjadwal, sisa sesi belum terjadwal kelas aktif, serta total sesi seluruh ruang kerja", () => {
      const stats7a = getActiveClassSessionStats(
        requirementsFixture,
        sessionsFixture,
        "cls-7a"
      )

      expect(stats7a).toEqual({
        activeClassId: "cls-7a",
        requiredSessionsCount: 5, // 3 (math) + 2 (ind)
        scheduledSessionsCount: 2, // ses-7a-1, ses-7a-2
        unscheduledSessionsCount: 3, // (3 - 1) + (2 - 1)
        workspaceTotalSessionsCount: 3, // 2 di VII-A + 1 di VIII-A
      })

      const stats8a = getActiveClassSessionStats(
        requirementsFixture,
        sessionsFixture,
        "cls-8a"
      )

      expect(stats8a).toEqual({
        activeClassId: "cls-8a",
        requiredSessionsCount: 4,
        scheduledSessionsCount: 1,
        unscheduledSessionsCount: 3,
        workspaceTotalSessionsCount: 3,
      })
    })

    it("mengembalikan 0 untuk metrik kelas aktif saat activeClassId === null namun tetap menjaga workspaceTotalSessionsCount", () => {
      const statsNull = getActiveClassSessionStats(
        requirementsFixture,
        sessionsFixture,
        null
      )

      expect(statsNull).toEqual({
        activeClassId: null,
        requiredSessionsCount: 0,
        scheduledSessionsCount: 0,
        unscheduledSessionsCount: 0,
        workspaceTotalSessionsCount: 3,
      })
    })
  })
})
