# Spesifikasi Task & Kontrak Teknis: FR-12 — Penyalinan Jadwal (Schedule Copy & Propagation)

**Kode Fitur:** `FR-12` (Didukung oleh `FR-04`, `FR-05`, `FR-06`, `FR-07`, `FR-10`, `FR-11`, `NFR-01`, `NFR-02`, `NFR-05`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md) (Bagian 5, 6, 7, 11, 13)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md) (Bagian 7.1 `COPY_CLASS_SCHEDULE`)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md) (Bagian 4, 5.2)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)
- Task Terkait:
  - [`docs/tasks/FR-03-active-class-selection.md`](./FR-03-active-class-selection.md)
  - [`docs/tasks/FR-04-timetable-drag-and-drop-editor.md`](./FR-04-timetable-drag-and-drop-editor.md)
  - [`docs/tasks/FR-05-smart-conflict-detection.md`](./FR-05-smart-conflict-detection.md)
  - [`docs/tasks/FR-06-unscheduled-sessions-management.md`](./FR-06-unscheduled-sessions-management.md)
  - [`docs/tasks/FR-07-undo-and-redo.md`](./FR-07-undo-and-redo.md)
  - [`docs/tasks/FR-10-local-auto-save.md`](./FR-10-local-auto-save.md)
  - [`docs/tasks/FR-11-validation-summary.md`](./FR-11-validation-summary.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur `graphify`
Berdasarkan penelusuran arsitektur dan keterhubungan modul:
- **Kebutuhan Duplikasi Jadwal Paralel:**
  Pada penyusunan jadwal sekolah menengah (SMP/SMA/SMK), kelas-kelas paralel dalam satu jenjang (contoh: VII-A dan VII-B, atau VIII-A, VIII-B, dan VIII-C) memiliki struktur mata pelajaran dan alokasi durasi yang identik. Tanpa fitur penyalinan jadwal, staf kurikulum terpaksa mengulangi proses penempatan puluhan kartu sesi dari awal untuk setiap kelas paralel ([`docs/Schedovyn-PRD.md#L455-L467`](file:///home/ardi/projects/schedovyn/frontend/docs/Schedovyn-PRD.md#L455-L467)).
- **Fondasi yang Sudah Tersedia:**
  - Sesi jadwal tersimpan secara flat di Zustand Store dan IndexedDB (`TimetableSession[]`).
  - Arsitektur riwayat undo/redo di [`src/domain/history/schedule-history.ts`](../../src/domain/history/schedule-history.ts) telah dirancang untuk mencatat snapshot mutasi berskala kelas (`COPY_CLASS_SCHEDULE` sesuai TDD Bagian 7.1).
  - Evaluasi konflik real-time (`evaluateWorkspaceValidation`) dapat dijalankan seketika setelah mutasi sesi massal.
  - Penyimpanan atomik massal (`batchSaveTimetableSessions`) telah tersedia di [`src/db/workspace-repository.ts`](../../src/db/workspace-repository.ts).
- **Kesenjangan (Gaps) yang Wajib Diimplementasikan pada FR-12:**
  1. *Pure Domain Schedule Copier:* Belum ada fungsi murni domain (`src/domain/timetable/schedule-copier.ts`) yang bertanggung jawab menduplikasi sesi ke kelas target, membuat ID sesi baru, mencocokkan `requirementId` kelas target, dan menerapkan strategi guru/ruangan.
  2. *Label Riwayat Khusus:* Belum ada pemformatan label riwayat `"copy_class"` pada fungsi `formatScheduleActionLabel` di [`src/domain/history/schedule-history.ts`](../../src/domain/history/schedule-history.ts).
  3. *Action Store:* Store belum memiliki action `copyClassSchedule()` yang membungkus riwayat undo, mutasi state, evaluasi ulang konflik, dan persistensi atomik ke IndexedDB.
  4. *Dialog Interaktif UI:* Belum ada komponen dialog penyalinan jadwal (`src/components/timetable/copy-schedule-dialog.tsx`) yang meminta pengguna memeriksa penugasan guru/ruangan, memilih mode penanganan (timpa vs gabung), dan memperlihatkan konflik baru yang dihasilkan sesuai amanat PRD FR-12.
  5. *Tombol Akses Toolbar:* Belum ada tombol pemicu "Salin Jadwal" pada [`editor-toolbar.tsx`](../../src/components/timetable/editor-toolbar.tsx).

### 1.2 Referensi Persyaratan
- **FR-12 (Penyalinan Jadwal — PRD Bagian 5):**
  - Pengguna dapat menyalin sesi atau susunan jadwal ke kelas lain.
  - **Ketentuan Wajib Sistem:**
    1. **Identitas Sesi Baru:** Menyalin data sebagai sesi baru, bukan menggunakan identitas sesi yang sama (`id` baru unik).
    2. **Pemeriksaan Guru dan Ruangan:** Meminta pengguna memeriksa guru dan ruangan untuk kelas tujuan.
    3. **Evaluasi Ulang Konflik:** Menjalankan ulang *conflict detection* secara otomatis setelah penyalinan.
    4. **Transparansi Hasil:** Memperlihatkan konflik baru yang dihasilkan (misalnya bentrokan guru atau ruangan).
- **TDD Bagian 7.1 (Undo dan Redo):**
  - Penyalinan susunan jadwal kelas (`COPY_CLASS_SCHEDULE`) wajib dapat dibatalkan secara utuh dengan sekali tekan *Undo* (`Ctrl+Z`).
- **NFR-01 (Kinerja):**
  - Proses kloning 20–40 sesi kelas dan evaluasi ulang konflik harus diselesaikan dalam waktu kurang dari 50 ms pada peramban desktop.
- **NFR-02 (Keandalan Data):**
  - Sesi di kelas sumber tidak boleh termodifikasi atau terhapus saat disalin ke kelas tujuan.
  - Transaksi penyimpanan ke IndexedDB harus bersifat atomik.

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Menyusun jadwal 10 kelas paralel memakan waktu berjam-jam bila dilakukan manual kartu per kartu. Namun, jika jadwal diduplikasi begitu saja tanpa verifikasi, guru yang sama akan terjadwal di dua kelas berbeda pada jam yang sama (`TEACHER_OVERLAP`).
- **Cakupan Fitur (In-Scope):**
  1. Fungsi murni domain `cloneClassSchedule()` di `src/domain/timetable/schedule-copier.ts`.
  2. Format label riwayat Bahasa Indonesia di `src/domain/history/schedule-history.ts`.
  3. Action `copyClassSchedule()` di `src/store/use-workspace-store.ts`.
  4. Komponen `CopyScheduleDialog` (`src/components/timetable/copy-schedule-dialog.tsx`) dengan opsi strategi guru/ruangan, mode replace vs merge, konfirmasi peringatan, dan tampilan hasil konflik baru.
  5. Tombol pemicu "Salin Jadwal" di `EditorToolbar`.
  6. Pengujian komprehensif: unit test kloning sesi, integration test store & undo/redo, serta component test dialog UI.
- **Di Luar Cakupan Fitur (Out-of-Scope):**
  - Penyalinan parsial per hari (saat ini cakupan menyalin seluruh susunan sesi kelas sumber).
  - Algoritma otomatis penukaran guru alternatif (*AI teacher auto-reassignment*).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Modul Domain Kloning Jadwal (`src/domain/timetable/schedule-copier.ts`)

Modul pure TypeScript tanpa dependensi React/DOM untuk melakukan kloning sesi secara deterministik dan imutabel:

```typescript
import type { TeachingRequirement, TimetableSession } from "@/domain/types/entities"

export type TeacherCopyStrategy =
  | "keep-source"        // Salin guru apa adanya (berpotensi memicu TEACHER_OVERLAP)
  | "use-target-default" // Gunakan defaultTeacherId dari requirement kelas target (jika ada)
  | "clear"              // Kosongkan guru (null) agar diatur kemudian

export type RoomCopyStrategy =
  | "keep-source"        // Salin ruangan apa adanya (berpotensi memicu ROOM_OVERLAP)
  | "use-target-default" // Gunakan defaultRoomId dari requirement kelas target (jika ada)
  | "clear"              // Kosongkan ruangan (null)

export type CopyConflictResolution =
  | "replace"            // Hapus seluruh sesi lama di kelas tujuan sebelum menyalin
  | "merge"              // Tambahkan sesi baru ke jadwal kelas tujuan yang sudah ada

export interface CopyScheduleOptions {
  sourceClassId: string
  targetClassId: string
  conflictResolution: CopyConflictResolution
  teacherStrategy: TeacherCopyStrategy
  roomStrategy: RoomCopyStrategy
}

export interface CloneClassScheduleParams {
  sourceSessions: readonly TimetableSession[]
  targetRequirements: readonly TeachingRequirement[]
  options: CopyScheduleOptions
  generateId?: () => string // Dependency injection untuk UUID deterministik pada pengujian
}

export interface CloneClassScheduleResult {
  ok: boolean
  copiedSessions: TimetableSession[]
  unmatchedSubjectIds: string[]
  error?: string
}

/**
 * Menduplikasi sesi dari kelas sumber ke kelas tujuan secara murni (pure function).
 * Setiap sesi hasil kloning memperoleh ID unik baru.
 */
export function cloneClassSchedule(
  params: CloneClassScheduleParams
): CloneClassScheduleResult {
  const {
    sourceSessions,
    targetRequirements,
    options,
    generateId = () => crypto.randomUUID(),
  } = params

  if (options.sourceClassId === options.targetClassId) {
    return {
      ok: false,
      copiedSessions: [],
      unmatchedSubjectIds: [],
      error: "Kelas sumber dan kelas tujuan tidak boleh sama.",
    }
  }

  const sourceClassSessions = sourceSessions.filter(
    (s) => s.classId === options.sourceClassId
  )

  if (sourceClassSessions.length === 0) {
    return {
      ok: false,
      copiedSessions: [],
      unmatchedSubjectIds: [],
      error: "Kelas sumber belum memiliki sesi yang dijadwalkan.",
    }
  }

  // Bangun peta requirement kelas target berdasarkan subjectId
  const targetReqBySubject = new Map<string, TeachingRequirement>()
  for (const req of targetRequirements) {
    if (req.classId === options.targetClassId) {
      targetReqBySubject.set(req.subjectId, req)
    }
  }

  const unmatchedSubjectIds = new Set<string>()
  const copiedSessions: TimetableSession[] = []

  for (const session of sourceClassSessions) {
    const matchingReq = targetReqBySubject.get(session.subjectId)
    if (!matchingReq) {
      unmatchedSubjectIds.add(session.subjectId)
    }

    // Tentukan penugasan guru
    let resolvedTeacherId: string | null = null
    switch (options.teacherStrategy) {
      case "keep-source":
        resolvedTeacherId = session.teacherId
        break
      case "use-target-default":
        resolvedTeacherId = matchingReq?.defaultTeacherId ?? null
        break
      case "clear":
        resolvedTeacherId = null
        break
    }

    // Tentukan penugasan ruangan
    let resolvedRoomId: string | null = null
    switch (options.roomStrategy) {
      case "keep-source":
        resolvedRoomId = session.roomId
        break
      case "use-target-default":
        resolvedRoomId = matchingReq?.defaultRoomId ?? null
        break
      case "clear":
        resolvedRoomId = null
        break
    }

    const clonedSession: TimetableSession = {
      id: generateId(),
      workspaceId: session.workspaceId,
      requirementId: matchingReq ? matchingReq.id : null,
      classId: options.targetClassId,
      subjectId: session.subjectId,
      teacherId: resolvedTeacherId,
      roomId: resolvedRoomId,
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.durationMinutes,
      notes: session.notes,
    }

    copiedSessions.push(clonedSession)
  }

  return {
    ok: true,
    copiedSessions,
    unmatchedSubjectIds: Array.from(unmatchedSubjectIds),
  }
}
```

### 2.2 Pembaruan Label Riwayat (`src/domain/history/schedule-history.ts`)

Memperluas parameter tindakan riwayat untuk menyertakan operasi salin kelas:

```typescript
export interface ActionLabelParams {
  type:
    | "place"
    | "move"
    | "update_details"
    | "update_time"
    | "remove"
    | "copy_class" // Penambahan FR-12
  subjectName?: string
  dayLabel?: string
  timeRange?: string
  extraDetail?: string
  sourceClassName?: string // Penambahan FR-12
  targetClassName?: string // Penambahan FR-12
}
```

Penanganan di dalam `formatScheduleActionLabel`:
```typescript
case "copy_class":
  if (sourceClassName && targetClassName) {
    return `Salin jadwal dari ${sourceClassName} ke ${targetClassName}`
  }
  return "Salin jadwal kelas"
```

### 2.3 Kontrak Action di Zustand Store (`src/store/use-workspace-store.ts`)

Menambahkan kontrak action dan antarmuka hasil operasi penyalinan:

```typescript
export interface CopyScheduleOutcome {
  ok: boolean
  copiedCount: number
  replacedCount: number
  newConflictsCount: number
  targetClassId: string
  unmatchedSubjectIds: string[]
  error?: string
}

export interface WorkspaceStoreState {
  // Properti eksisting...
  copyClassSchedule: (
    options: CopyScheduleOptions
  ) => Promise<CopyScheduleOutcome>
}
```

#### Alur Eksekusi `copyClassSchedule`:
1. Ambil data `classes`, `sessions`, `requirements`, `workspace`, dan `history` dari state store.
2. Validasi input: kelas sumber dan target wajib ada dan tidak sama.
3. Jalankan `cloneClassSchedule(...)`. Jika `!result.ok`, kembalikan `{ ok: false, error: result.error }`.
4. Hitung susunan sesi baru:
   - Jika `conflictResolution === "replace"`:
     `nextSessions = [...sessions.filter(s => s.classId !== options.targetClassId), ...result.copiedSessions]`.
     Hitung `replacedCount = sessions.filter(s => s.classId === options.targetClassId).length`.
   - Jika `conflictResolution === "merge"`:
     `nextSessions = [...sessions, ...result.copiedSessions]`.
     `replacedCount = 0`.
5. Catat ke riwayat undo:
   ```typescript
   const actionLabel = formatScheduleActionLabel({
     type: "copy_class",
     sourceClassName: sourceClass.name,
     targetClassName: targetClass.name,
   })
   const nextHistory = recordHistoryStep(history, sessions, actionLabel)
   ```
6. Jalankan `runValidation({ sessions: nextSessions })`.
7. Hitung jumlah konflik pada kelas target dari laporan validasi baru.
8. Simpan ke IndexedDB via `workspaceRepo.batchSaveTimetableSessions(workspace, nextSessions)`.
9. Kembalikan `CopyScheduleOutcome` yang memuat jumlah sesi tersalin dan jumlah bentrokan baru yang dihasilkan.

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-FR12-01 — Identitas Sesi Baru & Independensi (PRD FR-12.1)
- **Given** kelas VII-A memiliki 10 sesi jadwal,
- **When** pengguna menyalin jadwal kelas VII-A ke kelas VII-B,
- **Then** seluruh 10 sesi yang tercipta pada kelas VII-B memiliki `id` unik baru yang berbeda dari sesi di kelas VII-A,
- **And** memindahkan, mengubah, atau menghapus sesi di kelas VII-B tidak mempengaruhi sesi di kelas VII-A.

### AC-FR12-02 — Pemetaan Kebutuhan Pembelajaran & Opsi Guru/Ruangan (PRD FR-12.2)
- **Given** kelas VII-B memiliki kebutuhan mata pelajaran Matematika dengan guru default "Bu Siti",
- **When** pengguna menyalin jadwal dari kelas VII-A dengan memilih strategi guru `"use-target-default"`,
- **Then** sesi Matematika yang disalin ke kelas VII-B otomatis mengaitkan `requirementId` kelas VII-B dan menetapkan `teacherId` ke "Bu Siti".
- **And** jika pengguna memilih strategi guru `"clear"`, `teacherId` sesi hasil salinan disetel ke `null`.

### AC-FR12-03 — Peringatan & Evaluasi Ulang Konflik Baru (PRD FR-12.3 & FR-12.4)
- **Given** guru "Pak Budi" mengajar kelas VII-A pada hari Senin pukul 08:00–09:00,
- **When** pengguna menyalin jadwal kelas VII-A ke kelas VII-B dengan strategi guru `"keep-source"`,
- **Then** sistem menjalankan ulang *conflict detection* secara otomatis,
- **And** sistem mendeteksi konflik guru (`TEACHER_OVERLAP`) pada Senin pukul 08:00–09:00 antara kelas VII-A dan VII-B,
- **And** dialog ringkasan hasil penyalinan memperlihatkan jumlah konflik baru tersebut dengan peringatan yang jelas.

### AC-FR12-04 — Mode Timpa (*Replace*) vs Gabung (*Merge*)
- **Given** kelas tujuan VII-B sudah memiliki 4 sesi jadwal lama,
- **When** pengguna menyalin jadwal dengan mode `"replace"`,
- **Then** ke-4 sesi lama kelas VII-B dihapus dan digantikan seluruhnya oleh sesi hasil salinan dari kelas sumber.
- **When** pengguna menyalin jadwal dengan mode `"merge"`,
- **Then** sesi hasil salinan ditambahkan tanpa menghapus ke-4 sesi lama kelas VII-B.

### AC-FR12-05 — Dukungan Penuh Undo & Redo (TDD Bagian 7.1)
- **Given** pengguna baru saja menyalin seluruh jadwal kelas VII-A ke VII-B,
- **When** pengguna menekan tombol *Batal Perubahan* (`Undo` / `Ctrl+Z`),
- **Then** seluruh perubahan penyalinan pada kelas VII-B dibatalkan secara atomik dalam satu langkah,
- **And** jadwal kelas VII-B kembali ke kondisi semula sebelum penyalinan,
- **And** sistem mengevaluasi ulang *conflict engine* ke kondisi sebelum penyalinan.

### AC-FR12-06 — Penyimpanan Otomatis Persisten (FR-10)
- **Given** operasi penyalinan jadwal berhasil dieksekusi,
- **When** transaksi penulisan ke basis data lokal selesai,
- **Then** seluruh sesi baru di kelas tujuan tersimpan ke IndexedDB,
- **And** lencana status penyimpanan beralih ke `"Tersimpan di browser"`.

### AC-FR12-07 — Validasi Input & Larangan Salin ke Kelas yang Sama
- **Given** pengguna membuka dialog penyalinan jadwal,
- **When** pengguna memilih kelas tujuan yang sama dengan kelas sumber,
- **Then** tombol "Salin Jadwal Sekarang" dinonaktifkan atau sistem menampilkan pesan galat validasi berbahasa Indonesia yang jelas.

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Fase RED — QA Engineer (Automated Test Suite)

1. **Task QA-12.1: Unit Test Pure Domain Schedule Copier**
   - **File:** `src/__tests__/unit/domain/schedule-copier.spec.ts`
   - **Skenario Pengujian:**
     - Menguji kloning sesi menghasilkan ID baru unik untuk setiap sesi (**AC-FR12-01**).
     - Menguji pemetaan `requirementId` ke kebutuhan mata pelajaran yang sama pada kelas target.
     - Menguji ketiga variasi strategi guru: `keep-source`, `use-target-default`, dan `clear` (**AC-FR12-02**).
     - Menguji ketiga variasi strategi ruangan: `keep-source`, `use-target-default`, dan `clear`.
     - Menguji penanganan kelas sumber tanpa sesi terjadwal menghasilkan pesan kesalahan.
     - Menguji penolakan jika kelas sumber dan target identik (**AC-FR12-07**).

2. **Task QA-12.2: Integration Test Store Copy Schedule with Undo/Redo & Conflict Detection**
   - **File:** `src/__tests__/integration/copy-schedule-store.spec.ts`
   - **Skenario Pengujian:**
     - Menguji eksekusi `copyClassSchedule` pada mode `replace` dan `merge` (**AC-FR12-04**).
     - Menguji deteksi otomatis konflik guru lintas kelas setelah penyalinan (**AC-FR12-03**).
     - Menguji pembatalan penyalinan via `undo()` mengembalikan kondisi sesi dan menghapus konflik baru (**AC-FR12-05**).
     - Menguji pemulihan kembali via `redo()`.
     - Menguji persistensi otomatis ke IndexedDB dan pembaruan `saveStatus` (**AC-FR12-06**).

3. **Task QA-12.3: Component Test Copy Schedule Dialog UI**
   - **File:** `src/__tests__/components/copy-schedule-dialog.spec.tsx`
   - **Skenario Pengujian:**
     - Menguji render dialog memuat pemilih kelas sumber, kelas target, mode replace/merge, dan pilihan guru/ruangan.
     - Menguji keberadaan kotak peringatan resmi FR-12 mengenai potensi bentrokan guru/ruangan.
     - Menguji penonaktifan tombol konfirmasi jika kelas tujuan belum dipilih atau sama dengan kelas sumber.
     - Menguji alur sukses: dialog menampilkan jumlah sesi yang tersalin, jumlah konflik baru, dan tombol pintas "Buka Jadwal Kelas Tujuan".

---

### 4.2 Fase GREEN — Frontend Engineer (Implementasi Produksi)

1. **Task FE-12.1: Implementasi Pure Domain Copier & Label Riwayat**
   - **File:** `src/domain/timetable/schedule-copier.ts` dan `src/domain/history/schedule-history.ts`
   - **Pekerjaan:** Tulis fungsi murni `cloneClassSchedule` dan tambahkan kasus `"copy_class"` pada `formatScheduleActionLabel`.

2. **Task FE-12.2: Implementasi Action `copyClassSchedule` di Zustand Store**
   - **File:** `src/store/use-workspace-store.ts`
   - **Pekerjaan:**
     - Tambahkan action `copyClassSchedule` pada store.
     - Sambungkan pencatatan riwayat undo (`recordHistoryStep`), pembaruan sesi, evaluasi validasi sinkron, dan persistensi atomik via `batchSaveTimetableSessions`.

3. **Task FE-12.3: Pembangunan Komponen Dialog `CopyScheduleDialog`**
   - **File:** `src/components/timetable/copy-schedule-dialog.tsx`
   - **Pekerjaan:**
     - Bangun dialog interaktif menggunakan komponen shadcn/ui (`Dialog`, `Select`, `Button`, `Alert`, `Label`).
     - Terapkan gaya visual clean `radix-lyra` (`rounded-none`, `tabular-nums` untuk angka sesi).
     - Tampilkan kartu peringatan resmi PRD FR-12 mengenai pemeriksaan guru dan ruangan.
     - Sediakan tampilan pratinjau hasil pasca-penyalinan beserta tombol untuk beralih kelas aktif.

4. **Task FE-12.4: Integrasi Tombol Pemicu di `EditorToolbar`**
   - **File:** `src/components/timetable/editor-toolbar.tsx`
   - **Pekerjaan:**
     - Tambahkan tombol aksi "Salin Jadwal" dengan ikon `CopyIcon` di sebelah tombol ekspor.
     - Hubungkan klik tombol untuk membuka `CopyScheduleDialog`.

---

### 4.3 Fase REFACTOR & Quality Gate

1. **Pemeriksaan Tipe Data & Linting:**
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
