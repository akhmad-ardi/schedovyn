# Product Requirements Document (PRD) - Schedovyn

**Versi:** 1.0.0  
**Status:** Draft  
**Jenis Produk:** Client-side Web Application  
**Target Pengguna:** Admin sekolah, guru, atau staf yang bertugas menyusun jadwal pembelajaran  
**Platform:** Web Desktop  
**Bahasa Antarmuka:** Bahasa Indonesia

---

## 1. Ringkasan Produk

### 1.1 Deskripsi

Schedovyn adalah aplikasi web berbasis konsep *Smart Timetable Planner* untuk menyusun jadwal pembelajaran secara visual dengan mekanisme drag-and-drop serta mendeteksi konflik jadwal secara otomatis.

Pengguna memilih satu kelas terlebih dahulu, kemudian menyusun jadwal kelas tersebut melalui editor berbentuk grid waktu. Setiap perubahan jadwal akan diperiksa terhadap jadwal lain dalam ruang kerja yang sama untuk menemukan bentrokan guru, kelas, ruangan, dan ketersediaan waktu.

Setelah jadwal selesai disusun, pengguna dapat mengekspor hasilnya ke PDF untuk dicetak atau dibagikan dan Excel (.xlsx) untuk pengolahan data lebih lanjut.

Seluruh data jadwal, pemeriksaan konflik, dan proses ekspor dijalankan di browser. Aplikasi tidak memerlukan autentikasi, backend aplikasi, maupun database server.

### 1.2 Masalah yang Ingin Diselesaikan

Penyusunan jadwal pembelajaran secara manual memiliki sejumlah kendala:

1. Pengguna perlu memeriksa jadwal dari banyak kelas untuk memastikan guru tidak mengajar pada waktu yang bersamaan.
2. Perubahan satu jadwal dapat menyebabkan konflik dengan jadwal kelas lain.
3. Penyusunan dan perubahan jadwal melalui formulir atau spreadsheet biasa kurang intuitif.
4. Pemeriksaan konflik secara manual membutuhkan perhatian dan waktu tambahan.
5. Hasil akhir perlu disusun kembali ke dalam format yang dapat dicetak atau diolah lebih lanjut.

Schedovyn bertujuan mengurangi beban tersebut melalui editor jadwal visual dan pemeriksaan konflik otomatis.

### 1.3 Visi Produk

Menjadi alat penyusunan jadwal pembelajaran yang sederhana, interaktif, dan membantu pengguna menemukan konflik sedini mungkin tanpa membutuhkan akun atau infrastruktur backend.

### 1.4 Prinsip Produk

- **Conflict-first:** deteksi dan penjelasan konflik merupakan nilai utama aplikasi.
- **Visual-first:** pengguna menyusun jadwal melalui interaksi langsung dengan grid waktu.
- **Class-oriented:** pengguna memilih satu kelas untuk menjadi fokus penyuntingan.
- **Local-first:** data dan pemrosesan tetap berada di browser pengguna.
- **No account required:** pengguna tidak perlu melakukan registrasi atau login.
- **Export-ready:** hasil jadwal bisa diekspor langsung tanpa dikirim ke server.
- **Transparent validation:** aplikasi membedakan jadwal yang bebas konflik dari jadwal yang belum lengkap atau belum dapat diverifikasi sepenuhnya.

---

## 2. Tujuan dan Non-Goals

### 2.1 Tujuan Produk

1. Memungkinkan pengguna menyusun jadwal mingguan berdasarkan kelas.
2. Menyediakan interaksi drag-and-drop untuk menempatkan dan memindahkan sesi pelajaran.
3. Mendeteksi konflik jadwal lintas kelas secara otomatis.
4. Menjelaskan penyebab konflik dan menunjukkan sesi yang terlibat.
5. Membantu pengguna melihat sesi yang belum ditempatkan.
6. Menyediakan ekspor PDF dan Excel sepenuhnya di browser.
7. Menyimpan progres pekerjaan secara lokal agar dapat dilanjutkan pada browser yang sama.

### 2.2 Non-Goals

Fitur berikut tidak termasuk dalam ruang lingkup versi 1.0.0:

- Registrasi, login, dan manajemen akun pengguna.
- Role dan permission management.
- Backend aplikasi dan database server.
- Sinkronisasi data antarperangkat.
- Kolaborasi real-time antar pengguna.
- Auto-scheduling atau pencarian jadwal optimal menggunakan algoritma optimasi.
- Absensi siswa atau guru.
- Pengelolaan nilai, tugas, ujian, dan materi pembelajaran.
- Sistem informasi akademik lengkap.
- Notifikasi kepada siswa, guru, atau orang tua.
- Integrasi dengan LMS atau sistem akademik eksternal.
- Publikasi jadwal melalui tautan publik.
- Impor dan ekspor data proyek dalam format selain PDF dan Excel.

---

## 3. Target Pengguna

### 3.1 Persona Utama: Penyusun Jadwal Sekolah

Pengguna merupakan admin sekolah, guru, atau staf yang bertanggung jawab menyusun dan memperbaiki jadwal pembelajaran.

**Kebutuhan:**

- Menyusun jadwal dengan cepat.
- Melihat ketersediaan waktu guru dan ruangan.
- Menemukan konflik tanpa memeriksa seluruh jadwal secara manual.
- Memperbaiki konflik secara langsung.
- Menghasilkan dokumen jadwal yang siap dicetak atau diolah kembali.

