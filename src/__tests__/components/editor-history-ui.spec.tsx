import { beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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

describe("QA-04 & FR-07: Component Test Toolbar & Global Keyboard Shortcuts (editor-history-ui)", () => {
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

    const teacher = (
      await useWorkspaceStore.getState().createTeacher({
        name: "Budi Santoso",
      })
    ).data!

    const reqMath = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId,
        subjectId: subMath.id,
        defaultTeacherId: teacher.id,
        defaultRoomId: null,
        sessionsPerWeek: 3,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    return { classId, subMath, teacher, reqMath }
  }

  it("1. tombol Undo dan Redo pada EditorToolbar disabled saat tumpukan riwayat kosong", async () => {
    await seedEditorFixture()
    renderEditorWithShell()

    const undoButton = screen.getByRole("button", { name: /batal perubahan/i })
    const redoButton = screen.getByRole("button", { name: /ulangi perubahan/i })

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()
    expect(screen.getByText(/riwayat: 0 langkah tersimpan/i)).toBeInTheDocument()
  })

  it("2. tombol Undo menjadi aktif dan memiliki tooltip deskriptif setelah penempatan sesi (FE-04)", async () => {
    const { reqMath } = await seedEditorFixture()

    // Tempatkan 1 sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    renderEditorWithShell()

    const undoButton = screen.getByRole("button", { name: /batal perubahan/i })
    const redoButton = screen.getByRole("button", { name: /ulangi perubahan/i })

    expect(undoButton).toBeEnabled()
    expect(redoButton).toBeDisabled()
    expect(screen.getByText(/riwayat: 1 langkah tersimpan/i)).toBeInTheDocument()

    // Tooltip / title deskriptif harus memuat nama aksi dan pintasan Ctrl+Z
    const titleAttr = undoButton.getAttribute("title") ?? ""
    expect(titleAttr).toMatch(/batalkan:.*matematika.*\(ctrl\+z\)/i)
  })

  it("3. menekan Ctrl + Z pada kanvas editor memicu pemanggilan undo jadwal (AC-FR07-01 & FE-03)", async () => {
    const { reqMath } = await seedEditorFixture()

    // Tempatkan 1 sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)

    renderEditorWithShell()

    // Kirim event keyboard Ctrl+Z pada window kanvas
    fireEvent.keyDown(window, {
      key: "z",
      ctrlKey: true,
      bubbles: true,
    })

    // Sesi harus terbatalkan dan grid kembali kosong
    await waitFor(() => {
      expect(useWorkspaceStore.getState().sessions).toHaveLength(0)
    })
  })

  it("4. menekan Ctrl + Y atau Ctrl + Shift + Z memicu pemanggilan redo jadwal (AC-FR07-02 & FE-03)", async () => {
    const { reqMath } = await seedEditorFixture()

    // Tempatkan 1 sesi, lalu batalkan
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().undo()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(0)

    renderEditorWithShell()

    // Kirim event keyboard Ctrl+Y untuk Redo
    fireEvent.keyDown(window, {
      key: "y",
      ctrlKey: true,
      bubbles: true,
    })

    // Sesi harus terpulihkan kembali ke grid
    await waitFor(() => {
      expect(useWorkspaceStore.getState().sessions).toHaveLength(1)
    })
  })

  it("5. isolasi form: saat elemen input/textarea sedang aktif, Ctrl + Z tidak membatalkan sesi jadwal (AC-FR07-09)", async () => {
    const user = userEvent.setup()
    const { reqMath } = await seedEditorFixture()

    // Tempatkan 1 sesi
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)

    renderEditorWithShell()

    // Fokuskan kursor pada kotak pencarian mata pelajaran
    const searchInput = screen.getByPlaceholderText(/cari mata pelajaran/i)
    await user.click(searchInput)
    expect(document.activeElement).toBe(searchInput)

    // Tekan Ctrl + Z saat fokus di dalam input
    fireEvent.keyDown(searchInput, {
      key: "z",
      ctrlKey: true,
      bubbles: true,
    })

    // Sesi di kanvas jadwal TIDAK BOLEH terhapus / ter-undo
    expect(useWorkspaceStore.getState().sessions).toHaveLength(1)
  })

  it("6. teks ringkasan langkah riwayat diperbarui secara tepat sesuai tumpukan past", async () => {
    const { reqMath } = await seedEditorFixture()

    renderEditorWithShell()
    expect(screen.getByText(/riwayat: 0 langkah tersimpan/i)).toBeInTheDocument()

    // Mutasi 1
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Teks harus menampilkan 1 langkah
    await waitFor(() => {
      expect(screen.getByText(/riwayat: 1 langkah tersimpan/i)).toBeInTheDocument()
    })
  })
})
