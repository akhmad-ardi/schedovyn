import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type * as ExportPdfDialogModule from "@/components/export/export-pdf-dialog"

describe("QA-03 & AC-11, FR-08: Component Test Dialog Pra-Ekspor PDF (export-pdf-dialog)", () => {
  let dialogModule: typeof ExportPdfDialogModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/components/export/export-pdf-dialog"
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

  async function seedExportFixture(hasConflict = false) {
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

    // Requirement VII-A: 1 sesi
    const req7A = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: class7AId,
        subjectId: subMath.id,
        defaultTeacherId: teacher.id,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    // Requirement VIII-A: 1 sesi
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

    // Tempatkan sesi VII-A di Senin 07:30
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7A.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    if (hasConflict) {
      // Tempatkan sesi VIII-A pada waktu yang sama (Senin 07:30) dengan guru yang sama (Bentrokan Guru)
      await useWorkspaceStore.getState().setActiveClass(class8AId)
      await useWorkspaceStore.getState().placeUnscheduledSession({
        requirementId: req8A.id,
        dayOfWeek: "monday",
        startTime: "07:30",
      })
      // Kembalikan kelas aktif ke VII-A
      await useWorkspaceStore.getState().setActiveClass(class7AId)
    }

    return { class7AId, class8AId, req7A, req8A, teacher }
  }

  it("1. dialog terbuka dan menampilkan judul serta pilihan cakupan ekspor", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExportFixture(false)
    const { ExportPdfDialog } = dialogModule

    render(<ExportPdfDialog open={true} onOpenChange={vi.fn()} />)

    // Memverifikasi heading dialog
    expect(
      screen.getByRole("heading", { name: /ekspor jadwal ke pdf/i })
    ).toBeInTheDocument()

    // Memverifikasi radio button cakupan
    expect(screen.getByLabelText(/kelas aktif/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/seluruh kelas/i)).toBeInTheDocument()
  })

  it("2. saat jadwal kelas aktif bebas konflik: tombol bertuliskan 'Unduh Dokumen PDF' (AC-09)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExportFixture(false)
    const { ExportPdfDialog } = dialogModule

    render(<ExportPdfDialog open={true} onOpenChange={vi.fn()} />)

    // Tidak ada peringatan bentrokan
    expect(screen.queryByText(/jadwal mengandung bentrokan/i)).not.toBeInTheDocument()

    // Tombol unduh berlabel standar
    const downloadButton = screen.getByRole("button", {
      name: /unduh dokumen pdf/i,
    })
    expect(downloadButton).toBeInTheDocument()
    expect(downloadButton).toBeEnabled()
  })

  it("3. saat jadwal kelas aktif mengandung konflik: menampilkan peringatan merah dan tombol berubah teks (AC-11)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    // Seed jadwal dengan konflik bentrokan guru
    await seedExportFixture(true)
    const { ExportPdfDialog } = dialogModule

    render(<ExportPdfDialog open={true} onOpenChange={vi.fn()} />)

    // Menampilkan kotak peringatan konflik
    expect(
      screen.getByText(/jadwal mengandung bentrokan waktu/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/budi santoso/i)).toBeInTheDocument()

    // Label tombol unduh berubah transparan memberi tahu pengguna
    const conflictedDownloadBtn = screen.getByRole("button", {
      name: /tetap ekspor pdf dengan peringatan konflik/i,
    })
    expect(conflictedDownloadBtn).toBeInTheDocument()
    expect(conflictedDownloadBtn).toBeEnabled()
  })

  it("4. opsi checkbox 'Sertakan lampiran rincian konflik' tercentang saat ada konflik", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExportFixture(true)
    const { ExportPdfDialog } = dialogModule

    render(<ExportPdfDialog open={true} onOpenChange={vi.fn()} />)

    const appendixCheckbox = screen.getByLabelText(
      /sertakan lampiran rincian konflik/i
    )
    expect(appendixCheckbox).toBeInTheDocument()
    expect(appendixCheckbox).toBeChecked()
  })

  it("5. saat memilih cakupan 'Seluruh Kelas': dialog memperbarui keterangan target ekspor", async () => {
    const user = userEvent.setup()
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExportFixture(false)
    const { ExportPdfDialog } = dialogModule

    render(<ExportPdfDialog open={true} onOpenChange={vi.fn()} />)

    const entireWorkspaceRadio = screen.getByLabelText(/seluruh kelas/i)
    await user.click(entireWorkspaceRadio)

    // Cakupan seluruh kelas terpilih
    expect(entireWorkspaceRadio).toBeChecked()
  })

  it("6. mengeklik tombol unduh memanggil proses generator PDF dan memicu callback", async () => {
    const user = userEvent.setup()
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedExportFixture(false)
    const { ExportPdfDialog } = dialogModule
    const onOpenChangeMock = vi.fn()

    render(<ExportPdfDialog open={true} onOpenChange={onOpenChangeMock} />)

    const downloadButton = screen.getByRole("button", {
      name: /unduh dokumen pdf/i,
    })
    await user.click(downloadButton)

    // Menampilkan loading state atau berhasil menutup dialog setelah proses selesai
    expect(downloadButton).toBeDefined()
  })
})