**Karakteristik penggunaan:**

- Menggunakan aplikasi melalui browser desktop.
- Dapat bekerja dengan banyak kelas, guru, dan mata pelajaran.
- Tidak ingin membuat akun hanya untuk menggunakan alat penjadwalan.
- Memerlukan hasil yang mudah dibaca dan dibagikan.

### 3.2 Model Penggunaan

Aplikasi mendukung satu ruang kerja lokal pada satu browser. Ruang kerja tersebut dapat berisi banyak kelas, guru, mata pelajaran, ruangan, dan sesi pembelajaran.

Pengguna memilih satu kelas sebagai kelas aktif untuk penyuntingan, tetapi mesin pendeteksi konflik memeriksa seluruh sesi yang tersimpan dalam ruang kerja.

Tidak terdapat pemisahan data berdasarkan akun atau pengguna.

---

## 4. Ruang Lingkup Fitur

### 4.1 Ringkasan Fitur

| ID | Fitur | Prioritas |
|---|---|---|
| FR-01 | Pengaturan ruang kerja dan jam belajar | Must Have |
| FR-02 | Pengelolaan data master | Must Have |
| FR-03 | Pemilihan kelas aktif | Must Have |
| FR-04 | Editor jadwal drag-and-drop | Must Have |
| FR-05 | Smart conflict detection | Must Have |
| FR-06 | Daftar sesi yang belum terjadwal | Must Have |
| FR-07 | Undo dan redo perubahan | Should Have |
| FR-08 | Ekspor jadwal PDF | Must Have |
| FR-09 | Ekspor jadwal Excel | Must Have |
| FR-10 | Penyimpanan otomatis lokal | Must Have |
| FR-11 | Ringkasan validasi jadwal | Must Have |
| FR-12 | Penyalinan sesi atau jadwal | Could Have |

---

## 5. Persyaratan Fungsional

### FR-01 — Pengaturan Ruang Kerja dan Jam Belajar

Pengguna dapat membuat konfigurasi ruang kerja untuk satu periode penyusunan jadwal.

Data ruang kerja meliputi:

- Nama ruang kerja atau sekolah.
- Label tahun ajaran atau semester, jika diperlukan.
- Hari pembelajaran.
- Jam mulai dan berakhir pembelajaran setiap hari.
- Interval snap grid untuk penempatan sesi.
- Periode istirahat atau rentang waktu yang tidak boleh digunakan untuk pembelajaran.

Ketentuan:

1. Sistem menggunakan format waktu 24 jam.
2. Hari pembelajaran dapat dikonfigurasi, termasuk pilihan hari Sabtu.
3. Jam operasional dapat berbeda antarhari.
4. Interval snap grid default adalah 15 menit dan dapat dikonfigurasi.
5. Durasi sesi dapat berbeda-beda.
6. Periode istirahat yang telah didefinisikan tidak boleh dianggap sebagai waktu belajar yang tersedia.

### FR-02 — Pengelolaan Data Master

Pengguna dapat menambah, mengubah, dan menghapus data berikut.

**A. Kelas**

- Nama kelas, misalnya VII-A.
- Tingkat kelas.
- Keterangan opsional.

**B. Guru**

- Nama guru.
- Keterangan opsional.
- Rentang waktu yang tidak tersedia, jika dikonfigurasi.

**C. Mata Pelajaran**

- Nama mata pelajaran.
- Keterangan opsional.

**D. Ruangan**

- Nama atau nomor ruangan.
- Jenis ruangan opsional, seperti ruang kelas atau laboratorium.
- Rentang waktu ketika ruangan tidak tersedia, jika dikonfigurasi.

**E. Kebutuhan Pembelajaran**

Kebutuhan pembelajaran menentukan berapa banyak sesi suatu mata pelajaran harus ditempatkan dalam satu minggu.

Atributnya meliputi:

- Kelas.
- Mata pelajaran.
- Jumlah sesi per minggu.
- Durasi setiap sesi.
- Guru default.
- Ruangan default atau kebutuhan ruangan.
- Keterangan opsional.

Satu kebutuhan pembelajaran dapat menghasilkan beberapa sesi yang perlu ditempatkan ke dalam jadwal.

Sesi individual dapat memiliki guru atau ruangan berbeda dari nilai default apabila diperlukan.

### FR-03 — Pemilihan Kelas Aktif

Pengguna harus memilih kelas sebelum masuk ke editor jadwal kelas tersebut.

Persyaratan:

1. Sistem menampilkan daftar kelas yang telah dibuat.
2. Pengguna dapat memilih kelas melalui selector yang mudah dijangkau.
3. Setelah kelas dipilih, editor menampilkan jadwal kelas tersebut.
4. Pengguna dapat berpindah ke kelas lain tanpa mengulang konfigurasi ruang kerja.
5. Perpindahan kelas tidak menghapus atau mengubah jadwal kelas sebelumnya.
6. Sistem tetap menyimpan data jadwal seluruh kelas sebagai dasar pemeriksaan konflik lintas kelas.

### FR-04 — Editor Jadwal Drag-and-Drop

Editor jadwal merupakan antarmuka utama aplikasi.

Editor dibagi menjadi tiga area.

**A. Panel sesi belum terjadwal**

Menampilkan sesi yang belum ditempatkan pada grid.

Setiap kartu pelajaran menampilkan minimal:

- Mata pelajaran.
- Kelas.
- Guru yang ditugaskan, jika sudah ditentukan.
- Durasi sesi.
- Ruangan yang dibutuhkan, jika berlaku.

