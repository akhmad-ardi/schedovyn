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

  // 4. Periksa Kebutuhan Pembelajaran
  await switchMasterDataTab(page, "Kebutuhan Pembelajaran")
  await page.waitForSelector("#req-class-select", { visible: true })
  const reqRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr")).map((r) => r.textContent ?? "")
  })

  // VII-A Matematika (Guru: Budi Santoso)
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

  // VII-A Bahasa Inggris (Guru: Budi Santoso agar seluruh sesi VII-A diampu Budi)
  if (!reqRows.some((r) => r.includes("VII-A") && r.includes("Bahasa Inggris"))) {
    await selectOptionByText(page, "#req-class-select", "VII-A")
    await selectOptionByText(page, "#req-subject-select", "Bahasa Inggris")
    await setInputValue(page, "#req-sessions-input", "1")
    await setInputValue(page, "#req-duration-input", "45")
    await selectOptionByText(page, "#req-teacher-select", "Budi Santoso")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Kebutuhan"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  // VII-B Matematika (Guru: Siti Rahma)
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

  // VII-B Bahasa Inggris (Guru: Siti Rahma)
  if (!reqRows.some((r) => r.includes("VII-B") && r.includes("Bahasa Inggris"))) {
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

  console.log("✅ Seluruh prasyarat data master TC-06 siap.")
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

async function runTC06() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-06"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-06 (Schedule Copy & Propagation)...")
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

    // Bersihkan sesi di VII-A dan VII-B agar kondisi awal bersih terkontrol
    console.log("Membersihkan sesi di kelas VII-A...")
    await clearGridSessions(page)

    console.log("Beralih ke kelas VII-B dan membersihkan sesi...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))
    await clearGridSessions(page)

    // Beralih kembali ke VII-A
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Susun 2 sesi di kelas VII-A:
    // Sesi 1: Matematika di Senin 07:30 - 08:15 (Budi Santoso)
    // Sesi 2: Bahasa Inggris di Senin 08:15 - 09:00 (Budi Santoso)
    console.log("VII-A: Menempatkan Matematika di Senin 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30")

    console.log("VII-A: Menempatkan Bahasa Inggris di Senin 08:15...")
    await placeSessionQuick(page, "Bahasa Inggris", "08:15")

    // -------------------------------------------------------------------------
    // Kasus Uji 6.1: Validasi Pembukaan Dialog & Larangan Kelas Identik
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 6.1: Validasi Pembukaan Dialog & Larangan Kelas Identik ---")

    console.log("Membuka dialog Salin Jadwal dari toolbar...")
    await page.click('button[aria-label="Salin Jadwal"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    const dialogTitle = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      return dialog?.querySelector("h2")?.textContent?.trim() ?? ""
    })
    console.log("Judul Dialog Salin:", dialogTitle)

    if (!dialogTitle.includes("Salin Jadwal Pembelajaran")) {
      throw new Error(`Judul dialog tidak sesuai: "${dialogTitle}"`)
    }

    // Periksa status tombol Salin Jadwal Sekarang sebelum kelas sasaran dipilih
    const submitBtnStateInitial = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Salin Jadwal Sekarang")
      ) as HTMLButtonElement | null
      return {
        disabled: submitBtn?.disabled ?? false,
      }
    })
    console.log("State Tombol Salin sebelum memilih target:", submitBtnStateInitial)

    if (!submitBtnStateInitial.disabled) {
      throw new Error("Tombol Salin Jadwal Sekarang harus disabled saat kelas tujuan belum dipilih!")
    }
    console.log("✅ Tombol Salin Jadwal disabled saat kelas tujuan belum dipilih.")

    await page.screenshot({
      path: path.join(screenshotsDir, "01-copy-dialog-validation.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-copy-dialog-validation.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 6.2: Penyalinan Mode Replace dengan Strategi "use-target-default"
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 6.2: Mode Replace dengan use-target-default ---")

    // Pilih Kelas Sasaran: VII-B
    console.log("Memilih kelas sasaran 'VII-B'...")
    await selectOptionByText(page, "#target-class-select", "VII-B")

    // Pastikan Mode Penanganan: Replace (default)
    // Pastikan Strategi Guru: Gunakan Guru Default Sasaran (use-target-default)
    // Pastikan Strategi Ruangan: Gunakan Ruangan Default Sasaran (use-target-default)
    console.log("Mengeklik tombol 'Salin Jadwal Sekarang'...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Salin Jadwal Sekarang")
      ) as HTMLButtonElement | null
      submitBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // Verifikasi tampilan layar hasil pasca-penyalinan
    const outcomeResult = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const successAlert = dialog?.querySelector(".border-emerald-500\\/40")?.textContent?.trim() ?? ""
      const stats = Array.from(dialog?.querySelectorAll(".border.bg-card p") ?? []).map((el) => el.textContent?.trim() ?? "")
      return {
        successAlert,
        stats,
      }
    })
    console.log("Layar Hasil Salin:", outcomeResult)

    if (!outcomeResult.successAlert.includes("Berhasil Disalin")) {
      throw new Error(`Pesan sukses penyalinan tidak muncul: ${JSON.stringify(outcomeResult)}`)
    }
    console.log("✅ Pesan sukses tampil:", outcomeResult.successAlert)

    // Klik tombol "Buka Jadwal Kelas Sasaran"
    console.log("Mengeklik tombol 'Buka Jadwal Kelas Sasaran'...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const openTargetBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Buka Jadwal Kelas Sasaran")
      ) as HTMLButtonElement | null
      openTargetBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi di kelas VII-B: 2 sesi disalin dengan guru Siti Rahma (0 konflik dengan VII-A)
    const viibCopiedBlocks = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => ({
        text: b.textContent?.trim() ?? "",
        hasConflict: b.getAttribute("data-conflict") === "true",
      }))
    })
    console.log("Blok Sesi VII-B Pasca-Salin:", viibCopiedBlocks)

    if (viibCopiedBlocks.length !== 2) {
      throw new Error(`Jumlah sesi di VII-B bukan 2: ${JSON.stringify(viibCopiedBlocks)}`)
    }
    if (viibCopiedBlocks.some((b) => b.hasConflict)) {
      throw new Error("Sesi hasil salin use-target-default menghasilkan konflik yang tidak diharapkan!")
    }
    console.log("✅ 2 sesi berhasil diduplikasi ke kelas VII-B dengan guru default sasaran (Siti Rahma) tanpa memicu bentrokan.")

    await page.screenshot({
      path: path.join(screenshotsDir, "02-copied-target-default-success.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-copied-target-default-success.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 6.3: Penyalinan dengan Strategi "keep-source" & Deteksi Bentrokan Otomatis (AC-03)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 6.3: Strategi keep-source & Deteksi Bentrokan Otomatis ---")

    // Beralih ke kelas VII-A
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Buka kembali dialog Salin Jadwal
    console.log("Membuka kembali dialog Salin Jadwal...")
    await page.click('button[aria-label="Salin Jadwal"]')
    await page.waitForSelector('div[role="dialog"]', { visible: true })

    // Pilih target VII-B
    await selectOptionByText(page, "#target-class-select", "VII-B")

    // Pilih Strategi Guru: "Salin Guru dari Sumber (Bisa Bentrok)" (keep-source)
    console.log("Memilih strategi guru: 'Salin Guru dari Sumber' (keep-source)...")
    await selectOptionByText(page, "#teacher-strategy-select", "Salin Guru dari Sumber")

    // Klik tombol Salin Jadwal Sekarang
    console.log("Mengeklik tombol 'Salin Jadwal Sekarang'...")
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const submitBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Salin Jadwal Sekarang")
      ) as HTMLButtonElement | null
      submitBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // Verifikasi bahwa layar hasil menampilkan peringatan konflik bentrokan baru
    const hasConflictWarning = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      return dialog ? dialog.textContent?.includes("Bentrokan Jadwal Ditemukan") ?? false : false
    })
    console.log("Apakah Peringatan Konflik Muncul:", hasConflictWarning)

    if (!hasConflictWarning) {
      throw new Error("Peringatan 'Bentrokan Jadwal Ditemukan' tidak muncul pada layar hasil!")
    }
    console.log("✅ Dialog mendeteksi dan memperingatkan bentrokan guru baru akibat strategi keep-source.")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-copy-keep-source-conflict.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-copy-keep-source-conflict.png")

    // Tutup dialog
    await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]')
      const closeBtn = Array.from(dialog?.querySelectorAll("button") ?? []).find(
        (b) => b.textContent?.includes("Tutup")
      ) as HTMLButtonElement | null
      closeBtn?.click()
    })
    await page.waitForSelector('div[role="dialog"]', { hidden: true })
    await new Promise((r) => setTimeout(r, 400))

    // Verifikasi toolbar menampilkan status merah adanya konflik
    const badgeTextWithConflict = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Toolbar Badge setelah salin keep-source:", badgeTextWithConflict)
    if (!badgeTextWithConflict.includes("Konflik")) {
      throw new Error("Lencana status validasi di toolbar tidak menampilkan konflik!")
    }

    // -------------------------------------------------------------------------
    // Kasus Uji 6.4: Pembatalan Massal Hasil Salin via Sekali Tekan Undo (AC-07, TDD 7.1)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 6.4: Pembatalan Massal via Sekali Tekan Undo ---")

    const undoTitleText = await page.evaluate(() => {
      const undoBtn = document.querySelector('button[aria-label="Batal Perubahan"]')
      return undoBtn?.getAttribute("title") ?? ""
    })
    console.log("Tooltip Tombol Undo:", undoTitleText)

    if (!undoTitleText.includes("Salin jadwal")) {
      throw new Error(`Tooltip Undo tidak mencatat aksi penyalinan: "${undoTitleText}"`)
    }

    // Tekan tombol pintas Ctrl+Z untuk membatalkan seluruh operasi penyalinan sekaligus
    console.log("Menekan pintasan keyboard Ctrl+Z untuk membatalkan penyalinan massal...")
    await page.focus("body")
    await page.keyboard.down("Control")
    await page.keyboard.press("KeyZ")
    await page.keyboard.up("Control")
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi bahwa bentrokan guru akibat penyalinan keep-source langsung terhapus
    const badgeTextAfterUndo = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Toolbar Badge setelah Undo massal:", badgeTextAfterUndo)

    if (badgeTextAfterUndo.includes("Konflik")) {
      throw new Error("Bentrokan hasil salin masih ada setelah Undo!")
    }
    console.log("✅ Pembatalan massal berhasil: seluruh bentrokan baru langsung terhapus seketika via sekali Undo.")

    await page.screenshot({
      path: path.join(screenshotsDir, "04-undo-bulk-copy.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-undo-bulk-copy.png")

    console.log("\n🎉 SELURUH KASUS UJI TC-06 BERHASIL DILALUI DENGAN STATUS: PASS!")
  } catch (error) {
    console.error("❌ Terjadi kegagalan pada saat eksekusi TC-06:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "tc06-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC06()
