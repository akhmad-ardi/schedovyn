---
product: "Schedovyn — Smart Timetable Planner"
version: "1.0.0"
style: "radix-lyra"
base: "radix"
tailwind: "v4"
css_entry: "src/index.css"
language: "id-ID"
dials:
  energy: 1
  rhythm: 2
  motion: 1
fonts:
  sans: "'Inter Variable', sans-serif"
  heading: "'Figtree Variable', sans-serif"
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
colors:
  light:
    background: "oklch(1 0 0)"
    foreground: "oklch(0.141 0.005 285.823)"
    card: "oklch(1 0 0)"
    card_foreground: "oklch(0.141 0.005 285.823)"
    popover: "oklch(1 0 0)"
    popover_foreground: "oklch(0.141 0.005 285.823)"
    primary: "oklch(0.488 0.243 264.376)"
    primary_foreground: "oklch(0.97 0.014 254.604)"
    secondary: "oklch(0.967 0.001 286.375)"
    secondary_foreground: "oklch(0.21 0.006 285.885)"
    muted: "oklch(0.967 0.001 286.375)"
    muted_foreground: "oklch(0.552 0.016 285.938)"
    accent: "oklch(0.967 0.001 286.375)"
    accent_foreground: "oklch(0.21 0.006 285.885)"
    destructive: "oklch(0.577 0.245 27.325)"
    border: "oklch(0.92 0.004 286.32)"
    input: "oklch(0.92 0.004 286.32)"
    ring: "oklch(0.705 0.015 286.067)"
  dark:
    background: "oklch(0.141 0.005 285.823)"
    foreground: "oklch(0.985 0 0)"
    card: "oklch(0.21 0.006 285.885)"
    card_foreground: "oklch(0.985 0 0)"
    popover: "oklch(0.21 0.006 285.885)"
    popover_foreground: "oklch(0.985 0 0)"
    primary: "oklch(0.424 0.199 265.638)"
    primary_foreground: "oklch(0.97 0.014 254.604)"
    secondary: "oklch(0.274 0.006 286.033)"
    secondary_foreground: "oklch(0.985 0 0)"
    muted: "oklch(0.274 0.006 286.033)"
    muted_foreground: "oklch(0.705 0.015 286.067)"
    accent: "oklch(0.274 0.006 286.033)"
    accent_foreground: "oklch(0.985 0 0)"
    destructive: "oklch(0.704 0.191 22.216)"
    border: "oklch(1 0 0 / 10%)"
    input: "oklch(1 0 0 / 15%)"
    ring: "oklch(0.552 0.016 285.938)"
geometry:
  component_radius: "0px (rounded-none — radix-lyra sharp architectural style)"
  control_height_default: "32px (h-8)"
  control_height_sm: "28px (h-7)"
  control_height_xs: "24px (h-6)"
  control_height_lg: "36px (h-9)"
  grid_pixels_per_minute: 1.6
---

# DESIGN.md — Sistem Desain & Panduan Antarmuka Schedovyn

Dokumen ini adalah sumber kebenaran desain (*Single Source of Truth*) bagi **Frontend Engineer** dalam membangun seluruh komponen, halaman, dan interaksi visual **Schedovyn** (*Smart Timetable Planner*). Seluruh spesifikasi di bawah ini diturunkan langsung dari kode fondasi yang sudah terpasang di [`src/index.css`](src/index.css), [`components.json`](components.json), [`src/components/ui/`](src/components/ui/), [`src/components/theme-provider.tsx`](src/components/theme-provider.tsx), serta kontrak produk pada [`docs/Schedovyn-PRD.md`](docs/Schedovyn-PRD.md) dan [`docs/Schedovyn-TDD.md`](docs/Schedovyn-TDD.md).

---

## 1. Identitas Visual & Filosofi Desain

### 1.1 Design Read & Liveliness Dials
> **Reading this as:** Aplikasi kerja penyusunan jadwal sekolah (*Desktop-First Smart Timetable Planner*) untuk admin kurikulum dan guru, dalam bahasa visual **Architectural Technical Grid (`radix-lyra`)**, dengan setelan dial **ENERGY 1 (Calm & Focused) / RHYTHM 2 (Structured Workbench) / MOTION 1 (Functional Feedback Only)**.

- **Mengapa `radix-lyra` (Sharp / `rounded-none` + `text-xs`)?**
  Jadwal pembelajaran sekolah adalah matriks waktu yang padat informasi. Komponen primitif di `src/components/ui/` telah dikonfigurasi menggunakan preset **`radix-lyra`**: sudut tajam (`rounded-none`), batas garis tipis (`border` / `ring-1 ring-foreground/10`), tinggi kontrol ringkas (`h-8` / `32px`), dan ukuran teks dasar `text-xs` (`12px`). Sudut tajam memastikan blok sesi pelajaran yang berbatasan tepat (misalnya `08:00–09:00` dan `09:00–10:00`) menyatu secara presisi pada garis waktu tanpa celah visual yang membingungkan.
- **Satu Titik Fokus per Layar (*One Focal Point*):**
  Pada halaman utama (`EditorPage`), fokus utama adalah **Grid Jadwal Mingguan** dan sinyal **Deteksi Konflik**. Chrome aplikasi (header, toolbar, sidebar) menggunakan warna netral (`zinc`) agar warna mata pelajaran dan penanda konflik merah/kuning langsung tertangkap mata.
