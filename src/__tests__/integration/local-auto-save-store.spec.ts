import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/db/database"
import * as workspaceRepo from "@/db/workspace-repository"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("QA-10.2 & FR-10: Local Auto-Save Store Integration (local-auto-save-store)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
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

  async function setupBasicWorkspace() {
    const classRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const classId = classRes.data!.id
    await useWorkspaceStore.getState().setActiveClass(classId)

    const subRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const subjectId = subRes.data!.id

    const teacherRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const teacherId = teacherRes.data!.id

    const reqRes = await useWorkspaceStore.getState().createTeachingRequirement({
      classId,
      subjectId,
      defaultTeacherId: teacherId,
      defaultRoomId: null,
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    })
    const requirementId = reqRes.data!.id

    return { classId, subjectId, teacherId, requirementId }
  }

  it("1. mutasi penempatan dan pemindahan sesi otomatis tersimpan ke IndexedDB tanpa tombol manual (AC-FR10-01)", async () => {
    const { requirementId } = await setupBasicWorkspace()

    // 1. Tempatkan sesi pertama
    const placeOk = await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    expect(placeOk).toBe(true)

    const stateAfterPlace = useWorkspaceStore.getState()
    expect(stateAfterPlace.saveStatus).toBe("saved")
    expect(stateAfterPlace.lastSavedAt).not.toBeNull()
    expect(stateAfterPlace.sessions.length).toBe(1)

    // Verifikasi persistensi fisik di Dexie IndexedDB
    const dbSessions = await db.sessions.toArray()
    expect(dbSessions.length).toBe(1)
    expect(dbSessions[0].dayOfWeek).toBe("monday")
    expect(dbSessions[0].startTime).toBe("07:30")
    expect(dbSessions[0].durationMinutes).toBe(45)

    const sessionId = dbSessions[0].id

    // 2. Pindahkan sesi ke hari Selasa
    const moveOk = await useWorkspaceStore.getState().moveSession({
      sessionId,
      dayOfWeek: "tuesday",
      startTime: "08:15",
    })

    expect(moveOk).toBe(true)
    const stateAfterMove = useWorkspaceStore.getState()
    expect(stateAfterMove.saveStatus).toBe("saved")

    const updatedDbSession = await db.sessions.get(sessionId)
    expect(updatedDbSession).toBeDefined()
    expect(updatedDbSession?.dayOfWeek).toBe("tuesday")
    expect(updatedDbSession?.startTime).toBe("08:15")

    // 3. Hapus sesi
    const removeOk = await useWorkspaceStore.getState().removeSession(sessionId)
    expect(removeOk).toBe(true)

    const sessionsAfterRemove = await db.sessions.toArray()
    expect(sessionsAfterRemove.length).toBe(0)
    expect(useWorkspaceStore.getState().saveStatus).toBe("saved")
  })

  it("2. storage honesty: sistem tidak boleh bernilai 'saved' jika penulisan IndexedDB gagal (AC-FR10-02 & FR-10.5)", async () => {
    const { requirementId } = await setupBasicWorkspace()

    // Mock kegagalan kuota browser pada repositori
    const quotaError = new DOMException(
      "The quota has been exceeded.",
      "QuotaExceededError"
    )
    vi.spyOn(workspaceRepo, "saveTimetableSession").mockRejectedValueOnce(quotaError)

    const placeOk = await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    expect(placeOk).toBe(false)

    const state = useWorkspaceStore.getState()
    // DILARANG KERAS berstatus "saved"
    expect(state.saveStatus).toBe("error")
    expect(state.saveErrorMessage).toBeDefined()
    expect(state.saveErrorMessage).toMatch(/kuota|ruang penyimpanan|gagal/i)

    // Memverifikasi saveErrorInfo terisi
    expect(state.saveErrorInfo).toBeDefined()
    expect(state.saveErrorInfo?.code).toBe("QUOTA_EXCEEDED")
  })

  it("3. pemulihan ruang kerja (hydration) memulihkan seluruh data dan activeClassId secara utuh (AC-12 & AC-FR10-03)", async () => {
    const { classId, requirementId } = await setupBasicWorkspace()

    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId,
      dayOfWeek: "wednesday",
      startTime: "09:00",
    })

    expect(useWorkspaceStore.getState().saveStatus).toBe("saved")

    // Simulasikan browser dimuat ulang: reset state di memori
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
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
      saveErrorInfo: null,
      bootError: null,
    })

    // Panggil booting ulang
    await useWorkspaceStore.getState().bootWorkspace()

    const restoredState = useWorkspaceStore.getState()
    expect(restoredState.isHydrated).toBe(true)
    expect(restoredState.workspace).not.toBeNull()
    expect(restoredState.workspace?.activeClassId).toBe(classId)
    expect(restoredState.classes.length).toBe(1)
    expect(restoredState.classes[0].name).toBe("VII-A")
    expect(restoredState.subjects.length).toBe(1)
    expect(restoredState.teachers.length).toBe(1)
    expect(restoredState.sessions.length).toBe(1)
    expect(restoredState.sessions[0].dayOfWeek).toBe("wednesday")
    expect(restoredState.sessions[0].startTime).toBe("09:00")
  })

  it("4. retryPendingStorageSync melakukan sinkronisasi ulang seluruh snapshot memori saat terjadi error (AC-FR10-04)", async () => {
    const { requirementId } = await setupBasicWorkspace()

    // 1. Simulasikan error penyimpanan saat menempatkan sesi
    vi.spyOn(workspaceRepo, "saveTimetableSession").mockRejectedValueOnce(
      new Error("Disk locked temporary failure")
    )

    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId,
      dayOfWeek: "thursday",
      startTime: "10:00",
    })

    expect(useWorkspaceStore.getState().saveStatus).toBe("error")

    // 2. Verifikasi retryPendingStorageSync tersedia pada store
    const retryFn = useWorkspaceStore.getState().retryPendingStorageSync
    expect(typeof retryFn).toBe("function")
    if (typeof retryFn !== "function") return

    // 3. Jalankan retry saat kondisi disk kembali normal
    const retrySuccess = await retryFn()
    expect(retrySuccess).toBe(true)

    // 4. Verifikasi status kembali saved
    const stateAfterRetry = useWorkspaceStore.getState()
    expect(stateAfterRetry.saveStatus).toBe("saved")
    expect(stateAfterRetry.saveErrorMessage).toBeNull()
    expect(stateAfterRetry.saveErrorInfo).toBeNull()

    // Verifikasi data sesi yang sempat tertunda kini benar-benar tersimpan di IndexedDB
    const dbSessions = await db.sessions.toArray()
    expect(dbSessions.length).toBe(1)
    expect(dbSessions[0].dayOfWeek).toBe("thursday")
    expect(dbSessions[0].startTime).toBe("10:00")
  })
})
