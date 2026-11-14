# Spesifikasi Task & Kontrak Teknis: FR-13 — Pengelolaan Multi-Ruang Kerja (Multi-Workspace Management)

**Kode Fitur:** `FR-13` (Memperluas `FR-01`, `FR-05`, `FR-07`, `FR-10`, `FR-11`; Memenuhi `AC-14`, `NFR-02`, `NFR-05`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md) (Bagian 3.2, 4.1, 5 `FR-13`, 12 `AC-14`)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md) (Bagian 3, 4.2, 4.6, 10)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)
- Task Terkait:
  - [`docs/tasks/FR-01-workspace-and-schedule-config.md`](./FR-01-workspace-and-schedule-config.md)
  - [`docs/tasks/FR-07-undo-and-redo.md`](./FR-07-undo-and-redo.md)
  - [`docs/tasks/FR-10-local-auto-save.md`](./FR-10-local-auto-save.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran graf pengetahuan (`graphify query "workspace"` pada `graphify-out/GRAPH_REPORT.md` dengan 1.111 node dan 2.566 edge):
- **Fondasi Skema yang Sudah Mendukung Multi-Workspace:**
  - Skema IndexedDB pada [`src/db/database.ts`](../../src/db/database.ts) (`schedovyn_local_db` versi 1) telah mendefinisikan indeks `workspaceId` dan compound index `[workspaceId+...]` pada ketujuh tabel entitas anak (`dayConfigs`, `classes`, `teachers`, `subjects`, `rooms`, `requirements`, `sessions`).
- **Kesenjangan Implementasi Saat Ini (Single-Workspace Bottlenecks):**
  1. **Pemulihan Ruang Kerja Tunggal:** Fungsi `loadOrSeedWorkspace()` di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts) selalu mengambil `existingWorkspaces[0]` tanpa memeriksa daftar seluruh ruang kerja maupun preferensi `activeWorkspaceId` terakhir pengguna.
  2. **Operasi Reset & Seed Bersifat Global Destruktif:** Fungsi `applyFullDefaultSeed()` dan `clearAllSeedData()` di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts) memanggil `.clear()` pada seluruh tabel IndexedDB (`database.workspaces.clear()`, `database.classes.clear()`, dst.). Apabila terdapat lebih dari satu ruang kerja, tindakan muat ulang data contoh atau pengosongan pada satu ruang kerja akan menghapus ruang kerja lainnya.
  3. **Bentrokan Primary Key pada Seed Default:** Fungsi `createDefaultWorkspaceSeed()` di [`src/db/seed-default.ts`](../../src/db/seed-default.ts) menggunakan ID statis (`"ws-smpn1-nusantara"`, `"seed-cls-7a"`, dll.). Pembuatan ruang kerja kedua dengan mode data contoh akan menimpa primary key di IndexedDB kecuali ID di-namespace secara unik per ruang kerja.
  4. **Ketidaktersediaan Modul Kloning Ruang Kerja:** Belum ada fungsi domain murni (`src/domain/workspace/workspace-cloner.ts`) yang memetakan ulang relasi *foreign key* (`classId`, `teacherId`, `subjectId`, `roomId`, `requirementId`, `defaultTeacherId`, `defaultRoomId`) saat pengguna menduplikasi ruang kerja untuk semester baru atau simulasi jadwal.
  5. **Antarmuka Header & Pengaturan:** Komponen [`src/components/layout/app-shell.tsx`](../../src/components/layout/app-shell.tsx) masih menampilkan nama ruang kerja sebagai teks statis tanpa pemilih (*Workspace Switcher*), dan [`src/pages/settings-page.tsx`](../../src/pages/settings-page.tsx) belum memiliki kartu pengelolaan daftar ruang kerja (*Create, Duplicate, Switch, Delete*).