- **Motif Identitas (*Identity Motif*):**
  Garis batas presisi `1px` (`border-border`), indikator jam dengan `tabular-nums`, dan lencana multi-isyarat (*warna + ikon + label teks Bahasa Indonesia*) yang membedakan jadwal valid, belum lengkap, dan berkonflik.

---

## 2. Token Warna & Tema (`src/index.css`)

Sistem warna menggunakan ruang warna **OKLCH** dengan basis netral **Zinc** (`hue ~286`) dan aksen utama **Indigo-Blue** (`hue ~264`), serta dukungan penuh mode Terang (`:root`) dan Gelap (`.dark`) yang dikelola oleh [`ThemeProvider`](src/components/theme-provider.tsx) (termasuk pintasan keyboard huruf `D` saat fokus berada di luar elemen input).

### 2.1 Token Semantik Inti (Sudah Terpasang di `src/index.css`)

| Token CSS / Utility Tailwind | Nilai Light (`:root`) | Nilai Dark (`.dark`) | Fungsi & Penggunaan Wajib |
|---|---|---|---|
| `bg-background` / `text-foreground` | `oklch(1 0 0)` / `oklch(0.141 0.005 285.823)` | `oklch(0.141 0.005 285.823)` / `oklch(0.985 0 0)` | Kanvas utama halaman dan warna teks primer (kontras > 15:1, lulus WCAG AAA). |
| `bg-card` / `text-card-foreground` | `oklch(1 0 0)` | `oklch(0.21 0.006 285.885)` | Permukaan kartu sesi, panel inspektor, dan kontainer tabel master data. |
| `bg-popover` / `text-popover-foreground` | `oklch(1 0 0)` | `oklch(0.21 0.006 285.885)` | Menu dropdown, select, popover, dan dialog modal. |
| `bg-primary` / `text-primary-foreground` | `oklch(0.488 0.243 264.376)` / `oklch(0.97 0.014 254.604)` | `oklch(0.424 0.199 265.638)` / `oklch(0.97 0.014 254.604)` | Tombol aksi utama (Simpan, Tambah Entitas, Ekspor Jadwal), indikator tab aktif, dan sorotan dropzone aktif. |
| `bg-secondary` / `text-secondary-foreground` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` | Tombol sekunder, badge informasi netral, dan header kelompok. |
| `bg-muted` / `text-muted-foreground` | `oklch(0.967 0.001 286.375)` / `oklch(0.552 0.016 285.938)` | `oklch(0.274 0.006 286.033)` / `oklch(0.705 0.015 286.067)` | Latar belakang arsir waktu istirahat/non-operasional, header tabel, teks keterangan sekunder, dan label jam. |
| `bg-accent` / `text-accent-foreground` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` | Status *hover* dan *focus* pada item `Select`, `DropdownMenu`, dan baris tabel. |
| `text-destructive` / `bg-destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | **Khusus sinyal Konflik Waktu (`severity: "error"`)**, kegagalan penyimpanan IndexedDB, dan aksi hapus permanen. |
| `border-border` / `border-input` | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 10%)` / `15%` | Garis grid waktu, pembatas antar-panel, dan bingkai kontrol formulir. |
| `ring-ring` | `oklch(0.705 0.015 286.067)` | `oklch(0.552 0.016 286.067)` | Cincin fokus aksesibilitas keyboard (`focus-visible:ring-1`). |

### 2.2 Matriks Warna Status Validasi & Konflik (FR-05 & FR-11)

Sesuai prinsip **Transparent Validation**, dilarang mencampuradukkan warna antara **Konflik Waktu** dan **Jadwal Belum Lengkap**:

| Status Validasi (`ValidationStatus`) | Label UI Wajib (Bahasa Indonesia) | Ikon (`lucide-react`) | Kelas Gaya Visual (Light & Dark) |
|---|---|---|---|
| `CONFLICT_DETECTED` | **Konflik ditemukan** | `AlertTriangleIcon` | `border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20` |
| `INCOMPLETE` | **Belum lengkap** | `ClockAlertIcon` / `AlertCircleIcon` | `border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300` |
| `NO_CONFLICT_CURRENT_DATA` | **Tidak ada konflik terdeteksi pada data saat ini** | `InfoIcon` | `border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300` |
| `COMPLETE_AND_VALID` | **Jadwal lengkap dan valid** | `CheckCircle2Icon` | `border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300` |

### 2.3 Palet Warna Mata Pelajaran (`SubjectColorKey`)

