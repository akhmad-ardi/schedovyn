# Skenario Uji: TC-06 — Penyalinan Jadwal Antar Kelas Paralel

**ID Kasus Uji:** `TC-06`  
**Fitur Terkait:** `FR-12` (Penyalinan Jadwal), `AC-03`, `AC-07`, `NFR-01`, `NFR-02`  
**Tujuan Pengujian:** Menguji dialog penyalinan jadwal, mode penanganan timpa (*replace*) vs gabung (*merge*), strategi penugasan guru/ruangan, deteksi otomatis bentrokan pasca-penyalinan, serta pembatalan massal via Undo.

---

## 1. Prasyarat Pengujian (Pre-conditions)
1. Aplikasi terbuka di URL: `http://localhost:5173/`.
2. Kelas VII-A memiliki 2 sesi terjadwal: Matematika (Senin 07:30 - 08:15) dan Bahasa Inggris (Senin 08:15 - 09:00) yang diampu oleh Guru Budi Santoso.
3. Kelas tujuan VII-B memiliki kebutuhan mata pelajaran yang setara dengan guru default Siti Rahma.

---

## 2. Rincian Kasus Uji (Test Steps)

### Kasus Uji 6.1: Validasi Pembukaan Dialog & Larangan Kelas Identik
- **Tindakan:**
  1. Pada bilah toolbar editor kelas VII-A, klik tombol **"Salin Jadwal"** (ikon duplikasi).
  2. Amati dialog yang muncul.
  3. Periksa kolom **Kelas Sumber**: otomatis terpilih `"VII-A"` dengan keterangan `"2 sesi terjadwal"`.
  4. Amati tombol aksi **"Salin Jadwal Sekarang"** sebelum kelas tujuan dipilih.
- **Hasil yang Diharapkan:**
  - Dialog menampilkan judul *"Salin Jadwal Pembelajaran Antar Kelas"*.
  - Tombol aksi *"Salin Jadwal Sekarang"* dalam kondisi nonaktif (*disabled*), dan dropdown kelas tujuan menyaring kelas sumber agar tidak dapat dipilih sebagai target duplikasi yang identik.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [01-copy-dialog-validation.png](screenshots/TC-06/01-copy-dialog-validation.png)
- **Catatan Pengujian:**
  - Dialog terbuka responsif dan tombol submit berstatus `disabled: true` sebelum pengguna menentukan kelas tujuan yang sah.

---

### Kasus Uji 6.2: Penyalinan Mode Replace dengan Strategi "use-target-default"
- **Tindakan:**
  1. Pilih Kelas Tujuan: `"VII-B"`.
  2. Pilih Mode Penanganan: **"Timpa Jadwal Lama (Replace)"**.
  3. Pilih Strategi Guru: **"Gunakan Guru Default Sasaran"**.
  4. Pilih Strategi Ruangan: **"Gunakan Ruangan Default Sasaran"**.
  5. Klik tombol **"Salin Jadwal Sekarang"**.
  6. Pada layar hasil, klik tombol **"Buka Jadwal Kelas Sasaran"**.
- **Hasil yang Diharapkan:**
  - Proses kloning berlangsung instan (< 50 ms).
  - Layar hasil menampilkan pesan sukses: *"Jadwal Berhasil Disalin! Susunan pembelajaran dari kelas VII-A telah diduplikasi ke kelas VII-B"*.
  - Sesi di kelas VII-B mengaitkan guru default kelas VII-B (Siti Rahma) sehingga bebas dari bentrokan jadwal dengan kelas VII-A (`0 konflik baru`).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [02-copied-target-default-success.png](screenshots/TC-06/02-copied-target-default-success.png)
- **Catatan Pengujian:**
  - 2 sesi berhasil diduplikasi ke VII-B dengan ID sesi unik baru dan ditugaskan kepada Siti Rahma tanpa menimbulkan bentrokan waktu.

---

