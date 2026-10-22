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

async function switchTab(page: puppeteer.Page, tabLabel: string) {
  console.log(`Mengalihkan ke Tab "${tabLabel}"...`)
  await page.evaluate((label) => {
    const tabs = Array.from(document.querySelectorAll('button[role="tab"]'))
    const target = tabs.find((t) => t.textContent?.includes(label))
    if (!target) throw new Error(`Tab "${label}" tidak ditemukan`)
    ;(target as HTMLElement).click()
  }, tabLabel)
  await new Promise((r) => setTimeout(r, 300))
}

async function runTC02() {
  const screenshotsDir = path.resolve(
    process.cwd(),
    "docs/test/screenshots/TC-02"
  )
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log("🚀 Menjalankan E2E Browser Test untuk TC-02 (Manajemen Data Master)...")
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
    // Buka Halaman Data Master
    // -------------------------------------------------------------------------
    console.log("🌐 Membuka http://localhost:5173/master-data...")
    await page.goto("http://localhost:5173/master-data", {
      waitUntil: "networkidle0",
    })

    await page.waitForSelector('button[role="tab"]', { visible: true })
    console.log("✅ Halaman Data Master terhidrasi.")

    // -------------------------------------------------------------------------
    // Kasus Uji 2.1: CRUD Kelas & Validasi Duplikasi
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 2.1: CRUD Kelas & Validasi Duplikasi ---")
    await switchTab(page, "Kelas")
    await page.waitForSelector("#class-name-input", { visible: true })

    const classRowsBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })
    console.log("Kelas saat ini di tabel:", classRowsBefore)

    const hasVIIA = classRowsBefore.some((text) => text.includes("VII-A"))
    if (!hasVIIA) {
      console.log("Menambahkan Kelas 1: VII-A...")
      await setInputValue(page, "#class-name-input", "VII-A")
      await setInputValue(page, "#class-grade-input", "VII")
      await setInputValue(page, "#class-notes-input", "Kelas Reguler")
      await page.click('form button[type="submit"]')
      await new Promise((r) => setTimeout(r, 500))
    } else {
      console.log("Kelas VII-A sudah terdaftar.")
    }

    // Uji Duplikasi: Coba tambahkan lagi "VII-A"
    console.log("Menguji validasi duplikasi: Menambahkan lagi kelas dengan nama 'VII-A'...")
    await setInputValue(page, "#class-name-input", "VII-A")
    await setInputValue(page, "#class-grade-input", "VII")
    await page.click('form button[type="submit"]')
    await new Promise((r) => setTimeout(r, 400))

    // Verifikasi pesan galat duplikasi
    const duplicateErrorMsg = await page.evaluate(() => {
      const alert = document.querySelector(".text-destructive")
      return alert ? alert.textContent : ""
    })
    console.log("Pesan Error Duplikasi Kelas:", duplicateErrorMsg)
    if (!duplicateErrorMsg?.includes("sudah terdaftar")) {
      throw new Error(`Pesan error duplikasi kelas tidak sesuai harapan: "${duplicateErrorMsg}"`)
    }
    console.log("✅ Validasi duplikasi kelas berhasil dicegat sistem.")

    await page.screenshot({
      path: path.join(screenshotsDir, "01-class-duplicate-error.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-class-duplicate-error.png")

    // Tambahkan Kelas 2: VII-B jika belum ada
    const hasVIIB = classRowsBefore.some((text) => text.includes("VII-B"))
    if (!hasVIIB) {
      console.log("Menambahkan Kelas 2: VII-B...")
      await setInputValue(page, "#class-name-input", "VII-B")
      await setInputValue(page, "#class-grade-input", "VII")
      await setInputValue(page, "#class-notes-input", "Kelas Reguler")
      await page.click('form button[type="submit"]')
      await new Promise((r) => setTimeout(r, 500))
    }

    // Tambahkan Kelas 3: VIII-A jika belum ada
    const hasVIIIA = classRowsBefore.some((text) => text.includes("VIII-A"))
    if (!hasVIIIA) {
      console.log("Menambahkan Kelas 3: VIII-A...")
      await setInputValue(page, "#class-name-input", "VIII-A")
      await setInputValue(page, "#class-grade-input", "VIII")
      await setInputValue(page, "#class-notes-input", "Kelas Reguler")
      await page.click('form button[type="submit"]')
      await new Promise((r) => setTimeout(r, 500))
    }

    // Verifikasi daftar kelas di tabel
    const finalClassNames = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll("table tbody tr td:first-child"))
      return cells.map((c) => c.textContent?.trim() ?? "")
    })
    console.log("Daftar Kelas Tersimpan di Tabel:", finalClassNames)

    if (
      !finalClassNames.some((c) => c.includes("VII-A")) ||
      !finalClassNames.some((c) => c.includes("VII-B")) ||
      !finalClassNames.some((c) => c.includes("VIII-A"))
    ) {
      throw new Error("Daftar kelas tidak lengkap (harus memuat VII-A, VII-B, dan VIII-A)")
    }
    console.log("✅ Kasus Uji 2.1 Berhasil: 3 kelas tersimpan dengan validasi duplikasi bekerja.")

    await page.screenshot({
      path: path.join(screenshotsDir, "01-classes-list.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 01-classes-list.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 2.2: CRUD Mata Pelajaran & Palet Warna Visual
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 2.2: CRUD Mata Pelajaran & Warna ---")
    await switchTab(page, "Mata Pelajaran")
    await page.waitForSelector("#subject-name-input", { visible: true })

    const subjectRowsBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })

    if (!subjectRowsBefore.some((s) => s.includes("Matematika"))) {
      console.log("Menambahkan Mapel 1: Matematika (Biru)...")
      await setInputValue(page, "#subject-name-input", "Matematika")
      await selectOptionByText(page, "#subject-color-select", "Biru")
      await page.click('form button[type="submit"]')
      await new Promise((r) => setTimeout(r, 500))
    }

    if (!subjectRowsBefore.some((s) => s.includes("Bahasa Inggris"))) {
      console.log("Menambahkan Mapel 2: Bahasa Inggris (Zamrud)...")
      await setInputValue(page, "#subject-name-input", "Bahasa Inggris")
      await selectOptionByText(page, "#subject-color-select", "Zamrud")
      await page.click('form button[type="submit"]')
      await new Promise((r) => setTimeout(r, 500))
    }

    if (!subjectRowsBefore.some((s) => s.includes("Ilmu Pengetahuan Alam"))) {
      console.log("Menambahkan Mapel 3: Ilmu Pengetahuan Alam (Oranye)...")
      await setInputValue(page, "#subject-name-input", "Ilmu Pengetahuan Alam")
      await selectOptionByText(page, "#subject-color-select", "Oranye")
      await page.click('form button[type="submit"]')
      await new Promise((r) => setTimeout(r, 500))
    }

    // Verifikasi tabel mapel
    const subjectListInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })
    console.log("Daftar Mata Pelajaran di Tabel:", subjectListInfo)

    if (
      !subjectListInfo.some((s) => s.includes("Matematika") && s.includes("Biru")) ||
      !subjectListInfo.some((s) => s.includes("Bahasa Inggris") && s.includes("Zamrud")) ||
      !subjectListInfo.some((s) => s.includes("Ilmu Pengetahuan Alam") && s.includes("Oranye"))
    ) {
      throw new Error("Daftar mata pelajaran tidak menampilkan 3 mata pelajaran dengan warna yang sesuai!")
    }
    console.log("✅ Kasus Uji 2.2 Berhasil: 3 mata pelajaran tersimpan dengan palet warna.")

    await page.screenshot({
      path: path.join(screenshotsDir, "02-subjects-list.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 02-subjects-list.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 2.3: CRUD Guru & Interval Ketidaksediaan Waktu
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 2.3: CRUD Guru & Waktu Tidak Bersedia ---")
    await switchTab(page, "Guru")
    await page.waitForSelector("#teacher-name-input", { visible: true })

    const teacherRowsBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })

    if (!teacherRowsBefore.some((r) => r.includes("Budi Santoso"))) {
      console.log("Menambahkan Guru 1: Budi Santoso, S.Pd. dengan jadwal MGMP...")
      await setInputValue(page, "#teacher-name-input", "Budi Santoso, S.Pd.")
      await setInputValue(page, "#teacher-notes-input", "Guru Matematika Senior")

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const addIntervalBtn = buttons.find((b) => b.textContent?.includes("Tambah Rentang Waktu"))
        addIntervalBtn?.click()
      })
      await new Promise((r) => setTimeout(r, 300))

      const intervalRowInfo = await page.evaluate(() => {
        const startInput = document.querySelector('input[id^="teacher-unv-start-"]')
        return startInput?.id ? startInput.id.replace("teacher-unv-start-", "") : null
      })
      if (!intervalRowInfo) throw new Error("Interval waktu tidak tersedia tidak muncul!")

      console.log("Interval ID guru:", intervalRowInfo)
      await selectOptionByText(page, `#teacher-unv-day-${intervalRowInfo}`, "Senin")
      await setInputValue(page, `#teacher-unv-start-${intervalRowInfo}`, "13:00")
      await setInputValue(page, `#teacher-unv-end-${intervalRowInfo}`, "15:00")
      await setInputValue(page, `#teacher-unv-label-${intervalRowInfo}`, "Rapat MGMP")

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
        saveBtn?.click()
      })
      await new Promise((r) => setTimeout(r, 600))
    }

    if (!teacherRowsBefore.some((r) => r.includes("Siti Rahma"))) {
      console.log("Menambahkan Guru 2: Siti Rahma, M.Pd. tanpa batasan waktu...")
      await setInputValue(page, "#teacher-name-input", "Siti Rahma, M.Pd.")
      await setInputValue(page, "#teacher-notes-input", "Guru Bahasa Inggris")
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Guru"))
        saveBtn?.click()
      })
      await new Promise((r) => setTimeout(r, 600))
    }

    // Verifikasi tabel guru
    const teacherRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })
    console.log("Daftar Guru di Tabel:", teacherRows)

    const budiRow = teacherRows.find((r) => r.includes("Budi Santoso"))
    if (!budiRow || !budiRow.includes("Senin") || !budiRow.includes("13:00-15:00")) {
      throw new Error("Interval ketidaksediaan Budi Santoso tidak tercatat dengan benar!")
    }
    const sitiRow = teacherRows.find((r) => r.includes("Siti Rahma"))
    if (!sitiRow || !sitiRow.includes("Selalu tersedia")) {
      throw new Error("Ketersediaan Siti Rahma tidak berstatus selalu tersedia!")
    }
    console.log("✅ Kasus Uji 2.3 Berhasil: Guru dengan jadwal ketersediaan berhasil disimpan.")

    await page.screenshot({
      path: path.join(screenshotsDir, "03-teachers-list.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 03-teachers-list.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 2.4: CRUD Ruangan & Penentuan Tipe Fasilitas
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 2.4: CRUD Ruangan & Tipe Fasilitas ---")
    await switchTab(page, "Ruangan")
    await page.waitForSelector("#room-name-input", { visible: true })

    const roomRowsBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })

    if (!roomRowsBefore.some((r) => r.includes("Lab Komputer 1"))) {
      console.log("Menambahkan Ruangan 1: Lab Komputer 1 (Laboratorium)...")
      await setInputValue(page, "#room-name-input", "Lab Komputer 1")
      await selectOptionByText(page, "#room-type-select", "Laboratorium")
      await setInputValue(page, "#room-notes-input", "Kapasitas 36 siswa")
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Ruangan"))
        saveBtn?.click()
      })
      await new Promise((r) => setTimeout(r, 600))
    }

    if (!roomRowsBefore.some((r) => r.includes("Ruang Teori 101"))) {
      console.log("Menambahkan Ruangan 2: Ruang Teori 101 (Ruang Kelas)...")
      await setInputValue(page, "#room-name-input", "Ruang Teori 101")
      await selectOptionByText(page, "#room-type-select", "Ruang Kelas")
      await setInputValue(page, "#room-notes-input", "Kapasitas 32 siswa")
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"))
        const saveBtn = buttons.find((b) => b.textContent?.includes("Tambah Ruangan"))
        saveBtn?.click()
      })
      await new Promise((r) => setTimeout(r, 600))
    }

    // Verifikasi tabel ruangan
    const roomRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })
    console.log("Daftar Ruangan di Tabel:", roomRows)

    if (
      !roomRows.some((r) => r.includes("Lab Komputer 1") && r.includes("Laboratorium")) ||
      !roomRows.some((r) => r.includes("Ruang Teori 101") && r.includes("Ruang Kelas"))
    ) {
      throw new Error("Daftar ruangan tidak memuat Lab Komputer 1 dan Ruang Teori 101 dengan tipe yang tepat!")
    }
    console.log("✅ Kasus Uji 2.4 Berhasil: 2 fasilitas ruangan berhasil disimpan.")

    await page.screenshot({
      path: path.join(screenshotsDir, "04-rooms-list.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 04-rooms-list.png")

    // -------------------------------------------------------------------------
    // Kasus Uji 2.5: Pemetaan Kebutuhan Pembelajaran (Teaching Requirements)
    // -------------------------------------------------------------------------
    console.log("\n--- Menjalankan Kasus Uji 2.5: Pemetaan Kebutuhan Pembelajaran ---")
    await switchTab(page, "Kebutuhan Pembelajaran")
    await page.waitForSelector("#req-class-select", { visible: true })

    const reqRowsBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })

    // Kebutuhan 1: Kelas VII-A, Mapel Matematika, 2 sesi @45m, Guru Budi Santoso
    if (!reqRowsBefore.some((r) => r.includes("VII-A") && r.includes("Matematika"))) {
      console.log("Menambahkan Kebutuhan 1: VII-A · Matematika · 2 sesi @45m · Budi Santoso...")
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
      await new Promise((r) => setTimeout(r, 600))
    }

    // Kebutuhan 2: Kelas VII-A, Mapel Bahasa Inggris, 1 sesi @90m, Guru Siti Rahma
    if (!reqRowsBefore.some((r) => r.includes("VII-A") && r.includes("Bahasa Inggris"))) {
      console.log("Menambahkan Kebutuhan 2: VII-A · Bahasa Inggris · 1 sesi @90m · Siti Rahma...")
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
      await new Promise((r) => setTimeout(r, 600))
    }

    // Kebutuhan 3: Kelas VII-B, Mapel Matematika, 2 sesi @45m, Guru Budi Santoso
    if (!reqRowsBefore.some((r) => r.includes("VII-B") && r.includes("Matematika"))) {
      console.log("Menambahkan Kebutuhan 3: VII-B · Matematika · 2 sesi @45m · Budi Santoso...")
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
      await new Promise((r) => setTimeout(r, 600))
    }

    // Verifikasi tabel kebutuhan
    const reqRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"))
      return rows.map((r) => r.textContent?.trim() ?? "")
    })
    console.log("Daftar Kebutuhan Pembelajaran di Tabel:", reqRows)

    if (
      !reqRows.some((r) => r.includes("VII-A") && r.includes("Matematika") && r.includes("2 sesi")) ||
      !reqRows.some((r) => r.includes("VII-A") && r.includes("Bahasa Inggris") && r.includes("1 sesi")) ||
      !reqRows.some((r) => r.includes("VII-B") && r.includes("Matematika") && r.includes("2 sesi"))
    ) {
      throw new Error("Daftar kebutuhan pembelajaran tidak memuat ketiga alokasi kebutuhan dengan benar!")
    }
    console.log("✅ Ketiga kebutuhan pembelajaran berhasil tercatat di tabel.")

    await page.screenshot({
      path: path.join(screenshotsDir, "05-requirements-list.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 05-requirements-list.png")

    // Verifikasi di Editor Jadwal (/) untuk kelas VII-A
    console.log("Navigasi ke Editor Jadwal (/) untuk verifikasi kartu sesi belum terjadwal...")
    await page.click('nav a[href="/"]')
    await page.waitForSelector('div[role="region"][aria-label="Grid Jadwal Mingguan"]', { visible: true })
    await new Promise((r) => setTimeout(r, 600))

    // Pastikan kelas VII-A aktif terpilih di baris pemilih kelas
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[role="tab"], button'))
      const viiaBtn = buttons.find((b) => b.textContent?.trim() === "VII-A" || b.textContent?.includes("VII-A"))
      viiaBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))

    // Periksa kartu di sidebar UnscheduledPanel
    const unscheduledCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-slot="card"], .border'))
      return cards
        .map((c) => c.textContent?.trim() ?? "")
        .filter((t) => t.includes("Matematika") || t.includes("Bahasa Inggris"))
    })
    console.log("Kartu Sesi di Panel Kebutuhan:", unscheduledCards)

    const hasMath = unscheduledCards.some((c) => c.includes("Matematika") && (c.includes("2") || c.includes("45")))
    const hasEnglish = unscheduledCards.some((c) => c.includes("Bahasa Inggris") && (c.includes("1") || c.includes("90")))

    if (!hasMath || !hasEnglish) {
      throw new Error(`Kartu sesi belum terjadwal untuk Matematika & Bahasa Inggris tidak muncul lengkap di sidebar! Konten: ${JSON.stringify(unscheduledCards)}`)
    }
    console.log("✅ Sidebar Sesi Belum Terjadwal menampilkan 2 sesi Matematika (@45m) dan 1 sesi Bahasa Inggris (@90m).")

    await page.screenshot({
      path: path.join(screenshotsDir, "05-editor-unscheduled-sessions.png"),
      fullPage: true,
    })
    console.log("📸 Screenshot disimpan: 05-editor-unscheduled-sessions.png")

    console.log("\n🎉 SELURUH KASUS UJI TC-02 BERHASIL DILALUI DENGAN STATUS: PASS!")
  } catch (error) {
    console.error("❌ Terjadi kegagalan pada saat eksekusi TC-02:", error)
    await page.screenshot({
      path: path.join(screenshotsDir, "tc02-failure.png"),
      fullPage: true,
    })
    throw error
  } finally {
    await browser.close()
  }
}

void runTC02()
