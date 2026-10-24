import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as PwaPromptModule from "@/components/pwa/pwa-reload-prompt"
import type * as PwaInstallButtonModule from "@/components/pwa/pwa-install-button"

describe("QA-PWA-02: Component Test UI Prompt & Install Button (pwa-ui)", () => {
  let promptModule: typeof PwaPromptModule | null = null
  let installBtnModule: typeof PwaInstallButtonModule | null = null

  beforeAll(async () => {
    try {
      promptModule = await import(/* @vite-ignore */ "@/components/pwa/pwa-reload-prompt")
    } catch {
      promptModule = null
    }

    try {
      installBtnModule = await import(/* @vite-ignore */ "@/components/pwa/pwa-install-button")
    } catch {
      installBtnModule = null
    }
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("1. PwaReloadPrompt Rendering & User Interactions", () => {
    it("komponen PwaReloadPrompt harus terdefinisi dan diekspor", () => {
      expect(promptModule).not.toBeNull()
      if (!promptModule) return
      expect(typeof promptModule.PwaReloadPrompt).toBe("function")
    })

    it("tidak merender elemen apa pun saat needRefresh false dan offlineReady false", () => {
      expect(promptModule).not.toBeNull()
      if (!promptModule) return

      const { container } = render(
        <promptModule.PwaReloadPrompt
          needRefresh={false}
          offlineReady={false}
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("menampilkan alert pembaruan dengan copywriting Bahasa Indonesia dan tombol aksi saat needRefresh: true", async () => {
      expect(promptModule).not.toBeNull()
      if (!promptModule) return

      const user = userEvent.setup()
      const reloadMock = vi.fn().mockResolvedValue(undefined)
      const dismissMock = vi.fn()

      render(
        <promptModule.PwaReloadPrompt
          needRefresh={true}
          offlineReady={false}
          onReload={reloadMock}
          onDismiss={dismissMock}
        />
      )

      // Memverifikasi heading dan deskripsi
      expect(
        screen.getByRole("heading", { name: /pembaruan aplikasi tersedia/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText(/versi baru schedovyn telah tersedia/i)
      ).toBeInTheDocument()

      // Larangan penggunaan em dash (—)
      const alertElement = screen.getByRole("alert")
      expect(alertElement.textContent).not.toContain("—")

      // Tombol Perbarui Sekarang
      const updateButton = screen.getByRole("button", {
        name: /perbarui sekarang/i,
      })
      expect(updateButton).toBeInTheDocument()
      await user.click(updateButton)
      expect(reloadMock).toHaveBeenCalledTimes(1)

      // Tombol Nanti
      const dismissButton = screen.getByRole("button", { name: /nanti/i })
      expect(dismissButton).toBeInTheDocument()
      await user.click(dismissButton)
      expect(dismissMock).toHaveBeenCalledTimes(1)
    })

    it("menampilkan alert mode offline siap dengan copywriting yang benar saat offlineReady: true", async () => {
      expect(promptModule).not.toBeNull()
      if (!promptModule) return

      const user = userEvent.setup()
      const dismissMock = vi.fn()

      render(
        <promptModule.PwaReloadPrompt
          needRefresh={false}
          offlineReady={true}
          onReload={vi.fn()}
          onDismiss={dismissMock}
        />
      )

      // Memverifikasi judul dan deskripsi mode offline
      expect(
        screen.getByRole("heading", { name: /mode offline siap/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText(/siap digunakan tanpa koneksi internet/i)
      ).toBeInTheDocument()

      // Larangan penggunaan em dash (—)
      const alertElement = screen.getByRole("alert")
      expect(alertElement.textContent).not.toContain("—")

      // Tombol Mengerti
      const dismissButton = screen.getByRole("button", { name: /mengerti/i })
      expect(dismissButton).toBeInTheDocument()
      await user.click(dismissButton)
      expect(dismissMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("2. PwaInstallButton Rendering & User Interactions", () => {
    it("komponen PwaInstallButton harus terdefinisi dan diekspor", () => {
      expect(installBtnModule).not.toBeNull()
      if (!installBtnModule) return
      expect(typeof installBtnModule.PwaInstallButton).toBe("function")
    })

    it("tidak merender tombol saat isInstallable false", () => {
      expect(installBtnModule).not.toBeNull()
      if (!installBtnModule) return

      const { container } = render(
        <installBtnModule.PwaInstallButton
          isInstallable={false}
          isInstalled={false}
          onInstall={vi.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
      expect(
        screen.queryByRole("button", { name: /pasang aplikasi/i })
      ).not.toBeInTheDocument()
    })

    it("tidak merender tombol saat aplikasi sudah terpasang (isInstalled: true)", () => {
      expect(installBtnModule).not.toBeNull()
      if (!installBtnModule) return

      const { container } = render(
        <installBtnModule.PwaInstallButton
          isInstallable={true}
          isInstalled={true}
          onInstall={vi.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
      expect(
        screen.queryByRole("button", { name: /pasang aplikasi/i })
      ).not.toBeInTheDocument()
    })

    it("merender tombol Pasang Aplikasi saat isInstallable: true dan memanggil onInstall saat diklik", async () => {
      expect(installBtnModule).not.toBeNull()
      if (!installBtnModule) return

      const user = userEvent.setup()
      const installMock = vi.fn().mockResolvedValue(true)

      render(
        <installBtnModule.PwaInstallButton
          isInstallable={true}
          isInstalled={false}
          onInstall={installMock}
        />
      )

      const installButton = screen.getByRole("button", {
        name: /pasang aplikasi/i,
      })
      expect(installButton).toBeInTheDocument()

      await user.click(installButton)
      expect(installMock).toHaveBeenCalledTimes(1)
    })

    it("mendukung interaksi keyboard (Tab & Enter) pada tombol Pasang Aplikasi", async () => {
      expect(installBtnModule).not.toBeNull()
      if (!installBtnModule) return

      const user = userEvent.setup()
      const installMock = vi.fn().mockResolvedValue(true)

      render(
        <installBtnModule.PwaInstallButton
          isInstallable={true}
          isInstalled={false}
          onInstall={installMock}
        />
      )

      const installButton = screen.getByRole("button", {
        name: /pasang aplikasi/i,
      })
      installButton.focus()
      expect(installButton).toHaveFocus()

      await user.keyboard("{Enter}")
      expect(installMock).toHaveBeenCalledTimes(1)
    })
  })
})