**B. Grid jadwal**

Menampilkan jadwal kelas aktif berdasarkan hari dan rentang waktu aktual.

Persyaratan:

1. Pengguna dapat menarik kartu sesi dari panel ke grid.
2. Pengguna dapat memindahkan sesi dari satu waktu ke waktu lain.
3. Pengguna dapat mengubah hari atau waktu sesi tanpa membuat ulang data sesi.
4. Blok sesi harus menggambarkan durasi aktualnya.
5. Sistem memberikan pratinjau posisi sebelum sesi ditempatkan.
6. Pengguna dapat memilih sebuah sesi untuk melihat atau mengubah detailnya.
7. Sesi ditampilkan secara visual berdasarkan mata pelajaran atau atribut yang relevan.
8. Pengguna dapat membatalkan perubahan terakhir.
9. Sistem tidak boleh menganggap setiap sesi memiliki durasi yang sama.
10. Penempatan sesi di luar jam belajar atau pada waktu istirahat harus menghasilkan konflik atau peringatan yang sesuai.

**C. Panel detail dan validasi**

Ketika pengguna memilih sesi, sistem menampilkan:

- Mata pelajaran.
- Kelas.
- Guru.
- Ruangan.
- Hari.
- Waktu mulai.
- Waktu selesai.
- Durasi.
- Konflik atau peringatan yang terkait.

### FR-05 — Smart Conflict Detection

Sistem memeriksa konflik secara otomatis saat pengguna menambahkan, memindahkan, atau mengubah sesi.

Pemeriksaan menggunakan seluruh data sesi dalam ruang kerja, bukan hanya jadwal kelas aktif.

#### 5.1 Konflik kelas

Terjadi ketika kelas yang sama memiliki lebih dari satu sesi yang waktunya tumpang tindih.

#### 5.2 Konflik guru

Terjadi ketika guru yang sama ditugaskan mengajar lebih dari satu sesi pada waktu yang tumpang tindih, termasuk sesi yang berada di kelas berbeda.

#### 5.3 Konflik ruangan

Terjadi ketika ruangan yang sama digunakan oleh lebih dari satu sesi pada waktu yang tumpang tindih.

Pemeriksaan ini diterapkan pada ruangan yang memang ditugaskan untuk suatu sesi.

#### 5.4 Konflik ketersediaan

Terjadi ketika sesi ditempatkan pada rentang waktu yang telah ditandai tidak tersedia untuk guru atau ruangan yang bersangkutan.

#### 5.5 Konflik jam operasional

Terjadi ketika sesi berada di luar jam pembelajaran yang dikonfigurasi atau beririsan dengan periode istirahat yang ditandai sebagai waktu terlarang.

#### 5.6 Peringatan kelengkapan jadwal

Sistem memberi peringatan ketika:

- Kebutuhan sesi mingguan belum terpenuhi.
- Sesi belum memiliki guru yang diperlukan.
- Ruangan wajib belum ditentukan.
- Sebagian jadwal kelas dalam ruang kerja belum selesai.

Peringatan kelengkapan harus dibedakan dari bentrokan waktu.

#### 5.7 Aturan perhitungan interval

Sesi A dan sesi B mengalami konflik waktu jika:

`startA < endB AND startB < endA`

Dengan aturan tersebut, sesi yang selesai tepat ketika sesi lain dimulai tidak dianggap bertabrakan.

#### 5.8 Perilaku ketika konflik ditemukan

1. Sistem menandai sesi yang bermasalah dengan indikator visual yang jelas.
2. Sistem menambahkan informasi konflik ke daftar konflik.
3. Informasi konflik mencantumkan penyebab, hari, rentang waktu, serta sesi lain yang terlibat.
4. Pengguna dapat memilih konflik untuk menyorot sesi yang bersangkutan.
5. Pengguna dapat memperbaiki konflik langsung melalui editor.
6. Sistem menghitung ulang konflik setelah perubahan.
7. Sistem menyediakan undo untuk membatalkan perubahan yang menghasilkan susunan yang tidak diinginkan.

Untuk mendukung proses penyuntingan yang fleksibel, sesi yang menghasilkan konflik tetap dapat ditempatkan. Sistem tidak harus menolak penempatan tersebut, tetapi harus menampilkan konflik dengan jelas.

### FR-06 — Sesi yang Belum Terjadwal

Sistem menampilkan jumlah dan daftar sesi yang belum ditempatkan.

Persyaratan:

1. Sistem membandingkan jumlah sesi yang dibutuhkan dengan sesi yang telah dijadwalkan.
2. Pengguna dapat mengetahui kebutuhan sesi yang belum terpenuhi untuk kelas aktif.
3. Daftar dapat difilter berdasarkan mata pelajaran.
4. Pengguna dapat menarik sesi yang belum terjadwal ke grid.
5. Setelah sesi ditempatkan, jumlah sesi tersisa diperbarui secara otomatis.

### FR-07 — Undo dan Redo

Pengguna dapat membatalkan atau mengulangi perubahan jadwal yang sebelumnya dilakukan.

Perubahan yang dapat dibatalkan meliputi:

- Penambahan sesi.
- Pemindahan sesi.
- Perubahan hari atau waktu.
- Perubahan guru atau ruangan.
- Penghapusan sesi.

Setelah undo atau redo, sistem harus menghitung ulang hasil validasi.