### 1.2 Referensi Persyaratan
- **FR-13 (Pengelolaan Multi-Ruang Kerja — PRD Bagian 5):**
  1. **Pemilih Ruang Kerja Aktif (*Workspace Switcher*):** Menampilkan ruang kerja aktif di header aplikasi dan mengizinkan perpindahan instan antar-ruang kerja lokal.
  2. **Pembuatan Ruang Kerja Baru:** Mendukung mode **Ruang Kerja Kosong (`BLANK`)** dan **Muat Data Contoh (`SEED_DEFAULT`)**.
  3. **Duplikasi Ruang Kerja (*Clone Workspace*):** Mendukung mode **Konfigurasi & Data Master Saja (`MASTER_DATA_ONLY`)** untuk persiapan semester baru (dengan `sessions = []` sehingga seluruh kebutuhan sesi siap dijadwalkan dari awal) serta mode **Salin Penuh Beserta Jadwal (`FULL_COPY`)** untuk simulasi jadwal.
  4. **Isolasi Data, Validasi, dan Riwayat:** Evaluasi konflik (`FR-05`), kelengkapan (`FR-11`), serta aksi reset/seed terisolasi di dalam `workspaceId` aktif; tumpukan *Undo/Redo* (`FR-07`) direset saat berpindah ruang kerja.
  5. **Penghapusan Ruang Kerja Terisolasi:** Menghapus ruang kerja beserta entitas anaknya secara kaskade, serta menolak penghapusan apabila hanya tersisa 1 ruang kerja di database.
  6. **Pemulihan Ruang Kerja Terakhir:** Menyimpan ID ruang kerja aktif di `localStorage` (`schedovyn_active_workspace_id`) dan memulihkannya saat aplikasi dibuka kembali.
- **AC-14 (Pengelolaan dan Isolasi Multi-Ruang Kerja — PRD Bagian 12).**
- **NFR-02 (Keandalan Data) & NFR-05 (Pemeliharaan / Pemisahan Domain Murni).**

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:**
  - Ketika memasuki semester baru (misalnya dari *Semester Ganjil* ke *Semester Genap*), staf kurikulum membutuhkan ruang kerja baru yang sudah berisi daftar kelas, guru, mata pelajaran, ruangan, dan kebutuhan pembelajaran tanpa harus mengetik ulang dari nol, sekaligus menjaga jadwal semester sebelumnya tetap tersimpan sebagai arsip.
  - Staf kurikulum juga sering membutuhkan ruang kerja salinan (*sandbox/simulasi*) untuk menguji skenario perubahan jam belajar atau rotasi guru sebelum diterapkan pada jadwal resmi.
- **Cakupan Fitur (In-Scope):**
  1. Kontrak tipe multi-workspace di [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts).
  2. Fungsi murni `cloneWorkspaceSnapshot` dan `createBlankWorkspaceSnapshot` di `src/domain/workspace/workspace-cloner.ts`.
  3. Namespace ID unik pada `createDefaultWorkspaceSeed(customWorkspaceId?)` di [`src/db/seed-default.ts`](../../src/db/seed-default.ts).
  4. Operasi repositori multi-workspace dan isolasi `.where("workspaceId").equals(...)` di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts).
  5. State `workspaces: Workspace[]` serta action `switchWorkspace`, `createWorkspace`, `duplicateWorkspace`, dan `deleteWorkspace` di [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts).
  6. Komponen `WorkspaceSwitcher` di header [`src/components/layout/app-shell.tsx`](../../src/components/layout/app-shell.tsx) dan `WorkspaceManagementCard` di [`src/pages/settings-page.tsx`](../../src/pages/settings-page.tsx).
- **Di Luar Cakupan (Out-of-Scope):**
  - Sinkronisasi ruang kerja ke cloud/server eksternal.
  - Penggabungan (*merge*) otomatis dua ruang kerja berbeda.

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Kontrak Tipe Domain (`src/domain/types/entities.ts`)

Kontrak tipe berikut telah didefinisikan pada [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts):

```typescript
export type WorkspaceInitMode = "BLANK" | "SEED_DEFAULT"

export type WorkspaceDuplicateMode = "MASTER_DATA_ONLY" | "FULL_COPY"

export interface CreateWorkspaceInput {
  name: string
  academicPeriod: string
  defaultSnapIntervalMinutes: SnapIntervalMinutes
  initMode: WorkspaceInitMode
}

export interface DuplicateWorkspaceInput {
  sourceWorkspaceId: string
  name: string
  academicPeriod: string
  mode: WorkspaceDuplicateMode
}
```

