# Skenario Uji: TC-03 — Pemilihan Kelas Aktif & Editor Jadwal Drag-and-Drop

**ID Kasus Uji:** `TC-03`  
**Fitur Terkait:** `FR-03` (Pemilihan Kelas Aktif), `FR-04` (Editor Jadwal Drag-and-Drop), `FR-06` (Manajemen Sesi Belum Terjadwal), `AC-01`, `AC-02`, `AC-08`, `NFR-01`, `NFR-04`  
**Tujuan Pengujian:** Menguji pemilihan kelas aktif, interaksi tarik-lepas (*drag-and-drop*) sesi pembelajaran, snapping waktu, filter sidebar sesi belum terjadwal, panel detail sesi, dan jalur alternatif keyboard accessibility.

---

## 1. Prasyarat Pengujian (Pre-conditions)
1. Aplikasi terbuka di URL: `http://localhost:5173/`.
2. Data master (Kelas VII-A, VII-B, Mapel Matematika & Bahasa Inggris, Guru Budi & Siti) telah tersedia.
3. Kelas aktif saat ini: **VII-A**.

---

## 2. Rincian Kasus Uji (Test Steps)

### Kasus Uji 3.1: Pemilihan Kelas Aktif Independen (AC-01)
- **Tindakan:**
  1. Periksa bilah pemilih kelas aktif (*ClassSelectorBar*) di bagian atas editor.
  2. Klik tombol kelas **"VII-A"**. Amati grid jadwal.
  3. Beralih ke kelas **"VII-B"** dengan mengeklik tombol kelas VII-B.
  4. Amati bahwa grid jadwal VII-B kosong dan sidebar menampilkan kebutuhan mengajar khusus kelas VII-B.
  5. Kembali ke kelas **"VII-A"**.
- **Hasil yang Diharapkan:**
  - Pemilihan kelas aktif memperbarui grid dan panel sesi secara instan tanpa memuat ulang halaman (*zero page reload*).
  - Jadwal masing-masing kelas terisolasi dan tidak saling menimpa tampilan.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [01-active-class-switch.png](screenshots/TC-03/01-active-class-switch.png)
- **Catatan Pengujian:**
  - Perpindahan kelas aktif dari VII-A (3 kebutuhan sesi) ke VII-B (2 kebutuhan sesi) langsung mengisolasi state jadwal tanpa reload browser.

---

### Kasus Uji 3.2: Panel Sesi Belum Terjadwal & Perhitungan Progres (AC-02, AC-08)
- **Tindakan:**
  1. Pada kelas VII-A, perhatikan panel **Sesi Belum Terjadwal** di sebelah kanan.
  2. Amati bilah progres: tertulis `0 dari 3 Sesi Terjadwal (0%)`.
  3. Gunakan filter pencarian pada panel: ketik `"Matematika"`.
  4. Hapus filter pencarian.
- **Hasil yang Diharapkan:**
  - Terdapat 3 kartu sesi: 2 kartu Matematika (45 menit, Guru: Budi Santoso) dan 1 kartu Bahasa Inggris (90 menit, Guru: Siti Rahma).
  - Filter pencarian menyaring daftar kartu sesi secara instan.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [02-unscheduled-filter-search.png](screenshots/TC-03/02-unscheduled-filter-search.png)
- **Catatan Pengujian:**
  - Bilah progres akurat menampilkan alokasi `0 dari 3 sesi terjadwal (0%)` dan filter pencarian instan berhasil menyaring kartu sesi sesuai kata kunci pencarian.

---

### Kasus Uji 3.3: Penempatan Sesi via Drag-and-Drop & Snapping Waktu
- **Tindakan:**
  1. Klik dan tahan (*drag*) atau gunakan aksi cepat pada kartu sesi **Matematika (45m)** pertama dari sidebar.
  2. Tempatkan ke kolom hari **Senin** pada grid waktu pukul `07:30`.
- **Hasil yang Diharapkan:**
  - Sesi menempel secara akurat (*snapping*) pada interval `07:30 - 08:15`.
  - Blok sesi muncul di grid dengan warna biru Matematika, teks jam `07:30 - 08:15`, nama mapel, dan nama guru.
  - Jumlah kartu Matematika di sidebar berkurang menjadi 1, dan bilah progres naik menjadi `1 dari 3 Sesi Terjadwal (33%)`.
  - Indikator penyimpanan di header beralih ke `"Menyimpan..."` lalu `"Tersimpan di browser"`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [03-session-placed-grid.png](screenshots/TC-03/03-session-placed-grid.png)
- **Catatan Pengujian:**
  - Sesi Matematika berhasil menempel (*snapping*) presisi pada Senin 07:30 - 08:15. Progres alokasi otomatis meningkat menjadi 1 dari 3 sesi terjadwal (33%).

---