### FR-08 — Ekspor PDF

Pengguna dapat mengekspor jadwal ke PDF tanpa mengirim data ke server.

Pilihan ekspor:

- Jadwal kelas aktif.
- Jadwal seluruh kelas dalam ruang kerja.

Untuk ekspor per kelas, dokumen minimal berisi:

- Nama sekolah atau ruang kerja, jika tersedia.
- Nama kelas.
- Label tahun ajaran atau semester, jika tersedia.
- Jadwal mingguan.
- Hari dan rentang waktu.
- Mata pelajaran.
- Guru.
- Ruangan, jika digunakan.
- Informasi konflik yang terkait, apabila terdapat konflik.

Untuk ekspor seluruh kelas, sistem dapat menyajikan jadwal secara terpisah per kelas serta ringkasan konflik ruang kerja.

Ketentuan teknis:

1. Orientasi landscape digunakan jika lebih sesuai dengan tata letak jadwal.
2. Isi dokumen tidak boleh terpotong secara tidak sengaja.
3. Sistem harus menyediakan layout yang cocok untuk pencetakan.
4. PDF harus dibuat dan diunduh langsung melalui browser.
5. Ekspor tetap dapat dilakukan jika konflik masih ada, tetapi dokumen harus memberi peringatan yang jelas.

### FR-09 — Ekspor Excel

Pengguna dapat mengekspor jadwal ke format `.xlsx` langsung melalui browser.

Pilihan ekspor:

- Jadwal kelas aktif.
- Jadwal seluruh kelas dalam ruang kerja.

Untuk ekspor satu kelas, workbook minimal memiliki worksheet jadwal dan worksheet konflik yang berkaitan jika diperlukan.

Untuk ekspor seluruh ruang kerja, workbook dapat memiliki worksheet berikut:

- `Jadwal`: data sesi yang telah dijadwalkan.
- `Rekap Guru`: ringkasan sesi dan beban mengajar per guru.
- `Rekap Ruangan`: ringkasan penggunaan ruangan.
- `Konflik`: daftar konflik yang ditemukan.

Kolom pada worksheet `Jadwal` minimal terdiri dari:

- Hari.
- Waktu mulai.
- Waktu selesai.
- Kelas.
- Mata pelajaran.
- Guru.
- Ruangan.
- Status validasi yang relevan.

Ketentuan teknis:

1. Data diekspor sebagai data spreadsheet yang dapat difilter dan diolah.
2. Format waktu konsisten menggunakan format 24 jam.
3. Nilai teks tidak boleh berubah menjadi formula spreadsheet secara tidak sengaja.
4. Ekspor tidak membutuhkan endpoint backend.
5. Sistem memberi peringatan jika jadwal yang diekspor masih mengandung konflik.

### FR-10 — Penyimpanan Otomatis Lokal

Sistem menyimpan perubahan ruang kerja di browser secara otomatis.

Persyaratan:

1. Perubahan penting disimpan tanpa pengguna harus menekan tombol simpan pada setiap tindakan.
2. Setelah halaman dibuka kembali pada browser dan profil yang sama, sistem mencoba memulihkan ruang kerja terakhir.
3. Sistem menampilkan indikator bahwa data sedang disimpan atau telah tersimpan.
4. Kegagalan penyimpanan lokal harus diberitahukan kepada pengguna.
5. Sistem tidak boleh menyatakan perubahan telah tersimpan jika operasi penyimpanan gagal.

Penyimpanan lokal bukan layanan backup. Penghapusan data situs, perubahan profil browser, atau perpindahan perangkat dapat menyebabkan data tidak lagi tersedia.

### FR-11 — Ringkasan Validasi

Sistem menyediakan ringkasan validasi untuk kelas aktif serta ruang kerja.

Informasi minimal:

- Jumlah sesi telah dijadwalkan.
- Jumlah sesi yang belum ditempatkan.
- Jumlah konflik aktif.
- Jumlah peringatan kelengkapan.
- Status validasi.

Status harus membedakan setidaknya:

1. **Konflik ditemukan:** ada satu atau lebih konflik pada data saat ini.
2. **Belum lengkap:** kebutuhan sesi atau informasi wajib belum terpenuhi.
3. **Tidak ada konflik terdeteksi pada data saat ini:** sistem tidak menemukan konflik berdasarkan sesi dan konfigurasi yang tersedia.
4. **Jadwal lengkap dan valid:** seluruh kebutuhan wajib pada ruang kerja telah terpenuhi dan tidak ada konflik yang terdeteksi.

Sistem tidak boleh menyatakan seluruh sekolah bebas konflik jika jadwal masih belum lengkap atau informasi yang diperlukan belum tersedia.

### FR-12 — Penyalinan Jadwal

Sebagai fitur tambahan, pengguna dapat menyalin sesi atau susunan jadwal ke kelas lain.

Jika diterapkan, sistem harus:

- Menyalin data sebagai sesi baru, bukan menggunakan identitas sesi yang sama.
- Meminta pengguna memeriksa guru dan ruangan untuk kelas tujuan.
- Menjalankan ulang conflict detection setelah penyalinan.
- Memperlihatkan konflik baru yang dihasilkan.

Fitur ini bukan prasyarat peluncuran MVP.

---

## 6. Alur Penggunaan Utama

### 6.1 Alur Pertama Kali