### 2.2 Modul Domain Murni Kloning & Inisialisasi Ruang Kerja (`src/domain/workspace/workspace-cloner.ts`)

Modul ini wajib 100% murni TypeScript (tanpa impor React, DOM, atau Dexie):

```typescript
import {
  ORDERED_DAYS_OF_WEEK,
  SNAP_INTERVAL_OPTIONS,
  type ClassGroup,
  type CreateWorkspaceInput,
  type DayScheduleConfig,
  type DuplicateWorkspaceInput,
  type Room,
  type Subject,
  type Teacher,
  type TeachingRequirement,
  type TimetableSession,
  type Workspace,
} from "../types/entities"

export interface WorkspaceEntityBundle {
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
  classes: ClassGroup[]
  teachers: Teacher[]
  subjects: Subject[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]
}

export interface CloneWorkspaceParams {
  source: WorkspaceEntityBundle
  input: DuplicateWorkspaceInput
  generateId?: () => string
  nowIso?: string
}

export interface ValidateWorkspaceMetaResult {
  valid: boolean
  errors: string[]
}

/**
 * Memvalidasi input metadata pembuatan atau duplikasi ruang kerja.
 */
export function validateWorkspaceMetaInput(input: {
  name: string
  academicPeriod: string
  defaultSnapIntervalMinutes?: number
}): ValidateWorkspaceMetaResult {
  const errors: string[] = []
  if (input.name.trim().length === 0) {
    errors.push("Nama ruang kerja tidak boleh kosong.")
  }
  if (input.academicPeriod.trim().length === 0) {
    errors.push("Periode akademik tidak boleh kosong.")
  }
  if (
    input.defaultSnapIntervalMinutes !== undefined &&
    !SNAP_INTERVAL_OPTIONS.includes(
      input.defaultSnapIntervalMinutes as (typeof SNAP_INTERVAL_OPTIONS)[number]
    )
  ) {
    errors.push("Interval snap default harus bernilai 5, 10, 15, 30, atau 60 menit.")
  }
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Membuat bundel ruang kerja kosong (BLANK) dengan 7 konfigurasi hari bawaan
 * (Senin-Jumat aktif 07:00-14:00, Sabtu-Minggu nonaktif).
 */
export function createBlankWorkspaceBundle(params: {
  input: CreateWorkspaceInput
  generateId?: () => string
  nowIso?: string
}): WorkspaceEntityBundle {
  const {
    input,
    generateId = () => crypto.randomUUID(),
    nowIso = new Date().toISOString(),
  } = params

  const workspaceId = generateId()
  const workspace: Workspace = {
    id: workspaceId,
    name: input.name.trim(),
    academicPeriod: input.academicPeriod.trim(),
    activeClassId: null,
    defaultSnapIntervalMinutes: input.defaultSnapIntervalMinutes,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  const dayConfigs: DayScheduleConfig[] = ORDERED_DAYS_OF_WEEK.map((day) => {
    const isWeekend = day === "saturday" || day === "sunday"
    return {
      id: generateId(),
      workspaceId,
      dayOfWeek: day,
      isSchoolDay: !isWeekend,
      startTime: "07:00",
      endTime: day === "friday" ? "11:30" : "14:00",
      snapIntervalMinutes: input.defaultSnapIntervalMinutes,
      breakIntervals: isWeekend
        ? []
        : [
            {
              id: generateId(),
              startTime: "09:45",
              endTime: "10:15",
              label: "Istirahat Pagi",
            },
          ],
    }
  })

  return {
    workspace,
    dayConfigs,
    classes: [],
    teachers: [],
    subjects: [],
    rooms: [],
    requirements: [],
    sessions: [],
  }
}

/**
 * Menduplikasi seluruh entitas dari ruang kerja sumber ke ruang kerja baru
 * dengan ID unik baru dan pemetaan ulang seluruh relasi foreign key.
 */
export function cloneWorkspaceSnapshot(
  params: CloneWorkspaceParams
): WorkspaceEntityBundle {
  const {
    source,
    input,
    generateId = () => crypto.randomUUID(),
    nowIso = new Date().toISOString(),
  } = params

  const newWorkspaceId = generateId()

  const classIdMap = new Map<string, string>()
  const teacherIdMap = new Map<string, string>()
  const subjectIdMap = new Map<string, string>()
  const roomIdMap = new Map<string, string>()
  const requirementIdMap = new Map<string, string>()

  const classes: ClassGroup[] = source.classes.map((cls) => {
    const newId = generateId()
    classIdMap.set(cls.id, newId)
    return {
      ...cls,
      id: newId,
      workspaceId: newWorkspaceId,
    }
  })

  const teachers: Teacher[] = source.teachers.map((teacher) => {
    const newId = generateId()
    teacherIdMap.set(teacher.id, newId)
    return {
      ...teacher,
      id: newId,
      workspaceId: newWorkspaceId,
      unavailableIntervals: teacher.unavailableIntervals.map((interval) => ({
        ...interval,
        id: generateId(),
      })),
    }
  })

  const subjects: Subject[] = source.subjects.map((subject) => {
    const newId = generateId()
    subjectIdMap.set(subject.id, newId)
    return {
      ...subject,
      id: newId,
      workspaceId: newWorkspaceId,
    }
  })

  const rooms: Room[] = source.rooms.map((room) => {
    const newId = generateId()
    roomIdMap.set(room.id, newId)
    return {
      ...room,
      id: newId,
      workspaceId: newWorkspaceId,
      unavailableIntervals: room.unavailableIntervals.map((interval) => ({
        ...interval,
        id: generateId(),
      })),
    }
  })

  const dayConfigs: DayScheduleConfig[] = source.dayConfigs.map((cfg) => ({
    ...cfg,
    id: generateId(),
    workspaceId: newWorkspaceId,
    breakIntervals: cfg.breakIntervals.map((brk) => ({
      ...brk,
      id: generateId(),
    })),
  }))

  const requirements: TeachingRequirement[] = source.requirements.map((req) => {
    const newId = generateId()
    requirementIdMap.set(req.id, newId)
    return {
      ...req,
      id: newId,
      workspaceId: newWorkspaceId,
      classId: classIdMap.get(req.classId) ?? req.classId,
      subjectId: subjectIdMap.get(req.subjectId) ?? req.subjectId,
      defaultTeacherId: req.defaultTeacherId
        ? (teacherIdMap.get(req.defaultTeacherId) ?? null)
        : null,
      defaultRoomId: req.defaultRoomId
        ? (roomIdMap.get(req.defaultRoomId) ?? null)
        : null,
    }
  })

  const sessions: TimetableSession[] =
    input.mode === "MASTER_DATA_ONLY"
      ? []
      : source.sessions.map((session) => ({
          ...session,
          id: generateId(),
          workspaceId: newWorkspaceId,
          requirementId: session.requirementId
            ? (requirementIdMap.get(session.requirementId) ?? null)
            : null,
          classId: classIdMap.get(session.classId) ?? session.classId,
          subjectId: subjectIdMap.get(session.subjectId) ?? session.subjectId,
          teacherId: session.teacherId
            ? (teacherIdMap.get(session.teacherId) ?? null)
            : null,
          roomId: session.roomId
            ? (roomIdMap.get(session.roomId) ?? null)
            : null,
        }))

  const mappedActiveClassId = source.workspace.activeClassId
    ? (classIdMap.get(source.workspace.activeClassId) ?? classes[0]?.id ?? null)
    : (classes[0]?.id ?? null)

  const workspace: Workspace = {
    id: newWorkspaceId,
    name: input.name.trim(),
    academicPeriod: input.academicPeriod.trim(),
    activeClassId: mappedActiveClassId,
    defaultSnapIntervalMinutes: source.workspace.defaultSnapIntervalMinutes,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  return {
    workspace,
    dayConfigs,
    classes,
    teachers,
    subjects,
    rooms,
    requirements,
    sessions,
  }
}
```

