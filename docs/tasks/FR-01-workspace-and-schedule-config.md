# Spesifikasi Task & Kontrak Teknis: FR-01 — Pengaturan Ruang Kerja dan Jam Belajar

**Kode Fitur:** `FR-01` (Didukung oleh fondasi `FR-05.7`, `FR-10`, `AC-05`, `AC-12`, `NFR-02`, `NFR-05`, `NFR-06`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran *knowledge graph* pada [`graphify-out/graph.json`](../../graphify-out/graph.json) dan [`graphify-out/GRAPH_REPORT.md`](../../graphify-out/GRAPH_REPORT.md):
- **Node Domain & Arsitektur Terkait:**
  - `Workspace & DayScheduleConfig Entities` (`docs/Schedovyn-TDD.md` L210-L229, Community 17: *Timetable Domain & Editor Model*) terhubung langsung dengan `Master Data Entities` dan menjadi fondasi perhitungan untuk `TimetableSession` serta *Smart Conflict Engine*.
  - `SchedovynDatabase (Dexie IndexedDB Schema)` dan `Zustand Store, HistoryManager (Undo/Redo), & StorageSyncManager` (Community 15: *Conflict Engine & Local Storage*) menangani persistensi lokal di browser.
- **Kondisi Repositori Saat Ini (`src/`):**
  - Saat ini baru tersedia halaman awal [`src/pages/main-page.tsx`](../../src/pages/main-page.tsx), konfigurasi rute [`src/route/index.tsx`](../../src/route/index.tsx), [`src/components/theme-provider.tsx`](../../src/components/theme-provider.tsx), dan 17 komponen primitif `radix-lyra` di `src/components/ui/`.
  - Direktori `src/domain/`, `src/db/`, `src/store/`, `src/components/layout/`, `src/components/workspace/`, `src/pages/settings-page.tsx`, serta perangkat pengujian (`vitest`, `@testing-library/react`, `fake-indexeddb`) belum diinisialisasi.

### 1.2 Referensi Persyaratan
- **FR-01 (Pengaturan Ruang Kerja dan Jam Belajar):** Pengguna dapat mengatur nama ruang kerja/sekolah, label tahun ajaran/semester, hari pembelajaran (termasuk opsi hari Sabtu), jam mulai & berakhir pembelajaran per hari (format 24 jam, dapat berbeda antarhari), interval snap grid (default `15` menit), serta periode istirahat per hari.
- **FR-05.7 & AC-05 (Aturan Perhitungan Interval Waktu):** Dua interval waktu `[startA, endA)` dan `[startB, endB)` bertabrakan jika dan hanya jika `startA < endB && startB < endA`. Dua rentang yang berbatasan tepat (misalnya `09:30-10:00` dan `10:00-10:15`) **tidak boleh** dianggap bertabrakan.
- **FR-10 & AC-12 (Penyimpanan Otomatis Lokal):** Perubahan disimpan secara otomatis ke IndexedDB, dipulihkan ketika browser dibuka kembali, menampilkan status penyimpanan secara jujur (`Menyimpan...`, `Tersimpan di browser`, atau `Gagal menyimpan lokal`), dan tidak pernah mengklaim tersimpan apabila operasi penyimpanan gagal.
- **NFR-05 (Separation of Concerns):** Seluruh logika di `src/domain/` wajib berupa *pure TypeScript functions* tanpa mengimpor React, DOM API, maupun Dexie.

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Setiap sekolah memiliki struktur hari aktif yang berbeda (5 hari Senin-Jumat atau 6 hari termasuk Sabtu), jam pulang yang berbeda antarhari (contoh: Jumat selesai pukul `11:30`), ukuran slot grid yang bervariasi (`5`, `10`, `15`, `30`, `60` menit), serta jadwal istirahat/ishoma yang tidak boleh ditempati sesi pelajaran.
- **Cakupan Dalam Task Ini (In-Scope):**
  1. Kontrak tipe data domain (`src/domain/types/entities.ts`).
  2. Utilitas matematika waktu 24 jam dan fungsi irisan interval (`src/domain/time/`).
  3. Validator konfigurasi ruang kerja dan jadwal harian (`src/domain/validation/workspace-config-validator.ts`).
  4. Skema database Dexie (`schedovyn_local_db`), *seed default workspace*, dan repositori transaksional (`src/db/`).
  5. Store Zustand (`src/store/use-workspace-store.ts`) untuk hidrasi, mutasi pengaturan ruang kerja/hari/istirahat, dan sinkronisasi *auto-save* ke IndexedDB.
  6. Komponen tata letak utama (`AppShell`, `TopNavbar`, `SaveStatusBadge`) dan halaman `SettingsPage` (`/settings`) beserta rute navigasi dasarnya.
- **Di Luar Cakupan Task Ini (Out-of-Scope):**
  - Tabel CRUD Data Master Kelas, Guru, Mapel, Ruangan, dan Kebutuhan Pembelajaran (`FR-02`).
  - Editor Jadwal Drag-and-Drop (`FR-03`, `FR-04`, `FR-06`).
  - Ekspor PDF & Excel (`FR-08`, `FR-09`).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Kontrak Tipe Entitas Domain (`src/domain/types/entities.ts`)

Seluruh tipe wajib didefinisikan tanpa menggunakan `any`:

```typescript
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Format 24 jam "HH:mm", misalnya "07:00" atau "13:45" */
export type TimeString = `${number}${number}:${number}${number}`;

export type SnapIntervalMinutes = 5 | 10 | 15 | 30 | 60;

export type RoomType = "classroom" | "laboratory" | "sports" | "hall" | "other";

export type SubjectColorKey =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "cyan"
  | "orange"
  | "teal"
  | "indigo"
  | "slate";

export const ORDERED_DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  sunday: "Minggu",
};

export const SNAP_INTERVAL_OPTIONS: readonly SnapIntervalMinutes[] = [
  5, 10, 15, 30, 60,
] as const;

export interface TimeInterval {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  label?: string;
}

export interface BreakInterval {
  id: string;
  startTime: TimeString;
  endTime: TimeString;
  label: string; // contoh: "Istirahat Pertama", "Ishoma"
}

export interface DayScheduleConfig {
  id: string;
  workspaceId: string;
  dayOfWeek: DayOfWeek;
  isSchoolDay: boolean;
  startTime: TimeString; // contoh: "07:00"
  endTime: TimeString;   // contoh: "15:00"
  snapIntervalMinutes: SnapIntervalMinutes; // default: 15
  breakIntervals: BreakInterval[];
}

export interface Workspace {
  id: string;
  name: string;             // contoh: "SMP Negeri 1 Nusantara"
  academicPeriod: string;   // contoh: "Semester Ganjil 2026/2027"
  activeClassId: string | null;
  defaultSnapIntervalMinutes: SnapIntervalMinutes; // default: 15
  createdAt: string;        // ISO-8601 timestamp
  updatedAt: string;        // ISO-8601 timestamp
}

export interface ClassGroup {
  id: string;
  workspaceId: string;
  name: string;
  grade: string;
  notes?: string;
}

export interface Teacher {
  id: string;
  workspaceId: string;
  name: string;
  notes?: string;
  unavailableIntervals: TimeInterval[];
}

export interface Subject {
  id: string;
  workspaceId: string;
  name: string;
  colorKey: SubjectColorKey;
  notes?: string;
}

export interface Room {
  id: string;
  workspaceId: string;
  name: string;
  type: RoomType;
  notes?: string;
  unavailableIntervals: TimeInterval[];
}

export interface TeachingRequirement {
  id: string;
  workspaceId: string;
  classId: string;
  subjectId: string;
  defaultTeacherId: string | null;
  defaultRoomId: string | null;
  sessionsPerWeek: number;
  durationMinutes: number;
  roomRequired: boolean;
  notes?: string;
}

export interface TimetableSession {
  id: string;
  workspaceId: string;
  requirementId: string | null;
  classId: string;
  subjectId: string;
  teacherId: string | null;
  roomId: string | null;
  dayOfWeek: DayOfWeek;
  startTime: TimeString;
  endTime: TimeString;
  durationMinutes: number;
  notes?: string;
}
```

### 2.2 Kontrak Utilitas Waktu & Interval (`src/domain/time/`)

1. **`src/domain/time/time-utils.ts`:**
   ```typescript
   import type { SnapIntervalMinutes, TimeString } from "@/domain/types/entities";

   /** Memeriksa apakah string berformat "HH:mm" valid (00:00 s.d. 23:59 atau 24:00) */
   export function isValidTimeString(value: string): value is TimeString;

   /** Mengonversi "HH:mm" menjadi menit sejak 00:00 (0..1440) */
   export function timeToMinutes(time: TimeString): number;

   /** Mengonversi menit sejak 00:00 menjadi "HH:mm" (dibulatkan dan dibatasi 0..1440) */
   export function minutesToTime(totalMinutes: number): TimeString;

   /** Menambahkan deltaMinutes ke TimeString dan mengembalikan TimeString baru */
   export function addMinutesToTime(time: TimeString, deltaMinutes: number): TimeString;

   /** Menghitung selisih menit (endTime - startTime) */
   export function getDurationMinutes(startTime: TimeString, endTime: TimeString): number;

   /** Membulatkan menit ke kelipatan snapIntervalMinutes terdekat relatif terhadap originMinutes */
   export function snapMinutesToGrid(
     rawMinutes: number,
     originMinutes: number,
     snapInterval: SnapIntervalMinutes
   ): number;
   ```

2. **`src/domain/time/interval-utils.ts`:**
   ```typescript
   import type { TimeString } from "@/domain/types/entities";

   /**
    * Aturan irisan interval sesuai PRD FR-05.7 & AC-05:
    * Dua interval [startA, endA) dan [startB, endB) bertabrakan jika dan hanya jika:
    * startA < endB && startB < endA
    */
   export function doIntervalsOverlap(
     startA: TimeString,
     endA: TimeString,
     startB: TimeString,
     endB: TimeString
   ): boolean;

   /** Mengembalikan rentang irisan { startTime, endTime } jika bertabrakan, atau null jika tidak */
   export function getOverlapRange(
     startA: TimeString,
     endA: TimeString,
     startB: TimeString,
     endB: TimeString
   ): { startTime: TimeString; endTime: TimeString } | null;

   /** Memeriksa apakah interval [innerStart, innerEnd] berada sepenuhnya di dalam [outerStart, outerEnd] */
   export function isIntervalWithinBounds(
     innerStart: TimeString,
     innerEnd: TimeString,
     outerStart: TimeString,
     outerEnd: TimeString
   ): boolean;
   ```

### 2.3 Kontrak Validator Konfigurasi Ruang Kerja (`src/domain/validation/workspace-config-validator.ts`)

```typescript
import type {
  DayOfWeek,
  DayScheduleConfig,
  SnapIntervalMinutes,
  Workspace,
} from "@/domain/types/entities";

export type WorkspaceConfigErrorCode =
  | "EMPTY_WORKSPACE_NAME"
  | "EMPTY_ACADEMIC_PERIOD"
  | "NO_ACTIVE_SCHOOL_DAY"
  | "INVALID_TIME_FORMAT"
  | "OPERATING_HOURS_END_BEFORE_START"
  | "EMPTY_BREAK_LABEL"
  | "BREAK_END_BEFORE_START"
  | "BREAK_OUTSIDE_OPERATING_HOURS"
  | "BREAK_INTERVAL_OVERLAP";

export interface WorkspaceConfigValidationIssue {
  code: WorkspaceConfigErrorCode;
  dayOfWeek?: DayOfWeek;
  breakId?: string;
  field: string;
  message: string; // Bahasa Indonesia
}

export interface WorkspaceConfigValidationResult {
  isValid: boolean;
  issues: WorkspaceConfigValidationIssue[];
}

export function validateWorkspaceConfig(
  workspace: Pick<Workspace, "name" | "academicPeriod" | "defaultSnapIntervalMinutes">,
  dayConfigs: DayScheduleConfig[]
): WorkspaceConfigValidationResult;
```

**Aturan Bisnis `validateWorkspaceConfig`:**
1. Jika `workspace.name.trim().length === 0`, hasilkan `EMPTY_WORKSPACE_NAME` (`field: "name"`).
2. Jika `workspace.academicPeriod.trim().length === 0`, hasilkan `EMPTY_ACADEMIC_PERIOD` (`field: "academicPeriod"`).
3. Jika tidak ada satu pun item di `dayConfigs` yang memiliki `isSchoolDay === true`, hasilkan `NO_ACTIVE_SCHOOL_DAY` (`field: "dayConfigs"`).
4. Untuk setiap `dayConfig` di `dayConfigs`:
   - Jika `!isValidTimeString(dayConfig.startTime)` atau `!isValidTimeString(dayConfig.endTime)`, hasilkan `INVALID_TIME_FORMAT`.
   - Jika `timeToMinutes(dayConfig.startTime) >= timeToMinutes(dayConfig.endTime)`, hasilkan `OPERATING_HOURS_END_BEFORE_START`.
   - Untuk setiap `breakItem` di `dayConfig.breakIntervals`:
     - Jika `breakItem.label.trim().length === 0`, hasilkan `EMPTY_BREAK_LABEL` dengan `dayOfWeek` dan `breakId`.
     - Jika `!isValidTimeString(breakItem.startTime)` atau `!isValidTimeString(breakItem.endTime)`, hasilkan `INVALID_TIME_FORMAT`.
     - Jika `timeToMinutes(breakItem.startTime) >= timeToMinutes(breakItem.endTime)`, hasilkan `BREAK_END_BEFORE_START`.
     - Jika `!isIntervalWithinBounds(breakItem.startTime, breakItem.endTime, dayConfig.startTime, dayConfig.endTime)`, hasilkan `BREAK_OUTSIDE_OPERATING_HOURS`.
   - Untuk setiap pasangan `breakA` dan `breakB` berbeda pada hari yang sama:
     - Jika `doIntervalsOverlap(breakA.startTime, breakA.endTime, breakB.startTime, breakB.endTime)` bernilai `true`, hasilkan `BREAK_INTERVAL_OVERLAP`.

### 2.4 Skema Database Lokal IndexedDB & Seed Default (`src/db/`)

1. **`src/db/database.ts`:**
   - Mendeklarasikan class `SchedovynDatabase extends Dexie` dengan nama `"schedovyn_local_db"` dan `version(1).stores({...})` yang mencakup seluruh 8 tabel (`workspaces`, `dayConfigs`, `classes`, `teachers`, `subjects`, `rooms`, `requirements`, `sessions`) sesuai [`docs/Schedovyn-TDD.md` L347-L371](../Schedovyn-TDD.md).
2. **`src/db/seed-default.ts`:**
   - Fungsi `createDefaultWorkspaceSeed(): { workspace: Workspace; dayConfigs: DayScheduleConfig[] }`:
     - `workspace.name`: `"SMP Negeri 1 Nusantara"`
     - `workspace.academicPeriod`: `"Semester Ganjil 2026/2027"`
     - `workspace.defaultSnapIntervalMinutes`: `15`
     - `workspace.activeClassId`: `null`
     - `dayConfigs`: 7 hari berurutan (`monday` s.d. `sunday`):
       - Senin s.d. Kamis: `isSchoolDay: true`, `startTime: "07:00"`, `endTime: "15:00"`, `snapIntervalMinutes: 15`, `breakIntervals`:
         1. `{ id, label: "Istirahat Pertama", startTime: "09:30", endTime: "10:00" }`
         2. `{ id, label: "Ishoma", startTime: "12:00", endTime: "12:45" }`
       - Jumat: `isSchoolDay: true`, `startTime: "07:00"`, `endTime: "11:30"`, `snapIntervalMinutes: 15`, `breakIntervals`:
         1. `{ id, label: "Istirahat", startTime: "09:15", endTime: "09:45" }`
       - Sabtu & Minggu: `isSchoolDay: false`, `startTime: "07:00"`, `endTime: "13:00"`, `snapIntervalMinutes: 15`, `breakIntervals: []`.
3. **`src/db/workspace-repository.ts`:**
   - `loadOrSeedWorkspace(db?: SchedovynDatabase): Promise<{ workspace: Workspace; dayConfigs: DayScheduleConfig[] }>`:
     - Membaca workspace yang ada di IndexedDB beserta `dayConfigs` yang diurutkan sesuai `ORDERED_DAYS_OF_WEEK`.
     - Jika belum ada workspace di database, menyimpan hasil `createDefaultWorkspaceSeed()` dalam satu transaksi `rw` lalu mengembalikannya.
   - `saveWorkspaceAndDayConfigs(workspace: Workspace, dayConfigs: DayScheduleConfig[], db?: SchedovynDatabase): Promise<Workspace>`:
     - Memperbarui `workspace.updatedAt` dengan timestamp ISO terbaru, lalu menulis `workspace` (`put`) dan seluruh `dayConfigs` (`bulkPut`) di dalam satu transaksi atomik `db.transaction("rw", db.workspaces, db.dayConfigs, ...)`.

### 2.5 Kontrak Application Store (`src/store/use-workspace-store.ts`)

```typescript
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface WorkspaceStoreState {
  isHydrated: boolean;
  isHydrating: boolean;
  workspace: Workspace | null;
  dayConfigs: DayScheduleConfig[];
  configValidation: WorkspaceConfigValidationResult;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveErrorMessage: string | null;

  bootWorkspace: () => Promise<void>;
  updateWorkspaceIdentity: (patch: {
    name?: string;
    academicPeriod?: string;
    defaultSnapIntervalMinutes?: SnapIntervalMinutes;
    applySnapIntervalToAllDays?: boolean;
  }) => Promise<boolean>;
  updateDayConfig: (
    dayOfWeek: DayOfWeek,
    patch: Partial<
      Pick<DayScheduleConfig, "isSchoolDay" | "startTime" | "endTime" | "snapIntervalMinutes">
    >
  ) => Promise<boolean>;
  addBreakInterval: (
    dayOfWeek: DayOfWeek,
    breakData: Omit<BreakInterval, "id">
  ) => Promise<boolean>;
  updateBreakInterval: (
    dayOfWeek: DayOfWeek,
    breakId: string,
    patch: Partial<Omit<BreakInterval, "id">>
  ) => Promise<boolean>;
  removeBreakInterval: (dayOfWeek: DayOfWeek, breakId: string) => Promise<boolean>;
  retrySaveWorkspaceSettings: () => Promise<boolean>;
}
```

**Perilaku Wajib Store:**
- Setiap mutasi memperbarui state di memori terlebih dahulu dan mengevaluasi `validateWorkspaceConfig(nextWorkspace, nextDayConfigs)`.
- Jika `configValidation.isValid === false`:
  - State `configValidation` menyimpan daftar `issues` agar UI dapat menampilkan pesan kesalahan secara langsung, dan fungsi mengembalikan `false` tanpa menimpa data valid di IndexedDB.
- Jika `configValidation.isValid === true`:
  - Setel `saveStatus = "saving"` dan `saveErrorMessage = null`.
  - Panggil `saveWorkspaceAndDayConfigs(nextWorkspace, nextDayConfigs)`.
  - Jika transaksi IndexedDB berhasil (*resolved*): setel `saveStatus = "saved"`, `lastSavedAt = updatedWorkspace.updatedAt`, dan kembalikan `true`.
  - Jika transaksi IndexedDB gagal (*rejected*): tangkap error, setel `saveStatus = "error"`, isi `saveErrorMessage` dengan pesan Bahasa Indonesia (`"Gagal menyimpan ke penyimpanan lokal browser. Periksa ruang penyimpanan browser Anda lalu klik Coba Simpan Ulang."`), dan kembalikan `false`.

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-FR01-01 — Inisialisasi Default & Pemulihan Ruang Kerja Lokal (FR-01, FR-10, AC-12)
- **Given** pengguna membuka aplikasi pertama kali pada browser dengan IndexedDB kosong,
- **When** `bootWorkspace()` dijalankan,
- **Then** sistem menginisialisasi ruang kerja default (`"SMP Negeri 1 Nusantara"`, `"Semester Ganjil 2026/2027"`, snap `15` menit) beserta 7 konfigurasi hari (Senin-Jumat aktif, Sabtu-Minggu nonaktif), menyimpannya ke IndexedDB, dan menampilkan status `"Tersimpan di browser"`.

### AC-FR01-02 — Konfigurasi Hari Belajar (Termasuk Sabtu), Jam Operasional Berbeda Antarhari, & Snap Interval (FR-01.1 s.d. FR-01.4)
- **Given** pengguna berada di halaman Pengaturan (`/settings`),
- **When** pengguna mengubah nama sekolah menjadi `"SMA Negeri 2 Merdeka"`, mengaktifkan hari `"Sabtu"` (`isSchoolDay: true`), mengatur jam belajar hari Sabtu `"07:00"` s.d. `"12:00"` (sementara Senin-Kamis `"07:00"` s.d. `"15:00"`), dan mengubah interval snap grid menjadi `30` menit (dengan opsi terapkan ke semua hari),
- **Then** sistem memvalidasi perubahan sebagai valid, menyimpannya ke IndexedDB, dan ketika aplikasi dimuat ulang (`bootWorkspace()` dipanggil kembali pada instance store baru), seluruh perubahan tersebut dipulihkan secara akurat.

### AC-FR01-03 — Periode Istirahat Berurutan vs Bertabrakan (FR-01.6, FR-05.7, AC-05)
- **Given** hari Senin memiliki jam operasional `"07:00"` s.d. `"15:00"` dan istirahat pertama `"09:30"` s.d. `"10:00"`,
- **When** pengguna menambahkan istirahat kedua `"10:00"` s.d. `"10:15"` yang berbatasan tepat pada pukul `"10:00"`,
- **Then** sistem menerima istirahat tersebut tanpa error (`isValid === true`).
- **Namun When** pengguna menambahkan atau mengubah istirahat menjadi `"09:45"` s.d. `"10:15"` (beririsan) atau `"14:30"` s.d. `"15:30"` (melewati jam selesai belajar),
- **Then** validator mengembalikan `isValid === false` dengan kode `BREAK_INTERVAL_OVERLAP` atau `BREAK_OUTSIDE_OPERATING_HOURS` dan menampilkan pesan peringatan dalam Bahasa Indonesia.

### AC-FR01-04 — Penolakan Jam Operasional Tidak Valid & Semua Hari Nonaktif (NFR-06)
- **Given** pengguna sedang mengubah konfigurasi hari,
- **When** pengguna mengatur jam selesai lebih awal atau sama dengan jam mulai (`startTime: "14:00"`, `endTime: "08:00"`), atau menonaktifkan seluruh hari sekolah dari Senin s.d. Minggu,
- **Then** validator mengembalikan `OPERATING_HOURS_END_BEFORE_START` atau `NO_ACTIVE_SCHOOL_DAY`, menampilkan pesan error di UI, dan tidak merusak state penyimpanan lokal yang sudah valid.

### AC-FR01-05 — Kejujuran Status Penyimpanan saat IndexedDB Gagal (FR-10.4, FR-10.5)
- **Given** operasi tulis ke IndexedDB mengalami kegagalan (contoh: `QuotaExceededError` atau transaksi ditolak),
- **When** pengguna melakukan perubahan pengaturan ruang kerja yang valid secara domain,
- **Then** `saveStatus` berubah menjadi `"error"`, indikator di header menampilkan `"Gagal menyimpan lokal"` (bukan `"Tersimpan di browser"`), dan menyediakan tombol `"Coba Simpan Ulang"` yang memanggil `retrySaveWorkspaceSettings()`.

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Task QA Engineer (Fase RED)

> **Instruksi untuk QA Engineer:**  
> Ikuti protokol di [`.agents/agents/qa-engineer/agent.md`](../../.agents/agents/qa-engineer/agent.md). Jalankan `graphify query "FR-01"` sebelum memulai. Buat seluruh berkas pengujian di bawah ini hingga eksekusi `bun run test` berjalan dan gagal (**RED**) karena modul produksi di `src/domain/`, `src/db/`, `src/store/`, dan `src/pages/` belum diimplementasikan. Setelah selesai membuat berkas test, jalankan pembaruan `graphify . --update`.

1. **Task QA-01: Inisialisasi Vitest, React Testing Library, & `fake-indexeddb`**
   - Pasang dependensi dev menggunakan Bun:
     ```bash
     bun add -d vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb
     ```
   - Perbarui [`package.json`](../../package.json) untuk menambahkan script:
     - `"test": "vitest run"`
     - `"test:watch": "vitest"`
   - Buat `vitest.config.ts` dengan environment `"jsdom"`, alias `@` -> `./src`, dan `setupFiles: ["./src/__tests__/setup.ts"]`.
   - Buat `src/__tests__/setup.ts` yang mengimpor `"fake-indexeddb/auto"` dan `"@testing-library/jest-dom/vitest"`.

2. **Task QA-02: Unit Test Matematika Waktu & Interval (`src/__tests__/domain/interval-utils.spec.ts`)**
   - Uji `isValidTimeString`: menerima format 24 jam `"00:00"`, `"07:30"`, `"23:59"`, `"24:00"` dan menolak `"7:30"`, `"25:00"`, `"08:60"`, `"invalid"`.
   - Uji `timeToMinutes`, `minutesToTime`, `addMinutesToTime`, dan `getDurationMinutes`.
   - Uji `snapMinutesToGrid` untuk seluruh nilai `SnapIntervalMinutes` (`5`, `10`, `15`, `30`, `60`).
   - Uji `doIntervalsOverlap` dan `getOverlapRange` (Refs: `FR-05.7`, `AC-05`):
     - Dua interval yang berbatasan tepat (`"08:00"`-`"09:00"` dan `"09:00"`-`"10:00"`) wajib mengembalikan `false` dan `null`.
     - Dua interval yang beririsan sebagian (`"08:00"`-`"09:00"` dan `"08:30"`-`"09:30"`) wajib mengembalikan `true` dan `{ startTime: "08:30", endTime: "09:00" }`.
     - Satu interval di dalam interval lain (`"07:00"`-`"15:00"` dan `"09:30"`-`"10:00"`) wajib mengembalikan `true`.
   - Uji `isIntervalWithinBounds` untuk memeriksa periode istirahat di dalam/luar jam operasional.

3. **Task QA-03: Unit Test Validator Konfigurasi Ruang Kerja (`src/__tests__/domain/workspace-config-validator.spec.ts`)**
   - Uji konfigurasi default (Senin-Jumat aktif, jam belajar & istirahat valid) menghasilkan `isValid: true` dan `issues: []`.
   - Uji validasi identitas kosong (`EMPTY_WORKSPACE_NAME`, `EMPTY_ACADEMIC_PERIOD`).
   - Uji jika seluruh 7 hari memiliki `isSchoolDay: false` menghasilkan `NO_ACTIVE_SCHOOL_DAY`.
   - Uji jika `startTime >= endTime` menghasilkan `OPERATING_HOURS_END_BEFORE_START`.
   - Uji validasi `BreakInterval`:
     - Label istirahat kosong -> `EMPTY_BREAK_LABEL`.
     - Jam mulai istirahat >= jam selesai istirahat -> `BREAK_END_BEFORE_START`.
     - Jam istirahat keluar dari jam operasional hari tersebut -> `BREAK_OUTSIDE_OPERATING_HOURS`.
     - Dua jam istirahat pada hari yang sama saling tumpang tindih -> `BREAK_INTERVAL_OVERLAP`.
     - Dua jam istirahat pada hari yang sama berbatasan tepat (`09:30-10:00` dan `10:00-10:15`) -> valid (`isValid: true`).

4. **Task QA-04: Integration Test Persistensi IndexedDB & Store (`src/__tests__/db/workspace-repository.spec.ts` & `src/__tests__/store/use-workspace-store-fr01.spec.ts`)**
   - Uji `loadOrSeedWorkspace()`: membuat seed default saat database kosong dan mengembalikan 7 `dayConfigs` berurutan Senin-Minggu.
   - Uji `updateWorkspaceIdentity()`, `updateDayConfig()` (termasuk mengaktifkan hari Sabtu dan membedakan jam belajar Jumat/Sabtu), `addBreakInterval()`, `updateBreakInterval()`, dan `removeBreakInterval()`.
   - Uji pemulihan data (`AC-12`): setelah perubahan disimpan, reset state store di memori lalu panggil `bootWorkspace()`; pastikan data yang dipulihkan dari IndexedDB sama persis dengan perubahan terakhir.
   - Uji kejujuran status penyimpanan (`FR-10.4`, `FR-10.5`): simulasikan kegagalan tulis pada repositori/IndexedDB, pastikan `saveStatus === "error"`, `saveErrorMessage` terisi, dan status tidak pernah menjadi `"saved"`. Uji `retrySaveWorkspaceSettings()` memulihkan status menjadi `"saved"` ketika penyimpanan kembali normal.

5. **Task QA-05: Component Test Halaman Pengaturan Ruang Kerja (`src/__tests__/pages/settings-page.test.tsx`)**
   - Uji render `SettingsPage`: menampilkan input Nama Sekolah/Ruang Kerja, Periode Akademik, pemilih Interval Snap Grid, daftar 7 hari (Senin s.d. Minggu) dengan `tabular-nums`, dan `SaveStatusBadge`.
   - Uji interaksi mengubah Nama Sekolah dan mengaktifkan `Switch` hari Sabtu memperbarui state dan menampilkan indikator `"Tersimpan di browser"`.
   - Uji interaksi menambah periode istirahat baru pada suatu hari serta menampilkan `Alert` peringatan dalam Bahasa Indonesia apabila pengguna memasukkan rentang waktu yang tidak valid.

---

### 4.2 Task Frontend Engineer (Fase GREEN)

> **Instruksi untuk Frontend Engineer:**  
> Ikuti protokol di [`.agents/agents/frontend-engineer/agent.md`](../../.agents/agents/frontend-engineer/agent.md) dan panduan visual di [`DESIGN.md`](../../DESIGN.md). Jalankan `graphify query "FR-01"` sebelum memulai. Implementasikan seluruh modul di bawah ini hingga seluruh test yang ditulis QA Engineer berstatus **GREEN**, serta lulus `bun run typecheck`, `bun run lint`, dan `bun run build`. Jangan gunakan `any`, jangan gunakan karakter em dash pada salinan teks UI (`R-02`), dan pertahankan geometri `rounded-none` (`radix-lyra`). Setelah selesai, jalankan `graphify . --update`.

1. **Task FE-01: Instalasi Dependensi Runtime State & Local DB**
   - Jalankan perintah berikut menggunakan Bun:
     ```bash
     bun add dexie zustand
     ```

2. **Task FE-02: Implementasi Kontrak Tipe & Domain Layer (`src/domain/`)**
   - Buat `src/domain/types/entities.ts` sesuai kontrak pada Bagian 2.1.
   - Buat `src/domain/time/time-utils.ts` dan `src/domain/time/interval-utils.ts` sesuai kontrak pada Bagian 2.2 (pastikan fungsi 100% murni dan imutabel).
   - Buat `src/domain/validation/workspace-config-validator.ts` sesuai kontrak pada Bagian 2.3 dengan pesan Bahasa Indonesia yang jelas dan spesifik.

3. **Task FE-03: Implementasi Persistence Layer IndexedDB (`src/db/`)**
   - Buat `src/db/database.ts`: deklarasikan `SchedovynDatabase` dengan Dexie (`schedovyn_local_db` versi `1`) beserta instans singleton `db`.
   - Buat `src/db/seed-default.ts`: implementasikan `createDefaultWorkspaceSeed()` untuk membuat data awal ruang kerja dan 7 hari pembelajaran.
   - Buat `src/db/workspace-repository.ts`: implementasikan `loadOrSeedWorkspace()` dan `saveWorkspaceAndDayConfigs()` menggunakan transaksi atomik Dexie.

4. **Task FE-04: Implementasi Application State Layer (`src/store/`)**
   - Buat `src/store/use-workspace-store.ts` menggunakan `zustand` sesuai kontrak pada Bagian 2.5.
   - Pastikan alur *auto-save* menangani transisi `saveStatus` (`"idle" -> "saving" -> "saved" | "error"`) secara jujur dan mendukung `retrySaveWorkspaceSettings()`.

5. **Task FE-05: Implementasi AppShell, Navigasi Global, & Halaman Pengaturan (`src/components/` & `src/pages/`)**
   - Buat `src/components/layout/save-status-badge.tsx`:
     - Menampilkan status `"Menyimpan..."` (dengan `Spinner`), `"Tersimpan di browser"` (dengan `CheckIcon`), atau `"Gagal menyimpan lokal"` (dengan `AlertTriangleIcon` + tombol `"Coba Simpan Ulang"`).
   - Buat `src/components/layout/app-shell.tsx`:
     - Header utama (`h-12 border-b bg-card px-4`) yang menampilkan identitas aplikasi `Schedovyn`, nama sekolah & periode akademik aktif dari store, tautan navigasi ke `/` (**Editor Jadwal**), `/master-data` (**Data Master**), dan `/settings` (**Pengaturan Jam & Ruang Kerja**), `SaveStatusBadge`, serta tombol pengalih tema (`useTheme()`).
     - Menangani 3 UI states wajib (`R-27`): *Loading state* saat `isHydrating === true` (`Spinner` + `"Memuat data ruang kerja dari penyimpanan browser..."`), *Error banner* (`Alert variant="destructive"`) saat `saveStatus === "error"`, dan konten halaman saat siap.
   - Buat komponen konfigurasi di `src/components/workspace/`:
     - `workspace-identity-card.tsx`: Form `Card` untuk menyunting Nama Sekolah/Ruang Kerja (placeholder: `"Contoh: SMP Negeri 1 Nusantara"`), Label Tahun Ajaran/Semester (placeholder: `"Contoh: Semester Ganjil 2026/2027"`), dan `Select` Interval Snap Grid Default (`5`, `10`, `15`, `30`, `60` menit) beserta opsi menerapkan snap interval ke seluruh hari.
     - `day-schedule-config-card.tsx`: Daftar konfigurasi 7 hari (`Senin` s.d. `Minggu`). Setiap baris hari memiliki `Switch` + `Label` (`Hari Sekolah Aktif`), input waktu 24 jam `startTime` dan `endTime` (`tabular-nums`), pemilih `snapIntervalMinutes` harian, serta sub-bagian pengelolaan `BreakInterval` (daftar periode istirahat untuk hari tersebut, tombol `"Tambah Waktu Istirahat"`, input label istirahat + jam mulai + jam selesai, dan tombol hapus istirahat).
     - Tampilkan pesan validasi dari `configValidation.issues` menggunakan komponen `Alert variant="destructive"` apabila terdapat kesalahan input.
   - Buat `src/pages/settings-page.tsx` yang merender `WorkspaceIdentityCard` dan `DayScheduleConfigCard`.
   - Perbarui [`src/route/index.tsx`](../../src/route/index.tsx) agar membungkus rute di dalam `AppShell` untuk path `/`, `/master-data`, dan `/settings`.

6. **Task FE-06: Quality Gate & Sinkronisasi Graphify**
   - Jalankan verifikasi lengkap:
     ```bash
     bun run typecheck
     bun run lint
     bun run test
     bun run build
     ```
   - Perbarui *knowledge graph* proyek dengan menjalankan alur `graphify . --update`.
