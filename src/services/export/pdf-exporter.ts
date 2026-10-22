import jsPDF from "jspdf"
import autoTable, { type UserOptions } from "jspdf-autotable"
import { formatPdfDownloadFileName } from "@/services/export/export-data-mapper"
import type {
  ExportClassPayload,
  PdfExportMetadata,
  PdfExportOptions,
} from "@/services/export/export-types"

export interface GeneratePdfParams {
  payloads: ExportClassPayload[]
  options: PdfExportOptions
  metadata: PdfExportMetadata
}

const PAGE_MARGIN = 14
const PAGE_WIDTH = 297
const PAGE_HEIGHT = 210
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2

function renderClassHeader(
  doc: jsPDF,
  payload: ExportClassPayload,
  metadata: PdfExportMetadata,
  startY: number
): number {
  let currentY = startY

  // Judul Sekolah / Ruang Kerja (Bold 16pt)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42) // #0f172a
  doc.text(metadata.workspaceName, PAGE_MARGIN, currentY)
  currentY += 6

  // Periode Akademik & Waktu Cetak (Regular 10pt)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // #64748b
  doc.text(
    `${metadata.academicPeriod}  •  Dicetak: ${metadata.exportedAt}`,
    PAGE_MARGIN,
    currentY
  )
  currentY += 7

  // Identitas Kelas (Bold 13pt)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59) // #1e293b
  doc.text(
    `JADWAL PEMBELAJARAN KELAS: ${payload.classGroup.name} (Tingkat ${payload.classGroup.grade})`,
    PAGE_MARGIN,
    currentY
  )
  currentY += 4

  // Garis horizontal pemisah tebal
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.6)
  doc.line(PAGE_MARGIN, currentY, PAGE_MARGIN + CONTENT_WIDTH, currentY)
  currentY += 5

  return currentY
}

function renderValidationBanner(
  doc: jsPDF,
  payload: ExportClassPayload,
  startY: number
): number {
  let currentY = startY

  if (payload.hasConflicts) {
    const bannerHeight = 8
    // Latar belakang kotak merah muda lembut (#fee2e2)
    doc.setFillColor(254, 226, 226)
    doc.setDrawColor(220, 38, 38) // border merah (#dc2626)
    doc.setLineWidth(0.3)
    doc.roundedRect(
      PAGE_MARGIN,
      currentY,
      CONTENT_WIDTH,
      bannerHeight,
      1.5,
      1.5,
      "FD"
    )

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(185, 28, 28) // #b91c1c
    const conflictCount = payload.conflictAppendix.length
    doc.text(
      `PERINGATAN: Jadwal kelas ini mengandung ${conflictCount} bentrokan waktu aktif. Sesi yang bermasalah ditandai dengan tanda [KONFLIK].`,
      PAGE_MARGIN + 3,
      currentY + 5.2
    )
    currentY += bannerHeight + 4
  } else if (
    payload.validationSummary &&
    payload.validationSummary.status === "INCOMPLETE"
  ) {
    const bannerHeight = 8
    doc.setFillColor(254, 243, 199) // #fef3c7
    doc.setDrawColor(217, 119, 6) // #d97706
    doc.setLineWidth(0.3)
    doc.roundedRect(
      PAGE_MARGIN,
      currentY,
      CONTENT_WIDTH,
      bannerHeight,
      1.5,
      1.5,
      "FD"
    )

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(146, 64, 14) // #92400e
    doc.text(
      `PERHATIAN: Jadwal kelas ini masih memiliki ${payload.validationSummary.unscheduledSessionsCount} sesi yang belum ditempatkan.`,
      PAGE_MARGIN + 3,
      currentY + 5.2
    )
    currentY += bannerHeight + 4
  }

  return currentY
}