### 2.3 Kontrak Persistence Layer (`src/db/seed-default.ts` & `src/db/workspace-repository.ts`)

1. **Namespace Unik pada `createDefaultWorkspaceSeed(options?)` (`src/db/seed-default.ts`):**
   - Mendukung parameter opsional `{ workspaceId?: string; name?: string; academicPeriod?: string; defaultSnapIntervalMinutes?: SnapIntervalMinutes }`.
   - Jika `workspaceId` tidak diberikan atau bernilai `"ws-smpn1-nusantara"`, gunakan ID bawaan (`"seed-cls-7a"`, dst.) agar 100% kompatibel dengan pengujian regresi yang sudah ada.
   - Jika `workspaceId` berbeda (misal saat pengguna membuat ruang kerja kedua dengan opsi `SEED_DEFAULT`), prefiks seluruh ID entitas anak dengan `${workspaceId}::` (misal `${workspaceId}::seed-cls-7a`) sehingga tidak terjadi tabrakan primary key di IndexedDB.

2. **Operasi Multi-Workspace Terisolasi (`src/db/workspace-repository.ts`):**
   - `listWorkspaces(database?: SchedovynDatabase): Promise<Workspace[]>`
     - Mengambil daftar seluruh ruang kerja, diurutkan berdasarkan `createdAt` menaik (atau `updatedAt` menurun secara konsisten).
   - `loadWorkspaceById(workspaceId: string, database?: SchedovynDatabase): Promise<WorkspaceSnapshot | null>`
     - Memuat satu ruang kerja beserta `dayConfigs`, `classes`, `teachers`, `subjects`, `rooms`, `requirements`, dan `sessions` milik `workspaceId` tersebut.
   - `loadOrSeedWorkspace(database?: SchedovynDatabase, preferredWorkspaceId?: string | null): Promise<WorkspaceSnapshot>`
     - Jika `preferredWorkspaceId` diberikan dan ditemukan di tabel `workspaces`, muat ruang kerja tersebut.
     - Jika tidak ditemukan tetapi ada ruang kerja lain di tabel `workspaces`, muat ruang kerja pertama.
     - Jika tabel `workspaces` kosong, buat dan simpan seed default.
   - `createWorkspaceInDb(input: CreateWorkspaceInput, database?: SchedovynDatabase): Promise<WorkspaceSnapshot>`
     - Menyimpan ruang kerja baru (`BLANK` atau `SEED_DEFAULT` dengan ID ber-namespace unik) ke dalam satu transaksi `rw` tanpa menghapus ruang kerja lain.
   - `duplicateWorkspaceInDb(input: DuplicateWorkspaceInput, database?: SchedovynDatabase): Promise<WorkspaceSnapshot>`
     - Memuat snapshot dari `input.sourceWorkspaceId`, memanggil `cloneWorkspaceSnapshot`, dan menyimpan bundel baru ke IndexedDB dalam satu transaksi `rw`.
   - `deleteWorkspaceFromDb(workspaceId: string, database?: SchedovynDatabase): Promise<void>`
     - Memeriksa jumlah ruang kerja di `database.workspaces.count()`. Jika `<= 1`, lemparkan `Error("Tidak dapat menghapus satu-satunya ruang kerja yang tersisa.")`.
     - Menghapus rekaman anak dengan `.where("workspaceId").equals(workspaceId).delete()` pada ketujuh tabel anak dan `database.workspaces.delete(workspaceId)`.
   - **Perbaikan `applyFullDefaultSeed` & `clearAllSeedData`:**
     - Menerima `targetWorkspaceId?: string`.
     - Jika `targetWorkspaceId` diberikan, hanya menghapus entitas dengan `.where("workspaceId").equals(targetWorkspaceId).delete()` dan memperbarui ruang kerja tersebut menggunakan ID ber-namespace `targetWorkspaceId`, sehingga ruang kerja lain di IndexedDB tetap utuh.

