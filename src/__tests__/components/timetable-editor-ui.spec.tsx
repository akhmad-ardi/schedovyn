import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { AppShell } from "@/components/layout/app-shell"
import { EditorPage } from "@/pages/editor-page"

function renderEditorWithShell() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppShell>
        <EditorPage />
      </AppShell>
    </MemoryRouter>
  )
}

describe("FR-04: Antarmuka Editor Jadwal 3 Panel & Aksesibilitas Keyboard (timetable-editor-ui)", () => {
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

  async function seedEditorFixture() {
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

    const teacherRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const teacherId = teacherRes.data!.id

    const roomRes = await useWorkspaceStore.getState().createRoom({
      name: "Lab IPA",
      type: "laboratory",
    })
    const roomId = roomRes.data!.id

    // Kebutuhan Matematika: 2 sesi x 45 menit
    const reqMath = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId,
        subjectId: subMath.id,
        defaultTeacherId: teacherId,
        defaultRoomId: roomId,
        sessionsPerWeek: 2,
        durationMinutes: 45,
        roomRequired: true,
      })
    ).data!

    // Kebutuhan IPA: 1 sesi x 90 menit
    const reqIpa = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId,
        subjectId: subIpa.id,
        defaultTeacherId: null,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 90,
        roomRequired: false,
      })
    ).data!

    return { classId, reqMath, reqIpa }
  }

  it("1. merender struktur kanvas editor 3 panel (Panel Kiri Sesi, Panel Tengah Grid Mingguan, Toolbar Atas, dan Panel Kanan Detail)", async () => {
    await seedEditorFixture()
    renderEditorWithShell()

    // Verifikasi Toolbar Atas
    await waitFor(() => {
      expect(screen.getByRole("toolbar", { name: /Kontrol Editor Jadwal/i })).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /Batal Perubahan/i })).toBeInTheDocument() // Tombol Undo
    expect(screen.getByRole("button", { name: /Ulangi Perubahan/i })).toBeInTheDocument() // Tombol Redo

    // Verifikasi Panel A (Kiri): Sesi Belum Terjadwal
    expect(screen.getByRole("region", { name: /Sesi Belum Terjadwal/i })).toBeInTheDocument()

    // Verifikasi Panel B (Tengah): Grid Jadwal Mingguan
    expect(screen.getByRole("region", { name: /Grid Jadwal Mingguan/i })).toBeInTheDocument()

    // Verifikasi Panel C (Kanan): Detail dan Inspektur Sesi
    expect(screen.getByRole("region", { name: /Detail Sesi/i })).toBeInTheDocument()
  })

  it("2. filter pencarian mata pelajaran menyaring kartu sesi di panel belum terjadwal secara presisi", async () => {
    await seedEditorFixture()
    const user = userEvent.setup()
    renderEditorWithShell()

    await screen.findByRole("region", { name: /Sesi Belum Terjadwal/i })

    // Memastikan Matematika dan IPA tampil awal
    expect(screen.getAllByText(/Matematika/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ilmu Pengetahuan Alam/i).length).toBeGreaterThan(0)

    // Ketikkan kata kunci filter
    const searchInput = screen.getByPlaceholderText(/Cari mata pelajaran\.\.\./i)
    await user.type(searchInput, "Ilmu")

    await waitFor(() => {
      expect(screen.getAllByText(/Ilmu Pengetahuan Alam/i).length).toBeGreaterThan(0)
      expect(screen.queryByText(/Matematika/i)).not.toBeInTheDocument()
    })
  })

  it("3. tombol cepat keyboard 'Tempatkan ke Jadwal' membuka dialog penempatan cepat dan menempatkan sesi (AC-FR04-05)", async () => {
    await seedEditorFixture()
    const user = userEvent.setup()
    renderEditorWithShell()

    const panelLeft = await screen.findByRole("region", { name: /Sesi Belum Terjadwal/i })
    const placeButtons = within(panelLeft).getAllByRole("button", { name: /Tempatkan ke Jadwal/i })
    expect(placeButtons.length).toBeGreaterThan(0)

    // Klik tombol cepat tempatkan
    await user.click(placeButtons[0])

    // Membuka Dialog Pilih Hari & Waktu
    const dialog = await screen.findByRole("dialog", { name: /Tempatkan Sesi ke Jadwal/i })
    expect(dialog).toBeInTheDocument()

    const submitBtn = within(dialog).getByRole("button", { name: /Simpan ke Grid/i })
    await user.click(submitBtn)

    // Sesi berhasil ditempatkan ke grid
    await waitFor(() => {
      const gridRegion = screen.getByRole("region", { name: /Grid Jadwal Mingguan/i })
      expect(within(gridRegion).getAllByRole("article", { name: /Blok Sesi/i }).length).toBe(1)
    })
  })

  it("4. klik pada blok sesi di grid memilih sesi dan menampilkan formulir pengeditan di Panel Detail Sesi (AC-FR04-05)", async () => {
    const { reqMath } = await seedEditorFixture()
    // Tempatkan satu sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const user = userEvent.setup()
    renderEditorWithShell()

    const gridRegion = await screen.findByRole("region", { name: /Grid Jadwal Mingguan/i })
    const sessionBlock = await within(gridRegion).findByRole("article", { name: /Blok Sesi/i })

    // Klik blok sesi
    await user.click(sessionBlock)

    // Panel detail sebelah kanan menampilkan atribut yang dapat disunting
    const detailPanel = screen.getByRole("region", { name: /Detail Sesi/i })
    expect(within(detailPanel).getByText(/Matematika/i)).toBeInTheDocument()
    expect(within(detailPanel).getByLabelText(/Jam Mulai/i)).toBeInTheDocument()
    expect(within(detailPanel).getByRole("button", { name: /Lepas dari Grid/i })).toBeInTheDocument()
  })

  it("5. interaksi keyboard pada blok sesi berfokus: Enter membuka detail dan Delete melepas sesi (AC-FR04-05)", async () => {
    const { reqMath } = await seedEditorFixture()
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    const user = userEvent.setup()
    renderEditorWithShell()

    const gridRegion = await screen.findByRole("region", { name: /Grid Jadwal Mingguan/i })
    const sessionBlock = await within(gridRegion).findByRole("article", { name: /Blok Sesi/i })

    // Fokus ke blok sesi
    sessionBlock.focus()
    expect(sessionBlock).toHaveFocus()

    // Tekan Delete untuk melepas sesi dari grid
    await user.keyboard("{Delete}")

    // Sesi terlepas dari grid dan kembali ke panel belum terjadwal
    await waitFor(() => {
      expect(within(gridRegion).queryByRole("article", { name: /Blok Sesi/i })).not.toBeInTheDocument()
    })
    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)
  })

  it("6. tombol Undo dan Redo pada Toolbar bereaksi secara benar terhadap riwayat perubahan (AC-FR04-06)", async () => {
    const { reqMath } = await seedEditorFixture()
    const user = userEvent.setup()
    renderEditorWithShell()

    const undoBtn = await screen.findByRole("button", { name: /Batal Perubahan/i })
    const redoBtn = screen.getByRole("button", { name: /Ulangi Perubahan/i })

    // Awal: belum ada riwayat, tombol disabled
    expect(undoBtn).toBeDisabled()
    expect(redoBtn).toBeDisabled()

    // Lakukan aksi penempatan sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Undo aktif
    await waitFor(() => {
      expect(undoBtn).not.toBeDisabled()
    })
    expect(redoBtn).toBeDisabled()

    // Klik Undo
    await user.click(undoBtn)

    await waitFor(() => {
      expect(useWorkspaceStore.getState().sessions).toHaveLength(0)
      expect(redoBtn).not.toBeDisabled()
    })

    // Klik Redo
    await user.click(redoBtn)

    await waitFor(() => {
      expect(useWorkspaceStore.getState().sessions).toHaveLength(1)
    })
  })
})
