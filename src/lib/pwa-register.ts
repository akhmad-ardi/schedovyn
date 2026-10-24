import * as React from "react"

export interface RegisterSWOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
}

export function useRegisterSW(): {
  needRefresh: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
  offlineReady: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
} {
  const [needRefresh, setNeedRefresh] = React.useState<boolean>(false)
  const [offlineReady, setOfflineReady] = React.useState<boolean>(false)

  const updateServiceWorker = React.useCallback(async () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }, [])

  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  }
}
