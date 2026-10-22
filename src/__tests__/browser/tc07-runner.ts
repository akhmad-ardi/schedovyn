import puppeteer from "puppeteer-core"
import * as path from "node:path"
import * as fs from "node:fs"
import * as XLSX from "xlsx"

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

  if (!classRows.some((r) => r.includes("VII-B"))) {
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
    await setInputValue(page, "#subject-name-input", "Matematika")
    await selectOptionByText(page, "#subject-color-select", "Biru")
    await page.click('form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!subjectRows.some((r) => r.includes("Bahasa Inggris"))) {
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
    await setInputValue(page, "#teacher-name-input", "Budi Santoso, S.Pd.")
    await setInputValue(page, "#teacher-notes-input", "Guru Kelas VII-A")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!teacherRows.some((r) => r.includes("Siti Rahma"))) {
    await setInputValue(page, "#teacher-name-input", "Siti Rahma, M.Pd.")
    await setInputValue(page, "#teacher-notes-input", "Guru Kelas VII-B")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  // 4. Periksa Ruangan
  await switchMasterDataTab(page, "Ruangan")
  await page.waitForSelector("#room-name-input", { visible: true })
  const roomRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!roomRows.some((r) => r.includes("Ruang Teori 1"))) {
    await setInputValue(page, "#room-name-input", "Ruang Teori 1")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Ruangan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  // 5. Periksa Kebutuhan Pembelajaran
  await switchMasterDataTab(page, "Kebutuhan Pembelajaran")
  await page.waitForSelector("#req-class-select", { visible: true })
  const reqRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!reqRows.some((r) => r.includes("VII-A") && r.includes("Matematika"))) {
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

  if (!reqRows.some((r) => r.includes("VII-B") && r.includes("Matematika"))) {
    await selectOptionByText(page, "#req-class-select", "VII-B")
    await selectOptionByText(page, "#req-subject-select", "Matematika")
    await setInputValue(page, "#req-sessions-input", "2")
    await setInputValue(page, "#req-duration-input", "45")
    await selectOptionByText(page, "#req-teacher-select", "Siti Rahma")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  console.log("✅ Seluruh prasyarat data master TC-07 siap.")
}

async function placeSessionQuick(
  page: puppeteer.Page,
  subjectName: string,
  startTime: string
) {
  await page.evaluate((sub) => {
    const cards = Array.from(document.querySelectorAll('section[aria-label="Sesi Belum Terjadwal"] .group.relative'))
    const target = cards.find((c) => c.textContent?.includes(sub))
    const btn = target?.querySelector('button[aria-label="Tempatkan ke Jadwal"]') as HTMLButtonElement | null
    btn?.click()
  }, subjectName)

  await page.waitForSelector('div[role="dialog"]', { visible: true })
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

async function waitForDownloadedFile(
  dir: string,
  extension: string,
  timeoutMs = 8000
): Promise<string> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      const matching = files.find(
        (f) => f.endsWith(extension) && !f.endsWith(".crdownload")
      )
      if (matching) return path.join(dir, matching)
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(
    `Berkas dengan ekstensi ${extension} tidak ditemukan di direktori download ${dir} setelah ${timeoutMs}ms`
  )
}

function cleanDownloadDir(dir: string) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      fs.unlinkSync(path.join(dir, f))
    }
  }
}

