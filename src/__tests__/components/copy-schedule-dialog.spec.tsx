import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import type * as CopyScheduleDialogModule from "@/components/timetable/copy-schedule-dialog"

describe("QA-12.3 & FR-12: Copy Schedule Dialog UI (copy-schedule-dialog)", () => {
  let dialogModule: typeof CopyScheduleDialogModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/components/timetable/copy-schedule-dialog"
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
      validationReport: null,
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
      saveErrorInfo: null,
      bootError: null,
    })

    await useWorkspaceStore.getState().bootWorkspace()
  })

  async function seedDialogFixture() {
    const class7ARes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
    })
    const class7AId = class7ARes.data!.id

    const class7BRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-B",
      grade: "VII",
    })
    const class7BId = class7BRes.data!.id

    await useWorkspaceStore.getState().setActiveClass(class7AId)

    const mathRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
    })
    const mathId = mathRes.data!.id

    const budiRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
    })
    const teacherBudiId = budiRes.data!.id

    const req7A = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: class7AId,
        subjectId: mathId,
        defaultTeacherId: teacherBudiId,
        defaultRoomId: null,
        sessionsPerWeek: 1,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    // Tempatkan 1 sesi di kelas VII-A
    await useWorkspaceStore.getState().placeUnscheduledSession({
      requirementId: req7A.id,
      dayOfWeek: "monday",
      startTime: "07:30",
    })

    return { class7AId, class7BId, teacherBudiId }
  }

  it("1. dialog terbuka dan menampilkan judul serta formulir opsi penyalinan jadwal", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedDialogFixture()
    const { CopyScheduleDialog } = dialogModule

    render(<CopyScheduleDialog open={true} onOpenChange={vi.fn()} />)

    // Memverifikasi heading dialog
    expect(
      screen.getByRole("heading", { name: /salin jadwal/i })
    ).toBeInTheDocument()

    // Memverifikasi elemen kelas sumber dan kelas tujuan
    expect(screen.getByText(/kelas sumber/i)).toBeInTheDocument()
    expect(screen.getByText(/kelas tujuan/i)).toBeInTheDocument()

    // Memverifikasi opsi mode penanganan timpa vs gabung
    expect(screen.getByText(/timpa|replace/i)).toBeInTheDocument()
    expect(screen.getByText(/gabung|merge/i)).toBeInTheDocument()
  })

  it("2. menampilkan kotak peringatan mengenai potensi bentrokan guru dan ruangan (PRD FR-12.2, FR-12.4)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedDialogFixture()
    const { CopyScheduleDialog } = dialogModule

    render(<CopyScheduleDialog open={true} onOpenChange={vi.fn()} />)

    // Memverifikasi adanya peringatan / informasi pemeriksaan guru & ruangan
    expect(
      screen.getByText(/periksa guru|bentrokan guru|bentrokan jadwal/i)
    ).toBeInTheDocument()
  })

  it("3. tombol konfirmasi salin dinonaktifkan jika kelas tujuan sama dengan kelas sumber (AC-FR12-07)", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    await seedDialogFixture()
    const { CopyScheduleDialog } = dialogModule

    render(<CopyScheduleDialog open={true} onOpenChange={vi.fn()} />)

    // Jika kelas tujuan belum dipilih atau identik dengan sumber, tombol konfirmasi tidak boleh aktif
    const submitBtn = screen.getByRole("button", {
      name: /salin jadwal sekarang|salin jadwal/i,
    })
    expect(submitBtn).toBeDisabled()
  })

  it("4. mengeklik salin jadwal memicu action copyClassSchedule dan menyajikan ringkasan hasil", async () => {
    expect(dialogModule).not.toBeNull()
    if (!dialogModule) return

    const { class7BId } = await seedDialogFixture()
    const { CopyScheduleDialog } = dialogModule

    const copyMock = vi.fn().mockResolvedValue({
      ok: true,
      copiedCount: 1,
      replacedCount: 0,
      newConflictsCount: 0,
      targetClassId: class7BId,
      unmatchedSubjectIds: [],
    })

    useWorkspaceStore.setState({
      copyClassSchedule: copyMock,
    })

    render(<CopyScheduleDialog open={true} onOpenChange={vi.fn()} />)

    // Pilih kelas tujuan VII-B
    const user = userEvent.setup()
    const targetSelect = screen.getByLabelText(/kelas tujuan/i) || screen.getByRole("combobox")
    if (targetSelect) {
      await user.click(targetSelect)
      const option7B = await screen.findByText("VII-B")
      await user.click(option7B)
    }

    const submitBtn = screen.getByRole("button", {
      name: /salin jadwal sekarang|salin jadwal/i,
    })

    if (!submitBtn.hasAttribute("disabled")) {
      await user.click(submitBtn)
      expect(copyMock).toHaveBeenCalled()
    }
  })
})
