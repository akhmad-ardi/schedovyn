import { beforeAll, describe, expect, it } from "vitest"
import type {
  ClassGroup,
  DayScheduleConfig,
  Room,
  Subject,
  Teacher,
  TimetableSession,
  Workspace,
} from "@/domain/types/entities"
import type { ScheduleConflict } from "@/domain/types/validation"
import type * as ExportDataMapperModule from "@/services/export/export-data-mapper"

describe("QA-01 & FR-08: Pure Data Mapper (export-data-mapper)", () => {
  let mapper: typeof ExportDataMapperModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/services/export/export-data-mapper"
      mapper = await import(/* @vite-ignore */ modulePath)
    } catch {
      mapper = null
    }
  })

  const workspace: Workspace = {
    id: "ws-1",
    name: "SMP Negeri 1 Nusantara",
    academicPeriod: "Semester Ganjil 2026/2027",
    activeClassId: "cls-7a",
    defaultSnapIntervalMinutes: 15,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  }

  const class7A: ClassGroup = {
    id: "cls-7a",
    workspaceId: "ws-1",
    name: "VII-A",
    grade: "VII",
  }

  const class7B: ClassGroup = {
    id: "cls-7b",
    workspaceId: "ws-1",
    name: "VII-B",
    grade: "VII",
  }

  const subjects: Subject[] = [
    { id: "sub-math", workspaceId: "ws-1", name: "Matematika", colorKey: "blue" },
    { id: "sub-eng", workspaceId: "ws-1", name: "Bahasa Inggris", colorKey: "emerald" },
  ]

  const teachers: Teacher[] = [
    { id: "tch-1", workspaceId: "ws-1", name: "Budi Santoso", unavailableIntervals: [] },
    { id: "tch-2", workspaceId: "ws-1", name: "Siti Rahma", unavailableIntervals: [] },
  ]

  const rooms: Room[] = [
    { id: "rm-1", workspaceId: "ws-1", name: "Lab IPA", type: "laboratory", unavailableIntervals: [] },
    { id: "rm-2", workspaceId: "ws-1", name: "Ruang 101", type: "classroom", unavailableIntervals: [] },
  ]

  const dayConfigs: DayScheduleConfig[] = [
    {
      id: "dc-mon",
      workspaceId: "ws-1",
      dayOfWeek: "monday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "dc-tue",
      workspaceId: "ws-1",
      dayOfWeek: "tuesday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
  ]

  const sessions7A: TimetableSession[] = [
    // Sesi 1: Senin 07:30 - 08:15 (Matematika, Budi, Ruang 101) - Berkonflik
    {
      id: "ses-1",
      workspaceId: "ws-1",
      requirementId: "req-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      teacherId: "tch-1",
      roomId: "rm-2",
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      durationMinutes: 45,
    },
    // Sesi 2: Senin 08:15 - 09:45 (Bahasa Inggris, Siti, Lab IPA) - Normal
    {
      id: "ses-2",
      workspaceId: "ws-1",
      requirementId: "req-2",
      classId: "cls-7a",
      subjectId: "sub-eng",
      teacherId: "tch-2",
      roomId: "rm-1",
      dayOfWeek: "monday",
      startTime: "08:15",
      endTime: "09:45",
      durationMinutes: 90,
    },
    // Sesi 3: Selasa 07:30 - 08:15 (Matematika, tanpa guru dan tanpa ruangan) - Normal
    {
      id: "ses-3",
      workspaceId: "ws-1",
      requirementId: "req-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      teacherId: null,
      roomId: null,
      dayOfWeek: "tuesday",
      startTime: "07:30",
      endTime: "08:15",
      durationMinutes: 45,
    },
  ]

  const session7BOther: TimetableSession = {
    id: "ses-7b-1",
    workspaceId: "ws-1",
    requirementId: "req-7b-1",
    classId: "cls-7b",
    subjectId: "sub-math",
    teacherId: "tch-1",
    roomId: null,
    dayOfWeek: "monday",
    startTime: "07:30",
    endTime: "08:15",
    durationMinutes: 45,
  }

  const conflicts: ScheduleConflict[] = [
    {
      id: "TEACHER_OVERLAP::ses-1::ses-7b-1",
      conflictType: "TEACHER_OVERLAP",
      severity: "error",
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      affectedSessionIds: ["ses-1", "ses-7b-1"],
      affectedClassIds: ["cls-7a", "cls-7b"],
      teacherId: "tch-1",
      title: "Bentrokan Jadwal Guru",
      description: "Guru Budi Santoso dijadwalkan mengajar pada waktu yang sama di kelas VII-A dan VII-B.",
    },
  ]

  it("1. memetakan sesi kelas ke baris tabel kronologis berdasarkan hari dan waktu mulai", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    const payload = mapper.mapClassScheduleForExport({
      classGroup: class7A,
      workspace,
      dayConfigs,
      sessions: [...sessions7A, session7BOther],
      subjects,
      teachers,
      rooms,
      conflicts: [],
    })

    expect(payload.classGroup.id).toBe("cls-7a")
    expect(payload.workspace.name).toBe("SMP Negeri 1 Nusantara")
    // Sesi kelas 7B tidak boleh masuk (isolasi kelas)
    expect(payload.rows).toHaveLength(3)

    // Urutan kronologis:
    // Baris 1: Senin 07:30 (Matematika)
    // Baris 2: Senin 08:15 (Bahasa Inggris)
    // Baris 3: Selasa 07:30 (Matematika)
    expect(payload.rows[0].dayOfWeek).toBe("monday")
    expect(payload.rows[0].startTime).toBe("07:30")
    expect(payload.rows[1].dayOfWeek).toBe("monday")
    expect(payload.rows[1].startTime).toBe("08:15")
    expect(payload.rows[2].dayOfWeek).toBe("tuesday")
    expect(payload.rows[2].startTime).toBe("07:30")
  })

  it("2. memformat rentang waktu 24 jam dan durasi menit secara tepat", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    const payload = mapper.mapClassScheduleForExport({
      classGroup: class7A,
      workspace,
      dayConfigs,
      sessions: sessions7A,
      subjects,
      teachers,
      rooms,
      conflicts: [],
    })

    const row1 = payload.rows[0]
    expect(row1.timeRange).toBe("07:30 - 08:15")
    expect(row1.durationMinutes).toBe(45)

    const row2 = payload.rows[1]
    expect(row2.timeRange).toBe("08:15 - 09:45")
    expect(row2.durationMinutes).toBe(90)
  })

  it("3. menangani guru dan ruangan kosong menjadi tanda strip '-' (AC-FR08-05)", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    const payload = mapper.mapClassScheduleForExport({
      classGroup: class7A,
      workspace,
      dayConfigs,
      sessions: sessions7A,
      subjects,
      teachers,
      rooms,
      conflicts: [],
    })

    // Sesi 1: Lengkap
    expect(payload.rows[0].teacherName).toBe("Budi Santoso")
    expect(payload.rows[0].roomName).toBe("Ruang 101")

    // Sesi 3: Guru dan ruangan null -> wajib "-"
    expect(payload.rows[2].teacherName).toBe("-")
    expect(payload.rows[2].roomName).toBe("-")
  })

  it("4. menandai hasConflict true, lencana [KONFLIK], dan catatan pada sesi berbentrokan (AC-11 & FR-08.5)", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    const payload = mapper.mapClassScheduleForExport({
      classGroup: class7A,
      workspace,
      dayConfigs,
      sessions: sessions7A,
      subjects,
      teachers,
      rooms,
      conflicts,
    })

    expect(payload.hasConflicts).toBe(true)

    // Sesi 1 terlibat konflik guru
    const row1 = payload.rows[0]
    expect(row1.hasConflict).toBe(true)
    expect(row1.conflictBadges).toContain("[KONFLIK]")
    expect(row1.conflictNotes).toContain("Budi Santoso")

    // Sesi 2 tidak berkonflik
    const row2 = payload.rows[1]
    expect(row2.hasConflict).toBe(false)
    expect(row2.conflictBadges).toEqual([])
    expect(row2.conflictNotes).toBe("")
  })

  it("5. menyusun daftar lampiran rincian konflik (conflictAppendix) yang relevan untuk kelas aktif", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    const payload = mapper.mapClassScheduleForExport({
      classGroup: class7A,
      workspace,
      dayConfigs,
      sessions: sessions7A,
      subjects,
      teachers,
      rooms,
      conflicts,
    })

    expect(payload.conflictAppendix).toHaveLength(1)
    const appendixItem = payload.conflictAppendix[0]
    expect(appendixItem.title).toBe("Bentrokan Jadwal Guru")
    expect(appendixItem.description).toContain("VII-B")
    expect(appendixItem.dayLabel).toBe("Senin")
    expect(appendixItem.timeRange).toBe("07:30 - 08:15")
  })

  it("6. memetakan seluruh kelas ruang kerja secara alfabetis dengan isolasi sesi per kelas", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    // Input urutan acak: VII-B lalu VII-A
    const payloads = mapper.mapWorkspaceScheduleForExport({
      classes: [class7B, class7A],
      workspace,
      dayConfigs,
      sessions: [...sessions7A, session7BOther],
      subjects,
      teachers,
      rooms,
      conflicts,
    })

    expect(payloads).toHaveLength(2)
    // Urutan wajib alfabetis nama kelas: VII-A lalu VII-B
    expect(payloads[0].classGroup.name).toBe("VII-A")
    expect(payloads[0].rows).toHaveLength(3)

    expect(payloads[1].classGroup.name).toBe("VII-B")
    expect(payloads[1].rows).toHaveLength(1)
    expect(payloads[1].rows[0].sessionId).toBe("ses-7b-1")
  })

  it("7. membersihkan karakter ilegal dan memformat nama berkas PDF (formatPdfDownloadFileName & AC-FR08-06)", () => {
    expect(mapper).not.toBeNull()
    if (!mapper) return

    // Satu kelas normal
    const singleClassFile = mapper.formatPdfDownloadFileName(
      "ACTIVE_CLASS",
      "SMP Negeri 1 Nusantara",
      "VII-A"
    )
    expect(singleClassFile).toBe("Jadwal_SMP_Negeri_1_Nusantara_Kelas_VII-A.pdf")

    // Seluruh kelas
    const allClassFile = mapper.formatPdfDownloadFileName(
      "ENTIRE_WORKSPACE",
      "SMP Negeri 1 Nusantara"
    )
    expect(allClassFile).toBe("Jadwal_SMP_Negeri_1_Nusantara_Semua_Kelas.pdf")

    // Karakter ilegal pada nama sekolah atau kelas (/, \, :, *, ?, ", <, >, |)
    const dirtyFile = mapper.formatPdfDownloadFileName(
      "ACTIVE_CLASS",
      "SMPN 1 / Rujukan: Unggulan *",
      "VII/A?"
    )
    expect(dirtyFile).not.toMatch(/[/\\:*?"<>|]/)
    expect(dirtyFile.endsWith(".pdf")).toBe(true)
  })
})
