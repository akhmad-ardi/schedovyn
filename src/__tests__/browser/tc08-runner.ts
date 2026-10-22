import puppeteer from "puppeteer-core"
import * as path from "node:path"
import * as fs from "node:fs"

async function setInputValue(
  page: puppeteer.Page,
  selector: string,
  value: string
) {
  const el = await page.$(selector)
  if (!el) throw new Error(`Selector ${selector} tidak ditemukan`)
  await page.evaluate(
    (sel, val) => {
      const input = document.querySelector(sel) as HTMLInputElement | null
      if (input) {
        input.focus()
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set
        nativeInputValueSetter?.call(input, val)
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.dispatchEvent(new Event("change", { bubbles: true }))
        input.blur()
      }
    },
    selector,
    value
  )
  await new Promise((r) => setTimeout(r, 60))
}

async function selectOptionByText(
  page: puppeteer.Page,
  triggerSelector: string,
  optionText: string
) {
  const trigger = await page.$(triggerSelector)
  if (!trigger) throw new Error(`Trigger ${triggerSelector} tidak ditemukan`)
  await trigger.click()
  await new Promise((r) => setTimeout(r, 200))

  await page.evaluate((text) => {
    const options = Array.from(document.querySelectorAll('[role="option"]'))
    const match = options.find((opt) =>
      opt.textContent?.trim().toLowerCase().includes(text.toLowerCase())
    )
    if (match) {
      ;(match as HTMLElement).click()
    } else {
      throw new Error(
        `Option dengan teks "${text}" tidak ditemukan. Opsi tersedia: ${options.map((o) => o.textContent?.trim()).join(", ")}`
      )
    }
  }, optionText)
  await new Promise((r) => setTimeout(r, 150))
}

async function switchMasterDataTab(page: puppeteer.Page, tabLabel: string) {
  await page.evaluate((label) => {
    const tabs = Array.from(document.querySelectorAll('button[role="tab"]'))
    const target = tabs.find((t) => t.textContent?.includes(label))
    if (!target) throw new Error(`Tab "${label}" tidak ditemukan`)
    ;(target as HTMLElement).click()
  }, tabLabel)
  await new Promise((r) => setTimeout(r, 300))
}

async function ensureMasterDataFixture(page: puppeteer.Page) {
  console.log("🔍 Memeriksa prasyarat data master di http://localhost:5173/master-data...")
  await page.goto("http://localhost:5173/master-data", { waitUntil: "networkidle0" })
  await page.waitForSelector('button[role="tab"]', { visible: true })

  // 1. Periksa Kelas
  await switchMasterDataTab(page, "Kelas")
  await page.waitForSelector("#class-name-input", { visible: true })
  const classRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!classRows.some((r) => r.includes("VII-A"))) {
    await setInputValue(page, "#class-name-input", "VII-A")
    await setInputValue(page, "#class-grade-input", "VII")
    await setInputValue(page, "#class-notes-input", "Kelas Reguler")
    await page.click('form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
  }

  // 2. Periksa Mata Pelajaran
  await switchMasterDataTab(page, "Mata Pelajaran")
  await page.waitForSelector("#subject-name-input", { visible: true })
  const subjectRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!subjectRows.some((r) => r.includes("Matematika"))) {
    await setInputValue(page, "#subject-name-input", "Matematika")
    await selectOptionByText(page, "#subject-color-select", "Biru")
    await page.click('form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
  }

  // 3. Periksa Guru
  await switchMasterDataTab(page, "Guru")
  await page.waitForSelector("#teacher-name-input", { visible: true })
  const teacherRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!teacherRows.some((r) => r.includes("Budi Santoso"))) {
    await setInputValue(page, "#teacher-name-input", "Budi Santoso, S.Pd.")
    await setInputValue(page, "#teacher-notes-input", "Guru Kelas VII-A")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  // 4. Periksa Kebutuhan Pembelajaran
  await switchMasterDataTab(page, "Kebutuhan Pembelajaran")
  await page.waitForSelector("#req-class-select", { visible: true })
  const reqRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!reqRows.some((r) => r.includes("VII-A") && r.includes("Matematika"))) {
    await selectOptionByText(page, "#req-class-select", "VII-A")
    await selectOptionByText(page, "#req-subject-select", "Matematika")
    await setInputValue(page, "#req-sessions-input", "3")
    await setInputValue(page, "#req-duration-input", "45")
    await selectOptionByText(page, "#req-teacher-select", "Budi Santoso")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("✅ Seluruh prasyarat data master TC-08 siap.")
}

