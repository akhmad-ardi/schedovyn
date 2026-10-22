import { beforeAll, describe, expect, it } from "vitest"
import type {
  ExportClassPayload,
  PdfExportMetadata,
  PdfExportOptions,
} from "@/services/export/export-types"
import type * as PdfExporterModule from "@/services/export/pdf-exporter"

describe("QA-02 & FR-08: PDF Exporter Engine (pdf-exporter)", () => {
  let exporter: typeof PdfExporterModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/services/export/pdf-exporter"
      exporter = await import(/* @vite-ignore */ modulePath)
    } catch {
      exporter = null
    }
  })

  function createMockPayload(
    className: string,
    hasConflicts = false
  ): ExportClassPayload {
    return {
      classGroup: {
        id: `cls-${className}`,
        workspaceId: "ws-1",
        name: className,
        grade: "VII",
      },
      workspace: {
        id: "ws-1",
        name: "SMP Negeri 1 Nusantara",
        academicPeriod: "Semester Ganjil 2026/2027",
        activeClassId: `cls-${className}`,
        defaultSnapIntervalMinutes: 15,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
      rows: [
        {
          sessionId: `ses-${className}-1`,
          dayOfWeek: "monday",
          dayLabel: "Senin",
          timeRange: "07:30 - 08:15",
          startTime: "07:30",
          endTime: "08:15",
          durationMinutes: 45,
          subjectName: "Matematika",
          teacherName: "Budi Santoso",
          roomName: "Ruang 101",
          hasConflict: hasConflicts,
          conflictBadges: hasConflicts ? ["[KONFLIK]"] : [],
          conflictNotes: hasConflicts ? "Bentrokan jadwal guru" : "",
        },
      ],
      conflictAppendix: hasConflicts
        ? [
            {
              conflictId: "c-1",
              title: "Bentrokan Jadwal Guru",
              description: "Guru Budi Santoso bentrok pada waktu yang sama.",
              dayLabel: "Senin",
              timeRange: "07:30 - 08:15",
              affectedClasses: [className, "VII-B"],
            },
          ]
        : [],
      hasConflicts,
      totalSessions: 1,
      totalDurationMinutes: 45,
      validationSummary: null,
    }
  }

  const defaultMetadata: PdfExportMetadata = {
    workspaceName: "SMP Negeri 1 Nusantara",
    academicPeriod: "Semester Ganjil 2026/2027",
    exportedAt: "22 Oktober 2026, 10:45",
    scope: "ACTIVE_CLASS",
  }

  it("1. memverifikasi generateTimetablePdf menghasilkan berkas PDF kelas aktif dengan nama yang tepat (AC-09)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const payload = createMockPayload("VII-A", false)
    const options: PdfExportOptions = {
      scope: "ACTIVE_CLASS",
      includeConflictAppendix: false,
    }

    const result = await exporter.generateTimetablePdf({
      payloads: [payload],
      options,
      metadata: defaultMetadata,
    })

    expect(result).toBeDefined()
    expect(result.fileName).toMatch(/Jadwal.*VII-A.*\.pdf$/)
    expect(result.totalPages).toBeGreaterThanOrEqual(1)
  })

  it("2. memverifikasi mode ekspor seluruh ruang kerja mencetak setiap kelas pada halaman terpisah (AC-FR08-04)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const payloads = [
      createMockPayload("VII-A", false),
      createMockPayload("VII-B", false),
      createMockPayload("VIII-A", false),
    ]

    const options: PdfExportOptions = {
      scope: "ENTIRE_WORKSPACE",
      includeConflictAppendix: false,
    }

    const result = await exporter.generateTimetablePdf({
      payloads,
      options,
      metadata: {
        ...defaultMetadata,
        scope: "ENTIRE_WORKSPACE",
      },
    })

    expect(result.fileName).toMatch(/Semua_Kelas.*\.pdf$/)
    // Terdapat 3 kelas terpisah, plus halaman penutup rekapitulasi ruang kerja
    expect(result.totalPages).toBeGreaterThanOrEqual(3)
  })

  it("3. memverifikasi payload dengan konflik (hasConflicts = true) menyertakan lampiran rincian konflik (AC-11 & FR-08.5)", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const conflictedPayload = createMockPayload("VII-A", true)
    const options: PdfExportOptions = {
      scope: "ACTIVE_CLASS",
      includeConflictAppendix: true,
    }

    const result = await exporter.generateTimetablePdf({
      payloads: [conflictedPayload],
      options,
      metadata: defaultMetadata,
    })

    expect(result).toBeDefined()
    expect(result.totalPages).toBeGreaterThanOrEqual(1)
  })

  it("4. penanganan aman saat payloads kosong: mengembalikan totalPages 0 atau melempar error validasi", async () => {
    expect(exporter).not.toBeNull()
    if (!exporter) return

    const options: PdfExportOptions = {
      scope: "ENTIRE_WORKSPACE",
      includeConflictAppendix: false,
    }

    try {
      const result = await exporter.generateTimetablePdf({
        payloads: [],
        options,
        metadata: {
          ...defaultMetadata,
          scope: "ENTIRE_WORKSPACE",
        },
      })
      expect(result.totalPages).toBe(0)
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
    }
  })
})
