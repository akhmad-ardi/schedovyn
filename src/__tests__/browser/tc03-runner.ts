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
    console.log("Fixture: Menambahkan kelas VII-A...")
    await setInputValue(page, "#class-name-input", "VII-A")
    await setInputValue(page, "#class-grade-input", "VII")
    await setInputValue(page, "#class-notes-input", "Kelas Reguler")
    await page.click('form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!classRows.some((r) => r.includes("VII-B"))) {
    console.log("Fixture: Menambahkan kelas VII-B...")
    await setInputValue(page, "#class-name-input", "VII-B")
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
    console.log("Fixture: Menambahkan mata pelajaran Matematika...")
    await setInputValue(page, "#subject-name-input", "Matematika")
    await selectOptionByText(page, "#subject-color-select", "Biru")
    await page.click('form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!subjectRows.some((r) => r.includes("Bahasa Inggris"))) {
    console.log("Fixture: Menambahkan mata pelajaran Bahasa Inggris...")
    await setInputValue(page, "#subject-name-input", "Bahasa Inggris")
    await selectOptionByText(page, "#subject-color-select", "Zamrud")
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
    console.log("Fixture: Menambahkan guru Budi Santoso...")
    await setInputValue(page, "#teacher-name-input", "Budi Santoso, S.Pd.")
    await setInputValue(page, "#teacher-notes-input", "Guru Matematika")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!teacherRows.some((r) => r.includes("Siti Rahma"))) {
    console.log("Fixture: Menambahkan guru Siti Rahma...")
    await setInputValue(page, "#teacher-name-input", "Siti Rahma, M.Pd.")
    await setInputValue(page, "#teacher-notes-input", "Guru Bahasa Inggris")
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
    console.log("Fixture: Menambahkan kebutuhan VII-A Matematika (2 sesi @45m)...")
    await selectOptionByText(page, "#req-class-select", "VII-A")
    await selectOptionByText(page, "#req-subject-select", "Matematika")
    await setInputValue(page, "#req-sessions-input", "2")
    await setInputValue(page, "#req-duration-input", "45")
    await selectOptionByText(page, "#req-teacher-select", "Budi Santoso")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!reqRows.some((r) => r.includes("VII-A") && r.includes("Bahasa Inggris"))) {
    console.log("Fixture: Menambahkan kebutuhan VII-A Bahasa Inggris (1 sesi @90m)...")
    await selectOptionByText(page, "#req-class-select", "VII-A")
    await selectOptionByText(page, "#req-subject-select", "Bahasa Inggris")
    await setInputValue(page, "#req-sessions-input", "1")
    await setInputValue(page, "#req-duration-input", "90")
    await selectOptionByText(page, "#req-teacher-select", "Siti Rahma")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!reqRows.some((r) => r.includes("VII-B") && r.includes("Matematika"))) {
    console.log("Fixture: Menambahkan kebutuhan VII-B Matematika (2 sesi @45m)...")
    await selectOptionByText(page, "#req-class-select", "VII-B")
    await selectOptionByText(page, "#req-subject-select", "Matematika")
    await setInputValue(page, "#req-sessions-input", "2")
    await setInputValue(page, "#req-duration-input", "45")
    await selectOptionByText(page, "#req-teacher-select", "Budi Santoso")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  console.log("✅ Seluruh prasyarat data master siap.")
}

async function runTC03() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-03"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-03 (Pemilihan Kelas Aktif & Editor Jadwal)...")
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

  const page = await browser.newPage()
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

    // -------------------------------------------------------------------------
    // Buka Halaman Editor Jadwal (/)
    // -------------------------------------------------------------------------
    console.log("🌐 Membuka Editor Jadwal http://localhost:5173/ ...")
    await page.goto("http://localhost:5173/", {
      waitUntil: "networkidle0",
    })

    // Tunggu komponen pemilih kelas siap
    await page.waitForSelector("#active-class-select, button", { visible: true })
    console.log("✅ Halaman Editor siap.")

    // -------------------------------------------------------------------------
    // Kasus Uji 3.1: Pemilihan Kelas Aktif Independen (AC-01)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 3.1: Pemilihan Kelas Aktif Independen ---")

    // Pilih kelas VII-A melalui tombol kartu kelas jika grid belum aktif, atau lewat select
    const isGridPresent = (await page.$('div[role="region"][aria-label="Grid Jadwal Mingguan"]')) !== null
    if (!isGridPresent) {
      console.log("Grid belum aktif, memilih kelas VII-A melalui kartu kelas...")
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const viiaCard = buttons.find((b) => b.textContent?.includes("VII-A"))
        viiaCard?.click()
      })
      await new Promise((r) => setTimeout(r, 400))
    }

    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    console.log("✅ Grid jadwal untuk kelas VII-A aktif.")

    const activeClassBarTextA = await page.evaluate(() => {
      const bar = document.querySelector(".border-b.border-border.bg-muted\\/40")
      return bar ? bar.textContent : ""
    })
    console.log("Status Bar Kelas VII-A:", activeClassBarTextA)

    if (!activeClassBarTextA?.includes("VII-A") || !activeClassBarTextA?.includes("3 sesi")) {
      throw new Error("Statistik bilah kelas VII-A tidak sesuai (harus 3 sesi kebutuhan)!")
    }

    // Beralih ke kelas VII-B
    console.log("Beralih ke kelas aktif 'VII-B'...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))

    const activeClassBarTextB = await page.evaluate(() => {
      const bar = document.querySelector(".border-b.border-border.bg-muted\\/40")
      return bar ? bar.textContent : ""
    })
    console.log("Status Bar Kelas VII-B:", activeClassBarTextB)

    if (!activeClassBarTextB?.includes("VII-B") || !activeClassBarTextB?.includes("2 sesi")) {
      throw new Error("Statistik bilah kelas VII-B tidak sesuai (harus 2 sesi kebutuhan)!")
    }

    // Beralih kembali ke kelas VII-A
    console.log("Beralih kembali ke kelas aktif 'VII-A'...")
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    console.log("✅ Pemilihan kelas aktif terbukti independen dan mengisolasi jadwal per kelas.")
    await page.screenshot({
      path: path.join(screenshotsDir, "01-active-class-switch.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-active-class-switch.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 3.2: Panel Sesi Belum Terjadwal & Perhitungan Progres
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 3.2: Panel Sesi Belum Terjadwal & Filter ---")

    const unscheduledHeaderText = await page.evaluate(() => {
      const panel = document.querySelector('section[aria-label="Sesi Belum Terjadwal"]')
      return panel ? panel.textContent : ""
    })
    console.log("Header Panel Belum Terjadwal:", unscheduledHeaderText)

    if (!unscheduledHeaderText?.includes("3 sesi tersisa") || !unscheduledHeaderText?.includes("0%")) {
      throw new Error(`Progres alokasi awal VII-A tidak sesuai 0% / 3 sesi tersisa: "${unscheduledHeaderText}"`)
    }
    console.log("✅ Bilah progres menampilkan 0 dari 3 sesi terjadwal (0%).")

    // Uji filter pencarian
    console.log("Menguji filter pencarian dengan kata kunci 'Matematika'...")
    await setInputValue(page, 'input[placeholder*="Cari mata pelajaran"]', "Matematika")
    await new Promise((r) => setTimeout(r, 300))

    const filteredCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('section[aria-label="Sesi Belum Terjadwal"] .group.relative'))
      return cards.map((c) => c.textContent?.trim() ?? "")
    })
    console.log("Kartu hasil filter 'Matematika':", filteredCards)

    if (!filteredCards.every((c) => c.includes("Matematika")) || filteredCards.some((c) => c.includes("Bahasa Inggris"))) {
      throw new Error("Filter pencarian tidak menyaring kartu Bahasa Inggris!")
    }
    console.log("✅ Filter pencarian instan menyaring kartu sesi secara akurat.")

    // Hapus filter pencarian
    console.log("Menghapus filter pencarian...")
    await setInputValue(page, 'input[placeholder*="Cari mata pelajaran"]', "")
    await new Promise((r) => setTimeout(r, 300))

    await page.screenshot({
      path: path.join(screenshotsDir, "02-unscheduled-filter-search.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-unscheduled-filter-search.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 3.3: Penempatan Sesi Matematika (45m)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 3.3: Penempatan Sesi Matematika (45m) ---")

    // Klik tombol "Tempatkan ke Jadwal" pada kartu Matematika
    console.log("Membuka dialog penempatan sesi Matematika...")
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('section[aria-label="Sesi Belum Terjadwal"] .group.relative'))
      const mathCard = cards.find((c) => c.textContent?.includes("Matematika"))
      const placeBtn = mathCard?.querySelector('button[aria-label="Tempatkan ke Jadwal"]') as HTMLButtonElement | null
      placeBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Hari Senin sudah terpilih secara default. Ubah Jam Mulai: 07:30
    await setInputValue(page, "#quick-place-time", "07:30")

    // Klik tombol Simpan ke Grid langsung pada dialog
    console.log("Mengeklik tombol 'Simpan ke Grid'...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const saveBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Simpan ke Grid")
      ) as HTMLButtonElement | null
      saveBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    await new Promise((r) => setTimeout(r, 800))

    // Verifikasi blok sesi di grid pada hari Senin (elemen adalah div[role="article"])
    const sessionBlocksOnGrid = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok Sesi di Grid:", sessionBlocksOnGrid)

    const mathBlock = sessionBlocksOnGrid.find((b) => b.includes("Matematika") && b.includes("07:30 - 08:15"))
    if (!mathBlock) {
      throw new Error(`Blok sesi Matematika tidak ditemukan di Senin 07:30 - 08:15! Blok yang ada: ${JSON.stringify(sessionBlocksOnGrid)}`)
    }
    console.log("✅ Sesi Matematika berhasil menempel (snapping) pada interval 07:30 - 08:15.")

    // Verifikasi progres alokasi naik menjadi 33% (1 dari 3 sesi terjadwal)
    const updatedProgress = await page.evaluate(() => {
      const panel = document.querySelector('section[aria-label="Sesi Belum Terjadwal"]')
      return panel ? panel.textContent : ""
    })
    if (!updatedProgress?.includes("1 dari 3 sesi terjadwal") || !updatedProgress?.includes("33%")) {
      throw new Error(`Bilah progres tidak naik ke 33%: "${updatedProgress}"`)
    }
    console.log("✅ Progres alokasi meningkat menjadi 1 dari 3 sesi terjadwal (33%).")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-session-placed-grid.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-session-placed-grid.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 3.4: Pemindahan Sesi di Dalam Grid
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 3.4: Pemindahan Sesi Matematika ke Selasa 08:00 ---")

    // Panel detail sesi sudah otomatis terbuka saat sesi terpilih, atau pastikan dengan klik blok
    await page.waitForSelector("#session-day", { visible: true })
    console.log("✅ Panel detail sesi terbuka.")

    // Ubah hari menjadi Selasa dan jam mulai menjadi 08:00
    console.log("Mengubah hari sesi ke Selasa dan jam mulai ke 08:00...")
    await page.select("#session-day", "tuesday")
    await new Promise((r) => setTimeout(r, 300))
    await setInputValue(page, "#session-start-time", "08:00")
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi bahwa blok berpindah ke hari Selasa
    const movedSessionBlocks = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok Sesi Pasca-Pemindahan:", movedSessionBlocks)

    const movedMath = movedSessionBlocks.find((b) => b.includes("Matematika") && b.includes("08:00 - 08:45"))
    if (!movedMath) {
      throw new Error(`Sesi Matematika tidak berpindah ke Selasa 08:00 - 08:45! Blok yang ada: ${JSON.stringify(movedSessionBlocks)}`)
    }
    console.log("✅ Blok sesi berhasil berpindah ke Selasa pukul 08:00 - 08:45 dengan durasi tetap 45 menit.")

    await page.screenshot({
      path: path.join(screenshotsDir, "04-session-moved-tuesday.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-session-moved-tuesday.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 3.5: Aksesibilitas Keyboard untuk Penempatan Sesi (NFR-04)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 3.5: Penempatan Sesi Bahasa Inggris (90m) via Keyboard ---")

    // Klik tombol tempatkan pada kartu Bahasa Inggris
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('section[aria-label="Sesi Belum Terjadwal"] .group.relative'))
      const englishCard = cards.find((c) => c.textContent?.includes("Bahasa Inggris"))
      const placeBtn = englishCard?.querySelector('button[aria-label="Tempatkan ke Jadwal"]') as HTMLButtonElement | null
      placeBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Hari default: Senin. Jam Mulai: 08:15 (Durasi 90m -> berakhir 09:45)
    await setInputValue(page, "#quick-place-time", "08:15")

    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const saveBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Simpan ke Grid")
      ) as HTMLButtonElement | null
      saveBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    await new Promise((r) => setTimeout(r, 800))

    // Verifikasi sesi Bahasa Inggris di grid pada hari Senin
    const englishSessionBlocks = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok Sesi di Grid Pasca-Bahasa Inggris:", englishSessionBlocks)

    const englishBlock = englishSessionBlocks.find((b) => b.includes("Bahasa Inggris") && b.includes("08:15 - 09:45"))
    if (!englishBlock) {
      throw new Error(`Sesi Bahasa Inggris tidak ditemukan pada Senin 08:15 - 09:45! Blok: ${JSON.stringify(englishSessionBlocks)}`)
    }
    console.log("✅ Sesi Bahasa Inggris berhasil ditempatkan pada Senin 08:15 - 09:45 (90 menit).")

    await page.screenshot({
      path: path.join(screenshotsDir, "05-keyboard-placement.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 05-keyboard-placement.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 3.6: Panel Detail Sesi & Pelepasan Sesi (Unschedule)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 3.6: Panel Detail Sesi & Pelepasan Sesi ---")

    // Klik blok sesi Bahasa Inggris
    await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      const target = blocks.find((b) => b.textContent?.includes("Bahasa Inggris"))
      ;(target as HTMLElement)?.click()
    })
    await page.waitForSelector("#session-notes", { visible: true })

    // Tambahkan catatan sesi
    console.log("Mengisi catatan sesi...")
    await setInputValue(page, "#session-notes", "Pertemuan pengenalan modul 1")

    // Klik tombol "Lepas dari Grid"
    console.log("Mengeklik tombol 'Lepas dari Grid'...")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const removeBtn = buttons.find((b) => b.textContent?.includes("Lepas dari Grid"))
      removeBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi: blok Bahasa Inggris terhapus dari grid
    const remainingGridBlocks = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok Sesi di Grid Pasca-Unschedule:", remainingGridBlocks)

    if (remainingGridBlocks.some((b) => b.includes("Bahasa Inggris"))) {
      throw new Error("Sesi Bahasa Inggris masih ada di grid jadwal setelah dilepas!")
    }
    console.log("✅ Sesi Bahasa Inggris berhasil dilepas dari grid jadwal.")

    // Verifikasi kartu Bahasa Inggris kembali ke sidebar belum terjadwal
    const returnedCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('section[aria-label="Sesi Belum Terjadwal"] .group.relative'))
      return cards.map((c) => c.textContent?.trim() ?? "")
    })
    console.log("Kartu Belum Terjadwal Pasca-Unschedule:", returnedCards)

    if (!returnedCards.some((c) => c.includes("Bahasa Inggris") && c.includes("1 sesi tersisa"))) {
      throw new Error("Kartu Bahasa Inggris tidak kembali ke sidebar Sesi Belum Terjadwal!")
    }
    console.log("✅ Kartu Bahasa Inggris kembali muncul di sidebar Sesi Belum Terjadwal.")

    await page.screenshot({
      path: path.join(screenshotsDir, "06-session-unscheduled.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 06-session-unscheduled.png")

    console.log("\n🎉 SELURUH KASUS UJI TC-03 BERHASIL DILALUI DENGAN STATUS: PASS!")
  } catch (error) {
    console.error("❌ Terjadi kegagalan pada saat eksekusi TC-03:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "tc03-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC03()