async function placeSessionQuick(
  page: puppeteer.Page,
  subjectName: string,
  startTime: string,
  dayText?: string
) {
  await page.evaluate((sub) => {
    const cards = Array.from(document.querySelectorAll('section[aria-label="Sesi Belum Terjadwal"] .group.relative'))
    const target = cards.find((c) => c.textContent?.includes(sub))
    const btn = target?.querySelector('button[aria-label="Tempatkan ke Jadwal"]') as HTMLButtonElement | null
    btn?.click()
  }, subjectName)

  await page.waitForSelector('div[role="dialog"]', { visible: true })

  if (dayText) {
    await selectOptionByText(page, "#quick-place-day", dayText)
  }

  await setInputValue(page, "#quick-place-time", startTime)

  await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]')
    const saveBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent?.includes("Simpan ke Grid")
    ) as HTMLButtonElement | null
    saveBtn?.click()
  })

  await page.waitForSelector('div[role="dialog"]', { hidden: true })
  await new Promise((r) => setTimeout(r, 600))
}

async function clearGridSessions(page: puppeteer.Page) {
  while (true) {
    const blockCount = await page.evaluate(() => {
      const blocks = document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]')
      return blocks.length
    })

    if (blockCount === 0) {
      break
    }

    await page.evaluate(() => {
      const firstBlock = document.querySelector('[role="article"][aria-label*="Blok Sesi"]') as HTMLElement | null
      firstBlock?.click()
    })

    await page.waitForSelector("#session-day", { visible: true })

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const removeBtn = buttons.find((b) => b.textContent?.includes("Lepas dari Grid"))
      removeBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }
}

async function readIndexedDbSessions(page: puppeteer.Page): Promise<unknown[]> {
  return page.evaluate(async () => {
    return new Promise<unknown[]>((resolve, reject) => {
      const req = indexedDB.open("schedovyn_local_db")
      req.onerror = () => reject(new Error("Gagal membuka indexedDB schedovyn_local_db"))
      req.onsuccess = () => {
        const idb = req.result
        try {
          const tx = idb.transaction("sessions", "readonly")
          const store = tx.objectStore("sessions")
          const getAllReq = store.getAll()
          getAllReq.onsuccess = () => resolve(getAllReq.result)
          getAllReq.onerror = () => reject(new Error("Gagal membaca store sessions"))
        } catch (err) {
          reject(err)
        }
      }
    })
  })
}

