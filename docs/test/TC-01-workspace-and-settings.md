# Skenario Uji: TC-01 — Konfigurasi Ruang Kerja & Jam Belajar

**ID Kasus Uji:** `TC-01`  
**Fitur Terkait:** `FR-01` (Konfigurasi Ruang Kerja & Jadwal), `AC-12` (Penyimpanan Lokal), `NFR-02` (Keandalan Data)  
**Tujuan Pengujian:** Memverifikasi fungsionalitas penyuntingan identitas ruang kerja, jam operasional hari sekolah, interval snap, manajemen waktu istirahat, serta persistensi otomatis ke IndexedDB.  
**Status Eksekusi:** ✅ **PASS (100% Lulus)**  
**Tanggal Eksekusi:** 2026-10-22 21:10 WIB  
**Metode Eksekusi:** Otomasi Browser Langsung (*Headless Chromium Browser via Puppeteer-Core*)

---

## 1. Prasyarat Pengujian (Pre-conditions)
1. Aplikasi terbuka di URL: `http://localhost:5173/settings`.
2. IndexedDB dalam kondisi terhidrasi (*hydrated*) dengan data awal ruang kerja aktif.
3. Terdapat minimal satu kelas aktif pada data master agar kanvas grid jadwal dapat dirender secara visual di halaman Editor Jadwal (`/`).

---

## 2. Rincian Kasus Uji & Hasil Eksekusi

### Kasus Uji 1.1: Pembaruan Identitas Ruang Kerja
- **Tindakan:**
  1. Arahkan kursor ke input **Nama Ruang Kerja / Sekolah** (`#workspace-name-input`).
  2. Ubah nilai input menjadi: `"SMP Negeri 1 Unggulan Nusantara"`.
  3. Arahkan kursor ke input **Tahun Ajaran / Periode Akademik** (`#workspace-period-input`).
  4. Ubah nilai input menjadi: `"Semester Genap 2026/2027"`.
  5. Perhatikan indikator penyimpanan pada header lencana status.
- **Hasil yang Diharapkan:**
  - Status penyimpanan berubah sementara menjadi `"Menyimpan..."` lalu beralih ke `"Tersimpan di browser"`.
  - Teks nama sekolah dan tahun ajaran pada header kiri atas langsung terperbarui tanpa refresh halaman.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [01-workspace-identity.png](screenshots/TC-01/01-workspace-identity.png)
- **Catatan Pengujian:**
  - Indikator status berhasil menampilkan lencana hijau `"Tersimpan di browser"`.
  - Header aplikasi langsung menampilkan `"SMP Negeri 1 Unggulan Nusantara · Semester Genap 2026/2027"`.

---

### Kasus Uji 1.2: Konfigurasi Hari Sekolah & Jam Belajar
- **Tindakan:**
  1. Pada kartu hari **Senin**, ubah **Jam Mulai Belajar** (`#start-time-monday`) menjadi `"07:00"`.
  2. Ubah **Jam Selesai Belajar** (`#end-time-monday`) menjadi `"15:00"`.
  3. Ubah **Interval Snap Waktu** menjadi `"15 menit"`.
  4. Nonaktifkan toggle **Hari Sekolah** pada hari **Sabtu** (`#switch-school-day-saturday`).
- **Hasil yang Diharapkan:**
  - Konfigurasi tersimpan secara otomatis.
  - Saat kembali ke Editor Jadwal (`/`), kolom hari Sabtu tidak muncul pada grid jadwal (hanya menampilkan Senin s.d. Jumat).
  - Garis waktu vertikal pada hari Senin dimulai dari pukul `07:00` hingga `15:00`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:**
  - Pengaturan Hari & Jam: [02-day-config-settings.png](screenshots/TC-01/02-day-config-settings.png)
  - Grid Jadwal 5 Hari Aktif: [02-editor-grid-five-days.png](screenshots/TC-01/02-editor-grid-five-days.png)
- **Catatan Pengujian:**
  - Baris hari Sabtu menampilkan label status `"Libur / Nonaktif"`.
  - Pada halaman Editor (`/`), kanvas jadwal merender 5 hari sekolah aktif (`Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`). Kolom Sabtu berhasil dikecualikan dari grid.
  - Sub-header hari Senin menampilkan jam operasional `07:00 - 15:00`.

---

