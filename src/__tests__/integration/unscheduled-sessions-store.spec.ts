import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type { TeachingRequirement } from "@/domain/types/entities"
import type { ClassUnscheduledSummary } from "@/domain/timetable/unscheduled-sessions"

interface ExtendedWorkspaceStoreState {
  getActiveClassUnscheduledSummary?: () => ClassUnscheduledSummary
  getWorkspaceUnscheduledSummary?: () => {
    totalRequiredSessions: number
    totalScheduledSessions: number
    totalRemainingSessions: number
    overallCompletionPercentage: number
    byClassId: Record<string, ClassUnscheduledSummary>
  }
}

describe("QA-03 & AC-FR06-01 s.d. 06: Integration Test Reaktivitas Store & Sinkronisasi Mutasi", () => {
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

  async function seedTestClassAndRequirement(sessionsPerWeek = 3) {
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
      sessionsPerWeek,
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

  it("1. memverifikasi getActiveClassUnscheduledSummary selector dan pengurangan sisa sesi saat placeUnscheduledSession (FR-06.5 & AC-FR06-01)", async () => {
    const { requirement } = await seedTestClassAndRequirement(3)
    const store = useWorkspaceStore.getState() as unknown as ExtendedWorkspaceStoreState

    expect(typeof store.getActiveClassUnscheduledSummary).toBe("function")
    if (!store.getActiveClassUnscheduledSummary) return

    const initialSummary = store.getActiveClassUnscheduledSummary()
    expect(initialSummary.totalRequiredSessions).toBe(3)
    expect(initialSummary.totalScheduledSessions).toBe(0)
    expect(initialSummary.totalRemainingSessions).toBe(3)

    // Tempatkan 1 sesi ke grid pada hari Senin jam 07:30
    const ok = await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    expect(ok).toBe(true)

    const updatedSummary = store.getActiveClassUnscheduledSummary()
    expect(updatedSummary.totalRequiredSessions).toBe(3)
    expect(updatedSummary.totalScheduledSessions).toBe(1)
    expect(updatedSummary.totalRemainingSessions).toBe(2)
  })

  it("2. memverifikasi pengembalian slot sesi ke pool saat removeSession dipanggil (unschedule)", async () => {
    const { requirement } = await seedTestClassAndRequirement(2)
    const store = useWorkspaceStore.getState() as unknown as ExtendedWorkspaceStoreState

    expect(typeof store.getActiveClassUnscheduledSummary).toBe("function")
    if (!store.getActiveClassUnscheduledSummary) return

    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const afterPlaceSummary = store.getActiveClassUnscheduledSummary()
    expect(afterPlaceSummary.totalRemainingSessions).toBe(1)
    expect(afterPlaceSummary.totalScheduledSessions).toBe(1)

    const placedSession = useWorkspaceStore.getState().sessions[0]
    expect(placedSession).toBeDefined()

    // Hapus sesi dari grid
    const removeOk = await useWorkspaceStore.getState().removeSession(placedSession.id)
    expect(removeOk).toBe(true)

    const afterRemoveSummary = store.getActiveClassUnscheduledSummary()
    expect(afterRemoveSummary.totalRemainingSessions).toBe(2)
    expect(afterRemoveSummary.totalScheduledSessions).toBe(0)
  })

  it("3. memverifikasi aksi undo dan redo memulihkan jumlah sesi tersisa secara presisi (AC-FR06-05)", async () => {
    const { requirement } = await seedTestClassAndRequirement(3)
    const store = useWorkspaceStore.getState() as unknown as ExtendedWorkspaceStoreState

    expect(typeof store.getActiveClassUnscheduledSummary).toBe("function")
    if (!store.getActiveClassUnscheduledSummary) return

    // Sesi 1: Senin 07:30
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(2)

    // Sesi 2: Selasa 08:15
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "tuesday",
      startTime: "08:15",
    })
    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(1)

    // Undo sesi 2 -> kembali 2 sesi tersisa
    await useWorkspaceStore.getState().undo()
    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(2)
    expect(store.getActiveClassUnscheduledSummary().totalScheduledSessions).toBe(1)

    // Undo sesi 1 -> kembali 3 sesi tersisa
    await useWorkspaceStore.getState().undo()
    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(3)
    expect(store.getActiveClassUnscheduledSummary().totalScheduledSessions).toBe(0)

    // Redo sesi 1 -> 2 sesi tersisa
    await useWorkspaceStore.getState().redo()
    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(2)
    expect(store.getActiveClassUnscheduledSummary().totalScheduledSessions).toBe(1)

    // Redo sesi 2 -> 1 sesi tersisa
    await useWorkspaceStore.getState().redo()
    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(1)
    expect(store.getActiveClassUnscheduledSummary().totalScheduledSessions).toBe(2)
  })

  it("4. memverifikasi perubahan sessionsPerWeek pada master data langsung merefleksikan jumlah sisa sesi (AC-FR06-06)", async () => {
    const { requirement } = await seedTestClassAndRequirement(2)
    const store = useWorkspaceStore.getState() as unknown as ExtendedWorkspaceStoreState

    expect(typeof store.getActiveClassUnscheduledSummary).toBe("function")
    if (!store.getActiveClassUnscheduledSummary) return

    // Jadwalkan 2 sesi penuh
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: requirement.id,
      dayOfWeek: "tuesday",
      startTime: "07:30",
    })

    expect(store.getActiveClassUnscheduledSummary().totalRemainingSessions).toBe(0)

    // Naikkan alokasi dari 2 menjadi 4 sesi per minggu
    const updateRes = await useWorkspaceStore.getState().updateTeachingRequirement(
      requirement.id,
      {
        sessionsPerWeek: 4,
      }
    )
    expect(updateRes.ok).toBe(true)

    const updatedSummary = store.getActiveClassUnscheduledSummary()
    expect(updatedSummary.totalRequiredSessions).toBe(4)
    expect(updatedSummary.totalScheduledSessions).toBe(2)
    expect(updatedSummary.totalRemainingSessions).toBe(2)
  })

  it("5. memverifikasi selector getWorkspaceUnscheduledSummary melakukan agregasi lintas kelas", async () => {
    const { classId: classId7A, requirement: req7A } =
      await seedTestClassAndRequirement(3)

    // Buat kelas kedua VII-B dengan kebutuhan 2 sesi
    const class7BRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-B",
      grade: "VII",
    })
    const classId7B = class7BRes.data!.id

    const req7BRes = await useWorkspaceStore.getState().createTeachingRequirement({
      classId: classId7B,
      subjectId: req7A.subjectId,
      defaultTeacherId: req7A.defaultTeacherId,
      defaultRoomId: null,
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    })
    expect(req7BRes.ok).toBe(true)

    // Tempatkan 1 sesi pada VII-A
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7A.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const store = useWorkspaceStore.getState() as unknown as ExtendedWorkspaceStoreState
    expect(typeof store.getWorkspaceUnscheduledSummary).toBe("function")
    if (!store.getWorkspaceUnscheduledSummary) return

    const wsSummary = store.getWorkspaceUnscheduledSummary()
    // Total required: 3 (VII-A) + 2 (VII-B) = 5
    // Total scheduled: 1 (VII-A) + 0 (VII-B) = 1
    // Total remaining: 2 (VII-A) + 2 (VII-B) = 4
    expect(wsSummary.totalRequiredSessions).toBe(5)
    expect(wsSummary.totalScheduledSessions).toBe(1)
    expect(wsSummary.totalRemainingSessions).toBe(4)
    expect(wsSummary.overallCompletionPercentage).toBe(20)
    expect(wsSummary.byClassId[classId7A]).toBeDefined()
    expect(wsSummary.byClassId[classId7B]).toBeDefined()
  })
})
