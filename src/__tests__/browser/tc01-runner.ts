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
  await new Promise((r) => setTimeout(r, 100))
}

async function runTC01() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-01"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-01...")
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
    // Prasyarat: Pastikan ada 1 Kelas aktif agar TimetableGrid dapat dirender di Editor
    // -------------------------------------------------------------------------
    console.log("🌐 Memeriksa data kelas awal di http://localhost:5173/master-data...")
    await page.goto("http://localhost:5173/master-data", {
      waitUntil: "networkidle0",
    })

    await page.waitForSelector("#class-name-input", { visible: true })

    const existingClassCount = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tbody tr")
      return rows.length
    })

    if (existingClassCount === 0) {
      console.log("Mendaftarkan kelas awal 'VII-A' agar grid jadwal dapat aktif...")
      await setInputValue(page, "#class-name-input", "VII-A")
      await setInputValue(page, "#class-grade-input", "VII")
      const submitBtn = await page.$('form button[type="submit"]')
      await submitBtn?.click()
      await new Promise((r) => setTimeout(r, 600))
      console.log("✅ Kelas 'VII-A' berhasil dibuat.")
    } else {
      console.log(`✅ Sudah terdapat ${existingClassCount} kelas pada data master.`)
    }

    // -------------------------------------------------------------------------
    // Buka Halaman Pengaturan Ruang Kerja
    // -------------------------------------------------------------------------
    console.log("🌐 Membuka http://localhost:5173/settings...")
    await page.click('nav a[href="/settings"]')
    await page.waitForSelector("#workspace-name-input", { visible: true })
    console.log("✅ Halaman Pengaturan terhidrasi.")

    // -------------------------------------------------------------------------
    // Kasus Uji 1.1: Pembaruan Identitas Ruang Kerja
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 1.1: Pembaruan Identitas Ruang Kerja ---")

    await setInputValue(page, "#workspace-name-input", "SMP Negeri 1 Unggulan Nusantara")
    await setInputValue(page, "#workspace-period-input", "Semester Genap 2026/2027")

    // Beri jeda debounce/auto-save IndexedDB
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi teks di Header
    const headerText = await page.evaluate(() => {
      const header = document.querySelector("header")
      return header ? header.textContent : ""
    })
    console.log("Teks Header Terdeteksi:", headerText)

    if (
      !headerText?.includes("SMP Negeri 1 Unggulan Nusantara") ||
      !headerText?.includes("Semester Genap 2026/2027")
    ) {
      throw new Error("Header tidak menampilkan identitas ruang kerja yang baru!")
    }
    console.log("✅ Header langsung terperbarui dengan nama & periode baru.")

    // Periksa status badge
    const badgeText = await page.evaluate(() => {
      const badge = document.querySelector('button[role="status"]')
      return badge ? badge.textContent : ""
    })
    console.log("Status Penyimpanan:", badgeText)

    await page.screenshot({
      path: path.join(screenshotsDir, "01-workspace-identity.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-workspace-identity.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 1.2: Konfigurasi Hari Sekolah & Jam Belajar
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 1.2: Konfigurasi Jam Belajar & Hari Aktif ---")

    // Ubah jam mulai Senin -> 07:00
    await setInputValue(page, "#start-time-monday", "07:00")

    // Ubah jam selesai Senin -> 15:00
    await setInputValue(page, "#end-time-monday", "15:00")

    // Nonaktifkan switch hari Sabtu jika aktif
    const saturdaySwitch = await page.$("#switch-school-day-saturday")
    if (!saturdaySwitch) throw new Error("#switch-school-day-saturday tidak ditemukan")
    const isSaturdayActive = await page.evaluate((el) => {
      return el.getAttribute("aria-checked") === "true"
    }, saturdaySwitch)

    if (isSaturdayActive) {
      console.log("Menonaktifkan hari Sabtu...")
      await saturdaySwitch.click()
      await new Promise((r) => setTimeout(r, 400))
    }

    const saturdayStatusText = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="day-config-row-saturday"]')
      return row ? row.textContent : ""
    })
    console.log("Status Hari Sabtu di UI:", saturdayStatusText?.includes("Libur / Nonaktif") ? "Libur / Nonaktif" : "Aktif")

    await page.screenshot({
      path: path.join(screenshotsDir, "02-day-config-settings.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-day-config-settings.png")

    // Buka Editor Jadwal (/) untuk verifikasi grid
    console.log("Navigasi ke Editor Jadwal (/) untuk verifikasi grid...")
    await page.click('nav a[href="/"]')
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await new Promise((r) => setTimeout(r, 500))

    // Evaluasi kolom hari yang muncul di grid
    const renderedDays = await page.evaluate(() => {
      const grid = document.querySelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]')
      if (!grid) return []
      const headers = grid.querySelectorAll(".font-heading.text-xs.font-semibold")
      return Array.from(headers).map((h) => h.textContent?.trim())
    })
    console.log("Hari yang muncul di grid jadwal:", renderedDays)

    if (renderedDays.includes("Sabtu")) {
      throw new Error("Hari Sabtu seharusnya TIDAK muncul di grid karena telah dinonaktifkan!")
    }
    if (!renderedDays.includes("Senin") || !renderedDays.includes("Jumat")) {
      throw new Error("Hari aktif Senin-Jumat tidak lengkap di grid!")
    }
    console.log("✅ Hari Sabtu berhasil dihilangkan dari grid. Hanya hari aktif (Senin s.d. Jumat) yang muncul.")

    // Verifikasi jam operasional Senin di grid
    const mondaySubHeader = await page.evaluate(() => {
      const grid = document.querySelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]')
      const mondayColHeader = grid?.querySelector(".text-\\[10px\\].tabular-nums")
      return mondayColHeader ? mondayColHeader.textContent?.trim() : ""
    })
    console.log("Sub-header jam hari pertama:", mondaySubHeader)
    if (!mondaySubHeader?.includes("07:00 - 15:00")) {
      throw new Error(`Jam Senin di grid (${mondaySubHeader}) tidak sesuai '07:00 - 15:00'!`)
    }
    console.log("✅ Jam Senin di grid menampilkan 07:00 - 15:00.")

    await page.screenshot({
      path: path.join(screenshotsDir, "02-editor-grid-five-days.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-editor-grid-five-days.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 1.3: Pengelolaan Waktu Istirahat (Break Intervals)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 1.3: Pengelolaan Waktu Istirahat & Validasi Bentrok ---")

    // Kembali ke /settings
    await page.click('nav a[href="/settings"]')
    await page.waitForSelector('[data-testid="day-config-row-monday"]', { visible: true })
    await new Promise((r) => setTimeout(r, 400))

    // Bersihkan dulu istirahat lama di hari Senin jika ada (agar bersih dan sesuai skenario)
    await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const deleteButtons = monday?.querySelectorAll('button[aria-label*="Hapus"]')
      deleteButtons?.forEach((btn) => (btn as HTMLButtonElement).click())
    })
    await new Promise((r) => setTimeout(r, 500))

    // Klik tombol "Tambah Waktu Istirahat" pertama pada kartu Senin
    await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const btn = Array.from(monday?.querySelectorAll("button") || []).find((b) =>
        b.textContent?.includes("Tambah Waktu Istirahat")
      )
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    // Cari break item 1 di Senin
    let breakInputs = await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const inputs = monday?.querySelectorAll('input[id^="break-label-"]')
      return Array.from(inputs || []).map((inp) => inp.id)
    })
    console.log("Break Item 1 ID:", breakInputs[0])

    const break1Id = breakInputs[0].replace("break-label-", "")
    await setInputValue(page, `#break-label-${break1Id}`, "Istirahat Pertama")
    await setInputValue(page, `#break-start-${break1Id}`, "09:30")
    await setInputValue(page, `#break-end-${break1Id}`, "10:00")

    // Tambah Break Item ke-2
    await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const btn = Array.from(monday?.querySelectorAll("button") || []).find((b) =>
        b.textContent?.includes("Tambah Waktu Istirahat")
      )
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    breakInputs = await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const inputs = monday?.querySelectorAll('input[id^="break-label-"]')
      return Array.from(inputs || []).map((inp) => inp.id)
    })
    console.log("Break Item 2 ID:", breakInputs[1])

    const break2Id = breakInputs[1].replace("break-label-", "")
    await setInputValue(page, `#break-label-${break2Id}`, "Istirahat Sholat & Makan")
    await setInputValue(page, `#break-start-${break2Id}`, "11:45")
    await setInputValue(page, `#break-end-${break2Id}`, "12:30")

    // Tambah Break Item ke-3 yang sengaja bentrok (12:00 - 12:45)
    await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const btn = Array.from(monday?.querySelectorAll("button") || []).find((b) =>
        b.textContent?.includes("Tambah Waktu Istirahat")
      )
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))

    breakInputs = await page.evaluate(() => {
      const monday = document.querySelector('[data-testid="day-config-row-monday"]')
      const inputs = monday?.querySelectorAll('input[id^="break-label-"]')
      return Array.from(inputs || []).map((inp) => inp.id)
    })
    console.log("Break Item 3 ID (Bentrok):", breakInputs[2])

    const break3Id = breakInputs[2].replace("break-label-", "")
    await setInputValue(page, `#break-label-${break3Id}`, "Istirahat Bentrok")
    await setInputValue(page, `#break-start-${break3Id}`, "12:00")
    await setInputValue(page, `#break-end-${break3Id}`, "12:45")

    await new Promise((r) => setTimeout(r, 600))

    // Periksa pesan error validasi tumpang tindih
    const errorMessages = await page.evaluate(() => {
      const alerts = document.querySelectorAll(".text-destructive")
      return Array.from(alerts).map((a) => a.textContent?.trim())
    })
    console.log("Pesan Error Validasi Terdeteksi:", errorMessages)

    const hasOverlapError = errorMessages.some((msg) =>
      msg?.includes("saling bertabrakan") || msg?.includes("tumpang tindih")
    )
    if (!hasOverlapError) {
      throw new Error("Pesan error bentrok interval istirahat tidak muncul di layar!")
    }
    console.log("✅ Validasi berhasil: Error bentrok interval istirahat terdeteksi secara visual.")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-break-overlap-error.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-break-overlap-error.png")

    // Hapus break ke-3 yang bentrok
    console.log("Menghapus istirahat ke-3 yang bertabrakan...")
    await page.evaluate((b3Id) => {
      const labelInp = document.getElementById(`break-label-${b3Id}`)
      const row = labelInp?.closest(".flex.flex-wrap.items-center.gap-2")
      const deleteBtn = row?.querySelector('button[aria-label*="Hapus"]') as HTMLButtonElement | null
      deleteBtn?.click()
    }, break3Id)
    await new Promise((r) => setTimeout(r, 600))

    await page.screenshot({
      path: path.join(screenshotsDir, "03-breaks-configured.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-breaks-configured.png")

    // Buka Editor Jadwal (/) untuk verifikasi arsiran break di grid
    console.log("Navigasi ke Editor Jadwal (/) untuk melihat zona istirahat di grid...")
    await page.click('nav a[href="/"]')
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await new Promise((r) => setTimeout(r, 500))

    const breakZoneLabels = await page.evaluate(() => {
      const breakZones = document.querySelectorAll('[class*="bg-amber-500/10"]')
      return Array.from(breakZones).map((b) => b.textContent?.trim())
    })
    console.log("Label Zona Istirahat di Kolom Grid:", breakZoneLabels)

    if (
      !breakZoneLabels.includes("Istirahat Pertama") ||
      !breakZoneLabels.includes("Istirahat Sholat & Makan")
    ) {
      throw new Error("Zona istirahat tidak tampil secara visual di grid jadwal!")
    }
    console.log("✅ Zona istirahat 'Istirahat Pertama' & 'Istirahat Sholat & Makan' terarsir dengan tepat di grid.")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-editor-break-intervals.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-editor-break-intervals.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 1.4: Pemulihan Data Setelah Muat Ulang Halaman (AC-12)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 1.4: Pemulihan Data Pasca-Reload (AC-12) ---")
    console.log("Melakukan refresh halaman (page.reload)...")
    await page.reload({ waitUntil: "networkidle0" })
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await new Promise((r) => setTimeout(r, 800))

    // Verifikasi Header setelah reload
    const reloadedHeaderText = await page.evaluate(() => {
      const header = document.querySelector("header")
      return header ? header.textContent : ""
    })
    if (
      !reloadedHeaderText?.includes("SMP Negeri 1 Unggulan Nusantara") ||
      !reloadedHeaderText?.includes("Semester Genap 2026/2027")
    ) {
      throw new Error("Pasca-reload: Header kehilangan identitas yang baru disimpan!")
    }
    console.log("✅ Pasca-reload: Header mempertahankan nama sekolah & semester.")

    // Verifikasi Grid pasca-reload
    const reloadedGridDays = await page.evaluate(() => {
      const grid = document.querySelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]')
      if (!grid) return []
      const headers = grid.querySelectorAll(".font-heading.text-xs.font-semibold")
      return Array.from(headers).map((h) => h.textContent?.trim())
    })
    if (reloadedGridDays.includes("Sabtu")) {
      throw new Error("Pasca-reload: Hari Sabtu muncul kembali padahal telah dinonaktifkan!")
    }
    console.log("✅ Pasca-reload: Hari Sabtu tetap nonaktif pada grid.")

    const reloadedBreakZones = await page.evaluate(() => {
      const breakZones = document.querySelectorAll('[class*="bg-amber-500/10"]')
      return Array.from(breakZones).map((b) => b.textContent?.trim())
    })
    if (
      !reloadedBreakZones.includes("Istirahat Pertama") ||
      !reloadedBreakZones.includes("Istirahat Sholat & Makan")
    ) {
      throw new Error("Pasca-reload: Zona istirahat hilang dari grid!")
    }
    console.log("✅ Pasca-reload: Kedua zona istirahat Senin tetap utuh.")

    // Buka Settings untuk konfirmasi form inputs
    await page.click('nav a[href="/settings"]')
    await page.waitForSelector("#workspace-name-input", { visible: true })
    await new Promise((r) => setTimeout(r, 400))

    const reloadedFormState = await page.evaluate(() => {
      const name = (document.getElementById("workspace-name-input") as HTMLInputElement)?.value
      const period = (document.getElementById("workspace-period-input") as HTMLInputElement)?.value
      const saturdaySwitch = document.getElementById("switch-school-day-saturday")
      const satActive = saturdaySwitch?.getAttribute("aria-checked") === "true"
      const mondayStart = (document.getElementById("start-time-monday") as HTMLInputElement)?.value
      const mondayEnd = (document.getElementById("end-time-monday") as HTMLInputElement)?.value
      const mondayBreaks = Array.from(
        document.querySelectorAll('[data-testid="day-config-row-monday"] input[id^="break-label-"]')
      ).map((inp) => (inp as HTMLInputElement).value)

      return { name, period, satActive, mondayStart, mondayEnd, mondayBreaks }
    })

    console.log("Data Form di /settings Pasca-Reload:", reloadedFormState)

    if (
      reloadedFormState.name !== "SMP Negeri 1 Unggulan Nusantara" ||
      reloadedFormState.period !== "Semester Genap 2026/2027" ||
      reloadedFormState.satActive !== false ||
      reloadedFormState.mondayStart !== "07:00" ||
      reloadedFormState.mondayEnd !== "15:00" ||
      reloadedFormState.mondayBreaks.length !== 2
    ) {
      throw new Error("Pasca-reload: Nilai form pada /settings tidak cocok dengan yang disimpan di IndexedDB!")
    }

    console.log("✅ Seluruh data 100% pulih dari IndexedDB tanpa kehilangan.")

    await page.screenshot({
      path: path.join(screenshotsDir, "04-recovered-after-reload.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-recovered-after-reload.png")

    console.log("\n🎉 SELURUH KASUS UJI TC-01 BERHASIL DILALUI DENGAN STATUS: PASS!")
  } catch (error) {
    console.error("❌ Terjadi kegagalan pada saat eksekusi TC-01:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "tc01-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC01()
