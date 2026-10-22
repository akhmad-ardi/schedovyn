# Skenario Uji: TC-05 — Riwayat Perubahan (Undo & Redo)

**ID Kasus Uji:** `TC-05`  
**Fitur Terkait:** `FR-07` (Undo dan Redo Jadwal), `AC-07` (Resolusi Konflik), `NFR-02` (Keandalan Data), `NFR-04` (Aksesibilitas Keyboard)  
**Tujuan Pengujian:** Menguji pembatalan (*undo*) dan pemulihan (*redo*) pada berbagai tindakan penyuntingan jadwal, pintasan keyboard (`Ctrl+Z` / `Ctrl+Y`), state disabled tombol, serta pelabelan deskriptif riwayat.

---

## 1. Prasyarat Pengujian (Pre-conditions)
1. Aplikasi terbuka di URL: `http://localhost:5173/`.
2. Kelas aktif: VII-A dengan setidaknya 2 kebutuhan mengajar belum terjadwal.
3. State riwayat awal bersih (tombol Undo dan Redo dalam kondisi disabled).

---

## 2. Rincian Kasus Uji (Test Steps)

### Kasus Uji 5.1: State Disabled Tombol Undo/Redo Awal
- **Tindakan:**
  1. Periksa tombol **Batal Perubahan** (Undo) dan **Ulangi Perubahan** (Redo) pada bilah toolbar editor.
  2. Amati teks informasi riwayat pada toolbar.
- **Hasil yang Diharapkan:**
  - Kedua tombol berada dalam kondisi nonaktif (*disabled*).
  - Teks riwayat tertulis `"Riwayat: 0 langkah tersimpan"`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [01-initial-disabled-state.png](screenshots/TC-05/01-initial-disabled-state.png)
- **Catatan Pengujian:**
  - Tombol Undo dan Redo berada dalam state `disabled: true` dengan tooltip informatif *"Tidak ada perubahan yang dapat dibatalkan"* dan *"Tidak ada perubahan yang dapat diulangi"*.

---

### Kasus Uji 5.2: Undo Penempatan Sesi via Tombol & Keyboard
- **Tindakan:**
  1. Tempatkan kartu sesi Matematika ke hari Senin pukul `07:30 - 08:15`.
  2. Amati tombol Undo di toolbar: tombol aktif dan menampilkan tooltip deskriptif *"Batalkan: Tempatkan Matematika ke Senin 07:30 - 08:15 (Ctrl+Z)"*.
  3. Klik tombol **Batal Perubahan** (Undo).
  4. Amati grid dan sidebar sesi belum terjadwal.
  5. Tekan tombol pintas keyboard `Ctrl+Y`.
  6. Tekan tombol pintas keyboard `Ctrl+Z`.
- **Hasil yang Diharapkan:**
  - Klik Undo membatalkan penempatan sesi: blok sesi hilang dari grid dan kartu kembali ke sidebar.
  - Tekan `Ctrl+Y` memulihkan penempatan sesi kembali ke grid Senin `07:30 - 08:15`.
  - Tekan `Ctrl+Z` kembali membatalkan sesi ke antrean belum terjadwal.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [02-undo-placement.png](screenshots/TC-05/02-undo-placement.png)
- **Catatan Pengujian:**
  - Interaksi Undo/Redo via mouse maupun keyboard shortcut (`Ctrl+Z` dan `Ctrl+Y`) bekerja secara instan tanpa mendistorsi kuota alokasi sesi.

---

### Kasus Uji 5.3: Undo Pemindahan Sesi di Antara Slot Waktu
- **Tindakan:**
  1. Pindahkan sesi Matematika dari Senin `07:30 - 08:15` ke Senin pukul `08:30 - 09:15`.
  2. Tekan tombol pintas keyboard `Ctrl+Z`.
- **Hasil yang Diharapkan:**
  - Blok sesi langsung kembali ke posisi awal di Senin pukul `07:30 - 08:15`.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [03-undo-move-session.png](screenshots/TC-05/03-undo-move-session.png)
