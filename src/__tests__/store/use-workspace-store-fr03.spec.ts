import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/db/database"
import * as workspaceRepo from "@/db/workspace-repository"
import {
  getActiveClassRequirements,
  getActiveClassSessions,
} from "@/domain/timetable/active-class-context"
import { useWorkspaceStore } from "@/store/use-workspace-store"

describe("FR-03, AC-01, AC-12: Pemilihan Kelas Aktif & Isolasi Jadwal Antar-Kelas", () => {
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

  it("AC-01 & AC-FR03-01 & AC-FR03-02: berpindah kelas aktif menampilkan jadwal kelas tersebut tanpa mengubah jadwal kelas lain ataupun konfigurasi ruang kerja", async () => {
    const cls7a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VII-A", grade: "VII" })
    ).data!
    const cls8a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VIII-A", grade: "VIII" })
    ).data!
    const subMath = (
      await useWorkspaceStore
        .getState()
        .createSubject({ name: "Matematika", colorKey: "blue" })
    ).data!
    const subIpa = (
      await useWorkspaceStore
        .getState()
        .createSubject({ name: "IPA", colorKey: "emerald" })
    ).data!

    const req7a = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls7a.id,
        subjectId: subMath.id,
        defaultTeacherId: null,
        defaultRoomId: null,
        sessionsPerWeek: 2,
        durationMinutes: 90,
        roomRequired: false,
      })
    ).data!

    const req8a = (
      await useWorkspaceStore.getState().createTeachingRequirement({
        classId: cls8a.id,
        subjectId: subIpa.id,
        defaultTeacherId: null,
        defaultRoomId: null,
        sessionsPerWeek: 3,
        durationMinutes: 45,
        roomRequired: false,
      })
    ).data!

    const workspaceId = useWorkspaceStore.getState().workspace!.id
    const session7a = {
      id: "ses-7a-mon",
      workspaceId,
      requirementId: req7a.id,
      classId: cls7a.id,
      subjectId: subMath.id,
      teacherId: null,
      roomId: null,
      dayOfWeek: "monday" as const,
      startTime: "07:00" as const,
      endTime: "08:30" as const,
      durationMinutes: 90,
    }
    const session8a = {
      id: "ses-8a-tue",
      workspaceId,
      requirementId: req8a.id,
      classId: cls8a.id,
      subjectId: subIpa.id,
      teacherId: null,
      roomId: null,
      dayOfWeek: "tuesday" as const,
      startTime: "09:00" as const,
      endTime: "09:45" as const,
      durationMinutes: 45,
    }

    await db.sessions.bulkPut([session7a, session8a])
    useWorkspaceStore.setState({ sessions: [session7a, session8a] })

    const dayConfigsBeforeSwitch = structuredClone(
      useWorkspaceStore.getState().dayConfigs
    )

    // Pilih VII-A
    const ok7a = await useWorkspaceStore.getState().setActiveClass(cls7a.id)
    expect(ok7a).toBe(true)
    expect(useWorkspaceStore.getState().workspace?.activeClassId).toBe(cls7a.id)

    expect(
      getActiveClassSessions(
        useWorkspaceStore.getState().sessions,
        useWorkspaceStore.getState().workspace?.activeClassId ?? null
      ).map((s) => s.id)
    ).toEqual(["ses-7a-mon"])

    // Pindah ke VIII-A
    const ok8a = await useWorkspaceStore.getState().setActiveClass(cls8a.id)
    expect(ok8a).toBe(true)
    expect(useWorkspaceStore.getState().workspace?.activeClassId).toBe(cls8a.id)

    expect(
      getActiveClassRequirements(
        useWorkspaceStore.getState().requirements,
        useWorkspaceStore.getState().workspace?.activeClassId ?? null
      ).map((r) => r.id)
    ).toEqual([req8a.id])
    expect(
      getActiveClassSessions(
        useWorkspaceStore.getState().sessions,
        useWorkspaceStore.getState().workspace?.activeClassId ?? null
      ).map((s) => s.id)
    ).toEqual(["ses-8a-tue"])

    // Pastikan sesi VII-A dan dayConfigs di ruang kerja tetap utuh (FR-03.4, FR-03.5, FR-03.6)
    expect(useWorkspaceStore.getState().sessions).toHaveLength(2)
    expect(
      useWorkspaceStore
        .getState()
        .sessions.find((s) => s.id === "ses-7a-mon")
    ).toEqual(session7a)
    expect(useWorkspaceStore.getState().dayConfigs).toEqual(
      dayConfigsBeforeSwitch
    )

    // AC-FR03-03 & AC-12: Simulasikan muat ulang browser dan pastikan activeClassId pulih ke VIII-A
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
    expect(useWorkspaceStore.getState().workspace?.activeClassId).toBe(cls8a.id)
    expect(useWorkspaceStore.getState().sessions).toHaveLength(2)
  })

  it("AC-FR03-05: menolak setActiveClass untuk ID kelas yang tidak terdaftar tanpa mengubah activeClassId", async () => {
    const cls7a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VII-A", grade: "VII" })
    ).data!

    const ok = await useWorkspaceStore
      .getState()
      .setActiveClass("id-kelas-tidak-ada")

    expect(ok).toBe(false)
    expect(useWorkspaceStore.getState().workspace?.activeClassId).toBe(cls7a.id)
  })

  it("AC-FR03-05 & FR-10: menyetel saveStatus === 'error' saat setActiveClassInWorkspace gagal menulis ke IndexedDB", async () => {
    const cls7a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VII-A", grade: "VII" })
    ).data!
    const cls8a = (
      await useWorkspaceStore
        .getState()
        .createClassGroup({ name: "VIII-A", grade: "VIII" })
    ).data!

    expect(cls7a.id).toBeTruthy()

    vi.spyOn(workspaceRepo, "setActiveClassInWorkspace").mockRejectedValueOnce(
      new Error("QuotaExceededError")
    )

    const ok = await useWorkspaceStore.getState().setActiveClass(cls8a.id)
    expect(ok).toBe(false)
    expect(useWorkspaceStore.getState().saveStatus).toBe("error")
    expect(useWorkspaceStore.getState().saveErrorMessage).toBeTruthy()
  })
})