### Kasus Uji 1.3: Pengelolaan Waktu Istirahat (Break Intervals)
- **Tindakan:**
  1. Pada kartu hari **Senin**, klik tombol **"Tambah Waktu Istirahat"**.
  2. Isi label istirahat: `"Istirahat Pertama"`, jam mulai: `"09:30"`, jam selesai: `"10:00"`.
  3. Klik tombol **"Tambah Waktu Istirahat"** kedua.
  4. Isi label istirahat: `"Istirahat Sholat & Makan"`, jam mulai: `"11:45"`, jam selesai: `"12:30"`.
  5. Tambahkan interval istirahat ketiga dengan jam yang bertabrakan (`12:00` s.d. `12:45`) dengan label `"Istirahat Bentrok"`.
  6. Periksa respons validasi kesalahan konfigurasi.
  7. Hapus interval istirahat ketiga yang bertabrakan.
  8. Navigasi ke Editor Jadwal (`/`) untuk memverifikasi penampilan visual di grid.
- **Hasil yang Diharapkan:**
  - Istirahat pertama dan kedua berhasil ditambahkan dan disimpan.
  - Interval istirahat ketiga memicu pesan galat validasi: *"Waktu istirahat 'Istirahat Sholat & Makan' (11:45 - 12:30) dan 'Istirahat Bentrok' (12:00 - 12:45) pada hari Senin saling bertabrakan."*
  - Pada Editor Jadwal (`/`), area pukul `09:30-10:00` dan `11:45-12:30` di kolom Senin ditandai sebagai zona istirahat berarsir amber dengan label yang jelas.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:**
  - Deteksi Bentrok Istirahat: [03-break-overlap-error.png](screenshots/TC-01/03-break-overlap-error.png)
  - Konfigurasi Istirahat Valid: [03-breaks-configured.png](screenshots/TC-01/03-breaks-configured.png)
  - Visual Zona Istirahat di Grid: [03-editor-break-intervals.png](screenshots/TC-01/03-editor-break-intervals.png)
- **Catatan Pengujian:**
  - Alert error validasi merah muncul di bagian atas halaman dan pada kartu Senin ketika terdapat overlap.
  - Setelah dihapus, status kembali valid dan zona waktu istirahat terarsir di kanvas grid.

---

### Kasus Uji 1.4: Pemulihan Data Setelah Muat Ulang Halaman (AC-12)
- **Tindakan:**
  1. Lakukan *hard reload* peramban (`page.reload({ waitUntil: "networkidle0" })`).
  2. Tunggu proses hidrasi dari IndexedDB selesai.
  3. Periksa nilai header, tampilan grid Editor, dan form pengaturan di `/settings`.
- **Hasil yang Diharapkan:**
  - Seluruh konfigurasi yang baru saja disunting pulih 100% dari basis data IndexedDB tanpa ada data yang hilang.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [04-recovered-after-reload.png](screenshots/TC-01/04-recovered-after-reload.png)
- **Catatan Pengujian:**
  - Identitas `"SMP Negeri 1 Unggulan Nusantara"` dan `"Semester Genap 2026/2027"` tetap utuh pada header dan input formulir.
  - Hari Sabtu tetap nonaktif (`aria-checked="false"`).
  - Hari Senin mempertahankan jam `07:00 - 15:00` serta 2 interval istirahat (`"Istirahat Pertama"` dan `"Istirahat Sholat & Makan"`).

---

## 3. Ringkasan Eksekusi Pengujian

| ID Kasus Uji | Deskripsi Skenario | Kriteria Penerimaan | Status | Tangkapan Layar |
|---|---|---|---|---|
| **1.1** | Pembaruan Identitas Ruang Kerja & Sekolah | `FR-01`, `FR-10` | **PASS** | [`01-workspace-identity.png`](screenshots/TC-01/01-workspace-identity.png) |
| **1.2** | Konfigurasi Jam Belajar & Hari Aktif Sekolah | `FR-01`, `AC-01` | **PASS** | [`02-day-config-settings.png`](screenshots/TC-01/02-day-config-settings.png), [`02-editor-grid-five-days.png`](screenshots/TC-01/02-editor-grid-five-days.png) |
| **1.3** | Pengelolaan Waktu Istirahat & Deteksi Bentrok | `FR-01`, `FR-05` | **PASS** | [`03-break-overlap-error.png`](screenshots/TC-01/03-break-overlap-error.png), [`03-breaks-configured.png`](screenshots/TC-01/03-breaks-configured.png), [`03-editor-break-intervals.png`](screenshots/TC-01/03-editor-break-intervals.png) |
| **1.4** | Ketahanan Data Pasca-Reload (IndexedDB) | `AC-12`, `NFR-02` | **PASS** | [`04-recovered-after-reload.png`](screenshots/TC-01/04-recovered-after-reload.png) |

**Kesimpulan:** Seluruh fungsionalitas Konfigurasi Ruang Kerja & Jam Belajar (`TC-01`) berjalan sempurna, stabil, dan terbukti persisten di browser.