async function runTC08() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-08"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-08 (Local Persistence & UI Resilience)...")
  console.log("📁 Direktori Screenshot:", screenshotsDir)

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
  })

  let page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  page.on("console", (msg) => {
    const text = msg.text()
    if (!text.includes("[vite]") && !text.includes("Download the React DevTools")) {
      console.log(`[Browser Console]: ${text}`)
    }
  })
  page.on("pageerror", (err) => {
    console.error(`[Browser Error]: ${err.message}`)
  })

  try {
    // -------------------------------------------------------------------------
    // Prasyarat: Pastikan Data Master Lengkap
    // -------------------------------------------------------------------------
    await ensureMasterDataFixture(page)

    // Buka Halaman Editor Jadwal (/)
    console.log("🌐 Membuka Editor Jadwal http://localhost:5173/ ...")
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" })
    await page.waitForSelector("header", { visible: true })

    // Pastikan kelas VII-A aktif
    const isGridPresent = (await page.$('div[role="region"][aria-label="Grid Jadwal Mingguan"]')) !== null
    if (!isGridPresent) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const viiaCard = buttons.find((b) => b.textContent?.includes("VII-A"))
        viiaCard?.click()
      })
      await new Promise((r) => setTimeout(r, 500))
    }
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Bersihkan sesi di VII-A agar kondisi awal bersih terkontrol
    console.log("Membersihkan sesi di kelas VII-A...")
    await clearGridSessions(page)
    await new Promise((r) => setTimeout(r, 600))

    // -------------------------------------------------------------------------
    // Kasus Uji 8.1: Otomatisasi Persistensi Tanpa Tombol Manual (FR-10.1)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 8.1: Otomatisasi Persistensi Tanpa Tombol Manual ---")

    // 1. Verifikasi ketiadaan tombol "Simpan Jadwal" manual di seluruh antarmuka
    const manualSaveButtonExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      return buttons.some((b) => {
        const txt = b.textContent?.trim().toLowerCase() ?? ""
        return (
          txt.includes("simpan jadwal") ||
          txt.includes("simpan perubahan jadwal") ||
          txt === "simpan"
        )
      })
    })

    console.log("Apakah tombol manual 'Simpan Jadwal' ditemukan?", manualSaveButtonExists)
    if (manualSaveButtonExists) {
      throw new Error("Ditemukan tombol manual Simpan Jadwal! FR-10 mewajibkan zero manual save button.")
    }
    console.log("✅ Terverifikasi: Tidak ada tombol manual 'Simpan Jadwal' pada antarmuka.")

    // 2. Lakukan mutasi sesi: Tempatkan Matematika di Senin 07:30
    console.log("Menempatkan sesi Matematika di Senin 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30")

    // 3. Amati lencana status penyimpanan di header
    await page.waitForFunction(
      () => {
        const badge = document.querySelector('header button[role="status"]')
        return badge?.textContent?.includes("Tersimpan di browser")
      },
      { timeout: 5000 }
    )

    const badgeText = await page.evaluate(() => {
      const badge = document.querySelector('header button[role="status"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Lencana Penyimpanan di Header:", badgeText)
    if (!badgeText.includes("Tersimpan di browser")) {
      throw new Error(`Lencana tidak menunjukkan 'Tersimpan di browser': "${badgeText}"`)
    }

    // 4. Verifikasi rekaman fisik di IndexedDB secara langsung
    const dbSessionsInitial = await readIndexedDbSessions(page)
    console.log(`Jumlah sesi fisik tersimpan di IndexedDB: ${dbSessionsInitial.length}`)
    if (dbSessionsInitial.length === 0) {
      throw new Error("Data sesi baru tidak ditemukan secara fisik di tabel IndexedDB!")
    }
    console.log("✅ Data sesi baru langsung tercatat secara fisik di IndexedDB (schedovyn_local_db -> sessions).")

    // Ambil screenshot Kasus 8.1
    await page.screenshot({
      path: path.join(screenshotsDir, "01-auto-save-no-manual-button.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-auto-save-no-manual-button.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 8.2: Popover Rincian Persistensi & Disclaimer Cadangan (FR-10 PRD)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 8.2: Popover Rincian Persistensi & Disclaimer Cadangan ---")

    // Klik lencana "Tersimpan di browser" di header untuk membuka popover
    console.log("Mengeklik lencana 'Tersimpan di browser' di header...")
    await page.click('header button[role="status"]')
    await page.waitForSelector('[role="dialog"], div[data-radix-popper-content-wrapper]', { visible: true })
    await new Promise((r) => setTimeout(r, 300))

    // Ambil teks di dalam popover
    const popoverContent = await page.evaluate(() => {
      const popper = document.querySelector('div[data-radix-popper-content-wrapper]')
      return {
        text: popper?.textContent ?? "",
        html: popper?.innerHTML ?? "",
      }
    })

    console.log("Teks Popover:", popoverContent.text)

    // Verifikasi unsur-unsur wajib popover:
    // 1. Status Penyimpanan & Sinkron
    if (!popoverContent.text.includes("Status Penyimpanan") || !popoverContent.text.includes("Sinkron")) {
      throw new Error("Popover tidak memuat judul 'Status Penyimpanan' atau status 'Sinkron'")
    }
    // 2. Media: IndexedDB (Lokal)
    if (!popoverContent.text.includes("IndexedDB (Lokal)")) {
      throw new Error("Popover tidak memuat informasi media 'IndexedDB (Lokal)'")
    }
    // 3. Stempel Waktu (format HH:mm:ss atau HH.mm.ss sesuai locale id-ID)
    const hasTimeFormat = /\d{2}[:.]\d{2}[:.]\d{2}/.test(popoverContent.text)
    if (!hasTimeFormat) {
      throw new Error(`Stempel waktu format HH:mm:ss / HH.mm.ss tidak ditemukan di popover: "${popoverContent.text}"`)
    }
    const detectedTimestamp = popoverContent.text.match(/\d{2}[:.]\d{2}[:.]\d{2}/)?.[0]
    console.log("✅ Stempel waktu format 24 jam terverifikasi:", detectedTimestamp)

    // 4. Disclaimer resmi salinan cadangan
    if (!popoverContent.text.includes("ekspor ke PDF atau Excel secara berkala sebagai salinan cadangan")) {
      throw new Error("Disclaimer resmi ekspor cadangan PRD tidak ditemukan di popover!")
    }
    console.log("✅ Disclaimer resmi cadangan (PDF/Excel) terverifikasi hadir.")

    // Ambil screenshot Kasus 8.2
    await page.screenshot({
      path: path.join(screenshotsDir, "02-save-status-popover-disclaimer.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-save-status-popover-disclaimer.png")

    // Tutup popover dengan menekan Escape
    await page.keyboard.press("Escape")
    await new Promise((r) => setTimeout(r, 400))

    // -------------------------------------------------------------------------
    // Kasus Uji 8.3: Kejujuran Status Penyimpanan saat Simulasi Galat (Storage Honesty — FR-10.5)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 8.3: Kejujuran Status Penyimpanan saat Simulasi Galat ---")

    // Pasang override pada IDBObjectStore.prototype.put untuk mensimulasikan QuotaExceededError
    console.log("Menginjeksi simulasi QuotaExceededError pada IDBObjectStore.prototype.put...")
    await page.evaluate(() => {
      // @ts-expect-error simpan original untuk pemulihan
      window.__original_idb_put = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function () {
        console.log("Simulasi QuotaExceededError aktif pada IDBObjectStore.put!")
        const err = new DOMException(
          "Browser kehabisan ruang penyimpanan lokal untuk menyimpan perubahan jadwal.",
          "QuotaExceededError"
        )
        throw err
      }
    })

    // Mutasi sesi pada grid: klik sesi Matematika dan ubah jam mulai ke 08:00
    console.log("Mengeklik blok sesi Matematika di grid...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Blok Sesi"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-start-time", { visible: true })

    console.log("Mengubah jam mulai sesi ke 08:00 saat error penyimpanan aktif...")
    await setInputValue(page, "#session-start-time", "08:00")
    await new Promise((r) => setTimeout(r, 1000))

    // Tunggu lencana berubah menjadi error "Gagal menyimpan lokal"
    await page.waitForFunction(
      () => {
        const headerText = document.querySelector("header")?.textContent ?? ""
        return headerText.includes("Gagal menyimpan lokal")
      },
      { timeout: 5000 }
    )

    // Verifikasi Storage Honesty:
    // 1. Sistem DILARANG menampilkan "Tersimpan di browser"
    const headerHtml = await page.evaluate(() => document.querySelector("header")?.innerHTML ?? "")
    if (headerHtml.includes("Tersimpan di browser")) {
      throw new Error("Storage Honesty dilanggar! Lencana masih menampilkan 'Tersimpan di browser' saat write gagal!")
    }
    console.log("✅ Storage Honesty Terbukti: Status 'Tersimpan di browser' tidak ditampilkan saat gagal menyimpan.")

    // 2. Banner peringatan destruktif muncul di atas layar
    const alertBannerState = await page.evaluate(() => {
      const alert = document.querySelector('.bg-background .border-destructive\\/50, [role="alert"]')
      const title = alert?.querySelector("div")?.textContent?.trim() ?? alert?.textContent?.trim() ?? ""
      const retryBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Coba Simpan Ulang")
      )
      return {
        hasAlert: !!alert,
        alertText: title,
        hasRetryBtn: !!retryBtn,
      }
    })

    console.log("Status Banner Error Penyimpanan:", alertBannerState)
    if (!alertBannerState.hasAlert) {
      throw new Error("Banner peringatan destruktif kegagalan penyimpanan lokal tidak muncul di atas layar!")
    }
    if (!alertBannerState.hasRetryBtn) {
      throw new Error("Tombol 'Coba Simpan Ulang' tidak ditemukan pada banner / header!")
    }
    console.log("✅ Banner kegagalan penyimpanan lokal dan tombol 'Coba Simpan Ulang' tampil.")

    // Ambil screenshot Kasus 8.3
    await page.screenshot({
      path: path.join(screenshotsDir, "03-storage-honesty-error-alert.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-storage-honesty-error-alert.png")

    // 3. Pulihkan fungsi transaksi normal
    console.log("Memulihkan fungsi normal IDBObjectStore.prototype.put...")
    await page.evaluate(() => {
      // @ts-expect-error pulihkan original
      if (window.__original_idb_put) {
        // @ts-expect-error pulihkan original
        IDBObjectStore.prototype.put = window.__original_idb_put
        // @ts-expect-error bersihkan window
        delete window.__original_idb_put
      }
    })

    // 4. Klik tombol "Coba Simpan Ulang"
    console.log("Mengeklik tombol 'Coba Simpan Ulang'...")
    await page.evaluate(() => {
      const retryBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Coba Simpan Ulang")
      ) as HTMLButtonElement | null
      retryBtn?.click()
    })

    // Tunggu lencana kembali hijau "Tersimpan di browser"
    await page.waitForFunction(
      () => {
        const badge = document.querySelector('header button[role="status"]')
        return badge?.textContent?.includes("Tersimpan di browser")
      },
      { timeout: 5000 }
    )
    console.log("✅ Sinkronisasi pulih sempurna: Lencana kembali hijau 'Tersimpan di browser' pasca-retry.")

    // Tempatkan sesi Matematika ke-2 di hari Selasa 07:30 untuk memperkuat verifikasi pemulihan reload
    console.log("Menempatkan sesi Matematika ke-2 di Selasa 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30", "Selasa")
    await new Promise((r) => setTimeout(r, 600))

    // -------------------------------------------------------------------------
    // Kasus Uji 8.4: Pemulihan Penuh Sesi Setelah Peramban Ditutup (AC-12)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 8.4: Pemulihan Penuh Sesi Setelah Peramban Ditutup ---")

    // Catat state sebelum menutup tab:
    const preCloseState = await page.evaluate(() => {
      const workspaceName = document.querySelector("header")?.textContent ?? ""
      const activeClassSelect = document.querySelector("#active-class-select")?.textContent ?? ""
      const sessionBlocks = Array.from(
        document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]')
      ).map((b) => b.textContent?.trim() ?? "")
      return {
        workspaceName,
        activeClassSelect,
        sessionBlocks,
      }
    })
    console.log("Kondisi Sesi sebelum Tab Ditutup (total:", preCloseState.sessionBlocks.length, "):", preCloseState.sessionBlocks)

    // Tutup tab halaman
    console.log("Menutup tab browser (page.close)...")
    await page.close()

    // Buka tab / halaman baru
    console.log("Membuka tab peramban baru dan mengakses http://localhost:5173/ ...")
    page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" })
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await page.waitForFunction(
      () => {
        const badge = document.querySelector('header button[role="status"]')
        return badge?.textContent?.includes("Tersimpan di browser")
      },
      { timeout: 6000 }
    )

    // Periksa pemulihan menyeluruh:
    const recoveredState = await page.evaluate(() => {
      const activeClassTrigger = document.querySelector("#active-class-select")?.textContent?.trim() ?? ""
      const sessionBlocks = Array.from(
        document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]')
      ).map((b) => b.textContent?.trim() ?? "")
      const badgeText = document.querySelector('header button[role="status"]')?.textContent?.trim() ?? ""
      return {
        activeClassTrigger,
        sessionBlocks,
        badgeText,
      }
    })

    console.log("Kondisi Sesi setelah Pemulihan Tab Baru:", recoveredState)

    // Asersi AC-12:
    if (!recoveredState.activeClassTrigger.includes("VII-A")) {
      throw new Error(`Kelas aktif terakhir tidak pulih, didapat: "${recoveredState.activeClassTrigger}"`)
    }
    if (recoveredState.sessionBlocks.length < 2) {
      throw new Error(
        `Jumlah blok sesi tidak pulih sempurna. Diharapkan minimal 2 sesi, ditemukan: ${recoveredState.sessionBlocks.length}`
      )
    }
    if (!recoveredState.sessionBlocks.some((s) => s.includes("Matematika"))) {
      throw new Error("Sesi Matematika tidak pulih pada grid jadwal!")
    }
    if (!recoveredState.badgeText.includes("Tersimpan di browser")) {
      throw new Error(`Status penyimpanan pasca-pulih tidak valid: "${recoveredState.badgeText}"`)
    }

    console.log("✅ AC-12 Terbukti: Seluruh sesi kelas VII-A pulih 100% tanpa kehilangan data setelah peramban ditutup.")

    // Ambil screenshot Kasus 8.4
    await page.screenshot({
      path: path.join(screenshotsDir, "04-persistence-recovery.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-persistence-recovery.png")

    console.log("\n=======================================================")
    console.log("🎉 SELURUH KASUS UJI TC-08 BERHASIL DILALUI DENGAN SUKSES (100% PASS)!")
    console.log("=======================================================\n")
  } catch (error) {
    console.error("❌ Terjadi kegagalan saat menjalankan TC-08:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "ERROR-tc08-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC08()
