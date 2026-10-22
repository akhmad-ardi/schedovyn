import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { db } from "@/db/database"
import type { ScopeValidationSummary } from "@/domain/types/validation"
import { ConflictListPanel } from "@/components/conflicts/conflict-list-panel"
import { ConflictStatusBadge } from "@/components/conflicts/conflict-status-badge"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type * as ValidationSummaryCardsModule from "@/components/conflicts/validation-summary-cards"

describe("QA-11.3 & FR-11: Validation Summary & Multi-Scope UI (validation-summary-ui)", () => {
  let cardsModule: typeof ValidationSummaryCardsModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/components/conflicts/validation-summary-cards"
      cardsModule = await import(/* @vite-ignore */ modulePath)
    } catch {
      cardsModule = null
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
      validationReport: null,
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
      saveErrorInfo: null,
      bootError: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  async function seedSummaryFixture() {
    const class7Res = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const class7AId = class7Res.data!.id

    const class8Res = await useWorkspaceStore.getState().createClassGroup({
      name: "VIII-A",
      grade: "VIII",
    })
    const class8AId = class8Res.data!.id

    await useWorkspaceStore.getState().setActiveClass(class7AId)

    const mathRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const subjectId = mathRes.data!.id

    const teacherRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const teacherId = teacherRes.data!.id

    const req7Res = await useWorkspaceStore.getState().createTeachingRequirement({
      classId: class7AId,
      subjectId,
      defaultTeacherId: teacherId,
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    })
    const req7AId = req7Res.data!.id

    const req8Res = await useWorkspaceStore.getState().createTeachingRequirement({
      classId: class8AId,
      subjectId,
      defaultTeacherId: teacherId,
      defaultRoomId: null,
      sessionsPerWeek: 1,
      durationMinutes: 45,
      roomRequired: false,
    })
    const req8AId = req8Res.data!.id

    return { class7AId, class8AId, subjectId, teacherId, req7AId, req8AId }
  }

  describe("1. ValidationSummaryCards (AC-FR11-01: 5 Metrik Minimal)", () => {
    it("merender 5 metrik minimal dengan angka numerik dan status deskriptif", () => {
      expect(cardsModule).not.toBeNull()
      if (!cardsModule) return

      const mockSummary: ScopeValidationSummary = {
        status: "INCOMPLETE",
        statusLabel: "Belum lengkap",
        scheduledSessionsCount: 4,
        unscheduledSessionsCount: 2,
        activeConflictsCount: 1,
        completenessWarningsCount: 3,
        conflicts: [],
        warnings: [],
      }

      const { ValidationSummaryCards } = cardsModule
      render(
        <ValidationSummaryCards
          summary={mockSummary}
          scopeTitle="Kelas VII-A"
          scopeDescription="Ringkasan validasi pembelajaran"
        />
      )

      // 1. Status Validasi
      expect(screen.getByText(/belum lengkap/i)).toBeInTheDocument()

      // 2. Sesi Terjadwal
      expect(screen.getByText("4")).toBeInTheDocument()
      expect(screen.getByText(/sesi terjadwal/i)).toBeInTheDocument()

      // 3. Sesi Belum Ditempatkan
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText(/belum ditempatkan|belum terjadwal/i)).toBeInTheDocument()

      // 4. Konflik Aktif
      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText(/konflik aktif/i)).toBeInTheDocument()

      // 5. Peringatan Kelengkapan
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText(/peringatan kelengkapan/i)).toBeInTheDocument()
    })
  })

  describe("2. ConflictListPanel (Dual-Scope & Matriks Seluruh Kelas - AC-FR11-02, AC-FR11-06)", () => {
    it("menampilkan dialog dengan judul baru 'Ringkasan Validasi dan Daftar Konflik' serta pemilih cakupan", async () => {
      await seedSummaryFixture()

      render(<ConflictListPanel open={true} onOpenChange={vi.fn()} />)

      // Judul dialog baru yang terpadu
      expect(
        screen.getByRole("heading", {
          name: /ringkasan validasi/i,
        })
      ).toBeInTheDocument()

      // Pemilih cakupan (Kelas Aktif vs Seluruh Ruang Kerja)
      expect(
        screen.getByRole("button", { name: /kelas aktif/i }) ||
          screen.getByText(/kelas aktif/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /seluruh ruang kerja/i }) ||
          screen.getByText(/seluruh ruang kerja/i)
      ).toBeInTheDocument()
    })

    it("menampilkan Matriks Kelengkapan Kelas dengan tombol navigasi instan berpindah kelas", async () => {
      const { class8AId } = await seedSummaryFixture()

      render(<ConflictListPanel open={true} onOpenChange={vi.fn()} />)

      // Matriks kelas memuat baris untuk VII-A dan VIII-A
      expect(screen.getByText("VII-A")).toBeInTheDocument()
      expect(screen.getByText("VIII-A")).toBeInTheDocument()

      // Tombol navigasi "Buka Jadwal" untuk kelas VIII-A
      const openClassButtons = screen.getAllByRole("button", {
        name: /buka jadwal/i,
      })
      expect(openClassButtons.length).toBeGreaterThanOrEqual(1)

      const user = userEvent.setup()
      await user.click(openClassButtons[openClassButtons.length - 1])

      // Memverifikasi kelas aktif beralih ke kelas VIII-A
      expect(useWorkspaceStore.getState().workspace?.activeClassId).toBe(class8AId)
    })
  })

  describe("3. ConflictStatusBadge (Multi-Isyarat & Cakupan Dinamis - AC-FR11-07)", () => {
    it("menampilkan lencana multi-isyarat dengan teks dan ikon yang sesuai status", async () => {
      await seedSummaryFixture()

      render(<ConflictStatusBadge />)

      const badge = screen.getByRole("button")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute("aria-label", expect.stringMatching(/status validasi/i))
      expect(badge.textContent).toMatch(/peringatan|belum lengkap|konflik/i)
    })

    it("mendukung prop scope='active-class' untuk menampilkan status kelas aktif", async () => {
      const { req7AId } = await seedSummaryFixture()

      // Tempatkan sesi VII-A sehingga kelas VII-A berstatus NO_CONFLICT_CURRENT_DATA
      await useWorkspaceStore.getState().placeUnscheduledSession({
        requirementId: req7AId,
        dayOfWeek: "monday",
        startTime: "07:30",
      })

      render(<ConflictStatusBadge scope="active-class" />)

      const badge = screen.getByRole("button")
      expect(badge).toBeInTheDocument()
      // Pada cakupan kelas aktif, VII-A bebas konflik
      expect(badge.textContent).toMatch(/bebas konflik/i)
    })
  })
})
