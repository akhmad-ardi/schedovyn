# Skenario Uji: TC-04 — Deteksi Konflik Lintas Kelas & Ringkasan Validasi

**ID Kasus Uji:** `TC-04`  
**Fitur Terkait:** `FR-05` (Deteksi Konflik Otomatis Lintas Kelas), `FR-11` (Ringkasan Validasi), `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-07`, `AC-13`, `NFR-01`, `NFR-04`  
**Tujuan Pengujian:** Menguji ketepatan kalkulasi interval matematika *conflict engine*, deteksi bentrokan guru lintas kelas, durasi berbeda, batasan waktu berurutan, bentrokan ruangan, resolusi mandiri, penegakan larangan validasi prematur (**AC-13**), serta dialog ringkasan validasi dual-scope.

---

## 1. Prasyarat Pengujian (Pre-conditions)
1. Aplikasi terbuka di URL: `http://localhost:5173/`.
2. Kelas VII-A dan VII-B tersedia. Guru: Budi Santoso (mengajar Matematika dan IPA di VII-A dan VII-B), Siti Rahma (mengajar Bahasa Inggris di VII-B). Ruangan: Lab Komputer 1.
3. Jam istirahat Senin telah diatur pukul `09:30 - 10:00`.

---

## 2. Rincian Kasus Uji (Test Steps)

### Kasus Uji 4.1: Deteksi Bentrokan Guru Lintas Kelas (TEACHER_OVERLAP — AC-03)
- **Tindakan:**
  1. Pada kelas **VII-A**, tempatkan sesi Matematika (Guru: Budi Santoso) di hari **Senin pukul 07:30 - 08:15**.
  2. Beralih ke kelas **VII-B**.
  3. Pada kelas VII-B, tempatkan sesi Matematika (Guru: Budi Santoso) pada hari dan jam yang sama: **Senin pukul 07:30 - 08:15**.
  4. Amati tampilan blok sesi di kelas VII-B dan lencana status validasi di header toolbar.
  5. Kembali ke kelas **VII-A** dan amati blok sesi di kelas VII-A.
- **Hasil yang Diharapkan:**
  - Blok sesi di kedua kelas (VII-A dan VII-B) ditandai dengan garis tepi merah, lencana teks `[Bentrokan Guru]`, dan ikon peringatan.
  - Lencana status validasi di toolbar berubah menjadi warna merah bertuliskan `"2 Konflik"` (`CONFLICT_DETECTED`).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [01-teacher-overlap-detected.png](screenshots/TC-04/01-teacher-overlap-detected.png)
- **Catatan Pengujian:**
  - Deteksi bentrokan guru lintas kelas bekerja secara reaktif dan dua arah: penempatan di VII-B langsung menandai blok sesi di VII-B maupun VII-A dengan `data-conflict="true"`, lencana teks `"Bentrokan Guru"`, dan toolbar status memicu peringatan merah.

---

### Kasus Uji 4.2: Bentrokan Dua Sesi dengan Durasi Berbeda (AC-04)
- **Tindakan:**
  1. Pada kelas **VII-A**, biarkan sesi Matematika berada di **Senin pukul 07:30 - 08:15** (durasi 45 menit).
  2. Beralih ke kelas **VII-B**, hapus sesi sebelumnya, lalu tempatkan sesi IPA (durasi 90 menit) yang diampu oleh Guru Budi Santoso di **Senin pukul 08:00 - 09:30**.
- **Hasil yang Diharapkan:**
  - Konflik bentrokan guru tetap terdeteksi pada rentang tumpang tindih `08:00 - 08:15` (`startA < endB && startB < endA`).
  - Sistem tidak melewatkan irisan parsial 15 menit antara sesi 45 menit dan sesi 90 menit.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [02-different-duration-overlap.png](screenshots/TC-04/02-different-duration-overlap.png)
- **Catatan Pengujian:**
  - Sesi IPA 90 menit (`08:00 - 09:30`) yang beririsan 15 menit dengan sesi Matematika 45 menit (`07:30 - 08:15`) langsung ditandai dengan lencana `"Bentrokan Guru"`, membuktikan formula interval matematika akurat untuk durasi asimetris.

---

### Kasus Uji 4.3: Sesi Berurutan yang Berbatasan Tepat Bebas Konflik (AC-05)
- **Tindakan:**
  1. Pada kelas **VII-B**, lepaskan sesi IPA dan tempatkan sesi Matematika (45 menit) ke **Senin pukul 08:15 - 09:00** (berbatasan tepat dengan sesi VII-A yang selesai pukul `08:15`).
  2. Amati blok sesi Matematika di VII-B dan lencana status validasi.
