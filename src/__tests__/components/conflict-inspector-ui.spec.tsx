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

describe("FR-05 & PRD 7.2: Tampilan Multi-Cue & Navigasi Konflik (conflict-inspector-ui)", () => {
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
      validationReport: null,
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  async function seedConflictScenario() {
    const cls7 = (await useWorkspaceStore.getState().createClassGroup({ name: "VII-A", grade: "VII" })).data!
    const cls8 = (await useWorkspaceStore.getState().createClassGroup({ name: "VIII-A", grade: "VIII" })).data!
    const tch = (await useWorkspaceStore.getState().createTeacher({ name: "Budi Santoso" })).data!
    const sub = (await useWorkspaceStore.getState().createSubject({ name: "Matematika", colorKey: "blue" })).data!

    const req7 = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls7.id,
        subjectId: sub.id,
        defaultTeacherId: tch.id,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    const req8 = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls8.id,
        subjectId: sub.id,
        defaultTeacherId: tch.id,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    // Buat bentrokan guru: dua sesi di waktu yang sama (Senin 07:30 - 08:15)
    await useWorkspaceStore.getState().setActiveClass(cls7.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    await useWorkspaceStore.getState().setActiveClass(cls8.id)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req8.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    // Kembali ke kelas VII-A
    await useWorkspaceStore.getState().setActiveClass(cls7.id)

    return { cls7, cls8, tch, req7, req8 }
  }

  it("1. memverifikasi SessionBlock menampilkan indikator multi-cue (border merah, ikon peringatan, label konflik) saat berkonflik", async () => {
    await seedConflictScenario()
    renderEditorWithShell()

    const gridRegion = await screen.findByRole("region", { name: /Grid Jadwal Mingguan/i })
    const sessionBlock = await within(gridRegion).findByRole("article", { name: /Blok Sesi/i })

    // Memverifikasi adanya penanda visual multi-cue (FR-05.8 & PRD 7.2)
    expect(sessionBlock).toHaveAttribute("data-conflict", "true")
    expect(within(sessionBlock).getByTestId("session-conflict-icon")).toBeInTheDocument()
    expect(within(sessionBlock).getByText(/Bentrokan Guru/i)).toBeInTheDocument()
  })

  it("2. ConflictStatusBadge menampilkan jumlah konflik dan membuka ConflictListPanel saat diklik", async () => {
    await seedConflictScenario()
    const user = userEvent.setup()
    renderEditorWithShell()

    // Cari badge status validasi di toolbar
    const badge = await screen.findByRole("button", { name: /Status Validasi: Konflik ditemukan/i })
    expect(badge).toBeInTheDocument()
    expect(within(badge).getByText(/1 Konflik/i)).toBeInTheDocument()

    // Klik badge untuk membuka panel daftar konflik
    await user.click(badge)

    const panel = await screen.findByRole("dialog", { name: /Daftar Konflik dan Peringatan/i })
    expect(panel).toBeInTheDocument()
    expect(within(panel).getByText(/Budi Santoso/i)).toBeInTheDocument()
    expect(within(panel).getByText(/VIII-A/i)).toBeInTheDocument()
  })

  it("3. tombol 'Lihat di Jadwal' pada item konflik lintas kelas mengarahkan ke kelas terkait dan menyorot sesi", async () => {
    const { cls8 } = await seedConflictScenario()
    const user = userEvent.setup()
    renderEditorWithShell()

    const badge = await screen.findByRole("button", { name: /Status Validasi: Konflik ditemukan/i })
    await user.click(badge)

    const panel = await screen.findByRole("dialog", { name: /Daftar Konflik dan Peringatan/i })
    const navigateBtn = within(panel).getByRole("button", { name: /Lihat di Kelas VIII-A/i })

    // Klik tombol navigasi lintas kelas
    await user.click(navigateBtn)

    // Store beralih ke kelas VIII-A
    await waitFor(() => {
      expect(useWorkspaceStore.getState().workspace?.activeClassId).toBe(cls8.id)
    })
  })
})