1. Pengguna membuka aplikasi tanpa login.
2. Pengguna membuat ruang kerja.
3. Pengguna mengatur hari, jam belajar, dan istirahat.
4. Pengguna memasukkan data kelas, guru, mata pelajaran, dan ruangan.
5. Pengguna mendefinisikan kebutuhan sesi mingguan.
6. Pengguna memilih satu kelas.
7. Sistem membuka editor jadwal kelas tersebut.
8. Pengguna menyusun jadwal melalui drag-and-drop.
9. Sistem memeriksa konflik lintas kelas secara otomatis.
10. Pengguna memperbaiki konflik dan melengkapi sesi yang belum dijadwalkan.
11. Pengguna mengekspor hasil ke PDF atau Excel.

### 6.2 Alur Menyunting Jadwal

1. Pengguna memilih kelas yang ingin disunting.
2. Sistem memuat jadwal kelas aktif.
3. Pengguna memindahkan atau mengubah sesi.
4. Sistem menghitung ulang konflik pada ruang kerja.
5. Jika konflik ditemukan, sistem menjelaskan penyebabnya.
6. Pengguna memilih konflik untuk melihat sesi yang terkait.
7. Pengguna memperbaiki jadwal.
8. Sistem memperbarui status validasi dan menyimpan perubahan secara lokal.

### 6.3 Alur Ekspor

1. Pengguna memilih menu ekspor.
2. Pengguna menentukan cakupan: kelas aktif atau seluruh ruang kerja.
3. Pengguna memilih PDF atau Excel.
4. Sistem menampilkan ringkasan cakupan dan peringatan konflik jika ada.
5. Sistem memproses berkas pada browser.
6. Browser mengunduh berkas yang dihasilkan.

---

## 7. Persyaratan UX dan UI

### 7.1 Struktur Halaman

MVP terdiri dari halaman atau area berikut:

1. **Ruang Kerja:** membuat atau membuka ruang kerja lokal.
2. **Pengaturan:** mengatur hari, jam belajar, dan periode istirahat.
3. **Data Master:** mengelola kelas, guru, mata pelajaran, ruangan, dan kebutuhan sesi.
4. **Pemilihan Kelas:** memilih kelas aktif sebelum menyunting jadwal.
5. **Editor Jadwal:** grid mingguan, daftar sesi belum terjadwal, dan panel detail.
6. **Panel Konflik:** menampilkan konflik dan peringatan yang dapat difokuskan dari editor.
7. **Dialog Ekspor:** memilih PDF atau Excel serta cakupan ekspor.

### 7.2 Prinsip Visual

- Antarmuka menggunakan bahasa Indonesia.
- Grid waktu harus mudah dibaca dan tidak terlalu padat.
- Warna dapat digunakan untuk membedakan mata pelajaran.
- Konflik harus memiliki indikator yang tidak bergantung pada warna saja, misalnya ikon dan teks.
- Pengguna harus dapat memahami penyebab konflik tanpa membuka dokumentasi.
- Kontrol untuk memilih kelas dan mengekspor hasil harus mudah ditemukan.
- Pengguna tidak perlu berpindah halaman berulang kali hanya untuk memindahkan sesi.
- Desain mengutamakan penggunaan desktop, dengan dukungan tampilan responsif untuk ukuran layar lebih kecil.

### 7.3 Aksesibilitas Interaksi

- Interaksi drag-and-drop perlu menyediakan alternatif interaksi melalui kontrol atau keyboard sejauh memungkinkan.
- Informasi konflik harus disertai teks penjelasan.
- Elemen interaktif memiliki status fokus yang terlihat.
- Warna indikator harus memiliki kontras yang memadai.

---

## 8. Model Data Konseptual

### 8.1 Workspace

Mewakili seluruh data jadwal lokal.

Atribut utama:

- `id`
- `name`
- `academicPeriod`
- `schoolDays`
- `createdAt`
- `updatedAt`

### 8.2 ScheduleConfiguration

Menyimpan konfigurasi waktu:

- `workspaceId`
- `dayOfWeek`
- `startTime`
- `endTime`
- `snapIntervalMinutes`
- `breakIntervals`

### 8.3 ClassGroup

Mewakili kelas pembelajaran.

- `id`
- `workspaceId`
- `name`
- `grade`

### 8.4 Teacher

Mewakili guru.

- `id`
- `workspaceId`
- `name`
- `unavailableIntervals`

### 8.5 Subject

Mewakili mata pelajaran.

- `id`
- `workspaceId`
- `name`

### 8.6 Room

Mewakili ruangan.

- `id`
- `workspaceId`
- `name`
- `type`
- `unavailableIntervals`

### 8.7 TeachingRequirement

Mewakili kebutuhan sesi pembelajaran mingguan.

- `id`
- `classId`
- `subjectId`
- `defaultTeacherId`
- `defaultRoomId`
- `sessionsPerWeek`
- `durationMinutes`
- `roomRequired`

### 8.8 TimetableSession

Mewakili satu sesi yang dapat ditempatkan pada grid.

- `id`
- `requirementId`
- `classId`
- `subjectId`
- `teacherId`
- `roomId`
- `dayOfWeek`
- `startTime`
- `endTime`

### 8.9 Conflict

Konflik dihitung dari data sesi dan konfigurasi yang ada, bukan menjadi sumber data utama yang diedit secara manual.

Atribut hasil pemeriksaan dapat berupa:

- `conflictType`
- `severity`
- `affectedSessionIds`
- `dayOfWeek`
- `startTime`
- `endTime`
- `description`