### Kasus Uji 3.4: Pemindahan Sesi di Dalam Grid
- **Tindakan:**
  1. Klik blok sesi Matematika yang berada di Senin `07:30 - 08:15`.
  2. Pada panel detail sesi, ubah hari menjadi **Selasa** dan jam mulai ke pukul `08:00`.
- **Hasil yang Diharapkan:**
  - Blok sesi berpindah dari Senin ke Selasa pukul `08:00 - 08:45`.
  - Sesi tetap memiliki durasi 45 menit.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [04-session-moved-tuesday.png](screenshots/TC-03/04-session-moved-tuesday.png)
- **Catatan Pengujian:**
  - Pemindahan sesi via form presisi panel detail memindahkan blok sesi ke kolom Selasa pukul 08:00 - 08:45 dengan durasi tetap konsisten 45 menit.

---

### Kasus Uji 3.5: Aksesibilitas Keyboard untuk Penempatan Sesi (NFR-04)
- **Tindakan:**
  1. Bernavigasi ke kartu sesi **Bahasa Inggris (90m)** di sidebar.
  2. Buka dialog penempatan cepat keyboard:
     - Pilih Hari: `Senin`.
     - Pilih Jam Mulai: `08:15`.
     - Konfirmasi penempatan ke grid.
- **Hasil yang Diharapkan:**
  - Sesi Bahasa Inggris berhasil ditempatkan di hari Senin pukul `08:15 - 09:45` (90 menit).
  - Terdeteksi peringatan visual bentrokan waktu istirahat pada grid dan panel detail sesi.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [05-keyboard-placement.png](screenshots/TC-03/05-keyboard-placement.png)
- **Catatan Pengujian:**
  - Penempatan sesi tanpa drag mouse berhasil dilakukan. Konflik waktu istirahat (*Bentrokan Istirahat*) langsung dideteksi secara multi-cue visual (ikon peringatan + badge teks merah).

---

### Kasus Uji 3.6: Panel Detail Sesi & Pelepasan Sesi (Unschedule)
- **Tindakan:**
  1. Klik blok sesi Bahasa Inggris di grid.
  2. Tambahkan catatan sesi: `"Pertemuan pengenalan modul 1"`.
  3. Klik tombol **"Lepas dari Grid"**.
- **Hasil yang Diharapkan:**
  - Blok sesi Bahasa Inggris terhapus dari grid jadwal.
  - Kartu sesi Bahasa Inggris kembali muncul di sidebar Sesi Belum Terjadwal dengan kuota `1 sesi tersisa`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [06-session-unscheduled.png](screenshots/TC-03/06-session-unscheduled.png)
- **Catatan Pengujian:**
  - Sesi Bahasa Inggris berhasil dilepas (*unscheduled*) dari grid jadwal dan kembali muncul sebagai kartu yang siap dialokasikan di sidebar belum terjadwal.

---

## 3. Ringkasan Eksekusi Pengujian

| ID Kasus Uji | Deskripsi Skenario | Kriteria Penerimaan | Status | Tangkapan Layar |
|---|---|---|---|---|
| **3.1** | Pemilihan Kelas Aktif Independen | `FR-03`, `AC-01` | **PASS** | [`01-active-class-switch.png`](screenshots/TC-03/01-active-class-switch.png) |
| **3.2** | Panel Sesi Belum Terjadwal & Filter | `FR-06`, `AC-02`, `AC-08` | **PASS** | [`02-unscheduled-filter-search.png`](screenshots/TC-03/02-unscheduled-filter-search.png) |
| **3.3** | Penempatan Sesi via Dialog & Snapping Waktu | `FR-04`, `FR-06`, `AC-02` | **PASS** | [`03-session-placed-grid.png`](screenshots/TC-03/03-session-placed-grid.png) |
| **3.4** | Pemindahan Sesi di Dalam Grid | `FR-04`, `AC-07` | **PASS** | [`04-session-moved-tuesday.png`](screenshots/TC-03/04-session-moved-tuesday.png) |
| **3.5** | Aksesibilitas Keyboard untuk Penempatan Sesi | `FR-04`, `NFR-04` | **PASS** | [`05-keyboard-placement.png`](screenshots/TC-03/05-keyboard-placement.png) |
| **3.6** | Panel Detail Sesi & Pelepasan Sesi (Unschedule) | `FR-04`, `FR-06` | **PASS** | [`06-session-unscheduled.png`](screenshots/TC-03/06-session-unscheduled.png) |

**Kesimpulan:** Seluruh fungsionalitas Pemilihan Kelas Aktif dan Editor Jadwal (`TC-03`) terbukti berjalan mulus, snapping waktu akurat, alokasi progres dan sidebar sesi belum terjadwal sinkron, serta fitur keyboard accessibility memenuhi kriteria NFR-04.
