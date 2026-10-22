import { beforeAll, describe, expect, it } from "vitest"
import type {
  ExcelConflictRow,
  ExcelExportOptions,
  ExcelExportPayload,
  ExcelRoomSummaryRow,
  ExcelScheduleRow,
  ExcelTeacherSummaryRow,
} from "@/services/export/excel-types"
import type * as ExcelExporterModule from "@/services/export/excel-exporter"

describe("QA-02 & FR-09: Excel Exporter Engine (excel-exporter)", () => {
  let exporter: typeof ExcelExporterModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/services/export/excel-exporter"
      exporter = await import(/* @vite-ignore */ modulePath)
    } catch {
      exporter = null
    }
  })

  function createMockExcelPayload(params: {
    scope: "ACTIVE_CLASS" | "ENTIRE_WORKSPACE"
    className?: string
    hasConflicts?: boolean
  }): ExcelExportPayload {
    const { scope, className = "VII-A", hasConflicts = false } = params

    const scheduleRows: ExcelScheduleRow[] = [
      {
        hari: "Senin",
        waktuMulai: "07:30",
        waktuSelesai: "08:15",
        durasiMenit: 45,
        kelas: className,
        tingkat: "VII",
        mataPelajaran: "Matematika",
        guru: "Budi Santoso",
        ruangan: "Ruang 101",
        statusValidasi: hasConflicts ? "Konflik: Bentrokan Guru" : "Valid",
      },
      {
        hari: "Senin",
        waktuMulai: "08:15",
        waktuSelesai: "09:45",
        durasiMenit: 90,
        kelas: className,
        tingkat: "VII",
        mataPelajaran: "Bahasa Inggris",
        guru: "'+628123456789 (Siti)", // Teks tersanitasi
        ruangan: "'-Ruang Lab", // Teks tersanitasi
        statusValidasi: "Valid",
      },
    ]

    const teacherSummaryRows: ExcelTeacherSummaryRow[] = [
      {
        namaGuru: "Budi Santoso",
        jumlahSesi: 1,
        totalMenitMingguan: 45,
        totalJamFormat: "45 menit",
        daftarKelas: className,
        jumlahKonflikTerkait: hasConflicts ? 1 : 0,
      },
      {
        namaGuru: "'+628123456789 (Siti)",
        jumlahSesi: 1,
        totalMenitMingguan: 90,
        totalJamFormat: "1 jam 30 menit",
        daftarKelas: className,
        jumlahKonflikTerkait: 0,
      },
    ]

    const roomSummaryRows: ExcelRoomSummaryRow[] = [
      {
        namaRuangan: "Ruang 101",
        jenisRuangan: "classroom",
        jumlahSesiPenggunaan: 1,
        totalMenitPenggunaan: 45,
        jumlahKonflikRuangan: 0,
      },
      {
        namaRuangan: "'-Ruang Lab",
        jenisRuangan: "laboratory",
        jumlahSesiPenggunaan: 1,
        totalMenitPenggunaan: 90,
        jumlahKonflikRuangan: 0,
      },
    ]

    const conflictRows: ExcelConflictRow[] = hasConflicts
      ? [
          {
            kategori: "Konflik Waktu",
            jenisMasalah: "Bentrokan Jadwal Guru",
            hari: "Senin",
            rentangWaktu: "07:30 - 08:15",
            kelasTerlibat: `${className}, VII-B`,
            rincianPenyebab: "Guru Budi Santoso dijadwalkan mengajar di dua kelas bersamaan.",
          },
        ]
      : []

    return {
      scope,
      workspaceName: "SMP Negeri 1 Nusantara",
      className: scope === "ACTIVE_CLASS" ? className : undefined,
      hasConflicts,
      scheduleRows,
      teacherSummaryRows,
      roomSummaryRows,
      conflictRows,
    }
  }

  it("1. memverifikasi generateTimetableExcel menghasilkan workbook jadwal kelas aktif bebas konflik (AC-10 & AC-FR09-01)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const payload = createMockExcelPayload({
      scope: "ACTIVE_CLASS",
      className: "VII-A",
      hasConflicts: false,
    })

    const options: ExcelExportOptions = {
      scope: "ACTIVE_CLASS",
    }

    const result = await exporter.generateTimetableExcel(payload, options)

    expect(result).toBeDefined()
    expect(result.fileName).toMatch(/Jadwal.*VII-A.*\.xlsx$/)
    expect(result.sheetNames).toContain("Jadwal")
    // Tidak ada konflik, jadi sheet Konflik tidak dibuat pada mode bebas konflik kelas aktif
    expect(result.sheetNames).not.toContain("Konflik")
    expect(result.totalRows).toBeGreaterThanOrEqual(2)
  })

  it("2. memverifikasi mode seluruh ruang kerja menyertakan sheet Rekap Guru dan Rekap Ruangan (AC-FR09-02)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const payload = createMockExcelPayload({
      scope: "ENTIRE_WORKSPACE",
      hasConflicts: false,
    })

    const options: ExcelExportOptions = {
      scope: "ENTIRE_WORKSPACE",
      includeSummaries: true,
    }

    const result = await exporter.generateTimetableExcel(payload, options)

    expect(result.fileName).toMatch(/Semua_Kelas.*\.xlsx$/)
    expect(result.sheetNames).toContain("Jadwal")
    expect(result.sheetNames).toContain("Rekap Guru")
    expect(result.sheetNames).toContain("Rekap Ruangan")
    expect(result.totalRows).toBeGreaterThanOrEqual(6) // 2 jadwal + 2 guru + 2 ruangan
  })

  it("3. memverifikasi pembuatan sheet 'Konflik' jika jadwal memiliki bentrokan (AC-11 & AC-FR09-03)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const conflictedPayload = createMockExcelPayload({
      scope: "ACTIVE_CLASS",
      className: "VII-A",
      hasConflicts: true,
    })

    const options: ExcelExportOptions = {
      scope: "ACTIVE_CLASS",
    }

    const result = await exporter.generateTimetableExcel(conflictedPayload, options)

    expect(result.sheetNames).toContain("Jadwal")
    expect(result.sheetNames).toContain("Konflik")
  })

  it("4. memverifikasi sanitasi nama file unduhan pada ruang kerja dengan karakter terlarang (AC-FR09-06)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const payload = createMockExcelPayload({
      scope: "ACTIVE_CLASS",
      className: "VII/A*Juara",
    })
    payload.workspaceName = "SMPN 1 / Unggulan: 2026*"

    const result = await exporter.generateTimetableExcel(payload, {
      scope: "ACTIVE_CLASS",
    })

    expect(result.fileName).not.toMatch(/[/\\:*?"<>|]/)
    expect(result.fileName).toMatch(/\.xlsx$/)
  })
})