### 2.4 Kontrak State & Action di Zustand Store (`src/store/use-workspace-store.ts`)

Kunci penyimpanan preferensi ruang kerja aktif di `localStorage`:
```typescript
export const ACTIVE_WORKSPACE_STORAGE_KEY = "schedovyn_active_workspace_id"
```

Penambahan pada `WorkspaceStoreState`:
```typescript
export interface WorkspaceStoreState {
  // State eksisting...
  workspaces: Workspace[]

  // Action multi-workspace baru (FR-13):
  switchWorkspace: (workspaceId: string) => Promise<ActionResult>
  createWorkspace: (input: CreateWorkspaceInput) => Promise<ActionResult>
  duplicateWorkspace: (input: DuplicateWorkspaceInput) => Promise<ActionResult>
  deleteWorkspace: (workspaceId: string) => Promise<ActionResult>
}
```

Aturan perilaku `useWorkspaceStore`:
1. Saat `hydrateWorkspace()` dijalankan:
   - Baca `preferredWorkspaceId` dari `localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)`.
   - Panggil `loadOrSeedWorkspace(undefined, preferredWorkspaceId)` serta `listWorkspaces()`.
   - Simpan `snapshot.workspace.id` ke `localStorage`.
2. Saat `switchWorkspace(workspaceId)` dijalankan:
   - Muat `loadWorkspaceById(workspaceId)`. Jika tidak ditemukan, kembalikan `{ ok: false, error: "Ruang kerja tidak ditemukan." }`.
   - Perbarui state store dengan snapshot ruang kerja baru, reset `history: createInitialHistoryState()`, reset `selectedSessionId: null`, hitung ulang `validationReport`, dan simpan `workspaceId` ke `localStorage`.