Sesuai kontrak `SubjectColorKey` di [`docs/Schedovyn-TDD.md`](docs/Schedovyn-TDD.md#L184-L195), terdapat 10 kunci warna mata pelajaran. Agar kontras teks memenuhi standar WCAG AA (`>= 4.5:1`) di mode terang maupun gelap dan **tidak bertabrakan dengan warna merah konflik (`destructive`)**, gunakan pemetaan kelas statis berikut pada utilitas warna mapel:

| `SubjectColorKey` | Kelas Blok Sesi Normal (Light & Dark) | Indikator Warna / Badge |
|---|---|---|
| `"blue"` | `bg-blue-500/10 border-blue-500/30 text-blue-950 dark:bg-blue-500/15 dark:border-blue-400/30 dark:text-blue-100` | `bg-blue-600 dark:bg-blue-400` |
| `"emerald"` | `bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:bg-emerald-500/15 dark:border-emerald-400/30 dark:text-emerald-100` | `bg-emerald-600 dark:bg-emerald-400` |
| `"amber"` | `bg-amber-500/10 border-amber-500/30 text-amber-950 dark:bg-amber-500/15 dark:border-amber-400/30 dark:text-amber-100` | `bg-amber-600 dark:bg-amber-400` |
| `"rose"` | `bg-rose-500/10 border-rose-500/30 text-rose-950 dark:bg-rose-500/15 dark:border-rose-400/30 dark:text-rose-100` | `bg-rose-600 dark:bg-rose-400` |
| `"violet"` | `bg-violet-500/10 border-violet-500/30 text-violet-950 dark:bg-violet-500/15 dark:border-violet-400/30 dark:text-violet-100` | `bg-violet-600 dark:bg-violet-400` |
| `"cyan"` | `bg-cyan-500/10 border-cyan-500/30 text-cyan-950 dark:bg-cyan-500/15 dark:border-cyan-400/30 dark:text-cyan-100` | `bg-cyan-600 dark:bg-cyan-400` |
| `"orange"` | `bg-orange-500/10 border-orange-500/30 text-orange-950 dark:bg-orange-500/15 dark:border-orange-400/30 dark:text-orange-100` | `bg-orange-600 dark:bg-orange-400` |
| `"teal"` | `bg-teal-500/10 border-teal-500/30 text-teal-950 dark:bg-teal-500/15 dark:border-teal-400/30 dark:text-teal-100` | `bg-teal-600 dark:bg-teal-400` |
| `"indigo"` | `bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:bg-indigo-500/15 dark:border-indigo-400/30 dark:text-indigo-100` | `bg-indigo-600 dark:bg-indigo-400` |
| `"slate"` | `bg-slate-500/10 border-slate-500/30 text-slate-950 dark:bg-slate-500/15 dark:border-slate-400/30 dark:text-slate-100` | `bg-slate-600 dark:bg-slate-400` |

> **Aturan Override Konflik pada Blok Sesi:** Jika sebuah `TimetableSession` memiliki minimal 1 konflik aktif di `conflictsBySessionId[session.id]`, bingkai blok sesi **wajib** diganti menjadi `border-2 border-destructive bg-destructive/10 dark:bg-destructive/20` dengan tetap menampilkan titik/indikator kecil warna mata pelajaran asli dan lencana peringatan `[!] Konflik` beserta ikon `AlertTriangleIcon`.

---

## 3. Tipografi & Hierarki Teks

Dua font variabel sudah diimpor secara lokal di [`src/index.css`](src/index.css#L4-L5) dan dipetakan pada `@theme inline`:

1. **Font Heading (`font-heading` — `'Figtree Variable', sans-serif`):**
   - Digunakan untuk judul halaman, nama sekolah/ruang kerja di header, `CardTitle`, `DialogTitle`, `AlertDialogTitle`, dan header kolom hari pada grid jadwal.
   - Memberikan karakter geometris yang ramah namun tegas sebagai penyeimbang grid yang kaku.
2. **Font Body & Kontrol (`font-sans` — `'Inter Variable', sans-serif`):**
   - Dipasang sebagai default pada elemen `html` (`@apply font-sans`).
   - Digunakan untuk seluruh isi tabel, kontrol input, tombol, daftar sesi, dan deskripsi konflik karena keterbacaannya sangat tinggi pada ukuran kecil (`11px`–`13px`).
3. **Angka Waktu & Durasi (`tabular-nums`):**
   - **WAJIB** menambahkan kelas `tabular-nums` pada setiap elemen yang menampilkan waktu `HH:mm` (seperti `"07:30 - 09:00"`), durasi menit (`"90 mnt"`), dan penghitung sesi (`"2/4 sesi"`) agar digit angka sejajar secara vertikal di dalam grid dan tabel.

### Skala Tipografi Aplikasi Kerja (`radix-lyra` Scale)

| Peran Elemen | Kelas Tailwind | Ukuran / Line-Height | Catatan Penggunaan |
|---|---|---|---|
| **Judul Halaman / Nama Sekolah** | `font-heading text-base font-semibold tracking-tight` | `16px` | Header utama ruang kerja atau judul halaman Pengaturan / Data Master |
| **Judul Panel / Dialog / Card** | `font-heading text-sm font-medium` | `14px` | Standar bawaan `CardTitle`, `DialogTitle`, dan judul panel kiri/kanan |
| **Teks Utama UI & Kontrol** | `text-xs font-normal` / `font-medium` | `12px` | Standar seluruh `Button`, `Input`, `Select`, `Table`, dan `Alert` di `src/components/ui/` |
| **Deskripsi & Teks Sekunder** | `text-xs/relaxed text-muted-foreground` | `12px` (relaxed) | Standar `CardDescription`, `DialogDescription`, dan penjelasan konflik |
| **Metadata Blok Sesi & Label Jam Grid** | `text-[11px] leading-tight tabular-nums` | `11px` | Label jam pada sumbu Y grid (`07:00`, `07:15`), nama ruangan/guru di dalam blok sesi pendek |

---

## 4. Geometri, Ukuran Kontrol, & Komponen Primitif (`src/components/ui/`)

Repositori saat ini memiliki **17 komponen primitif** di `src/components/ui/` dengan gaya `radix-lyra`. Jangan mengubah file di dalam `src/components/ui/` kecuali benar-benar diperlukan; komposisikan komponen yang ada.

### 4.1 Standar Geometri `radix-lyra`
- **Border Radius:** Seluruh komponen primitif (`Button`, `Card`, `Input`, `Select`, `Dialog`, `AlertDialog`, `Popover`, `DropdownMenu`, `Alert`, `Checkbox`) menggunakan **`rounded-none` (`0px`)**. Pengecualian tunggal adalah `Switch` yang menggunakan `rounded-full` agar dikenali sebagai sakelar toggle.
- **Tinggi Kontrol Seragam (*Control Heights Move Together*):**
  - Default: `h-8` (`32px`) pada `Button`, `Input`, `InputGroup`, dan `SelectTrigger`.
  - Small: `h-7` (`28px`) pada `Button size="sm"` dan `SelectTrigger size="sm"`.
  - Extra Small: `h-6` (`24px`) pada `Button size="xs"` dan `InputGroupButton size="xs"`.
  - Large: `h-9` (`36px`) pada `Button size="lg"`.
  - Icon Button: `size-8` (default), `size-7` (`icon-sm`), `size-6` (`icon-xs`), `size-9` (`icon-lg`).
- **Bingkai Kartu & Overlay:**
  - `Card`, `DialogContent`, `AlertDialogContent`, `PopoverContent`, dan `DropdownMenuContent` menggunakan `ring-1 ring-foreground/10` dan `rounded-none`.

### 4.2 Katalog Komponen Terpasang & Aturan Komposisi

| Komponen (`src/components/ui/`) | Penggunaan di Schedovyn | Aturan Komposisi Wajib |
|---|---|---|
| [`button.tsx`](src/components/ui/button.tsx) | Tombol aksi toolbar, form, dan kartu sesi | Gunakan `data-icon="inline-start"` atau `data-icon="inline-end"` pada ikon di dalam `Button`. Jangan tambahkan kelas `size-4` manual pada SVG karena `buttonVariants` sudah mengatur `[&_svg:not([class*='size-'])]:size-4`. |
| [`input.tsx`](src/components/ui/input.tsx) & [`input-group.tsx`](src/components/ui/input-group.tsx) | Pencarian sesi, input nama ruang kerja/kelas/guru, input waktu `HH:mm` | Untuk input dengan ikon pencarian atau tombol bersih (*clear*), gunakan `InputGroup` + `InputGroupAddon` + `InputGroupInput` + `InputGroupButton`. |
| [`select.tsx`](src/components/ui/select.tsx) | Pemilih Kelas Aktif (FR-03), filter Mata Pelajaran, pemilih Guru/Ruangan/Hari/Snap Interval | Setiap `SelectItem` **wajib** dibungkus di dalam `SelectGroup`. Gunakan `SelectTrigger` dengan `className="w-full"` pada form atau lebar spesifik pada toolbar. |
| [`card.tsx`](src/components/ui/card.tsx) | Kartu konfigurasi Pengaturan, kartu Sesi Belum Terjadwal, kartu ringkasan | Gunakan struktur utuh: `Card` (`size="default"` atau `size="sm"`) -> `CardHeader` -> `CardTitle` + `CardDescription` + `CardAction` -> `CardContent` -> `CardFooter`. |
| [`table.tsx`](src/components/ui/table.tsx) | Tabel CRUD Data Master (Kelas, Guru, Mapel, Ruangan, Kebutuhan Pembelajaran) | Padukan dengan `@tanstack/react-table`. Kolom angka/durasi gunakan `tabular-nums`, kolom aksi di kanan gunakan `text-right`. |
| [`dialog.tsx`](src/components/ui/dialog.tsx) | Modal Tambah/Edit Data Master, Modal Penempatan Sesi via Keyboard, `ExportDialog` (FR-08/FR-09) | **Wajib** menyertakan `DialogHeader` dan `DialogTitle` untuk aksesibilitas Radix. Untuk dialog yang lebih lebar (mis. form interval ketersediaan guru atau dialog ekspor), override lebar dengan `className="sm:max-w-lg"`. |
| [`alert-dialog.tsx`](src/components/ui/alert-dialog.tsx) | Konfirmasi penghapusan Kelas, Mata Pelajaran yang masih dipakai sesi, atau Reset Ruang Kerja | Gunakan `AlertDialogAction variant="destructive"` untuk konfirmasi hapus permanen. |
| [`alert.tsx`](src/components/ui/alert.tsx) | Banner peringatan konflik pra-ekspor, kegagalan penyimpanan lokal (`QuotaExceededError`), penjelasan konflik di panel detail | Gunakan `variant="destructive"` untuk konflik waktu atau error penyimpanan, disertai ikon `AlertTriangleIcon` sebagai anak pertama `Alert` (otomatis diatur oleh `has-[>svg]:grid-cols-[auto_1fr]`). |
| [`checkbox.tsx`](src/components/ui/checkbox.tsx) & [`switch.tsx`](src/components/ui/switch.tsx) | Pengaturan hari aktif sekolah (`isSchoolDay`), toggle kebutuhan ruangan wajib (`roomRequired`) | Selalu pasangkan dengan [`label.tsx`](src/components/ui/label.tsx) menggunakan atribut `htmlFor` dan `id` yang cocok. |
| [`dropdown-menu.tsx`](src/components/ui/dropdown-menu.tsx) & [`popover.tsx`](src/components/ui/popover.tsx) | Menu aksi cepat pada baris tabel atau blok sesi, pemilih warna mata pelajaran, menu salin jadwal | Setiap `DropdownMenuItem` harus berada di dalam `DropdownMenuGroup`. |
| [`spinner.tsx`](src/components/ui/spinner.tsx) | Indikator status `Menyimpan...` di header dan proses pembuatan PDF/Excel | Komposisikan di dalam `Button` atau badge status penyimpanan dengan `disabled` saat operasi asinkron berlangsung. |

---

## 5. Tata Letak Aplikasi & Spesifikasi Layar Utama

### 5.1 AppShell & Navigasi Global (`src/components/layout/`)
Aplikasi tidak menggunakan *Marketing Landing Page* maupun *Sidebar Dashboard* generik. Begitu dibuka, pengguna langsung masuk ke lingkungan kerja (**Workbench AppShell**) dengan tinggi penuh layar (`min-h-screen flex flex-col bg-background text-foreground`):

1. **Top Navigation Bar (`h-12 border-b bg-card px-4 flex items-center justify-between gap-4`):**
   - **Kiri:** Identitas aplikasi (`Schedovyn` dalam `font-heading font-semibold text-sm`) + pemisah vertikal + Nama Ruang Kerja & Periode Akademik aktif (contoh: `SMPN 1 Nusantara · Ganjil 2026/2027`).
   - **Tengah:** Navigasi 3 rute utama menggunakan tautan yang terhubung ke rute nyata di `src/route/index.tsx`:
     - `/` — **Editor Jadwal**
     - `/master-data` — **Data Master**
     - `/settings` — **Pengaturan Jam & Ruang Kerja**
   - **Kanan:**
     - **SaveStatusBadge (FR-10):** Menampilkan status jujur dari transaksi IndexedDB:
       - `Menyimpan...` (`Spinner` + teks `text-muted-foreground`)
       - `Tersimpan di browser` (`CheckIcon` + teks `text-emerald-700 dark:text-emerald-400`)
       - `Gagal menyimpan lokal` (`AlertTriangleIcon` + teks `text-destructive` + tombol coba ulang)
     - **Theme Toggle Button:** Tombol ikon (`SunIcon` / `MoonIcon`) yang memanggil `setTheme()` dari `useTheme()`, dilengkapi keterangan pintasan `D`.

2. **Contextual Action Bar (Khusus di `EditorPage`, `h-11 border-b bg-muted/40 px-4 flex items-center justify-between gap-3`):**
   - **Kiri:** Pemilih **Kelas Aktif** (`Select` dengan daftar kelas dari store, FR-03) + lencana jumlah sesi terjadwal vs belum terjadwal untuk kelas tersebut.
   - **Tengah:** **ValidationSummaryBanner (FR-11)** yang menampilkan salah satu dari 4 status validasi (`CONFLICT_DETECTED`, `INCOMPLETE`, `NO_CONFLICT_CURRENT_DATA`, `COMPLETE_AND_VALID`) beserta tombol cepat untuk membuka tab daftar konflik.
   - **Kanan:** Tombol **Undo** (`Ctrl+Z`), **Redo** (`Ctrl+Y` / `Ctrl+Shift+Z`) (FR-07), **Salin Jadwal** (FR-12), dan tombol utama **Ekspor Jadwal** (membuka `ExportDialog` untuk PDF/Excel, FR-08 & FR-09).

---

### 5.2 Halaman Editor Jadwal 3-Panel (`src/pages/editor-page.tsx`)

Pada layar desktop (`lg:grid lg:grid-cols-[280px_1fr_340px] lg:h-[calc(100vh-5.75rem)] lg:overflow-hidden`), halaman editor terbagi menjadi 3 area kerja dengan scroll independen. Pada layar tablet/mobile (`< 1024px`), ketiga area diorganisasikan melalui pengalih tab/panel tanpa menyebabkan *horizontal overflow* halaman.

```text
+----------------------------------------------------------------------------------------------------------+
| Schedovyn | SMPN 1 Nusantara (Ganjil 26/27)    [Editor Jadwal] [Data Master] [Pengaturan]  [Tersimpan] [D]|
+----------------------------------------------------------------------------------------------------------+
| Kelas Aktif: [ VII-A v ] | [!] Konflik ditemukan (1 konflik, 2 sesi belum terjadwal) | [Undo][Redo][Ekspor]|
+---------------------------+-----------------------------------------------+------------------------------+
| SESI BELUM TERJADWAL (2)  | GRID JADWAL KELAS VII-A (Snap: 15 menit)      | INSPEKTOR & VALIDASI         |
| [Cari / Filter Mapel   v] | Jam   | Senin      | Selasa     | Rabu        | [Detail Sesi] [Konflik (1)]  |
|---------------------------|-------+------------+------------+-------------|------------------------------|
| +-----------------------+ | 07:00 | Matematika | B. Ind     | IPA         | [!] KONFLIK GURU LINTAS KELAS|
| | [■] Matematika  [1/2] | |       | Budi S.    | Siti A.    | Hendra K.   | Senin, 08:00 - 08:45         |
| | Guru: Budi S.         | | 07:45 | R. VII-A   | R. VII-A   | Lab IPA     | Guru Budi S. mengajar di:    |
| | Durasi: 90 mnt        | |-------+------------+------------+-------------| - Kelas VII-A (Fisika)       |
| | [Tempatkan ke Jadwal] | | 08:00 | [!] Fisika | B. Ind     | IPA         | - Kelas VIII-A (Matematika)  |
| +-----------------------+ |       | Budi S.    | Siti A.    | Hendra K.   | [Sorot Sesi] [Buka VIII-A]   |
|                           | 08:45 | Konflik!   |            |             |------------------------------|
|                           |-------+------------+------------+-------------| EDIT SESI TERPILIH:          |
|                           | 09:30 |/////// WAKTU ISTIRAHAT (30 mnt) //////| Hari   : [Senin          v]  |
|                           |-------+------------+------------+-------------| Mulai  : [08:00] (Selesai 08:45)|
|                           | 10:00 | Sejarah    |            | Olahraga    | Guru   : [Budi S.        v]  |
|                           |       | Ahmad T.   |            | Lapangan    | Ruang  : [R. VII-A       v]  |
|                           | 11:30 |            |            |             | [Keluarkan ke Belum Terjadwal]|
+---------------------------+-----------------------------------------------+------------------------------+
```

#### A. Panel Kiri: Sesi Belum Terjadwal (`UnscheduledPanel` — `280px`)
- Menampilkan daftar `UnscheduledSessionItem` untuk kelas aktif.
- Setiap kartu menampilkan:
  - Indikator warna mata pelajaran (`SubjectColorKey`) dan nama Mata Pelajaran.
  - Badge sisa sesi dalam `tabular-nums` (contoh: `Sisa 1 dari 2 sesi`).
  - Nama Guru default (atau peringatan `"Guru belum ditentukan"` jika `null`) dan Ruangan default.
  - Durasi sesi dalam menit (`"45 mnt"`, `"90 mnt"`).
  - Interaksi ganda: kartu dapat ditarik (*drag* via `@dnd-kit/react`) ke kolom hari di grid, **dan** memiliki tombol eksplisit `"Tempatkan ke Jadwal"` untuk pengguna keyboard/aksesibilitas.

#### B. Area Tengah: Grid Waktu Visual (`TimetableGrid` — `1fr`)
- **Konstanta Skala Vertikal:** `PIXELS_PER_MINUTE = 1.6`
  - `15 menit` = `24px`
  - `30 menit` = `48px`
  - `40 menit` = `64px`
  - `45 menit` = `72px`
  - `60 menit` (`1 jam`) = `96px`
  - `90 menit` = `144px`
- **Aturan Penggunaan `style={{ ... }}` (*Inline Style Exception*):**
  Sesuai aturan proyek, *inline style* dilarang di seluruh aplikasi **kecuali** pada elemen grid waktu yang posisinya dihitung secara dinamis saat *runtime*:
  - Kontainer kolom hari: `style={{ height: `${totalGridMinutes * PIXELS_PER_MINUTE}px` }}`
  - Garis penanda waktu (*hour/snap lines*) dan blok istirahat (`BreakInterval`): `style={{ top: `${topPx}px`, height: `${heightPx}px` }}`
  - Blok sesi terjadwal (`SessionBlock`) dan *Ghost Preview Block* saat *drag*:
    ```tsx
    style={{
      top: `${topPx}px`,
      height: `${heightPx}px`,
      left: `${(100 / overlapClusterCount) * clusterIndex}%`,
      width: `${100 / overlapClusterCount}%`,
    }}
    ```
- **Visualisasi Zona Terlarang pada Grid:**
  - **Waktu Istirahat (`breakIntervals`):** Dirender sebagai pita horizontal di seluruh kolom hari yang bersangkutan dengan latar `bg-muted/80 border-y border-border` dan pola garis diagonal halus atau teks terpusat `text-[11px] font-medium text-muted-foreground uppercase tracking-wider` (contoh: `ISTIRAHAT PERTAMA · 09:30 - 10:00`).
  - **Di Luar Jam Operasional Hari Tertentu:** Jika hari Jumat berakhir pukul `11:30` sedangkan hari Senin–Kamis berakhir pukul `15:00`, area `11:30–15:00` pada kolom Jumat diarsir dengan `bg-muted/50` dan label `"Di Luar Jam Belajar"`.
- **Anatomi `SessionBlock`:**
  - Menampilkan rentang waktu (`07:00 - 08:30`, `tabular-nums`), nama Mata Pelajaran (`font-medium truncate`), nama Guru, dan nama Ruangan.
  - Jika terjadi konflik (`conflictsBySessionId[session.id]?.length > 0`), tampilkan lencana merah dengan ikon `AlertTriangleIcon` dan ringkasan jenis konflik (contoh: `Konflik Guru`, `Konflik Ruangan`, `Jam Istirahat`).
  - Saat fokus keyboard (`focus-visible`), blok menampilkan outline tegas dan mendukung pintasan:
    - `Enter`: Fokus ke form edit di Panel Detail Sesi.
    - `Alt + ArrowUp` / `Alt + ArrowDown`: Geser jam mulai sebesar `snapIntervalMinutes`.
    - `Alt + ArrowLeft` / `Alt + ArrowRight`: Pindahkan ke hari belajar sebelumnya/berikutnya.
    - `Delete` / `Backspace`: Keluarkan sesi kembali ke daftar belum terjadwal.

#### C. Panel Kanan: Inspektor Sesi & Daftar Konflik (`340px`)
- Memiliki 2 tab navigasi di bagian atas:
  1. **Tab Detail Sesi:** Menampilkan form penyuntingan presisi untuk sesi yang sedang dipilih di grid (Mata Pelajaran, Kelas, pemilih Hari, input Jam Mulai `HH:mm`, pemilih Guru, pemilih Ruangan, catatan, serta tombol `"Keluarkan dari Jadwal"`). Jika sesi tersebut memiliki konflik atau peringatan kelengkapan, daftarnya ditampilkan langsung di bagian atas panel ini menggunakan komponen `Alert`.
  2. **Tab Konflik & Validasi:** Menampilkan ringkasan status validasi kelas aktif dan ruang kerja, diikuti daftar kartu `ScheduleConflict` (`severity: "error"`) dan `CompletenessWarning` (`severity: "warning"`). Setiap kartu konflik mencantumkan:
     - Judul jenis konflik dalam Bahasa Indonesia (contoh: `"Konflik Guru Lintas Kelas"`).
     - Hari dan rentang waktu irisan (`"Senin, 08:30 - 09:00"`).
     - Penjelasan lengkap sesi dan kelas mana saja yang bertabrakan.
     - Tombol aksi **"Sorot Sesi"** (atau **"Buka Kelas [Nama Kelas]"** jika konflik melibatkan kelas lain di ruang kerja).

---

### 5.3 Halaman Pengelolaan Data Master (`src/pages/master-data-page.tsx`)
- Menggunakan tata letak terstruktur dengan 5 sub-bagian/tab yang sesuai dengan urutan alur kerja penyusunan jadwal (FR-02):
  1. **Kelas (`ClassGroup`):** Nama Kelas (`VII-A`), Tingkat (`VII`), Keterangan, dan jumlah kebutuhan sesi.
  2. **Mata Pelajaran (`Subject`):** Nama Mata Pelajaran, Pemilih Warna (`SubjectColorKey` dengan pratinjau kotak warna), dan Keterangan.
  3. **Guru (`Teacher`):** Nama Guru, Keterangan, dan daftar **Waktu Tidak Tersedia (`unavailableIntervals`)** per hari & rentang jam (FR-02.B).
  4. **Ruangan (`Room`):** Nama Ruangan, Jenis Ruangan (`Ruang Kelas`, `Laboratorium`, `Lapangan/Olahraga`, `Aula`, `Lainnya`), dan daftar **Waktu Tidak Tersedia (`unavailableIntervals`)** (FR-02.D).
  5. **Kebutuhan Pembelajaran (`TeachingRequirement`):** Tabel pemetaan Kelas + Mata Pelajaran + Jumlah Sesi/Minggu + Durasi/Sesi (menit) + Guru Default + Ruangan Default + sakelar `Wajib Ruangan` (FR-02.E).

---

### 5.4 Halaman Pengaturan Ruang Kerja & Jam Belajar (`src/pages/settings-page.tsx`)
- Terdiri dari dua kartu utama (`Card`):
  1. **Identitas Ruang Kerja:** Input Nama Sekolah/Ruang Kerja, Periode Akademik/Semester, dan pemilih Interval Snap Grid Default (`5`, `10`, `15`, `30`, atau `60` menit).
  2. **Konfigurasi Hari & Jam Operasional (`DayScheduleConfig`):** Daftar Senin s.d. Minggu. Setiap baris hari memiliki `Switch` (`Hari Sekolah Aktif`), input Jam Mulai (`07:00`), Jam Selesai (`15:00`), serta daftar dinamis **Periode Istirahat (`BreakInterval`)** (label istirahat + jam mulai + jam selesai + tombol tambah/hapus istirahat).

---

### 5.5 Dialog Ekspor PDF & Excel (`src/components/export/export-dialog.tsx`)
- Dibuka dari tombol **Ekspor Jadwal** di toolbar.
- Menyediakan pilihan:
  - **Cakupan Ekspor (`ExportScope`):** `Hanya Kelas Aktif` atau `Seluruh Kelas dalam Ruang Kerja`.
  - **Format Berkas (`ExportFormat`):** `Dokumen PDF Siap Cetak (.pdf)` atau `Spreadsheet Excel (.xlsx)`.
- **Peringatan Pra-Ekspor Wajib (AC-11):**
  - Jika pada cakupan yang dipilih terdapat `activeConflictsCount > 0` atau `unscheduledSessionsCount > 0`, dialog **wajib** merender `<Alert variant="destructive">` (untuk konflik) atau `<Alert>` kuning (untuk jadwal belum lengkap) yang menyebutkan jumlah konflik dan sesi belum terjadwal secara eksplisit.
  - Tombol ekspor tetap dapat diklik (non-blocking), namun teks tombol berubah dari `"Unduh Berkas Jadwal"` menjadi `"Tetap Ekspor dengan Peringatan Konflik"`.

---

## 6. Standar UI States (Empty, Loading, Error) & Copywriting Bahasa Indonesia

Sesuai aturan kualitas **R-02**, **R-15**, **R-27**, dan **R-38**:

1. **Tiga State Wajib pada Setiap Komponen Data (R-27):**
   - **Loading State:** Saat hidrasi awal dari IndexedDB (`bootWorkspace()`), tampilkan `Spinner` disertai penjelasan `"Memuat data ruang kerja dari penyimpanan browser..."`.
   - **Empty State:** Jangan pernah menampilkan teks generik `"Tidak ada data"`. Sebutkan penyebab dan berikan satu tombol aksi langsung:
     - *Belum ada kelas:* `"Belum ada kelas di ruang kerja ini. Tambahkan kelas terlebih dahulu di menu Data Master sebelum menyusun jadwal."` + tombol `"Buka Data Master Kelas"`.
     - *Semua sesi sudah terjadwal di Panel Kiri:* `"Seluruh kebutuhan sesi untuk kelas ini telah ditempatkan ke dalam grid."`
     - *Tidak ada konflik di Panel Kanan:* `"Tidak ada bentrokan waktu yang terdeteksi pada data jadwal saat ini."`
   - **Error State:** Jika penyimpanan IndexedDB gagal atau pembuatan PDF/Excel gagal, tampilkan `Alert variant="destructive"` yang menjelaskan apa yang gagal dan langkah pemulihannya (`"Gagal menyimpan ke penyimpanan lokal browser. Periksa ruang penyimpanan browser Anda lalu klik Coba Simpan Ulang."`).
2. **Aturan Copywriting & Placeholder Jujur (R-02, R-15, R-23, R-38):**
   - Seluruh teks antarmuka menggunakan **Bahasa Indonesia** yang lugas dan spesifik terhadap domain penjadwalan sekolah.
   - Pada teks UI (label, deskripsi, tombol, pesan kosong/error), gunakan tanda koma (`,`), titik (`.`), titik dua (`:`), atau tanda kurung `()` — **jangan gunakan karakter em dash** di dalam salinan teks antarmuka.
   - Gunakan placeholder formulir yang relevan dan jujur dengan konteks sekolah di Indonesia (contoh: `Contoh: SMP Negeri 1 Nusantara`, `Contoh: VII-A`, `Contoh: Matematika`, `07:00`), bukan placeholder generik seperti `John Doe` atau `Lorem ipsum`.

---

## 7. Do's and Don'ts (Guardrails untuk Frontend Engineer)

### DO (Wajib Dilakukan)
- **Gunakan kelas utilitas Tailwind CSS v4 dan variabel semantik** (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`).
- **Pertahankan geometri `rounded-none` (`radix-lyra`)** pada seluruh kartu, tombol, input, dialog, dan blok sesi di grid agar selaras dengan sistem komponen di `src/components/ui/`.
- **Gunakan `flex` atau `grid` dengan `gap-*`** untuk tata letak jarak antar-elemen (jangan gunakan `space-x-*` atau `space-y-*`).
- **Gunakan `size-*`** ketika lebar dan tinggi elemen sama (contoh: `size-4`, `size-8`).
- **Gunakan tiga isyarat sekaligus untuk setiap konflik:** bingkai/latar belakang semantik (`border-destructive`), ikon peringatan (`AlertTriangleIcon`), dan teks penjelasan spesifik dalam Bahasa Indonesia.
- **Pastikan kedua tema (`light` dan `dark`) berfungsi sempurna** tanpa teks yang kehilangan kontras pada blok mata pelajaran maupun tabel.

### DON'T (Dilarang Keras)
- **DILARANG** menggunakan gradien biru-ke-ungu, efek *glow* neon, *bento grid* dekoratif, atau *glassmorphism* berlebihan pada navbar/kartu/panel.
- **DILARANG** menggunakan `style={{ ... }}` (*inline styles*) untuk warna, tipografi, atau padding. *Inline style* hanya diizinkan untuk koordinat numerik dinamis (`top`, `height`, `left`, `width`) pada elemen di dalam `TimetableGrid`.
- **DILARANG** mengubah semua elemen menjadi berbentuk pil (`rounded-full`) yang merusak bahasa visual `radix-lyra`.
- **DILARANG** menyembunyikan *focus outline* (`outline-none`) tanpa pengganti cincin fokus `focus-visible:ring-1 focus-visible:ring-ring`.
- **DILARANG** membuat tombol, item menu, atau tautan navigasi yang tidak memiliki perilaku nyata (*dead controls*).
- **DILARANG** menyatakan status `"Jadwal lengkap dan valid"` apabila masih ada sesi di `UnscheduledPanel` atau masih ada kelas lain di ruang kerja yang belum memenuhi `TeachingRequirement`.
