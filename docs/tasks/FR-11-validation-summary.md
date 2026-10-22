# Spesifikasi Task & Kontrak Teknis: FR-11 — Ringkasan Validasi (Validation Summary & Status Breakdown)

**Kode Fitur:** `FR-11` (Didukung oleh `AC-13`, `FR-05`, `FR-06`, `FR-10`, `NFR-01`, `NFR-02`, `NFR-05`, `NFR-06`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md) (Bagian 5, 7, 8, 11, 12, 13)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md) (Bagian 5.2, 5.4)
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
  - [`docs/tasks/FR-10-local-auto-save.md`](./FR-10-local-auto-save.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran arsitektur dan modul ketergantungan:
- **Pondasi Domain Engine:**
  - Tipe data validasi telah didefinisikan secara komprehensif di [`src/domain/types/validation.ts`](../../src/domain/types/validation.ts), memuat `ValidationStatus`, `VALIDATION_STATUS_LABELS`, `ScopeValidationSummary`, dan `WorkspaceValidationReport`.
  - Fungsi evaluasi murni `evaluateWorkspaceValidation` di [`src/domain/validation/workspace-validator.ts`](../../src/domain/validation/workspace-validator.ts) telah mengompilasi laporan validasi global (`workspaceSummary`) dan per kelas (`byClassId`).
  - Store Zustand [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) secara reaktif mengevaluasi validasi setiap kali terjadi mutasi data (sesi, master data, konfigurasi waktu, atau undo/redo).
- **Kesenjangan (Gaps) Presentasi UI yang Wajib Diselesaikan:**
  1. *Dual-Scope Presentation:* Sesuai **FR-11**, sistem wajib menyediakan ringkasan validasi untuk **kelas aktif** serta **ruang kerja**. Saat ini `ConflictStatusBadge` hanya menampilkan status global ruang kerja, sehingga pengguna tidak dapat melihat status kelas aktif secara langsung.
  2. *Penyajian 5 Metrik Minimal:* Belum ada komponen ringkasan yang menampilkan kelima metrik wajib (Sesi Terjadwal, Sesi Belum Ditempatkan, Konflik Aktif, Peringatan Kelengkapan, dan Status Validasi) secara terpadu.
  3. *Penegakan Larangan Validasi Prematur (AC-13):* Sistem dilarang keras menyatakan "Jadwal lengkap dan valid" jika masih ada kebutuhan mengajar di sekolah yang belum terpenuhi, meskipun tidak ada bentrokan waktu. Perlu dipastikan antarmuka menyajikan alasan ketidaklengkapan secara gamblang.
  4. *Matriks Status Per Kelas (Class Validation Breakdown):* Staf kurikulum memerlukan ikhtisar cepat seluruh kelas di sekolah untuk melihat kelas mana saja yang masih memiliki konflik atau belum lengkap, serta dapat melompat langsung ke kelas tersebut dengan satu klik.

### 1.2 Referensi Persyaratan
- **FR-11 (Ringkasan Validasi — PRD Bagian 5):**
  - Sistem menyediakan ringkasan validasi untuk kelas aktif serta ruang kerja.
  - **Informasi Minimal:**
    1. Jumlah sesi telah dijadwalkan (`scheduledSessionsCount`).
    2. Jumlah sesi yang belum ditempatkan (`unscheduledSessionsCount`).
    3. Jumlah konflik aktif (`activeConflictsCount`).
    4. Jumlah peringatan kelengkapan (`completenessWarningsCount`).
    5. Status validasi (`status` & `statusLabel`).
  - **Pembedaan Tegas 4 Status Validasi:**
    1. **Konflik ditemukan (`CONFLICT_DETECTED`):** Ada satu atau lebih konflik bentrokan waktu pada data saat ini.
    2. **Belum lengkap (`INCOMPLETE`):** Kebutuhan sesi atau informasi wajib belum terpenuhi.
    3. **Tidak ada konflik terdeteksi pada data saat ini (`NO_CONFLICT_CURRENT_DATA`):** Sistem tidak menemukan konflik pada data saat ini (kelas aktif lengkap dan bebas konflik, namun ruang kerja global masih belum selesai).
    4. **Jadwal lengkap dan valid (`COMPLETE_AND_VALID`):** Seluruh kebutuhan wajib pada seluruh kelas di ruang kerja telah terpenuhi dan tidak ada konflik yang terdeteksi.
  - *Ketentuan Larangan Tegas:* Sistem tidak boleh menyatakan seluruh sekolah bebas konflik jika jadwal masih belum lengkap atau informasi yang diperlukan belum tersedia.
- **AC-13 (Validasi Tidak Lengkap — PRD Bagian 12):**
  - **Given** belum semua kebutuhan sesi di seluruh ruang kerja terpenuhi,
  - **When** tidak terdapat konflik pada sesi yang sudah ditempatkan,
  - **Then** sistem tidak menyatakan seluruh jadwal lengkap dan valid (`COMPLETE_AND_VALID`).
- **PRD Bagian 7.2 & 7.3 (Prinsip Visual & Aksesibilitas):**
  - Indikator status tidak boleh bergantung pada warna saja; wajib disertai ikon dan teks penjelasan yang jelas dalam Bahasa Indonesia.
  - Angka metrik menggunakan angka numerik terformat rapi (`tabular-nums`).

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Penyusun jadwal di sekolah sering kali merasa jadwal satu kelas sudah selesai karena tidak ada warna merah (bentrokan), namun lupa bahwa masih ada 4 jam pelajaran Matematika yang belum ditarik ke grid, atau ada kelas lain yang bentrok dengan guru yang sama. Tanpa ringkasan validasi yang tegas dan transparan, sekolah berisiko menerbitkan jadwal yang cacat.
- **Cakupan Fitur (In-Scope):**
  1. Komponen baru `ValidationSummaryCards` (`src/components/conflicts/validation-summary-cards.tsx`) untuk merender 5 metrik minimal dengan kartu grid responsif.
  2. Peningkatan komponen `ConflictListPanel` (`src/components/conflicts/conflict-list-panel.tsx`) menjadi panel dialog terpadu: **"Ringkasan Validasi dan Daftar Konflik"** dengan pemilih cakupan (*Scope Switcher*: Kelas Aktif vs Seluruh Ruang Kerja) dan Matriks Kelengkapan Seluruh Kelas (*Class Validation Breakdown Table*).
  3. Peningkatan komponen `ConflictStatusBadge` (`src/components/conflicts/conflict-status-badge.tsx`) untuk mendukung tampilan status per cakupan (*scope*) atau status gabungan yang informatif.
  4. Penambahan selector terpadu di Zustand Store `useWorkspaceStore`: `getWorkspaceValidationSummary()` dan `getAllClassesValidationSummaries()`.
  5. Pengujian komprehensif: unit test matriks 4 status validasi, integration test store selectors, dan component test antarmuka dual-scope summary.
- **Di Luar Cakupan Fitur (Out-of-Scope):**
  - Fitur penjadwalan otomatis (*AI auto-scheduling*) atau penyelesaian konflik otomatis dengan satu klik (penjadwalan manual yang terkendali adalah inti dari Schedovyn).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Penegasan Kontrak Tipe Validasi (`src/domain/types/validation.ts`)

Memastikan tipe domain bebas dari `any` dan sesuai dengan spesifikasi PRD FR-11 & TDD Bagian 5.4:

```typescript
export type ValidationStatus =
  | "CONFLICT_DETECTED"
  | "INCOMPLETE"
  | "NO_CONFLICT_CURRENT_DATA"
  | "COMPLETE_AND_VALID"

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  CONFLICT_DETECTED: "Konflik ditemukan",
  INCOMPLETE: "Belum lengkap",
  NO_CONFLICT_CURRENT_DATA: "Tidak ada konflik pada data saat ini",
  COMPLETE_AND_VALID: "Jadwal lengkap dan valid",
}

export interface ScopeValidationSummary {
  status: ValidationStatus
  statusLabel: string
  scheduledSessionsCount: number
  unscheduledSessionsCount: number
  activeConflictsCount: number
  completenessWarningsCount: number
  conflicts: ScheduleConflict[]
  warnings: CompletenessWarning[]
}

export interface ClassValidationMatrixItem {
  classGroup: ClassGroup
  summary: ScopeValidationSummary
}
```

### 2.2 Penambahan Selector Reaktif di Zustand Store (`src/store/use-workspace-store.ts`)

Menambahkan selector terstandarisasi untuk mempermudah konsumsi data validasi oleh komponen UI tanpa kalkulasi ulang:

```typescript
export interface WorkspaceStoreState {
  // Properti eksisting...
  validationReport: WorkspaceValidationReport | null

  // Selector FR-11:
  getWorkspaceValidationSummary: () => ScopeValidationSummary | null
  getActiveClassValidationSummary: () => ScopeValidationSummary | null
  getAllClassesValidationSummaries: () => ClassValidationMatrixItem[]
}
```

Implementasi selector:
```typescript
getWorkspaceValidationSummary: () => {
  const { validationReport } = get()
  return validationReport?.workspaceSummary ?? null
},

getActiveClassValidationSummary: () => {
  const { validationReport, workspace } = get()
  if (!validationReport || !workspace?.activeClassId) return null
  return validationReport.byClassId[workspace.activeClassId] ?? null
},

getAllClassesValidationSummaries: () => {
  const { validationReport, classes } = get()
  if (!validationReport) return []
  return classes.map((classGroup) => ({
    classGroup,
    summary: validationReport.byClassId[classGroup.id] ?? {
      status: "INCOMPLETE",
      statusLabel: VALIDATION_STATUS_LABELS.INCOMPLETE,
      scheduledSessionsCount: 0,
      unscheduledSessionsCount: 0,
      activeConflictsCount: 0,
      completenessWarningsCount: 0,
      conflicts: [],
      warnings: [],
    },
  }))
},
```

### 2.3 Matriks Keputusan Status Validasi (TDD Bagian 5.4)

Pemeriksaan status mengikuti aturan deterministik berikut:

| Cakupan | Konflik Aktif | Sesi Belum Terjadwal | Peringatan Kelengkapan | Kondisi Sekolah Global | Status yang Dihasilkan |
|---|---|---|---|---|---|
| **Global / Kelas** | $> 0$ | Berapa pun | Berapa pun | Apa pun | `CONFLICT_DETECTED` |
| **Global Ruang Kerja** | $0$ | $> 0$ ATAU `totalReq === 0` | $> 0$ ATAU ada kelas belum lengkap | Belum semua kelas lengkap | `INCOMPLETE` |
| **Global Ruang Kerja** | $0$ | $0$ | $0$ | Seluruh kelas lengkap & memiliki sesi | `COMPLETE_AND_VALID` |
| **Kelas Aktif** | $0$ | $> 0$ | Berapa pun | Apa pun | `INCOMPLETE` |
| **Kelas Aktif** | $0$ | $0$ | $0$ | Sekolah global masih `INCOMPLETE` / berkonflik | `NO_CONFLICT_CURRENT_DATA` |
| **Kelas Aktif** | $0$ | $0$ | $0$ | Seluruh sekolah `COMPLETE_AND_VALID` | `COMPLETE_AND_VALID` |

### 2.4 Spesifikasi Komponen Presentasi

#### 2.4.1 Komponen `ValidationSummaryCards` (`src/components/conflicts/validation-summary-cards.tsx`)
Komponen visual modular untuk merender 5 metrik minimal:
- **Props:**
  ```typescript
  export interface ValidationSummaryCardsProps {
    summary: ScopeValidationSummary
    scopeTitle: string              // Contoh: "Kelas VII-A" atau "Seluruh Ruang Kerja"
    scopeDescription?: string
    className?: string
  }
  ```
- **Struktur Kartu Grid (5 Metrik):**
  1. **Status Validasi:** Badge besar dengan ikon spesifik (`AlertCircleIcon`, `AlertTriangleIcon`, `InfoIcon`, atau `CheckCircle2Icon`), label status, dan ringkasan kondisi.
  2. **Sesi Terjadwal:** Nilai `scheduledSessionsCount` (`tabular-nums`, font-semibold) dengan ikon kalender.
  3. **Sesi Belum Ditempatkan:** Nilai `unscheduledSessionsCount` (`tabular-nums`, teks bernuansa amber jika $> 0$) dengan ikon berkas sesi.
  4. **Konflik Aktif:** Nilai `activeConflictsCount` (`tabular-nums`, teks bernuansa merah jika $> 0$) dengan ikon bentrokan.
  5. **Peringatan Kelengkapan:** Nilai `completenessWarningsCount` (`tabular-nums`, teks bernuansa amber jika $> 0$) dengan ikon peringatan.

#### 2.4.2 Peningkatan Komponen `ConflictListPanel` (`src/components/conflicts/conflict-list-panel.tsx`)
Penyempurnaan panel dialog menjadi pusat informasi kelayakan jadwal:
1. **Header Dialog:**
   - Judul: **"Ringkasan Validasi dan Daftar Konflik"**.
   - Deskripsi: Penjelasan bahwa informasi mencakup kesehatan jadwal kelas aktif dan seluruh ruang kerja sekolah.
2. **Kontrol Pemilih Cakupan (*Scope Selector*):**
   - Tombol segmented: **"Kelas Aktif: [Nama Kelas]"** vs **"Seluruh Ruang Kerja"**.
   - Mengubah tampilan `ValidationSummaryCards` secara dinamis sesuai cakupan yang dipilih.
3. **Tab Konten:**
   - **Tab Ringkasan & Matriks Kelas:** Menampilkan `ValidationSummaryCards` serta tabel interaktif **Matriks Status Seluruh Kelas** (*Class Validation Breakdown Table*). Staf kurikulum dapat melihat daftar kelas, sesi terjadwal vs belum terjadwal, jumlah konflik, dan status validasi masing-masing kelas, serta tombol "Buka Jadwal Kelas Ini" untuk berpindah kelas secara instan.
   - **Tab Bentrokan Waktu (`conflicts`):** Daftar detail bentrokan waktu dengan tombol pintas navigasi ke sesi dan kelas yang berkonflik.
   - **Tab Catatan Kelengkapan (`warnings`):** Daftar peringatan alokasi jam mengajar yang belum terpenuhi atau guru yang belum ditentukan.

#### 2.4.3 Peningkatan Komponen `ConflictStatusBadge` (`src/components/conflicts/conflict-status-badge.tsx`)
Mendukung properti cakupan agar dapat digunakan secara fleksibel:
```typescript
export interface ConflictStatusBadgeProps {
  scope?: "workspace" | "active-class" | "dual"
  onOpenConflictList?: () => void
  className?: string
}
```
- Menampilkan status dengan kombinasi multi-isyarat: ikon, teks label, dan warna latar kontras tinggi.
- Tooltip informatif saat kursor diarahkan: menampilkan ringkasan jumlah konflik dan status kelengkapan.

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-FR11-01 — Penyajian 5 Metrik Minimal
- **Given** pengguna membuka panel atau dialog ringkasan validasi,
- **When** sistem menampilkan ringkasan validasi,
- **Then** sistem wajib menyajikan secara transparan 5 metrik minimal:
  1. Jumlah sesi telah dijadwalkan (`scheduledSessionsCount`),
  2. Jumlah sesi yang belum ditempatkan (`unscheduledSessionsCount`),
  3. Jumlah konflik aktif (`activeConflictsCount`),
  4. Jumlah peringatan kelengkapan (`completenessWarningsCount`),
  5. Status validasi beserta label deskriptif dalam Bahasa Indonesia.

### AC-FR11-02 — Penyajian Dual-Scope (Kelas Aktif vs Ruang Kerja)
- **Given** ruang kerja memiliki beberapa kelas dan satu kelas aktif sedang dipilih,
- **When** pengguna memeriksa ringkasan validasi,
- **Then** sistem menyediakan informasi yang dapat dialihkan atau disandingkan antara cakupan **Kelas Aktif** dan cakupan **Seluruh Ruang Kerja**.

### AC-FR11-03 — Pembedaan Tegas 4 Status Validasi Sesuai PRD
- **Given** berbagai kondisi jadwal pembelajaran,
- **When** sistem menghitung laporan validasi,
- **Then** status validasi harus membedakan dengan tepat:
  1. `"CONFLICT_DETECTED"` jika terdapat minimal 1 konflik waktu,
  2. `"INCOMPLETE"` jika tidak ada konflik tetapi ada sesi yang belum ditempatkan atau kebutuhan belum terpenuhi,
  3. `"NO_CONFLICT_CURRENT_DATA"` jika kelas aktif telah lengkap dan bebas konflik sementara ruang kerja global masih belum selesai,
  4. `"COMPLETE_AND_VALID"` jika seluruh kelas di sekolah lengkap terpenuhi dan tidak ada satu pun konflik di ruang kerja.

### AC-FR11-04 — Penegakan Larangan Validasi Prematur (AC-13)
- **Given** belum semua kebutuhan sesi di seluruh ruang kerja terpenuhi (masih ada sesi yang belum dijadwalkan),
- **When** seluruh sesi yang sudah ditempatkan tidak memiliki konflik bentrokan waktu,
- **Then** sistem DILARANG menyatakan status global ruang kerja sebagai `"COMPLETE_AND_VALID"`,
- **And** sistem wajib menetapkan status global sebagai `"INCOMPLETE"`.

### AC-FR11-05 — Status Bebas Konflik Parsial untuk Kelas Aktif
- **Given** kelas aktif VIII-A telah menjadwalkan seluruh kebutuhan sesinya tanpa ada konflik bentrokan,
- **And** kelas lain (misalnya VII-A) masih memiliki 3 sesi yang belum dijadwalkan,
- **When** sistem mengevaluasi validasi,
- **Then** kelas aktif VIII-A mendapatkan status `"NO_CONFLICT_CURRENT_DATA"` ("Tidak ada konflik pada data saat ini"),
- **And** ruang kerja global tetap berstatus `"INCOMPLETE"` ("Belum lengkap").

### AC-FR11-06 — Matriks Kelengkapan Seluruh Kelas & Navigasi Cepat
- **Given** pengguna membuka tab Ringkasan Validasi pada dialog,
- **When** pengguna melihat tabel Matriks Status Kelas,
- **Then** sistem menyajikan baris untuk setiap kelas yang memuat nama kelas, jumlah sesi terjadwal, sisa sesi belum terjadwal, jumlah konflik, dan status validasi,
- **And** mengeklik tombol "Buka Jadwal" pada salah satu kelas langsung mengaktifkan kelas tersebut sebagai kelas aktif dan menutup dialog.

### AC-FR11-07 — Multi-Isyarat Visual & Aksesibilitas
- **Given** pengguna melihat indikator atau lencana status validasi di antarmuka,
- **When** status dirender,
- **Then** sistem tidak hanya menggunakan perbedaan warna semata, melainkan selalu menyertakan ikon pembeda dan teks label berbahasa Indonesia serta atribut `aria-label` yang sesuai bagi pembaca layar (*screen reader*).

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Fase RED — QA Engineer (Automated Test Suite)

1. **Task QA-11.1: Unit Test Matriks Penentuan Status Validasi**
   - **File:** `src/__tests__/unit/domain/validation-status-matrix.spec.ts`
   - **Skenario Pengujian:**
     - Menguji skenario `CONFLICT_DETECTED` saat ada bentrokan guru lintas kelas, ruangan, atau jam sekolah.
     - Menguji skenario `INCOMPLETE` saat ada sesi belum terjadwal meskipun 0 bentrokan waktu (**AC-13**).
     - Menguji skenario `NO_CONFLICT_CURRENT_DATA` untuk kelas aktif yang tuntas sementara kelas lain belum tuntas.
     - Menguji skenario `COMPLETE_AND_VALID` saat 100% kebutuhan seluruh kelas di sekolah telah terjadwalkan tanpa bentrokan.
     - Menguji ruang kerja kosong (belum ada kelas/kebutuhan) menghasilkan status `INCOMPLETE`.

2. **Task QA-11.2: Integration Test Store Validation Selectors**
   - **File:** `src/__tests__/integration/validation-summary-store.spec.ts`
   - **Skenario Pengujian:**
     - Menguji selector `getWorkspaceValidationSummary()` mengembalikan 5 metrik yang akurat sesuai kondisi store.
     - Menguji selector `getActiveClassValidationSummary()` mengembalikan ringkasan kelas aktif secara reaktif.
     - Menguji selector `getAllClassesValidationSummaries()` mengembalikan daftar lengkap seluruh kelas beserta ringkasan status masing-masing.
     - Menguji revalidasi otomatis saat sesi ditarik, dipindahkan, atau dilepas dari grid.

3. **Task QA-11.3: Component Test UI Ringkasan Validasi Dual-Scope**
   - **File:** `src/__tests__/components/validation-summary-ui.spec.tsx`
   - **Skenario Pengujian:**
     - Menguji render `ValidationSummaryCards` menampilkan 5 kartu metrik dengan angka numerik dan badge status yang tepat.
     - Menguji dialog `ConflictListPanel` memiliki kontrol alih cakupan (*Scope Switcher*: Kelas Aktif vs Seluruh Ruang Kerja).
     - Menguji tabel Matriks Status Kelas menampilkan seluruh kelas dan tombol navigasi berpindah kelas berfungsi memperbarui `activeClassId`.
     - Menguji `ConflictStatusBadge` menampilkan ikon dan label teks yang sesuai untuk keempat jenis status validasi.

---

### 4.2 Fase GREEN — Frontend Engineer (Implementasi Produksi)

1. **Task FE-11.1: Implementasi Selector Validasi di Zustand Store**
   - **File:** `src/store/use-workspace-store.ts`
   - **Pekerjaan:** Tambahkan fungsi selector `getWorkspaceValidationSummary()` dan `getAllClassesValidationSummaries()` pada `WorkspaceStoreState` sesuai kontrak Bagian 2.2.

2. **Task FE-11.2: Pembuatan Komponen `ValidationSummaryCards`**
   - **File:** `src/components/conflicts/validation-summary-cards.tsx`
   - **Pekerjaan:**
     - Buat komponen murni yang merender 5 kartu metrik (Status Validasi, Sesi Terjadwal, Sesi Belum Ditempatkan, Konflik Aktif, Peringatan Kelengkapan).
     - Terapkan gaya Tailwind CSS v4, font `tabular-nums` untuk angka, dan variasi warna/ikon yang kontras sesuai status.

3. **Task FE-11.3: Peningkatan Dialog `ConflictListPanel`**
   - **File:** `src/components/conflicts/conflict-list-panel.tsx`
   - **Pekerjaan:**
     - Ubah judul dialog menjadi **"Ringkasan Validasi dan Daftar Konflik"**.
     - Tambahkan bilah pemilih cakupan (Kelas Aktif vs Seluruh Ruang Kerja).
     - Sematkan `ValidationSummaryCards` pada bagian atas dialog.
     - Tambahkan tab/bagian **Matriks Kelengkapan Kelas** yang menampilkan tabel ringkasan status setiap kelas dengan tombol aksi "Buka Jadwal".
     - Integrasikan filter daftar konflik dan peringatan.

4. **Task FE-11.4: Peningkatan Komponen `ConflictStatusBadge` & Integrasi Toolbar**
   - **File:** `src/components/conflicts/conflict-status-badge.tsx` dan `src/components/timetable/editor-toolbar.tsx`
   - **Pekerjaan:**
     - Tambahkan dukungan prop `scope?: "workspace" | "active-class" | "dual"`.
     - Perbarui rendering lencana pada `EditorToolbar` agar menyajikan informasi status yang lebih komprehensif dan intuitif.

---

### 4.3 Fase REFACTOR & Quality Gate

1. **Pemeriksaan Tipe Data & Gaya Kode:**
   ```bash
   bun run typecheck
   bun run lint
   ```
2. **Eksekusi Pengujian Otomatis:**
   ```bash
   bun run test
   ```
3. **Verifikasi Build Produksi:**
   ```bash
   bun run build
   ```
4. **Pembaruan Knowledge Graph (`graphify`):**
   ```bash
   GRAPHIFY_BACKEND=none /usr/local/share/uv/tools/graphifyy/bin/python -m graphify . --update
   ```