3. Saat `createWorkspace(input)` atau `duplicateWorkspace(input)` dijalankan:
   - Validasi input menggunakan `validateWorkspaceMetaInput`.
   - Eksekusi transaksi penyimpanan di repositori.
   - Muat daftar `workspaces` terbaru, aktifkan ruang kerja yang baru dibuat/diduplikasi, reset `history` dan `selectedSessionId`, serta perbarui `localStorage`.
4. Saat `deleteWorkspace(workspaceId)` dijalankan:
   - Jika `workspaces.length <= 1`, kembalikan `{ ok: false, error: "Tidak dapat menghapus satu-satunya ruang kerja yang tersisa." }`.
   - Panggil `deleteWorkspaceFromDb(workspaceId)`.
   - Jika `workspaceId` yang dihapus adalah ruang kerja yang sedang aktif, otomatis beralih (`switchWorkspace`) ke ruang kerja pertama yang tersisa.

### 2.5 Kontrak Komponen Antarmuka (`src/components/`)

1. **`WorkspaceSwitcher` (`src/components/layout/workspace-switcher.tsx`):**
   - Dirender di header [`src/components/layout/app-shell.tsx`](../../src/components/layout/app-shell.tsx) menggantikan label statis nama sekolah/ruang kerja.
   - Menampilkan nama ruang kerja aktif dan badge periode akademik.
   - Menggunakan komponen `Select` atau `Popover` / menu daftar ruang kerja dengan `data-testid="workspace-switcher-trigger"`.
   - Menyediakan daftar seluruh `workspaces` untuk berpindah cepat (`data-testid="workspace-switch-item-${ws.id}"`) serta tombol pintas ke bagian pengelolaan ruang kerja di halaman `/settings` atau membuka dialog pembuatan ruang kerja baru (`data-testid="open-create-workspace-dialog"`).
2. **`WorkspaceManagementCard` (`src/components/workspace/workspace-management-card.tsx`):**
   - Dirender di bagian atas [`src/pages/settings-page.tsx`](../../src/pages/settings-page.tsx).
   - Menampilkan daftar seluruh ruang kerja lokal beserta status badge `"Aktif"`, periode akademik, dan tombol aksi:
     - **"Aktifkan"** (`data-testid="activate-workspace-${ws.id}"`) untuk ruang kerja non-aktif.
     - **"Duplikasi"** (`data-testid="duplicate-workspace-${ws.id}"`) yang membuka dialog duplikasi dengan pilihan mode `MASTER_DATA_ONLY` (*Konfigurasi & Data Master Saja*) atau `FULL_COPY` (*Salin Penuh Beserta Jadwal*).
     - **"Hapus"** (`data-testid="delete-workspace-${ws.id}"`) dengan `AlertDialog` konfirmasi; tombol dinonaktifkan (`disabled`) jika `workspaces.length <= 1`.
   - Memiliki tombol utama **"Buat Ruang Kerja Baru"** (`data-testid="create-workspace-button"`) yang membuka dialog pembuatan ruang kerja dengan pilihan mode `BLANK` atau `SEED_DEFAULT`.

---

## 3. Acceptance Criteria (Given-When-Then)

