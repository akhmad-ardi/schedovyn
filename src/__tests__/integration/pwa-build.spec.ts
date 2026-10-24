import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("QA-PWA-03 & AC-PWA-01, AC-PWA-02: Integration Test PWA Build & Configuration (pwa-build)", () => {
  const rootDir = process.cwd()

  it("1. package.json harus mencakup dependensi vite-plugin-pwa", () => {
    const pkgPath = path.resolve(rootDir, "package.json")
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    const hasPwaDep =
      Boolean(pkg.dependencies?.["vite-plugin-pwa"]) ||
      Boolean(pkg.devDependencies?.["vite-plugin-pwa"])

    expect(
      hasPwaDep,
      "vite-plugin-pwa harus terpasang di dependencies atau devDependencies"
    ).toBe(true)
  })

  it("2. tsconfig.app.json harus menyertakan tipe vite-plugin-pwa/client", () => {
    const tsconfigPath = path.resolve(rootDir, "tsconfig.app.json")
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8")) as {
      compilerOptions?: {
        types?: string[]
      }
    }

    const types = tsconfig.compilerOptions?.types ?? []
    expect(
      types,
      "tsconfig.app.json compilerOptions.types harus menyertakan 'vite-plugin-pwa/client'"
    ).toContain("vite-plugin-pwa/client")
  })

  it("3. vite.config.ts harus mengonfigurasi VitePWA dengan registerType 'prompt' dan opsi manifest lengkap", () => {
    const viteConfigPath = path.resolve(rootDir, "vite.config.ts")
    const content = fs.readFileSync(viteConfigPath, "utf-8")

    // Verifikasi impor dan inisialisasi plugin VitePWA
    expect(content).toContain("vite-plugin-pwa")
    expect(content).toContain("VitePWA(")

    // AC-PWA-04: registerType harus 'prompt' (pembaruan terkendali tanpa reload paksa)
    expect(content).toMatch(/registerType:\s*["']prompt["']/)

    // AC-PWA-02: Manifest web
    expect(content).toContain("Schedovyn - Smart Timetable Planner")
    expect(content).toContain("Schedovyn")
    expect(content).toMatch(/theme_color:\s*["']#1547E6["']/)
    expect(content).toMatch(/background_color:\s*["']#ffffff["']/)
    expect(content).toMatch(/display:\s*["']standalone["']/)

    // Workbox pre-caching
    expect(content).toContain("navigateFallback")
    expect(content).toContain("cleanupOutdatedCaches")
  })

  it("4. aset ikon PWA (192x192, 512x512, dan favico.svg) harus tersedia di direktori public/", () => {
    const publicDir = path.resolve(rootDir, "public")

    const icon192 = path.resolve(publicDir, "pwa-192x192.png")
    const icon512 = path.resolve(publicDir, "pwa-512x512.png")
    const favico = path.resolve(publicDir, "favico.svg")

    expect(
      fs.existsSync(icon192),
      "public/pwa-192x192.png harus tersedia untuk manifest PWA"
    ).toBe(true)
    expect(
      fs.existsSync(icon512),
      "public/pwa-512x512.png harus tersedia untuk manifest PWA"
    ).toBe(true)
    expect(
      fs.existsSync(favico),
      "public/favico.svg harus tersedia sebagai favicon utama"
    ).toBe(true)
  })

  it("5. hasil build dist/ harus menghasilkan manifest.webmanifest dan service worker sw.js", () => {
    const distDir = path.resolve(rootDir, "dist")
    const manifestPath = path.resolve(distDir, "manifest.webmanifest")
    const swPath = path.resolve(distDir, "sw.js")

    // Verifikasi keberadaan artefak PWA di dist
    expect(
      fs.existsSync(manifestPath),
      "dist/manifest.webmanifest harus terbuat setelah VitePWA build"
    ).toBe(true)
    expect(
      fs.existsSync(swPath),
      "dist/sw.js (Service Worker) harus terbuat setelah VitePWA build"
    ).toBe(true)
  })
})
