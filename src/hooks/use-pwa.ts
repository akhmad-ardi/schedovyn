import * as React from "react"
import { useRegisterSW } from "virtual:pwa-register/react"

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt: () => Promise<void>
}

export interface PwaState {
  /** Apakah aplikasi dapat diinstal ke perangkat (event beforeinstallprompt ditangkap) */
  isInstallable: boolean
  /** Apakah aplikasi sudah berjalan dalam mode standalone atau telah terpasang */
  isInstalled: boolean
  /** Apakah ada versi pembaruan aplikasi baru yang menunggu aktivasi */
  needRefresh: boolean
  /** Apakah aset aplikasi telah selesai di-cache dan siap untuk penggunaan offline */
  offlineReady: boolean
  /** Memicu dialog instalasi native peramban */
  promptInstall: () => Promise<boolean>
  /** Memperbarui Service Worker ke versi terbaru dan memuat ulang halaman */
  reloadApp: () => Promise<void>
  /** Menutup banner pemberitahuan pembaruan/offline */
  dismissPrompt: () => void
}

/**
 * Hook custom untuk mengelola daur hidup Progressive Web App (PWA),
 * deteksi instalasi native browser, dan pembaruan Service Worker terkendali.
 */
export function usePwa(): PwaState {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = React.useState<boolean>(false)
  const [isInstalled, setIsInstalled] = React.useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false
    }
    const isStandaloneDisplay =
      Boolean(window.matchMedia?.("(display-mode: standalone)").matches)
    const isIosStandalone = Boolean(
      (navigator as unknown as { standalone?: boolean }).standalone
    )
    return isStandaloneDisplay || isIosStandalone
  })

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Cek update secara berkala setiap 1 jam jika diperlukan
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error("Service worker registration error:", error)
    },
  })

  // Listener event instalasi browser (beforeinstallprompt & appinstalled)
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Cegah mini-infobar default browser agar UI tombol kustom dapat ditampilkan
      event.preventDefault()
      const installEvent = event as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)

      // Hanya tampilkan jika aplikasi belum berjalan dalam mode terpasang
      if (!isInstalled) {
        setIsInstallable(true)
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Listener perubahan display-mode jika pengguna berpindah ke standalone
    const mediaQuery = window.matchMedia?.("(display-mode: standalone)")
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
      }
    }

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleDisplayModeChange)
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener("change", handleDisplayModeChange)
      }
    }
  }, [isInstalled])

  const promptInstall = React.useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === "accepted") {
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      }
      return false
    } catch (error) {
      console.error("Gagal memunculkan dialog instalasi native:", error)
      return false
    }
  }, [deferredPrompt])

  const reloadApp = React.useCallback(async () => {
    await updateServiceWorker(true)
  }, [updateServiceWorker])

  const dismissPrompt = React.useCallback(() => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }, [setNeedRefresh, setOfflineReady])

  return {
    isInstallable: isInstallable && !isInstalled,
    isInstalled,
    needRefresh,
    offlineReady,
    promptInstall,
    reloadApp,
    dismissPrompt,
  }
}