### Skenario 1: Membuat Ruang Kerja Baru (Kosong & Data Contoh) (AC-14.1)
- **Given** pengguna berada di aplikasi dengan ruang kerja awal `"SMP Negeri 1 Nusantara"`,
- **When** pengguna membuat ruang kerja baru bernama `"SMA Harapan Bangsa"` untuk periode `"Semester Genap 2026/2027"` dengan mode `"BLANK"` (Ruang Kerja Kosong),
- **Then** ruang kerja baru tersimpan di IndexedDB dengan 7 konfigurasi hari bawaan, `0` kelas, `0` guru, `0` sesi, langsung menjadi ruang kerja aktif, tumpukan Undo/Redo kosong, dan ruang kerja `"SMP Negeri 1 Nusantara"` tetap tersimpan utuh di daftar `workspaces`.

### Skenario 2: Membuat Ruang Kerja Kedua dengan Data Contoh Tanpa Tabrakan ID (AC-14.2)
- **Given** ruang kerja pertama sudah menggunakan data contoh `"SMP Negeri 1 Nusantara"`,
- **When** pengguna membuat ruang kerja baru dengan mode `"SEED_DEFAULT"`,
- **Then** seluruh entitas di ruang kerja baru memiliki ID unik yang tidak menimpa data di ruang kerja pertama, dan kedua ruang kerja memiliki jumlah kelas, guru, mapel, ruangan, kebutuhan, serta sesi contoh masing-masing secara independen.

### Skenario 3: Duplikasi Ruang Kerja Mode Data Master Saja untuk Semester Baru (AC-14.3)
- **Given** `Workspace A` memiliki 6 kelas, 14 guru, 12 mata pelajaran, 9 ruangan, 45 kebutuhan pembelajaran, dan 72 sesi terjadwal,
- **When** pengguna menduplikasi `Workspace A` menjadi `"Semester Genap 2026/2027"` dengan mode `"MASTER_DATA_ONLY"`,
- **Then** ruang kerja baru memiliki salinan lengkap konfigurasi hari, 6 kelas, 14 guru, 12 mata pelajaran, 9 ruangan, dan 45 kebutuhan pembelajaran dengan ID baru yang saling terhubung dengan benar, tetapi memiliki `0` sesi terjadwal (`sessions.length === 0`) sehingga seluruh slot kebutuhan siap dijadwalkan di Panel Sesi Belum Terjadwal.

### Skenario 4: Duplikasi Ruang Kerja Mode Salin Penuh Beserta Jadwal (AC-14.4)
- **Given** `Workspace A` memiliki jadwal sesi yang telah ditempatkan di grid,
- **When** pengguna menduplikasi `Workspace A` dengan mode `"FULL_COPY"`,
- **Then** seluruh sesi terjadwal ikut tersalin ke ruang kerja baru pada hari dan jam yang sama dengan referensi `classId`, `subjectId`, `teacherId`, `roomId`, dan `requirementId` yang telah dipetakan ke ID entitas ruang kerja baru.

### Skenario 5: Perpindahan Ruang Kerja, Reset Undo/Redo, dan Persistensi Reload (AC-14.5)
- **Given** pengguna melakukan perubahan jadwal di `Workspace A` (sehingga `canUndo() === true`),
- **When** pengguna berpindah ke `Workspace B` melalui `WorkspaceSwitcher` lalu memuat ulang aplikasi (`hydrateWorkspace`),
- **Then** saat berpindah ke `Workspace B` status `canUndo()` dan `canRedo()` menjadi `false`, dan setelah aplikasi dimuat ulang sistem otomatis membuka `Workspace B`.