async function runTC07() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-07"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  const downloadTempDir = path.resolve(
    process.cwd(),
    "docs/test/downloads-tc07-temp"
  )
  fs.mkdirSync(downloadTempDir, { recursive: true })
  cleanDownloadDir(downloadTempDir)

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-07 (Client Export PDF & Excel)...")
  console.log("📁 Direktori Screenshot:", screenshotsDir)
  console.log("📁 Direktori Download Temp:", downloadTempDir)

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

  // Setup CDP Download Behavior
  const cdpSession = await page.target().createCDPSession()
  await cdpSession.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadTempDir,
  })

  // Network Monitoring untuk NFR-03 (Zero-Backend & Privasi 100%)
  const externalRequests: string[] = []
  page.on("request", (req) => {
    const url = req.url()
    if (
      !url.startsWith("http://localhost:5173") &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      externalRequests.push(url)
      console.warn(`⚠️ [External Request Terdeteksi]: ${url}`)
    }
  })

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
    await page.waitForSelector("#active-class-select, button", { visible: true })

    // Pastikan kelas VII-A aktif
    const isGridPresent = (await page.$('div[role="region"][aria-label="Grid Jadwal Mingguan"]')) !== null
    if (!isGridPresent) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const viiaCard = buttons.find((b) => b.textContent?.includes("VII-A"))
        viiaCard?.click()
      })
      await new Promise((r) => setTimeout(r, 400))
    }
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Bersihkan sesi di VII-A dan VII-B agar kondisi awal bersih
    console.log("Membersihkan sesi di kelas VII-A...")
    await clearGridSessions(page)

    console.log("Beralih ke kelas VII-B dan membersihkan sesi...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))
    await clearGridSessions(page)

    // Beralih kembali ke VII-A
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Susun 1 sesi di kelas VII-A bebas konflik:
    // Sesi 1: Matematika di Senin 07:30 (Budi Santoso)
    console.log("VII-A: Menempatkan Matematika di Senin 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30")

    // -------------------------------------------------------------------------
    // Kasus Uji 7.1: Ekspor PDF Kelas Aktif Bebas Konflik (AC-09, NFR-03)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 7.1: Ekspor PDF Kelas Aktif Bebas Konflik ---")
    cleanDownloadDir(downloadTempDir)
    externalRequests.length = 0

    console.log("Membuka dialog Ekspor PDF dari toolbar...")
    await page.click('button[aria-label="Ekspor PDF"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Verifikasi dialog Ekspor PDF
    const pdfDialogState = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const title = dialog?.querySelector("h2")?.textContent?.trim() ?? ""
      const scopeActiveRadio = document.querySelector("#scope-active") as HTMLInputElement | null
      const destructiveAlert = dialog?.querySelector(".bg-destructive\\/10")
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Unduh Dokumen PDF")
      ) as HTMLButtonElement | null

      return {
        title,
        isScopeActiveChecked: scopeActiveRadio?.checked ?? false,
        hasConflictAlert: !!destructiveAlert,
        submitBtnText: submitBtn?.textContent?.trim() ?? "",
        isSubmitDisabled: submitBtn?.disabled ?? true,
      }
    })

    console.log("Status Dialog PDF Kasus 7.1:", pdfDialogState)

    if (!pdfDialogState.title.includes("Ekspor Jadwal ke PDF")) {
      throw new Error(`Judul dialog tidak sesuai: "${pdfDialogState.title}"`)
    }
    if (!pdfDialogState.isScopeActiveChecked) {
      throw new Error("Radio 'Kelas Aktif' harus terpilih secara default!")
    }
    if (pdfDialogState.hasConflictAlert) {
      throw new Error("Kotak peringatan konflik tidak boleh muncul pada jadwal bebas konflik!")
    }
    if (!pdfDialogState.submitBtnText.includes("Unduh Dokumen PDF")) {
      throw new Error(`Teks tombol unduh tidak sesuai: "${pdfDialogState.submitBtnText}"`)
    }

    // Ambil screenshot Kasus 7.1
    await page.screenshot({
      path: path.join(screenshotsDir, "01-export-pdf-active-class.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-export-pdf-active-class.png")

    // Klik tombol "Unduh Dokumen PDF"
    console.log("Mengeklik tombol 'Unduh Dokumen PDF'...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Unduh Dokumen PDF")
      ) as HTMLButtonElement | null
      submitBtn?.click()
    })

    // Tunggu dialog tertutup
    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    console.log("✅ Dialog PDF berhasil ditutup pasca-unduh.")

    // Tunggu berkas PDF terunduh
    const downloadedPdfPath = await waitForDownloadedFile(downloadTempDir, ".pdf", 8000)
    const downloadedPdfName = path.basename(downloadedPdfPath)
    console.log(`✅ Berkas PDF berhasil diunduh: ${downloadedPdfName}`)

    if (!downloadedPdfName.includes("VII-A") || !downloadedPdfName.endsWith(".pdf")) {
      throw new Error(`Nama berkas PDF unduhan tidak sesuai format: ${downloadedPdfName}`)
    }

    // Verifikasi Privasi 100% / Zero-Backend (NFR-03)
    console.log(`Jumlah Network Request Eksternal: ${externalRequests.length}`)
    if (externalRequests.length > 0) {
      throw new Error(`NFR-03 Dilanggar! Ditemukan pemanggilan keluar: ${externalRequests.join(", ")}`)
    }
    console.log("✅ NFR-03 Terpenuhi: 0 Network Request ke pihak luar (100% lokal via jsPDF).")

    // -------------------------------------------------------------------------
    // Kasus Uji 7.2: Ekspor PDF Seluruh Kelas dengan Lampiran Konflik (AC-11)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 7.2: Ekspor PDF Seluruh Kelas dengan Lampiran Konflik ---")
    cleanDownloadDir(downloadTempDir)

    // Buat bentrokan guru antara VII-A dan VII-B di Senin 07:30
    console.log("Beralih ke kelas VII-B untuk membuat konflik guru Budi Santoso...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))

    // Tempatkan Matematika di VII-B di Senin 07:30
    await placeSessionQuick(page, "Matematika", "07:30")

    // Ubah guru sesi VII-B menjadi Budi Santoso agar bentrok dengan VII-A
    console.log("Mengubah guru sesi VII-B menjadi Budi Santoso...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Blok Sesi"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-teacher", { visible: true })

    await page.evaluate(() => {
      const teacherSelect = document.querySelector("#session-teacher") as HTMLSelectElement | null
      if (teacherSelect) {
        const budiOpt = Array.from(teacherSelect.options).find((opt) =>
          opt.textContent?.includes("Budi Santoso")
        )
        if (budiOpt) {
          teacherSelect.value = budiOpt.value
          teacherSelect.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }
      const applyBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Terapkan Guru")
      ) as HTMLButtonElement | null
      applyBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // Verifikasi konflik terdeteksi di status badge
    const conflictBadgeText = await page.evaluate(() => {
      return document.querySelector('[aria-label*="Bentrokan Waktu"]')?.textContent?.trim() ?? ""
    })
    console.log("Status Badge Konflik:", conflictBadgeText)

    // Buka dialog Ekspor PDF
    console.log("Membuka dialog Ekspor PDF...")
    await page.click('button[aria-label="Ekspor PDF"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Pilih Cakupan: "Seluruh Kelas"
    console.log("Memilih cakupan 'Seluruh Kelas'...")
    await page.click("#scope-workspace")
    await new Promise((r) => setTimeout(r, 400))

    // Periksa peringatan merah dan tombol Tetap Ekspor
    const workspacePdfState = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const destructiveAlert = dialog?.querySelector(".bg-destructive\\/10")
      const alertTitle = destructiveAlert?.querySelector("div")?.textContent?.trim() ?? ""
      const appendixCheckbox = document.querySelector("#include-appendix") as HTMLInputElement | null
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Tetap Ekspor PDF")
      ) as HTMLButtonElement | null

      return {
        hasAlert: !!destructiveAlert,
        alertTitle,
        isAppendixChecked: appendixCheckbox?.checked ?? false,
        submitBtnText: submitBtn?.textContent?.trim() ?? "",
        isSubmitDestructive: submitBtn?.className.includes("bg-destructive") || submitBtn?.className.includes("destructive"),
      }
    })

    console.log("Status Dialog PDF Seluruh Kelas (Konflik):", workspacePdfState)

    if (!workspacePdfState.hasAlert) {
      throw new Error("Peringatan merah (destructive alert) bentrokan waktu harus muncul!")
    }
    if (!workspacePdfState.submitBtnText.includes("Tetap Ekspor PDF dengan Peringatan Konflik")) {
      throw new Error(`Teks tombol unduh konflik tidak sesuai: "${workspacePdfState.submitBtnText}"`)
    }
    if (!workspacePdfState.isAppendixChecked) {
      throw new Error("Checkbox lampiran konflik harus otomatis tercentang saat ada konflik!")
    }

    // Ambil screenshot Kasus 7.2
    await page.screenshot({
      path: path.join(screenshotsDir, "02-export-pdf-with-conflicts.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-export-pdf-with-conflicts.png")

    // Eksekusi ekspor PDF dengan konflik
    console.log("Mengeklik tombol 'Tetap Ekspor PDF dengan Peringatan Konflik'...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Tetap Ekspor PDF")
      ) as HTMLButtonElement | null
      submitBtn?.click()
    })

    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    const conflictPdfPath = await waitForDownloadedFile(downloadTempDir, ".pdf", 8000)
    console.log(`✅ Berkas PDF Seluruh Kelas berhasil diunduh: ${path.basename(conflictPdfPath)}`)

    // -------------------------------------------------------------------------
    // Kasus Uji 7.3: Ekspor Excel Multi-Worksheet (.xlsx) (AC-10)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 7.3: Ekspor Excel Multi-Worksheet (.xlsx) ---")
    cleanDownloadDir(downloadTempDir)

    console.log("Membuka dialog Ekspor Excel dari toolbar...")
    await page.click('button[aria-label="Ekspor Excel"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Pilih Cakupan: "Seluruh Kelas"
    console.log("Memilih cakupan 'Seluruh Kelas' untuk Excel...")
    await page.click("#excel-scope-workspace")
    await new Promise((r) => setTimeout(r, 400))

    const excelDialogState = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const alertTitle = dialog?.querySelector(".bg-destructive\\/10")?.textContent?.trim() ?? ""
      const worksheetItems = Array.from(dialog?.querySelectorAll("ul li") ?? []).map((li) => li.textContent?.trim() ?? "")
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Tetap Ekspor")
      ) as HTMLButtonElement | null

      return {
        alertTitle,
        worksheetItems,
        submitBtnText: submitBtn?.textContent?.trim() ?? "",
      }
    })

    console.log("Status Dialog Excel Seluruh Kelas:", excelDialogState)

    if (!excelDialogState.alertTitle.includes("Peringatan Waktu")) {
      throw new Error(`Peringatan waktu pada Excel tidak muncul: "${excelDialogState.alertTitle}"`)
    }
    if (!excelDialogState.submitBtnText.includes("Tetap Ekspor dengan Peringatan")) {
      throw new Error(`Teks tombol unduh Excel tidak sesuai: "${excelDialogState.submitBtnText}"`)
    }

    // Ambil screenshot Kasus 7.3
    await page.screenshot({
      path: path.join(screenshotsDir, "03-export-excel-workspace.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-export-excel-workspace.png")

    // Klik tombol unduh Excel
    console.log("Mengeklik tombol unduh Excel...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Tetap Ekspor")
      ) as HTMLButtonElement | null
      submitBtn?.click()
    })

    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    const downloadedExcelPath = await waitForDownloadedFile(downloadTempDir, ".xlsx", 8000)
    console.log(`✅ Berkas Excel berhasil diunduh: ${path.basename(downloadedExcelPath)}`)

    // Validasi Struktur Spreadsheet dengan library 'xlsx' (SheetJS)
    console.log("Membedah struktur berkas spreadsheet yang diunduh...")
    const workbook = XLSX.readFile(downloadedExcelPath)
    console.log("Daftar Worksheet yang dihasilkan:", workbook.SheetNames)

    // Asersi Worksheet AC-10
    const expectedSheets = ["Jadwal", "Rekap Guru", "Rekap Ruangan", "Konflik"]
    for (const sheet of expectedSheets) {
      if (!workbook.SheetNames.includes(sheet)) {
        throw new Error(`Worksheet '${sheet}' tidak ditemukan di berkas Excel! Daftar: ${workbook.SheetNames.join(", ")}`)
      }
    }
    console.log("✅ Seluruh 4 worksheet wajib (Jadwal, Rekap Guru, Rekap Ruangan, Konflik) hadir.")

    // Verifikasi Kolom Durasi (Menit) bertipe numerik murni
    const scheduleSheet = workbook.Sheets["Jadwal"]
    const scheduleRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(scheduleSheet)
    console.log(`Jumlah baris data jadwal: ${scheduleRows.length}`)

    if (scheduleRows.length === 0) {
      throw new Error("Sheet Jadwal tidak boleh kosong!")
    }

    const firstRow = scheduleRows[0]
    console.log("Sampel Baris Sheet Jadwal:", firstRow)
    const durationVal = firstRow["Durasi (Menit)"]
    if (typeof durationVal !== "number") {
      throw new Error(`Kolom 'Durasi (Menit)' harus bertipe number numerik murni, didapat: ${typeof durationVal} (${durationVal})`)
    }
    console.log(`✅ Kolom 'Durasi (Menit)' terbukti bertipe numerik: ${durationVal} (${typeof durationVal}).`)

    // -------------------------------------------------------------------------
    // Kasus Uji 7.4: Pencegahan Spreadsheet Formula Injection (FR-09.3)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 7.4: Formula Injection Prevention ---")
    cleanDownloadDir(downloadTempDir)

    // Navigasi ke Data Master untuk mendaftarkan Guru "=SUM(1,2)" dan Ruangan "+628123456789"
    console.log("Navigasi ke /master-data untuk menambahkan entitas berkarakter formula injection...")
    await page.goto("http://localhost:5173/master-data", { waitUntil: "networkidle0" })
    await page.waitForSelector('button[role="tab"]', { visible: true })

    // 1. Tab Guru: Tambah Guru "=SUM(1,2)"
    await switchMasterDataTab(page, "Guru")
    await page.waitForSelector("#teacher-name-input", { visible: true })
    await setInputValue(page, "#teacher-name-input", "=SUM(1,2)")
    await setInputValue(page, "#teacher-notes-input", "Uji Sanitasi Formula")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // 2. Tab Ruangan: Tambah Ruangan "+628123456789"
    await switchMasterDataTab(page, "Ruangan")
    await page.waitForSelector("#room-name-input", { visible: true })
    await setInputValue(page, "#room-name-input", "+628123456789")
    await setInputValue(page, "#room-notes-input", "Uji Sanitasi Plus Prefix")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Ruangan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // Kembali ke Editor Jadwal
    console.log("Kembali ke Editor Jadwal / ...")
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" })
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Klik sesi di VII-A untuk mengaitkan guru "=SUM(1,2)" dan ruangan "+628123456789"
    console.log("Mengaitkan guru dan ruangan berkarakter formula ke sesi VII-A...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Blok Sesi"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-teacher", { visible: true })

    await page.evaluate(() => {
      const teacherSelect = document.querySelector("#session-teacher") as HTMLSelectElement | null
      if (teacherSelect) {
        const formulaTeacherOpt = Array.from(teacherSelect.options).find((opt) =>
          opt.textContent?.includes("=SUM(1,2)")
        )
        if (formulaTeacherOpt) {
          teacherSelect.value = formulaTeacherOpt.value
          teacherSelect.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }

      const roomSelect = document.querySelector("#session-room") as HTMLSelectElement | null
      if (roomSelect) {
        const formulaRoomOpt = Array.from(roomSelect.options).find((opt) =>
          opt.textContent?.includes("+628123456789")
        )
        if (formulaRoomOpt) {
          roomSelect.value = formulaRoomOpt.value
          roomSelect.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }

      const applyBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Terapkan Guru")
      ) as HTMLButtonElement | null
      applyBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // Buka dialog Ekspor Excel
    console.log("Membuka dialog Ekspor Excel...")
    await page.click('button[aria-label="Ekspor Excel"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Ambil screenshot Kasus 7.4
    await page.screenshot({
      path: path.join(screenshotsDir, "04-formula-injection-sanitized.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-formula-injection-sanitized.png")

    // Unduh berkas Excel
    console.log("Mengeklik unduh Excel untuk verifikasi sanitasi formula...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Unduh Berkas Excel") || b.textContent?.includes("Tetap Ekspor")
      ) as HTMLButtonElement | null
      submitBtn?.click()
    })

    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    const sanitizedExcelPath = await waitForDownloadedFile(downloadTempDir, ".xlsx", 8000)
    console.log(`✅ Berkas Excel berhasil diunduh: ${path.basename(sanitizedExcelPath)}`)

    // Baca dan verifikasi sanitasi formula
    const sanitizedWb = XLSX.readFile(sanitizedExcelPath)
    const sanitizedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sanitizedWb.Sheets["Jadwal"])
    console.log("Memeriksa baris data hasil sanitasi...")

    const targetRow = sanitizedRows.find((r) =>
      String(r["Guru"]).includes("SUM") || String(r["Ruangan"]).includes("628123456789")
    )

    console.log("Target Row Ditemukan:", targetRow)

    if (!targetRow) {
      throw new Error("Baris sesi dengan guru '=SUM(1,2)' atau ruangan '+628123456789' tidak ditemukan di Excel!")
    }

    const sanitizedTeacher = String(targetRow["Guru"])
    const sanitizedRoom = String(targetRow["Ruangan"])

    console.log(`Nilai Kolom Guru Tersimpan: "${sanitizedTeacher}"`)
    console.log(`Nilai Kolom Ruangan Tersimpan: "${sanitizedRoom}"`)

    if (!sanitizedTeacher.startsWith("'=SUM(1,2)")) {
      throw new Error(`Formula sanitasi gagal pada kolom Guru! Diharapkan '=SUM(1,2), didapat: "${sanitizedTeacher}"`)
    }
    if (!sanitizedRoom.startsWith("'+628123456789")) {
      throw new Error(`Formula sanitasi gagal pada kolom Ruangan! Diharapkan '+628123456789, didapat: "${sanitizedRoom}"`)
    }

    console.log("✅ FR-09.3 Terbukti: Nilai sel tersanitasi diawali kutip tunggal (') sehingga aman dari eksekusi formula!")

    // -------------------------------------------------------------------------
    // Pembersihan & Rollback Selesai
    // -------------------------------------------------------------------------
    console.log("\n🧹 Membersihkan sesi dan direktori download sementara...")
    cleanDownloadDir(downloadTempDir)
    fs.rmdirSync(downloadTempDir)

    console.log("\n=======================================================")
    console.log("🎉 SELURUH KASUS UJI TC-07 BERHASIL DILALUI DENGAN SUKSES (100% PASS)!")
    console.log("=======================================================\n")
  } catch (error) {
    console.error("❌ Terjadi kegagalan saat menjalankan TC-07:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "ERROR-tc07-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC07()
