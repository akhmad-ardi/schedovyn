import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type * as UsePwaModule from "@/hooks/use-pwa"

interface MockBeforeInstallPromptEvent extends Event {
  platforms: string[]
  userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt: () => Promise<void>
}

describe("QA-PWA-01: Unit Test Hook & State Management PWA (use-pwa)", () => {
  let pwaModule: typeof UsePwaModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/hooks/use-pwa"
      pwaModule = await import(/* @vite-ignore */ modulePath)
    } catch {
      pwaModule = null
    }
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("1. modul use-pwa harus diimplementasikan dan mengekspor usePwa", () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return
    expect(typeof pwaModule.usePwa).toBe("function")
  })

  it("2. mengembalikan state awal yang deterministik saat aplikasi baru dibuka", () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    expect(result.current.isInstallable).toBe(false)
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.needRefresh).toBe(false)
    expect(result.current.offlineReady).toBe(false)
    expect(typeof result.current.promptInstall).toBe("function")
    expect(typeof result.current.reloadApp).toBe("function")
    expect(typeof result.current.dismissPrompt).toBe("function")
  })

  it("3. menangkap event beforeinstallprompt dan mengubah isInstallable menjadi true", () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({
      outcome: "accepted" as const,
      platform: "web",
    })

    const installPromptEvent = new Event("beforeinstallprompt") as unknown as MockBeforeInstallPromptEvent
    Object.assign(installPromptEvent, {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
      platforms: ["web"],
    })

    act(() => {
      window.dispatchEvent(installPromptEvent as Event)
    })

    expect(result.current.isInstallable).toBe(true)
  })

  it("4. memanggil promptInstall() memicu event.prompt() dan mengembalikan true saat pengguna menyetujui (accepted)", async () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({
      outcome: "accepted" as const,
      platform: "web",
    })

    const installPromptEvent = new Event("beforeinstallprompt") as unknown as MockBeforeInstallPromptEvent
    Object.assign(installPromptEvent, {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
      platforms: ["web"],
    })

    act(() => {
      window.dispatchEvent(installPromptEvent as Event)
    })

    expect(result.current.isInstallable).toBe(true)

    let installResult = false
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(mockPrompt).toHaveBeenCalledTimes(1)
    expect(installResult).toBe(true)
  })

  it("5. memanggil promptInstall() mengembalikan false saat pengguna menolak instalasi (dismissed)", async () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({
      outcome: "dismissed" as const,
      platform: "web",
    })

    const installPromptEvent = new Event("beforeinstallprompt") as unknown as MockBeforeInstallPromptEvent
    Object.assign(installPromptEvent, {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
      platforms: ["web"],
    })

    act(() => {
      window.dispatchEvent(installPromptEvent as Event)
    })

    let installResult = true
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(mockPrompt).toHaveBeenCalledTimes(1)
    expect(installResult).toBe(false)
  })

  it("6. memanggil promptInstall() tanpa adanya event instalasi mengembalikan false secara aman", async () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    expect(result.current.isInstallable).toBe(false)

    let installResult = true
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(installResult).toBe(false)
  })

  it("7. menangkap event appinstalled mengubah isInstalled menjadi true dan menyembunyikan isInstallable", () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    // Simulasikan event beforeinstallprompt sebelumnya
    const installPromptEvent = new Event("beforeinstallprompt") as unknown as MockBeforeInstallPromptEvent
    Object.assign(installPromptEvent, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
      platforms: ["web"],
    })
    act(() => {
      window.dispatchEvent(installPromptEvent as Event)
    })
    expect(result.current.isInstallable).toBe(true)

    // Pengguna menyelesaikan instalasi
    act(() => {
      window.dispatchEvent(new Event("appinstalled"))
    })

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.isInstallable).toBe(false)
  })

  it("8. mendeteksi mode standalone melalui matchMedia dan mengatur isInstalled: true", () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("display-mode: standalone"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => pwaModule!.usePwa())

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.isInstallable).toBe(false)
  })

  it("9. menutup banner prompt via dismissPrompt() mengatur needRefresh dan offlineReady ke false", () => {
    expect(pwaModule).not.toBeNull()
    if (!pwaModule) return

    const { result } = renderHook(() => pwaModule!.usePwa())

    act(() => {
      result.current.dismissPrompt()
    })

    expect(result.current.needRefresh).toBe(false)
    expect(result.current.offlineReady).toBe(false)
  })
})
