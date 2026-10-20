import { beforeEach, describe, expect, it } from "vitest"
import { SchedovynDatabase } from "@/db/database"
import {
  deleteClassGroupCascade,
  deleteRoomAndUnassign,
  deleteSubjectWithCheck,
  deleteTeacherAndUnassign,
  deleteTeachingRequirementCascade,
  loadOrSeedWorkspace,
  saveClassGroup,
  saveRoom,
  saveSubject,
  saveTeacher,
  saveTeachingRequirement,
} from "@/db/workspace-repository"
import type {
  ClassGroup,
  Room,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

describe("FR-02 & TDD 4.5: Master Data Repository & Referential Integrity", () => {
  let testDb: SchedovynDatabase

  beforeEach(async () => {
    testDb = new SchedovynDatabase()
    await testDb.delete()
    await testDb.open()
  })

  it("loadOrSeedWorkspace() mengembalikan koleksi classes, subjects, teachers, rooms, requirements, dan sessions", async () => {
    const bundle = await loadOrSeedWorkspace(testDb)

    expect(bundle.workspace.name).toBe("SMP Negeri 1 Nusantara")
    expect(bundle.dayConfigs).toHaveLength(7)
    expect(bundle.classes).toEqual([])
    expect(bundle.subjects).toEqual([])
    expect(bundle.teachers).toEqual([])
    expect(bundle.rooms).toEqual([])
    expect(bundle.requirements).toEqual([])
    expect(bundle.sessions).toEqual([])
  })

  it("AC-FR02-04: deleteClassGroupCascade menghapus kebutuhan & sesi milik kelas tersebut serta memperbarui activeClassId", async () => {
    const { workspace } = await loadOrSeedWorkspace(testDb)

    const classA: ClassGroup = {
      id: "cls-a",
      workspaceId: workspace.id,
      name: "VII-A",
      grade: "VII",
    }
    const classB: ClassGroup = {
      id: "cls-b",
      workspaceId: workspace.id,
      name: "VII-B",
      grade: "VII",
    }

    const wsAfterA = await saveClassGroup(workspace, classA, testDb)
    expect(wsAfterA.activeClassId).toBe("cls-a")
    const wsAfterB = await saveClassGroup(wsAfterA, classB, testDb)

    const reqA: TeachingRequirement = {
      id: "req-a",
      workspaceId: workspace.id,
      classId: "cls-a",
      subjectId: "sub-1",
      defaultTeacherId: null,
      defaultRoomId: null,
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    }
    await saveTeachingRequirement(wsAfterB, reqA, testDb)

    const sessionA: TimetableSession = {
      id: "ses-a",
      workspaceId: workspace.id,
      requirementId: "req-a",
      classId: "cls-a",
      subjectId: "sub-1",
      teacherId: null,
      roomId: null,
      dayOfWeek: "monday",
      startTime: "07:00",
      endTime: "07:45",
      durationMinutes: 45,
    }
    await testDb.sessions.put(sessionA)

    const { updatedWorkspace, remainingClasses } =
      await deleteClassGroupCascade(wsAfterB, "cls-a", testDb)

    expect(remainingClasses.map((c) => c.id)).toEqual(["cls-b"])
    expect(updatedWorkspace.activeClassId).toBe("cls-b")
    expect(await testDb.requirements.toArray()).toHaveLength(0)
    expect(await testDb.sessions.toArray()).toHaveLength(0)
  })

  it("AC-FR02-04: deleteSubjectWithCheck menolak penghapusan tanpa cascade jika masih dipakai, lalu menghapus saat cascade: true", async () => {
    const { workspace } = await loadOrSeedWorkspace(testDb)

    const subject: Subject = {
      id: "sub-math",
      workspaceId: workspace.id,
      name: "Matematika",
      colorKey: "blue",
    }
    await saveSubject(workspace, subject, testDb)

    const requirement: TeachingRequirement = {
      id: "req-math",
      workspaceId: workspace.id,
      classId: "cls-a",
      subjectId: "sub-math",
      defaultTeacherId: null,
      defaultRoomId: null,
      sessionsPerWeek: 3,
      durationMinutes: 90,
      roomRequired: false,
    }
    await saveTeachingRequirement(workspace, requirement, testDb)

    const blockedResult = await deleteSubjectWithCheck(
      workspace,
      "sub-math",
      { cascade: false },
      testDb
    )
    expect(blockedResult.deleted).toBe(false)
    expect(blockedResult.requiresConfirmation).toBe(true)
    expect(blockedResult.dependentRequirementsCount).toBe(1)
    expect(await testDb.subjects.count()).toBe(1)

    const confirmedResult = await deleteSubjectWithCheck(
      workspace,
      "sub-math",
      { cascade: true },
      testDb
    )
    expect(confirmedResult.deleted).toBe(true)
    expect(confirmedResult.requiresConfirmation).toBe(false)
    expect(await testDb.subjects.count()).toBe(0)
    expect(await testDb.requirements.count()).toBe(0)
  })

  it("AC-FR02-05: deleteTeacherAndUnassign dan deleteRoomAndUnassign mengubah referensi pada requirement & session menjadi null tanpa menghapusnya", async () => {
    const { workspace } = await loadOrSeedWorkspace(testDb)

    const teacher: Teacher = {
      id: "tch-budi",
      workspaceId: workspace.id,
      name: "Budi Santoso",
      unavailableIntervals: [],
    }
    const room: Room = {
      id: "rm-lab",
      workspaceId: workspace.id,
      name: "Lab IPA 1",
      type: "laboratory",
      unavailableIntervals: [],
    }
    await saveTeacher(workspace, teacher, testDb)
    await saveRoom(workspace, room, testDb)

    const req: TeachingRequirement = {
      id: "req-1",
      workspaceId: workspace.id,
      classId: "cls-a",
      subjectId: "sub-1",
      defaultTeacherId: "tch-budi",
      defaultRoomId: "rm-lab",
      sessionsPerWeek: 2,
      durationMinutes: 90,
      roomRequired: true,
    }
    await saveTeachingRequirement(workspace, req, testDb)

    const session: TimetableSession = {
      id: "ses-1",
      workspaceId: workspace.id,
      requirementId: "req-1",
      classId: "cls-a",
      subjectId: "sub-1",
      teacherId: "tch-budi",
      roomId: "rm-lab",
      dayOfWeek: "tuesday",
      startTime: "08:00",
      endTime: "09:30",
      durationMinutes: 90,
    }
    await testDb.sessions.put(session)

    await deleteTeacherAndUnassign(workspace, "tch-budi", testDb)
    await deleteRoomAndUnassign(workspace, "rm-lab", testDb)

    expect(await testDb.teachers.count()).toBe(0)
    expect(await testDb.rooms.count()).toBe(0)

    const storedReq = await testDb.requirements.get("req-1")
    expect(storedReq).toBeDefined()
    expect(storedReq?.defaultTeacherId).toBeNull()
    expect(storedReq?.defaultRoomId).toBeNull()

    const storedSes = await testDb.sessions.get("ses-1")
    expect(storedSes).toBeDefined()
    expect(storedSes?.teacherId).toBeNull()
    expect(storedSes?.roomId).toBeNull()
  })

  it("deleteTeachingRequirementCascade menghapus requirement beserta sesi yang merujuk requirementId tersebut", async () => {
    const { workspace } = await loadOrSeedWorkspace(testDb)

    const req: TeachingRequirement = {
      id: "req-del",
      workspaceId: workspace.id,
      classId: "cls-a",
      subjectId: "sub-1",
      defaultTeacherId: null,
      defaultRoomId: null,
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    }
    await saveTeachingRequirement(workspace, req, testDb)

    await testDb.sessions.put({
      id: "ses-del",
      workspaceId: workspace.id,
      requirementId: "req-del",
      classId: "cls-a",
      subjectId: "sub-1",
      teacherId: null,
      roomId: null,
      dayOfWeek: "wednesday",
      startTime: "07:00",
      endTime: "07:45",
      durationMinutes: 45,
    })

    await deleteTeachingRequirementCascade(workspace, "req-del", testDb)

    expect(await testDb.requirements.count()).toBe(0)
    expect(await testDb.sessions.count()).toBe(0)
  })
})
