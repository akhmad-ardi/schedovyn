# Spesifikasi Task & Kontrak Teknis: FR-10 — Penyimpanan Otomatis Lokal (Auto-Save Persistence & Resilience)

**Kode Fitur:** `FR-10` (Didukung oleh `AC-12`, `FR-01`, `FR-02`, `FR-03`, `FR-04`, `FR-05`, `FR-06`, `FR-07`, `NFR-02`, `NFR-03`, `NFR-06`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md) (Bagian 5, 6, 7, 10, 11, 12, 13)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md) (Bagian 2.1, 7.2)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md) (Bagian 4, 5.2)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)
- Task Terkait:
  - [`docs/tasks/FR-01-workspace-and-schedule-config.md`](./FR-01-workspace-and-schedule-config.md)
  - [`docs/tasks/FR-02-master-data-management.md`](./FR-02-master-data-management.md)
  - [`docs/tasks/FR-03-active-class-selection.md`](./FR-03-active-class-selection.md)
  - [`docs/tasks/FR-04-timetable-drag-and-drop-editor.md`](./FR-04-timetable-drag-and-drop-editor.md)
  - [`docs/tasks/FR-05-smart-conflict-detection.md`](./FR-05-smart-conflict-detection.md)
  - [`docs/tasks/FR-06-unscheduled-sessions-management.md`](./FR-06-unscheduled-sessions-management.md)
  - [`docs/tasks/FR-07-undo-and-redo.md`](./FR-07-undo-and-redo.md)
  - [`docs/tasks/FR-08-pdf-export.md`](./FR-08-pdf-export.md)
  - [`docs/tasks/FR-09-excel-export.md`](./FR-09-excel-export.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran arsitektur dan keterhubungan modul:
- **Arsitektur Local-First & Zero-Backend:**
  Schedovyn beroperasi 100% di browser tanpa autentikasi, tanpa server aplikasi, dan tanpa basis data cloud ([`docs/Schedovyn-PRD.md#L41-L49`](file:///home/ardi/projects/schedovyn/frontend/docs/Schedovyn-PRD.md#L41-L49)). Oleh karena itu, keandalan penyimpanan browser lokal (IndexedDB via Dexie.js) merupakan pondasi paling kritis yang menjaga agar karya jadwal pengguna tidak hilang saat halaman di-refresh, ditutup, atau dibuka kembali di masa depan.
- **Kondisi yang Tersedia di Codebase:**
  - Skema basis data Dexie telah terdefinisi di [`src/db/database.ts`](../../src/db/database.ts) dengan 8 tabel utama (`workspaces`, `dayConfigs`, `classes`, `subjects`, `teachers`, `rooms`, `requirements`, `sessions`).
  - Fungsi inisialisasi dan persistensi atomik per entitas sebagian besar telah tersedia di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts).
  - Store Zustand [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) memuat state `saveStatus`, `lastSavedAt`, dan `saveErrorMessage`.
  - Komponen lencana status [`src/components/layout/save-status-badge.tsx`](../../src/components/layout/save-status-badge.tsx) dan banner peringatan di [`src/components/layout/app-shell.tsx`](../../src/components/layout/app-shell.tsx) sudah terpasang.
- **Kesenjangan (Gaps) yang Wajib Dituntaskan pada FR-10:**
  1. *Universal Storage Retry:* Aksi coba simpan ulang yang ada saat ini (`retrySaveWorkspaceSettings`) hanya menyimpan ulang `workspace` dan `dayConfigs`. Jika mutasi sesi atau master data yang mengalami error, aksi tersebut tidak menyimpan entitas yang tertunda ke IndexedDB. Diperlukan aksi sinkronisasi universal `retryPendingStorageSync()` yang menyimpan seluruh snapshot memori terkini.
  2. *Diagnostik Error Terstandarisasi:* Seluruh blok penanganan kegagalan penyimpanan saat ini masih mengembalikan string generik tunggal (`LOCAL_SAVE_ERROR_MESSAGE`). Diperlukan modul diagnostik murni `src/domain/storage/storage-diagnostics.ts` yang mampu membedakan `QuotaExceededError` (ruang disk penuh), `SecurityError` (mode penyamaran / storage diblokir), dan kegagalan transaksi lainnya.
  3. *Storage Honesty Tanpa Kompromi (FR-10.5):* Sistem dilarang menampilkan lencana atau status "Tersimpan di browser" jika penulisan ke IndexedDB belum berhasil diselesaikan (*resolved*). Jika penulisan gagal atau peramban menolak penyimpanan, status wajib beralih ke `"error"`.
  4. *Edukasi Batasan Persistensi Lokal (Catatan PRD FR-10 & NFR-03):* Pengguna wajib diberi edukasi bahwa penyimpanan browser bukan cadangan permanen dan dapat terhapus jika data situs dibersihkan. Lencana status penyimpanan perlu dilengkapi popover informatif yang memuat waktu simpan terakhir, status estimasi kuota, dan anjuran melakukan ekspor berkala.
  5. *Resiliensi Startup (Booting Failure):* Apabila inisialisasi awal (`loadOrSeedWorkspace`) gagal total (misal korupsi storage atau pemblokiran ketat), aplikasi tidak boleh terjebak dalam *infinite spinner*, melainkan menyajikan tampilan pemulihan/fallback yang jelas.

### 1.2 Referensi Persyaratan
- **FR-10 (Penyimpanan Otomatis Lokal — PRD Bagian 5):**
  1. Perubahan penting disimpan tanpa pengguna harus menekan tombol simpan pada setiap tindakan (*Zero Manual Save Button*).
  2. Setelah halaman dibuka kembali pada peramban dan profil yang sama, sistem mencoba memulihkan ruang kerja terakhir (*Session Recovery & Hydration*).
  3. Sistem menampilkan indikator bahwa data sedang disimpan atau telah tersimpan (*Saving, Saved, Error*).
  4. Kegagalan penyimpanan lokal harus diberitahukan kepada pengguna (*Honest Error Notification & Retry*).
  5. Sistem tidak boleh menyatakan perubahan telah tersimpan jika operasi penyimpanan gagal (*Storage Honesty*).
  - *Catatan PRD:* Penyimpanan lokal bukan layanan backup. Penghapusan data situs, perubahan profil peramban, atau perpindahan perangkat dapat menyebabkan data tidak lagi tersedia.
- **AC-12 (Penyimpanan Lokal — PRD Bagian 12):**
  - **Given** penyimpanan lokal berfungsi,
  - **When** pengguna mengubah jadwal lalu membuka kembali aplikasi pada browser dan profil yang sama,
  - **Then** sistem memulihkan perubahan yang telah berhasil disimpan.
- **NFR-02 (Keandalan Data):**
  - Perubahan harus disimpan setelah proses penyimpanan berhasil.
  - Undo dan redo harus mengembalikan kondisi jadwal secara konsisten dan tersimpan ke basis data lokal.
- **NFR-03 (Privasi):**
  - Data jadwal harus diproses secara lokal. Aplikasi tidak boleh mengirim data ke pihak luar.
  - Pengguna diberi tahu bahwa data lokal dapat hilang jika penyimpanan browser dihapus.
- **NFR-06 (Ketahanan UI):**
  - Kegagalan penyimpanan lokal harus ditampilkan kepada pengguna tanpa merusak kelangsungan tampilan editor.

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Pengguna yang menyusun ratusan jadwal pelajaran dapat kehilangan seluruh pekerjaannya secara mendadak jika peramban mengalami *crash*, tab tertutup tidak sengaja, atau kuota penyimpanan peramban terlampaui tanpa ada peringatan yang jujur.
- **Cakupan Fitur (In-Scope):**
  1. Kontrak tipe dan modul diagnostik error penyimpanan di `src/domain/storage/storage-diagnostics.ts`.
  2. Fungsi persistensi snapshot penuh `persistFullWorkspaceSnapshot` di `src/db/workspace-repository.ts`.
  3. Tindakan `retryPendingStorageSync` dan penyempurnaan penanganan error di `src/store/use-workspace-store.ts`.
  4. Penyempurnaan `SaveStatusBadge` dengan Popover informasi persistensi data lokal, stempel waktu `HH:mm:ss`, dan disclaimer cadangan.
  5. Penyempurnaan `AppShell` dengan penanganan boot failure fallback dan banner alert retry universal.
  6. Pengujian menyeluruh: unit test diagnostik, integration test auto-save & storage honesty, serta component test UI resilience.
- **Di Luar Cakupan Fitur (Out-of-Scope):**
  - Sinkronisasi cloud multi-perangkat via internet (Schedovyn adalah aplikasi murni *zero-backend* & *offline-first*).
  - Fitur File System Access API untuk auto-sync berkas `.json` ke sistem berkas lokal OS (dipertimbangkan untuk versi rilis lanjutan).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Modul Diagnostik Error Penyimpanan (`src/domain/storage/storage-diagnostics.ts`)

Modul pure TypeScript tanpa ketergantungan UI untuk memetakan galat browser/IndexedDB ke dalam bentuk terstruktur:

```typescript
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
 * Mendiagnosis galat penyimpanan menjadi informasi ramah pengguna.
 * Pure function, tidak memodifikasi input, bebas dari 'any'.
 */
export function diagnoseStorageError(error: unknown): StorageErrorInfo {
  const errorObj = error instanceof Error ? error : null
  const errorName = errorObj?.name ?? ""
  const errorMessage = errorObj?.message ?? String(error ?? "")

  if (
    errorName === "QuotaExceededError" ||
    errorMessage.toLowerCase().includes("quota")
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
    errorMessage.toLowerCase().includes("security") ||
    errorMessage.toLowerCase().includes("insecure")
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
    errorMessage.toLowerCase().includes("indexeddb") &&
    errorMessage.toLowerCase().includes("not supported")
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
```

### 2.2 Penambahan Snapshot Persistensi di Repositori (`src/db/workspace-repository.ts`)

Menambahkan fungsi transaksi atomik untuk menuliskan seluruh entitas ruang kerja yang berada di memori ke IndexedDB dalam satu transaksi:

```typescript
export async function persistFullWorkspaceSnapshot(
  snapshot: HydratedWorkspaceBundle,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...snapshot.workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    [
      database.workspaces,
      database.dayConfigs,
      database.classes,
      database.subjects,
      database.teachers,
      database.rooms,
      database.requirements,
      database.sessions,
    ],
    async () => {
      await database.workspaces.put(updatedWorkspace)

      // Hari belajar
      await database.dayConfigs
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.dayConfigs.length > 0) {
        await database.dayConfigs.bulkPut(snapshot.dayConfigs)
      }

      // Master Data Kelas
      await database.classes
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.classes.length > 0) {
        await database.classes.bulkPut(snapshot.classes)
      }

      // Master Data Mata Pelajaran
      await database.subjects
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.subjects.length > 0) {
        await database.subjects.bulkPut(snapshot.subjects)
      }

      // Master Data Guru
      await database.teachers
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.teachers.length > 0) {
        await database.teachers.bulkPut(snapshot.teachers)
      }

      // Master Data Ruangan
      await database.rooms
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.rooms.length > 0) {
        await database.rooms.bulkPut(snapshot.rooms)
      }

      // Master Data Kebutuhan Pembelajaran
      await database.requirements
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.requirements.length > 0) {
        await database.requirements.bulkPut(snapshot.requirements)
      }

      // Data Sesi Jadwal
      await database.sessions
        .where("workspaceId")
        .equals(updatedWorkspace.id)
        .delete()
      if (snapshot.sessions.length > 0) {
        await database.sessions.bulkPut(snapshot.sessions)
      }
    }
  )

  return updatedWorkspace
}
```

### 2.3 Pembaruan Kontrak & Action Zustand Store (`src/store/use-workspace-store.ts`)

#### 2.3.1 Penambahan Properti State
```typescript
import type { StorageErrorInfo } from "@/domain/storage/storage-diagnostics"

export interface WorkspaceStoreState {
  // Properti yang sudah ada...
  saveStatus: SaveStatus
  lastSavedAt: string | null
  saveErrorMessage: string | null
  saveErrorInfo: StorageErrorInfo | null
  bootError: StorageErrorInfo | null

  // Action Baru / Diperbarui:
  retryPendingStorageSync: () => Promise<boolean>
  retrySaveWorkspaceSettings: () => Promise<boolean> // Memanggil retryPendingStorageSync demi kompatibilitas
}
```

#### 2.3.2 Implementasi `retryPendingStorageSync`
```typescript
retryPendingStorageSync: async () => {
  const state = get()
  if (!state.workspace) {
    return false
  }

  const currentSequence = ++mutationSequence
  set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })

  try {
    const updatedWorkspace = await workspaceRepo.persistFullWorkspaceSnapshot({
      workspace: state.workspace,
      dayConfigs: state.dayConfigs,
      classes: state.classes,
      subjects: state.subjects,
      teachers: state.teachers,
      rooms: state.rooms,
      requirements: state.requirements,
      sessions: state.sessions,
    })

    if (currentSequence === mutationSequence) {
      set({
        workspace: updatedWorkspace,
        saveStatus: "saved",
        lastSavedAt: updatedWorkspace.updatedAt,
        saveErrorMessage: null,
        saveErrorInfo: null,
      })
    }
    return true
  } catch (error) {
    if (currentSequence === mutationSequence) {
      const errorInfo = diagnoseStorageError(error)
      set({
        saveStatus: "error",
        saveErrorMessage: errorInfo.message,
        saveErrorInfo: errorInfo,
      })
    }
    return false
  }
}
```

#### 2.3.3 Aturan Anti-Race-Condition & Storage Honesty pada Seluruh Mutasi
Setiap fungsi mutasi (`placeUnscheduledSession`, `moveSession`, `updateSessionDetails`, `removeSession`, `undo`, `redo`, `createClassGroup`, dll.) wajib mengikuti pola:
1. Naikkan `currentSequence = ++mutationSequence`.
2. Ubah state memori dan jalankan validasi secara sinkron.
3. Set status sementara: `set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })`.
4. Jalankan Promise penulisan IndexedDB.
5. Bila penulisan **berhasil**: hanya jika `currentSequence === mutationSequence`, ubah `saveStatus: "saved"`, perbarui `lastSavedAt` ke timestamp ISO mutasi.
6. Bila penulisan **gagal**: hanya jika `currentSequence === mutationSequence`, jalankan `diagnoseStorageError(error)`, set `saveStatus: "error"`, `saveErrorMessage: errorInfo.message`, `saveErrorInfo: errorInfo`. **DILARANG KERAS** menyetel status ke `"saved"`.

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-FR10-01 — Zero Manual Save & Otomatisasi Persistensi
- **Given** pengguna berada di halaman aplikasi dengan penyimpanan lokal yang berfungsi normal,
- **When** pengguna melakukan tindakan penting apa pun (membuat kelas, menambah guru, menempatkan sesi jadwal via *drag-and-drop*, memindahkan sesi, atau menekan *Undo*),
- **Then** sistem otomatis menyimpan perubahan tersebut ke IndexedDB tanpa meminta pengguna menekan tombol simpan manual,
- **And** indikator penyimpanan segera menampilkan `"Menyimpan..."` lalu beralih ke `"Tersimpan di browser"` dengan stempel waktu yang diperbarui begitu penulisan selesai.

### AC-FR10-02 — Storage Honesty pada Kegagalan Penyimpanan (FR-10.5)
- **Given** peramban mengalami kegagalan penyimpanan lokal (misalnya kuota disk browser habis atau database terkunci),
- **When** pengguna melakukan modifikasi jadwal atau data master,
- **Then** sistem DILARANG menyatakan perubahan telah tersimpan (`saveStatus` tidak boleh bernilai `"saved"`),
- **And** sistem mengubah `saveStatus` menjadi `"error"`, menampilkan lencana `"Gagal menyimpan lokal"`, memunculkan banner peringatan destruktif di atas layar, dan menyertakan tombol `"Coba Simpan Ulang"`.

### AC-FR10-03 — Pemulihan Sesi & Data Ruang Kerja (AC-12)
- **Given** pengguna telah menyusun jadwal pembelajaran yang telah berstatus `"saved"`,
- **When** pengguna menutup tab/peramban lalu membuka kembali aplikasi pada peramban dan profil pengguna yang sama,
- **Then** fungsi `bootWorkspace()` memulihkan seluruh data ruang kerja, konfigurasi hari, seluruh data master, daftar sesi jadwal, dan kelas aktif terakhir (`activeClassId`) secara presisi tanpa ada data yang hilang.

### AC-FR10-04 — Universal Storage Retry (`retryPendingStorageSync`)
- **Given** sistem berada dalam status `saveStatus === "error"` setelah kegagalan penyimpanan sesi atau data master,
- **When** pengguna menekan tombol `"Coba Simpan Ulang"`,
- **Then** sistem memanggil `retryPendingStorageSync()` yang mencoba menulis ulang seluruh snapshot state memori terkini ke IndexedDB,
- **And** jika operasi berhasil, `saveStatus` kembali menjadi `"saved"`, banner peringatan tertutup, dan data tersimpan sinkron dengan kondisi memori.

### AC-FR10-05 — Diagnostik Khusus Kuota Penuh dan Pemblokiran Akses
- **Given** browser melempar galat spesifik `QuotaExceededError` atau `SecurityError`,
- **When** kegagalan penyimpanan terjadi,
- **Then** sistem menampilkan pesan diagnostik spesifik dalam bahasa Indonesia yang memandu pengguna mengambil tindakan (misalnya membersihkan data situs atau beralih dari jendela penyamaran), bukan sekadar pesan kesalahan umum.

### AC-FR10-06 — Popover Rincian Persistensi & Disclaimer Keamanan (NFR-03)
- **Given** lencana status penyimpanan berada pada kondisi `"Tersimpan di browser"`,
- **When** pengguna mengeklik lencana tersebut,
- **Then** sistem membuka Popover yang menampilkan:
  1. Stempel waktu terakhir disimpan dalam format jam 24 jam (`HH:mm:ss`, `tabular-nums`),
  2. Status media penyimpanan lokal IndexedDB,
  3. Disclaimer resmi PRD: *"Penyimpanan ini tersimpan di browser perangkat ini. Selalu ekspor ke PDF atau Excel secara berkala sebagai salinan cadangan."*

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Fase RED — QA Engineer (Automated Test Suite)

1. **Task QA-10.1: Unit Test Diagnostik Galat Penyimpanan**
   - **File:** `src/__tests__/unit/storage-diagnostics.spec.ts`
   - **Skenario Pengujian:**
     - Menguji `diagnoseStorageError` dengan objek `DOMException` bertipe `"QuotaExceededError"` menghasilkan kode `QUOTA_EXCEEDED` dan `isRetryable: true`.
     - Menguji dengan error bertipe `"SecurityError"` menghasilkan kode `STORAGE_BLOCKED` dan `isRetryable: false`.
     - Menguji pesan error browser umum menghasilkan kode `TRANSACTION_FAILURE`.
     - Memverifikasi bahwa seluruh pesan dan panduan tindakan pengguna menggunakan bahasa Indonesia yang jelas tanpa karakter *em dash* (`—`).

2. **Task QA-10.2: Integration Test Auto-Save, Storage Honesty & Universal Retry**
   - **File:** `src/__tests__/integration/local-auto-save-store.spec.ts`
   - **Skenario Pengujian:**
     - **AC-FR10-01:** Verifikasi bahwa mutasi sesi (`placeUnscheduledSession`, `moveSession`, `removeSession`, `updateSessionDetails`) otomatis tersimpan ke IndexedDB dan memperbarui `saveStatus` menjadi `"saved"` serta `lastSavedAt`.
     - **AC-FR10-02:** Verifikasi *Storage Honesty* dengan menyuntikkan kegagalan/mock error pada transaksi IndexedDB: `saveStatus` wajib menjadi `"error"`, `saveErrorInfo` terisi, dan `saveStatus` TIDAK BOLEH bernilai `"saved"`.
     - **AC-FR10-03 (AC-12):** Menguji siklus *hydration*: simpan ruang kerja, kelas, dan beberapa sesi, lalu panggil ulang `loadOrSeedWorkspace()` dan verifikasi seluruh data termasuk `activeClassId` pulih utuh.
     - **AC-FR10-04:** Menguji `retryPendingStorageSync()`: setelah kegagalan buatan disimulasikan, pemanggilan retry berhasil menuliskan seluruh state snapshot ke database dan mengembalikan `saveStatus` ke `"saved"`.
     - Verifikasi pencegahan *race condition*: beberapa mutasi cepat beruntun tidak menyebabkan status mutasi lama menimpa status mutasi yang lebih baru.

3. **Task QA-10.3: Component Test UI Resilience & Persistence Popover**
   - **File:** `src/__tests__/components/save-status-resilience-ui.spec.tsx`
   - **Skenario Pengujian:**
     - Menguji render `SaveStatusBadge` pada ketiga kondisi (`saving`, `saved`, `error`).
     - Menguji interaksi klik pada badge `saved` membuka Popover yang menampilkan stempel waktu `HH:mm:ss` dan disclaimer cadangan.
     - Menguji render banner destruktif di `AppShell` saat `saveStatus === "error"`, serta verifikasi klik tombol "Coba Simpan Ulang" memicu aksi retry store.
     - Menguji Fallback Screen di `AppShell` apabila booting awal gagal total.

---

### 4.2 Fase GREEN — Frontend Engineer (Implementasi Produksi)

1. **Task FE-10.1: Implementasi Modul Diagnostik Penyimpanan**
   - **File:** `src/domain/storage/storage-diagnostics.ts`
   - **Pekerjaan:** Tulis fungsi murni `diagnoseStorageError` sesuai kontrak Bagian 2.1. Pastikan zero `any` dan tidak mengimpor modul React/DOM yang tidak perlu.

2. **Task FE-10.2: Implementasi Snapshot Persistensi di Repositori**
   - **File:** `src/db/workspace-repository.ts`
   - **Pekerjaan:** Tambahkan fungsi `persistFullWorkspaceSnapshot` yang membungkus seluruh tabel ruang kerja ke dalam satu transaksi atomik Dexie `database.transaction("rw", [...], async () => { ... })`.

3. **Task FE-10.3: Penyempurnaan Auto-Save & Universal Retry di Zustand Store**
   - **File:** `src/store/use-workspace-store.ts`
   - **Pekerjaan:**
     - Tambahkan properti `saveErrorInfo` dan `bootError` ke antarmuka state.
     - Implementasikan `retryPendingStorageSync()` menggunakan `persistFullWorkspaceSnapshot`.
     - Integrasikan `diagnoseStorageError` ke seluruh blok `catch` pada mutasi sesi, master data, dan pengaturan ruang kerja.
     - Perbarui penanganan error pada `bootWorkspace()` agar menyetel `isHydrating: false`, `saveStatus: "error"`, dan mengisi `bootError`.

4. **Task FE-10.4: Penyempurnaan Komponen UI (`SaveStatusBadge` & `AppShell`)**
   - **File:** `src/components/layout/save-status-badge.tsx` dan `src/components/layout/app-shell.tsx`
   - **Pekerjaan:**
     - Tambahkan Popover shadcn/ui (`Popover`, `PopoverTrigger`, `PopoverContent`) pada `SaveStatusBadge` untuk menyajikan rincian waktu simpan terakhir (`HH:mm:ss`), estimasi kuota penyimpanan (`navigator.storage.estimate()` dipanggil secara aman), dan disclaimer cadangan.
     - Perbarui tombol "Coba Simpan Ulang" di `SaveStatusBadge` dan banner `AppShell` agar memanggil `retryPendingStorageSync()`.
     - Tambahkan Fallback Screen di `AppShell` jika `bootError !== null` (menampilkan kartu kesalahan, instruksi privasi/kuota, dan tombol "Muat Ulang Halaman").

---

### 4.3 Fase REFACTOR & Quality Gate

1. **Verifikasi Tipe Data & Linting:**
   ```bash
   bun run typecheck
   bun run lint
   ```
2. **Eksekusi Seluruh Test Suite:**
   ```bash
   bun run test
   ```
3. **Verifikasi Build Produksi:**
   ```bash
   bun run build
   ```
4. **Pembaruan Knowledge Graph (`graphify`):**
   ```bash
   /usr/local/share/uv/tools/graphifyy/bin/python -m graphify . --update
   ```
