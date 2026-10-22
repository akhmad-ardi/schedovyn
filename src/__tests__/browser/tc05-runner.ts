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
    await setInputValue(page, "#teacher-notes-input", "Guru Matematika")
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
      saveBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 400))
  }

  if (!teacherRows.some((r) => r.includes("Siti Rahma"))) {
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

  console.log("✅ Seluruh prasyarat data master TC-05 siap.")
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

async function runTC05() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-05"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-05 (Undo & Redo Schedule History)...")
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

    // Bersihkan sesi di VII-A dan VII-B agar kondisi awal bersih
    console.log("Membersihkan sesi tersisa di kelas VII-A...")
    await clearGridSessions(page)

    console.log("Beralih ke kelas VII-B dan membersihkan sesi tersisa...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))
    await clearGridSessions(page)

    // Kembali ke VII-A dan reload untuk memastikan riwayat awal kosong
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))
    await page.reload({ waitUntil: "networkidle0" })
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })

    // -------------------------------------------------------------------------
    // Kasus Uji 5.1: State Disabled Tombol Undo/Redo Awal
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 5.1: State Disabled Tombol Undo/Redo Awal ---")

    const initialButtonsState = await page.evaluate(() => {
      const undoBtn = document.querySelector('button[aria-label="Batal Perubahan"]') as HTMLButtonElement | null
      const redoBtn = document.querySelector('button[aria-label="Ulangi Perubahan"]') as HTMLButtonElement | null
      const historyText = document.querySelector('[role="toolbar"] .tabular-nums')?.textContent?.trim() ?? ""
      return {
        undoDisabled: undoBtn?.disabled ?? false,
        redoDisabled: redoBtn?.disabled ?? false,
        undoTitle: undoBtn?.getAttribute("title") ?? "",
        redoTitle: redoBtn?.getAttribute("title") ?? "",
        historyText,
      }
    })
    console.log("State Awal Toolbar:", initialButtonsState)

    if (!initialButtonsState.undoDisabled || !initialButtonsState.redoDisabled) {
      throw new Error(`Tombol Undo/Redo awal tidak disabled! Data: ${JSON.stringify(initialButtonsState)}`)
    }
    if (!initialButtonsState.historyText.includes("0 langkah")) {
      throw new Error(`Teks riwayat awal tidak 0 langkah: "${initialButtonsState.historyText}"`)
    }
    console.log("✅ Tombol Undo dan Redo dalam kondisi disabled dengan riwayat 0 langkah tersimpan.")

    await page.screenshot({
      path: path.join(screenshotsDir, "01-initial-disabled-state.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-initial-disabled-state.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 5.2: Undo Penempatan Sesi via Tombol & Keyboard
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 5.2: Undo Penempatan Sesi via Tombol & Keyboard ---")

    // 1. Tempatkan Matematika ke Senin 07:30 - 08:15
    console.log("Menempatkan Matematika ke Senin 07:30...")
    await placeSessionQuick(page, "Matematika", "07:30")

    // 2. Periksa tombol Undo aktif dan memiliki tooltip deskriptif
    const postPlaceState = await page.evaluate(() => {
      const undoBtn = document.querySelector('button[aria-label="Batal Perubahan"]') as HTMLButtonElement | null
      const historyText = document.querySelector('[role="toolbar"] .tabular-nums')?.textContent?.trim() ?? ""
      return {
        undoDisabled: undoBtn?.disabled ?? true,
        undoTitle: undoBtn?.getAttribute("title") ?? "",
        historyText,
      }
    })
    console.log("State Pasca-Penempatan:", postPlaceState)

    if (postPlaceState.undoDisabled) {
      throw new Error("Tombol Undo tidak aktif setelah penempatan sesi!")
    }
    if (!postPlaceState.undoTitle.includes("Matematika") || !postPlaceState.undoTitle.includes("07:30")) {
      throw new Error(`Tooltip Undo tidak deskriptif: "${postPlaceState.undoTitle}"`)
    }
    console.log("✅ Tombol Undo aktif dengan tooltip deskriptif:", postPlaceState.undoTitle)

    // 3. Klik tombol Batal Perubahan (Undo)
    console.log("Mengeklik tombol 'Batal Perubahan' (Undo)...")
    await page.click('button[aria-label="Batal Perubahan"]')
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi blok sesi hilang dari grid
    const blocksAfterUndo = await page.evaluate(() => {
      const blocks = document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]')
      return blocks.length
    })
    console.log("Jumlah Blok di Grid setelah Undo:", blocksAfterUndo)

    if (blocksAfterUndo !== 0) {
      throw new Error(`Sesi Matematika tidak hilang dari grid setelah Undo! Sisa: ${blocksAfterUndo}`)
    }

    // Verifikasi tombol Redo aktif dengan tooltip deskriptif
    const redoState = await page.evaluate(() => {
      const redoBtn = document.querySelector('button[aria-label="Ulangi Perubahan"]') as HTMLButtonElement | null
      return {
        redoDisabled: redoBtn?.disabled ?? true,
        redoTitle: redoBtn?.getAttribute("title") ?? "",
      }
    })
    console.log("State Redo pasca-Undo:", redoState)
    if (redoState.redoDisabled || !redoState.redoTitle.includes("Matematika")) {
      throw new Error(`Tombol Redo tidak aktif atau tidak deskriptif: ${JSON.stringify(redoState)}`)
    }
    console.log("✅ Undo via tombol berhasil: blok sesi terhapus dari grid dan tombol Redo aktif.")

    // 4. Tekan tombol keyboard Ctrl+Y untuk Redo
    console.log("Menekan tombol pintas keyboard Ctrl+Y untuk Redo...")
    await page.focus("body")
    await page.keyboard.down("Control")
    await page.keyboard.press("KeyY")
    await page.keyboard.up("Control")
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi blok sesi pulih kembali ke grid
    const blocksAfterRedo = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok di Grid setelah Ctrl+Y (Redo):", blocksAfterRedo)

    if (!blocksAfterRedo.some((b) => b.includes("Matematika") && b.includes("07:30 - 08:15"))) {
      throw new Error(`Sesi Matematika tidak pulih setelah Ctrl+Y! Grid: ${JSON.stringify(blocksAfterRedo)}`)
    }
    console.log("✅ Ctrl+Y berhasil memulihkan penempatan sesi ke grid.")

    // 5. Tekan tombol keyboard Ctrl+Z untuk Undo
    console.log("Menekan tombol pintas keyboard Ctrl+Z untuk Undo...")
    await page.focus("body")
    await page.keyboard.down("Control")
    await page.keyboard.press("KeyZ")
    await page.keyboard.up("Control")
    await new Promise((r) => setTimeout(r, 600))

    const blocksAfterCtrlZ = await page.evaluate(() => {
      return document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]').length
    })
    if (blocksAfterCtrlZ !== 0) {
      throw new Error("Ctrl+Z gagal membatalkan penempatan sesi!")
    }
    console.log("✅ Ctrl+Z berhasil membatalkan penempatan sesi kembali ke sidebar.")

    // Pulihkan kembali sesi untuk kasus berikutnya
    console.log("Memulihkan sesi Matematika dengan Redo untuk persiapan Kasus 5.3...")
    await page.click('button[aria-label="Ulangi Perubahan"]')
    await new Promise((r) => setTimeout(r, 600))

    await page.screenshot({
      path: path.join(screenshotsDir, "02-undo-placement.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-undo-placement.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 5.3: Undo Pemindahan Sesi di Antara Slot Waktu
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 5.3: Undo Pemindahan Sesi di Antara Slot Waktu ---")

    // Ubah jam sesi Matematika dari Senin 07:30 ke Senin 08:30 (1 mutasi moveSession yang bersih)
    console.log("Mengubah sesi Matematika ke Senin 08:30...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Matematika"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-start-time", { visible: true })
    await setInputValue(page, "#session-start-time", "08:30")
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi sesi berada di Senin 08:30 - 09:15
    const movedBlock = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok pasca-pemindahan waktu:", movedBlock)
    if (!movedBlock.some((b) => b.includes("08:30 - 09:15"))) {
      throw new Error(`Sesi tidak berpindah ke 08:30 - 09:15! Data: ${JSON.stringify(movedBlock)}`)
    }

    // Tekan Ctrl+Z untuk membatalkan pemindahan
    console.log("Menekan Ctrl+Z untuk membatalkan pemindahan sesi...")
    await page.focus("body")
    await page.keyboard.down("Control")
    await page.keyboard.press("KeyZ")
    await page.keyboard.up("Control")
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi sesi kembali ke Senin 07:30 - 08:15
    const revertedBlock = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[role="article"][aria-label*="Blok Sesi"]'))
      return blocks.map((b) => b.textContent?.trim() ?? "")
    })
    console.log("Blok setelah Ctrl+Z:", revertedBlock)

    if (!revertedBlock.some((b) => b.includes("07:30 - 08:15"))) {
      throw new Error(`Sesi tidak kembali ke Senin 07:30 - 08:15 setelah Undo! Data: ${JSON.stringify(revertedBlock)}`)
    }
    console.log("✅ Undo pemindahan sesi berhasil mengembalikan posisi dan waktu ke Senin 07:30 - 08:15.")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-undo-move-session.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-undo-move-session.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 5.4: Undo Pemulihan Konflik Otomatis
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 5.4: Undo Pemulihan Konflik Otomatis ---")

    // Di kelas VII-B, tempatkan Matematika di Senin 07:30 - 08:15 agar terjadi bentrokan guru
    console.log("Beralih ke VII-B untuk menyiapkan bentrokan guru...")
    await selectOptionByText(page, "#active-class-select", "VII-B")
    await new Promise((r) => setTimeout(r, 400))

    await placeSessionQuick(page, "Matematika", "07:30")

    // Beralih kembali ke VII-A
    console.log("Beralih kembali ke VII-A...")
    await selectOptionByText(page, "#active-class-select", "VII-A")
    await new Promise((r) => setTimeout(r, 400))

    // Verifikasi bentrokan terjadi di VII-A (Budi Santoso di Senin 07:30)
    const conflictBadgeInitial = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Badge dengan konflik bentrokan guru:", conflictBadgeInitial)
    if (!conflictBadgeInitial.includes("Konflik")) {
      throw new Error(`Bentrokan guru tidak terdeteksi! Badge: "${conflictBadgeInitial}"`)
    }

    // Resolusi konflik: pindahkan sesi VII-A ke Selasa (1 mutasi hari: handleDayChange)
    console.log("Memindahkan sesi VII-A ke hari Selasa untuk menyelesaikan konflik...")
    await page.evaluate(() => {
      const block = document.querySelector('[role="article"][aria-label*="Matematika"]') as HTMLElement | null
      block?.click()
    })
    await page.waitForSelector("#session-day", { visible: true })
    await page.select("#session-day", "tuesday")
    await new Promise((r) => setTimeout(r, 600))

    // Verifikasi konflik hilang (0 konflik waktu)
    const conflictBadgeResolved = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Badge pasca-resolusi ke Selasa:", conflictBadgeResolved)
    if (conflictBadgeResolved.includes("Konflik")) {
      throw new Error("Konflik tidak terselesaikan setelah dipindahkan ke slot Selasa!")
    }

    // Tekan Undo (Ctrl+Z): sesi kembali ke slot bentrok (Senin 07:30)
    console.log("Tekan Undo (Ctrl+Z) untuk mengembalikan sesi ke slot konflik...")
    await page.focus("body")
    await page.keyboard.down("Control")
    await page.keyboard.press("KeyZ")
    await page.keyboard.up("Control")
    await new Promise((r) => setTimeout(r, 600))

    const conflictBadgeReverted = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Badge setelah Undo ke posisi konflik:", conflictBadgeReverted)
    if (!conflictBadgeReverted.includes("Konflik")) {
      throw new Error("Konflik tidak muncul kembali setelah Undo!")
    }
    console.log("✅ Undo mengembalikan sesi ke kondisi bentrok secara reaktif.")

    // Tekan Redo (Ctrl+Y): sesi kembali ke slot aman (Selasa 07:30)
    console.log("Tekan Redo (Ctrl+Y) untuk memulihkan resolusi bebas konflik...")
    await page.focus("body")
    await page.keyboard.down("Control")
    await page.keyboard.press("KeyY")
    await page.keyboard.up("Control")
    await new Promise((r) => setTimeout(r, 600))

    const conflictBadgeRedone = await page.evaluate(() => {
      const badge = document.querySelector('button[aria-label^="Status Validasi:"]')
      return badge?.textContent?.trim() ?? ""
    })
    console.log("Status Badge setelah Redo ke posisi aman:", conflictBadgeRedone)
    if (conflictBadgeRedone.includes("Konflik")) {
      throw new Error("Konflik masih ada setelah Redo ke posisi aman!")
    }
    console.log("✅ Redo memulihkan resolusi bebas konflik secara deterministik (AC-07 terpenuhi).")

    await page.screenshot({
      path: path.join(screenshotsDir, "04-undo-conflict-resolution.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-undo-conflict-resolution.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 5.5: Pembersihan Riwayat Redo Saat Mutasi Baru
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 5.5: Pembersihan Riwayat Redo Saat Mutasi Baru ---")

    // 1. Tekan Undo sekali sehingga ada cabang future/redo
    console.log("Tekan Undo sekali untuk mengisi stack Redo...")
    await page.click('button[aria-label="Batal Perubahan"]')
    await new Promise((r) => setTimeout(r, 600))

    const canRedoBeforeMutation = await page.evaluate(() => {
      const redoBtn = document.querySelector('button[aria-label="Ulangi Perubahan"]') as HTMLButtonElement | null
      return !redoBtn?.disabled
    })
    console.log("Tombol Redo aktif sebelum mutasi baru:", canRedoBeforeMutation)
    if (!canRedoBeforeMutation) {
      throw new Error("Tombol Redo harusnya aktif setelah Undo!")
    }

    // 2. Lakukan mutasi baru: tempatkan sesi Bahasa Inggris ke hari Senin
    console.log("Melakukan aksi mutasi baru: menempatkan Bahasa Inggris di Senin 08:30...")
    await placeSessionQuick(page, "Bahasa Inggris", "08:30")

    // 3. Verifikasi bahwa tombol Redo kembali DISABLED (future history cleared)
    const redoStateAfterMutation = await page.evaluate(() => {
      const redoBtn = document.querySelector('button[aria-label="Ulangi Perubahan"]') as HTMLButtonElement | null
      return {
        redoDisabled: redoBtn?.disabled ?? false,
        redoTitle: redoBtn?.getAttribute("title") ?? "",
      }
    })
    console.log("State Tombol Redo pasca-mutasi baru:", redoStateAfterMutation)

    if (!redoStateAfterMutation.redoDisabled) {
      throw new Error("PELANGGARAN FR-07: Tombol Redo masih aktif setelah adanya mutasi baru yang seharusnya membersihkan stack redo!")
    }
    console.log("✅ Stack Redo berhasil dibersihkan (*future history cleared*) saat terjadi mutasi baru.")

    await page.screenshot({
      path: path.join(screenshotsDir, "05-future-history-cleared.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 05-future-history-cleared.png")

    console.log("\n🎉 SELURUH KASUS UJI TC-05 BERHASIL DILALUI DENGAN STATUS: PASS!")
  } catch (error) {
    console.error("❌ Terjadi kegagalan pada saat eksekusi TC-05:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "tc05-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC05()
