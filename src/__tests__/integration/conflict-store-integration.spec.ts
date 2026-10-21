import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("FR-05 & AC-07: Conflict Store Integration & Auto-Sync", () => {
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
      validationReport: null,
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  async function seedTwoClassesWithSharedTeacher() {
    const cls7 = (await useWorkspaceStore.getState().createClassGroup({ name: "VII-A", grade: "VII" })).data!
    const cls8 = (await useWorkspaceStore.getState().createClassGroup({ name: "VIII-A", grade: "VIII" })).data!
    const tch = (await useWorkspaceStore.getState().createTeacher({ name: "Budi Santoso" })).data!
    const sub = (await useWorkspaceStore.getState().createSubject({ name: "Matematika", colorKey: "blue" })).data!

    const req7 = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls7.id,
        subjectId: sub.id,
        defaultTeacherId: tch.id,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    const req8 = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls8.id,
        subjectId: sub.id,
        defaultTeacherId: tch.id,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    return { cls7, cls8, tch, sub, req7, req8 }
  }

  it("1. menempatkan sesi yang bertabrakan langsung memperbarui validationReport menjadi CONFLICT_DETECTED", async () => {
    const { cls7, cls8, req7, req8 } = await seedTwoClassesWithSharedTeacher()

    // 1. Tempatkan sesi kelas 7 di Senin 07:30
    await useWorkspaceStore.getState().setActiveClass(cls7.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Belum ada bentrokan guru
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.status).toBe("INCOMPLETE")

    // 2. Tempatkan sesi kelas 8 pada waktu yang sama (Senin 07:30) dengan guru sama
    await useWorkspaceStore.getState().setActiveClass(cls8.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req8.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const report = useWorkspaceStore.getState().validationReport
    expect(report).toBeDefined()
    expect(report?.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(report?.workspaceSummary.activeConflictsCount).toBe(1)
  })

  it("2. memindahkan sesi ke waktu bebas konflik seketika menghapus konflik dari validationReport (AC-07)", async () => {
    const { cls7, cls8, req7, req8 } = await seedTwoClassesWithSharedTeacher()

    await useWorkspaceStore.getState().setActiveClass(cls7.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    await useWorkspaceStore.getState().setActiveClass(cls8.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req8.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const ses8Id = useWorkspaceStore.getState().sessions.find((s) => s.classId === cls8.id)!.id
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.activeConflictsCount).toBe(1)

    // Pindahkan sesi kelas 8 ke slot bebas: Senin 08:15 (setelah sesi kelas 7)
    await useWorkspaceStore.getState().moveSession({
      sessionId: ses8Id,
      dayOfWeek: "monday",
      startTime: "08:15",
    })

    const reportAfterMove = useWorkspaceStore.getState().validationReport
    expect(reportAfterMove?.workspaceSummary.activeConflictsCount).toBe(0)
    // Sesi lengkap dan tidak ada konflik lagi -> COMPLETE_AND_VALID
    expect(reportAfterMove?.workspaceSummary.status).toBe("COMPLETE_AND_VALID")
  })

  it("3. menjalankan undo dan redo memperbarui status validasi secara sinkron dengan jadwal yang dipulihkan (FR-07)", async () => {
    const { cls7, cls8, req7, req8 } = await seedTwoClassesWithSharedTeacher()

    await useWorkspaceStore.getState().setActiveClass(cls7.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Sesi kelas 8 ditempatkan di waktu aman (08:15)
    await useWorkspaceStore.getState().setActiveClass(cls8.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req8.id,
      dayOfWeek: "monday",
      startTime: "08:15",
    })
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.status).toBe("COMPLETE_AND_VALID")

    const ses8Id = useWorkspaceStore.getState().sessions.find((s) => s.classId === cls8.id)!.id

    // Geser sesi kelas 8 ke waktu tabrakan (07:30)
    await useWorkspaceStore.getState().moveSession({
      sessionId: ses8Id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.status).toBe("CONFLICT_DETECTED")

    // Panggil Undo -> kembali ke 09:00 (COMPLETE_AND_VALID)
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.status).toBe("COMPLETE_AND_VALID")

    // Panggil Redo -> kembali ke 07:30 (CONFLICT_DETECTED)
    await useWorkspaceStore.getState().redo()
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.status).toBe("CONFLICT_DETECTED")
  })
})
