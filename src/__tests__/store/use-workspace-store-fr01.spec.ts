import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/db/database"
import * as workspaceRepo from "@/db/workspace-repository"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("FR-01, FR-10, AC-12: Workspace Store & Auto-Save Sync", () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
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

  it("AC-FR01-01: bootWorkspace() menginisialisasi workspace default dan menyetel saveStatus menjadi 'saved'", async () => {
    await useWorkspaceStore.getState().bootWorkspace()

    const state = useWorkspaceStore.getState()
    expect(state.isHydrated).toBe(true)
    expect(state.isHydrating).toBe(false)
    expect(state.workspace?.name).toBe("SMP Negeri 1 Nusantara")
    expect(state.dayConfigs).toHaveLength(7)
    expect(state.saveStatus).toBe("saved")
    expect(state.configValidation.isValid).toBe(true)
  })

  it("AC-FR01-02 & AC-12: mengubah identitas, mengaktifkan Sabtu, menambah/mengubah/menghapus istirahat, lalu memulihkan dari IndexedDB", async () => {
    await useWorkspaceStore.getState().bootWorkspace()

    const identityOk = await useWorkspaceStore
      .getState()
      .updateWorkspaceIdentity({
        name: "SMA Negeri 2 Merdeka",
        academicPeriod: "Semester Genap 2026/2027",
        defaultSnapIntervalMinutes: 30,
        applySnapIntervalToAllDays: true,
      })
    expect(identityOk).toBe(true)

    const saturdayOk = await useWorkspaceStore
      .getState()
      .updateDayConfig("saturday", {
        isSchoolDay: true,
        startTime: "07:00",
        endTime: "12:00",
      })
    expect(saturdayOk).toBe(true)

    const addBreakOk = await useWorkspaceStore
      .getState()
      .addBreakInterval("saturday", {
        label: "Istirahat Sabtu",
        startTime: "09:30",
        endTime: "10:00",
      })
    expect(addBreakOk).toBe(true)

    const satConfig = useWorkspaceStore
      .getState()
      .dayConfigs.find((d) => d.dayOfWeek === "saturday")
    expect(satConfig?.breakIntervals).toHaveLength(1)
    const breakId = satConfig!.breakIntervals[0].id

    const updateBreakOk = await useWorkspaceStore
      .getState()
      .updateBreakInterval("saturday", breakId, {
        label: "Istirahat Pagi Sabtu",
        endTime: "10:15",
      })
    expect(updateBreakOk).toBe(true)

    // Simulasi muat ulang browser: reset state di memori lalu boot ulang dari IndexedDB
    useWorkspaceStore.setState({
      isHydrated: false,
      workspace: null,
      dayConfigs: [],
      saveStatus: "idle",
    })

    await useWorkspaceStore.getState().bootWorkspace()
    const restored = useWorkspaceStore.getState()

    expect(restored.workspace?.name).toBe("SMA Negeri 2 Merdeka")
    expect(restored.workspace?.defaultSnapIntervalMinutes).toBe(30)

    const restoredSat = restored.dayConfigs.find(
      (d) => d.dayOfWeek === "saturday"
    )
    expect(restoredSat?.isSchoolDay).toBe(true)
    expect(restoredSat?.endTime).toBe("12:00")
    expect(restoredSat?.snapIntervalMinutes).toBe(30)
    expect(restoredSat?.breakIntervals).toHaveLength(1)
    expect(restoredSat?.breakIntervals[0].label).toBe("Istirahat Pagi Sabtu")
    expect(restoredSat?.breakIntervals[0].endTime).toBe("10:15")

    const removeBreakOk = await useWorkspaceStore
      .getState()
      .removeBreakInterval("saturday", breakId)
    expect(removeBreakOk).toBe(true)
    expect(
      useWorkspaceStore
        .getState()
        .dayConfigs.find((d) => d.dayOfWeek === "saturday")?.breakIntervals
    ).toHaveLength(0)
  })

  it("AC-FR01-04: menolak penyimpanan ke IndexedDB jika konfigurasi tidak valid", async () => {
    await useWorkspaceStore.getState().bootWorkspace()

    const saveSpy = vi.spyOn(workspaceRepo, "saveWorkspaceAndDayConfigs")

    const ok = await useWorkspaceStore.getState().updateDayConfig("monday", {
      startTime: "15:00",
      endTime: "08:00",
    })

    expect(ok).toBe(false)
    expect(saveSpy).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().configValidation.isValid).toBe(false)
  })

  it("AC-FR01-05: menampilkan saveStatus === 'error' saat IndexedDB gagal dan memulihkan lewat retrySaveWorkspaceSettings()", async () => {
    await useWorkspaceStore.getState().bootWorkspace()

    const saveSpy = vi
      .spyOn(workspaceRepo, "saveWorkspaceAndDayConfigs")
      .mockRejectedValueOnce(new Error("QuotaExceededError"))

    const ok = await useWorkspaceStore.getState().updateWorkspaceIdentity({
      name: "SMK Negeri 5 Teknologi",
    })

    expect(ok).toBe(false)
    expect(useWorkspaceStore.getState().saveStatus).toBe("error")
    expect(useWorkspaceStore.getState().saveErrorMessage).toBeTruthy()

    saveSpy.mockRestore()

    const retryOk = await useWorkspaceStore
      .getState()
      .retrySaveWorkspaceSettings()
    expect(retryOk).toBe(true)
    expect(useWorkspaceStore.getState().saveStatus).toBe("saved")
    expect(useWorkspaceStore.getState().saveErrorMessage).toBeNull()
  })
})
