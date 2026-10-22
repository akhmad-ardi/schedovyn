import type { ExportScope } from "@/services/export/export-types"

export interface ExcelScheduleRow {
  hari: string
  waktuMulai: string // "07:30"
  waktuSelesai: string // "08:15"
  durasiMenit: number // Angka numerik murni
  kelas: string
  tingkat: string
  mataPelajaran: string
  guru: string // Nama guru atau "Belum Ditentukan"
  ruangan: string // Nama ruangan atau "-"
  statusValidasi: string // "Valid" atau "Konflik: ..." / "Peringatan: ..."
}

export interface ExcelTeacherSummaryRow {
  namaGuru: string
  jumlahSesi: number
  totalMenitMingguan: number // Angka numerik murni
  totalJamFormat: string // Contoh: "12 jam 30 menit" atau "12.5 jam"
  daftarKelas: string // Contoh: "VII-A, VII-B, VIII-A"
  jumlahKonflikTerkait: number // Angka numerik murni
}

export interface ExcelRoomSummaryRow {
  namaRuangan: string
  jenisRuangan: string // Kelas, Lab, Lapangan, dll.
  jumlahSesiPenggunaan: number
  totalMenitPenggunaan: number // Angka numerik murni
  jumlahKonflikRuangan: number // Angka numerik murni
}

export interface ExcelConflictRow {
  kategori: string // "Konflik Waktu" atau "Peringatan Kelengkapan"
  jenisMasalah: string // Contoh: "Bentrokan Jadwal Guru", "Kebutuhan Sesi Belum Terpenuhi"
  hari: string
  rentangWaktu: string
  kelasTerlibat: string
  rincianPenyebab: string
}

export interface ExcelExportPayload {
  scheduleRows: ExcelScheduleRow[]
  teacherSummaryRows: ExcelTeacherSummaryRow[]
  roomSummaryRows: ExcelRoomSummaryRow[]
  conflictRows: ExcelConflictRow[]
  scope: ExportScope
  workspaceName: string
  className?: string
  hasConflicts: boolean
}

export interface ExcelExportOptions {
  scope: ExportScope
  includeSummaries?: boolean // Default true pada mode seluruh ruang kerja
}
