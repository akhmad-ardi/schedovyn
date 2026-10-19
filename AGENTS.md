# Schedovyn - AI Agents Protocol & Engineering Guidelines

Dokumen ini merupakan panduan utama (*Single Source of Truth*) bagi seluruh *AI Agents* yang bekerja di dalam repositori **Schedovyn** (`/home/ardi/projects/schedovyn/frontend`). Seluruh agen wajib mematuhi konteks produk, batas arsitektur, pembagian peran, standar penulisan kode, alur kerja pengembangan, dan protokol Git yang ditetapkan di bawah ini.

---

## 1. Project Overview & Context

### 1.1 Tentang Schedovyn
**Schedovyn** adalah aplikasi web penyusunan jadwal pembelajaran berbasis konsep *Smart Timetable Planner* dengan mekanisme visual *drag-and-drop* serta deteksi konflik lintas kelas secara otomatis (*Smart Conflict Detection*).

- **Target Pengguna:** Admin sekolah, staf kurikulum, atau guru yang bertugas menyusun jadwal pembelajaran mingguan.
- **Platform Utama:** Web Desktop (dengan dukungan tampilan responsif).
- **Bahasa Antarmuka (UI):** Bahasa Indonesia.
- **Dokumen Referensi Utama:**
  - Product Requirements Document: [docs/Schedovyn-PRD.md](docs/Schedovyn-PRD.md)
  - Technical Design Document: [docs/Schedovyn-TDD.md](docs/Schedovyn-TDD.md)

### 1.2 Prinsip Inti Produk
1. **Conflict-First:** Deteksi dan penjelasan konflik lintas kelas (guru, kelas, ruangan, jam operasional, waktu istirahat, dan ketersediaan) adalah nilai utama aplikasi.
2. **Class-Oriented Editing, Workspace-Wide Validation:** Pengguna menyunting jadwal satu kelas aktif pada satu waktu, tetapi *conflict engine* selalu memeriksa bentrokan terhadap seluruh kelas di dalam ruang kerja (*workspace*).
3. **Local-First & Zero-Backend:** Seluruh penyimpanan data (IndexedDB), perhitungan konflik, *undo/redo*, serta pembuatan dokumen PDF dan Excel (`.xlsx`) berjalan 100% di *browser* tanpa autentikasi, tanpa server aplikasi, dan tanpa pengiriman data ke pihak eksternal.
4. **Non-Blocking Placement:** Sesi yang menimbulkan konflik tetap dapat ditempatkan ke grid agar penyuntingan fleksibel, namun wajib ditandai secara visual (warna + ikon + teks) dan dimasukkan ke daftar konflik aktif.
5. **Transparent Validation:** Sistem membedakan dengan tegas antara jadwal yang memiliki **Konflik Waktu** (`CONFLICT_DETECTED`), **Belum Lengkap** (`INCOMPLETE`), **Tidak Ada Konflik pada Data Saat Ini** (`NO_CONFLICT_CURRENT_DATA`), dan **Jadwal Lengkap dan Valid** (`COMPLETE_AND_VALID`).

---

## 2. Tech Stack & Architecture

