import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("QA-11.2 & FR-11: Store Validation Selectors Integration (validation-summary-store)", () => {
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
      validationReport: null,
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
      saveErrorInfo: null,
      bootError: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  async function seedTwoClassesFixture() {
    const class7Res = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const class7AId = class7Res.data!.id

    const class8Res = await useWorkspaceStore.getState().createClassGroup({
      name: "VIII-A",
      grade: "VIII",
    })
    const class8AId = class8Res.data!.id

    await useWorkspaceStore.getState().setActiveClass(class7AId)

    const mathRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const subjectId = mathRes.data!.id

    const teacherRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const teacherId = teacherRes.data!.id

    // Kebutuhan VII-A: 1 sesi 45 menit
    const req7Res = await useWorkspaceStore.getState().createTeachingRequirement({
      classId: class7AId,
      subjectId,
      defaultTeacherId: teacherId,
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    })
    const req7AId = req7Res.data!.id

    // Kebutuhan VIII-A: 1 sesi 45 menit dengan guru yang sama
    const req8Res = await useWorkspaceStore.getState().createTeachingRequirement({
      classId: class8AId,
      subjectId,
      defaultTeacherId: teacherId,
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    })
    const req8AId = req8Res.data!.id

    return { class7AId, class8AId, subjectId, teacherId, req7AId, req8AId }
  }

  it("1. getWorkspaceValidationSummary mengembalikan ringkasan ruang kerja global dengan 5 metrik", async () => {
    await seedTwoClassesFixture()

    // Selector getWorkspaceValidationSummary
    const selector = useWorkspaceStore.getState().getWorkspaceValidationSummary
    expect(typeof selector).toBe("function")
    if (typeof selector !== "function") return

    const summary = selector()
    expect(summary).not.toBeNull()
    if (!summary) return

    expect(summary.status).toBe("INCOMPLETE")
    expect(summary.scheduledSessionsCount).toBe(0)
    expect(summary.unscheduledSessionsCount).toBe(2) // 1 sesi VII-A + 1 sesi VIII-A
    expect(summary.activeConflictsCount).toBe(0)
    expect(summary.completenessWarningsCount).toBeGreaterThanOrEqual(1)
  })

  it("2. getActiveClassValidationSummary mengembalikan ringkasan kelas aktif secara reaktif", async () => {
    const { class8AId, req7AId } = await seedTwoClassesFixture()

    // Tempatkan 1 sesi untuk VII-A
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7AId,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const summary7A = useWorkspaceStore.getState().getActiveClassValidationSummary()
    expect(summary7A).not.toBeNull()
    if (!summary7A) return

    // VII-A sudah lengkap & bebas konflik, namun VIII-A belum lengkap
    expect(summary7A.status).toBe("NO_CONFLICT_CURRENT_DATA")
    expect(summary7A.scheduledSessionsCount).toBe(1)
    expect(summary7A.unscheduledSessionsCount).toBe(0)

    // Alihkan kelas aktif ke VIII-A
    await useWorkspaceStore.getState().setActiveClass(class8AId)
    const summary8A = useWorkspaceStore.getState().getActiveClassValidationSummary()
    expect(summary8A).not.toBeNull()
    if (!summary8A) return

    // VIII-A masih belum lengkap
    expect(summary8A.status).toBe("INCOMPLETE")
    expect(summary8A.scheduledSessionsCount).toBe(0)
    expect(summary8A.unscheduledSessionsCount).toBe(1)
  })

  it("3. getAllClassesValidationSummaries mengembalikan matriks seluruh kelas untuk overview staf kurikulum (AC-FR11-06)", async () => {
    const { class7AId, class8AId } = await seedTwoClassesFixture()

    const getAllSelector = useWorkspaceStore.getState().getAllClassesValidationSummaries
    expect(typeof getAllSelector).toBe("function")
    if (typeof getAllSelector !== "function") return

    const matrix = getAllSelector()
    expect(Array.isArray(matrix)).toBe(true)
    expect(matrix.length).toBe(2)

    const item7A = matrix.find((m) => m.classGroup.id === class7AId)
    const item8A = matrix.find((m) => m.classGroup.id === class8AId)

    expect(item7A).toBeDefined()
    expect(item8A).toBeDefined()
    expect(item7A?.summary.status).toBe("INCOMPLETE")
    expect(item8A?.summary.status).toBe("INCOMPLETE")
  })

  it("4. revalidasi reaktif: status otomatis berubah dari INCOMPLETE -> CONFLICT_DETECTED -> COMPLETE_AND_VALID saat sesi diubah", async () => {
    const { class8AId, req7AId, req8AId } = await seedTwoClassesFixture()

    // 1. Tempatkan sesi VII-A di Senin 07:30
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7AId,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // 2. Tempatkan sesi VIII-A pada jam yang sama (Senin 07:30) sehingga terjadi bentrokan guru
    await useWorkspaceStore.getState().setActiveClass(class8AId)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req8AId,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Verifikasi status berubah menjadi CONFLICT_DETECTED
    const reportConflict = useWorkspaceStore.getState().validationReport
    expect(reportConflict?.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(reportConflict?.workspaceSummary.activeConflictsCount).toBe(1)

    // 3. Pindahkan sesi VIII-A ke jam bebas bentrokan (Senin 08:15)
    const session8A = useWorkspaceStore
      .getState()
      .sessions.find((s) => s.classId === class8AId)
    expect(session8A).toBeDefined()

    await useWorkspaceStore.getState().moveSession({
      sessionId: session8A!.id,
      dayOfWeek: "monday",
      startTime: "08:15",
    })

    // Verifikasi status otomatis langsung berubah menjadi COMPLETE_AND_VALID
    const reportValid = useWorkspaceStore.getState().validationReport
    expect(reportValid?.workspaceSummary.status).toBe("COMPLETE_AND_VALID")
    expect(reportValid?.workspaceSummary.activeConflictsCount).toBe(0)
    expect(reportValid?.workspaceSummary.unscheduledSessionsCount).toBe(0)
  })
})
