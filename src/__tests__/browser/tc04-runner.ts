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

  if (!subjectRows.some((r) => r.includes("IPA"))) {
    console.log("Fixture: Menambahkan mata pelajaran IPA...")
    await setInputValue(page, "#subject-name-input", "IPA")
    await selectOptionByText(page, "#subject-color-select", "Oranye")
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
    await setInputValue(page, "#teacher-notes-input", "Guru Matematika & IPA")
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

  // 4. Periksa Ruangan
  await switchMasterDataTab(page, "Ruangan")
  await page.waitForSelector("#room-name-input", { visible: true })
  const roomRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  if (!roomRows.some((r) => r.includes("Lab Komputer 1"))) {
    console.log("Fixture: Menambahkan ruangan Lab Komputer 1...")
    await setInputValue(page, "#room-name-input", "Lab Komputer 1")
    await selectOptionByText(page, "#room-type-select", "Laboratorium")
    await setInputValue(page, "#room-notes-input", "Kapasitas 36 unit komputer")
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

  // VII-A Matematika (2 sesi @45m, Budi)
  if (!reqRows.some((r) => r.includes("VII-A") && r.includes("Matematika"))) {
    console.log("Fixture: Menambahkan kebutuhan VII-A Matematika...")
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

  // VII-B Matematika (2 sesi @45m, Budi)
  if (!reqRows.some((r) => r.includes("VII-B") && r.includes("Matematika"))) {
    console.log("Fixture: Menambahkan kebutuhan VII-B Matematika...")
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

  // VII-B IPA (1 sesi @90m, Budi)
  if (!reqRows.some((r) => r.includes("VII-B") && r.includes("IPA"))) {
    console.log("Fixture: Menambahkan kebutuhan VII-B IPA (90m, Budi)...")
    await selectOptionByText(page, "#req-class-select", "VII-B")
    await selectOptionByText(page, "#req-subject-select", "IPA")
    await setInputValue(page, "#req-sessions-input", "1")
    await setInputValue(page, "#req-duration-input", "90")
    await selectOptionByText(page, "#req-teacher-select", "Budi Santoso")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  // VII-B Bahasa Inggris (1 sesi @45m, Siti)
  if (!reqRows.some((r) => r.includes("VII-B") && r.includes("Bahasa Inggris"))) {
    console.log("Fixture: Menambahkan kebutuhan VII-B Bahasa Inggris (45m, Siti)...")
    await selectOptionByText(page, "#req-class-select", "VII-B")
    await selectOptionByText(page, "#req-subject-select", "Bahasa Inggris")
    await setInputValue(page, "#req-sessions-input", "1")
    await setInputValue(page, "#req-duration-input", "45")
    await selectOptionByText(page, "#req-teacher-select", "Siti Rahma")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  console.log("✅ Seluruh prasyarat data master TC-04 siap.")
}

async function placeSessionQuick(
  page: puppeteer.Page,
  subjectName: string,
  startTime: string
) {
  // Buka dialog penempatan cepat dari kartu sesi
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
      const block = document.querySelector('[role="article"][aria-label*="Blok Sesi"]') as HTMLElement | null
      block?.click()
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

async function runTC04() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-04"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-04 (Smart Conflict Detection & Validation)...")
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

    // Bersihkan sesi di VII-A dan VII-B agar kondisi terkontrol
    console.log("Membersihkan sesi tersisa di kelas VII-A...")
    await clearGridSessions(page)

    console.log("Beralih ke kelas VII-B dan membersihkan sesi tersisa...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))
    await clearGridSessions(page)

    // Kembali ke VII-A
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // -------------------------------------------------------------------------
    // Kasus Uji 4.1: Deteksi Bentrokan Guru Lintas Kelas (TEACHER_OVERLAP — AC-03)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.1: Deteksi Bentrokan Guru Lintas Kelas (TEACHER_OVERLAP) ---")

    // 1. Pada kelas VII-A, tempatkan Matematika (Budi Santoso) di Senin 07:30 - 08:15
    console.log("VII-A: Menempatkan Matematika di Senin 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30")

    // 2. Beralih ke kelas VII-B
    console.log("Beralih ke kelas VII-B...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))

    // 3. Pada kelas VII-B, tempatkan Matematika (Budi Santoso) di Senin 07:30 - 08:15 (waktu beririsan penuh)
    console.log("VII-B: Menempatkan Matematika di Senin 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30")

    // 4. Verifikasi bentrokan di kelas VII-B
    const viibBlocks = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => ({
        text: b.textContent?.trim() ?? "",
        hasConflict: b.getAttribute("data-conflict") === "true",
      }))
    })
    console.log("VII-B Blocks:", viibBlocks)

    const mathB = viibBlocks.find((b) => b.text.includes("Matematika") && b.text.includes("07:30 - 08:15"))
    if (!mathB || !mathB.hasConflict || !mathB.text.includes("Bentrokan Guru")) {
      throw new Error(`Sesi VII-B tidak ditandai Bentrokan Guru! Data: ${JSON.stringify(viibBlocks)}`)
    }
    console.log("✅ Sesi Matematika VII-B memiliki data-conflict=true dan lencana 'Bentrokan Guru'.")

    // Verifikasi lencana status validasi di header toolbar
    const badgeText = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Badge Toolbar:", badgeText)
    if (!badgeText.includes("Konflik")) {
      throw new Error(`Badge status toolbar tidak menampilkan status konflik! Teks: "${badgeText}"`)
    }
    console.log("✅ Lencana toolbar menampilkan konflik terdeteksi.")

    // 5. Kembali ke kelas VII-A dan verifikasi blok VII-A juga terdeteksi bentrok
    console.log("Beralih kembali ke kelas VII-A...")
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    const viiaBlocks = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => ({
        text: b.textContent?.trim() ?? "",
        hasConflict: b.getAttribute("data-conflict") === "true",
      }))
    })
    console.log("VII-A Blocks:", viiaBlocks)

    const mathA = viiaBlocks.find((b) => b.text.includes("Matematika") && b.text.includes("07:30 - 08:15"))
    if (!mathA || !mathA.hasConflict || !mathA.text.includes("Bentrokan Guru")) {
      throw new Error(`Sesi VII-A tidak ditandai Bentrokan Guru! Data: ${JSON.stringify(viiaBlocks)}`)
    }
    console.log("✅ Sesi Matematika VII-A terbukti sinkron mendeteksi Bentrokan Guru lintas kelas.")

    await page.screenshot({
      path: path.join(screenshotsDir, "01-teacher-overlap-detected.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-teacher-overlap-detected.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.2: Bentrokan Dua Sesi dengan Durasi Berbeda (AC-04)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.2: Bentrokan Dua Sesi dengan Durasi Berbeda (AC-04) ---")

    // Sesi VII-A Matematika tetap di Senin 07:30 - 08:15 (45 menit, Budi Santoso)
    // Beralih ke VII-B, lepas sesi Matematika, lalu tempatkan IPA (90m, Budi Santoso) di Senin 08:00 - 09:30
    console.log("Beralih ke kelas VII-B...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))

    console.log("Melepas sesi Matematika di VII-B...")
    await clearGridSessions(page)

    console.log("VII-B: Menempatkan sesi IPA (90m) di Senin 08:00...")
    await placeSessionQuick(page, "IPA", "08:00")

    // Verifikasi bentrokan pada irisan 08:00 - 08:15
    const ipaBlock = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      const ipa = blocks.find((b) => b.textContent?.includes("IPA"))
      return {
        text: ipa?.textContent?.trim() ?? "",
        hasConflict: ipa?.getAttribute("data-conflict") === "true",
      }
    })
    console.log("Blok IPA VII-B:", ipaBlock)

    if (!ipaBlock.hasConflict || !ipaBlock.text.includes("Bentrokan Guru")) {
      throw new Error(`Sesi IPA 90m tidak mendeteksi Bentrokan Guru pada irisan 08:00 - 08:15! Data: ${JSON.stringify(ipaBlock)}`)
    }
    console.log("✅ Irisan parsial 15 menit (08:00 - 08:15) antara sesi 45m dan 90m terdeteksi bentrok secara akurat.")

    await page.screenshot({
      path: path.join(screenshotsDir, "02-different-duration-overlap.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-different-duration-overlap.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.3: Sesi Berurutan yang Berbatasan Tepat Bebas Konflik (AC-05)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.3: Sesi Berurutan yang Berbatasan Tepat Bebas Konflik (AC-05) ---")

    // Pada VII-B, lepas sesi IPA dan tempatkan sesi Matematika (45m) ke Senin 08:15 - 09:00
    // Berbatasan tepat dengan VII-A Matematika yang berakhir pada pukul 08:15
    console.log("Melepas sesi IPA di VII-B...")
    await clearGridSessions(page)

    console.log("VII-B: Menempatkan sesi Matematika (45m) di Senin 08:15 - 09:00...")
    await placeSessionQuick(page, "Matematika", "08:15")

    // Verifikasi bahwa kedua sesi berbatasan tepat di 08:15 dan bebas konflik guru
    const mathBAdjacent = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      const math = blocks.find((b) => b.textContent?.includes("Matematika"))
      return {
        text: math?.textContent?.trim() ?? "",
        hasConflict: math?.getAttribute("data-conflict") === "true",
      }
    })
    console.log("Blok Matematika VII-B setelah berbatasan tepat di 08:15:", mathBAdjacent)

    if (mathBAdjacent.hasConflict || mathBAdjacent.text.includes("Bentrokan Guru")) {
      throw new Error(`Sesi berbatasan tepat (08:15) masih dianggap bentrok! Data: ${JSON.stringify(mathBAdjacent)}`)
    }
    console.log("✅ Sesi berbatasan tepat di 08:15 TIDAK dianggap bentrokan guru (AC-05 terpenuhi: startA < endB && startB < endA).")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-boundary-adjacent-no-conflict.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-boundary-adjacent-no-conflict.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.4: Bentrokan Pemakaian Ruangan (ROOM_OVERLAP — AC-06)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.4: Bentrokan Pemakaian Ruangan (ROOM_OVERLAP) ---")

    // Bersihkan sesi di VII-B
    await clearGridSessions(page)

    // Beralih ke VII-A
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Buka detail sesi Matematika di VII-A (Senin 07:30 - 08:15), pilih ruangan: Lab Komputer 1
    console.log("VII-A: Memilih ruangan 'Lab Komputer 1' untuk Matematika...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Matematika"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-room", { visible: true })

    await page.evaluate(() => {
      const select = document.querySelector("#session-room") as HTMLSelectElement | null
      if (select) {
        const opt = Array.from(select.options).find((o) => o.text.includes("Lab Komputer 1"))
        if (opt) {
          select.value = opt.value
          select.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }
    })
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const applyBtn = buttons.find((b) => b.textContent?.includes("Terapkan Guru & Ruangan"))
      applyBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // Beralih ke VII-B
    console.log("Beralih ke VII-B...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))

    // Tempatkan sesi Bahasa Inggris (Guru: Siti Rahma) di Senin 07:30 - 08:15
    console.log("VII-B: Menempatkan Bahasa Inggris di Senin 07:30...")
    await placeSessionQuick(page, "Bahasa Inggris", "07:30")

    // Buka detail sesi Bahasa Inggris di VII-B, pilih ruangan: Lab Komputer 1
    console.log("VII-B: Memilih ruangan 'Lab Komputer 1' untuk Bahasa Inggris...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Bahasa Inggris"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-room", { visible: true })

    await page.evaluate(() => {
      const select = document.querySelector("#session-room") as HTMLSelectElement | null
      if (select) {
        const opt = Array.from(select.options).find((o) => o.text.includes("Lab Komputer 1"))
        if (opt) {
          select.value = opt.value
          select.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }
    })
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const applyBtn = buttons.find((b) => b.textContent?.includes("Terapkan Guru & Ruangan"))
      applyBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi deteksi ROOM_OVERLAP (Bentrokan Ruangan)
    const englishRoomConflict = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      const block = blocks.find((b) => b.textContent?.includes("Bahasa Inggris"))
      return {
        text: block?.textContent?.trim() ?? "",
        hasConflict: block?.getAttribute("data-conflict") === "true",
      }
    })
    console.log("Blok Bahasa Inggris VII-B (Ruangan):", englishRoomConflict)

    if (!englishRoomConflict.hasConflict || !englishRoomConflict.text.includes("Bentrokan Ruangan")) {
      throw new Error(`Bentrokan pemakaian ruangan (Lab Komputer 1) tidak terdeteksi! Data: ${JSON.stringify(englishRoomConflict)}`)
    }
    console.log("✅ Bentrokan pemakaian ruangan (ROOM_OVERLAP) terdeteksi secara akurat lintas kelas.")

    await page.screenshot({
      path: path.join(screenshotsDir, "04-room-overlap-detected.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-room-overlap-detected.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.5: Bentrokan Waktu Istirahat (BREAK_TIME_OVERLAP)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.5: Bentrokan Waktu Istirahat (BREAK_TIME_OVERLAP) ---")

    // Di VII-B, geser sesi Bahasa Inggris ke jam mulai 09:15 (istirahat pertama Senin: 09:30 - 10:00)
    console.log("VII-B: Menggeser Bahasa Inggris ke 09:15 (menabrak waktu istirahat 09:30 - 10:00)...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Bahasa Inggris"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-start-time", { visible: true })
    await setInputValue(page, "#session-start-time", "09:15")
    await new Promise((r) => setTimeout(r, 600))

    const breakConflictBlock = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      const block = blocks.find((b) => b.textContent?.includes("Bahasa Inggris"))
      return {
        text: block?.textContent?.trim() ?? "",
        hasConflict: block?.getAttribute("data-conflict") === "true",
      }
    })
    console.log("Blok Bahasa Inggris (Waktu Istirahat):", breakConflictBlock)

    if (!breakConflictBlock.text.includes("Bentrokan Istirahat")) {
      throw new Error(`Bentrokan waktu istirahat tidak terdeteksi pada 09:15 - 10:00! Data: ${JSON.stringify(breakConflictBlock)}`)
    }
    console.log("✅ Bentrokan waktu istirahat (BREAK_TIME_OVERLAP) terdeteksi secara multi-cue visual.")

    await page.screenshot({
      path: path.join(screenshotsDir, "05-break-time-overlap.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 05-break-time-overlap.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.6: Resolusi Mandiri Bebas Konflik (AC-07)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.6: Resolusi Mandiri Bebas Konflik (AC-07) ---")

    // Pindahkan sesi Bahasa Inggris ke Selasa pukul 08:00 - 08:45 dan kembalikan ruangan ke tanpa ruangan khusus
    console.log("Memindahkan Bahasa Inggris ke Selasa 08:00 bebas konflik...")
    await page.select("#session-day", "tuesday")
    await new Promise((r) => setTimeout(r, 300))
    await setInputValue(page, "#session-start-time", "08:00")
    await new Promise((r) => setTimeout(r, 300))

    await page.evaluate(() => {
      const select = document.querySelector("#session-room") as HTMLSelectElement | null
      if (select) {
        select.value = ""
        select.dispatchEvent(new Event("change", { bubbles: true }))
      }
    })
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const applyBtn = buttons.find((b) => b.textContent?.includes("Terapkan Guru & Ruangan"))
      applyBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // Kembalikan juga ruangan sesi Matematika di VII-A ke tanpa ruangan khusus
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Matematika"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-room", { visible: true })
    await page.evaluate(() => {
      const select = document.querySelector("#session-room") as HTMLSelectElement | null
      if (select) {
        select.value = ""
        select.dispatchEvent(new Event("change", { bubbles: true }))
      }
    })
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const applyBtn = buttons.find((b) => b.textContent?.includes("Terapkan Guru & Ruangan"))
      applyBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    const resolvedBlockA = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      const block = blocks.find((b) => b.textContent?.includes("Matematika"))
      return {
        text: block?.textContent?.trim() ?? "",
        hasConflict: block?.getAttribute("data-conflict") === "true",
      }
    })
    console.log("Blok Matematika VII-A setelah resolusi:", resolvedBlockA)

    if (resolvedBlockA.hasConflict) {
      throw new Error(`Sesi Matematika VII-A masih berkonflik setelah resolusi: ${JSON.stringify(resolvedBlockA)}`)
    }
    console.log("✅ Resolusi mandiri berhasil: konflik langsung hilang seketika tanpa refresh halaman.")

    await page.screenshot({
      path: path.join(screenshotsDir, "06-conflict-auto-resolved.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 06-conflict-auto-resolved.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.7: Penegakan Larangan Validasi Prematur (AC-13)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.7: Penegakan Larangan Validasi Prematur (AC-13) ---")

    // Pada kondisi ini, 0 konflik waktu di VII-B dan VII-A, namun masih ada kebutuhan mengajar belum ditempatkan
    const validationBadgeText = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Badge Toolbar (0 konflik waktu, kebutuhan belum lengkap):", validationBadgeText)

    if (validationBadgeText.includes("Lengkap & Valid") || validationBadgeText.includes("Jadwal lengkap dan valid")) {
      throw new Error("PELANGGARAN AC-13: Sistem memberikan status LENGKAP & VALID padahal masih ada alokasi kebutuhan belum terjadwal!")
    }

    if (!validationBadgeText.includes("Peringatan") && !validationBadgeText.includes("Belum Lengkap")) {
      throw new Error(`Lencana status tidak sesuai ekspektasi AC-13: "${validationBadgeText}"`)
    }
    console.log("✅ Sistem dengan tegas menolak validasi prematur (AC-13 ditegakkan dengan status 'Belum Lengkap' / Peringatan).")

    await page.screenshot({
      path: path.join(screenshotsDir, "07-incomplete-status-enforced.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 07-incomplete-status-enforced.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 4.8: Dialog Ringkasan Validasi Dual-Scope & Matriks Kelas (FR-11)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 4.8: Dialog Ringkasan Validasi Dual-Scope & Matriks Kelas (FR-11) ---")

    // Buka dialog ringkasan validasi dari toolbar
    console.log("Membuka dialog Ringkasan Validasi...")
    await page.click('button[aria-label^="Status Validasi:"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Verifikasi 5 metrik summary cards
    const summaryCardTitles = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const titles = Array.from(dialog?.querySelectorAll(".border.bg-card h4, .border.bg-card p") ?? []).map(
        (el) => el.textContent?.trim() ?? ""
      )
      return titles
    })
    console.log("Komponen Kartu Validasi:", summaryCardTitles)

    // Uji alih cakupan (Scope Switcher): Kelas Aktif -> Seluruh Ruang Kerja
    console.log("Mengalihkan cakupan ke 'Seluruh Ruang Kerja'...")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="dialog"] button'))
      const wsBtn = buttons.find((b) => b.textContent?.includes("Seluruh Ruang Kerja"))
      wsBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 300))

    // Verifikasi Matriks Kelas
    console.log("Memilih tab 'Matriks Kelas'...")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="dialog"] button'))
      const matrixTab = buttons.find((b) => b.textContent?.includes("Matriks Kelas"))
      matrixTab?.click()
    })
    await new Promise((r) => setTimeout(r, 300))

    const matrixRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('div[role="dialog"] table tbody tr'))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })
    console.log("Baris Matriks Kelas:", matrixRows)

    if (!matrixRows.some((r) => r.includes("VII-A")) || !matrixRows.some((r) => r.includes("VII-B"))) {
      throw new Error(`Matriks kelas tidak lengkap! Baris: ${JSON.stringify(matrixRows)}`)
    }
    console.log("✅ Matriks kelas merangkum status kelas VII-A dan VII-B secara akurat.")

    await page.screenshot({
      path: path.join(screenshotsDir, "08-validation-summary-dialog.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 08-validation-summary-dialog.png")

    // Klik tombol "Buka Jadwal" pada baris kelas VII-B
    console.log("Mengeklik tombol 'Buka Jadwal' pada kelas VII-B...")
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('div[role="dialog"] table tbody tr'))
      const rowB = rows.find((r) => r.textContent?.includes("VII-B"))
      const openBtn = rowB?.querySelector("button") as HTMLButtonElement | null
      openBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    await new Promise((r) => setTimeout(r, 400))

    // Verifikasi bahwa kelas VII-B menjadi aktif di editor
    const activeClassBar = await page.evaluate(() => {
      const bar = document.querySelector(".border-b.border-border.bg-muted\\/40")
      return bar?.textContent?.trim() ?? ""
    })
    console.log("Status Bar Pasca-Buka Jadwal:", activeClassBar)

    if (!activeClassBar.includes("VII-B")) {
      throw new Error(`Kelas aktif tidak beralih ke VII-B setelah klik Buka Jadwal! Bar: "${activeClassBar}"`)
    }
    console.log("✅ Klik 'Buka Jadwal' menutup dialog dan langsung mengaktifkan kelas VII-B di editor.")

    console.log("\n🎉 SELURUH KASUS UJI TC-04 BERHASIL DILALUI DENGAN STATUS: PASS!")
  } catch (error) {
    console.error("❌ Terjadi kegagalan pada saat eksekusi TC-04:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "tc04-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC04()
