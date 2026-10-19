# Schedovyn - Smart Timetable Planner

**Schedovyn** adalah aplikasi web penyusunan jadwal pembelajaran (*Smart Timetable Planner*) berbasis *client-side* dengan editor visual *drag-and-drop* serta deteksi konflik lintas kelas secara otomatis (*Smart Conflict Detection*).

Seluruh data ruang kerja, pemeriksaan konflik, *undo/redo*, penyimpanan otomatis (*auto-save* melalui IndexedDB), hingga pembuatan berkas cetak **PDF** dan **Excel (`.xlsx`)** dijalankan 100% di dalam *browser* tanpa memerlukan registrasi akun, *backend server*, maupun *database server*.

---

## Fitur Utama

1. **Pengaturan Ruang Kerja & Jam Belajar (FR-01):** Konfigurasi nama sekolah/ruang kerja, periode akademik, hari pembelajaran aktif (termasuk opsi hari Sabtu), jam operasional harian, interval *snap grid* (default 15 menit), dan rentang waktu istirahat.
2. **Pengelolaan Data Master (FR-02):** CRUD untuk **Kelas**, **Guru** (beserta waktu tidak tersedia), **Mata Pelajaran**, **Ruangan** (beserta waktu tidak tersedia), dan **Kebutuhan Pembelajaran** (*Teaching Requirements* per minggu).
3. **Pemilihan Kelas Aktif & Editor Visual Drag-and-Drop (FR-03, FR-04, FR-06):**
   - Menyunting jadwal berfokus pada satu kelas aktif pada satu waktu.
   - Menarik kartu sesi dari panel **Sesi Belum Terjadwal** ke **Grid Jadwal** proporsional terhadap durasi aktual sesi.
   - Mendukung alternatif navigasi dan penempatan menggunakan *keyboard* serta formulir pada **Panel Detail Sesi**.
4. **Smart Conflict Detection Lintas Kelas (FR-05):**
   - Memeriksa bentrokan terhadap seluruh sesi di dalam ruang kerja (*workspace-wide*) secara otomatis menggunakan aturan irisan interval `startA < endB && startB < endA`.
   - Mendeteksi **Konflik Kelas**, **Konflik Guru Lintas Kelas**, **Konflik Ruangan**, **Konflik Ketersediaan Guru/Ruangan**, serta **Konflik Jam Operasional & Waktu Istirahat**.
   - Membedakan bentrokan waktu dari **Peringatan Kelengkapan Jadwal** (kebutuhan sesi mingguan yang belum terpenuhi, guru/ruangan wajib yang belum ditentukan).
5. **Ringkasan Validasi Transparan (FR-11):** Membedakan secara eksplisit empat status jadwal:
   - `Konflik ditemukan` (`CONFLICT_DETECTED`)
   - `Belum lengkap` (`INCOMPLETE`)
   - `Tidak ada konflik terdeteksi pada data saat ini` (`NO_CONFLICT_CURRENT_DATA`)
   - `Jadwal lengkap dan valid` (`COMPLETE_AND_VALID`)
6. **Undo/Redo & Penyimpanan Otomatis Lokal (FR-07, FR-10):** Riwayat pembatalan/pengulangan perubahan jadwal disertai sinkronisasi otomatis ke IndexedDB (`schedovyn_local_db`) dan indikator status penyimpanan yang akurat.
7. **Ekspor PDF & Excel Client-Side (FR-08, FR-09):**
   - **PDF:** Orientasi *landscape* siap cetak untuk kelas aktif atau seluruh ruang kerja beserta lampiran peringatan konflik.
   - **Excel (`.xlsx`):** Multi-*worksheet* (`Jadwal`, `Rekap Guru`, `Rekap Ruangan`, `Konflik`) dengan sanitasi anti-*formula injection*.

---

## Tech Stack

| Kategori | Teknologi |
|---|---|
| **Package Manager & Runtime** | [Bun](https://bun.sh/) (`^1.4.0`) |
| **UI Framework** | React 19 + TypeScript (`~6.0.2`) |
| **Build Tool** | Vite 8 |
| **Routing** | React Router v8 |
| **Styling & UI Components** | Tailwind CSS v4 + shadcn/ui (`radix-lyra`) + Lucide Icons |
| **Drag-and-Drop** | `@dnd-kit/react` |
| **Data Table** | `@tanstack/react-table` |
| **State Management** | Zustand (dengan *Undo/Redo History Stack*) |
| **Local Persistence** | IndexedDB via Dexie.js |
| **Client-Side Export** | `jspdf` + `jspdf-autotable` (PDF), `xlsx` / SheetJS (Excel) |
| **Testing** | Vitest + React Testing Library + `fake-indexeddb` |

---

## Arsitektur Direktori

Struktur proyek memisahkan logika bisnis murni (*domain*) dari lapisan penyimpanan dan antarmuka pengguna:

```text
src/
├── domain/          # Pure TypeScript: tipe entitas, kalkulasi interval waktu, conflict engine, validator kelengkapan
├── db/              # Persistence Layer: skema Dexie IndexedDB, repository transaksional, seed data
├── store/           # Application State Layer: Zustand store, undo/redo history manager, auto-save sync
├── services/export/ # Client Export Layer: generator PDF & Excel (.xlsx) beserta sanitasi sel
├── components/      # Presentation Layer:
│   ├── ui/          # Komponen dasar shadcn/ui
│   ├── layout/      # AppShell, navigasi, pemilih kelas aktif, indikator penyimpanan
│   ├── workspace/   # Konfigurasi ruang kerja & jam belajar
│   ├── master-data/ # Pengelolaan Kelas, Guru, Mata Pelajaran, Ruangan, Kebutuhan Pembelajaran
│   ├── timetable/   # Grid jadwal, blok sesi, panel sesi belum terjadwal, panel detail sesi
│   ├── conflicts/   # Panel daftar konflik & ringkasan status validasi
│   └── export/      # Dialog ekspor & peringatan konflik
├── pages/           # Halaman rute utama (EditorPage, MasterDataPage, SettingsPage)
├── route/           # Konfigurasi rute React Router
└── __tests__/       # Unit test, integration test, dan performance test
```

---

## Memulai Pengembangan (menggunakan Bun)

Pastikan **Bun** (`>= 1.4.0`) sudah terpasang di sistem Anda.

### 1. Instalasi Dependensi

```bash
bun install
```

### 2. Menjalankan Server Pengembangan

```bash
bun run dev
```

### 3. Perintah Kualitas Kode & Build

```bash
# Pemeriksaan tipe TypeScript
bun run typecheck

# Linting dengan ESLint
bun run lint

# Pemformatan kode dengan Prettier
bun run format

# Menjalankan automated test suite
bun run test

# Build produksi
bun run build
```

### 4. Menambahkan Komponen shadcn/ui

```bash
bunx --bun shadcn@latest add <nama-komponen>
```

Komponen baru akan ditempatkan di dalam direktori `src/components/ui/`.

---

## Dokumentasi & Referensi Proyek

- **Product Requirements Document (PRD):** [docs/Schedovyn-PRD.md](docs/Schedovyn-PRD.md)
- **Technical Design Document (TDD):** [docs/Schedovyn-TDD.md](docs/Schedovyn-TDD.md)
- **AI Agents Protocol & Engineering Guidelines:** [AGENTS.md](AGENTS.md)
- **Knowledge Graph Report (`graphify`):** [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md)
