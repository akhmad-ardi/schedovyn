import { beforeEach, describe, expect, it } from "vitest"
import { SchedovynDatabase } from "@/db/database"
import {
  loadOrSeedWorkspace,
  saveWorkspaceAndDayConfigs,
} from "@/db/workspace-repository"
import { ORDERED_DAYS_OF_WEEK } from "@/domain/types/entities"

describe("FR-01 & AC-12: Workspace Repository & IndexedDB Persistence", () => {
  let testDb: SchedovynDatabase

  beforeEach(async () => {
    testDb = new SchedovynDatabase()
    await testDb.delete()
    await testDb.open()
  })

  it("AC-FR01-01: membuat seed default saat database kosong dan mengembalikan 7 dayConfigs berurutan", async () => {
    const { workspace, dayConfigs } = await loadOrSeedWorkspace(testDb)

    expect(workspace.name).toBe("SMP Negeri 1 Nusantara")
    expect(workspace.academicPeriod).toBe("Semester Ganjil 2026/2027")
    expect(workspace.defaultSnapIntervalMinutes).toBe(15)
    expect(workspace.activeClassId).toBeNull()

    expect(dayConfigs).toHaveLength(7)
    expect(dayConfigs.map((d) => d.dayOfWeek)).toEqual(ORDERED_DAYS_OF_WEEK)

    const monday = dayConfigs.find((d) => d.dayOfWeek === "monday")
    const friday = dayConfigs.find((d) => d.dayOfWeek === "friday")
    const saturday = dayConfigs.find((d) => d.dayOfWeek === "saturday")
    const sunday = dayConfigs.find((d) => d.dayOfWeek === "sunday")

    expect(monday?.isSchoolDay).toBe(true)
    expect(monday?.startTime).toBe("07:00")
    expect(monday?.endTime).toBe("15:00")
    expect(monday?.breakIntervals).toHaveLength(2)

    expect(friday?.isSchoolDay).toBe(true)
    expect(friday?.startTime).toBe("07:00")
    expect(friday?.endTime).toBe("11:30")
    expect(friday?.breakIntervals).toHaveLength(1)

    expect(saturday?.isSchoolDay).toBe(false)
    expect(sunday?.isSchoolDay).toBe(false)
  })

  it("AC-12: menyimpan perubahan workspace dan dayConfigs secara atomik serta memulihkannya kembali", async () => {
    const initial = await loadOrSeedWorkspace(testDb)

    const updatedWorkspace = {
      ...initial.workspace,
      name: "SMA Negeri 2 Merdeka",
      academicPeriod: "Semester Genap 2026/2027",
      defaultSnapIntervalMinutes: 30 as const,
    }

    const updatedDayConfigs = initial.dayConfigs.map((day) =>
      day.dayOfWeek === "saturday"
        ? {
            ...day,
            isSchoolDay: true,
            startTime: "07:00" as const,
            endTime: "12:00" as const,
            snapIntervalMinutes: 30 as const,
          }
        : day
    )

    await saveWorkspaceAndDayConfigs(
      updatedWorkspace,
      updatedDayConfigs,
      testDb
    )

    const reloaded = await loadOrSeedWorkspace(testDb)
    expect(reloaded.workspace.name).toBe("SMA Negeri 2 Merdeka")
    expect(reloaded.workspace.academicPeriod).toBe("Semester Genap 2026/2027")
    expect(reloaded.workspace.defaultSnapIntervalMinutes).toBe(30)

    const reloadedSaturday = reloaded.dayConfigs.find(
      (d) => d.dayOfWeek === "saturday"
    )
    expect(reloadedSaturday?.isSchoolDay).toBe(true)
    expect(reloadedSaturday?.startTime).toBe("07:00")
    expect(reloadedSaturday?.endTime).toBe("12:00")
    expect(reloadedSaturday?.snapIntervalMinutes).toBe(30)
  })
})