- **Hasil yang Diharapkan:**
  - Kedua sesi **TIDAK dianggap bentrok** (`08:15` adalah titik temu yang sah sesuai aturan interval terbuka: `startA < endB && startB < endA`).
  - Tanda merah bentrokan guru hilang seketika (`hasConflict: false`).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [03-boundary-adjacent-no-conflict.png](screenshots/TC-04/03-boundary-adjacent-no-conflict.png)
- **Catatan Pengujian:**
  - Blok sesi Matematika di VII-B pada pukul `08:15 - 09:00` bersih dari tanda konflik (`hasConflict: false`), membuktikan bahwa pertemuan batas waktu yang presisi tidak memicu *false positive*.

---

### Kasus Uji 4.4: Bentrokan Pemakaian Ruangan (ROOM_OVERLAP — AC-06)
- **Tindakan:**
  1. Buka panel detail sesi kelas VII-A di Senin `07:30 - 08:15`, ubah ruangan menjadi `"Lab Komputer 1"`.
  2. Beralih ke kelas VII-B, tempatkan sesi Bahasa Inggris (Guru: Siti Rahma) di Senin `07:30 - 08:15` dengan ruangan `"Lab Komputer 1"`.
- **Hasil yang Diharapkan:**
  - Terdeteksi bentrokan ruangan (`ROOM_OVERLAP`).
  - Blok sesi menampilkan lencana `"Bentrokan Ruangan"`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [04-room-overlap-detected.png](screenshots/TC-04/04-room-overlap-detected.png)
- **Catatan Pengujian:**
  - Dua sesi dengan guru berbeda (Budi di VII-A dan Siti di VII-B) yang menggunakan fasilitas yang sama pada waktu yang sama langsung terdeteksi bentrokan ruangan secara tepat sasaran.

---

### Kasus Uji 4.5: Bentrokan Waktu Istirahat (BREAK_TIME_OVERLAP)
- **Tindakan:**
  1. Pada kelas VII-B, geser sesi Bahasa Inggris ke hari **Senin pukul 09:15 - 10:00** (menabrak waktu istirahat sekolah `09:30 - 10:00`).
- **Hasil yang Diharapkan:**
  - Terdeteksi bentrokan `BREAK_TIME_OVERLAP` dengan lencana multi-cue visual `"Bentrokan Istirahat"`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [05-break-time-overlap.png](screenshots/TC-04/05-break-time-overlap.png)
- **Catatan Pengujian:**
  - Irisan waktu antara sesi belajar dan jam istirahat sekolah langsung memicu penandaan multi-isyarat (ikon peringatan, border merah, dan badge teks `Bentrokan Istirahat`).

---

### Kasus Uji 4.6: Resolusi Mandiri Bebas Konflik (AC-07)
- **Tindakan:**
  1. Pindahkan sesi Bahasa Inggris di VII-B ke slot waktu bebas konflik di hari **Selasa pukul 08:00 - 08:45** dan kembalikan ruangan ke `-- Tanpa Ruangan Khusus --`.
  2. Kembalikan juga ruangan sesi Matematika VII-A ke `-- Tanpa Ruangan Khusus --`.
- **Hasil yang Diharapkan:**
  - Laporan bentrokan langsung terhapus seketika tanpa perlu pemicuan manual atau refresh halaman.
  - Sesi kembali normal (`hasConflict: false`).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [06-conflict-auto-resolved.png](screenshots/TC-04/06-conflict-auto-resolved.png)
- **Catatan Pengujian:**
  - Resolusi mandiri berhasil: memindahkan sesi ke slot waktu dan konfigurasi aman menghapus status konflik dari sesi dan toolbar secara deterministik.

---

### Kasus Uji 4.7: Penegakan Larangan Validasi Prematur (AC-13)
- **Tindakan:**
  1. Pada kondisi di mana seluruh sesi di grid bebas konflik waktu (0 konflik waktu), amati lencana status validasi di header toolbar saat masih ada kebutuhan pembelajaran yang belum terjadwal di sidebar.
- **Hasil yang Diharapkan:**
  - Sistem **DILARANG KERAS** menampilkan status `"Jadwal lengkap dan valid"` (`COMPLETE_AND_VALID`).
  - Lencana wajib menampilkan status amber `"Belum Lengkap"` (`INCOMPLETE`) atau badge jumlah peringatan.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [07-incomplete-status-enforced.png](screenshots/TC-04/07-incomplete-status-enforced.png)
