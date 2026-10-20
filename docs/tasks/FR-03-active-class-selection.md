# Spesifikasi Task & Kontrak Teknis: FR-03 — Pemilihan Kelas Aktif

**Kode Fitur:** `FR-03` (Didukung oleh `AC-01`, `FR-10`, `AC-12`, `NFR-02`, `NFR-05`, `NFR-06`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)
- Task Sebelumnya (Selesai):
  - [`docs/tasks/FR-01-workspace-and-schedule-config.md`](./FR-01-workspace-and-schedule-config.md)
  - [`docs/tasks/FR-02-master-data-management.md`](./FR-02-master-data-management.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran *knowledge graph* pada [`graphify-out/graph.json`](../../graphify-out/graph.json) dan [`graphify-out/GRAPH_REPORT.md`](../../graphify-out/GRAPH_REPORT.md):
- **Node Domain & Arsitektur Terkait:**
  - `Drag-and-Drop Timetable Editor (FR-03, FR-04, FR-06)` (`docs/Schedovyn-PRD.md` L205-L266) menjadi pintu masuk interaksi penyuntingan jadwal berbasis kelas.
  - `Workspace` di [`src/domain/types/entities.ts`](../../src/domain/types/entities.ts#L121-L129) telah memiliki atribut `activeClassId: string | null`.
  - `saveClassGroup` dan `deleteClassGroupCascade` di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts#L153-L223) sudah mengatur `activeClassId` secara otomatis ketika kelas pertama dibuat atau kelas aktif dihapus, namun **belum ada** fungsi khusus di repositori maupun action di [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) untuk mengganti kelas aktif secara eksplisit (`setActiveClass`).
  - Rute utama `/` di [`src/route/index.tsx`](../../src/route/index.tsx) masih merender halaman pengantar [`src/pages/main-page.tsx`](../../src/pages/main-page.tsx) dan belum memiliki komponen **Contextual Action Bar (`ClassSelectorBar`)** maupun **`EditorPage`** (`src/pages/editor-page.tsx`).

### 1.2 Referensi Persyaratan
- **FR-03 (Pemilihan Kelas Aktif — PRD Bagian 5):**
  Pengguna harus memilih kelas sebelum masuk ke editor jadwal kelas tersebut.
  1. Sistem menampilkan daftar kelas yang telah dibuat (`FR-03.1`).
  2. Pengguna dapat memilih kelas melalui selector yang mudah dijangkau (`FR-03.2`).
  3. Setelah kelas dipilih, editor menampilkan jadwal kelas tersebut (`FR-03.3`).
  4. Pengguna dapat berpindah ke kelas lain tanpa mengulang konfigurasi ruang kerja (`FR-03.4`).
  5. Perpindahan kelas tidak menghapus atau mengubah jadwal kelas sebelumnya (`FR-03.5`).
  6. Sistem tetap menyimpan data jadwal seluruh kelas sebagai dasar pemeriksaan konflik lintas kelas (`FR-03.6`).
- **AC-01 (Pemilihan Kelas — PRD Bagian 12 & TDD Bagian 10):**
  - **Given** pengguna telah membuat beberapa kelas,
  - **When** pengguna memilih salah satu kelas,
  - **Then** editor menampilkan jadwal kelas tersebut dan tidak mengubah jadwal kelas lain.
- **FR-10 & AC-12 (Penyimpanan Otomatis Lokal & Kejujuran Status):**
  - Perubahan `activeClassId` disimpan secara otomatis ke IndexedDB sehingga ketika halaman dimuat ulang pada browser yang sama, kelas aktif terakhir langsung dipulihkan.

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Sebuah sekolah memiliki banyak rombongan belajar (misalnya `VII-A`, `VII-B`, `VIII-A`, `IX-A`). Menampilkan seluruh jadwal kelas sekaligus dalam satu layar akan terlalu padat, tetapi menyunting satu kelas tidak boleh menghilangkan data kelas lain yang dibutuhkan untuk mendeteksi bentrokan guru dan ruangan lintas kelas.
- **Cakupan Dalam Task Ini (In-Scope):**
  1. Pembuatan fungsi selector domain murni di `src/domain/timetable/active-class-context.ts` untuk memfilter `ClassGroup`, `TeachingRequirement`, `TimetableSession`, serta menghitung statistik sesi kelas aktif vs total sesi ruang kerja.
  2. Penambahan fungsi persistensi `setActiveClassInWorkspace()` dan normalisasi `activeClassId` saat hidrasi di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts).
  3. Penambahan action `setActiveClass(classId)` pada [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) yang menjamin imutabilitas data kelas lain (`AC-01`) dan sinkronisasi status penyimpanan (`FR-10`).
  4. Pembangunan komponen `ClassSelectorBar` (`src/components/layout/class-selector-bar.tsx`) sesuai [`DESIGN.md` Bagian 5.1.2](../../DESIGN.md#L212-L216).
  5. Pembangunan `EditorPage` (`src/pages/editor-page.tsx`) dan pembaruan rute `/` di [`src/route/index.tsx`](../../src/route/index.tsx) yang menangani 3 kondisi tampilan: *Empty State* (belum ada kelas), *Unselected Class State* (pemilihan kelas awal), dan *Active Class Workspace View* (menampilkan jadwal & kebutuhan sesi khusus kelas aktif).
- **Di Luar Cakupan Task Ini (Out-of-Scope):**
  - Interaksi *drag-and-drop* grid waktu `@dnd-kit/react` (`FR-04`, akan dikerjakan pada task berikutnya).
  - Mesin pendeteksi konflik lintas kelas penuh (`FR-05`).
  - Ekspor PDF dan Excel (`FR-08`, `FR-09`).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Kontrak Selector Domain Murni (`src/domain/timetable/active-class-context.ts`)

Seluruh fungsi di dalam `src/domain/timetable/active-class-context.ts` wajib berupa *pure function* (tanpa mengimpor React, DOM, atau Dexie) dan tidak boleh memutasi array input:

```typescript
import type {
  ClassGroup,
  TeachingRequirement,
  TimetableSession,
} from "@/domain/types/entities"

export interface ActiveClassSessionStats {
  activeClassId: string | null
  requiredSessionsCount: number
  scheduledSessionsCount: number
  unscheduledSessionsCount: number
  workspaceTotalSessionsCount: number
}

/**
 * Mengembalikan objek ClassGroup yang cocok dengan activeClassId,
 * atau null jika activeClassId bernilai null / tidak ditemukan di daftar classes.
 */
export function resolveActiveClass(
  classes: readonly ClassGroup[],
  activeClassId: string | null
): ClassGroup | null

/**
 * Mengembalikan daftar TeachingRequirement khusus untuk kelas aktif (activeClassId).
 * Jika activeClassId null atau tidak cocok, mengembalikan array kosong [].
 * Tidak memodifikasi array requirements asal.
 */
export function getActiveClassRequirements(
  requirements: readonly TeachingRequirement[],
  activeClassId: string | null
): TeachingRequirement[]

/**
 * Mengembalikan daftar TimetableSession khusus untuk kelas aktif (activeClassId).
 * Jika activeClassId null atau tidak cocok, mengembalikan array kosong [].
 * Tidak memodifikasi array sessions asal.
 */
export function getActiveClassSessions(
  sessions: readonly TimetableSession[],
  activeClassId: string | null
): TimetableSession[]

/**
 * Menghitung statistik ringkas sesi untuk kelas aktif sekaligus menjaga informasi
 * total sesi di seluruh ruang kerja (FR-03.6).
 */
export function getActiveClassSessionStats(
  requirements: readonly TeachingRequirement[],
  sessions: readonly TimetableSession[],
  activeClassId: string | null
): ActiveClassSessionStats
```

**Aturan Perhitungan `getActiveClassSessionStats`:**
1. `workspaceTotalSessionsCount` selalu bernilai `sessions.length` (jumlah seluruh sesi dari semua kelas di ruang kerja).
2. Jika `activeClassId === null`, maka `requiredSessionsCount = 0`, `scheduledSessionsCount = 0`, dan `unscheduledSessionsCount = 0`.
3. Jika `activeClassId !== null`:
   - Ambil `classReqs = getActiveClassRequirements(requirements, activeClassId)` dan `classSessions = getActiveClassSessions(sessions, activeClassId)`.
   - `requiredSessionsCount` adalah jumlah seluruh `req.sessionsPerWeek` pada `classReqs`.
   - `scheduledSessionsCount` adalah `classSessions.length`.
   - Untuk setiap `req` di `classReqs`, hitung jumlah sesi di `classSessions` yang memiliki `ses.requirementId === req.id` (sebut `scheduledForReq`). Sisa kebutuhan untuk `req` tersebut adalah `Math.max(0, req.sessionsPerWeek - scheduledForReq)`.
   - `unscheduledSessionsCount` adalah penjumlahan seluruh sisa kebutuhan `req` pada `classReqs`.

---

### 2.2 Kontrak Persistence Layer (`src/db/workspace-repository.ts`)

Tambahkan fungsi berikut pada [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts):

```typescript
export async function setActiveClassInWorkspace(
  workspace: Workspace,
  activeClassId: string | null,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace>
```

**Aturan Implementasi Persistence:**
1. `setActiveClassInWorkspace`:
   - Membuat objek `updatedWorkspace: Workspace` dengan `activeClassId` baru dan `updatedAt: new Date().toISOString()`.
   - Menyimpan `updatedWorkspace` ke `database.workspaces.put(updatedWorkspace)` di dalam transaksi `rw` pada `database.workspaces`.
   - **Dilarang** mengubah atau menghapus record pada `dayConfigs`, `classes`, `subjects`, `teachers`, `rooms`, `requirements`, maupun `sessions`.
2. **Normalisasi saat `loadOrSeedWorkspace`:**
   - Saat memuat workspace yang sudah ada, jika `workspace.activeClassId !== null` tetapi ID tersebut tidak ditemukan di dalam `classes` (misalnya state lama), maka arahkan ke `classes[0]?.id ?? null` dan perbarui `workspace` di dalam transaksi tersebut.

---

### 2.3 Kontrak Application Store (`src/store/use-workspace-store.ts`)

Perluas `WorkspaceStoreState` di [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts) dengan menambahkan action `setActiveClass`:

```typescript
export interface WorkspaceStoreState {
  // ... seluruh state & actions FR-01 dan FR-02 tetap utuh ...

  // Action FR-03: Pemilihan Kelas Aktif
  setActiveClass: (classId: string | null) => Promise<boolean>
}
```

**Perilaku Wajib `setActiveClass(classId)` (`FR-03` & `AC-01`):**
1. Ambil `{ workspace, classes }` dari `get()`. Jika `!workspace`, kembalikan `false`.
2. Jika `classId !== null` dan tidak ada kelas di `classes` dengan `cls.id === classId`, kembalikan `false` tanpa mengubah state apa pun.
3. Jika `workspace.activeClassId === classId` dan `get().saveStatus !== "error"`, tetap dapat mengembalikan `true` (atau memperbarui secara idempoten).
4. Perbarui state `workspace: { ...workspace, activeClassId: classId }`, setel `saveStatus = "saving"`, `saveErrorMessage = null`.
5. Panggil `workspaceRepo.setActiveClassInWorkspace(workspace, classId)`:
   - Jika berhasil (*resolved*): perbarui `workspace` dengan `updatedAt` terbaru, setel `saveStatus = "saved"`, `lastSavedAt = savedWorkspace.updatedAt`, dan kembalikan `true`.
   - Jika gagal (*rejected*): setel `saveStatus = "error"`, `saveErrorMessage = LOCAL_SAVE_ERROR_MESSAGE`, dan kembalikan `false`.
6. Pastikan array `dayConfigs`, `classes`, `subjects`, `teachers`, `rooms`, `requirements`, dan `sessions` di store **sama sekali tidak termutasi atau berkurang** ketika berpindah kelas aktif (`FR-03.4`, `FR-03.5`, `FR-03.6`, `AC-01`).

---

### 2.4 Spesifikasi Antarmuka Pengguna (`src/components/layout/class-selector-bar.tsx` & `src/pages/editor-page.tsx`)

Mengacu pada [`DESIGN.md` Bagian 5.1.2, 5.2, dan 6](../../DESIGN.md):

1. **Komponen `ClassSelectorBar` (`src/components/layout/class-selector-bar.tsx`):**
   - Dirender sebagai **Contextual Action Bar** di bagian atas `EditorPage` (`border-b border-border bg-muted/40 px-4 py-2 flex flex-wrap items-center justify-between gap-3`).
   - **Area Kiri (Pemilih Kelas Aktif — `FR-03.1`, `FR-03.2`):**
     - Label `"Kelas Aktif"` yang terhubung ke komponen `Select` (`src/components/ui/select.tsx`) dengan `aria-label="Pilih Kelas Aktif"`.
     - Di dalam `SelectContent` -> `SelectGroup`, render seluruh `classes` dari store sebagai `SelectItem` dengan teks `${cls.name} (Tingkat ${cls.grade})`.
     - Saat pengguna memilih kelas lain, panggil `setActiveClass(selectedClassId)`.
   - **Area Tengah/Kanan (Ringkasan Statistik Sesi Kelas Aktif & Ruang Kerja — `FR-03.6`):**
     - Menampilkan lencana statistik dengan kelas `tabular-nums`:
       - Jumlah sesi terjadwal vs kebutuhan sesi mingguan untuk kelas aktif: misalnya `Terjadwal: 0 / 4 sesi` dan `Belum Terjadwal: 4 sesi`.
       - Indikator penyimpanan lintas kelas: `Total Sesi Ruang Kerja: X sesi` (menunjukkan bahwa jadwal seluruh kelas tetap disimpan untuk pemeriksaan konflik lintas kelas).
     - Pintasan tombol cepat ke `/master-data` (`"Kelola Data Master"`) dan `/settings` (`"Pengaturan Jam"`).

2. **Halaman `EditorPage` (`src/pages/editor-page.tsx`) & Rute `/` (`src/route/index.tsx`):**
   - Perbarui [`src/route/index.tsx`](../../src/route/index.tsx) agar path `/` merender `<EditorPage />` (dan ekspor ulang `EditorPage` dari `src/pages/main-page.tsx` bila ada test/impor lama yang merujuk ke `MainPage`).
   - **Tiga Kondisi Tampilan Wajib pada `EditorPage` (`R-27`):**
     1. **Kondisi 1 — Belum Ada Kelas di Ruang Kerja (`classes.length === 0`):**
        - Tampilkan *Empty State* sesuai [`DESIGN.md` Bagian 6.1](../../DESIGN.md#L336):
          `"Belum ada kelas di ruang kerja ini. Tambahkan kelas terlebih dahulu di menu Data Master sebelum menyusun jadwal."`
        - Sertakan tombol aksi langsung `"Buka Data Master Kelas"` yang mengarah ke `/master-data` serta ringkasan identitas ruang kerja & jumlah hari sekolah aktif.
     2. **Kondisi 2 — Ada Kelas, Namun Belum Ada Kelas Aktif Terpilih (`classes.length > 0 && activeClass === null`):**
        - Tampilkan `ClassSelectorBar` di bagian atas dan kartu pemilihan kelas (`"Pilih Kelas untuk Mulai Menyunting Jadwal"`) yang menampilkan daftar tombol/kartu setiap kelas (`cls.name`, `Tingkat ${cls.grade}`) agar pengguna dapat memilih kelas aktif dengan satu klik (`FR-03`).
     3. **Kondisi 3 — Kelas Aktif Terpilih (`activeClass !== null`):**
        - Tampilkan `ClassSelectorBar` di bagian atas.
        - Tampilkan header konteks kelas aktif: nama kelas (`activeClass.name`), tingkat (`activeClass.grade`), keterangan kelas (bila ada), serta ringkasan konfigurasi jam belajar ruang kerja (`activeDaysCount` hari aktif, interval snap `defaultSnapIntervalMinutes` menit).
        - Tampilkan dua kartu fokus untuk kelas aktif (`FR-03.3`, `AC-01`):
          - **Daftar Kebutuhan Pembelajaran Kelas Aktif (`activeClassRequirements`):** Menampilkan mata pelajaran, guru default, ruangan default, jumlah sesi/minggu (`tabular-nums`), dan durasi menit (`tabular-nums`) yang difilter khusus untuk `activeClass.id`. Jika kelas aktif belum memiliki kebutuhan pembelajaran, tampilkan *empty state* spesifik untuk kelas tersebut beserta tombol menuju `/master-data`.
          - **Daftar Sesi Terjadwal Kelas Aktif (`activeClassSessions`):** Menampilkan sesi jadwal milik `activeClass.id` (hari, jam mulai-selesai dalam `tabular-nums`, mata pelajaran, guru, ruangan). Jika belum ada sesi yang ditempatkan untuk kelas aktif, tampilkan informasi bahwa belum ada sesi terjadwal untuk kelas ini tanpa menyembunyikan fakta bahwa sesi kelas lain tetap tersimpan aman di ruang kerja.

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-FR03-01 — Pemilihan Kelas Aktif & Isolasi Jadwal Antar-Kelas (FR-03.1 s.d. FR-03.6, AC-01)
- **Given** pengguna telah membuat Kelas `"VII-A"` dan Kelas `"VIII-A"`, masing-masing memiliki Kebutuhan Pembelajaran dan `TimetableSession` yang berbeda di dalam ruang kerja,
- **When** pengguna memilih `"VII-A"` sebagai kelas aktif, kemudian berpindah memilih `"VIII-A"`,
- **Then** saat `"VII-A"` aktif editor hanya menampilkan kebutuhan dan sesi milik `"VII-A"`, saat berpindah ke `"VIII-A"` editor menampilkan kebutuhan dan sesi milik `"VIII-A"`, dan seluruh sesi milik `"VII-A"` maupun `"VIII-A"` di dalam store serta IndexedDB tetap utuh tanpa ada yang terhapus atau berubah (`AC-01`).

### AC-FR03-02 — Perpindahan Kelas Tanpa Mengulang Konfigurasi Ruang Kerja (FR-03.4)
- **Given** ruang kerja telah dikonfigurasi dengan nama sekolah, hari belajar aktif, interval snap grid, dan periode istirahat tertentu,
- **When** pengguna berpindah-pindah kelas aktif dari `"VII-A"` ke `"VIII-A"` lalu ke `"IX-A"`,
- **Then** konfigurasi `workspace` (selain `activeClassId` dan `updatedAt`) serta seluruh `dayConfigs` tetap identik tanpa perlu dikonfigurasi ulang.

### AC-FR03-03 — Persistensi Kelas Aktif di IndexedDB & Sinkronisasi Penghapusan Kelas (FR-10, AC-12)
- **Given** pengguna memilih `"VIII-A"` sebagai kelas aktif melalui `setActiveClass`,
- **When** aplikasi dimuat ulang (`bootWorkspace()` dijalankan pada sesi baru),
- **Then** `workspace.activeClassId` langsung dipulihkan ke ID `"VIII-A"` (`AC-12`).
- **Dan When** kelas `"VIII-A"` yang sedang aktif dihapus melalui Data Master,
- **Then** `workspace.activeClassId` otomatis beralih ke kelas pertama yang tersisa (`"VII-A"`) atau `null` jika tidak ada kelas tersisa.

### AC-FR03-04 — Penanganan Empty State Saat Belum Ada Kelas vs Pemilihan Kelas (R-27)
- **Given** belum ada satu pun `ClassGroup` di ruang kerja (`classes.length === 0`),
- **When** pengguna membuka halaman Editor Jadwal (`/`),
- **Then** halaman menampilkan pesan `"Belum ada kelas di ruang kerja ini. Tambahkan kelas terlebih dahulu di menu Data Master sebelum menyusun jadwal."` beserta tautan/tombol `"Buka Data Master Kelas"`.

### AC-FR03-05 — Penolakan ID Kelas Tidak Valid & Kejujuran Status Penyimpanan (FR-10.4, FR-10.5, NFR-06)
- **Given** pengguna atau pemanggil memanggil `setActiveClass("id-kelas-tidak-ada")`,
- **When** ID tersebut tidak terdaftar di `state.classes`,
- **Then** `setActiveClass` mengembalikan `false` dan tidak mengubah `workspace.activeClassId`.
- **Dan Given** transaksi tulis ke IndexedDB gagal ketika menyimpan pilihan kelas aktif yang valid,
- **Then** `saveStatus` disetel ke `"error"` dan indikator menampilkan `"Gagal menyimpan lokal"`.

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Task QA Engineer (Fase RED)

> **Instruksi untuk QA Engineer:**  
> Ikuti protokol di [`.agents/agents/qa-engineer/agent.md`](../../.agents/agents/qa-engineer/agent.md). Jalankan `graphify query "FR-03 activeClassId"` sebelum memulai. Buat seluruh berkas pengujian di bawah ini hingga eksekusi `bun run test` gagal (**RED**) pada berkas pengujian baru `FR-03` karena fitur belum diimplementasikan, sembari memastikan test `FR-01` dan `FR-02` tetap terjaga. Setelah selesai membuat berkas test, jalankan pembaruan `graphify . --update`.

1. **Task QA-01: Unit Test Selector Konteks Kelas Aktif (`src/__tests__/domain/active-class-context.spec.ts`)**
   - Uji `resolveActiveClass`: mengembalikan objek `ClassGroup` yang tepat saat `activeClassId` valid, dan mengembalikan `null` saat `activeClassId` bernilai `null` atau tidak ditemukan.
   - Uji `getActiveClassRequirements` dan `getActiveClassSessions`:
     - Memfilter hanya item milik `activeClassId`.
     - Memastikan array input asli tidak termutasi (*immutability check*) dan sesi milik kelas lain tidak ikut terbawa (`AC-01`).
   - Uji `getActiveClassSessionStats`:
     - Menghitung `requiredSessionsCount`, `scheduledSessionsCount`, `unscheduledSessionsCount` untuk kelas aktif, serta `workspaceTotalSessionsCount` untuk seluruh kelas di ruang kerja (`FR-03.6`).

2. **Task QA-02: Integration Test Store & Persistensi Pemilihan Kelas Aktif (`src/__tests__/store/use-workspace-store-fr03.spec.ts`)**
   - Uji skenario utama `AC-01`:
     - Buat 2 kelas (`"VII-A"` dan `"VIII-A"`), mata pelajaran, kebutuhan pembelajaran masing-masing kelas, dan simpan beberapa `TimetableSession` untuk `"VII-A"` dan `"VIII-A"` di IndexedDB/store.
     - Panggil `setActiveClass(classVIIA.id)` lalu verifikasi bahwa selector kelas aktif hanya mengembalikan sesi `"VII-A"`.
     - Panggil `setActiveClass(classVIIIA.id)` lalu verifikasi bahwa:
       1. `workspace.activeClassId` berubah menjadi `classVIIIA.id`.
       2. Selector kelas aktif sekarang menampilkan sesi `"VIII-A"`.
       3. Seluruh sesi `"VII-A"` di dalam `useWorkspaceStore.getState().sessions` dan di IndexedDB **tidak berubah dan tidak terhapus** (`FR-03.5`, `FR-03.6`).
       4. Konfigurasi `dayConfigs` ruang kerja tidak berubah (`FR-03.4`).
   - Uji pemulihan `activeClassId` setelah reload (`AC-12`): reset state store di memori lalu panggil `bootWorkspace()`; pastikan `workspace.activeClassId` tetap `"VIII-A"`.
   - Uji panggilan `setActiveClass("non-existent-id")` mengembalikan `false` dan tidak mengubah `activeClassId`.
   - Uji kejujuran `saveStatus` (`FR-10`): simulasikan kegagalan tulis pada `setActiveClassInWorkspace`, pastikan `saveStatus === "error"` dan `saveErrorMessage` terisi.

3. **Task QA-03: Component Test Halaman Editor & Pemilih Kelas Aktif (`src/__tests__/pages/editor-page-fr03.test.tsx`)**
   - Uji *Empty State* ketika belum ada kelas (`classes: []`): menampilkan pesan `"Belum ada kelas di ruang kerja ini. Tambahkan kelas terlebih dahulu di menu Data Master sebelum menyusun jadwal."` dan tautan `"Buka Data Master Kelas"`.
   - Uji tampilan ketika terdapat beberapa kelas (`"VII-A"` dan `"VIII-A"`):
     - `ClassSelectorBar` menampilkan kelas aktif saat ini beserta statistik sesi dalam `tabular-nums`.
     - Halaman menampilkan kebutuhan pembelajaran dan sesi terjadwal milik kelas aktif (`"VII-A"`) dan tidak menampilkan item milik `"VIII-A"` di daftar kelas aktif.
     - Ketika pengguna mengganti kelas aktif ke `"VIII-A"` melalui pemilih kelas, tampilan langsung beralih menampilkan kebutuhan dan sesi `"VIII-A"` tanpa menghilangkan data `"VII-A"`.

---

### 4.2 Task Frontend Engineer (Fase GREEN)

> **Instruksi untuk Frontend Engineer:**  
> Ikuti protokol di [`.agents/agents/frontend-engineer/agent.md`](../../.agents/agents/frontend-engineer/agent.md) dan panduan desain di [`DESIGN.md`](../../DESIGN.md). Jalankan `graphify query "FR-03 activeClassId"` sebelum memulai. Implementasikan seluruh modul di bawah ini hingga seluruh test (`FR-01`, `FR-02`, dan `FR-03`) berstatus **GREEN**, serta lulus `bun run typecheck`, `bun run lint`, dan `bun run build`. Jangan gunakan `any`, jangan gunakan karakter em dash pada salinan teks UI (`R-02`), gunakan `tabular-nums` pada seluruh angka/statistik/waktu, dan pertahankan geometri `rounded-none` (`radix-lyra`). Setelah selesai, jalankan `graphify . --update`.

1. **Task FE-01: Implementasi Selector Domain Konteks Kelas Aktif (`src/domain/timetable/active-class-context.ts`)**
   - Buat `src/domain/timetable/active-class-context.ts` yang mengimplementasikan `resolveActiveClass`, `getActiveClassRequirements`, `getActiveClassSessions`, dan `getActiveClassSessionStats` sesuai kontrak pada Bagian 2.1.

2. **Task FE-02: Perluasan Persistence Layer & Store untuk `setActiveClass` (`src/db/` & `src/store/`)**
   - Perbarui [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts):
     - Tambahkan `setActiveClassInWorkspace(workspace, activeClassId, database)`.
     - Pastikan `loadOrSeedWorkspace` menormalisasi `workspace.activeClassId` apabila merujuk ke ID kelas yang sudah tidak ada di daftar `classes`.
   - Perbarui [`src/store/use-workspace-store.ts`](../../src/store/use-workspace-store.ts):
     - Tambahkan action `setActiveClass(classId)` sesuai kontrak pada Bagian 2.3.

3. **Task FE-03: Implementasi `ClassSelectorBar` & `EditorPage` (`src/components/layout/` & `src/pages/`)**
   - Buat `src/components/layout/class-selector-bar.tsx` sesuai kontrak pada Bagian 2.4.
   - Buat `src/pages/editor-page.tsx` sesuai kontrak pada Bagian 2.4 (menangani *Empty State* ketika belum ada kelas, *Unselected Class State* ketika `activeClassId === null`, dan *Active Class View* ketika kelas aktif terpilih).
   - Perbarui [`src/pages/main-page.tsx`](../../src/pages/main-page.tsx) dan [`src/route/index.tsx`](../../src/route/index.tsx) agar rute `/` merender `EditorPage`.

4. **Task FE-04: Quality Gate & Sinkronisasi Graphify**
   - Jalankan verifikasi lengkap menggunakan Bun:
     ```bash
     bun run typecheck
     bun run lint
     bun run test
     bun run build
     ```
   - Perbarui *knowledge graph* proyek dengan menjalankan alur `graphify . --update`.
