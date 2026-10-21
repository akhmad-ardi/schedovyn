import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { UnscheduledPanel } from "@/components/timetable/unscheduled-panel"

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <UnscheduledPanel />
    </MemoryRouter>
  )
}

describe("QA-04 & AC-FR06-02 s.d. 07: Component Test Antarmuka UnscheduledPanel", () => {
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

  async function seedActivePanelFixture() {
    const classRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const classId = classRes.data!.id
    await useWorkspaceStore.getState().setActiveClass(classId)

    const subMathRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const subMath = subMathRes.data!

    const subIndoRes = await useWorkspaceStore.getState().createSubject({
      name: "Bahasa Indonesia",
      colorKey: "emerald",
    })
    const subIndo = subIndoRes.data!

    const teacherRes = await useWorkspaceStore.getState().createTeacher({
      name: "Siti Rahma",
    })
    const teacher = teacherRes.data!

    const roomRes = await useWorkspaceStore.getState().createRoom({
      name: "Ruang 101",
      type: "classroom",
    })
    const room = roomRes.data!

    // Matematika: 3 sesi
    const reqMathRes = await useWorkspaceStore.getState().createTeachingRequirement({
      classId,
      subjectId: subMath.id,
      defaultTeacherId: teacher.id,
      defaultRoomId: room.id,
      sessionsPerWeek: 3,
      durationMinutes: 45,
      roomRequired: true,
      notes: "Matematika Reguler",
    })
    const reqMath = reqMathRes.data!

    // Bahasa Indonesia: 2 sesi
    const reqIndoRes = await useWorkspaceStore.getState().createTeachingRequirement({
      classId,
      subjectId: subIndo.id,
      defaultTeacherId: teacher.id,
      defaultRoomId: null,
      sessionsPerWeek: 2,
      durationMinutes: 45,
      roomRequired: false,
    })
    const reqIndo = reqIndoRes.data!

    return {
      classId,
      subMath,
      subIndo,
      teacher,
      room,
      reqMath,
      reqIndo,
    }
  }

  it("1. me-render progress bar alokasi sesi kelas aktif dengan persentase dan teks yang benar (AC-FR06-02)", async () => {
    const { reqMath } = await seedActivePanelFixture()

    // Tempatkan 1 sesi Matematika ke grid (1 dari 5 sesi terjadwal = 20%)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    renderPanel()

    // Memverifikasi elemen progress bar hadir dengan nilai progres yang akurat
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute("aria-valuenow", "20")

    // Memverifikasi teks progres ringkasan
    expect(
      screen.getByText(/1 dari 5 sesi terjadwal/i)
    ).toBeInTheDocument()

    // Memverifikasi lencana sisa sesi
    expect(screen.getByText(/4 sesi tersisa/i)).toBeInTheDocument()
  })

  it("2. input teks pencarian menyaring daftar kartu secara instan (AC-FR06-03)", async () => {
    const user = userEvent.setup()
    await seedActivePanelFixture()

    renderPanel()

    // Awalnya kedua mapel muncul
    expect(screen.getAllByText("Matematika").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Bahasa Indonesia").length).toBeGreaterThan(0)

    // Ketik "bahasa" di kotak pencarian
    const searchInput = screen.getByPlaceholderText(/cari mata pelajaran/i)
    await user.type(searchInput, "bahasa")

    // Hanya Bahasa Indonesia yang tampil, Matematika tersembunyi
    expect(screen.queryByText("Matematika")).not.toBeInTheDocument()
    expect(screen.getByText("Bahasa Indonesia")).toBeInTheDocument()

    // Bersihkan kotak pencarian
    await user.clear(searchInput)
    expect(screen.getAllByText("Matematika").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Bahasa Indonesia").length).toBeGreaterThan(0)
  })

  it("3. tombol filter status alokasi ('Belum Selesai' vs 'Semua') memperbarui daftar kartu yang tampil", async () => {
    const user = userEvent.setup()
    const { reqIndo } = await seedActivePanelFixture()

    // Jadwalkan seluruh sesi Bahasa Indonesia (2 dari 2 sesi terjadwal)
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqIndo.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqIndo.id,
      dayOfWeek: "tuesday",
      startTime: "07:30",
    })

    renderPanel()

    // Tombol filter status hadir di antarmuka
    const unfulfilledFilterBtn = screen.getByRole("button", {
      name: /belum selesai/i,
    })
    const allFilterBtn = screen.getByRole("button", {
      name: /semua/i,
    })
    expect(unfulfilledFilterBtn).toBeInTheDocument()
    expect(allFilterBtn).toBeInTheDocument()

    // Pada filter default "Belum Selesai", mapel Bahasa Indonesia (yang sudah 100% terjadwal) disaring keluar
    expect(screen.getAllByText("Matematika").length).toBeGreaterThan(0)
    expect(screen.queryByText("Bahasa Indonesia")).not.toBeInTheDocument()

    // Klik tombol filter "Semua"
    await user.click(allFilterBtn)
    expect(screen.getAllByText("Matematika").length).toBeGreaterThan(0)
    expect(screen.getByText("Bahasa Indonesia")).toBeInTheDocument()
  })

  it("4. tombol cepat 'Tempatkan ke Jadwal' membuka dialog dan berhasil menempatkan sesi saat dikonfirmasi (AC-FR06-04)", async () => {
    const user = userEvent.setup()
    await seedActivePanelFixture()

    renderPanel()

    // Temukan tombol 'Tempatkan ke Jadwal' pada kartu pertama
    const quickPlaceButtons = screen.getAllByRole("button", {
      name: /tempatkan ke jadwal/i,
    })
    expect(quickPlaceButtons.length).toBeGreaterThan(0)

    // Klik tombol cepat untuk membuka dialog
    await user.click(quickPlaceButtons[0])

    // Dialog konfirmasi penempatan muncul
    expect(
      screen.getByRole("heading", { name: "Tempatkan Sesi ke Jadwal" })
    ).toBeInTheDocument()

    // Klik tombol 'Simpan ke Grid'
    const confirmButton = screen.getByRole("button", { name: /simpan ke grid/i })
    await user.click(confirmButton)

    // Sesi berhasil ditempatkan ke store
    await waitFor(() => {
      expect(useWorkspaceStore.getState().sessions.length).toBe(1)
    })
  })

  it("5. menampilkan tampilan pesan sukses saat seluruh sesi kelas telah terjadwal (AC-FR06-07)", async () => {
    const { reqMath, reqIndo } = await seedActivePanelFixture()

    // Jadwalkan seluruh 3 sesi Matematika
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "tuesday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqMath.id,
      dayOfWeek: "wednesday",
      startTime: "07:30",
    })

    // Jadwalkan seluruh 2 sesi Bahasa Indonesia
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqIndo.id,
      dayOfWeek: "thursday",
      startTime: "07:30",
    })
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: reqIndo.id,
      dayOfWeek: "friday",
      startTime: "07:30",
    })

    renderPanel()

    // Memverifikasi tampilan pesan sukses 100% terjadwal
    expect(
      screen.getByText(/seluruh sesi telah terjadwal/i)
    ).toBeInTheDocument()
  })

  it("6. menampilkan tampilan edukatif saat kelas belum memiliki data kebutuhan pembelajaran", async () => {
    // Buat kelas baru tanpa kebutuhan
    const classRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VIII-B",
      grade: "VIII",
    })
    await useWorkspaceStore.getState().setActiveClass(classRes.data!.id)

    renderPanel()

    // Menampilkan pesan bahwa kelas belum memiliki alokasi kebutuhan
    expect(
      screen.getByText(/belum memiliki kebutuhan pembelajaran/i)
    ).toBeInTheDocument()

    // Menampilkan tombol / tautan untuk membuka Data Master Kebutuhan
    expect(
      screen.getByRole("button", {
        name: /kelola kebutuhan pembelajaran/i,
      })
    ).toBeInTheDocument()
  })
})
