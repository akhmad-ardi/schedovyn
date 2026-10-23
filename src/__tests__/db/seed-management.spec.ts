import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/db/database"
import {
  applyFullDefaultSeed,
  clearAllSeedData,
} from "@/db/workspace-repository"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("Seed Management & Full Dummy Data (Repository & Store)", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it("applyFullDefaultSeed mengisi 8 stores IndexedDB dengan lengkap dan realistis", async () => {
    const bundle = await applyFullDefaultSeed(db)

    expect(bundle.workspace.name).toBe("SMP Negeri 1 Nusantara")
    expect(bundle.workspace.activeClassId).toBe("seed-cls-7a")
    expect(bundle.dayConfigs).toHaveLength(7)
    expect(bundle.classes).toHaveLength(6)
    expect(bundle.subjects).toHaveLength(10)
    expect(bundle.teachers).toHaveLength(10)
    expect(bundle.rooms).toHaveLength(10)
    expect(bundle.requirements.length).toBeGreaterThan(10)
    expect(bundle.sessions.length).toBeGreaterThan(15)

    // Periksa bahwa data benar-benar tersimpan di IndexedDB
    const classesInDb = await db.classes.toArray()
    const teachersInDb = await db.teachers.toArray()
    const subjectsInDb = await db.subjects.toArray()
    const roomsInDb = await db.rooms.toArray()
    const requirementsInDb = await db.requirements.toArray()
    const sessionsInDb = await db.sessions.toArray()

    expect(classesInDb).toHaveLength(6)
    expect(teachersInDb).toHaveLength(10)
    expect(subjectsInDb).toHaveLength(10)
    expect(roomsInDb).toHaveLength(10)
    expect(requirementsInDb.length).toBe(bundle.requirements.length)
    expect(sessionsInDb.length).toBe(bundle.sessions.length)
  })

  it("clearAllSeedData mengosongkan seluruh master data dan sesi namun mempertahankan konfigurasi hari", async () => {
    // 1. Terapkan seed terlebih dahulu
    await applyFullDefaultSeed(db)

    // 2. Kosongkan semua seed
    const cleared = await clearAllSeedData(db)

    expect(cleared.workspace.name).toBe("SMP Negeri 1 Nusantara")
    expect(cleared.workspace.activeClassId).toBeNull()
    expect(cleared.dayConfigs).toHaveLength(7)
    expect(cleared.classes).toHaveLength(0)
    expect(cleared.subjects).toHaveLength(0)
    expect(cleared.teachers).toHaveLength(0)
    expect(cleared.rooms).toHaveLength(0)
    expect(cleared.requirements).toHaveLength(0)
    expect(cleared.sessions).toHaveLength(0)

    // Periksa tabel di IndexedDB
    expect(await db.classes.count()).toBe(0)
    expect(await db.subjects.count()).toBe(0)
    expect(await db.teachers.count()).toBe(0)
    expect(await db.rooms.count()).toBe(0)
    expect(await db.requirements.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.dayConfigs.count()).toBe(7)
  })

  it("useWorkspaceStore.applyFullDefaultSeed dan clearAllSeedData memperbarui state store dan persistensi", async () => {
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
    })

    await useWorkspaceStore.getState().bootWorkspace()

    // Panggil action applyFullDefaultSeed
    const seedOk = await useWorkspaceStore.getState().applyFullDefaultSeed()
    expect(seedOk).toBe(true)

    const state = useWorkspaceStore.getState()
    expect(state.classes).toHaveLength(6)
    expect(state.teachers).toHaveLength(10)
    expect(state.subjects).toHaveLength(10)
    expect(state.rooms).toHaveLength(10)
    expect(state.sessions.length).toBeGreaterThan(15)
    expect(state.workspace?.activeClassId).toBe("seed-cls-7a")
    expect(state.saveStatus).toBe("saved")

    // Panggil action clearAllSeedData
    const clearOk = await useWorkspaceStore.getState().clearAllSeedData()
    expect(clearOk).toBe(true)

    const clearedState = useWorkspaceStore.getState()
    expect(clearedState.classes).toHaveLength(0)
    expect(clearedState.teachers).toHaveLength(0)
    expect(clearedState.subjects).toHaveLength(0)
    expect(clearedState.rooms).toHaveLength(0)
    expect(clearedState.requirements).toHaveLength(0)
    expect(clearedState.sessions).toHaveLength(0)
    expect(clearedState.workspace?.activeClassId).toBeNull()
    expect(clearedState.saveStatus).toBe("saved")
  })
})
