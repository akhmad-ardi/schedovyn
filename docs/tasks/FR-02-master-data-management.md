# Spesifikasi Task & Kontrak Teknis: FR-02 — Pengelolaan Data Master

**Kode Fitur:** `FR-02` (Didukung oleh fondasi `FR-05.4`, `FR-05.6`, `FR-05.7`, `FR-10`, `AC-05`, `AC-12`, `NFR-02`, `NFR-05`, `NFR-06`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)
- Task Sebelumnya (Selesai): [`docs/tasks/FR-01-workspace-and-schedule-config.md`](./FR-01-workspace-and-schedule-config.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran *knowledge graph* pada [`graphify-out/graph.json`](../../graphify-out/graph.json) dan [`graphify-out/GRAPH_REPORT.md`](../../graphify-out/GRAPH_REPORT.md):
- **Node Domain & Arsitektur Terkait:**
  - `Master Data Entities (ClassGroup, Teacher, Subject, Room, TeachingRequirement)` (`docs/Schedovyn-TDD.md` L231-L275, Community 17) terhubung langsung ke `Workspace & DayScheduleConfig Entities` dan `TimetableSession & UnscheduledSessionItem`.
  - Interface TypeScript `ClassGroup`, `Teacher`, `Subject`, `Room`, `TeachingRequirement`, dan `TimetableSession` sudah didefinisikan di [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts) (Community 2).
  - Tabel IndexedDB `classes`, `teachers`, `subjects`, `rooms`, `requirements`, dan `sessions` sudah dideklarasikan di [`src/db/database.ts`](../../src/db/database.ts) (`SchedovynDatabase`, versi `1`).
  - Saat ini [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts) dan [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) baru menghidrasi dan menyimpan `workspace` serta `dayConfigs` (`FR-01`).
  - Halaman [`src/pages/master-data-page.tsx`](../../src/pages/master-data-page.tsx) saat ini masih berupa halaman *placeholder* yang mengarahkan pengguna ke `/settings`.

### 1.2 Referensi Persyaratan
- **FR-02 (Pengelolaan Data Master — PRD Bagian 5):**
  - **FR-02.A (Kelas / `ClassGroup`):** Menambah, mengubah, dan menghapus Kelas (nama kelas mis. `VII-A`, tingkat kelas mis. `VII`, keterangan opsional).
  - **FR-02.B (Guru / `Teacher`):** Menambah, mengubah, dan menghapus Guru (nama guru, keterangan opsional, serta daftar rentang waktu tidak tersedia / `unavailableIntervals`).
  - **FR-02.C (Mata Pelajaran / `Subject`):** Menambah, mengubah, dan menghapus Mata Pelajaran (nama mata pelajaran, kunci warna `SubjectColorKey`, keterangan opsional).
  - **FR-02.D (Ruangan / `Room`):** Menambah, mengubah, dan menghapus Ruangan (nama/nomor ruangan, jenis ruangan `RoomType`, keterangan opsional, serta daftar rentang waktu tidak tersedia / `unavailableIntervals`).
  - **FR-02.E (Kebutuhan Pembelajaran / `TeachingRequirement`):** Menambah, mengubah, dan menghapus pemetaan kebutuhan sesi mingguan per kelas dan mata pelajaran (kelas, mata pelajaran, jumlah sesi per minggu, durasi setiap sesi dalam menit, guru default opsional, ruangan default opsional, sakelar `roomRequired`, keterangan opsional).
- **TDD Bagian 4.5 (Aturan Integritas Referensial Saat Penghapusan Data Master):**
  - Menghapus Kelas menghapus seluruh `TeachingRequirement` dan `TimetableSession` milik kelas tersebut, serta memperbarui `workspace.activeClassId`.
  - Menghapus Mata Pelajaran ditolak apabila masih digunakan oleh `TeachingRequirement` atau `TimetableSession`, kecuali dikonfirmasi hapus beserta kebutuhan & sesi terkait (`cascade: true`).
  - Menghapus Guru mengubah `defaultTeacherId` pada `TeachingRequirement` menjadi `null` dan `teacherId` pada `TimetableSession` menjadi `null`.
  - Menghapus Ruangan mengubah `defaultRoomId` pada `TeachingRequirement` menjadi `null` dan `roomId` pada `TimetableSession` menjadi `null`.
- **FR-05.7 & AC-05 (Aturan Interval Waktu):** Rentang waktu tidak tersedia (`unavailableIntervals`) pada seorang Guru atau sebuah Ruangan di hari yang sama tidak boleh saling tumpang tindih (`startA < endB && startB < endA`), tetapi diperbolehkan berbatasan tepat (`08:00-09:00` dan `09:00-10:00`).
- **FR-10 & AC-12 (Penyimpanan Otomatis Lokal & Kejujuran Status):** Seluruh operasi CRUD data master langsung disimpan ke IndexedDB dengan indikator status jujur (`Menyimpan...`, `Tersimpan di browser`, atau `Gagal menyimpan lokal`) dan dipulihkan saat `bootWorkspace()`.

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Sebelum menyusun jadwal mingguan pada grid *drag-and-drop*, staf kurikulum harus mendata daftar kelas, mata pelajaran (beserta warna pembeda visual), guru (beserta hari/jam ketika guru tidak bisa mengajar, misalnya guru paruh waktu atau rapat MGMP), ruangan khusus (laboratorium/lapangan beserta waktu ketika ruangan tidak dapat dipakai), serta matriks kebutuhan jam pelajaran per kelas setiap minggu.
- **Cakupan Dalam Task Ini (In-Scope):**
  1. Penambahan konstanta opsi & label Bahasa Indonesia untuk `RoomType` dan `SubjectColorKey` di [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts).
  2. Pembuatan validator murni untuk seluruh entitas Data Master di `src/domain/validation/master-data-validator.ts`.
  3. Perluasan [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts) untuk menghidrasi seluruh tabel data master saat `loadOrSeedWorkspace()` serta menyediakan fungsi CRUD transaksional dengan penegakan integritas referensial.
  4. Perluasan [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) untuk menyimpan koleksi `classes`, `subjects`, `teachers`, `rooms`, `requirements`, dan `sessions` beserta *actions* CRUD yang terhubung ke *auto-save* IndexedDB.
  5. Pembangunan antarmuka pengelolaan 5 tab Data Master di `src/components/master-data/` dan [`src/pages/master-data-page.tsx`](../../src/pages/master-data-page.tsx) sesuai panduan [`DESIGN.md` Bagian 5.3](../../DESIGN.md).
- **Di Luar Cakupan Task Ini (Out-of-Scope):**
  - Grid waktu *drag-and-drop* pada `EditorPage` (`FR-04`).
  - Mesin pendeteksi konflik lintas kelas penuh (`conflict-engine.ts` — `FR-05`).
  - Generator ekspor PDF dan Excel (`FR-08`, `FR-09`).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Penambahan Konstanta Tipe di `src/domain/types/entities.ts`

Tambahkan konstanta berikut pada [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts) tanpa mengubah kontrak tipe yang sudah ada dari `FR-01`:

```typescript
export const ROOM_TYPE_OPTIONS: readonly RoomType[] = [
  "classroom",
  "laboratory",
  "sports",
  "hall",
  "other",
] as const

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  classroom: "Ruang Kelas",
  laboratory: "Laboratorium",
  sports: "Lapangan / Olahraga",
  hall: "Aula",
  other: "Lainnya",
}

export const SUBJECT_COLOR_OPTIONS: readonly SubjectColorKey[] = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "cyan",
  "orange",
  "teal",
  "indigo",
  "slate",
] as const

export const SUBJECT_COLOR_LABELS: Record<SubjectColorKey, string> = {
  blue: "Biru",
  emerald: "Zamrud",
  amber: "Kuning Amber",
  rose: "Merah Muda",
  violet: "Ungu Violet",
  cyan: "Biru Sian",
  orange: "Oranye",
  teal: "Hijau Toska",
  indigo: "Nila (Indigo)",
  slate: "Abu-abu Batu",
}
```

### 2.2 Kontrak Validator Data Master (`src/domain/validation/master-data-validator.ts`)

Seluruh fungsi validasi di bawah ini wajib berupa *pure function* (tanpa dependensi React, DOM, atau Dexie):

```typescript
import type {
  ClassGroup,
  Room,
  RoomType,
  Subject,
  SubjectColorKey,
  Teacher,
  TeachingRequirement,
  TimeInterval,
} from "@/domain/types/entities"

export type MasterDataValidationErrorCode =
  | "EMPTY_CLASS_NAME"
  | "EMPTY_CLASS_GRADE"
  | "DUPLICATE_CLASS_NAME"
  | "EMPTY_SUBJECT_NAME"
  | "DUPLICATE_SUBJECT_NAME"
  | "INVALID_SUBJECT_COLOR"
  | "EMPTY_TEACHER_NAME"
  | "EMPTY_ROOM_NAME"
  | "DUPLICATE_ROOM_NAME"
  | "INVALID_ROOM_TYPE"
  | "INVALID_UNAVAILABLE_TIME_FORMAT"
  | "UNAVAILABLE_END_BEFORE_START"
  | "UNAVAILABLE_INTERVAL_OVERLAP"
  | "REQUIREMENT_INVALID_CLASS"
  | "REQUIREMENT_INVALID_SUBJECT"
  | "REQUIREMENT_DUPLICATE_CLASS_SUBJECT"
  | "REQUIREMENT_INVALID_SESSIONS_PER_WEEK"
  | "REQUIREMENT_INVALID_DURATION"
  | "REQUIREMENT_INVALID_TEACHER"
  | "REQUIREMENT_INVALID_ROOM"

export interface MasterDataValidationIssue {
  code: MasterDataValidationErrorCode
  field: string
  intervalId?: string
  message: string // Bahasa Indonesia yang spesifik
}

export interface MasterDataValidationResult {
  isValid: boolean
  issues: MasterDataValidationIssue[]
}

export interface ClassGroupInput {
  name: string
  grade: string
  notes?: string
}

export interface SubjectInput {
  name: string
  colorKey: SubjectColorKey
  notes?: string
}

export interface TeacherInput {
  name: string
  notes?: string
  unavailableIntervals?: TimeInterval[]
}

export interface RoomInput {
  name: string
  type: RoomType
  notes?: string
  unavailableIntervals?: TimeInterval[]
}

export interface TeachingRequirementInput {
  classId: string
  subjectId: string
  defaultTeacherId: string | null
  defaultRoomId: string | null
  sessionsPerWeek: number
  durationMinutes: number
  roomRequired: boolean
  notes?: string
}

export function validateClassGroupInput(
  input: ClassGroupInput,
  existingClasses: readonly ClassGroup[],
  editingId?: string
): MasterDataValidationResult

export function validateSubjectInput(
  input: SubjectInput,
  existingSubjects: readonly Subject[],
  editingId?: string
): MasterDataValidationResult

export function validateTeacherInput(
  input: TeacherInput,
  existingTeachers?: readonly Teacher[],
  editingId?: string
): MasterDataValidationResult

export function validateRoomInput(
  input: RoomInput,
  existingRooms: readonly Room[],
  editingId?: string
): MasterDataValidationResult

export function validateTeachingRequirementInput(
  input: TeachingRequirementInput,
  context: {
    classes: readonly ClassGroup[]
    subjects: readonly Subject[]
    teachers: readonly Teacher[]
    rooms: readonly Room[]
    existingRequirements: readonly TeachingRequirement[]
  },
  editingId?: string
): MasterDataValidationResult
```

**Aturan Validasi Domain (`master-data-validator.ts`):**
1. **`validateClassGroupInput`:**
   - `input.name.trim()` kosong -> `EMPTY_CLASS_NAME` (`field: "name"`).
   - `input.grade.trim()` kosong -> `EMPTY_CLASS_GRADE` (`field: "grade"`).
   - Terdapat kelas lain (`cls.id !== editingId`) dengan `cls.name.trim().toLowerCase() === input.name.trim().toLowerCase()` -> `DUPLICATE_CLASS_NAME` (`field: "name"`).
2. **`validateSubjectInput`:**
   - `input.name.trim()` kosong -> `EMPTY_SUBJECT_NAME` (`field: "name"`).
   - Terdapat mata pelajaran lain (`sub.id !== editingId`) dengan nama yang sama (*case-insensitive*) -> `DUPLICATE_SUBJECT_NAME` (`field: "name"`).
   - `input.colorKey` tidak ada di `SUBJECT_COLOR_OPTIONS` -> `INVALID_SUBJECT_COLOR` (`field: "colorKey"`).
3. **`validateTeacherInput`:**
   - `input.name.trim()` kosong -> `EMPTY_TEACHER_NAME` (`field: "name"`).
   - Untuk setiap item pada `input.unavailableIntervals ?? []`:
     - Jika `!isValidTimeString(item.startTime)` atau `!isValidTimeString(item.endTime)` -> `INVALID_UNAVAILABLE_TIME_FORMAT` (`field: "unavailableIntervals"`, `intervalId: item.id`).
     - Jika `timeToMinutes(item.startTime) >= timeToMinutes(item.endTime)` -> `UNAVAILABLE_END_BEFORE_START` (`field: "unavailableIntervals"`, `intervalId: item.id`).
   - Untuk setiap pasangan interval `(A, B)` pada `unavailableIntervals` yang memiliki `A.dayOfWeek === B.dayOfWeek`:
     - Jika `doIntervalsOverlap(A.startTime, A.endTime, B.startTime, B.endTime)` bernilai `true` -> `UNAVAILABLE_INTERVAL_OVERLAP` (`field: "unavailableIntervals"`). Interval yang berbatasan tepat (`08:00-09:00` dan `09:00-10:00`) tidak boleh dianggap tumpang tindih (`AC-05`).
4. **`validateRoomInput`:**
   - `input.name.trim()` kosong -> `EMPTY_ROOM_NAME` (`field: "name"`).
   - Terdapat ruangan lain (`rm.id !== editingId`) dengan nama yang sama (*case-insensitive*) -> `DUPLICATE_ROOM_NAME` (`field: "name"`).
   - `input.type` tidak ada di `ROOM_TYPE_OPTIONS` -> `INVALID_ROOM_TYPE` (`field: "type"`).
   - Validasi `unavailableIntervals` sama persis dengan aturan pada `validateTeacherInput`.
5. **`validateTeachingRequirementInput`:**
   - `input.classId` tidak ditemukan di `context.classes` -> `REQUIREMENT_INVALID_CLASS` (`field: "classId"`).
   - `input.subjectId` tidak ditemukan di `context.subjects` -> `REQUIREMENT_INVALID_SUBJECT` (`field: "subjectId"`).
   - Terdapat `req` di `context.existingRequirements` (`req.id !== editingId`) dengan `req.classId === input.classId && req.subjectId === input.subjectId` -> `REQUIREMENT_DUPLICATE_CLASS_SUBJECT` (`field: "subjectId"`).
   - `!Number.isInteger(input.sessionsPerWeek) || input.sessionsPerWeek < 1 || input.sessionsPerWeek > 30` -> `REQUIREMENT_INVALID_SESSIONS_PER_WEEK` (`field: "sessionsPerWeek"`).
   - `!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 480` -> `REQUIREMENT_INVALID_DURATION` (`field: "durationMinutes"`).
   - `input.defaultTeacherId !== null` dan tidak ditemukan di `context.teachers` -> `REQUIREMENT_INVALID_TEACHER` (`field: "defaultTeacherId"`).
   - `input.defaultRoomId !== null` dan tidak ditemukan di `context.rooms` -> `REQUIREMENT_INVALID_ROOM` (`field: "defaultRoomId"`).

---

### 2.3 Kontrak Persistence Layer & Integritas Referensial (`src/db/workspace-repository.ts`)

Perluas [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts) dengan kontrak berikut:

```typescript
export interface HydratedWorkspaceBundle {
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
  classes: ClassGroup[]
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]
}

export interface DeleteSubjectResult {
  deleted: boolean
  requiresConfirmation: boolean
  dependentRequirementsCount: number
  dependentSessionsCount: number
  updatedWorkspace?: Workspace
}
```

1. **Perluasan `loadOrSeedWorkspace(database?: SchedovynDatabase): Promise<HydratedWorkspaceBundle>`:**
   - Tetap kompatibel dengan seluruh pengujian `FR-01` (mengembalikan `workspace` dan `dayConfigs`), sekaligus menambahkan properti `classes`, `subjects`, `teachers`, `rooms`, `requirements`, dan `sessions` yang difilter berdasarkan `workspace.id`.
2. **Operasi CRUD & Integritas Referensial Transaksional (TDD Bagian 4.5):**
   - `saveClassGroup(workspace: Workspace, classGroup: ClassGroup, database?: SchedovynDatabase): Promise<Workspace>`:
     - Menyimpan `classGroup` (`db.classes.put`), memperbarui `workspace.updatedAt` (dan jika `workspace.activeClassId === null`, menyetel `activeClassId = classGroup.id`), lalu menyimpan `workspace`.
   - `deleteClassGroupCascade(workspace: Workspace, classId: string, database?: SchedovynDatabase): Promise<{ updatedWorkspace: Workspace; remainingClasses: ClassGroup[] }>`:
     - Di dalam satu transaksi `rw` (`workspaces`, `classes`, `requirements`, `sessions`):
       - Hapus kelas dengan `id === classId`.
       - Hapus seluruh `TeachingRequirement` dengan `classId === classId`.
       - Hapus seluruh `TimetableSession` dengan `classId === classId`.
       - Jika `workspace.activeClassId === classId`, arahkan `activeClassId` ke `remainingClasses[0]?.id ?? null`.
       - Perbarui `workspace.updatedAt` dan simpan `workspace`.
   - `saveSubject(workspace: Workspace, subject: Subject, database?: SchedovynDatabase): Promise<Workspace>`
   - `deleteSubjectWithCheck(workspace: Workspace, subjectId: string, options?: { cascade?: boolean }, database?: SchedovynDatabase): Promise<DeleteSubjectResult>`:
     - Di dalam satu transaksi `rw` (`workspaces`, `subjects`, `requirements`, `sessions`):
       - Hitung jumlah `requirements` dan `sessions` di ruang kerja yang menggunakan `subjectId`.
       - Jika `(dependentRequirementsCount > 0 || dependentSessionsCount > 0)` dan `!options?.cascade`:
         - Jangan hapus data apa pun; kembalikan `{ deleted: false, requiresConfirmation: true, dependentRequirementsCount, dependentSessionsCount }`.
       - Jika tidak ada dependensi ATAU `options?.cascade === true`:
         - Hapus seluruh `requirements` dan `sessions` yang menggunakan `subjectId` (bila ada), hapus `subject`, perbarui `workspace.updatedAt`, dan kembalikan `{ deleted: true, requiresConfirmation: false, dependentRequirementsCount, dependentSessionsCount, updatedWorkspace }`.
   - `saveTeacher(workspace: Workspace, teacher: Teacher, database?: SchedovynDatabase): Promise<Workspace>`
   - `deleteTeacherAndUnassign(workspace: Workspace, teacherId: string, database?: SchedovynDatabase): Promise<Workspace>`:
     - Di dalam satu transaksi `rw` (`workspaces`, `teachers`, `requirements`, `sessions`):
       - Hapus guru `teacherId`.
       - Ubah seluruh `TeachingRequirement` yang memiliki `defaultTeacherId === teacherId` menjadi `defaultTeacherId: null`.
       - Ubah seluruh `TimetableSession` yang memiliki `teacherId === teacherId` menjadi `teacherId: null`.
       - Perbarui `workspace.updatedAt`.
   - `saveRoom(workspace: Workspace, room: Room, database?: SchedovynDatabase): Promise<Workspace>`
   - `deleteRoomAndUnassign(workspace: Workspace, roomId: string, database?: SchedovynDatabase): Promise<Workspace>`:
     - Di dalam satu transaksi `rw` (`workspaces`, `rooms`, `requirements`, `sessions`):
       - Hapus ruangan `roomId`.
       - Ubah seluruh `TeachingRequirement` yang memiliki `defaultRoomId === roomId` menjadi `defaultRoomId: null`.
       - Ubah seluruh `TimetableSession` yang memiliki `roomId === roomId` menjadi `roomId: null`.
       - Perbarui `workspace.updatedAt`.
   - `saveTeachingRequirement(workspace: Workspace, requirement: TeachingRequirement, database?: SchedovynDatabase): Promise<Workspace>`
   - `deleteTeachingRequirementCascade(workspace: Workspace, requirementId: string, database?: SchedovynDatabase): Promise<Workspace>`:
     - Di dalam satu transaksi `rw` (`workspaces`, `requirements`, `sessions`):
       - Hapus `TeachingRequirement` dengan `id === requirementId`.
       - Hapus seluruh `TimetableSession` yang memiliki `requirementId === requirementId`.
       - Perbarui `workspace.updatedAt`.

---

### 2.4 Kontrak Application Store (`src/store/use-workspace-store.ts`)

Perluas `WorkspaceStoreState` di [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) dengan tetap mempertahankan seluruh state dan action `FR-01`:

```typescript
export interface MasterDataMutationOutcome<T = void> {
  ok: boolean
  data?: T
  validation?: MasterDataValidationResult
  requiresConfirmation?: boolean
  dependentRequirementsCount?: number
  dependentSessionsCount?: number
}

// Tambahan properti pada WorkspaceStoreState:
export interface WorkspaceStoreState {
  // ... properti FR-01 tetap utuh ...
  classes: ClassGroup[]
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]

  // Actions FR-02: Kelas
  createClassGroup: (input: ClassGroupInput) => Promise<MasterDataMutationOutcome<ClassGroup>>
  updateClassGroup: (classId: string, input: ClassGroupInput) => Promise<MasterDataMutationOutcome<ClassGroup>>
  deleteClassGroup: (classId: string) => Promise<boolean>

  // Actions FR-02: Mata Pelajaran
  createSubject: (input: SubjectInput) => Promise<MasterDataMutationOutcome<Subject>>
  updateSubject: (subjectId: string, input: SubjectInput) => Promise<MasterDataMutationOutcome<Subject>>
  deleteSubject: (subjectId: string, options?: { cascade?: boolean }) => Promise<MasterDataMutationOutcome>

  // Actions FR-02: Guru
  createTeacher: (input: TeacherInput) => Promise<MasterDataMutationOutcome<Teacher>>
  updateTeacher: (teacherId: string, input: TeacherInput) => Promise<MasterDataMutationOutcome<Teacher>>
  deleteTeacher: (teacherId: string) => Promise<boolean>

  // Actions FR-02: Ruangan
  createRoom: (input: RoomInput) => Promise<MasterDataMutationOutcome<Room>>
  updateRoom: (roomId: string, input: RoomInput) => Promise<MasterDataMutationOutcome<Room>>
  deleteRoom: (roomId: string) => Promise<boolean>

  // Actions FR-02: Kebutuhan Pembelajaran
  createTeachingRequirement: (
    input: TeachingRequirementInput
  ) => Promise<MasterDataMutationOutcome<TeachingRequirement>>
  updateTeachingRequirement: (
    requirementId: string,
    input: TeachingRequirementInput
  ) => Promise<MasterDataMutationOutcome<TeachingRequirement>>
  deleteTeachingRequirement: (requirementId: string) => Promise<boolean>
}
```

**Aturan Sinkronisasi Store & Kejujuran Penyimpanan (`FR-10`):**
1. Setiap fungsi `create*` dan `update*` wajib memanggil validator murni di `master-data-validator.ts` terlebih dahulu:
   - Jika `!validation.isValid`, jangan ubah state koleksi dan jangan panggil IndexedDB; kembalikan `{ ok: false, validation }`.
2. Jika valid:
   - Setel `saveStatus = "saving"`, `saveErrorMessage = null`.
   - Panggil fungsi repositori transaksional yang sesuai di `src/db/workspace-repository.ts`.
   - Setelah *Promise* IndexedDB *resolved*, perbarui state koleksi di memori (`classes`, `subjects`, `teachers`, `rooms`, `requirements`, `sessions`, `workspace`), setel `saveStatus = "saved"`, `lastSavedAt = updatedWorkspace.updatedAt`, dan kembalikan `{ ok: true, data }`.
   - Jika *Promise* IndexedDB *rejected*, tangkap error, setel `saveStatus = "error"` dan `saveErrorMessage = LOCAL_SAVE_ERROR_MESSAGE`, lalu kembalikan `{ ok: false }`.

---

### 2.5 Spesifikasi Antarmuka Pengguna (`src/components/master-data/` & `src/pages/master-data-page.tsx`)

Sesuai [`DESIGN.md` Bagian 5.3](../../DESIGN.md) dan aturan kualitas (`radix-lyra` / `rounded-none`, `tabular-nums`, Bahasa Indonesia, tanpa *em dash* pada teks UI):

1. **`src/pages/master-data-page.tsx`:**
   - Menampilkan header halaman dengan ringkasan jumlah entitas saat ini (`X Kelas`, `Y Mata Pelajaran`, `Z Guru`, `W Ruangan`, `K Kebutuhan Sesi`) dalam format `tabular-nums`.
   - Menyediakan bar navigasi 5 tab:
     1. **Kelas** (`classes`)
     2. **Mata Pelajaran** (`subjects`)
     3. **Guru** (`teachers`)
     4. **Ruangan** (`rooms`)
     5. **Kebutuhan Pembelajaran** (`requirements`)
2. **Komponen Tab & Dialog di `src/components/master-data/`:**
   - **`classes-tab.tsx`:**
     - Tabel daftar Kelas (`Nama Kelas`, `Tingkat`, `Keterangan`, `Jumlah Kebutuhan Mapel`, `Aksi Edit / Hapus`).
     - Form/Dialog tambah & edit Kelas (placeholder: `"Contoh: VII-A"`, `"Contoh: VII"`, `"Contoh: Ruang lantai 2"`).
     - Konfirmasi hapus menggunakan `AlertDialog` yang menjelaskan bahwa menghapus kelas akan ikut menghapus kebutuhan pembelajaran dan sesi terjadwal milik kelas tersebut.
   - **`subjects-tab.tsx`:**
     - Tabel daftar Mata Pelajaran (`Warna & Nama Mata Pelajaran`, `Keterangan`, `Digunakan di Kebutuhan`, `Aksi Edit / Hapus`).
     - Pemilih warna (`SubjectColorKey`) dengan indikator visual sesuai palet [`DESIGN.md` Bagian 2.3](../../DESIGN.md).
     - Jika pengguna menghapus Mata Pelajaran yang masih digunakan oleh `TeachingRequirement` (`requiresConfirmation === true`), tampilkan `AlertDialog` konfirmasi khusus yang menyebutkan jumlah kebutuhan/sesi terkait dan tombol `"Tetap Hapus Beserta Kebutuhan Terkait"`.
   - **`teachers-tab.tsx`:**
     - Tabel daftar Guru (`Nama Guru`, `Waktu Tidak Tersedia`, `Keterangan`, `Aksi Edit / Hapus`).
     - Form/Dialog tambah & edit Guru yang dilengkapi editor **Waktu Tidak Tersedia (`unavailableIntervals`)**: pengguna dapat menambah baris rentang waktu (`dayOfWeek`, `startTime`, `endTime`, `label` opsional seperti `"MGMP Kabupaten"`), mengubahnya, atau menghapusnya.
   - **`rooms-tab.tsx`:**
     - Tabel daftar Ruangan (`Nama Ruangan`, `Jenis Ruangan`, `Waktu Tidak Tersedia`, `Keterangan`, `Aksi Edit / Hapus`).
     - Form/Dialog tambah & edit Ruangan dengan pemilih `RoomType` (`Ruang Kelas`, `Laboratorium`, `Lapangan / Olahraga`, `Aula`, `Lainnya`) serta editor **Waktu Tidak Tersedia (`unavailableIntervals`)**.
   - **`requirements-tab.tsx`:**
     - Filter tampilan berdasarkan Kelas (`Semua Kelas` atau kelas tertentu) serta indikator ringkas total sesi/minggu dan total menit/minggu (`tabular-nums`).
     - Jika belum ada Kelas atau belum ada Mata Pelajaran di ruang kerja, tampilkan *Empty State* informatif (`R-27`) yang menjelaskan prasyarat tersebut beserta tombol untuk berpindah ke tab **Kelas** atau **Mata Pelajaran**.
     - Form/Dialog tambah & edit Kebutuhan Pembelajaran: pemilih Kelas (`Select`), pemilih Mata Pelajaran (`Select`), input `Jumlah Sesi per Minggu` (`sessionsPerWeek`, `tabular-nums`), input `Durasi per Sesi (Menit)` (`durationMinutes`, `tabular-nums`, default `45` atau kelipatan snap), pemilih `Guru Default` (opsional / `"Belum Ditentukan"`), sakelar `Wajib Menggunakan Ruangan` (`Switch` `roomRequired`), dan pemilih `Ruangan Default` (opsional).

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-FR02-01 — CRUD Data Master & Pemulihan Penyimpanan Lokal (FR-02.A s.d. FR-02.E, AC-12)
- **Given** ruang kerja telah terhidrasi,
- **When** pengguna menambahkan Kelas `"VII-A"` (tingkat `"VII"`), Mata Pelajaran `"Matematika"` (warna `"blue"`), Guru `"Budi Santoso"`, Ruangan `"Lab IPA 1"` (jenis `"laboratory"`), dan Kebutuhan Pembelajaran untuk `"VII-A"` + `"Matematika"` sebanyak `3` sesi/minggu berdurasi `90` menit dengan guru `"Budi Santoso"` dan ruangan `"Lab IPA 1"`,
- **Then** seluruh entitas tersimpan di IndexedDB (`saveStatus === "saved"`), dan ketika aplikasi dimuat ulang (`bootWorkspace()` dipanggil kembali), kelima entitas tersebut dipulihkan secara utuh.

### AC-FR02-02 — Validasi Keunikan & Kelengkapan Atribut Data Master (FR-02, NFR-06)
- **Given** sudah ada Kelas `"VII-A"`, Mata Pelajaran `"Matematika"`, dan Kebutuhan Pembelajaran `("VII-A", "Matematika")`,
- **When** pengguna mencoba menambahkan Kelas baru bernama `"vii-a"` (duplikat *case-insensitive*) atau menambahkan Kebutuhan Pembelajaran kedua untuk pasangan `("VII-A", "Matematika")` yang sama, atau mengisi `sessionsPerWeek: 0`,
- **Then** sistem menolak penyimpanan, mengembalikan kode error `DUPLICATE_CLASS_NAME` / `REQUIREMENT_DUPLICATE_CLASS_SUBJECT` / `REQUIREMENT_INVALID_SESSIONS_PER_WEEK`, dan menampilkan pesan kesalahan Bahasa Indonesia di UI.

### AC-FR02-03 — Validasi Waktu Tidak Tersedia Guru & Ruangan (FR-02.B, FR-02.D, FR-05.7, AC-05)
- **Given** pengguna sedang mengatur `unavailableIntervals` pada seorang Guru atau sebuah Ruangan untuk hari `"Senin"`,
- **When** pengguna menambahkan dua rentang waktu tidak tersedia yang berbatasan tepat yaitu `"08:00"`-`"09:30"` dan `"09:30"`-`"11:00"`,
- **Then** validator mengizinkan keduanya (`isValid === true` sesuai aturan `startA < endB && startB < endA`).
- **Namun When** pengguna menambahkan rentang `"09:00"`-`"10:00"` pada hari `"Senin"` yang beririsan, atau mengisi `"10:00"`-`"08:00"` (`startTime >= endTime`),
- **Then** validator menolak input dengan kode `UNAVAILABLE_INTERVAL_OVERLAP` atau `UNAVAILABLE_END_BEFORE_START`.

### AC-FR02-04 — Integritas Referensial Saat Menghapus Kelas & Mata Pelajaran (TDD Bagian 4.5)
- **Given** Kelas `"VII-A"` memiliki Kebutuhan Pembelajaran `"Matematika"` dan sesi terjadwal terkait,
- **When** pengguna menghapus Mata Pelajaran `"Matematika"` tanpa flag konfirmasi (`cascade: false`),
- **Then** sistem menolak penghapusan langsung dan mengembalikan `requiresConfirmation: true` beserta jumlah kebutuhan/sesi yang terdampak; setelah pengguna mengonfirmasi penghapusan (`cascade: true`), Mata Pelajaran beserta kebutuhan dan sesi terkait terhapus secara atomik.
- **Dan When** pengguna menghapus Kelas `"VII-A"`,
- **Then** seluruh `TeachingRequirement` dan `TimetableSession` milik `"VII-A"` ikut terhapus dari IndexedDB, dan `workspace.activeClassId` diperbarui ke kelas lain yang tersisa atau `null`.

### AC-FR02-05 — Integritas Referensial Saat Menghapus Guru & Ruangan (TDD Bagian 4.5)
- **Given** Guru `"Budi Santoso"` dan Ruangan `"Lab IPA 1"` telah ditugaskan sebagai `defaultTeacherId` dan `defaultRoomId` pada `TeachingRequirement` (serta `teacherId` / `roomId` pada `TimetableSession`),
- **When** pengguna menghapus Guru `"Budi Santoso"` dan Ruangan `"Lab IPA 1"`,
- **Then** `TeachingRequirement` dan `TimetableSession` tersebut **tidak** ikut terhapus, melainkan nilai `defaultTeacherId` / `teacherId` dan `defaultRoomId` / `roomId` diubah menjadi `null` secara transaksional di IndexedDB.

### AC-FR02-06 — Kejujuran Status Penyimpanan saat Operasi Data Master Gagal (FR-10.4, FR-10.5)
- **Given** transaksi tulis ke IndexedDB mengalami kegagalan saat menambah atau mengubah data master,
- **When** pengguna menyimpan entitas baru,
- **Then** `saveStatus` disetel menjadi `"error"`, `saveErrorMessage` berisi pesan peringatan Bahasa Indonesia, dan UI menampilkan banner/indikator `"Gagal menyimpan lokal"`.

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Task QA Engineer (Fase RED)

> **Instruksi untuk QA Engineer:**  
> Ikuti protokol di [`.agents/agents/qa-engineer/agent.md`](../../.agents/agents/qa-engineer/agent.md). Jalankan `graphify query "FR-02 Master Data"` sebelum memulai. Buat seluruh berkas pengujian di bawah ini hingga eksekusi `bun run test` gagal (**RED**) pada pengujian baru `FR-02` karena fitur belum diimplementasikan (pastikan test `FR-01` yang sudah ada tidak rusak oleh perubahan sintaks test). Setelah selesai menulis test, jalankan pembaruan `graphify . --update`.

1. **Task QA-01: Unit Test Validator Data Master (`src/__tests__/domain/master-data-validator.spec.ts`)**
   - Uji `validateClassGroupInput`: validasi nama kosong (`EMPTY_CLASS_NAME`), tingkat kosong (`EMPTY_CLASS_GRADE`), duplikasi nama *case-insensitive* (`DUPLICATE_CLASS_NAME`), serta pengecualian `editingId` saat menyunting kelas yang sama.
   - Uji `validateSubjectInput`: validasi nama kosong (`EMPTY_SUBJECT_NAME`), duplikasi nama (`DUPLICATE_SUBJECT_NAME`), dan validasi `SubjectColorKey` (`INVALID_SUBJECT_COLOR`).
   - Uji `validateTeacherInput` dan `validateRoomInput`:
     - Validasi nama kosong dan duplikasi nama ruangan (`DUPLICATE_ROOM_NAME`).
     - Validasi `unavailableIntervals`: menerima interval berurutan yang berbatasan tepat (`08:00-09:00` dan `09:00-10:00`, `AC-05`), menolak `startTime >= endTime` (`UNAVAILABLE_END_BEFORE_START`), dan menolak dua interval yang tumpang tindih pada hari yang sama (`UNAVAILABLE_INTERVAL_OVERLAP`).
   - Uji `validateTeachingRequirementInput`:
     - Menolak `classId` atau `subjectId` yang tidak ditemukan di konteks ruang kerja.
     - Menolak duplikasi pasangan `(classId, subjectId)` (`REQUIREMENT_DUPLICATE_CLASS_SUBJECT`) kecuali pada `editingId` yang sama.
     - Menolak `sessionsPerWeek < 1` atau bukan bilangan bulat (`REQUIREMENT_INVALID_SESSIONS_PER_WEEK`) dan `durationMinutes < 5` (`REQUIREMENT_INVALID_DURATION`).
     - Menolak `defaultTeacherId` atau `defaultRoomId` tidak valid jika tidak bernilai `null`.

2. **Task QA-02: Integration Test Repositori & Integritas Referensial (`src/__tests__/db/master-data-repository.spec.ts`)**
   - Uji `loadOrSeedWorkspace()` mengembalikan `classes`, `subjects`, `teachers`, `rooms`, `requirements`, dan `sessions`.
   - Uji `saveClassGroup` & `deleteClassGroupCascade`: pastikan menghapus kelas menghapus `TeachingRequirement` dan `TimetableSession` milik kelas tersebut serta memperbarui `workspace.activeClassId`.
   - Uji `deleteSubjectWithCheck`:
     - Jika mata pelajaran masih dipakai di `requirements` atau `sessions` dan `cascade` tidak diberikan -> mengembalikan `deleted: false, requiresConfirmation: true` dan data tetap utuh di IndexedDB.
     - Jika dipanggil dengan `{ cascade: true }` -> menghapus mata pelajaran beserta `requirements` dan `sessions` terkait secara atomik.
   - Uji `deleteTeacherAndUnassign` & `deleteRoomAndUnassign`: pastikan menghapus guru/ruangan mengubah `defaultTeacherId`/`teacherId` atau `defaultRoomId`/`roomId` menjadi `null` pada `requirements` dan `sessions` di IndexedDB tanpa menghapus record kebutuhan/sesi tersebut.
   - Uji `deleteTeachingRequirementCascade`: menghapus kebutuhan pembelajaran sekaligus menghapus `TimetableSession` yang memiliki `requirementId` tersebut.

3. **Task QA-03: Integration Test Store Data Master & Auto-Save (`src/__tests__/store/use-workspace-store-fr02.spec.ts`)**
   - Uji seluruh action store (`createClassGroup`, `updateClassGroup`, `deleteClassGroup`, `createSubject`, `updateSubject`, `deleteSubject`, `createTeacher`, `updateTeacher`, `deleteTeacher`, `createRoom`, `updateRoom`, `deleteRoom`, `createTeachingRequirement`, `updateTeachingRequirement`, `deleteTeachingRequirement`).
   - Uji pemulihan penuh (`AC-12`): setelah menambahkan kelima jenis data master melalui store, reset state store di memori lalu panggil `bootWorkspace()`; pastikan seluruh koleksi `classes`, `subjects`, `teachers`, `rooms`, dan `requirements` pulih dengan akurat.
   - Uji kejujuran `saveStatus` (`FR-10`): simulasikan kegagalan tulis pada repositori saat `createClassGroup` / `createTeachingRequirement`, pastikan `saveStatus === "error"` dan `saveErrorMessage` terisi.

4. **Task QA-04: Component Test Halaman Data Master (`src/__tests__/pages/master-data-page.test.tsx`)**
   - Uji render `MasterDataPage`: menampilkan kelima tab (`Kelas`, `Mata Pelajaran`, `Guru`, `Ruangan`, `Kebutuhan Pembelajaran`) beserta empty state yang sesuai ketika data masih kosong.
   - Uji alur pengguna menambahkan Kelas baru (`"VII-A"`), berpindah ke tab Mata Pelajaran untuk menambahkan `"Matematika"`, berpindah ke tab Guru untuk menambahkan `"Budi Santoso"` beserta waktu tidak tersedia, berpindah ke tab Ruangan untuk menambahkan `"Lab IPA"`, lalu berpindah ke tab Kebutuhan Pembelajaran untuk memetakan kebutuhan sesi mingguan `"VII-A"` + `"Matematika"`.
   - Uji tampilan pesan validasi Bahasa Indonesia ketika pengguna mencoba menyimpan form kosong atau duplikat.

---

### 4.2 Task Frontend Engineer (Fase GREEN)

> **Instruksi untuk Frontend Engineer:**  
> Ikuti protokol di [`.agents/agents/frontend-engineer/agent.md`](../../.agents/agents/frontend-engineer/agent.md) dan panduan desain di [`DESIGN.md`](../../DESIGN.md). Jalankan `graphify query "FR-02 Master Data"` sebelum memulai. Implementasikan seluruh modul di bawah ini hingga seluruh test `FR-01` dan `FR-02` berstatus **GREEN**, serta lulus `bun run typecheck`, `bun run lint`, dan `bun run build`. Jangan gunakan `any`, jangan gunakan karakter em dash pada salinan teks UI (`R-02`), gunakan `tabular-nums` untuk seluruh angka/waktu/durasi, dan pertahankan geometri `rounded-none` (`radix-lyra`). Setelah selesai, jalankan `graphify . --update`.

1. **Task FE-01: Perluasan Konstanta Entitas & Implementasi Validator Data Master (`src/domain/`)**
   - Perbarui [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts) dengan menambahkan `ROOM_TYPE_OPTIONS`, `ROOM_TYPE_LABELS`, `SUBJECT_COLOR_OPTIONS`, dan `SUBJECT_COLOR_LABELS` sesuai Bagian 2.1.
   - Buat `src/domain/validation/master-data-validator.ts` sesuai kontrak pada Bagian 2.2.

2. **Task FE-02: Perluasan Persistence Layer & Transaksi Integritas Referensial (`src/db/workspace-repository.ts`)**
   - Perbarui [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts) sesuai kontrak pada Bagian 2.3:
     - Perluas `loadOrSeedWorkspace()` agar memuat `classes`, `subjects`, `teachers`, `rooms`, `requirements`, dan `sessions` milik `workspace.id`.
     - Implementasikan `saveClassGroup`, `deleteClassGroupCascade`, `saveSubject`, `deleteSubjectWithCheck`, `saveTeacher`, `deleteTeacherAndUnassign`, `saveRoom`, `deleteRoomAndUnassign`, `saveTeachingRequirement`, dan `deleteTeachingRequirementCascade`.

3. **Task FE-03: Perluasan Application Store (`src/store/use-workspace-store.ts`)**
   - Perbarui [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) sesuai kontrak pada Bagian 2.4 agar mengelola state dan *actions* CRUD untuk `classes`, `subjects`, `teachers`, `rooms`, `requirements`, dan `sessions` dengan tetap menjaga kompatibilitas penuh terhadap `FR-01`.

4. **Task FE-04: Implementasi Komponen UI Data Master & `MasterDataPage` (`src/components/master-data/` & `src/pages/master-data-page.tsx`)**
   - Buat utilitas pemetaan kelas warna mata pelajaran di `src/lib/subject-colors.ts` sesuai tabel palet [`DESIGN.md` Bagian 2.3](../../DESIGN.md) agar dapat digunakan bersama di halaman Data Master dan Editor Jadwal.
   - Buat komponen sub-fitur di `src/components/master-data/`:
     - `unavailable-intervals-editor.tsx`: Komponen reusable untuk mengelola daftar `TimeInterval` (Waktu Tidak Tersedia) pada form Guru dan Ruangan.
     - `classes-tab.tsx`: Tabel & form/dialog CRUD Kelas beserta `AlertDialog` konfirmasi hapus.
     - `subjects-tab.tsx`: Tabel & form/dialog CRUD Mata Pelajaran dengan pemilih palet warna `SubjectColorKey` dan `AlertDialog` konfirmasi hapus berjenjang apabila mata pelajaran masih digunakan oleh kebutuhan pembelajaran.
     - `teachers-tab.tsx`: Tabel & form/dialog CRUD Guru beserta `UnavailableIntervalsEditor`.
     - `rooms-tab.tsx`: Tabel & form/dialog CRUD Ruangan beserta pemilih `RoomType` dan `UnavailableIntervalsEditor`.
     - `requirements-tab.tsx`: Tabel & form/dialog CRUD Kebutuhan Pembelajaran dengan filter Kelas, perhitungan ringkasan sesi/menit mingguan (`tabular-nums`), sakelar `Wajib Ruangan`, dan penanganan *empty state* jika Kelas/Mapel belum tersedia.
   - Perbarui [`src/pages/master-data-page.tsx`](../../src/pages/master-data-page.tsx) untuk mengintegrasikan kelima tab tersebut.

5. **Task FE-05: Quality Gate & Sinkronisasi Graphify**
   - Jalankan verifikasi menyeluruh menggunakan Bun:
     ```bash
     bun run typecheck
     bun run lint
     bun run test
     bun run build
     ```
   - Perbarui *knowledge graph* proyek dengan menjalankan alur `graphify . --update`.