Hasil validasi harus dihitung ulang ketika jadwal atau konfigurasi yang terkait berubah.

---

## 9. Arsitektur dan Batasan Teknis

### 9.1 Pendekatan Arsitektur

Aplikasi menggunakan arsitektur client-side-first. Tidak ada backend aplikasi yang diperlukan untuk MVP.

Semua komponen berikut berjalan pada browser:

- Pengelolaan ruang kerja.
- Pengelolaan data master.
- Editor drag-and-drop.
- Conflict detection.
- Validasi kebutuhan sesi.
- Penyimpanan data lokal.
- Pembuatan PDF.
- Pembuatan Excel.

### 9.2 Rekomendasi Tech Stack

| Bagian | Rekomendasi |
|---|---|
| Framework | React |
| Bahasa | TypeScript |
| Build tool | Vite |
| Drag-and-drop | dnd-kit |
| Styling | Tailwind CSS |
| Komponen UI | shadcn/ui |
| Penyimpanan lokal | IndexedDB |
| Abstraksi IndexedDB | Dexie.js, jika diperlukan |
| Ekspor Excel | SheetJS |
| Ekspor PDF | jsPDF atau pustaka PDF sisi klien yang sesuai |

Pilihan pustaka merupakan rekomendasi implementasi dan tidak mengubah persyaratan produk.

### 9.3 Tidak Ada Backend

MVP tidak memerlukan:

- REST API atau GraphQL API.
- Server untuk menjalankan conflict detection.
- Database server.
- Authentication provider.
- Layanan ekspor berkas di server.

Saat produk dihosting sebagai aplikasi web statis, server hanya digunakan untuk menyajikan aset aplikasi. Data jadwal tidak dikirim ke server tersebut sebagai bagian dari fungsi normal aplikasi.

### 9.4 Penyimpanan Data

IndexedDB digunakan untuk menyimpan ruang kerja agar kapasitas dan struktur data lebih sesuai daripada penyimpanan key-value sederhana.

Sistem harus menangani kondisi ketika penyimpanan lokal tidak tersedia atau gagal.

Karena tidak terdapat akun maupun sinkronisasi, data hanya tersedia dalam lingkungan browser tempat data itu disimpan.

### 9.5 Pemrosesan Ekspor

PDF dan Excel dibangun dari state atau data lokal yang sedang digunakan aplikasi.

Batasan:

- Berkas harus dibuat di browser.
- Data jadwal tidak boleh diunggah untuk menghasilkan berkas.
- Aplikasi tidak memerlukan endpoint ekspor.
- Kegagalan pembuatan berkas harus ditampilkan dengan jelas.
- Ekspor tidak boleh mengubah data jadwal sumber.

---

## 10. Persyaratan Non-Fungsional

### NFR-01 — Kinerja

- Penyuntingan sesi harus terasa responsif.
- Untuk ruang kerja uji berisi hingga 1.000 sesi, target internal adalah pembaruan hasil konflik dalam 300 ms pada perangkat desktop yang wajar.
- Proses pembuatan berkas tidak boleh menyebabkan tampilan menjadi tidak responsif secara berlebihan.
- Pengukuran kinerja dilakukan melalui pengujian, bukan dianggap terpenuhi hanya berdasarkan rancangan.

### NFR-02 — Keandalan Data

- Perubahan harus disimpan setelah proses penyimpanan berhasil.
- Perhitungan konflik tidak boleh mengubah data sesi.
- Undo dan redo harus mengembalikan kondisi jadwal secara konsisten.
- Konflik yang ditampilkan harus sesuai dengan data jadwal terkini.

### NFR-03 — Privasi

- Tidak ada autentikasi atau profil pengguna.
- Data jadwal harus diproses secara lokal.
- Ekspor PDF dan Excel tidak boleh mengirim data ke server.
- Aplikasi tidak boleh mengirim data jadwal ke layanan analitik eksternal.
- Pengguna diberi tahu bahwa data lokal dapat hilang jika penyimpanan browser dihapus.

### NFR-04 — Kompatibilitas

MVP menargetkan browser desktop modern berbasis Chromium, Firefox, dan Safari yang mendukung API yang diperlukan.

Perilaku fitur utama harus diuji pada browser yang dinyatakan didukung.

### NFR-05 — Pemeliharaan

- Conflict engine harus dipisahkan dari komponen UI.
- Aturan interval waktu harus memiliki unit test.
- Proses ekspor harus dipisahkan dari logika penyusunan jadwal.
- Validasi harus memiliki pengujian untuk konflik lintas kelas, guru, dan ruangan.
- Model data harus mendukung perubahan sesi tanpa bergantung pada struktur visual grid.

### NFR-06 — Ketahanan UI

- Kesalahan input tidak boleh menyebabkan seluruh editor gagal.
- Kegagalan penyimpanan lokal harus ditampilkan.
- Kesalahan ekspor harus menghasilkan umpan balik yang bisa dipahami.
- Konflik harus tetap terlihat setelah pengguna memindahkan fokus ke sesi lain.

---

## 11. Indikator Keberhasilan Produk

MVP dianggap berhasil jika:

1. Pengguna dapat membuat ruang kerja dan menyusun jadwal tanpa melakukan autentikasi.
2. Pengguna dapat memilih satu kelas dan mengatur jadwalnya melalui drag-and-drop.
3. Perubahan pada satu kelas dapat memicu pemeriksaan konflik terhadap kelas lain.
4. Conflict engine mendeteksi konflik guru, kelas, dan ruangan berdasarkan interval waktu yang tumpang tindih.
5. Sistem membedakan bentrokan aktual dari kebutuhan sesi yang belum terpenuhi.
6. Pengguna dapat menemukan dan memperbaiki konflik melalui informasi yang disediakan aplikasi.
7. Pengguna dapat mengunduh PDF dan Excel tanpa mengirim data jadwal ke backend.
8. Perubahan jadwal dapat dipulihkan dari penyimpanan lokal ketika browser dan profil yang sama dibuka kembali.
9. Ekspor menampilkan peringatan jika jadwal masih memiliki konflik.
10. Pengujian membuktikan bahwa jadwal yang berurutan tanpa irisan waktu tidak salah ditandai sebagai konflik.

---

## 12. Acceptance Criteria

### AC-01 — Pemilihan Kelas

**Given** pengguna telah membuat beberapa kelas,  
**When** pengguna memilih salah satu kelas,  
**Then** editor menampilkan jadwal kelas tersebut dan tidak mengubah jadwal kelas lain.

### AC-02 — Menambahkan Sesi

**Given** terdapat sesi yang belum ditempatkan,  
**When** pengguna menarik sesi ke grid,  
**Then** sesi ditempatkan pada waktu yang dipilih dan conflict engine diperbarui.

### AC-03 — Konflik Guru Lintas Kelas

**Given** guru yang sama sudah ditugaskan mengajar kelas VIII-A pukul 08.00–09.00,  
**When** pengguna menempatkan sesi kelas VII-A dengan guru tersebut pukul 08.30–09.30,  
**Then** sistem mendeteksi konflik guru dan menunjukkan kedua sesi yang terlibat.

### AC-04 — Durasi Berbeda

**Given** dua sesi memiliki durasi yang berbeda,  
**When** interval waktunya saling tumpang tindih,  
**Then** conflict engine tetap mendeteksi konflik.

### AC-05 — Sesi Berurutan

**Given** satu sesi berakhir pukul 09.00 dan sesi lain dimulai pukul 09.00,  
**When** sistem melakukan validasi,  
**Then** keduanya tidak dianggap bertabrakan hanya karena berbatasan waktu.

### AC-06 — Konflik Ruangan

**Given** ruangan yang sama telah digunakan pada waktu tertentu,  
**When** sesi lain dijadwalkan menggunakan ruangan tersebut pada interval yang tumpang tindih,  
**Then** sistem menampilkan konflik ruangan.

### AC-07 — Konflik yang Diperbaiki

**Given** terdapat konflik aktif,  
**When** pengguna memindahkan salah satu sesi ke waktu yang tidak berkonflik,  
**Then** sistem menghitung ulang validasi dan menghapus konflik yang telah terselesaikan.

### AC-08 — Jadwal Belum Lengkap

**Given** suatu kebutuhan mata pelajaran membutuhkan lima sesi per minggu,  
**When** baru tiga sesi telah ditempatkan,  
**Then** sistem menunjukkan bahwa dua sesi masih belum terjadwal.

### AC-09 — Ekspor PDF

**Given** ruang kerja memiliki jadwal,  
**When** pengguna memilih ekspor PDF,  
**Then** browser menghasilkan berkas PDF berisi cakupan jadwal yang dipilih tanpa mengirim data jadwal ke server.

### AC-10 — Ekspor Excel

**Given** ruang kerja memiliki jadwal,  
**When** pengguna memilih ekspor Excel,  
**Then** browser menghasilkan berkas `.xlsx` dengan worksheet dan kolom yang ditentukan dalam persyaratan ekspor.

### AC-11 — Ekspor dengan Konflik

**Given** jadwal masih mengandung konflik,  
**When** pengguna memilih ekspor,  
**Then** sistem memberikan peringatan sebelum atau saat proses ekspor dan menyertakan status konflik sesuai cakupan ekspor.

### AC-12 — Penyimpanan Lokal

**Given** penyimpanan lokal berfungsi,  
**When** pengguna mengubah jadwal lalu membuka kembali aplikasi pada browser dan profil yang sama,  
**Then** sistem memulihkan perubahan yang telah berhasil disimpan.

### AC-13 — Validasi Tidak Lengkap

**Given** belum semua kebutuhan sesi di seluruh ruang kerja terpenuhi,  
**When** tidak terdapat konflik pada sesi yang sudah ditempatkan,  
**Then** sistem tidak menyatakan seluruh jadwal lengkap dan valid.

---

## 13. Risiko dan Mitigasi

### 13.1 Kehilangan Data Lokal

**Risiko:** Data hilang ketika data situs dihapus atau pengguna berpindah perangkat.

**Mitigasi:** Gunakan IndexedDB, indikator penyimpanan, penanganan kegagalan penyimpanan, dan dokumentasikan batasan penyimpanan lokal. Mekanisme backup/restore dapat dipertimbangkan untuk versi selanjutnya.

### 13.2 Konflik Lintas Kelas Tidak Terlihat

**Risiko:** Pengguna mengira jadwal kelas aktif sudah valid, padahal guru yang sama mengajar di kelas lain pada waktu tersebut.

**Mitigasi:** Conflict engine selalu memeriksa seluruh sesi dalam ruang kerja dan menunjukkan kelas lain yang terkait.

### 13.3 Status Validasi Menyesatkan

**Risiko:** Sistem menyatakan jadwal bebas konflik meskipun beberapa sesi belum dijadwalkan.

