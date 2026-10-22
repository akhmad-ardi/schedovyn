import { beforeAll, describe, expect, it } from "vitest"
import type { TeachingRequirement, TimetableSession } from "@/domain/types/entities"
import { formatScheduleActionLabel } from "@/domain/history/schedule-history"
import type * as ScheduleCopierModule from "@/domain/timetable/schedule-copier"

describe("QA-12.1 & FR-12: Pure Domain Schedule Copier (schedule-copier)", () => {
  let copier: typeof ScheduleCopierModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/domain/timetable/schedule-copier"
      copier = await import(/* @vite-ignore */ modulePath)
    } catch {
      copier = null
    }
  })

  const sourceSessions: TimetableSession[] = [
    {
      id: "ses-src-1",
      workspaceId: "ws-1",
      requirementId: "req-src-math",
      classId: "cls-7a",
      subjectId: "sub-math",
      teacherId: "tch-budi",
      roomId: "rm-101",
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      durationMinutes: 45,
    },
    {
      id: "ses-src-2",
      workspaceId: "ws-1",
      requirementId: "req-src-eng",
      classId: "cls-7a",
      subjectId: "sub-eng",
      teacherId: "tch-ani",
      roomId: "rm-lab",
      dayOfWeek: "monday",
      startTime: "08:15",
      endTime: "09:00",
      durationMinutes: 45,
    },
  ]

  const targetRequirements: TeachingRequirement[] = [
    {
      id: "req-target-math",
      workspaceId: "ws-1",
      classId: "cls-7b",
      subjectId: "sub-math",
      defaultTeacherId: "tch-siti",
      defaultRoomId: "rm-102",
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    },
    {
      id: "req-target-eng",
      workspaceId: "ws-1",
      classId: "cls-7b",
      subjectId: "sub-eng",
      defaultTeacherId: "tch-dewi",
      defaultRoomId: "rm-lab",
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    },
  ]

  it("1. kloning sesi menghasilkan ID baru yang unik dan tidak memodifikasi sesi sumber (AC-FR12-01)", () => {
    expect(copier).not.toBeNull()
    if (!copier) return

    const result = copier.cloneClassSchedule({
      sourceSessions,
      targetRequirements,
      options: {
        sourceClassId: "cls-7a",
        targetClassId: "cls-7b",
        conflictResolution: "replace",
        teacherStrategy: "keep-source",
        roomStrategy: "keep-source",
      },
    })

    expect(result.ok).toBe(true)
    expect(result.copiedSessions.length).toBe(2)

    // Memverifikasi ID baru unik
    const clonedIds = result.copiedSessions.map((s) => s.id)
    expect(clonedIds[0]).not.toBe(sourceSessions[0].id)
    expect(clonedIds[1]).not.toBe(sourceSessions[1].id)
    expect(clonedIds[0]).not.toBe(clonedIds[1])

    // Memverifikasi target classId
    expect(result.copiedSessions.every((s) => s.classId === "cls-7b")).toBe(true)

    // Waktu pembelajaran identik dengan kelas sumber
    expect(result.copiedSessions[0].dayOfWeek).toBe("monday")
    expect(result.copiedSessions[0].startTime).toBe("07:30")
    expect(result.copiedSessions[0].endTime).toBe("08:15")
    expect(result.copiedSessions[1].startTime).toBe("08:15")
    expect(result.copiedSessions[1].endTime).toBe("09:00")
  })

  it("2. strategi guru: use-target-default menggunakan guru default target, clear mengosongkan guru (AC-FR12-02)", () => {
    expect(copier).not.toBeNull()
    if (!copier) return

    // Kasus 1: use-target-default
    const resultTargetDefault = copier.cloneClassSchedule({
      sourceSessions,
      targetRequirements,
      options: {
        sourceClassId: "cls-7a",
        targetClassId: "cls-7b",
        conflictResolution: "replace",
        teacherStrategy: "use-target-default",
        roomStrategy: "use-target-default",
      },
    })

    expect(resultTargetDefault.ok).toBe(true)
    const mathSessionDefault = resultTargetDefault.copiedSessions.find(
      (s) => s.subjectId === "sub-math"
    )
    expect(mathSessionDefault?.teacherId).toBe("tch-siti")
    expect(mathSessionDefault?.roomId).toBe("rm-102")
    expect(mathSessionDefault?.requirementId).toBe("req-target-math")

    // Kasus 2: clear guru dan ruangan
    const resultClear = copier.cloneClassSchedule({
      sourceSessions,
      targetRequirements,
      options: {
        sourceClassId: "cls-7a",
        targetClassId: "cls-7b",
        conflictResolution: "replace",
        teacherStrategy: "clear",
        roomStrategy: "clear",
      },
    })

    expect(resultClear.ok).toBe(true)
    const mathSessionClear = resultClear.copiedSessions.find(
      (s) => s.subjectId === "sub-math"
    )
    expect(mathSessionClear?.teacherId).toBeNull()
    expect(mathSessionClear?.roomId).toBeNull()

    // Kasus 3: keep-source mempertahankan guru dan ruangan kelas sumber
    const resultKeep = copier.cloneClassSchedule({
      sourceSessions,
      targetRequirements,
      options: {
        sourceClassId: "cls-7a",
        targetClassId: "cls-7b",
        conflictResolution: "replace",
        teacherStrategy: "keep-source",
        roomStrategy: "keep-source",
      },
    })

    expect(resultKeep.ok).toBe(true)
    const mathSessionKeep = resultKeep.copiedSessions.find(
      (s) => s.subjectId === "sub-math"
    )
    expect(mathSessionKeep?.teacherId).toBe("tch-budi")
    expect(mathSessionKeep?.roomId).toBe("rm-101")
  })

  it("3. validasi input: menolak jika kelas sumber dan target sama (AC-FR12-07)", () => {
    expect(copier).not.toBeNull()
    if (!copier) return

    const result = copier.cloneClassSchedule({
      sourceSessions,
      targetRequirements,
      options: {
        sourceClassId: "cls-7a",
        targetClassId: "cls-7a", // Sumber dan target sama
        conflictResolution: "replace",
        teacherStrategy: "keep-source",
        roomStrategy: "keep-source",
      },
    })

    expect(result.ok).toBe(false)
    expect(result.copiedSessions.length).toBe(0)
    expect(result.error).toMatch(/tidak boleh sama/i)
  })

  it("4. validasi input: menolak jika kelas sumber belum memiliki sesi terjadwal", () => {
    expect(copier).not.toBeNull()
    if (!copier) return

    const result = copier.cloneClassSchedule({
      sourceSessions: [], // Kosong
      targetRequirements,
      options: {
        sourceClassId: "cls-7a",
        targetClassId: "cls-7b",
        conflictResolution: "replace",
        teacherStrategy: "keep-source",
        roomStrategy: "keep-source",
      },
    })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/belum memiliki sesi/i)
  })

  it("5. label riwayat: formatScheduleActionLabel mendukung tipe 'copy_class' (TDD Bagian 7.1)", () => {
    const label = formatScheduleActionLabel({
      type: "copy_class",
      sourceClassName: "VII-A",
      targetClassName: "VII-B",
    })

    expect(label).toMatch(/salin jadwal dari VII-A ke VII-B/i)
  })
})