### 2.1 Spesifikasi Tech Stack
| Layer / Kebutuhan | Teknologi / Pustaka | Catatan |
|---|---|---|
| **Package Manager & Runtime** | Bun (`^1.4.0`) | Wajib gunakan `bun` (`bun add`, `bun run ...`), bukan `npm`/`yarn`/`pnpm` |
| **UI Framework** | React 19 (`^19.3.0`) | Functional components & React hooks |
| **Language** | TypeScript (`~6.0.2`) | Strict mode, zero `any` policy |
| **Build Tool** | Vite (`^8.0.0`) | ESM bundler & dev server |
| **Routing** | React Router (`^8.4.0`) | SPA routing (`src/route/index.tsx`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | CSS-first config di `src/index.css` |
| **UI Components** | shadcn/ui (`radix-lyra`), `radix-ui`, `lucide-react` | Komponen dasar di `src/components/ui/` |
| **Drag-and-Drop** | `@dnd-kit/react` (`^0.5.1`) | Interaksi tarik-lepas kartu sesi & blok jadwal |
| **Data Table** | `@tanstack/react-table` (`^9.3.1`) | Tabel pengelolaan data master & rekapitulasi |
| **State Management** | Zustand | Global store, derived validation state, undo/redo stack |
| **Local Database** | IndexedDB via Dexie.js (`schedovyn_local_db`) | Penyimpanan persisten lokal transaksional |
| **Client Export** | `jspdf` + `jspdf-autotable`, `xlsx` (SheetJS) | Ekspor PDF *landscape* & Excel multi-*worksheet* di *browser* |
| **Testing** | Vitest, `@testing-library/react`, `fake-indexeddb` | Unit test domain, integration test store/DB, & UI test |

### 2.2 Arsitektur Berlapis (Layered Architecture)
Struktur kode di dalam `src/` wajib menjaga pemisahan tanggung jawab (*Separation of Concerns* sesuai NFR-05):

```text
src/
├── domain/          # Pure TypeScript: entities, time/interval math, conflict engine, completeness validator
│                    # DILARANG mengimpor React, DOM API, atau Dexie di dalam folder ini.
├── db/              # Persistence Layer: skema Dexie IndexedDB, repository transaksional, seed data
├── store/           # Application State Layer: Zustand store, undo/redo history manager, auto-save sync
├── services/export/ # Client Export Layer: pemetaan data ekspor, generator PDF, generator Excel (.xlsx)
├── components/      # Presentation Layer:
│   ├── ui/          # Komponen primitif shadcn/ui
│   ├── layout/      # AppShell, header, pemilih kelas aktif, indikator penyimpanan
│   ├── workspace/   # Form konfigurasi ruang kerja & jam belajar
│   ├── master-data/ # Komponen CRUD Kelas, Guru, Mapel, Ruangan, Kebutuhan Pembelajaran
│   ├── timetable/   # Grid jadwal, blok sesi, panel sesi belum terjadwal, panel detail sesi
│   ├── conflicts/   # Panel daftar konflik & ringkasan status validasi
│   └── export/      # Dialog ekspor & peringatan konflik pra-ekspor
├── pages/           # Halaman rute utama (EditorPage, MasterDataPage, SettingsPage)
├── route/           # Definisi rute React Router
└── __tests__/       # Unit test, integration test, dan performance test
```

---

## 3. Agent Roles & Personas

Proyek ini memiliki tiga agen spesialis yang didefinisikan di dalam `.agents/agents/`:

### 3.1 Product Manager / Software Architect
- **Lokasi Definisi:** [.agents/agents/product-architect/agent.md](.agents/agents/product-architect/agent.md)
- **Fokus:** Menjaga keselarasan produk terhadap PRD dan TDD, menyusun spesifikasi fitur baru, merancang kontrak tipe TypeScript (`src/domain/types/`), skema IndexedDB, algoritma *conflict engine*, serta memecah pekerjaan menjadi *task* terukur.
- **Batasan:** Tidak menulis kode implementasi komponen UI maupun mutasi *store* produksi; berfokus pada dokumen desain (`docs/*.md`), kontrak tipe/antarmuka, dan arsitektur.

### 3.2 Frontend Engineer
- **Lokasi Definisi:** [.agents/agents/frontend-engineer/agent.md](.agents/agents/frontend-engineer/agent.md)
- **Fokus:** Mengimplementasikan logika domain (`src/domain/`), penyimpanan lokal IndexedDB (`src/db/`), manajemen *state* & *undo/redo* (`src/store/`), layanan ekspor PDF/Excel (`src/services/export/`), serta komponen antarmuka interaktif (`src/components/`, `src/pages/`) menggunakan React 19, Tailwind CSS v4, shadcn/ui, dan `@dnd-kit/react` hingga seluruh pengujian berstatus **GREEN**.
- **Batasan:** Dilarang mengubah/melemahkan asersi pengujian yang dibuat oleh QA Engineer tanpa persetujuan; dilarang menggunakan `any` atau *inline style* yang melanggar standar desain.

### 3.3 Quality Assurance (QA) Engineer
- **Lokasi Definisi:** [.agents/agents/qa-engineer/agent.md](.agents/agents/qa-engineer/agent.md)
- **Fokus:** Menulis dan memelihara *automated test suite* (Unit, Integration, Component, dan Performance Benchmark) menggunakan Vitest, `@testing-library/react`, dan `fake-indexeddb` yang memverifikasi seluruh *Acceptance Criteria* (AC-01 s.d. AC-13) dan persyaratan non-fungsional (NFR-01 `< 300 ms` untuk 1.000 sesi).
- **Batasan:** Hanya memodifikasi berkas pengujian (`src/__tests__/**` atau `*.spec.ts` / `*.test.tsx`) dan konfigurasi pengujian; dilarang menulis kode produksi di `src/domain/`, `src/db/`, `src/store/`, `src/services/`, atau `src/components/`.

---

## 4. Coding Standards & Rules

### 4.1 TypeScript & Domain Integrity
1. **Strict No-`any` Policy:** Penggunaan tipe `any` dilarang keras. Gunakan tipe eksplisit, *discriminated unions*, atau `unknown` dengan *type narrowing*.
2. **Representasi Waktu Konsisten:**
   - Gunakan tipe `TimeString` (`"HH:mm"`, format 24 jam) untuk penyimpanan dan tampilan.
   - Konversikan ke menit sejak tengah malam (`0..1440`) menggunakan `timeToMinutes()` untuk seluruh operasi perbandingan interval waktu.
   - Rumus baku tumpang tindih interval waktu (FR-05.7): `startA < endB && startB < endA`. Dua sesi yang berbatasan tepat (`08:00-09:00` dan `09:00-10:00`) **tidak boleh** dianggap berkonflik (AC-05).
3. **Pure Domain Functions:** Seluruh fungsi di dalam `src/domain/` wajib berupa *pure function* yang deterministik dan tidak memodifikasi objek argumen (*immutable input*).

### 4.2 React, Tailwind CSS v4, & UI Accessibility
1. **Tailwind CSS v4 Murni:** Gunakan pendekatan *utility-first* bawaan Tailwind CSS v4 dan variabel tema di `src/index.css`. Hindari penggunaan `style={{ ... }}` (*inline styles*), kecuali untuk koordinat dinamis yang dihitung saat runtime pada *grid* waktu (`top` dan `height` blok sesi berdasarkan durasi menit).
2. **Prioritas Komponen shadcn/ui:** Selalu gunakan komponen primitif yang tersedia di `src/components/ui/` (`Button`, `Dialog`, `AlertDialog`, `Select`, `Table`, `Card`, `Popover`, `Switch`, `Checkbox`, `Alert`, dll.).
3. **Indikator Konflik Multi-Isyarat:** Konflik jadwal pada UI maupun hasil cetak PDF tidak boleh hanya ditandai dengan warna; wajib menyertakan ikon peringatan dan label teks yang menjelaskan jenis konflik (PRD Bagian 7.2).
4. **Aksesibilitas Keyboard:** Setiap aksi *drag-and-drop* pada editor jadwal wajib memiliki jalur interaksi alternatif menggunakan keyboard atau kontrol formulir di Panel Detail Sesi (PRD Bagian 7.3).
5. **Bahasa Antarmuka:** Seluruh teks label, tombol, pesan validasi, penjelasan konflik, dan judul kolom ekspor wajib menggunakan **Bahasa Indonesia** yang jelas dan konsisten.

### 4.3 Keamanan Data Lokal & Ekspor
1. **Sanitasi Formula Spreadsheet:** Setiap teks yang diekspor ke Excel (`.xlsx`) wajib disanitasi jika diawali karakter `=`, `+`, `-`, `@`, `\t`, atau `\r` agar tidak dieksekusi sebagai formula spreadsheet secara tidak sengaja (FR-09).
2. **Kejujuran Status Penyimpanan:** Indikator penyimpanan lokal hanya boleh menampilkan status `"Tersimpan"` setelah transaksi IndexedDB benar-benar selesai (*resolved*). Kegagalan penyimpanan (`QuotaExceededError` atau akses penyimpanan ditolak) wajib ditangkap dan ditampilkan kepada pengguna (FR-10).

---

## 5. Development Workflow (TDD & Graphify Protocol)

### 5.1 Protokol Konteks & Knowledge Graph (`graphify`)
Seluruh agen menggunakan **graphify** (bukan `codegraph`) untuk membangun dan menelusuri *knowledge graph* proyek (`graphify-out/graph.json` dan `graphify-out/GRAPH_REPORT.md`):

1. **Sebelum Memulai Tugas (Discovery & Query):**
   - Periksa apakah `graphify-out/graph.json` sudah tersedia di root proyek.
   - Jika belum tersedia, bangun graf terlebih dahulu menggunakan pipeline `graphify .` sesuai panduan skill `graphify`.
   - Jika sudah tersedia, jalankan kueri konteks menggunakan:
     - `graphify query "<pertanyaan atau kata kunci>"` (atau `graphify query "<kata kunci>" --dfs` untuk menelusuri alur ketergantungan)
     - `graphify explain "<nama-modul-atau-node>"` untuk melihat koneksi langsung suatu entitas
     - `graphify path "<NodeA>" "<NodeB>"` untuk mencari jalur keterhubungan antar komponen/domain
   - Baca juga `graphify-out/GRAPH_REPORT.md` (bagian *God Nodes* dan *Communities*) serta `docs/Schedovyn-PRD.md` dan `docs/Schedovyn-TDD.md` agar tidak menduplikasi tipe, komponen, atau utilitas yang sudah ada.
2. **Setelah Menyelesaikan Tugas (Incremental Graph Update):**
   - Setiap kali selesai menambah atau memodifikasi berkas kode maupun dokumentasi, perbarui *knowledge graph* secara inkremental dengan menjalankan alur `graphify . --update` (atau melalui `graphify hook install` pada git post-commit) agar `graphify-out/graph.json` dan `graphify-out/GRAPH_REPORT.md` selalu selaras dengan kondisi kode terbaru.

### 5.2 Siklus Pengembangan Fitur (TDD Lifecycle)
Setiap pengembangan modul atau fitur baru mengikuti tahapan berikut:

1. **Tahap 1 - Spesifikasi & Kontrak (Product Manager / Software Architect):**
   - Memastikan kebutuhan fungsional (FR), kriteria penerimaan (AC), dan kontrak tipe data di `docs/Schedovyn-TDD.md` sudah terdefinisi dengan jelas.
2. **Tahap 2 - Fase RED (QA Engineer):**
   - Menulis *unit test* atau *integration/component test* berdasarkan kontrak TDD dan Acceptance Criteria.
   - Menjalankan test untuk memverifikasi bahwa test gagal (*RED*) karena fitur belum diimplementasikan, bukan karena kesalahan sintaks test.
3. **Tahap 3 - Fase GREEN & Integrasi UI (Frontend Engineer):**
   - Mengimplementasikan logika domain, *store*, repositori IndexedDB, layanan ekspor, dan komponen React hingga seluruh test lulus (*GREEN*).
4. **Tahap 4 - Fase REFACTOR & Quality Gate:**
   - Menjalankan verifikasi menyeluruh menggunakan **Bun** sebelum menyatakan tugas selesai:
     - `bun run typecheck` (wajib 0 error)
     - `bun run lint` (wajib bersih)
     - `bun run test` (seluruh test suite lulus)
     - `bun run build` (build produksi Vite berhasil)

---

## 6. Git Protocol

### 6.1 Konvensi Penamaan Branch
Gunakan penamaan branch yang deskriptif sesuai kategori pekerjaan:
- `feat/<nama-fitur>` : Penambahan fitur baru (contoh: `feat/conflict-engine`, `feat/timetable-grid-dnd`)
- `fix/<nama-bug>` : Perbaikan *bug* atau regresi (contoh: `fix/boundary-interval-overlap`)
- `test/<cakupan-test>` : Penambahan atau pembaruan pengujian otomatis (contoh: `test/conflict-engine-ac03-ac06`)
- `docs/<topik>` : Pembaruan dokumentasi PRD, TDD, atau panduan agen (contoh: `docs/technical-design-v1`)
- `refactor/<area>` : Perbaikan struktur kode tanpa mengubah perilaku eksternal

### 6.2 Format Pesan Commit (Conventional Commits)
Setiap pesan *commit* wajib mengikuti format **Conventional Commits** dan menyertakan referensi ke ID persyaratan (`FR-xx` atau `AC-xx`) bila relevan:

```text
<type>(<scope>): <ringkasan singkat dalam bahasa Inggris atau Indonesia yang konsisten>

[Penjelasan opsional mengenai perubahan dan keputusan teknis]
Refs: FR-05, AC-03, AC-05
```

- **Tipe (`<type>`) yang diizinkan:**
  - `feat`: Fitur baru pada domain, store, db, export, atau UI
  - `fix`: Perbaikan *bug* logika atau tampilan
  - `test`: Penambahan atau perbaikan *unit/integration/component test*
  - `docs`: Perubahan pada `docs/*.md` atau `AGENTS.md`
  - `refactor`: Restrukturisasi kode dengan seluruh test tetap hijau
  - `chore`: Pembaruan dependensi atau konfigurasi *build/tooling*
- **Cakupan (`<scope>`) standar:** `domain`, `conflict-engine`, `db`, `store`, `editor`, `master-data`, `settings`, `export-pdf`, `export-excel`, `ui`, `docs`.

### 6.3 Aturan Commit & Integritas Repositori
1. **Atomic Commits:** Satu *commit* harus mewakili satu kesatuan perubahan logis yang utuh. Jangan mencampur perubahan konfigurasi, *refactoring* besar, dan fitur baru yang tidak berkaitan dalam satu *commit*.
2. **Pre-Commit Verification:** Dilarang melakukan *commit* kode yang menyebabkan `bun run typecheck` atau `bun run build` gagal.
3. **Zero Artifacts Pollution:** Jangan pernah memasukkan berkas hasil ekspor sementara (`*.pdf`, `*.xlsx`), direktori *coverage*, atau berkas *scratch* ke dalam *git staging area*.