- **Catatan Pengujian:**
  - Pembatalan mutasi perpindahan waktu mengembalikan sesi tepat ke interval `07:30 - 08:15` dengan durasi 45 menit tetap terjaga.

---

### Kasus Uji 5.4: Undo Pemulihan Konflik Otomatis
- **Tindakan:**
  1. Tempatkan sesi Matematika kelas VII-B di Senin `07:30 - 08:15` sehingga memicu bentrokan guru dengan kelas VII-A (`1 Konflik`).
  2. Pada kelas VII-A, pindahkan sesi Matematika ke hari Selasa untuk menyelesaikan bentrokan (status toolbar menjadi bebas konflik waktu).
  3. Tekan `Ctrl+Z` (Undo).
  4. Tekan `Ctrl+Y` (Redo).
- **Hasil yang Diharapkan:**
  - Tekan `Ctrl+Z` mengembalikan sesi ke slot bentrok Senin `07:30` dan laporan konflik kembali terdeteksi (`1 Konflik`).
  - Tekan `Ctrl+Y` memulihkan sesi ke slot Selasa bebas konflik dan menghapus bentrokan seketika.
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [04-undo-conflict-resolution.png](screenshots/TC-05/04-undo-conflict-resolution.png)
- **Catatan Pengujian:**
  - Undo dan Redo merekonstruksi ulang evaluasi *Smart Conflict Engine* secara deterministik pada setiap langkah riwayat.

---

### Kasus Uji 5.5: Pembersihan Riwayat Redo Saat Mutasi Baru
- **Tindakan:**
  1. Tekan tombol Undo 1 kali (stack Redo terisi 1 langkah dan tombol Redo aktif).
  2. Lakukan aksi baru: tempatkan sesi Bahasa Inggris ke hari Senin pukul `08:30`.
  3. Periksa tombol Redo pada toolbar.
- **Hasil yang Diharapkan:**
  - Tombol Redo kembali *disabled* karena mutasi baru memotong percabangan riwayat masa depan (*future history cleared*).
- **Status Hasil:** ✅ **PASS**
- **Bukti Tangkapan Layar:** [05-future-history-cleared.png](screenshots/TC-05/05-future-history-cleared.png)
- **Catatan Pengujian:**
  - Mutasi baru berhasil mengosongkan stack riwayat masa depan (*redo stack*), mencegah percabangan jadwal yang ambigu.

---

## 3. Ringkasan Eksekusi Pengujian

| ID Kasus Uji | Deskripsi Skenario | Kriteria Penerimaan | Status | Tangkapan Layar |
|---|---|---|---|---|
| **5.1** | State Disabled Tombol Undo/Redo Awal | `FR-07`, `NFR-04` | **PASS** | [`01-initial-disabled-state.png`](screenshots/TC-05/01-initial-disabled-state.png) |
| **5.2** | Undo Penempatan Sesi via Tombol & Keyboard | `FR-07`, `NFR-04` | **PASS** | [`02-undo-placement.png`](screenshots/TC-05/02-undo-placement.png) |
| **5.3** | Undo Pemindahan Sesi di Antara Slot Waktu | `FR-07`, `NFR-02` | **PASS** | [`03-undo-move-session.png`](screenshots/TC-05/03-undo-move-session.png) |
| **5.4** | Undo Pemulihan Konflik Otomatis | `FR-07`, `AC-07` | **PASS** | [`04-undo-conflict-resolution.png`](screenshots/TC-05/04-undo-conflict-resolution.png) |
| **5.5** | Pembersihan Riwayat Redo Saat Mutasi Baru | `FR-07` | **PASS** | [`05-future-history-cleared.png`](screenshots/TC-05/05-future-history-cleared.png) |

**Kesimpulan:** Seluruh fungsionalitas Riwayat Perubahan (Undo & Redo) pada `TC-05` berjalan mulus, pintasan keyboard `Ctrl+Z` dan `Ctrl+Y` responsif, pelabelan tooltip riwayat deskriptif, serta sinkronisasi terhadap *Smart Conflict Engine* terbukti deterministik.