export async function generateTimetablePdf(
  params: GeneratePdfParams
): Promise<{ fileName: string; totalPages: number }> {
  const { payloads, options, metadata } = params

  if (!payloads || payloads.length === 0) {
    return { fileName: "", totalPages: 0 }
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const fileName = formatPdfDownloadFileName(
    options.scope,
    metadata.workspaceName,
    options.scope === "ACTIVE_CLASS" ? payloads[0]?.classGroup.name : undefined
  )

  for (let classIndex = 0; classIndex < payloads.length; classIndex++) {
    const payload = payloads[classIndex]

    if (classIndex > 0) {
      doc.addPage("a4", "landscape")
    }

    let currentY = PAGE_MARGIN
    currentY = renderClassHeader(doc, payload, metadata, currentY)
    currentY = renderValidationBanner(doc, payload, currentY)

    // Tabel Jadwal Mingguan
    const tableHeaders = [
      "No",
      "Hari",
      "Waktu",
      "Durasi",
      "Mata Pelajaran",
      "Guru",
      "Ruangan",
      "Status",
    ]

    const tableData = payload.rows.map((row, idx) => [
      String(idx + 1),
      row.dayLabel,
      row.timeRange,
      `${row.durationMinutes} mnt`,
      row.subjectName,
      row.teacherName,
      row.roomName,
      row.hasConflict
        ? `[KONFLIK] ${row.conflictNotes || "Bentrokan Waktu"}`
        : "Terjadwal",
    ])

    const autoTableOptions: UserOptions = {
      startY: currentY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [tableHeaders],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42], // #0f172a
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "left",
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // #f8fafc
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 28 },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 48 },
        5: { cellWidth: 45 },
        6: { cellWidth: 35 },
        7: { cellWidth: "auto" },
      },
      didParseCell(data) {
        if (data.section === "body") {
          const rowItem = payload.rows[data.row.index]
          if (rowItem?.hasConflict) {
            data.cell.styles.fillColor = [254, 242, 242] // #fef2f2
            if (data.column.index === 7) {
              data.cell.styles.textColor = [220, 38, 38] // #dc2626
              data.cell.styles.fontStyle = "bold"
            }
          }
        }
      },
    }

    autoTable(doc, autoTableOptions)

    // Lampiran Rincian Konflik jika diaktifkan dan ada konflik
    if (
      options.includeConflictAppendix &&
      payload.conflictAppendix.length > 0
    ) {
      const docWithTable = doc as jsPDF & {
        lastAutoTable?: { finalY: number }
      }
      let appendixStartY = (docWithTable.lastAutoTable?.finalY ?? currentY) + 7

      // Periksa sisa ruang di halaman saat ini
      if (appendixStartY + 30 > PAGE_HEIGHT - PAGE_MARGIN) {
        doc.addPage("a4", "landscape")
        appendixStartY = PAGE_MARGIN
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10.5)
      doc.setTextColor(185, 28, 28)
      doc.text(
        "LAMPIRAN: RINCIAN BENTROKAN WAKTU AKTIF",
        PAGE_MARGIN,
        appendixStartY
      )
      appendixStartY += 3

      const appendixHeaders = [
        "No",
        "Jenis Masalah",
        "Hari",
        "Waktu",
        "Deskripsi & Kelas Terlibat",
      ]

      const appendixBody = payload.conflictAppendix.map((item, idx) => [
        String(idx + 1),
        item.title,
        item.dayLabel,
        item.timeRange,
        `${item.description} (Kelas: ${item.affectedClasses.join(", ")})`,
      ])

      autoTable(doc, {
        startY: appendixStartY,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [appendixHeaders],
        body: appendixBody,
        theme: "grid",
        headStyles: {
          fillColor: [185, 28, 28],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 45 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: "auto" },
        },
      })
    }
  }

  // Jika mode Seluruh Ruang Kerja (ENTIRE_WORKSPACE): Halaman Rekapitulasi Akhir
  if (options.scope === "ENTIRE_WORKSPACE" && payloads.length > 0) {
    doc.addPage("a4", "landscape")

    let summaryY = PAGE_MARGIN

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text(metadata.workspaceName, PAGE_MARGIN, summaryY)
    summaryY += 6

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(
      `${metadata.academicPeriod}  •  Dicetak: ${metadata.exportedAt}`,
      PAGE_MARGIN,
      summaryY
    )
    summaryY += 7

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(30, 41, 59)
    doc.text(
      "RINGKASAN VALIDASI DAN REKAPITULASI SELURUH RUANG KERJA",
      PAGE_MARGIN,
      summaryY
    )
    summaryY += 4

    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.6)
    doc.line(PAGE_MARGIN, summaryY, PAGE_MARGIN + CONTENT_WIDTH, summaryY)
    summaryY += 7

    const summaryHeaders = [
      "No",
      "Nama Kelas",
      "Tingkat",
      "Jumlah Sesi",
      "Total Durasi",
      "Status Konflik",
    ]

    const summaryData = payloads.map((p, idx) => [
      String(idx + 1),
      p.classGroup.name,
      p.classGroup.grade,
      `${p.totalSessions} sesi`,
      `${p.totalDurationMinutes} menit`,
      p.hasConflicts
        ? `Ada Bentrokan (${p.conflictAppendix.length})`
        : "Bebas Bentrokan",
    ])

    autoTable(doc, {
      startY: summaryY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [summaryHeaders],
      body: summaryData,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 35, halign: "center" },
        5: { cellWidth: "auto" },
      },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 5) {
          const classItem = payloads[data.row.index]
          if (classItem?.hasConflicts) {
            data.cell.styles.textColor = [220, 38, 38]
            data.cell.styles.fontStyle = "bold"
          } else {
            data.cell.styles.textColor = [16, 185, 129]
          }
        }
      },
    })
  }

  // Footer di setiap halaman
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(PAGE_MARGIN, PAGE_HEIGHT - 10, PAGE_MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 10)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Halaman ${page} dari ${totalPages} — Dibuat secara otomatis dengan Schedovyn`,
      PAGE_MARGIN + CONTENT_WIDTH,
      PAGE_HEIGHT - 6,
      { align: "right" }
    )
  }

  // Unduh berkas di browser bila tersedia
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      doc.save(fileName)
    } catch {
      // Safe fallback bila lingkungan testing tanpa mock createObjectURL
    }
  }

  return {
    fileName,
    totalPages,
  }
}
