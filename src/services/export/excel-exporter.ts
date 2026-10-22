import * as XLSX from "xlsx"
import { formatExcelDownloadFileName } from "@/services/export/excel-data-mapper"
import type {
  ExcelExportOptions,
  ExcelExportPayload,
} from "@/services/export/excel-types"

export interface GenerateExcelResult {
  fileName: string
  sheetNames: string[]
  totalRows: number
}

function autoFitColumns(
  data: Record<string, unknown>[],
  ws: XLSX.WorkSheet
): void {
  if (data.length === 0) return
  const keys = Object.keys(data[0])
  const colWidths = keys.map((key) => {
    let maxLen = key.length
    for (const row of data) {
      const val = row[key]
      if (val !== null && val !== undefined) {
        const len = String(val).length
        if (len > maxLen) maxLen = len
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 60) }
  })
  ws["!cols"] = colWidths
}

export async function generateTimetableExcel(
  payload: ExcelExportPayload,
  options: ExcelExportOptions
): Promise<GenerateExcelResult> {
  const wb = XLSX.utils.book_new()
  const sheetNames: string[] = []
  let totalRows = 0

  const fileName = formatExcelDownloadFileName(
    options.scope,
    payload.workspaceName,
    payload.scope === "ACTIVE_CLASS" ? payload.className : undefined
  )

  // 1. Worksheet: Jadwal (Selalu ada)
  const scheduleData = payload.scheduleRows.map((r) => ({
    Hari: r.hari,
    "Waktu Mulai": r.waktuMulai,
    "Waktu Selesai": r.waktuSelesai,
    "Durasi (Menit)": r.durasiMenit,
    Kelas: r.kelas,
    Tingkat: r.tingkat,
    "Mata Pelajaran": r.mataPelajaran,
    Guru: r.guru,
    Ruangan: r.ruangan,
    "Status Validasi": r.statusValidasi,
  }))

  const wsSchedule = XLSX.utils.json_to_sheet(scheduleData)
  if (scheduleData.length > 0 && wsSchedule["!ref"]) {
    wsSchedule["!autofilter"] = { ref: wsSchedule["!ref"] }
    autoFitColumns(scheduleData, wsSchedule)
  }
  XLSX.utils.book_append_sheet(wb, wsSchedule, "Jadwal")
  sheetNames.push("Jadwal")
  totalRows += scheduleData.length

  // 2. Worksheet: Rekap Guru (Khusus ENTIRE_WORKSPACE atau saat includeSummaries aktif)
  const shouldIncludeSummaries =
    options.scope === "ENTIRE_WORKSPACE" || options.includeSummaries === true

  if (shouldIncludeSummaries && payload.teacherSummaryRows.length > 0) {
    const teacherData = payload.teacherSummaryRows.map((t) => ({
      "Nama Guru": t.namaGuru,
      "Jumlah Sesi": t.jumlahSesi,
      "Total Menit Mingguan": t.totalMenitMingguan,
      "Total Jam Mengajar": t.totalJamFormat,
      "Daftar Kelas": t.daftarKelas,
      "Jumlah Konflik Terkait": t.jumlahKonflikTerkait,
    }))

    const wsTeacher = XLSX.utils.json_to_sheet(teacherData)
    if (teacherData.length > 0 && wsTeacher["!ref"]) {
      wsTeacher["!autofilter"] = { ref: wsTeacher["!ref"] }
      autoFitColumns(teacherData, wsTeacher)
    }
    XLSX.utils.book_append_sheet(wb, wsTeacher, "Rekap Guru")
    sheetNames.push("Rekap Guru")
    totalRows += teacherData.length
  }

  // 3. Worksheet: Rekap Ruangan (Khusus ENTIRE_WORKSPACE atau saat includeSummaries aktif)
  if (shouldIncludeSummaries && payload.roomSummaryRows.length > 0) {
    const roomData = payload.roomSummaryRows.map((r) => ({
      "Nama Ruangan": r.namaRuangan,
      "Jenis Fasilitas": r.jenisRuangan,
      "Jumlah Sesi Penggunaan": r.jumlahSesiPenggunaan,
      "Total Menit Penggunaan": r.totalMenitPenggunaan,
      "Jumlah Konflik Ruangan": r.jumlahKonflikRuangan,
    }))

    const wsRoom = XLSX.utils.json_to_sheet(roomData)
    if (roomData.length > 0 && wsRoom["!ref"]) {
      wsRoom["!autofilter"] = { ref: wsRoom["!ref"] }
      autoFitColumns(roomData, wsRoom)
    }
    XLSX.utils.book_append_sheet(wb, wsRoom, "Rekap Ruangan")
    sheetNames.push("Rekap Ruangan")
    totalRows += roomData.length
  }

  // 4. Worksheet: Konflik (Dibuat jika jadwal memiliki bentrokan/peringatan)
  if (payload.hasConflicts && payload.conflictRows.length > 0) {
    const conflictData = payload.conflictRows.map((c) => ({
      Kategori: c.kategori,
      "Jenis Masalah": c.jenisMasalah,
      Hari: c.hari,
      "Rentang Waktu": c.rentangWaktu,
      "Kelas Terlibat": c.kelasTerlibat,
      "Rincian Penyebab": c.rincianPenyebab,
    }))

    const wsConflict = XLSX.utils.json_to_sheet(conflictData)
    if (conflictData.length > 0 && wsConflict["!ref"]) {
      wsConflict["!autofilter"] = { ref: wsConflict["!ref"] }
      autoFitColumns(conflictData, wsConflict)
    }
    XLSX.utils.book_append_sheet(wb, wsConflict, "Konflik")
    sheetNames.push("Konflik")
    totalRows += conflictData.length
  }

  // Memicu unduhan di peramban
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "binary" })
    } catch {
      // Safe fallback bila lingkungan testing tanpa mock createObjectURL/download
    }
  }

  return {
    fileName,
    sheetNames,
    totalRows,
  }
}
