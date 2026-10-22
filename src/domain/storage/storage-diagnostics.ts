export type StorageErrorCode =
  | "QUOTA_EXCEEDED"
  | "STORAGE_BLOCKED"
  | "INDEXEDDB_UNSUPPORTED"
  | "TRANSACTION_FAILURE"
  | "UNKNOWN_STORAGE_ERROR"

export interface StorageErrorInfo {
  code: StorageErrorCode
  title: string
  message: string
  userActionGuidance: string
  isRetryable: boolean
}

/**
 * Mendiagnosis galat penyimpanan browser/IndexedDB menjadi informasi ramah pengguna.
 * Pure function, tidak memodifikasi input, bebas dari 'any'.
 */
export function diagnoseStorageError(error: unknown): StorageErrorInfo {
  let errorName = ""
  let errorMessage = ""

  if (typeof error === "object" && error !== null) {
    const candidate = error as { name?: unknown; message?: unknown }
    if (typeof candidate.name === "string") {
      errorName = candidate.name
    }
    if (typeof candidate.message === "string") {
      errorMessage = candidate.message
    }
  } else if (typeof error === "string") {
    errorMessage = error
  }

  const normalizedMessage = errorMessage.toLowerCase()

  if (
    errorName === "QuotaExceededError" ||
    normalizedMessage.includes("quota")
  ) {
    return {
      code: "QUOTA_EXCEEDED",
      title: "Ruang Penyimpanan Browser Penuh",
      message:
        "Browser kehabisan ruang penyimpanan lokal untuk menyimpan perubahan jadwal.",
      userActionGuidance:
        "Kosongkan sebagian data situs browser Anda atau lakukan ekspor jadwal ke Excel/PDF sebelum memuat ulang.",
      isRetryable: true,
    }
  }

  if (
    errorName === "SecurityError" ||
    normalizedMessage.includes("security") ||
    normalizedMessage.includes("insecure")
  ) {
    return {
      code: "STORAGE_BLOCKED",
      title: "Akses Penyimpanan Dibatasi",
      message:
        "Browser memblokir akses ke IndexedDB (biasanya terjadi pada mode penyamaran/incognito tertentu atau pengaturan privasi ketat).",
      userActionGuidance:
        "Buka aplikasi di jendela browser reguler agar jadwal dapat disimpan secara persisten.",
      isRetryable: false,
    }
  }

  if (
    normalizedMessage.includes("indexeddb") &&
    normalizedMessage.includes("not supported")
  ) {
    return {
      code: "INDEXEDDB_UNSUPPORTED",
      title: "Penyimpanan Browser Tidak Didukung",
      message:
        "Peramban yang Anda gunakan tidak mendukung atau menonaktifkan fitur IndexedDB.",
      userActionGuidance:
        "Gunakan peramban desktop modern yang mendukung IndexedDB (Chromium, Firefox, Safari).",
      isRetryable: false,
    }
  }

  return {
    code: "TRANSACTION_FAILURE",
    title: "Gagal Menyimpan ke Browser",
    message:
      "Terjadi kendala saat menulis data ke penyimpanan lokal browser.",
    userActionGuidance:
      "Periksa kestabilan peramban Anda lalu klik tombol Coba Simpan Ulang.",
    isRetryable: true,
  }
}