**Mitigasi:** Pisahkan status konflik dari status kelengkapan jadwal dan tampilkan peringatan untuk data yang belum lengkap.

### 13.4 Ekspor Sulit Dibaca

**Risiko:** Jadwal seluruh sekolah menghasilkan dokumen yang terlalu padat.

**Mitigasi:** Sediakan ekspor per kelas sebagai pilihan utama, gunakan pemisahan halaman yang tepat, dan pisahkan data terstruktur dalam worksheet Excel.

### 13.5 Keterbatasan Tanpa Autentikasi

**Risiko:** Orang lain yang menggunakan browser dan profil yang sama dapat mengakses data lokal.

**Mitigasi:** Nyatakan bahwa aplikasi tidak menyediakan isolasi data berdasarkan pengguna dan tidak dirancang untuk penggunaan kolaboratif dengan data terpusat.

---

## 14. Rencana Pengembangan MVP

### Tahap 1 — Fondasi

- Membuat struktur aplikasi.
- Menentukan model data ruang kerja.
- Mengimplementasikan penyimpanan lokal.
- Membuat konfigurasi hari dan jam belajar.
- Mengimplementasikan pengelolaan data master.

### Tahap 2 — Editor Jadwal

- Membuat pemilihan kelas.
- Membuat grid waktu berdasarkan interval aktual.
- Mengimplementasikan kartu sesi pembelajaran.
- Mengimplementasikan drag-and-drop.
- Membuat daftar sesi belum terjadwal.

### Tahap 3 — Smart Conflict Detection

- Mengimplementasikan konflik kelas.
- Mengimplementasikan konflik guru lintas kelas.
- Mengimplementasikan konflik ruangan.
- Mengimplementasikan pemeriksaan ketersediaan dan jam belajar.
- Menampilkan daftar konflik dan sesi terkait.
- Mengimplementasikan perhitungan ulang setelah perubahan.
- Menambahkan unit test untuk aturan interval waktu.

### Tahap 4 — Ekspor

- Membuat ekspor PDF.
- Membuat ekspor Excel.
- Memasukkan informasi konflik ke hasil ekspor.
- Menguji layout PDF dan struktur worksheet.

### Tahap 5 — Pengujian dan Penyempurnaan

- Menguji alur utama.
- Menguji konflik dengan durasi yang berbeda.
- Menguji penyimpanan dan pemulihan lokal.
- Menguji kondisi ekspor ketika jadwal belum lengkap.
- Menguji kinerja dengan data uji yang cukup besar.
- Memperbaiki aksesibilitas dan responsivitas UI.

---

## 15. Kriteria Selesai MVP

MVP dinyatakan siap ketika seluruh kondisi berikut terpenuhi:

- Pengguna dapat menggunakan aplikasi tanpa login.
- Data master dan kebutuhan pembelajaran dapat diatur.
- Pengguna memilih kelas untuk membuka editor.
- Drag-and-drop berjalan dengan baik.
- Conflict engine mendeteksi konflik lintas kelas dan berdasarkan interval waktu.
- Pesan konflik dapat membantu pengguna mengidentifikasi sumber masalah.
- Status konflik dan kelengkapan jadwal tidak membingungkan pengguna.
- Data dapat disimpan dan dipulihkan dari browser yang sama.
- Ekspor PDF dan Excel berjalan sepenuhnya di browser.
- Konflik tetap diinformasikan pada jadwal yang diekspor.
- Tidak ada kebutuhan backend yang tersisa untuk fungsi inti MVP.
- Pengujian fungsional, unit test conflict engine, dan pengujian ekspor telah lulus.

---

## 16. Keputusan Produk yang Ditetapkan

| Aspek | Keputusan |
|---|---|
| Nama produk / proyek | Schedovyn |
| Konsep utama | Smart Timetable Planner |
| Fokus produk | Smart Conflict Detection |
| Pengalaman penyusunan | Drag-and-drop |
| Pola penyuntingan | Satu kelas aktif pada satu waktu |
| Ruang lingkup pemeriksaan | Seluruh kelas dalam ruang kerja |
| Model waktu | Rentang waktu aktual dengan durasi sesi yang dapat berbeda |
| Autentikasi | Tidak ada |
| Backend | Tidak diperlukan untuk MVP |
| Penyimpanan | Lokal di browser |
| Ekspor | PDF dan Excel |
| Pemrosesan ekspor | Sepenuhnya di browser |
| Auto-scheduling | Di luar ruang lingkup MVP |
| Sinkronisasi cloud | Di luar ruang lingkup MVP |
| Kolaborasi real-time | Di luar ruang lingkup MVP |

## 17. Kesimpulan

Schedovyn dibangun untuk menyelesaikan satu masalah secara spesifik: membantu pengguna menyusun jadwal pembelajaran dan menemukan konflik sebelum jadwal digunakan.

Keunggulan utamanya bukan jumlah fitur, melainkan kombinasi editor jadwal visual, conflict detection lintas kelas, penjelasan konflik yang mudah dipahami, dan ekspor langsung dari browser.

Dengan meniadakan autentikasi, backend, dan sinkronisasi cloud, MVP dapat berfokus pada kualitas pengalaman penyusunan jadwal dan ketepatan aturan validasinya.

PRD ini menjadi dasar untuk tahap berikutnya, yaitu Technical Design Document, desain database lokal, kontrak modul conflict engine, serta wireframe halaman aplikasi.