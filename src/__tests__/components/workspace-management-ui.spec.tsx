import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { AppShell } from "@/components/layout/app-shell"
import { SettingsPage } from "@/pages/settings-page"

function renderWithShell(initialPath = "/settings") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShell>
        <SettingsPage />
      </AppShell>
    </MemoryRouter>
  )
}

describe("FR-13 & AC-14: UI Component Workspace Switcher & Management Card", () => {
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

  describe("WorkspaceSwitcher di Header AppShell", () => {
    it("menampilkan nama ruang kerja aktif dan mengizinkan perpindahan ruang kerja lewat trigger dropdown", async () => {
      const user = userEvent.setup()

      // Tambahkan ruang kerja kedua terlebih dahulu
      await useWorkspaceStore.getState().createWorkspace({
        name: "SMA 2 Nusantara",
        academicPeriod: "Semester 2",
        defaultSnapIntervalMinutes: 30,
        initMode: "BLANK",
      })

      // Beralih ke ruang kerja pertama
      const ws1 = useWorkspaceStore.getState().workspaces.find((w) => w.name === "SMP Negeri 1 Nusantara")!
      const ws2 = useWorkspaceStore.getState().workspaces.find((w) => w.name === "SMA 2 Nusantara")!
      await useWorkspaceStore.getState().switchWorkspace(ws1.id)

      renderWithShell("/settings")

      // Pastikan switcher trigger terpasang di header
      const switcherTrigger = await screen.findByTestId("workspace-switcher-trigger")
      expect(switcherTrigger).toBeInTheDocument()
      expect(switcherTrigger).toHaveTextContent("SMP Negeri 1 Nusantara")

      // Buka dropdown pemilih ruang kerja
      await user.click(switcherTrigger)

      // Pastikan item ruang kerja kedua muncul di menu
      const ws2Item = await screen.findByTestId(`workspace-switch-item-${ws2.id}`)
      expect(ws2Item).toBeInTheDocument()
      expect(ws2Item).toHaveTextContent("SMA 2 Nusantara")

      // Klik ruang kerja kedua untuk berpindah
      await user.click(ws2Item)

      // Header harus berganti menampilkan ruang kerja kedua
      await waitFor(() => {
        expect(screen.getByTestId("workspace-switcher-trigger")).toHaveTextContent("SMA 2 Nusantara")
      })
      expect(useWorkspaceStore.getState().workspace?.id).toBe(ws2.id)
    })

    it("memiliki tombol pembuka dialog pembuatan ruang kerja baru dari dropdown switcher", async () => {
      const user = userEvent.setup()
      renderWithShell("/settings")

      const switcherTrigger = await screen.findByTestId("workspace-switcher-trigger")
      await user.click(switcherTrigger)

      const openCreateDialogBtn = await screen.findByTestId("open-create-workspace-dialog")
      expect(openCreateDialogBtn).toBeInTheDocument()

      await user.click(openCreateDialogBtn)

      // Dialog pembuatan ruang kerja baru harus terbuka
      expect(await screen.findByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/Buat Ruang Kerja Baru/i)).toBeInTheDocument()
    })
  })

  describe("WorkspaceManagementCard di SettingsPage", () => {
    it("menampilkan daftar ruang kerja dengan status Aktif dan tombol hapus nonaktif jika hanya ada 1 ruang kerja", async () => {
      renderWithShell("/settings")

      const ws1 = useWorkspaceStore.getState().workspace!

      // Kartu manajemen ruang kerja harus terlihat
      expect(await screen.findByText(/Pengelolaan Ruang Kerja/i)).toBeInTheDocument()
      expect(screen.getByText(ws1.name)).toBeInTheDocument()
      expect(screen.getByText(/Aktif/i)).toBeInTheDocument()

      // Tombol hapus harus dinonaktifkan (disabled) karena hanya ada 1 ruang kerja
      const deleteButton = screen.getByTestId(`delete-workspace-${ws1.id}`)
      expect(deleteButton).toBeDisabled()
    })

    it("membuka dialog pembuatan ruang kerja baru dan berhasil membuat ruang kerja BLANK", async () => {
      const user = userEvent.setup()
      renderWithShell("/settings")

      const createBtn = await screen.findByTestId("create-workspace-button")
      await user.click(createBtn)

      // Modal dialog terbuka
      expect(await screen.findByRole("dialog")).toBeInTheDocument()

      // Isi nama dan periode akademik
      const nameInput = screen.getByLabelText(/Nama Ruang Kerja/i)
      const periodInput = screen.getByLabelText(/Periode Akademik/i)

      await user.type(nameInput, "SMK Vokasi Unggul")
      await user.type(periodInput, "Tahun Ajaran 2026/2027")

      // Pilih opsi Ruang Kerja Kosong (BLANK) jika ada pilihan radio
      const blankRadio = screen.queryByLabelText(/Ruang Kerja Kosong/i)
      if (blankRadio) {
        await user.click(blankRadio)
      }

      // Klik tombol Simpan/Buat di dalam dialog
      const submitBtn = screen.getByRole("button", { name: /Buat Ruang Kerja|Simpan/i })
      await user.click(submitBtn)

      // Dialog tertutup dan ruang kerja baru terdaftar dan aktif
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })

      expect(screen.getByText("SMK Vokasi Unggul")).toBeInTheDocument()
      expect(useWorkspaceStore.getState().workspace?.name).toBe("SMK Vokasi Unggul")
    })

    it("mengaktifkan ruang kerja lain melalui tombol 'Aktifkan'", async () => {
      const user = userEvent.setup()

      // Tambahkan ruang kerja kedua
      await useWorkspaceStore.getState().createWorkspace({
        name: "SMP Binaan Khusus",
        academicPeriod: "Semester 1",
        defaultSnapIntervalMinutes: 15,
        initMode: "BLANK",
      })

      const ws1 = useWorkspaceStore.getState().workspaces.find((w) => w.name === "SMP Negeri 1 Nusantara")!
      const ws2 = useWorkspaceStore.getState().workspaces.find((w) => w.name === "SMP Binaan Khusus")!
      expect(ws2).toBeDefined()

      // Jadikan ws2 aktif, lalu kita akan menguji tombol Aktifkan pada ws1
      renderWithShell("/settings")

      const activateWs1Btn = await screen.findByTestId(`activate-workspace-${ws1.id}`)
      expect(activateWs1Btn).toBeInTheDocument()
      expect(activateWs1Btn).not.toBeDisabled()

      await user.click(activateWs1Btn)

      await waitFor(() => {
        expect(useWorkspaceStore.getState().workspace?.id).toBe(ws1.id)
      })
    })

    it("membuka dialog duplikasi ruang kerja dengan opsi MASTER_DATA_ONLY dan FULL_COPY", async () => {
      const user = userEvent.setup()
      renderWithShell("/settings")

      const ws1 = useWorkspaceStore.getState().workspace!
      const dupBtn = await screen.findByTestId(`duplicate-workspace-${ws1.id}`)

      await user.click(dupBtn)

      // Dialog duplikasi terbuka
      expect(await screen.findByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/Duplikasi Ruang Kerja/i)).toBeInTheDocument()

      // Input nama dan periode klon
      const dupNameInput = screen.getByLabelText(/Nama Ruang Kerja Baru/i)
      await user.type(dupNameInput, "SMPN 1 Nusantara (Kloning)")

      // Opsi pilihan mode duplikasi
      expect(screen.getByText(/Konfigurasi & Data Master Saja/i)).toBeInTheDocument()
      expect(screen.getByText(/Salin Penuh Beserta Jadwal/i)).toBeInTheDocument()

      const submitDupBtn = screen.getByRole("button", { name: /Duplikasi Sekarang|Simpan/i })
      await user.click(submitDupBtn)

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })

      expect(screen.getByText("SMPN 1 Nusantara (Kloning)")).toBeInTheDocument()
    })

    it("menghapus ruang kerja kedua dengan dialog konfirmasi saat terdapat lebih dari 1 ruang kerja", async () => {
      const user = userEvent.setup()

      // Tambahkan ruang kerja kedua
      await useWorkspaceStore.getState().createWorkspace({
        name: "Ruang Kerja Hapus",
        academicPeriod: "2026",
        defaultSnapIntervalMinutes: 30,
        initMode: "BLANK",
      })

      const wsToDelete = useWorkspaceStore.getState().workspaces.find((w) => w.name === "Ruang Kerja Hapus")!

      renderWithShell("/settings")

      const deleteBtn = await screen.findByTestId(`delete-workspace-${wsToDelete.id}`)
      expect(deleteBtn).not.toBeDisabled()

      await user.click(deleteBtn)

      // AlertDialog konfirmasi muncul
      expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
      expect(screen.getByText(/Apakah Anda yakin ingin menghapus ruang kerja/i)).toBeInTheDocument()

      // Klik tombol konfirmasi Hapus
      const confirmDeleteBtn = screen.getByRole("button", { name: /^Hapus Ruang Kerja$|^Hapus$/i })
      await user.click(confirmDeleteBtn)

      await waitFor(() => {
        expect(screen.queryByText("Ruang Kerja Hapus")).not.toBeInTheDocument()
      })
    })
  })
})
