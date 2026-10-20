import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/db/database"
import * as workspaceRepo from "@/db/workspace-repository"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("FR-02, FR-10, AC-12: Master Data Store Actions & Local Persistence", () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
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
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })
    await useWorkspaceStore.getState().bootWorkspace()
  })

  it("AC-FR02-01 & AC-12: menambah, mengubah, dan memulihkan kelima entitas Data Master dari IndexedDB", async () => {
    const clsRes = await useWorkspaceStore.getState().createClassGroup({
      name: "VII-A",
      grade: "VII",
      notes: "Gedung Timur",
    })
    expect(clsRes.ok).toBe(true)
    expect(clsRes.data?.name).toBe("VII-A")

    const subRes = await useWorkspaceStore.getState().createSubject({
      name: "Matematika",
      colorKey: "blue",
      notes: "Wajib",
    })
    expect(subRes.ok).toBe(true)

    const tchRes = await useWorkspaceStore.getState().createTeacher({
      name: "Budi Santoso",
      unavailableIntervals: [
        {
          id: "unv-1",
          dayOfWeek: "friday",
          startTime: "13:00",
          endTime: "15:00",
          label: "Rapat MGMP",
        },
      ],
    })
    expect(tchRes.ok).toBe(true)

    const rmRes = await useWorkspaceStore.getState().createRoom({
      name: "Lab IPA 1",
      type: "laboratory",
      unavailableIntervals: [],
    })
    expect(rmRes.ok).toBe(true)

    const reqRes = await useWorkspaceStore
      .getState()
      .createTeachingRequirement({
        classId: clsRes.data!.id,
        subjectId: subRes.data!.id,
        defaultTeacherId: tchRes.data!.id,
        defaultRoomId: rmRes.data!.id,
        sessionsPerWeek: 3,
        durationMinutes: 90,
        roomRequired: true,
      })
    expect(reqRes.ok).toBe(true)
    expect(useWorkspaceStore.getState().saveStatus).toBe("saved")

    // Uji update entitas
    const updCls = await useWorkspaceStore
      .getState()
      .updateClassGroup(clsRes.data!.id, {
        name: "VII-A Unggulan",
        grade: "VII",
      })
    expect(updCls.ok).toBe(true)

    // Simulasi muat ulang browser: kosongkan state di memori lalu bootWorkspace()
    useWorkspaceStore.setState({
      isHydrated: false,
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
    const state = useWorkspaceStore.getState()

    expect(state.classes).toHaveLength(1)
    expect(state.classes[0].name).toBe("VII-A Unggulan")
    expect(state.subjects).toHaveLength(1)
    expect(state.subjects[0].name).toBe("Matematika")
    expect(state.teachers).toHaveLength(1)
    expect(state.teachers[0].unavailableIntervals).toHaveLength(1)
    expect(state.rooms).toHaveLength(1)
    expect(state.rooms[0].name).toBe("Lab IPA 1")
    expect(state.requirements).toHaveLength(1)
    expect(state.requirements[0].sessionsPerWeek).toBe(3)
    expect(state.requirements[0].durationMinutes).toBe(90)
  })

  it("AC-FR02-04 & AC-FR02-05: menjaga integritas referensial di state store saat menghapus Guru, Ruangan, Mapel, dan Kelas", async () => {
    const cls = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VII-A", grade: "VII" })
    ).data!
    const sub = (
      await useWorkspaceStore
        .getState()
        .createSubject({ name: "IPA", colorKey: "emerald" })
    ).data!
    const tch = (
      await useWorkspaceStore
        .getState()
        .createTeacher({ name: "Ibu Ratna", unavailableIntervals: [] })
    ).data!
    const rm = (
      await useWorkspaceStore
        .getState()
        .createRoom({ name: "Lab Biologi", type: "laboratory" })
    ).data!

    await useWorkspaceStore.getState().createTeachingRequirement({
      classId: cls.id,
      subjectId: sub.id,
      defaultTeacherId: tch.id,
      defaultRoomId: rm.id,
      sessionsPerWeek: 2,
      durationMinutes: 90,
      roomRequired: true,
    })

    // Hapus Guru & Ruangan -> defaultTeacherId dan defaultRoomId menjadi null
    await useWorkspaceStore.getState().deleteTeacher(tch.id)
    await useWorkspaceStore.getState().deleteRoom(rm.id)

    expect(useWorkspaceStore.getState().teachers).toHaveLength(0)
    expect(useWorkspaceStore.getState().rooms).toHaveLength(0)
    expect(
      useWorkspaceStore.getState().requirements[0].defaultTeacherId
    ).toBeNull()
    expect(
      useWorkspaceStore.getState().requirements[0].defaultRoomId
    ).toBeNull()

    // Hapus Mapel tanpa cascade -> butuh konfirmasi
    const delSubBlocked = await useWorkspaceStore
      .getState()
      .deleteSubject(sub.id)
    expect(delSubBlocked.ok).toBe(false)
    expect(delSubBlocked.requiresConfirmation).toBe(true)
    expect(useWorkspaceStore.getState().subjects).toHaveLength(1)

    // Hapus Kelas -> menghapus requirement milik kelas tersebut
    await useWorkspaceStore.getState().deleteClassGroup(cls.id)
    expect(useWorkspaceStore.getState().classes).toHaveLength(0)
    expect(useWorkspaceStore.getState().requirements).toHaveLength(0)
  })

  it("AC-FR02-06: menyetel saveStatus === 'error' apabila penyimpanan IndexedDB gagal saat membuat data master", async () => {
    vi.spyOn(workspaceRepo, "saveClassGroup").mockRejectedValueOnce(
      new Error("QuotaExceededError")
    )

    const outcome = await useWorkspaceStore.getState().createClassGroup({
      name: "IX-A",
      grade: "IX",
    })

    expect(outcome.ok).toBe(false)
    expect(useWorkspaceStore.getState().saveStatus).toBe("error")
    expect(useWorkspaceStore.getState().saveErrorMessage).toBeTruthy()
  })
})
