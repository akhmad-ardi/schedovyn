# Panduan Skenario Pengujian Browser & E2E Schedovyn

Dokumen ini merupakan panduan utama (*Single Source of Truth*) bagi pengujian antarmuka berbasis peramban (Manual & E2E Browser Testing) menggunakan **Chrome DevTools Protocol / Puppeteer-Core** untuk aplikasi **Schedovyn** (*Smart Timetable Planner*).

---

## 1. Matriks Ketertelusuran & Status Eksekusi

| ID Uji | Modul / Dokumen Skenario | Fitur PRD | Kriteria Penerimaan (AC) | Persyaratan Non-Fungsional (NFR) | Status Terkini |
|---|---|---|---|---|---|
| **TC-01** | [`TC-01-workspace-and-settings.md`](./TC-01-workspace-and-settings.md) | `FR-01` (Konfigurasi Ruang Kerja) | `AC-12` | `NFR-02`, `NFR-03` | ✅ **PASS** (100%) |
| **TC-02** | [`TC-02-master-data-management.md`](./TC-02-master-data-management.md) | `FR-02` (Manajemen Data Master) | `AC-08` | `NFR-02`, `NFR-04` | ✅ **PASS** (100%) |
| **TC-03** | [`TC-03-active-class-and-timetable-editor.md`](./TC-03-active-class-and-timetable-editor.md) | `FR-03`, `FR-04`, `FR-06` (Editor Drag-and-Drop) | `AC-01`, `AC-02`, `AC-08` | `NFR-01`, `NFR-04` | ✅ **PASS** (100%) |
| **TC-04** | [`TC-04-smart-conflict-detection-and-validation.md`](./TC-04-smart-conflict-detection-and-validation.md) | `FR-05`, `FR-11` (Conflict Engine & Summary) | `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-07`, `AC-13` | `NFR-01`, `NFR-04` | ✅ **PASS** (100%) |
| **TC-05** | [`TC-05-undo-redo-and-schedule-history.md`](./TC-05-undo-redo-and-schedule-history.md) | `FR-07` (Undo dan Redo Jadwal) | `AC-07` | `NFR-02`, `NFR-04` | ✅ **PASS** (100%) |
| **TC-06** | [`TC-06-schedule-copy-and-propagation.md`](./TC-06-schedule-copy-and-propagation.md) | `FR-12` (Penyalinan Jadwal Antar Kelas) | `AC-03`, `AC-07` | `NFR-01`, `NFR-02` | ✅ **PASS** (100%) |
| **TC-07** | [`TC-07-client-export-pdf-excel.md`](./TC-07-client-export-pdf-excel.md) | `FR-08`, `FR-09` (Ekspor PDF & Excel) | `AC-09`, `AC-10`, `AC-11` | `NFR-03` | ✅ **PASS** (100%) |
| **TC-08** | [`TC-08-local-persistence-and-resilience.md`](./TC-08-local-persistence-and-resilience.md) | `FR-10` (Auto-Save & Ketahanan IndexedDB) | `AC-12` | `NFR-02`, `NFR-03`, `NFR-06` | ✅ **PASS** (100%) |
| **TC-09** | [`TC-09-performance-and-a11y-audit.md`](./TC-09-performance-and-a11y-audit.md) | Aksesibilitas, Tema & Skalabilitas 1.000 Sesi | `AC-01` s.d. `AC-13` | `NFR-01`, `NFR-04` | ✅ **PASS** (100%) |

---

## 2. Prasyarat Lingkungan Pengujian (Test Environment)

Sebelum menjalankan pengujian melalui browser automation:
1. **Peramban:** Google Chrome Desktop (versi modern dengan dukungan IndexedDB & Chrome DevTools Protocol).
2. **Local Dev Server:** Server frontend Vite berjalan di latar belakang:
   ```bash
   bun run dev
   ```
   Aplikasi dapat diakses pada URL lokal (`http://localhost:5173`).
3. **Pembersihan State Basis Data (Clean State):**
   Untuk memulai pengujian dari kondisi awal pabrik, bersihkan basis data `schedovyn_local_db` melalui DevTools Console:
   ```javascript
   indexedDB.deleteDatabase("schedovyn_local_db")
   window.location.reload()
   ```
4. **Verifikasi Baseline Unit & Integration Test:**
   Pastikan baseline test suite bernilai 100% GREEN (250 tests pass) dengan menjalankan:
   ```bash
   bun run test
   ```

---

## 3. Standar Pelaporan Hasil Pengujian

Setiap skenario pengujian diisi dengan status berikut pada saat eksekusi:
- **PASS:** Antarmuka dan alur interaksi berfungsi persis sesuai kriteria penerimaan tanpa galat pada konsol.
- **FAIL:** Terdapat deviasi perilaku visual, kegagalan kalkulasi bentrokan, crash aplikasi, atau galat unhandled pada konsol browser.
- **BLOCKED:** Pengujian tidak dapat dilanjutkan karena adanya *bug* penghambat pada langkah sebelumnya.
