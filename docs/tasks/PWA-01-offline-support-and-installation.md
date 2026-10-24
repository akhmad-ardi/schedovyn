# Spesifikasi Task & Kontrak Teknis: PWA-01 — Dukungan PWA & Mode Offline (vite-plugin-pwa)

**Kode Fitur:** `PWA-01` (Didukung oleh `FR-10`, `NFR-02`, `NFR-03`, `NFR-04`, `NFR-06`)  
**Status:** Siap Dieksekusi (Fase RED -> Fase GREEN)  
**Dokumen Referensi:**
- Product Requirements Document: [`docs/Schedovyn-PRD.md`](../Schedovyn-PRD.md) (Bagian 1.2 Prinsip Inti, 7.1, 10 NFR-02 s.d. NFR-06, 13.1)
- Technical Design Document: [`docs/Schedovyn-TDD.md`](../Schedovyn-TDD.md) (Bagian 1.2, 7.2)
- Design System & UI Guidelines: [`DESIGN.md`](../../DESIGN.md) (Bagian 4, 5.2)
- Agent Guidelines: [`AGENTS.md`](../../AGENTS.md)
- Task Terkait:
  - [`docs/tasks/FR-10-local-auto-save.md`](./FR-10-local-auto-save.md)

---

## 1. Konteks & Tujuan Fitur

### 1.1 Hasil Telusur & Analisis Kebutuhan
Berdasarkan filosofi produk dan observasi lingkungan pengguna:
- **Kondisi Riil di Sekolah:**
  Pengguna utama Schedovyn (guru dan staf kurikulum) sering kali bekerja di ruang guru atau area sekolah dengan kualitas koneksi internet yang tidak stabil, kuota terbatas, atau bahkan tanpa koneksi internet sama sekali.
- **Penyelarasan dengan Filosofi Local-First:**
  Schedovyn telah dibangun 100% *Client-Side & Local-First* dengan penyimpanan lokal IndexedDB (`FR-10`). Namun, saat ini peramban masih memerlukan koneksi internet untuk mengunduh berkas HTML/CSS/JS pada kunjungan pertama atau saat memuat ulang halaman.
- **Nilai Tambah Fitur PWA:**
  1. **Fungsi Offline Penuh:** Dengan *Service Worker* dan *Workbox pre-caching*, seluruh aset aplikasi (HTML, CSS, JS, font Figtree & Inter, serta ikon SVG) disimpan di memori peramban lokal. Pengguna dapat membuka dan menggunakan Schedovyn kapan saja meskipun internet terputus total.
  2. **Pengalaman Aplikasi Native (*Installable App*):** Pengguna dapat menginstal Schedovyn ke sistem operasi desktop (Windows, macOS, Linux, ChromeOS) atau perangkat tablet/ponsel tanpa perlu membuka peramban web terlebih dahulu.
  3. **Pembaruan Aplikasi yang Aman & Terkendali (*Prompt-Based Update*):** Menerapkan mekanisme pembaruan berbasis konfirmasi (*prompt*) ramah pengguna agar peramban tidak me-reload halaman secara paksa saat guru sedang aktif menyusun jadwal di kanvas.
  4. **Peningkatan Performa Buka Pertama (*Instant Load*):** Aset statis yang telah di-cache oleh Service Worker dimuat dalam hitungan milidetik (*Cache-First strategy*).

### 1.2 Referensi Persyaratan
- **Prinsip Inti Produk (PRD Bagian 1.2):**
  - *Local-First & Zero-Backend:* Seluruh penyimpanan data, pembuatan jadwal, dan komputasi berjalan 100% di peramban tanpa ketergantungan server.
- **NFR-02 (Keandalan Data):**
  - Proses pembaruan Service Worker tidak boleh merusak, mereset, atau menghapus data ruang kerja dan jadwal yang tersimpan di IndexedDB (`schedovyn_local_db`).
- **NFR-04 (Kompatibilitas):**
  - PWA harus berjalan mulus pada peramban desktop modern (Chromium, Firefox, Safari) dan mendukung mekanisme instalasi native.
- **NFR-06 (Ketahanan UI):**
  - Indikasi kesiapan mode offline dan ketersediaan pembaruan harus ditampilkan secara transparan dan sopan tanpa mengganggu alur kerja pengguna.

