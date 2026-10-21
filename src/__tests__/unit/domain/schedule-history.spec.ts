import { beforeAll, describe, expect, it } from "vitest"
import type { TimetableSession } from "@/domain/types/entities"
import type * as ScheduleHistoryDomain from "@/domain/history/schedule-history"

describe("QA-01 & FR-07: Pure Domain History Manager (schedule-history)", () => {
  let domain: typeof ScheduleHistoryDomain | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/domain/history/schedule-history"
      domain = await import(/* @vite-ignore */ modulePath)
    } catch {
      domain = null
    }
  })

  function createDummySession(id: string, subjectId = "sub-1"): TimetableSession {
    return {
      id,
      workspaceId: "ws-1",
      requirementId: `req-${subjectId}`,
      classId: "cls-7a",
      subjectId,
      teacherId: "tch-1",
      roomId: "rm-1",
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      durationMinutes: 45,
    }
  }

  it("1. inisialisasi tumpukan riwayat kosong (createInitialHistoryState)", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const initial = domain.createInitialHistoryState()
    expect(initial).toEqual({
      past: [],
      future: [],
    })
  })

  it("2. merekam snapshot baru ke dalam past dan mengosongkan future (recordHistoryStep)", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const initial = domain.createInitialHistoryState()
    const session1 = createDummySession("ses-1")
    const mutableSessions = [session1]

    const nextHistory = domain.recordHistoryStep(
      initial,
      mutableSessions,
      "Tempatkan Matematika ke Senin 07:30"
    )

    expect(nextHistory.past).toHaveLength(1)
    expect(nextHistory.future).toHaveLength(0)

    const snapshot = nextHistory.past[0]
    expect(snapshot.actionLabel).toBe("Tempatkan Matematika ke Senin 07:30")
    expect(snapshot.sessions).toHaveLength(1)
    expect(snapshot.sessions[0].id).toBe("ses-1")
    expect(typeof snapshot.timestamp).toBe("number")

    // Memverifikasi immutability (deep clone): perubahan pada array asal tidak merusak snapshot di past
    mutableSessions.push(createDummySession("ses-2"))
    expect(snapshot.sessions).toHaveLength(1)
  })

  it("3. membatasi kapasitas maksimal 50 langkah secara FIFO (MAX_HISTORY_STEPS)", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    expect(domain.MAX_HISTORY_STEPS).toBe(50)

    let history = domain.createInitialHistoryState()

    // Rekam 51 langkah berturut-turut
    for (let i = 1; i <= 51; i++) {
      const sessions = [createDummySession(`ses-${i}`)]
      history = domain.recordHistoryStep(history, sessions, `Langkah ke-${i}`)
    }

    // Kapasitas tumpukan past harus tetap maksimal 50
    expect(history.past).toHaveLength(50)

    // Langkah pertama (ke-1) terbuang; entri tertua sekarang adalah Langkah ke-2
    expect(history.past[0].actionLabel).toBe("Langkah ke-2")
    expect(history.past[0].sessions[0].id).toBe("ses-2")

    // Entri teranyar di puncak tumpukan adalah Langkah ke-51
    expect(history.past[49].actionLabel).toBe("Langkah ke-51")
    expect(history.past[49].sessions[0].id).toBe("ses-51")
  })

  it("4. eksekusi performHistoryUndo: memulihkan sesi sebelumnya dan menyimpan sesi saat ini ke future", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    // Kondisi undo pada tumpukan kosong mengembalikan null
    const emptyHistory = domain.createInitialHistoryState()
    const undoEmpty = domain.performHistoryUndo(emptyHistory, [])
    expect(undoEmpty).toBeNull()

    // Rekam kondisi awal: 1 sesi Matematika
    const initialSession = createDummySession("ses-1", "sub-math")
    const step1History = domain.recordHistoryStep(
      emptyHistory,
      [initialSession],
      "Kondisi Awal"
    )

    // Sesi bertambah menjadi 2 sesi (tambah IPA)
    const currentSessions = [
      initialSession,
      createDummySession("ses-2", "sub-ipa"),
    ]

    const undoResult = domain.performHistoryUndo(
      step1History,
      currentSessions,
      "Sebelum Undo"
    )
    expect(undoResult).not.toBeNull()
    if (!undoResult) return

    // Sesi yang dipulihkan harus kembali ke 1 sesi Matematika
    expect(undoResult.restoredSessions).toHaveLength(1)
    expect(undoResult.restoredSessions[0].id).toBe("ses-1")
    expect(undoResult.restoredActionLabel).toBe("Kondisi Awal")

    // Tumpukan past berkurang menjadi 0, tumpukan future berisi 2 sesi
    expect(undoResult.nextHistory.past).toHaveLength(0)
    expect(undoResult.nextHistory.future).toHaveLength(1)
    expect(undoResult.nextHistory.future[0].sessions).toHaveLength(2)
    expect(undoResult.nextHistory.future[0].actionLabel).toBe("Sebelum Undo")
  })

  it("5. eksekusi performHistoryRedo: memulihkan sesi masa depan dan memindahkan sesi saat ini ke past", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    // Kondisi redo pada future kosong mengembalikan null
    const noFutureHistory = domain.createInitialHistoryState()
    const redoEmpty = domain.performHistoryRedo(noFutureHistory, [])
    expect(redoEmpty).toBeNull()

    const sessionA = createDummySession("ses-a")
    const sessionB = createDummySession("ses-b")

    // State 1: ada 1 sesi A di past
    let history = domain.recordHistoryStep(noFutureHistory, [sessionA], "Langkah A")

    // Transisi ke 2 sesi (A dan B), lalu jalankan Undo
    const undoResult = domain.performHistoryUndo(history, [sessionA, sessionB], "Langkah B")
    expect(undoResult).not.toBeNull()
    if (!undoResult) return

    history = undoResult.nextHistory
    expect(history.future).toHaveLength(1)

    // Jalankan Redo dari kondisi 1 sesi
    const redoResult = domain.performHistoryRedo(
      history,
      undoResult.restoredSessions,
      "Saat di-Undo"
    )
    expect(redoResult).not.toBeNull()
    if (!redoResult) return

    // Sesi yang dipulihkan kembali menjadi 2 sesi (A dan B)
    expect(redoResult.restoredSessions).toHaveLength(2)
    expect(redoResult.restoredSessions.map((s) => s.id)).toEqual(["ses-a", "ses-b"])

    // Future kosong kembali, past memiliki snapshot sesi saat di-undo
    expect(redoResult.nextHistory.future).toHaveLength(0)
    expect(redoResult.nextHistory.past).toHaveLength(1)
    expect(redoResult.nextHistory.past[0].sessions).toHaveLength(1)
  })

  it("6. aksi baru setelah undo memotong seluruh cabang masa depan (future truncation)", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    let history = domain.createInitialHistoryState()

    const s1 = createDummySession("ses-1")
    const s2 = createDummySession("ses-2")
    const s3 = createDummySession("ses-3")

    // Mutasi 1 (A)
    history = domain.recordHistoryStep(history, [s1], "Mutasi A")
    // Mutasi 2 (B)
    history = domain.recordHistoryStep(history, [s1, s2], "Mutasi B")
    // Mutasi 3 (C)
    history = domain.recordHistoryStep(history, [s1, s2, s3], "Mutasi C")

    expect(history.past).toHaveLength(3)

    // Undo 1: kembali ke [s1, s2]
    const undo1 = domain.performHistoryUndo(history, [s1, s2, s3], "State 3")!
    history = undo1.nextHistory
    // Undo 2: kembali ke [s1]
    const undo2 = domain.performHistoryUndo(history, undo1.restoredSessions, "State 2")!
    history = undo2.nextHistory

    // Sekarang past memiliki 1 entri, future memiliki 2 entri (State 2 dan State 3)
    expect(history.past).toHaveLength(1)
    expect(history.future).toHaveLength(2)

    // Pengguna melakukan aksi baru D: tempatkan sesi 4
    const s4 = createDummySession("ses-4")
    const branchHistory = domain.recordHistoryStep(
      history,
      [s1, s4],
      "Mutasi Cabang Baru D"
    )

    // Tumpukan future WAJIB dikosongkan seluruhnya (pemotongan cabang)
    expect(branchHistory.future).toHaveLength(0)
    expect(branchHistory.past).toHaveLength(2)
    expect(branchHistory.past[0].actionLabel).toBe("Mutasi A")
    expect(branchHistory.past[1].actionLabel).toBe("Mutasi Cabang Baru D")
  })
})
