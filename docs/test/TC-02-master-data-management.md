# Skenario Uji: TC-02 — Pengelolaan Data Master (Master Data Management)

**ID Kasus Uji:** `TC-02`  
**Fitur Terkait:** `FR-02` (Manajemen Data Master), `AC-08` (Perhitungan Kebutuhan Sesi), `NFR-02`, `NFR-04`  
**Tujuan Pengujian:** Menguji penambahan, penyuntingan, validasi, dan penghapusan data Kelas, Mata Pelajaran, Guru, Ruangan, serta Kebutuhan Pembelajaran (*Teaching Requirements*).  
**Status Eksekusi:** ✅ **PASS (100% Lulus)**  
**Tanggal Eksekusi:** 2026-10-22 21:28 WIB  
**Metode Eksekusi:** Otomasi Browser Langsung (*Headless Chromium Browser via Puppeteer-Core & Chrome DevTools Protocol*)

---

## 1. Prasyarat Pengujian (Pre-conditions)
1. Aplikasi terbuka di URL: `http://localhost:5173/master-data`.
2. Ruang kerja telah siap digunakan dan IndexedDB terhidrasi.

---

## 2. Rincian Kasus Uji & Hasil Eksekusi

### Kasus Uji 2.1: CRUD Kelas & Validasi Duplikasi
- **Tindakan:**
  1. Klik tab **"Kelas"**.
  2. Tambahkan Kelas 1: Nama Kelas `"VII-A"`, Tingkat `"VII"`, Catatan `"Kelas Reguler"`. Klik Simpan.
  3. Coba masukkan Nama Kelas: `"VII-A"` dengan Tingkat: `"VII"` kedua kalinya.
  4. Periksa respons pesan galat validasi.
  5. Tambahkan Kelas 2: `"VII-B"`, Tingkat: `"VII"`.
  6. Tambahkan Kelas 3: `"VIII-A"`, Tingkat: `"VIII"`.
- **Hasil yang Diharapkan:**
  - Kelas VII-A berhasil tersimpan dan muncul di tabel kelas.
  - Percobaan menambahkan VII-A kedua ditolak dengan pesan galat *"Kelas dengan nama "VII-A" sudah terdaftar di ruang kerja ini."*
  - Kelas VII-B dan VIII-A berhasil tersimpan. Tabel memuat minimal 3 kelas aktif.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:**
  - Validasi Duplikasi Kelas: [01-class-duplicate-error.png](screenshots/TC-02/01-class-duplicate-error.png)
  - Daftar Kelas Tersimpan: [01-classes-list.png](screenshots/TC-02/01-classes-list.png)
- **Catatan Pengujian:**
  - Alert galat destruktif merah muncul saat mencoba mendaftarkan kelas dengan nama yang sama.
  - Tabel kelas menampilkan kolom Nama, Tingkat, Keterangan, Jumlah Kebutuhan, dan aksi edit/hapus.

---

### Kasus Uji 2.2: CRUD Mata Pelajaran & Palet Warna Visual
- **Tindakan:**
  1. Klik tab **"Mata Pelajaran"**.
  2. Tambahkan Mapel 1: Nama: `"Matematika"`, warna tema: `Biru` (`"blue"`). Klik Simpan.
  3. Tambahkan Mapel 2: Nama: `"Bahasa Inggris"`, warna tema: `Zamrud` (`"emerald"`).
  4. Tambahkan Mapel 3: Nama: `"Ilmu Pengetahuan Alam"`, warna tema: `Oranye` (`"orange"`).
- **Hasil yang Diharapkan:**
  - Ketiga mata pelajaran tersimpan dengan lencana warna (*swatch color badge*) yang sesuai pada tabel mata pelajaran.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [02-subjects-list.png](screenshots/TC-02/02-subjects-list.png)
- **Catatan Pengujian:**
  - Setiap baris mata pelajaran menampilkan lencana warna visual (Biru, Zamrud, Oranye) yang nantinya menjadi warna latar blok sesi di grid jadwal.

---

### Kasus Uji 2.3: CRUD Guru & Interval Ketidaksediaan Waktu
- **Tindakan:**
  1. Klik tab **"Guru"**.
  2. Tambahkan Guru 1: Nama `"Budi Santoso, S.Pd."`, Keterangan `"Guru Matematika Senior"`.
  3. Pada bagian **Waktu Tidak Bersedia**, klik tombol "Tambah Rentang Waktu".
  4. Atur Hari: `Senin`, Jam Mulai: `13:00`, Jam Selesai: `15:00`, Keterangan: `"Rapat MGMP"`. Klik Simpan.
  5. Tambahkan Guru 2: Nama `"Siti Rahma, M.Pd."` tanpa batasan waktu tidak bersedia. Klik Simpan.
- **Hasil yang Diharapkan:**
  - Guru Budi Santoso tersimpan dengan 1 interval ketidaksediaan di hari Senin jam `13:00-15:00 (Rapat MGMP)`.
  - Guru Siti Rahma tersimpan dengan status ketersediaan penuh (*"Selalu tersedia"*).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [03-teachers-list.png](screenshots/TC-02/03-teachers-list.png)
