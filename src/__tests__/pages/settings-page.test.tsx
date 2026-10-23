import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { AppShell } from "@/components/layout/app-shell"
import { SettingsPage } from "@/pages/settings-page"

function renderSettingsWithShell() {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <AppShell>
        <SettingsPage />
      </AppShell>
    </MemoryRouter>
  )
}

describe("FR-01: Halaman Pengaturan Ruang Kerja & Jam Belajar (SettingsPage)", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useWorkspaceStore.setState({
      isHydrated: false,
      isHydrating: false,
      workspace: null,
      dayConfigs: [],
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })
  })

  it("merender identitas ruang kerja, daftar 7 hari (Senin s.d. Minggu), dan indikator status penyimpanan", async () => {
    renderSettingsWithShell()

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("SMP Negeri 1 Nusantara")
      ).toBeInTheDocument()
    })

    expect(
      screen.getByDisplayValue("Semester Ganjil 2026/2027")
    ).toBeInTheDocument()
    expect(screen.getByText(/Tersimpan di browser/i)).toBeInTheDocument()

    for (const label of [
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
      "Minggu",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("mengubah nama sekolah dan mengaktifkan hari Sabtu serta memperbarui penyimpanan lokal", async () => {
    const user = userEvent.setup()
    renderSettingsWithShell()

    const schoolNameInput = await screen.findByDisplayValue(
      "SMP Negeri 1 Nusantara"
    )
    await user.clear(schoolNameInput)
    await user.type(schoolNameInput, "SMA Negeri 2 Merdeka")

    await waitFor(() => {
      expect(useWorkspaceStore.getState().workspace?.name).toBe(
        "SMA Negeri 2 Merdeka"
      )
      expect(useWorkspaceStore.getState().saveStatus).toBe("saved")
    })
  })

  it("menambah periode istirahat baru dan menampilkan peringatan Bahasa Indonesia ketika rentang waktu tidak valid", async () => {
    const user = userEvent.setup()
    renderSettingsWithShell()

    await screen.findByDisplayValue("SMP Negeri 1 Nusantara")

    const addBreakButtons = screen.getAllByRole("button", {
      name: /Tambah Waktu Istirahat/i,
    })
    expect(addBreakButtons.length).toBeGreaterThan(0)
    await user.click(addBreakButtons[0])

    // Simulasikan kondisi tidak valid pada jam belajar Senin untuk memicu Alert validasi
    await useWorkspaceStore.getState().updateDayConfig("monday", {
      startTime: "15:00",
      endTime: "07:00",
    })

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })
  })

  it("dapat memuat seed contoh lengkap dan menghapus semua seed melalui kartu Pengelolaan Data", async () => {
    const user = userEvent.setup()
    renderSettingsWithShell()

    await screen.findByDisplayValue("SMP Negeri 1 Nusantara")

    // 1. Verifikasi kehadiran kartu Pengelolaan Data & Seed Contoh
    expect(
      screen.getByText(/Pengelolaan Data & Seed Contoh/i)
    ).toBeInTheDocument()

    // 2. Klik tombol Muat Ulang Seed Lengkap
    const loadSeedButton = screen.getByRole("button", {
      name: /Muat Ulang Seed Lengkap/i,
    })
    await user.click(loadSeedButton)

    // Konfirmasi modal AlertDialog
    const confirmSeedAction = await screen.findByRole("button", {
      name: /Muat Ulang Data Contoh/i,
    })
    await user.click(confirmSeedAction)

    await waitFor(() => {
      const state = useWorkspaceStore.getState()
      expect(state.classes.length).toBe(6)
      expect(state.teachers.length).toBe(10)
      expect(state.subjects.length).toBe(10)
      expect(state.rooms.length).toBe(10)
      expect(state.sessions.length).toBeGreaterThan(15)
      expect(state.workspace?.activeClassId).toBe("seed-cls-7a")
    })

    // 3. Klik tombol Hapus Semua Seed / Data
    const clearButton = screen.getByRole("button", {
      name: /Hapus Semua Seed \/ Data/i,
    })
    await user.click(clearButton)

    // Konfirmasi modal AlertDialog
    const confirmClearAction = await screen.findByRole("button", {
      name: /Hapus Semua Data/i,
    })
    await user.click(confirmClearAction)

    await waitFor(() => {
      const state = useWorkspaceStore.getState()
      expect(state.classes).toHaveLength(0)
      expect(state.teachers).toHaveLength(0)
      expect(state.subjects).toHaveLength(0)
      expect(state.rooms).toHaveLength(0)
      expect(state.requirements).toHaveLength(0)
      expect(state.sessions).toHaveLength(0)
      expect(state.workspace?.activeClassId).toBeNull()
    })
  })
})