### 1.3 Masalah Pengguna & Batasan Ruang Lingkup
- **Masalah Pengguna:** Guru tidak dapat menyusun jadwal jika Wi-Fi sekolah sedang mati atau saat membawa laptop ke ruangan yang tidak terjangkau sinyal internet.
- **Cakupan Fitur (In-Scope):**
  1. Pemasangan pustaka `vite-plugin-pwa` dan integrasi konfigurasi Workbox di `vite.config.ts`.
  2. Pembuatan berkas `manifest.webmanifest` dengan konfigurasi *standalone*, tema warna, dan daftar ikon lengkap.
  3. Penyiapan aset ikon PWA (192x192, 512x512, maskable) di direktori `public/`.
  4. Modul hook `usePwa` (`src/hooks/use-pwa.ts`) untuk menangani siklus pembaruan SW dan event instalasi native (`beforeinstallprompt`, `appinstalled`).
  5. Komponen `PwaReloadPrompt` (`src/components/pwa/pwa-reload-prompt.tsx`) untuk notifikasi pembaruan versi baru dan status offline ready.
  6. Komponen `PwaInstallButton` (`src/components/pwa/pwa-install-button.tsx`) di bilah header `AppShell`.
  7. Pengujian otomatis: unit test hook PWA, component test UI prompt & tombol pasang, serta verifikasi hasil bundel Workbox.
- **Di Luar Cakupan Fitur (Out-of-Scope):**
  - *Push Notifications* berbasis server (Schedovyn tidak memiliki backend server).
  - *Background Sync API* (karena Schedovyn tidak melakukan sinkronisasi ke cloud).

---

## 2. Kontrak Data & Arsitektur Teknis

### 2.1 Dependensi & Konfigurasi Build (`vite.config.ts`)

Menambahkan `vite-plugin-pwa` ke dalam `vite.config.ts`:

```typescript
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favico.svg", "robots.txt"],
      manifest: {
        name: "Schedovyn - Smart Timetable Planner",
        short_name: "Schedovyn",
        description:
          "Aplikasi smart timetable planner untuk menyusun jadwal pembelajaran sekolah secara visual dengan mekanisme drag-and-drop dan deteksi konflik lintas kelas otomatis.",
        theme_color: "#1547E6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/favico.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
})
```

### 2.2 Penyesuaian TypeScript Compiler (`tsconfig.app.json`)

Menambahkan tipe bawaan `vite-plugin-pwa/client` agar virtual module `virtual:pwa-register/react` dikenali tanpa galat tipe:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vite-plugin-pwa/client"]
  }
}
```

### 2.3 Kontrak Hook PWA (`src/hooks/use-pwa.ts`)

Membungkus interaksi Service Worker dan instalasi aplikasi ke dalam sebuah *custom hook* bebas dari `any`:

```typescript
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt: () => Promise<void>
}