- **Catatan Pengujian:**
  - Toolbar menampilkan lencana amber `"3 Peringatan"` (`INCOMPLETE`), menegakkan aturan integritas AC-13 bahwa jadwal tidak boleh dianggap valid dan lengkap jika alokasi kurikulum belum 100% terpenuhi.

---

### Kasus Uji 4.8: Dialog Ringkasan Validasi Dual-Scope & Matriks Kelas (FR-11)
- **Tindakan:**
  1. Klik tombol lencana status validasi pada header toolbar untuk membuka dialog **"Ringkasan Validasi: Daftar Konflik dan Peringatan"**.
  2. Amati tampilan kartu ringkasan validasi.
  3. Alihkan bilah pemilih cakupan (*Scope Switcher*) dari *"Kelas Aktif: VII-A"* ke *"Seluruh Ruang Kerja"*.
  4. Periksa tabel **Matriks Status Seluruh Kelas** pada tab filter `"Matriks Kelas"`.
  5. Klik tombol **"Buka Jadwal"** pada baris kelas **VII-B**.
- **Hasil yang Diharapkan:**
  - Angka metrik beralih secara mulus antara data kelas aktif dan data agregasi seluruh sekolah.
  - Tabel matriks merinci jumlah sesi terjadwal, belum terjadwal, dan status kelayakan per kelas.
  - Klik tombol "Buka Jadwal" menutup dialog dan langsung mengaktifkan kelas VII-B sebagai kelas aktif di editor.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [08-validation-summary-dialog.png](screenshots/TC-04/08-validation-summary-dialog.png)
- **Catatan Pengujian:**
  - Matriks kelas merangkum status kelas VII-A dan VII-B secara lengkap. Mengeklik tombol "Buka Jadwal" pada VII-B menutup dialog dan langsung beralih ke editor kelas VII-B tanpa reload halaman.

---

## 3. Ringkasan Eksekusi Pengujian

| ID Kasus Uji | Deskripsi Skenario | Kriteria Penerimaan | Status | Tangkapan Layar |
|---|---|---|---|---|
| **4.1** | Deteksi Bentrokan Guru Lintas Kelas | `FR-05`, `AC-03` | **PASS** | [`01-teacher-overlap-detected.png`](screenshots/TC-04/01-teacher-overlap-detected.png) |
| **4.2** | Bentrokan Sesi dengan Durasi Berbeda (45m vs 90m) | `FR-05`, `AC-04` | **PASS** | [`02-different-duration-overlap.png`](screenshots/TC-04/02-different-duration-overlap.png) |
| **4.3** | Sesi Berurutan yang Berbatasan Tepat Bebas Konflik | `FR-05`, `AC-05` | **PASS** | [`03-boundary-adjacent-no-conflict.png`](screenshots/TC-04/03-boundary-adjacent-no-conflict.png) |
| **4.4** | Bentrokan Pemakaian Ruangan Lintas Kelas | `FR-05`, `AC-06` | **PASS** | [`04-room-overlap-detected.png`](screenshots/TC-04/04-room-overlap-detected.png) |
| **4.5** | Bentrokan Waktu Istirahat Sekolah | `FR-05` | **PASS** | [`05-break-time-overlap.png`](screenshots/TC-04/05-break-time-overlap.png) |
| **4.6** | Resolusi Mandiri Bebas Konflik | `FR-05`, `AC-07` | **PASS** | [`06-conflict-auto-resolved.png`](screenshots/TC-04/06-conflict-auto-resolved.png) |
| **4.7** | Penegakan Larangan Validasi Prematur | `FR-11`, `AC-13` | **PASS** | [`07-incomplete-status-enforced.png`](screenshots/TC-04/07-incomplete-status-enforced.png) |
| **4.8** | Dialog Ringkasan Validasi Dual-Scope & Matriks Kelas | `FR-11` | **PASS** | [`08-validation-summary-dialog.png`](screenshots/TC-04/08-validation-summary-dialog.png) |

**Kesimpulan:** Seluruh logika *Smart Conflict Detection Engine* dan *Ringkasan Validasi* (`TC-04`) terbukti akurat, reaktif, dan deterministik. Persyaratan AC-03, AC-04, AC-05, AC-06, AC-07, AC-13, dan FR-11 terpenuhi secara sempurna.
