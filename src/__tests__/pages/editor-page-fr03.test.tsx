import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
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

describe("FR-03 & AC-01: Halaman Editor Jadwal & Pemilih Kelas Aktif (EditorPage)", () => {
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
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })
  })

  it("AC-FR03-04: menampilkan Empty State sesuai DESIGN.md ketika belum ada kelas di ruang kerja", async () => {
    renderEditorWithShell()

    await waitFor(() => {
      expect(
        screen.getByText(
          /Belum ada kelas di ruang kerja ini\. Tambahkan kelas terlebih dahulu di menu Data Master sebelum menyusun jadwal\./i
        )
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole("link", { name: /Buka Data Master Kelas/i })
    ).toBeInTheDocument()
  })

  it("AC-01 & AC-FR03-01: menampilkan jadwal & kebutuhan kelas aktif serta beralih kelas tanpa menghapus data kelas lain", async () => {
    await useWorkspaceStore.getState().bootWorkspace()

    const cls7a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VII-A", grade: "VII" })
    ).data!
    const cls8a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VIII-A", grade: "VIII" })
    ).data!
    const subMath = (
      await useWorkspaceStore
        .getState()
        .createSubject({ name: "Matematika Dasar", colorKey: "blue" })
    ).data!
    const subFisika = (
      await useWorkspaceStore
        .getState()
        .createSubject({ name: "Fisika Terapan", colorKey: "violet" })
    ).data!

    const req7a = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls7a.id,
        subjectId: subMath.id,
        defaultTeacherId: null,
        defaultRoomId: null,
        sessionsPerWeek: 2,
        durationMinutes: 90,
        roomRequired: false,
      })
    ).data!

    const req8a = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls8a.id,
        subjectId: subFisika.id,
        defaultTeacherId: null,
        defaultRoomId: null,
        sessionsPerWeek: 3,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    const workspaceId = useWorkspaceStore.getState().workspace!.id
    await db.sessions.bulkPut([
      {
        id: "ses-7a-1",
        workspaceId,
        requirementId: req7a.id,
        classId: cls7a.id,
        subjectId: subMath.id,
        teacherId: null,
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:00",
        endTime: "08:30",
        durationMinutes: 90,
      },
      {
        id: "ses-8a-1",
        workspaceId,
        requirementId: req8a.id,
        classId: cls8a.id,
        subjectId: subFisika.id,
        teacherId: null,
        roomId: null,
        dayOfWeek: "tuesday",
        startTime: "10:00",
        endTime: "10:45",
        durationMinutes: 45,
      },
    ])

    // Muat ulang dari DB agar sesi masuk ke store
    await useWorkspaceStore.getState().bootWorkspace()

    const user = userEvent.setup()
    renderEditorWithShell()

    // Kelas aktif awal adalah VII-A -> menampilkan Matematika Dasar, bukan Fisika Terapan
    await waitFor(() => {
      expect(screen.getAllByText(/Matematika Dasar/i).length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/Fisika Terapan/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Total Sesi Ruang Kerja:\s*2\s*sesi/i)
    ).toBeInTheDocument()

    // Beralih ke kelas VIII-A melalui pemilih kelas
    const selectTrigger = screen.getByRole("combobox", {
      name: /Pilih Kelas Aktif/i,
    })
    await user.click(selectTrigger)
    const option8a = await screen.findByRole("option", {
      name: /VIII-A \(Tingkat VIII\)/i,
    })
    await user.click(option8a)

    await waitFor(() => {
      expect(screen.getAllByText(/Fisika Terapan/i).length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/Matematika Dasar/i)).not.toBeInTheDocument()
    expect(useWorkspaceStore.getState().sessions).toHaveLength(2)
  })
})
