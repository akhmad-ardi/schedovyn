import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type { TeachingRequirement } from "@/domain/types/entities"

interface ExtendedHistoryStoreState {
  getUndoActionLabel?: () => string | null
  getRedoActionLabel?: () => string | null
}

describe("QA-03 & AC-FR07-01 s.d. 06: Integration Test Multi-Step History Store & IndexedDB", () => {
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

  async function seedTestClassAndRequirements() {
    const classRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const classId = classRes.data!.id
    await useWorkspaceStore.getState().setActiveClass(classId)

    const subMath = (
      await useWorkspaceStore.getState().createSubject({
        name: "Matematika",
        colorKey: "blue",
      })
    ).data!

    const subIpa = (
      await useWorkspaceStore.getState().createSubject({
        name: "Ilmu Pengetahuan Alam",
        colorKey: "emerald",
      })
    ).data!

    const teacher1 = (
      await useWorkspaceStore.getState().createTeacher({
        name: "Budi Santoso",
      })
    ).data!

    const teacher2 = (
      await useWorkspaceStore.getState().createTeacher({
        name: "Siti Rahma",
      })
    ).data!

    const room1 = (
      await useWorkspaceStore.getState().createRoom({
        name: "Lab IPA",
        type: "laboratory",
      })
    ).data!

    const room2 = (
      await useWorkspaceStore.getState().createRoom({
        name: "Ruang 101",
        type: "classroom",
      })
    ).data!

    const reqMath = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId,
        subjectId: subMath.id,
        defaultTeacherId: teacher1.id,
        defaultRoomId: room2.id,
        sessionsPerWeek: 3,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data as TeachingRequirement

    const reqIpa = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId,
        subjectId: subIpa.id,
        defaultTeacherId: teacher2.id,
        defaultRoomId: room1.id,
        sessionsPerWeek: 2,
        durationMinutes: 45,
        roomRequired: true,
      })
    ).data as TeachingRequirement

    return {
      classId,
      subMath,
      subIpa,
      teacher1,
      teacher2,
      room1,
      room2,
      reqMath,
      reqIpa,
    }
  }

  it("1. multi-step mutasi berurutan dan undo step-by-step (AC-FR07-01 s.d. 05)", async () => {
    const { reqMath, reqIpa, teacher1, teacher2 } = await seedTestClassAndRequirements()

    // Langkah 1: Tempatkan Sesi Matematika (Senin 07:30)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    const mathSessionId = useWorkspaceStore.getState().sessions[0].id

    // Langkah 2: Pindahkan Sesi Matematika ke Senin 08:15
    await useWorkspaceStore.getState().moveSession({
      sessionId: mathSessionId,
      dayOfWeek: "monday",
      startTime: "08:15",
    })

    // Langkah 3: Tempatkan Sesi IPA (Selasa 09:00)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqIpa.id,
      dayOfWeek: "tuesday",
      startTime: "09:00",
    })
    const ipaSessionId = useWorkspaceStore
      .getState()
      .sessions.find((s) => s.requirementId === reqIpa.id)!.id

    // Langkah 4: Ubah guru Sesi IPA menjadi teacher1
    await useWorkspaceStore.getState().updateSessionDetails({
      sessionId: ipaSessionId,
      patch: {
        teacherId: teacher1.id,
      },
    })

    // Langkah 5: Lepas sesi Matematika dari grid (removeSession)
    await useWorkspaceStore.getState().removeSession(mathSessionId)

    // Memverifikasi tumpukan riwayat mencatat 5 langkah
    expect(useWorkspaceStore.getState().historyPast).toHaveLength(5)
    expect(useWorkspaceStore.getState().historyFuture).toHaveLength(0)
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)

    // --- UNDO LANGKAH 5: Kembalikan sesi Matematika ---
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(2)
    const restoredMath = useWorkspaceStore
      .getState()
      .sessions.find((s) => s.id === mathSessionId)
    expect(restoredMath).toBeDefined()
    expect(restoredMath?.startTime).toBe("08:15")

    // --- UNDO LANGKAH 4: Kembalikan guru Sesi IPA ke teacher2 ---
    await useWorkspaceStore.getState().undo()
    const restoredIpa = useWorkspaceStore
      .getState()
      .sessions.find((s) => s.id === ipaSessionId)
    expect(restoredIpa?.teacherId).toBe(teacher2.id)

    // --- UNDO LANGKAH 3: Batalkan penempatan Sesi IPA ---
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)
    expect(
      useWorkspaceStore.getState().sessions.some((s) => s.id === ipaSessionId)
    ).toBe(false)

    // --- UNDO LANGKAH 2: Kembalikan Matematika ke jam 07:30 ---
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().sessions[0].startTime).toBe("07:30")

    // --- UNDO LANGKAH 1: Batalkan penempatan Matematika (grid kembali kosong) ---
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)
    expect(useWorkspaceStore.getState().canUndo()).toBe(false)
    expect(useWorkspaceStore.getState().canRedo()).toBe(true)
  })

  it("2. redo berurutan memulihkan seluruh mutasi hingga kondisi akhir (AC-FR07-02)", async () => {
    const { reqMath, reqIpa } = await seedTestClassAndRequirements()

    // Tempatkan Sesi 1
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    // Tempatkan Sesi 2
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqIpa.id,
      dayOfWeek: "tuesday",
      startTime: "09:00",
    })

    expect(useWorkspaceStore.getState().sessions).toHaveLength(2)

    // Undo 2 kali
    await useWorkspaceStore.getState().undo()
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)

    // Redo ke-1: pulihkan Sesi 1
    await useWorkspaceStore.getState().redo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)
    expect(useWorkspaceStore.getState().sessions[0].dayOfWeek).toBe("monday")

    // Redo ke-2: pulihkan Sesi 2
    await useWorkspaceStore.getState().redo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(2)
    expect(useWorkspaceStore.getState().sessions[1].dayOfWeek).toBe("tuesday")
    expect(useWorkspaceStore.getState().canRedo()).toBe(false)
  })

  it("3. kalkulasi ulang validasi sinkron: bentrokan yang dibatalkan langsung menghapus status konflik (AC-FR07-06)", async () => {
    const { reqMath } = await seedTestClassAndRequirements()

    // Tempatkan Sesi A di Senin 07:30 dengan teacher1
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    const sessionAId = useWorkspaceStore.getState().sessions[0].id

    // Tempatkan Sesi B di Selasa 07:30 dengan teacher1 (awalnya tidak bentrok)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "tuesday",
      startTime: "07:30",
    })
    const sessionBId = useWorkspaceStore
      .getState()
      .sessions.find((s) => s.id !== sessionAId)!.id

    // Awalnya tidak ada konflik waktu
    let report = useWorkspaceStore.getState().validationReport
    expect(report?.workspaceSummary.status).not.toBe("CONFLICT_DETECTED")
    expect(report?.workspaceSummary.activeConflictsCount).toBe(0)

    // Pindahkan Sesi B ke Senin 07:30 (Memicu bentrokan waktu)
    await useWorkspaceStore.getState().moveSession({
      sessionId: sessionBId,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    report = useWorkspaceStore.getState().validationReport
    expect(report?.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(report?.workspaceSummary.activeConflictsCount).toBeGreaterThan(0)

    // Eksekusi Undo: Sesi B kembali ke Selasa, bentrokan langsung terhapus seketika!
    await useWorkspaceStore.getState().undo()

    report = useWorkspaceStore.getState().validationReport
    expect(report?.workspaceSummary.status).not.toBe("CONFLICT_DETECTED")
    expect(report?.workspaceSummary.activeConflictsCount).toBe(0)

    // Eksekusi Redo: bentrokan muncul kembali secara sinkron
    await useWorkspaceStore.getState().redo()
    report = useWorkspaceStore.getState().validationReport
    expect(report?.workspaceSummary.status).toBe("CONFLICT_DETECTED")
    expect(report?.workspaceSummary.activeConflictsCount).toBeGreaterThan(0)
  })

  it("4. normalisasi selectedSessionId menjadi null jika sesi yang dipilih dibatalkan keberadaannya", async () => {
    const { reqMath } = await seedTestClassAndRequirements()

    // Tempatkan sesi Matematika
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    const placedSession = useWorkspaceStore.getState().sessions[0]
    expect(placedSession).toBeDefined()

    // Pilih sesi di grid
    useWorkspaceStore.setState({ selectedSessionId: placedSession.id })
    expect(useWorkspaceStore.getState().selectedSessionId).toBe(placedSession.id)

    // Batalkan penempatan via Undo
    await useWorkspaceStore.getState().undo()

    // Sesi sudah tidak ada di grid, selectedSessionId WAJIB dinormalisasi menjadi null
    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)
    expect(useWorkspaceStore.getState().selectedSessionId).toBeNull()
  })

  it("5. persistensi atomik: sesi hasil pemulihan undo/redo tersimpan presisi di database Dexie (AC-12)", async () => {
    const { reqMath } = await seedTestClassAndRequirements()

    // Tambah sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    expect(await db.sessions.count()).toBe(1)

    // Undo -> IndexedDB harus kembali 0 sesi
    await useWorkspaceStore.getState().undo()
    expect(await db.sessions.count()).toBe(0)

    // Redo -> IndexedDB harus kembali 1 sesi
    await useWorkspaceStore.getState().redo()
    expect(await db.sessions.count()).toBe(1)
  })

  it("6. selectors getUndoActionLabel dan getRedoActionLabel mengembalikan keterangan aksi yang tepat", async () => {
    const { reqMath } = await seedTestClassAndRequirements()
    const store = useWorkspaceStore.getState() as unknown as ExtendedHistoryStoreState

    // Selectors harus tersedia
    expect(typeof store.getUndoActionLabel).toBe("function")
    expect(typeof store.getRedoActionLabel).toBe("function")
    if (!store.getUndoActionLabel || !store.getRedoActionLabel) return

    // Kondisi awal: tidak ada label
    expect(store.getUndoActionLabel()).toBeNull()
    expect(store.getRedoActionLabel()).toBeNull()

    // Tempatkan sesi Matematika
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Label undo harus menyebutkan penempatan
    const undoLabel = store.getUndoActionLabel()
    expect(undoLabel).not.toBeNull()
    expect(undoLabel).toMatch(/tempatkan.*matematika/i)

    // Setelah undo, label redo aktif
    await useWorkspaceStore.getState().undo()
    const redoLabel = store.getRedoActionLabel()
    expect(redoLabel).not.toBeNull()
    expect(redoLabel).toMatch(/matematika/i)
  })
})
