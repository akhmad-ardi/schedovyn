import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type { TeachingRequirement } from "@/domain/types/entities"

describe("FR-04, FR-07, AC-02, AC-12: Timetable Sessions Store & IndexedDB Persistence", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()

    useWorkspaceStore.setState({
      isHydrated: false,
      isHydrating: false,
      workspace: null,
      dayConfigs: [],
      classes: [],
      subjects: [],
      teachers: [],
      rooms: [],
      requirements: [],
      sessions: [],
      selectedSessionId: null,
      historyPast: [],
      historyFuture: [],
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  async function seedTestClassAndRequirement() {
    const classRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const subjectRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const teacherRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const roomRes = await useWorkspaceStore.getState().createRoom({
      name: "Lab Komputer",
      type: "laboratory",
    })

    const classId = classRes.data!.id
    const subjectId = subjectRes.data!.id
    const teacherId = teacherRes.data!.id
    const roomId = roomRes.data!.id

    await useWorkspaceStore.getState().setActiveClass(classId)

    const reqRes = await useWorkspaceStore.getState().createTeachingRequirement({
      classId,
      subjectId,
      defaultTeacherId: teacherId,
      defaultRoomId: roomId,
      sessionsPerWeek: 3,
      durationMinutes: 45,
      roomRequired: true,
      notes: "Matematika Kelas 7",
    })

    return {
      classId,
      subjectId,
      teacherId,
      roomId,
      requirement: reqRes.data as TeachingRequirement,
    }
  }

  it("1. placeUnscheduledSession membuat TimetableSession baru, menyimpan ke IndexedDB, dan mengurangi sesi tersisa (AC-02 & AC-FR04-01)", async () => {
    const { classId, subjectId, teacherId, roomId, requirement } =
      await seedTestClassAndRequirement()

    const ok = await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    expect(ok).toBe(true)

    const state = useWorkspaceStore.getState()
    expect(state.sessions).toHaveLength(1)
    const placed = state.sessions[0]

    expect(placed.classId).toBe(classId)
    expect(placed.requirementId).toBe(requirement.id)
    expect(placed.subjectId).toBe(subjectId)
    expect(placed.teacherId).toBe(teacherId)
    expect(placed.roomId).toBe(roomId)
    expect(placed.dayOfWeek).toBe("monday")
    expect(placed.startTime).toBe("07:30")
    expect(placed.endTime).toBe("08:15")
    expect(placed.durationMinutes).toBe(45)

    // Memastikan tersimpan di Dexie
    const inDb = await db.sessions.get(placed.id)
    expect(inDb).toBeDefined()
    expect(inDb?.startTime).toBe("07:30")
    expect(state.saveStatus).toBe("saved")
  })

  it("2. moveSession mengubah hari dan waktu mulai sesi tanpa mengubah ID sesi, serta memperbarui IndexedDB (AC-FR04-02)", async () => {
    const { requirement } = await seedTestClassAndRequirement()

    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const initialSession = useWorkspaceStore.getState().sessions[0]
    const sessionId = initialSession.id

    const ok = await useWorkspaceStore.getState().moveSession({
      sessionId,
      dayOfWeek: "tuesday",
      startTime: "09:00",
    })

    expect(ok).toBe(true)

    const updatedSession = useWorkspaceStore.getState().sessions[0]
    expect(updatedSession.id).toBe(sessionId)
    expect(updatedSession.dayOfWeek).toBe("tuesday")
    expect(updatedSession.startTime).toBe("09:00")
    expect(updatedSession.endTime).toBe("09:45")
    expect(updatedSession.durationMinutes).toBe(45)

    // Periksa di IndexedDB
    const inDb = await db.sessions.get(sessionId)
    expect(inDb?.dayOfWeek).toBe("tuesday")
    expect(inDb?.startTime).toBe("09:00")
  })

  it("3. updateSessionDetails memperbarui detail atribut guru, ruangan, atau catatan sesi", async () => {
    const { requirement } = await seedTestClassAndRequirement()

    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const sessionId = useWorkspaceStore.getState().sessions[0].id

    const ok = await useWorkspaceStore.getState().updateSessionDetails({
      sessionId,
      patch: {
        notes: "Ujian Harian",
        durationMinutes: 90,
      },
    })

    expect(ok).toBe(true)

    const updated = useWorkspaceStore.getState().sessions[0]
    expect(updated.notes).toBe("Ujian Harian")
    expect(updated.durationMinutes).toBe(90)
    expect(updated.endTime).toBe("09:00") // 07:30 + 90 menit = 09:00

    const inDb = await db.sessions.get(sessionId)
    expect(inDb?.notes).toBe("Ujian Harian")
    expect(inDb?.durationMinutes).toBe(90)
  })

  it("4. removeSession menghapus sesi dari store dan IndexedDB (Unschedule - AC-FR04-03)", async () => {
    const { requirement } = await seedTestClassAndRequirement()

    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const sessionId = useWorkspaceStore.getState().sessions[0].id
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)

    const ok = await useWorkspaceStore.getState().removeSession(sessionId)
    expect(ok).toBe(true)

    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)
    const inDb = await db.sessions.get(sessionId)
    expect(inDb).toBeUndefined()
  })

  it("5. Undo dan Redo membatalkan dan mengulang aksi penempatan/pemindahan sesi secara andal (FR-07 & AC-FR04-06)", async () => {
    const { requirement } = await seedTestClassAndRequirement()

    expect(useWorkspaceStore.getState().canUndo()).toBe(false)
    expect(useWorkspaceStore.getState().canRedo()).toBe(false)

    // 1. Tempatkan sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    const sessionId = useWorkspaceStore.getState().sessions[0].id

    expect(useWorkspaceStore.getState().canUndo()).toBe(true)

    // 2. Pindahkan sesi ke Selasa 09:00
    await useWorkspaceStore.getState().moveSession({
      sessionId,
      dayOfWeek: "tuesday",
      startTime: "09:00",
    })

    expect(useWorkspaceStore.getState().sessions[0].dayOfWeek).toBe("tuesday")
    expect(useWorkspaceStore.getState().sessions[0].startTime).toBe("09:00")

    // 3. Batalkan aksi (Undo) -> kembali ke Senin 07:30
    const undoOk = await useWorkspaceStore.getState().undo()
    expect(undoOk).toBe(true)
    expect(useWorkspaceStore.getState().sessions[0].dayOfWeek).toBe("monday")
    expect(useWorkspaceStore.getState().sessions[0].startTime).toBe("07:30")
    expect(useWorkspaceStore.getState().canRedo()).toBe(true)

    // IndexedDB juga harus kembali ke Senin 07:30
    const inDbUndo = await db.sessions.get(sessionId)
    expect(inDbUndo?.dayOfWeek).toBe("monday")
    expect(inDbUndo?.startTime).toBe("07:30")

    // 4. Ulangi aksi (Redo) -> kembali ke Selasa 09:00
    const redoOk = await useWorkspaceStore.getState().redo()
    expect(redoOk).toBe(true)
    expect(useWorkspaceStore.getState().sessions[0].dayOfWeek).toBe("tuesday")
    expect(useWorkspaceStore.getState().sessions[0].startTime).toBe("09:00")

    const inDbRedo = await db.sessions.get(sessionId)
    expect(inDbRedo?.dayOfWeek).toBe("tuesday")
    expect(inDbRedo?.startTime).toBe("09:00")
  })

  it("6. menjaga isolasi kelas: manipulasi sesi kelas aktif tidak mengganggu sesi kelas lain", async () => {
    const { requirement } = await seedTestClassAndRequirement()

    // Buat kelas 8 dan sesi milik kelas 8
    const class8Res = await useWorkspaceStore.getState().createClassGroup({
      name: "VIII-A",
      grade: "VIII",
    })
    const otherClassId = class8Res.data!.id

    const otherSession = {
      id: "ses-other-class",
      workspaceId: useWorkspaceStore.getState().workspace!.id,
      requirementId: "req-other",
      classId: otherClassId,
      subjectId: "sub-other",
      teacherId: null,
      roomId: null,
      dayOfWeek: "wednesday" as const,
      startTime: "10:00" as const,
      endTime: "10:45" as const,
      durationMinutes: 45,
    }
    await db.sessions.put(otherSession)
    useWorkspaceStore.setState({
      sessions: [otherSession],
    })

    // Tempatkan sesi kelas 7 (kelas aktif)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const sessions = useWorkspaceStore.getState().sessions
    expect(sessions).toHaveLength(2)
    const preservedOther = sessions.find((s) => s.id === "ses-other-class")
    expect(preservedOther).toBeDefined()
    expect(preservedOther?.classId).toBe(otherClassId)
  })
})