- **Catatan Pengujian:**
  - Rentang waktu tidak tersedia tersimpan ke dalam entitas guru dan ditampilkan dalam badge abu-abu pada tabel data master guru.

---

### Kasus Uji 2.4: CRUD Ruangan & Penentuan Tipe Fasilitas
- **Tindakan:**
  1. Klik tab **"Ruangan"**.
  2. Tambahkan Ruangan 1: Nama `"Lab Komputer 1"`, Tipe: `"Laboratorium"`, Keterangan: `"Kapasitas 36 siswa"`.
  3. Tambahkan Ruangan 2: Nama `"Ruang Teori 101"`, Tipe: `"Ruang Kelas"`, Keterangan: `"Kapasitas 32 siswa"`.
- **Hasil yang Diharapkan:**
  - Kedua ruangan berhasil tersimpan pada tabel master ruangan dengan tipe fasilitas yang tepat.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [04-rooms-list.png](screenshots/TC-02/04-rooms-list.png)
- **Catatan Pengujian:**
  - Fasilitas ruangan berhasil diklasifikasikan ke dalam kategori masing-masing (Laboratorium & Ruang Kelas).

---

### Kasus Uji 2.5: Pemetaan Kebutuhan Pembelajaran (Teaching Requirements)
- **Tindakan:**
  1. Klik tab **"Kebutuhan Pembelajaran"**.
  2. Tambahkan Kebutuhan 1:
     - Kelas: `VII-A`, Mapel: `Matematika`, Sesi/Minggu: `2`, Durasi: `45 menit`, Guru: `Budi Santoso, S.Pd.`.
  3. Tambahkan Kebutuhan 2:
     - Kelas: `VII-A`, Mapel: `Bahasa Inggris`, Sesi/Minggu: `1`, Durasi: `90 menit`, Guru: `Siti Rahma, M.Pd.`.
  4. Tambahkan Kebutuhan 3:
     - Kelas: `VII-B`, Mapel: `Matematika`, Sesi/Minggu: `2`, Durasi: `45 menit`, Guru: `Budi Santoso, S.Pd.`.
  5. Navigasi ke Editor Jadwal (`/`) dan pilih kelas aktif `VII-A`.
  6. Periksa sidebar panel Sesi Belum Terjadwal (*UnscheduledPanel*).
- **Hasil yang Diharapkan:**
  - Ketiga entitas kebutuhan pembelajaran berhasil dibuat dan dirangkum pada tabel kebutuhan.
  - Pada Editor Jadwal (`/`), sidebar Sesi Belum Terjadwal untuk kelas VII-A otomatis menampilkan 2 sesi Matematika (@45m) dan 1 sesi Bahasa Inggris (@90m).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:**
  - Tabel Daftar Kebutuhan: [05-requirements-list.png](screenshots/TC-02/05-requirements-list.png)
  - Sidebar Sesi Belum Terjadwal di Editor: [05-editor-unscheduled-sessions.png](screenshots/TC-02/05-editor-unscheduled-sessions.png)
- **Catatan Pengujian:**
  - Di Editor Jadwal (`/`), kartu sesi belum terjadwal untuk kelas VII-A menampilkan badge "2 sesi tersisa (45 menit)" untuk Matematika dan "1 sesi tersisa (90 menit)" untuk Bahasa Inggris sesuai alokasi kebutuhan.

---

## 3. Ringkasan Eksekusi Pengujian

| ID Kasus Uji | Deskripsi Skenario | Kriteria Penerimaan | Status | Tangkapan Layar |
|---|---|---|---|---|
| **2.1** | CRUD Kelas & Validasi Duplikasi Nama | `FR-02`, `AC-08` | **PASS** | [`01-class-duplicate-error.png`](screenshots/TC-02/01-class-duplicate-error.png), [`01-classes-list.png`](screenshots/TC-02/01-classes-list.png) |
| **2.2** | CRUD Mata Pelajaran & Palet Warna Visual | `FR-02`, `NFR-04` | **PASS** | [`02-subjects-list.png`](screenshots/TC-02/02-subjects-list.png) |
| **2.3** | CRUD Guru & Rentang Ketidaksediaan Waktu | `FR-02`, `FR-05` | **PASS** | [`03-teachers-list.png`](screenshots/TC-02/03-teachers-list.png) |
| **2.4** | CRUD Ruangan & Penentuan Tipe Fasilitas | `FR-02`, `FR-05` | **PASS** | [`04-rooms-list.png`](screenshots/TC-02/04-rooms-list.png) |
| **2.5** | Pemetaan Kebutuhan Pembelajaran & Sesi Belum Terjadwal | `FR-02`, `FR-06`, `AC-08` | **PASS** | [`05-requirements-list.png`](screenshots/TC-02/05-requirements-list.png), [`05-editor-unscheduled-sessions.png`](screenshots/TC-02/05-editor-unscheduled-sessions.png) |

**Kesimpulan:** Seluruh fungsionalitas Pengelolaan Data Master (`TC-02`) berjalan sempurna, validasi integritas data berfungsi tepat sasaran, dan otomatisasi pembuatan sesi belum terjadwal terbukti sinkron dengan Editor Jadwal.
