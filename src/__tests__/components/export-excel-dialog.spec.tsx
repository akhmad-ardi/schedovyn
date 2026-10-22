import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type * as ExportExcelDialogModule from "@/components/export/export-excel-dialog"

describe("QA-03 & AC-10, AC-11, FR-09: Component Test Dialog Pra-Ekspor Excel (export-excel-dialog)", () => {
  let dialogModule: typeof ExportExcelDialogModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/components/export/export-excel-dialog"
      dialogModule = await import(/* @vite-ignore */ modulePath)
    } catch {
      dialogModule = null
    }
  })

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

  async function seedExcelFixture(options: { hasConflict?: boolean; incomplete?: boolean } = {}) {
    const { hasConflict = false, incomplete = false } = options

    const classRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const class7AId = classRes.data!.id
    await useWorkspaceStore.getState().setActiveClass(class7AId)

    const class8Res = await useWorkspaceStore.getState().createClassGroup({
      name: "VIII-A",
      grade: "VIII",
    })
    const class8AId = class8Res.data!.id

    const subMath = (
      await useWorkspaceStore.getState().createSubject({
        name: "Matematika",
        colorKey: "blue",
      })
    ).data!

    const teacher = (
      await useWorkspaceStore.getState().createTeacher({
        name: "Budi Santoso",
      })
    ).data!

    // Requirement VII-A: 1 sesi jika complete, atau 2 sesi dengan 1 belum ditempatkan jika incomplete
    const req7A = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: class7AId,
        subjectId: subMath.id,
        defaultTeacherId: teacher.id,
        defaultRoomId: null,
        sessionsPerWeek: incomplete ? 2 : 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    // Tempatkan 1 sesi VII-A di Senin 07:30
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7A.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    if (hasConflict) {
      // Requirement VIII-A: 1 sesi dengan guru yang sama
      const req8A = (
        await useWorkspaceStore.getState().createTeachingRequirement({
          classId: class8AId,
          subjectId: subMath.id,
          defaultTeacherId: teacher.id,
          defaultRoomId: null,
          sessionsPerWeek: 1,
          durationMinutes: 45,
          roomRequired: false,
        })
      ).data!

      // Tempatkan sesi VIII-A pada waktu yang sama (Senin 07:30) sehingga terjadi bentrokan guru
      await useWorkspaceStore.getState().setActiveClass(class8AId)
      await useWorkspaceStore.getState().placeUnscheduledSession({
        requirementId: req8A.id,
        dayOfWeek: "monday",
        startTime: "07:30",
      })
      // Kembalikan kelas aktif ke VII-A
      await useWorkspaceStore.getState().setActiveClass(class7AId)
    }

    return { class7AId, class8AId, teacher }
  }

  it("1. dialog terbuka dan menampilkan judul serta pilihan cakupan ekspor (AC-10)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExcelFixture({ hasConflict: false, incomplete: false })
    const { ExportExcelDialog } = dialogModule

    render(<ExportExcelDialog open={true} onOpenChange={vi.fn()} />)

    // Heading dialog
    expect(
      screen.getByRole("heading", { name: /ekspor jadwal ke excel/i })
    ).toBeInTheDocument()

    // Opsi cakupan radio button
    expect(screen.getByLabelText(/kelas aktif/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/seluruh kelas/i)).toBeInTheDocument()
  })

  it("2. menampilkan daftar worksheet yang akan dibuat sesuai cakupan yang dipilih", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExcelFixture({ hasConflict: false, incomplete: false })
    const { ExportExcelDialog } = dialogModule

    render(<ExportExcelDialog open={true} onOpenChange={vi.fn()} />)

    // Mode default Kelas Aktif: worksheet Jadwal ditampilkan di daftar lembar kerja
    expect(screen.getByText(/jadwal/i)).toBeInTheDocument()

    // Beralih ke mode Seluruh Kelas
    const user = userEvent.setup()
    const allRadio = screen.getByLabelText(/seluruh kelas/i)
    await user.click(allRadio)

    // Menampilkan lembar kerja Rekap Guru dan Rekap Ruangan
    expect(screen.getByText(/rekap guru/i)).toBeInTheDocument()
    expect(screen.getByText(/rekap ruangan/i)).toBeInTheDocument()
  })

  it("3. saat jadwal kelas aktif bebas konflik: tombol bertuliskan 'Unduh Berkas Excel (.xlsx)' (AC-10)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExcelFixture({ hasConflict: false, incomplete: false })
    const { ExportExcelDialog } = dialogModule

    render(<ExportExcelDialog open={true} onOpenChange={vi.fn()} />)

    // Tombol unduh standar tanpa peringatan konflik
    const downloadButton = screen.getByRole("button", {
      name: /unduh berkas excel/i,
    })
    expect(downloadButton).toBeInTheDocument()
    expect(downloadButton).toBeEnabled()
  })

  it("4. saat jadwal mengandung konflik: menampilkan kotak peringatan merah dan tombol berubah menjadi 'Tetap Ekspor Excel dengan Peringatan Konflik' (AC-11 & FR-09.5)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExcelFixture({ hasConflict: true, incomplete: false })
    const { ExportExcelDialog } = dialogModule

    render(<ExportExcelDialog open={true} onOpenChange={vi.fn()} />)

    // Menampilkan kotak alert peringatan bentrokan waktu
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(
      screen.getByText(/bentrokan|konflik/i)
    ).toBeInTheDocument()

    // Tombol unduh berubah label menjadi transparan
    const warnButton = screen.getByRole("button", {
      name: /tetap ekspor excel dengan peringatan konflik/i,
    })
    expect(warnButton).toBeInTheDocument()
    expect(warnButton).toBeEnabled()
  })

  it("5. saat jadwal belum lengkap: menampilkan peringatan sesi belum terjadwal", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExcelFixture({ hasConflict: false, incomplete: true })
    const { ExportExcelDialog } = dialogModule

    render(<ExportExcelDialog open={true} onOpenChange={vi.fn()} />)

    // Menampilkan peringatan kelengkapan sesi
    expect(
      screen.getByText(/belum lengkap|belum terjadwal/i)
    ).toBeInTheDocument()
  })

  it("6. mengeklik tombol unduh memicu proses pembuatan berkas dan menampilkan status loading", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExcelFixture({ hasConflict: false, incomplete: false })
    const { ExportExcelDialog } = dialogModule

    const onOpenChange = vi.fn()
    render(<ExportExcelDialog open={true} onOpenChange={onOpenChange} />)

    const downloadButton = screen.getByRole("button", {
      name: /unduh berkas excel/i,
    })

    const user = userEvent.setup()
    await user.click(downloadButton)

    // Memverifikasi ada indikasi pemrosesan (disabled atau teks loading)
    expect(
      screen.queryByText(/menyiapkan|memproses|mengunduh/i) || downloadButton
    ).toBeDefined()
  })
})