export interface PwaState {
  /** Apakah aplikasi dapat diinstal ke perangkat (event beforeinstallprompt ditangkap) */
  isInstallable: boolean
  /** Apakah aplikasi sudah berjalan dalam mode standalone atau telah terpasang */
  isInstalled: boolean
  /** Apakah ada versi pembaruan aplikasi baru yang menunggu aktivasi */
  needRefresh: boolean
  /** Apakah aset aplikasi telah selesai di-cache dan siap untuk penggunaan offline */
  offlineReady: boolean
  /** Memicu dialog instalasi native peramban */
  promptInstall: () => Promise<boolean>
  /** Memperbarui Service Worker ke versi terbaru dan memuat ulang halaman */
  reloadApp: () => Promise<void>
  /** Menutup banner pemberitahuan pembaruan/offline */
  dismissPrompt: () => void
}
```

### 2.4 Spesifikasi Komponen Antarmuka

#### 2.4.1 `PwaReloadPrompt` (`src/components/pwa/pwa-reload-prompt.tsx`)
- Komponen *floating alert* di pojok kanan bawah layar (`fixed bottom-4 right-4 z-50`).
- **Kondisi 1: `needRefresh === true`**
  - Menampilkan ikon `RefreshCwIcon` (animasi halus).
  - Judul: **Pembaruan Aplikasi Tersedia**.
  - Deskripsi: *"Versi baru Schedovyn telah tersedia. Perbarui sekarang untuk mendapatkan fitur terbaru."*
  - Tombol Aksi:
    - `"Perbarui Sekarang"` (varian `default`, memanggil `reloadApp()`).
    - `"Nanti"` (varian `ghost`, memanggil `dismissPrompt()`).
- **Kondisi 2: `offlineReady === true`**
  - Menampilkan ikon `WifiOffIcon` / `CheckCircle2Icon`.
  - Judul: **Mode Offline Siap**.
  - Deskripsi: *"Schedovyn telah tersimpan di browser dan siap digunakan tanpa koneksi internet."*
  - Tombol Aksi: `"Mengerti"` (menutup banner).

#### 2.4.2 `PwaInstallButton` (`src/components/pwa/pwa-install-button.tsx`)
- Tombol di bilah header `AppShell` di sebelah tombol ganti tema.
- Hanya dirender apabila `isInstallable === true` dan `isInstalled === false`.
- Tampilan:
  - Varian `outline`, ukuran `xs`.
  - Ikon `DownloadIcon` atau `MonitorDownIcon`.
  - Label teks: `"Pasang Aplikasi"`.
  - Saat diklik: memanggil `promptInstall()`. Jika pengguna menyetujui, tombol otomatis menghilang.

---

## 3. Acceptance Criteria (Given-When-Then)

### AC-PWA-01 — Kemampuan Offline Penuh
- **Given** pengguna telah membuka Schedovyn setidaknya satu kali saat terhubung ke internet,
- **When** peramban beralih ke mode offline (tanpa koneksi internet) dan pengguna memuat ulang halaman pada rute mana pun (`/`, `/master-data`, `/settings`),
- **Then** peramban tetap memuat seluruh antarmuka, aset gaya CSS, font, ikon, dan data jadwal IndexedDB secara normal tanpa menampilkan layar galat peramban (*No Internet*).

### AC-PWA-02 — Validitas Web App Manifest & Mode Standalone
- **Given** peramban atau alat audit (Lighthouse / DevTools Application Panel) memeriksa manifest,
- **When** berkas `manifest.webmanifest` dievaluasi,
- **Then** manifest memiliki `name`, `short_name`, `display: "standalone"`, `start_url: "/"`, `theme_color: "#1547E6"`, dan ikon dengan ukuran 192x192 serta 512x512.

### AC-PWA-03 — Tombol & Dialog Instalasi Native
- **Given** peramban mendukung instalasi PWA dan memicu event `beforeinstallprompt`,
- **When** pengguna mengeklik tombol `"Pasang Aplikasi"` pada bilah navigasi header,
- **Then** peramban memunculkan dialog instalasi aplikasi native,
- **And** setelah aplikasi berhasil diinstal, tombol `"Pasang Aplikasi"` otomatis disembunyikan.

### AC-PWA-04 — Deteksi Pembaruan Non-Intrusif (*Prompt-Based Update*)
- **Given** pengguna sedang membuka dan menyunting jadwal di Schedovyn,
- **And** pengembang merilis versi baru aplikasi ke platform hosting,
- **When** Service Worker mendeteksi aset baru di latar belakang,
- **Then** sistem DILARANG me-reload halaman secara paksa,
- **And** sistem menampilkan komponen `PwaReloadPrompt` yang memberi tahu bahwa pembaruan telah siap.

### AC-PWA-05 — Eksekusi Pembaruan Aman Tanpa Kehilangan Data
- **Given** komponen `PwaReloadPrompt` sedang terbuka dengan status `needRefresh`,
- **When** pengguna menekan tombol `"Perbarui Sekarang"`,
- **Then** Service Worker baru diaktifkan (`skipWaiting`),
- **And** halaman dimuat ulang dengan aset versi terbaru,
- **And** seluruh data ruang kerja, kelas, guru, dan jadwal di IndexedDB tetap utuh tanpa ada yang terhapus.

### AC-PWA-06 — Aksesibilitas & UI Multi-Isyarat
- **Given** notifikasi PWA ditampilkan di layar,
- **When** pengguna berinteraksi dengan notifikasi,
- **Then** antarmuka menggunakan teks Bahasa Indonesia yang santun tanpa karakter *em dash* (`—`), menyertakan ikon deskriptif, dan mendukung kontrol keyboard (`Tab`, `Enter`, `Escape`).

---

## 4. Breakdown Task Eksekusi (TDD Roadmap)

### 4.1 Fase RED — QA Engineer (Automated Test Suite)

1. **Task QA-PWA-01: Unit Test Hook & State Management PWA**
   - **File:** `src/__tests__/unit/pwa/use-pwa.spec.ts`
   - **Skenario Pengujian:**
     - Menguji nilai awal state `PwaState` (`isInstallable: false`, `isInstalled: false`).
     - Menguji penangkapan event `beforeinstallprompt` mengubah `isInstallable` menjadi `true`.
     - Menguji pemanggilan `promptInstall()` memicu metode `prompt()` pada event dan mengembalikan hasil pilihan pengguna.
     - Menguji penangkapan event `appinstalled` mengubah `isInstalled: true` dan menyembunyikan opsi install.
     - Menguji callback pembaruan Service Worker (`needRefresh` & `offlineReady`).

2. **Task QA-PWA-02: Component Test UI Prompt & Install Button**
   - **File:** `src/__tests__/components/pwa-ui.spec.tsx`
   - **Skenario Pengujian:**
     - Menguji `PwaReloadPrompt` tidak dirender saat tidak ada pembaruan.
     - Menguji `PwaReloadPrompt` merender pesan pembaruan saat `needRefresh: true` dan tombol "Perbarui Sekarang" memanggil fungsi reload.
     - Menguji `PwaReloadPrompt` merender pesan offline saat `offlineReady: true`.
     - Menguji `PwaInstallButton` hanya muncul saat `isInstallable: true` dan mengeklik tombol memicu fungsi install.

3. **Task QA-PWA-03: Integration Test Verifikasi Hasil Build PWA**
   - **File:** `src/__tests__/integration/pwa-build.spec.ts`
   - **Skenario Pengujian:**
     - Menguji keberadaan berkas `manifest.webmanifest` pada hasil kompilasi.
     - Menguji bahwa berkas `sw.js` terbuat dan menyertakan daftar pre-cache aset utama.

---

### 4.2 Fase GREEN — Frontend Engineer (Implementasi Produksi)

1. **Task FE-PWA-01: Pemasangan Dependensi & Konfigurasi Vite**
   - **File:** `package.json`, `vite.config.ts`, `tsconfig.app.json`
   - **Pekerjaan:**
     - Pasang `vite-plugin-pwa` via `bun add -d vite-plugin-pwa`.
     - Konfigurasikan plugin `VitePWA` di `vite.config.ts` sesuai spesifikasi Bagian 2.1.
     - Tambahkan tipe `vite-plugin-pwa/client` di `tsconfig.app.json`.

2. **Task FE-PWA-02: Penyiapan Aset Ikon PWA**
   - **File:** `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/favico.svg`
   - **Pekerjaan:**
     - Buat dan letakkan aset gambar ikon resolusi 192x192 dan 512x512 teroptimasi pada folder `public/`.
     - Pastikan ikon mendukung tampilan standar dan *maskable*.

3. **Task FE-PWA-03: Implementasi Hook `usePwa`**
   - **File:** `src/hooks/use-pwa.ts`
   - **Pekerjaan:**
     - Implementasikan hook `usePwa` menggunakan `virtual:pwa-register/react`.
     - Daftarkan listener event `beforeinstallprompt` dan `appinstalled`.
     - Sediakan fungsi `promptInstall()`, `reloadApp()`, dan `dismissPrompt()`.

4. **Task FE-PWA-04: Implementasi Komponen UI `PwaReloadPrompt` & `PwaInstallButton`**
   - **File:** `src/components/pwa/pwa-reload-prompt.tsx` dan `src/components/pwa/pwa-install-button.tsx`
   - **Pekerjaan:**
     - Bangun kedua komponen menggunakan gaya Tailwind CSS v4 dan komponen primitif shadcn/ui (`Button`, `Card`, `Alert`).
     - Pastikan tipografi, kontras warna, dan copywriting Bahasa Indonesia selaras dengan `DESIGN.md`.

5. **Task FE-PWA-05: Integrasi Komponen ke dalam `AppShell`**
   - **File:** `src/components/layout/app-shell.tsx`
   - **Pekerjaan:**
     - Sematkan `PwaInstallButton` di header navigasi `AppShell`.
     - Sematkan `PwaReloadPrompt` di bagian bawah layout `AppShell`.

---

### 4.3 Fase REFACTOR & Quality Gate

1. **Pemeriksaan Tipe Data & Gaya Kode:**
   ```bash
   bun run typecheck
   bun run lint
   ```
2. **Eksekusi Pengujian Otomatis:**
   ```bash
   bun run test
   ```
3. **Verifikasi Build Produksi PWA:**
   ```bash
   bun run build
   ```
   *(Pastikan berkas `dist/sw.js` dan `dist/manifest.webmanifest` terbuat tanpa galat).*
4. **Pembaruan Knowledge Graph (`graphify`):**
   ```bash
   GRAPHIFY_BACKEND=none /usr/local/share/uv/tools/graphifyy/bin/python -m graphify . --update
   ```
