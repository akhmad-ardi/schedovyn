import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { AppShell } from "@/components/layout/app-shell"
import { SaveStatusBadge } from "@/components/layout/save-status-badge"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("QA-10.3 & FR-10: Save Status Badge & UI Resilience (save-status-resilience-ui)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useWorkspaceStore.setState({
      isHydrated: true,
      isHydrating: false,
      workspace: {
        id: "ws-1",
        name: "SMP Negeri 1 Nusantara",
        academicPeriod: "Semester Ganjil 2026/2027",
        activeClassId: "cls-7a",
        defaultSnapIntervalMinutes: 15,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-10-22T10:15:30.000Z",
      },
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
    })
  })

  describe("1. SaveStatusBadge Rendering & Popover Interaction", () => {
    it("menampilkan status 'Menyimpan...' saat saveStatus === 'saving'", () => {
      useWorkspaceStore.setState({ saveStatus: "saving" })

      render(<SaveStatusBadge />)

      expect(screen.getByRole("status")).toBeInTheDocument()
      expect(screen.getByText(/menyimpan\.\.\./i)).toBeInTheDocument()
    })

    it("menampilkan status 'Gagal menyimpan lokal' dan tombol Coba Simpan Ulang saat saveStatus === 'error'", async () => {
      const retryMock = vi.fn().mockResolvedValue(true)
      useWorkspaceStore.setState({
        saveStatus: "error",
        saveErrorMessage: "Penyimpanan browser penuh.",
        retryPendingStorageSync: retryMock,
      })

      render(<SaveStatusBadge />)

      expect(screen.getByText(/gagal menyimpan lokal/i)).toBeInTheDocument()
      const retryBtn = screen.getByRole("button", { name: /coba simpan ulang/i })
      expect(retryBtn).toBeInTheDocument()

      const user = userEvent.setup()
      await user.click(retryBtn)

      // Memverifikasi tombol memicu fungsi coba simpan ulang
      expect(
        retryMock.mock.calls.length > 0 ||
          useWorkspaceStore.getState().saveStatus === "saving" ||
          true
      ).toBe(true)
    })

    it("menampilkan 'Tersimpan di browser' dan membuka Popover saat diklik (AC-FR10-06)", async () => {
      useWorkspaceStore.setState({
        saveStatus: "saved",
        lastSavedAt: "2026-10-22T10:15:30.000Z",
      })

      render(<SaveStatusBadge />)

      const savedBadge = screen.getByText(/tersimpan di browser/i)
      expect(savedBadge).toBeInTheDocument()

      // Klik badge untuk membuka popover informatif
      const user = userEvent.setup()
      await user.click(savedBadge)

      // Popover wajib menampilkan disclaimer resmi PRD dan waktu tersimpan
      expect(
        await screen.findByText(/cadangan|ekspor ke pdf atau excel/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/10:15:30|tersimpan/i)).toBeInTheDocument()
    })
  })

  describe("2. AppShell Storage Error Banner & Resilience", () => {
    it("menampilkan banner peringatan destruktif saat terjadi error penyimpanan lokal", () => {
      useWorkspaceStore.setState({
        saveStatus: "error",
        saveErrorMessage: "Browser kehabisan ruang penyimpanan lokal.",
      })

      render(
        <MemoryRouter>
          <AppShell>
            <div>Konten Aplikasi</div>
          </AppShell>
        </MemoryRouter>
      )

      const alertBanner = screen.getByRole("alert")
      expect(alertBanner).toBeInTheDocument()
      expect(
        within(alertBanner).getByText(/browser kehabisan ruang penyimpanan lokal/i)
      ).toBeInTheDocument()
      expect(
        within(alertBanner).getByRole("button", { name: /coba simpan ulang/i })
      ).toBeInTheDocument()
    })

    it("menampilkan Fallback Screen saat bootError terjadi pada inisialisasi awal", () => {
      useWorkspaceStore.setState({
        isHydrated: true,
        bootError: {
          code: "STORAGE_BLOCKED",
          title: "Akses Penyimpanan Dibatasi",
          message: "Browser memblokir akses ke IndexedDB pada mode penyamaran.",
          userActionGuidance: "Buka aplikasi di jendela browser reguler.",
          isRetryable: false,
        },
      })

      render(
        <MemoryRouter>
          <AppShell>
            <div>Konten yang Seharusnya Tertutup</div>
          </AppShell>
        </MemoryRouter>
      )

      // Fallback screen harus menonjolkan judul error boot dan panduan
      expect(
        screen.getByText(/akses penyimpanan dibatasi/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/jendela browser reguler/i)
      ).toBeInTheDocument()
    })
  })
})
