import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("QA-12.2 & FR-12: Store Copy Schedule with Undo/Redo & Conflict Detection (copy-schedule-store)", () => {
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

  async function seedClassesAndSessionsFixture() {
    // 1. Buat Kelas VII-A (Sumber) & VII-B (Target)
    const class7ARes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const class7AId = class7ARes.data!.id

    const class7BRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-B",
      grade: "VII",
    })
    const class7BId = class7BRes.data!.id

    // 2. Buat Mata Pelajaran Matematika & Bahasa Inggris
    const mathRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const mathId = mathRes.data!.id

    const engRes = await useWorkspaceStore.getState().createSubject({
      name: "Bahasa Inggris",
      colorKey: "emerald",
    })
    const engId = engRes.data!.id

    // 3. Buat Guru Budi & Siti
    const budiRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const teacherBudiId = budiRes.data!.id

    const sitiRes = await useWorkspaceStore.getState().createTeacher({
      name: "Siti Rahma",
    })
    const teacherSitiId = sitiRes.data!.id

    // 4. Kebutuhan VII-A (Sumber)
    const req7AMath = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: class7AId,
        subjectId: mathId,
        defaultTeacherId: teacherBudiId,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    const req7AEng = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: class7AId,
        subjectId: engId,
        defaultTeacherId: teacherSitiId,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    // 5. Kebutuhan VII-B (Target)
    const req7BMath = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: class7BId,
        subjectId: mathId,
        defaultTeacherId: teacherSitiId, // Di kelas B, matematika defaultnya Bu Siti
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    await useWorkspaceStore.getState().createTeachingRequirement({
      classId: class7BId,
      subjectId: engId,
      defaultTeacherId: teacherBudiId,
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    })

    // 6. Tempatkan 2 sesi di kelas VII-A
    await useWorkspaceStore.getState().setActiveClass(class7AId)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7AMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7AEng.id,
      dayOfWeek: "monday",
      startTime: "08:15",
    })

    return {
      class7AId,
      class7BId,
      mathId,
      engId,
      teacherBudiId,
      teacherSitiId,
      req7BMath,
    }
  }

  it("1. copyClassSchedule dengan mode 'replace' menghapus sesi lama kelas target dan menyalin sesi baru (AC-FR12-04)", async () => {
    const { class7AId, class7BId, req7BMath } = await seedClassesAndSessionsFixture()

    // Tempatkan 1 sesi lama di kelas VII-B pada hari Selasa
    await useWorkspaceStore.getState().setActiveClass(class7BId)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7BMath.id,
      dayOfWeek: "tuesday",
      startTime: "09:00",
    })

    expect(
      useWorkspaceStore.getState().sessions.filter((s) => s.classId === class7BId).length
    ).toBe(1)

    // Action copyClassSchedule di store
    const copyFn = useWorkspaceStore.getState().copyClassSchedule
    expect(typeof copyFn).toBe("function")
    if (typeof copyFn !== "function") return

    const outcome = await copyFn({
      sourceClassId: class7AId,
      targetClassId: class7BId,
      conflictResolution: "replace",
      teacherStrategy: "use-target-default",
      roomStrategy: "use-target-default",
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.copiedCount).toBe(2)
    expect(outcome.replacedCount).toBe(1)

    // Sesi VII-B sekarang tepat 2 (sesi lama di hari Selasa telah terhapus dan diganti sesi baru Senin)
    const sessions7B = useWorkspaceStore
      .getState()
      .sessions.filter((s) => s.classId === class7BId)
    expect(sessions7B.length).toBe(2)
    expect(sessions7B.some((s) => s.dayOfWeek === "tuesday")).toBe(false)
    expect(sessions7B.every((s) => s.dayOfWeek === "monday")).toBe(true)
  })

  it("2. copyClassSchedule dengan mode 'merge' menambahkan sesi tanpa menghapus sesi lama (AC-FR12-04)", async () => {
    const { class7AId, class7BId, req7BMath } = await seedClassesAndSessionsFixture()

    // Tempatkan 1 sesi lama di kelas VII-B pada hari Selasa
    await useWorkspaceStore.getState().setActiveClass(class7BId)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7BMath.id,
      dayOfWeek: "tuesday",
      startTime: "09:00",
    })

    const copyFn = useWorkspaceStore.getState().copyClassSchedule
    expect(typeof copyFn).toBe("function")
    if (typeof copyFn !== "function") return

    const outcome = await copyFn({
      sourceClassId: class7AId,
      targetClassId: class7BId,
      conflictResolution: "merge",
      teacherStrategy: "use-target-default",
      roomStrategy: "use-target-default",
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.copiedCount).toBe(2)
    expect(outcome.replacedCount).toBe(0)

    // Total sesi VII-B menjadi 3 (1 sesi lama Selasa + 2 sesi baru Senin)
    const sessions7B = useWorkspaceStore
      .getState()
      .sessions.filter((s) => s.classId === class7BId)
    expect(sessions7B.length).toBe(3)
    expect(sessions7B.some((s) => s.dayOfWeek === "tuesday")).toBe(true)
  })

  it("3. mendeteksi bentrokan guru secara otomatis jika menggunakan strategi 'keep-source' (AC-FR12-03)", async () => {
    const { class7AId, class7BId } = await seedClassesAndSessionsFixture()

    const copyFn = useWorkspaceStore.getState().copyClassSchedule
    expect(typeof copyFn).toBe("function")
    if (typeof copyFn !== "function") return

    // Salin dengan keep-source: Guru Budi mengajar di VII-A Senin 07:30, sekarang juga di VII-B Senin 07:30
    const outcome = await copyFn({
      sourceClassId: class7AId,
      targetClassId: class7BId,
      conflictResolution: "replace",
      teacherStrategy: "keep-source",
      roomStrategy: "keep-source",
    })

    expect(outcome.ok).toBe(true)
    // newConflictsCount terdeteksi
    expect(outcome.newConflictsCount).toBeGreaterThanOrEqual(1)

    // Laporan validasi store mencatat konflik
    const report = useWorkspaceStore.getState().validationReport
    expect(report?.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(report?.workspaceSummary.activeConflictsCount).toBeGreaterThanOrEqual(1)
  })

  it("4. pembatalan via undo() mengembalikan kondisi jadwal dan menghapus konflik baru (AC-FR12-05 & TDD 7.1)", async () => {
    const { class7AId, class7BId } = await seedClassesAndSessionsFixture()

    const copyFn = useWorkspaceStore.getState().copyClassSchedule
    expect(typeof copyFn).toBe("function")
    if (typeof copyFn !== "function") return

    await copyFn({
      sourceClassId: class7AId,
      targetClassId: class7BId,
      conflictResolution: "replace",
      teacherStrategy: "keep-source",
      roomStrategy: "keep-source",
    })

    // Pastikan ada sesi di VII-B dan ada konflik
    expect(
      useWorkspaceStore.getState().sessions.filter((s) => s.classId === class7BId).length
    ).toBe(2)
    expect(useWorkspaceStore.getState().validationReport?.workspaceSummary.activeConflictsCount).toBeGreaterThanOrEqual(1)

    // Tekan Undo
    const undoSuccess = await useWorkspaceStore.getState().undo()
    expect(undoSuccess).toBe(true)

    // Seluruh sesi di VII-B kembali ke 0 (kondisi semula sebelum penyalinan)
    expect(
      useWorkspaceStore.getState().sessions.filter((s) => s.classId === class7BId).length
    ).toBe(0)

    // Konflik akibat penyalinan terhapus
    expect(
      useWorkspaceStore.getState().validationReport?.workspaceSummary.activeConflictsCount
    ).toBe(0)

    // Tekan Redo
    const redoSuccess = await useWorkspaceStore.getState().redo()
    expect(redoSuccess).toBe(true)
    expect(
      useWorkspaceStore.getState().sessions.filter((s) => s.classId === class7BId).length
    ).toBe(2)
  })

  it("5. sesi hasil salinan tersimpan secara persisten ke IndexedDB (AC-FR12-06)", async () => {
    const { class7AId, class7BId } = await seedClassesAndSessionsFixture()

    const copyFn = useWorkspaceStore.getState().copyClassSchedule
    expect(typeof copyFn).toBe("function")
    if (typeof copyFn !== "function") return

    await copyFn({
      sourceClassId: class7AId,
      targetClassId: class7BId,
      conflictResolution: "replace",
      teacherStrategy: "use-target-default",
      roomStrategy: "use-target-default",
    })

    expect(useWorkspaceStore.getState().saveStatus).toBe("saved")

    // Verifikasi fisik di IndexedDB
    const dbSessions = await db.sessions.where("classId").equals(class7BId).toArray()
    expect(dbSessions.length).toBe(2)
  })
})
