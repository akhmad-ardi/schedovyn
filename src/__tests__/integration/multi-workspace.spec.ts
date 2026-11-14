import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"

const ACTIVE_WORKSPACE_STORAGE_KEY = "schedovyn_active_workspace_id"

describe("FR-13 & AC-14: Store & IndexedDB Multi-Workspace Integration", () => {
  beforeEach(async () => {
    localStorage.clear()
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
      workspaces: [],
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  it("AC-14.1: membuat ruang kerja baru (BLANK) tanpa merusak ruang kerja awal dan mereset riwayat", async () => {
    const initialWorkspace = useWorkspaceStore.getState().workspace
    expect(initialWorkspace).not.toBeNull()
    expect(initialWorkspace?.name).toBe("SMP Negeri 1 Nusantara")

    // Buat ruang kerja baru BLANK
    const createRes = await useWorkspaceStore.getState().createWorkspace({
      name: "SMA Harapan Bangsa",
      academicPeriod: "Semester Genap 2026/2027",
      defaultSnapIntervalMinutes: 15,
      initMode: "BLANK",
    })

    expect(createRes.ok).toBe(true)

    // Store state harus mengaktifkan ruang kerja baru
    const currentWorkspace = useWorkspaceStore.getState().workspace
    expect(currentWorkspace?.name).toBe("SMA Harapan Bangsa")
    expect(currentWorkspace?.academicPeriod).toBe("Semester Genap 2026/2027")
    expect(currentWorkspace?.defaultSnapIntervalMinutes).toBe(15)

    // Data master dan sesi pada ruang kerja BLANK harus kosong
    expect(useWorkspaceStore.getState().classes).toEqual([])
    expect(useWorkspaceStore.getState().teachers).toEqual([])
    expect(useWorkspaceStore.getState().subjects).toEqual([])
    expect(useWorkspaceStore.getState().rooms).toEqual([])
    expect(useWorkspaceStore.getState().requirements).toEqual([])
    expect(useWorkspaceStore.getState().sessions).toEqual([])

    // Konfigurasi hari harus memiliki 7 hari bawaan
    expect(useWorkspaceStore.getState().dayConfigs).toHaveLength(7)

    // Riwayat Undo/Redo harus kosong
    expect(useWorkspaceStore.getState().historyPast).toEqual([])
    expect(useWorkspaceStore.getState().historyFuture).toEqual([])

    // Daftar workspaces harus berisi 2 ruang kerja
    const workspaces = useWorkspaceStore.getState().workspaces
    expect(workspaces).toHaveLength(2)
    expect(workspaces.map((w) => w.name)).toContain("SMP Negeri 1 Nusantara")
    expect(workspaces.map((w) => w.name)).toContain("SMA Harapan Bangsa")

    // Verifikasi di IndexedDB
    const countInDb = await db.workspaces.count()
    expect(countInDb).toBe(2)
  })

  it("AC-14.2: membuat ruang kerja kedua dengan mode SEED_DEFAULT menggunakan ID ber-namespace unik", async () => {
    // Isi data contoh penuh pada ruang kerja pertama
    await useWorkspaceStore.getState().applyFullDefaultSeed()
    const ws1 = useWorkspaceStore.getState().workspace!
    const ws1ClassesCount = await db.classes.where("workspaceId").equals(ws1.id).count()
    expect(ws1ClassesCount).toBeGreaterThan(0)

    // Buat ruang kerja kedua dengan data contoh
    const createRes = await useWorkspaceStore.getState().createWorkspace({
      name: "SMP Negeri 2 Nusantara",
      academicPeriod: "Semester Genap 2026/2027",
      defaultSnapIntervalMinutes: 30,
      initMode: "SEED_DEFAULT",
    })

    expect(createRes.ok).toBe(true)
    const ws2 = useWorkspaceStore.getState().workspace!
    expect(ws2.id).not.toBe(ws1.id)
    expect(ws2.name).toBe("SMP Negeri 2 Nusantara")

    // Pastikan kedua ruang kerja memiliki rekaman kelas masing-masing tanpa tabrakan ID
    const ws1ClassesAfter = await db.classes.where("workspaceId").equals(ws1.id).count()
    const ws2ClassesAfter = await db.classes.where("workspaceId").equals(ws2.id).count()

    expect(ws1ClassesAfter).toBe(ws1ClassesCount)
    expect(ws2ClassesAfter).toBe(ws1ClassesCount)

    // Total kelas di IndexedDB harus tepat dua kali lipat
    const totalClassesInDb = await db.classes.count()
    expect(totalClassesInDb).toBe(ws1ClassesCount * 2)
  })

  it("AC-14.3: menduplikasi ruang kerja dengan mode MASTER_DATA_ONLY untuk semester baru (sessions kosong)", async () => {
    // Isi data contoh penuh pada ruang kerja awal
    await useWorkspaceStore.getState().applyFullDefaultSeed()
    const wsSource = useWorkspaceStore.getState().workspace!
    const sourceClassesCount = useWorkspaceStore.getState().classes.length
    const sourceReqsCount = useWorkspaceStore.getState().requirements.length
    const sourceSessionsCount = useWorkspaceStore.getState().sessions.length

    expect(sourceClassesCount).toBeGreaterThan(0)
    expect(sourceReqsCount).toBeGreaterThan(0)
    expect(sourceSessionsCount).toBeGreaterThan(0)

    const dupRes = await useWorkspaceStore.getState().duplicateWorkspace({
      sourceWorkspaceId: wsSource.id,
      name: "SMPN 1 Nusantara (Semester Genap)",
      academicPeriod: "Semester Genap 2026/2027",
      mode: "MASTER_DATA_ONLY",
    })

    expect(dupRes.ok).toBe(true)

    const newWs = useWorkspaceStore.getState().workspace!
    expect(newWs.id).not.toBe(wsSource.id)
    expect(newWs.name).toBe("SMPN 1 Nusantara (Semester Genap)")

    // Data master dan kebutuhan pembelajaran harus lengkap tersalin
    expect(useWorkspaceStore.getState().classes).toHaveLength(sourceClassesCount)
    expect(useWorkspaceStore.getState().requirements).toHaveLength(sourceReqsCount)

    // Seluruh sesi jadwal WAJIB kosong (0 sesi)
    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)

    // Evaluasi kebutuhan belum terjadwal harus 100% belum terjadwal
    const unscheduledSummary = useWorkspaceStore.getState().getWorkspaceUnscheduledSummary()
    expect(unscheduledSummary.totalScheduledSessions).toBe(0)
    expect(unscheduledSummary.totalRemainingSessions).toBe(unscheduledSummary.totalRequiredSessions)

    // Sesi pada ruang kerja sumber di IndexedDB harus tetap utuh
    const sourceSessionsInDb = await db.sessions.where("workspaceId").equals(wsSource.id).count()
    expect(sourceSessionsInDb).toBe(sourceSessionsCount)
  })

  it("AC-14.4: menduplikasi ruang kerja dengan mode FULL_COPY untuk simulasi jadwal", async () => {
    await useWorkspaceStore.getState().applyFullDefaultSeed()
    const wsSource = useWorkspaceStore.getState().workspace!
    const sourceSessionsCount = useWorkspaceStore.getState().sessions.length
    expect(sourceSessionsCount).toBeGreaterThan(0)

    const dupRes = await useWorkspaceStore.getState().duplicateWorkspace({
      sourceWorkspaceId: wsSource.id,
      name: "SMPN 1 Nusantara (Simulasi)",
      academicPeriod: "Semester Ganjil 2026/2027",
      mode: "FULL_COPY",
    })

    expect(dupRes.ok).toBe(true)

    const simWs = useWorkspaceStore.getState().workspace!
    expect(simWs.id).not.toBe(wsSource.id)

    // Seluruh sesi jadwal harus ikut tersalin
    expect(useWorkspaceStore.getState().sessions).toHaveLength(sourceSessionsCount)

    // Menghapus satu sesi pada simulasi tidak boleh mengubah sesi pada ruang kerja sumber
    const sessionToDelete = useWorkspaceStore.getState().sessions[0]
    await useWorkspaceStore.getState().deleteTimetableSession(sessionToDelete.id)

    expect(useWorkspaceStore.getState().sessions).toHaveLength(sourceSessionsCount - 1)

    const sourceSessionsInDb = await db.sessions.where("workspaceId").equals(wsSource.id).count()
    expect(sourceSessionsInDb).toBe(sourceSessionsCount)
  })

  it("AC-14.5: berpindah ruang kerja mereset tumpukan Undo/Redo dan memulihkan ruang kerja terakhir saat boot", async () => {
    const ws1 = useWorkspaceStore.getState().workspace!

    // Buat ruang kerja kedua
    await useWorkspaceStore.getState().createWorkspace({
      name: "SMA Bintang Juara",
      academicPeriod: "Semester 1",
      defaultSnapIntervalMinutes: 30,
      initMode: "BLANK",
    })
    const ws2 = useWorkspaceStore.getState().workspace!

    // Beralih kembali ke ws1
    await useWorkspaceStore.getState().switchWorkspace(ws1.id)
    expect(useWorkspaceStore.getState().workspace?.id).toBe(ws1.id)

    // Lakukan mutasi hari di ws1 agar tumpukan Undo aktif
    await useWorkspaceStore.getState().updateDayConfig("monday", {
      startTime: "07:30",
    })

    // Beralih ke ws2
    const switchRes = await useWorkspaceStore.getState().switchWorkspace(ws2.id)
    expect(switchRes.ok).toBe(true)

    // Status tumpukan Undo/Redo harus direset menjadi kosong
    expect(useWorkspaceStore.getState().historyPast).toEqual([])
    expect(useWorkspaceStore.getState().historyFuture).toEqual([])
    expect(useWorkspaceStore.getState().selectedSessionId).toBeNull()

    // LocalStorage harus mencatat ws2 sebagai ruang kerja aktif
    expect(localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)).toBe(ws2.id)

    // Simulasi reload peramban dengan memanggil bootWorkspace()
    useWorkspaceStore.setState({
      isHydrated: false,
      isHydrating: false,
      workspace: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()

    // Ruang kerja aktif yang dipulihkan harus ws2
    expect(useWorkspaceStore.getState().workspace?.id).toBe(ws2.id)
    expect(useWorkspaceStore.getState().workspace?.name).toBe("SMA Bintang Juara")
  })

  it("AC-14.6: mengosongkan data dan menghapus ruang kerja terisolasi dengan proteksi ruang kerja terakhir", async () => {
    const ws1 = useWorkspaceStore.getState().workspace!

    // Buat ruang kerja kedua
    await useWorkspaceStore.getState().createWorkspace({
      name: "Ruang Kerja Sementara",
      academicPeriod: "2026",
      defaultSnapIntervalMinutes: 30,
      initMode: "SEED_DEFAULT",
    })
    const ws2 = useWorkspaceStore.getState().workspace!

    // Hapus ruang kerja kedua (ws2)
    const delRes = await useWorkspaceStore.getState().deleteWorkspace(ws2.id)
    expect(delRes.ok).toBe(true)

    // ws2 harus terhapus dari IndexedDB beserta relasi anaknya
    expect(await db.workspaces.get(ws2.id)).toBeUndefined()
    const ws2Classes = await db.classes.where("workspaceId").equals(ws2.id).count()
    expect(ws2Classes).toBe(0)

    // Aplikasi otomatis mengaktifkan ruang kerja pertama (ws1)
    expect(useWorkspaceStore.getState().workspace?.id).toBe(ws1.id)
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1)

    // Mencoba menghapus satu-satunya ruang kerja yang tersisa (ws1) harus DITOLAK
    const delLastRes = await useWorkspaceStore.getState().deleteWorkspace(ws1.id)
    expect(delLastRes.ok).toBe(false)
    expect(delLastRes.error).toBe(
      "Tidak dapat menghapus satu-satunya ruang kerja yang tersisa."
    )

    // ws1 harus tetap ada di IndexedDB dan di store
    expect(await db.workspaces.get(ws1.id)).toBeDefined()
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1)
  })
})