### Skenario 6: Isolasi Reset, Muat Data Contoh, dan Penghapusan Ruang Kerja (AC-14.6)
- **Given** terdapat `Workspace A` dan `Workspace B` (sedang aktif),
- **When** pengguna menjalankan **"Kosongkan Semua Data"** pada `Workspace B`,
- **Then** hanya data milik `Workspace B` yang dikosongkan sedangkan data `Workspace A` tidak berubah.
- **When** pengguna menghapus `Workspace B`,
- **Then** `Workspace B` beserta entitas anaknya terhapus dari IndexedDB, aplikasi otomatis mengaktifkan `Workspace A`, dan penghapusan `Workspace A` ditolak karena merupakan satu-satunya ruang kerja yang tersisa.

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Task QA Engineer (Fase RED)
1. **Unit Test Kloning & Inisialisasi Ruang Kerja (`src/__tests__/domain/workspace-cloner.spec.ts`):**
   - Menguji `validateWorkspaceMetaInput` untuk nama kosong, periode kosong, dan interval snap tidak valid.
   - Menguji `createBlankWorkspaceBundle` menghasilkan 7 `DayScheduleConfig` (Senin–Jumat aktif, Sabtu–Minggu nonaktif) dan koleksi master/sesi kosong.
   - Menguji `cloneWorkspaceSnapshot` dengan mode `MASTER_DATA_ONLY`: memastikan seluruh ID baru berbeda dari ID sumber, relasi foreign key pada `requirements` terpetakan ke ID baru, dan `sessions` bernilai `[]`.
   - Menguji `cloneWorkspaceSnapshot` dengan mode `FULL_COPY`: memastikan seluruh `sessions` ikut tersalin dan merujuk ke `classId`, `subjectId`, `teacherId`, `roomId`, dan `requirementId` baru.
2. **Integration Test Store & IndexedDB (`src/__tests__/integration/multi-workspace.spec.ts`):**
   - Menguji pembuatan ruang kerja baru (`BLANK` dan `SEED_DEFAULT`) tanpa menimpa ruang kerja lama.
   - Menguji `duplicateWorkspace` (`MASTER_DATA_ONLY` & `FULL_COPY`) dan memverifikasi integritas data di `fake-indexeddb`.
   - Menguji `switchWorkspace`, reset tumpukan `Undo/Redo`, dan pemulihan `schedovyn_active_workspace_id` saat `hydrateWorkspace()`.
   - Menguji isolasi `clearAllData()` dan `reloadDefaultSeed()` agar tidak merusak ruang kerja lain.
   - Menguji `deleteWorkspace()` beserta proteksi penolakan hapus saat hanya tersisa 1 ruang kerja.
3. **Component / UI Test (`src/__tests__/ui/workspace-management.test.tsx`):**
   - Menguji interaksi `WorkspaceSwitcher` di `AppShell` untuk berpindah ruang kerja.
   - Menguji interaksi `WorkspaceManagementCard` di `SettingsPage` untuk membuat, menduplikasi, dan menghapus ruang kerja.

### 4.2 Task Frontend Engineer (Fase GREEN)
1. **Implementasi Domain (`src/domain/workspace/workspace-cloner.ts`):**
   - Mengimplementasikan `validateWorkspaceMetaInput`, `createBlankWorkspaceBundle`, dan `cloneWorkspaceSnapshot`.
2. **Implementasi Persistence (`src/db/seed-default.ts` & `src/db/workspace-repository.ts`):**
   - Menambahkan dukungan namespace ID unik pada `createDefaultWorkspaceSeed`.
   - Mengimplementasikan `listWorkspaces`, `loadWorkspaceById`, `createWorkspaceInDb`, `duplicateWorkspaceInDb`, `deleteWorkspaceFromDb`, serta membatasi operasi `applyFullDefaultSeed` dan `clearAllSeedData` pada `workspaceId` aktif.
3. **Implementasi Store (`src/store/use-workspace-store.ts`):**
   - Menambahkan state `workspaces: Workspace[]`, sinkronisasi `localStorage` (`schedovyn_active_workspace_id`), serta action `switchWorkspace`, `createWorkspace`, `duplicateWorkspace`, dan `deleteWorkspace`.
4. **Implementasi Komponen UI (`src/components/` & `src/pages/`):**
   - Membangun `src/components/layout/workspace-switcher.tsx` dan mengintegrasikannya ke `src/components/layout/app-shell.tsx`.
   - Membangun `src/components/workspace/workspace-management-card.tsx` dan mengintegrasikannya ke `src/pages/settings-page.tsx`.
5. **Verifikasi Quality Gate & Pembaruan Graphify:**
   - Menjalankan `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, dan memperbarui graf pengetahuan dengan `graphify . --update`.