### Kasus Uji 6.3: Penyalinan dengan Strategi "keep-source" & Deteksi Bentrokan Otomatis (AC-03)
- **Tindakan:**
  1. Beralih kembali ke kelas VII-A dan buka dialog Salin Jadwal.
  2. Pilih target: `"VII-B"`.
  3. Pilih Strategi Guru: **"Salin Guru dari Sumber (Bisa Bentrok)"** (*keep-source*).
  4. Klik tombol **"Salin Jadwal Sekarang"**.
- **Hasil yang Diharapkan:**
  - Guru Budi Santoso disalin ke kelas VII-B pada hari dan jam yang sama persis dengan kelas VII-A.
  - Dialog memperingatkan bahwa terdapat **konflik bentrokan baru** yang terdeteksi (*"Bentrokan Jadwal Ditemukan - Ditemukan 2 bentrokan waktu pada kelas sasaran"*).
  - Lencana validasi toolbar beralih ke status merah `"2 Konflik"`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [03-copy-keep-source-conflict.png](screenshots/TC-06/03-copy-keep-source-conflict.png)
- **Catatan Pengujian:**
  - Strategi *keep-source* langsung memicu kalkulasi ulang *Smart Conflict Engine*, menampilkan alert peringatan bentrokan di dalam dialog dan memperbarui lencana toolbar secara otomatis.

---

### Kasus Uji 6.4: Pembatalan Massal Hasil Salin via Sekali Tekan Undo (AC-07, TDD 7.1)
- **Tindakan:**
  1. Tutup dialog penyalinan.
  2. Periksa tooltip tombol Undo pada toolbar: tertulis *"Batalkan: Salin jadwal dari VII-A ke VII-B (Ctrl+Z)"*.
  3. Tekan tombol pintas keyboard `Ctrl+Z` (Undo).
- **Hasil yang Diharapkan:**
  - Seluruh sesi hasil salin ke kelas VII-B terhapus/dikembalikan secara massal dalam satu langkah atomik.
  - Seluruh bentrokan guru yang baru timbul akibat penyalinan langsung terhapus dari laporan validasi seketika.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [04-undo-bulk-copy.png](screenshots/TC-06/04-undo-bulk-copy.png)
- **Catatan Pengujian:**
  - Pembatalan massal berhasil via sekali tekan `Ctrl+Z`, status toolbar kembali bersih dari bentrokan guru, membuktikan keandalan *atomic snapshot history manager*.

---

## 3. Ringkasan Eksekusi Pengujian

| ID Kasus Uji | Deskripsi Skenario | Kriteria Penerimaan | Status | Tangkapan Layar |
|---|---|---|---|---|
| **6.1** | Validasi Pembukaan Dialog & Larangan Kelas Identik | `FR-12`, `NFR-04` | **PASS** | [`01-copy-dialog-validation.png`](screenshots/TC-06/01-copy-dialog-validation.png) |
| **6.2** | Penyalinan Mode Replace dengan use-target-default | `FR-12`, `NFR-01` | **PASS** | [`02-copied-target-default-success.png`](screenshots/TC-06/02-copied-target-default-success.png) |
| **6.3** | Strategi keep-source & Deteksi Bentrokan Otomatis | `FR-12`, `AC-03` | **PASS** | [`03-copy-keep-source-conflict.png`](screenshots/TC-06/03-copy-keep-source-conflict.png) |
| **6.4** | Pembatalan Massal Hasil Salin via Sekali Tekan Undo | `FR-12`, `AC-07`, `NFR-02` | **PASS** | [`04-undo-bulk-copy.png`](screenshots/TC-06/04-undo-bulk-copy.png) |

**Kesimpulan:** Seluruh alur Penyalinan Jadwal Antar Kelas Paralel (`TC-06`) berjalan sempurna, penugasan guru/ruangan fleksibel, integrasi terhadap *Smart Conflict Engine* instan, dan operasi penyalinan dapat dibatalkan massal secara aman melalui Undo.
