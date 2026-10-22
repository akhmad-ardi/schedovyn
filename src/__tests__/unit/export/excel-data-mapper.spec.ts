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
import type {
  ScheduleConflict,
  ScopeValidationSummary,
} from "@/domain/types/validation"
import type * as ExcelDataMapperModule from "@/services/export/excel-data-mapper"

describe("QA-01 & FR-09: Pure Excel Data Mapper & Sanitizer (excel-data-mapper)", () => {
  let mapper: typeof ExcelDataMapperModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/services/export/excel-data-mapper"
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
    { id: "sub-malicious", workspaceId: "ws-1", name: "=CMD|' /C calc'!A0", colorKey: "rose" },
  ]

  const teachers: Teacher[] = [
    { id: "tch-1", workspaceId: "ws-1", name: "Budi Santoso", unavailableIntervals: [] },
    { id: "tch-2", workspaceId: "ws-1", name: "+628123456789 (Siti)", unavailableIntervals: [] },
  ]

  const rooms: Room[] = [
    { id: "rm-1", workspaceId: "ws-1", name: "Lab Komputer", type: "laboratory", unavailableIntervals: [] },
    { id: "rm-2", workspaceId: "ws-1", name: "-Ruang Teori 1", type: "classroom", unavailableIntervals: [] },
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

  const sessions: TimetableSession[] = [
    // Sesi 1: VII-A, Senin 07:30-08:15, Matematika, Budi, Lab Komputer (Konflik Guru)
    {
      id: "ses-1",
      workspaceId: "ws-1",
      requirementId: "req-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      teacherId: "tch-1",
      roomId: "rm-1",
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      durationMinutes: 45,
    },
    // Sesi 2: VII-B, Senin 07:30-08:15, Matematika, Budi, tanpa ruangan (Konflik Guru dengan Sesi 1)
    {
      id: "ses-2",
      workspaceId: "ws-1",
      requirementId: "req-2",
      classId: "cls-7b",
      subjectId: "sub-math",
      teacherId: "tch-1",
      roomId: null,
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      durationMinutes: 45,
    },
    // Sesi 3: VII-A, Selasa 08:00-09:30, Bahasa Inggris, Siti (+awalan formula), Ruang Teori (-awalan formula)
    {
      id: "ses-3",
      workspaceId: "ws-1",
      requirementId: "req-3",
      classId: "cls-7a",
      subjectId: "sub-eng",
      teacherId: "tch-2",
      roomId: "rm-2",
      dayOfWeek: "tuesday",
      startTime: "08:00",
      endTime: "09:30",
      durationMinutes: 90,
    },
    // Sesi 4: VII-A, Selasa 10:00-10:45, Tanpa guru, Tanpa ruangan
    {
      id: "ses-4",
      workspaceId: "ws-1",
      requirementId: "req-4",
      classId: "cls-7a",
      subjectId: "sub-math",
      teacherId: null,
      roomId: null,
      dayOfWeek: "tuesday",
      startTime: "10:00",
      endTime: "10:45",
      durationMinutes: 45,
    },
  ]

  const conflicts: ScheduleConflict[] = [
    {
      id: "TEACHER_OVERLAP::ses-1::ses-2",
      conflictType: "TEACHER_OVERLAP",
      severity: "error",
      title: "Bentrokan Jadwal Guru",
      description:
        "Guru Budi Santoso dijadwalkan mengajar di lebih dari satu kelas pada waktu yang sama.",
      affectedSessionIds: ["ses-1", "ses-2"],
      dayOfWeek: "monday",
      startTime: "07:30",
      endTime: "08:15",
      affectedClassIds: ["cls-7a", "cls-7b"],
      teacherId: "tch-1",
    },
  ]

  const validationSummary: ScopeValidationSummary = {
    status: "CONFLICT_DETECTED",
    statusLabel: "Konflik Terdeteksi",
    scheduledSessionsCount: 4,
    unscheduledSessionsCount: 1,
    activeConflictsCount: 1,
    completenessWarningsCount: 1,
    conflicts,
    warnings: [
      {
        id: "UNFULFILLED_REQUIREMENT::cls-7a::req-4",
        warningType: "UNFULFILLED_REQUIREMENT",
        severity: "warning",
        classId: "cls-7a",
        title: "Kebutuhan Sesi Belum Terpenuhi",
        description:
          "Terdapat 1 alokasi sesi pembelajaran yang belum terjadwal.",
      },
    ],
  }

  describe("1. sanitizeSpreadsheetText (Formula Injection Prevention - FR-09.3 & AC-04)", () => {
    it("menambahkan tanda kutip tunggal (') pada teks yang diawali karakter '=', '+', '-', '@', '\\t', atau '\\r'", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      // Formula injection biasa
      expect(mapper.sanitizeSpreadsheetText("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)")
      expect(mapper.sanitizeSpreadsheetText("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0")

      // Awalan tanda tambah dan kurang
      expect(mapper.sanitizeSpreadsheetText("+628123456789")).toBe("'+628123456789")
      expect(mapper.sanitizeSpreadsheetText("-100 Diskon")).toBe("'-100 Diskon")

      // Awalan at (@)
      expect(mapper.sanitizeSpreadsheetText("@mentionAdmin")).toBe("'@mentionAdmin")

      // Awalan tab dan carriage return
      expect(mapper.sanitizeSpreadsheetText("\tHiddenTab")).toBe("'\tHiddenTab")
      expect(mapper.sanitizeSpreadsheetText("\rCarriageReturn")).toBe("'\rCarriageReturn")
    })

    it("tidak memodifikasi teks normal yang tidak diawali karakter formula", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      expect(mapper.sanitizeSpreadsheetText("Matematika")).toBe("Matematika")
      expect(mapper.sanitizeSpreadsheetText("Budi Santoso, S.Pd.")).toBe("Budi Santoso, S.Pd.")
      expect(mapper.sanitizeSpreadsheetText("Ruang 101")).toBe("Ruang 101")
      expect(mapper.sanitizeSpreadsheetText("12:00")).toBe("12:00")
    })

    it("mengembalikan string kosong untuk null, undefined, atau string kosong murni", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      expect(mapper.sanitizeSpreadsheetText(null)).toBe("")
      expect(mapper.sanitizeSpreadsheetText(undefined)).toBe("")
      expect(mapper.sanitizeSpreadsheetText("")).toBe("")
    })
  })

  describe("2. mapExcelScheduleRows (AC-10, FR-09 Kolom & Format)", () => {
    it("memetakan seluruh kolom wajib dengan format 24 jam dan durasi numerik murni", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const rows = mapper.mapExcelScheduleRows({
        sessions,
        classes: [class7A, class7B],
        subjects,
        teachers,
        rooms,
        conflicts,
        filterClassId: null,
      })

      expect(rows.length).toBe(4)

      const row1 = rows[0]
      expect(row1).toBeDefined()
      expect(row1.hari).toBe("Senin")
      expect(row1.waktuMulai).toBe("07:30")
      expect(row1.waktuSelesai).toBe("08:15")
      expect(typeof row1.durasiMenit).toBe("number")
      expect(row1.durasiMenit).toBe(45)
      expect(row1.kelas).toBe("VII-A")
      expect(row1.tingkat).toBe("VII")
      expect(row1.mataPelajaran).toBe("Matematika")
      expect(row1.guru).toBe("Budi Santoso")
      expect(row1.ruangan).toBe("Lab Komputer")
      // Sesi 1 berkonflik
      expect(row1.statusValidasi).toMatch(/konflik|bentrok/i)
    })

    it("menyaring sesi hanya untuk kelas aktif jika filterClassId ditentukan", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const rows7A = mapper.mapExcelScheduleRows({
        sessions,
        classes: [class7A, class7B],
        subjects,
        teachers,
        rooms,
        conflicts,
        filterClassId: "cls-7a",
      })

      // Sesi VII-A ada 3
      expect(rows7A.length).toBe(3)
      expect(rows7A.every((r) => r.kelas === "VII-A")).toBe(true)
    })

    it("menangani nilai kosong pada guru ('Belum Ditentukan') dan ruangan ('-')", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const rows7A = mapper.mapExcelScheduleRows({
        sessions,
        classes: [class7A, class7B],
        subjects,
        teachers,
        rooms,
        conflicts,
        filterClassId: "cls-7a",
      })

      const emptySessionRow = rows7A.find((r) => r.waktuMulai === "10:00")
      expect(emptySessionRow).toBeDefined()
      expect(emptySessionRow?.guru).toBe("Belum Ditentukan")
      expect(emptySessionRow?.ruangan).toBe("-")
      expect(emptySessionRow?.statusValidasi).toBe("Valid")
    })

    it("menerapkan sanitasi formula pada nama guru dan ruangan yang memiliki karakter berbahaya", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const rows7A = mapper.mapExcelScheduleRows({
        sessions,
        classes: [class7A, class7B],
        subjects,
        teachers,
        rooms,
        conflicts,
        filterClassId: "cls-7a",
      })

      // Sesi 3 memiliki guru '+628123456789 (Siti)' dan ruangan '-Ruang Teori 1'
      const formulaRow = rows7A.find((r) => r.waktuMulai === "08:00")
      expect(formulaRow).toBeDefined()
      expect(formulaRow?.guru).toBe("'+628123456789 (Siti)")
      expect(formulaRow?.ruangan).toBe("'-Ruang Teori 1")
    })
  })

  describe("3. mapExcelTeacherSummaryRows (Rekap Beban Mengajar Guru)", () => {
    it("menghitung total sesi, total menit, daftar kelas unik, dan jumlah konflik per guru", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const summaries = mapper.mapExcelTeacherSummaryRows({
        teachers,
        sessions,
        classes: [class7A, class7B],
        conflicts,
      })

      expect(summaries.length).toBe(2)

      const budi = summaries.find((t) => t.namaGuru.includes("Budi"))
      expect(budi).toBeDefined()
      // Budi mengajar di 2 sesi (ses-1 dan ses-2): masing-masing 45 menit -> total 90 menit
      expect(budi?.jumlahSesi).toBe(2)
      expect(budi?.totalMenitMingguan).toBe(90)
      expect(typeof budi?.totalMenitMingguan).toBe("number")
      expect(budi?.daftarKelas).toContain("VII-A")
      expect(budi?.daftarKelas).toContain("VII-B")
      expect(budi?.jumlahKonflikTerkait).toBe(1)

      const siti = summaries.find((t) => t.namaGuru.includes("Siti"))
      expect(siti).toBeDefined()
      // Siti nama diawali tanda '+', harus disanitasi
      expect(siti?.namaGuru).toBe("'+628123456789 (Siti)")
      expect(siti?.jumlahSesi).toBe(1)
      expect(siti?.totalMenitMingguan).toBe(90)
      expect(siti?.jumlahKonflikTerkait).toBe(0)
    })
  })

  describe("4. mapExcelRoomSummaryRows (Rekap Utilisasi Ruangan)", () => {
    it("menghitung jumlah sesi pemakaian dan total menit pemakaian per ruangan", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const roomSummaries = mapper.mapExcelRoomSummaryRows({
        rooms,
        sessions,
        conflicts,
      })

      expect(roomSummaries.length).toBe(2)

      const lab = roomSummaries.find((r) => r.namaRuangan === "Lab Komputer")
      expect(lab).toBeDefined()
      expect(lab?.jumlahSesiPenggunaan).toBe(1)
      expect(lab?.totalMenitPenggunaan).toBe(45)
      expect(lab?.jumlahKonflikRuangan).toBe(0)

      const teori = roomSummaries.find((r) => r.namaRuangan.includes("Ruang Teori"))
      expect(teori).toBeDefined()
      // Ruang teori diawali '-', harus disanitasi
      expect(teori?.namaRuangan).toBe("'-Ruang Teori 1")
      expect(teori?.jumlahSesiPenggunaan).toBe(1)
      expect(teori?.totalMenitPenggunaan).toBe(90)
    })
  })

  describe("5. mapExcelConflictRows (Worksheet Konflik & Peringatan - AC-11)", () => {
    it("memetakan bentrokan waktu dan rincian penyebab ke tabel konflik", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const conflictRows = mapper.mapExcelConflictRows({
        conflicts,
        validationSummary,
        classes: [class7A, class7B],
      })

      expect(conflictRows.length).toBeGreaterThanOrEqual(1)

      const timeConflict = conflictRows.find((c) => c.kategori === "Konflik Waktu")
      expect(timeConflict).toBeDefined()
      expect(timeConflict?.hari).toBe("Senin")
      expect(timeConflict?.rentangWaktu).toBe("07:30 - 08:15")
      expect(timeConflict?.kelasTerlibat).toContain("VII-A")
      expect(timeConflict?.kelasTerlibat).toContain("VII-B")
      expect(timeConflict?.rincianPenyebab).toContain("Budi Santoso")

      // Memetakan peringatan kebutuhan belum terpenuhi jika ada di summary
      const unfulfilled = conflictRows.find((c) => c.kategori === "Peringatan Kelengkapan")
      expect(unfulfilled).toBeDefined()
    })
  })

  describe("6. buildExcelExportPayload", () => {
    it("menyusun seluruh payload lengkap untuk kelas aktif", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const payload = mapper.buildExcelExportPayload({
        scope: "ACTIVE_CLASS",
        workspace,
        activeClassId: "cls-7a",
        classes: [class7A, class7B],
        dayConfigs,
        sessions,
        subjects,
        teachers,
        rooms,
        conflicts,
        validationSummary,
      })

      expect(payload.scope).toBe("ACTIVE_CLASS")
      expect(payload.workspaceName).toBe("SMP Negeri 1 Nusantara")
      expect(payload.className).toBe("VII-A")
      expect(payload.hasConflicts).toBe(true)
      expect(payload.scheduleRows.length).toBe(3) // Hanya kelas 7A
      expect(payload.conflictRows.length).toBeGreaterThanOrEqual(1)
    })

    it("menyusun seluruh payload lengkap untuk seluruh ruang kerja", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const payload = mapper.buildExcelExportPayload({
        scope: "ENTIRE_WORKSPACE",
        workspace,
        activeClassId: "cls-7a",
        classes: [class7A, class7B],
        dayConfigs,
        sessions,
        subjects,
        teachers,
        rooms,
        conflicts,
        validationSummary,
      })

      expect(payload.scope).toBe("ENTIRE_WORKSPACE")
      expect(payload.scheduleRows.length).toBe(4) // Seluruh sesi
      expect(payload.teacherSummaryRows.length).toBe(2)
      expect(payload.roomSummaryRows.length).toBe(2)
      expect(payload.hasConflicts).toBe(true)
    })
  })

  describe("7. formatExcelDownloadFileName (Sanitasi Nama Berkas - AC-FR09-06)", () => {
    it("membersihkan spasi dan karakter ilegal sistem berkas untuk kelas aktif", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const fileName = mapper.formatExcelDownloadFileName(
        "ACTIVE_CLASS",
        "SMP Negeri 1 / Nusantara: Unggulan*",
        "VII/A <Juara>"
      )

      expect(fileName).toMatch(/\.xlsx$/)
      expect(fileName).not.toMatch(/[/\\:*?"<>|]/)
      expect(fileName).toContain("Jadwal")
      expect(fileName).toContain("SMP_Negeri_1")
      expect(fileName).toContain("VII_A")
    })

    it("menghasilkan nama berkas yang tepat untuk cakupan seluruh ruang kerja", () => {
      expect(mapper).not.toBeNull()
      if (!mapper) return

      const fileName = mapper.formatExcelDownloadFileName(
        "ENTIRE_WORKSPACE",
        "SMP Negeri 1 Nusantara"
      )

      expect(fileName).toBe("Jadwal_SMP_Negeri_1_Nusantara_Semua_Kelas.xlsx")
    })
  })
})
