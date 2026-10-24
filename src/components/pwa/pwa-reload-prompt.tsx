import { CheckCircle2Icon, RefreshCwIcon, WifiOffIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export interface PwaReloadPromptProps {
  needRefresh: boolean
  offlineReady: boolean
  onReload: () => Promise<void> | void
  onDismiss: () => void
}

/**
 * Komponen notifikasi mengambang (floating alert) untuk memberitahukan ketersediaan
 * pembaruan Service Worker baru atau kesiapan aplikasi untuk penggunaan offline penuh.
 */
export function PwaReloadPrompt({
  needRefresh,
  offlineReady,
  onReload,
  onDismiss,
}: PwaReloadPromptProps) {
  if (!needRefresh && !offlineReady) {
    return null
  }

  return (
    <aside
      aria-label="Pemberitahuan Status Aplikasi"
      className="fixed right-4 bottom-4 z-50 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {needRefresh ? (
        <Alert
          variant="default"
          className="border-primary/40 bg-card p-4 shadow-lg ring-1 ring-primary/20"
        >
          <RefreshCwIcon className="size-4 animate-spin text-primary" />
          <div className="flex flex-col gap-1">
            <AlertTitle
              role="heading"
              aria-level={4}
              className="font-heading text-sm font-semibold tracking-tight text-foreground"
            >
              Pembaruan Aplikasi Tersedia
            </AlertTitle>
            <AlertDescription className="text-xs/relaxed text-muted-foreground">
              Versi baru Schedovyn telah tersedia. Perbarui sekarang untuk
              mendapatkan fitur terbaru.
            </AlertDescription>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-xs"
            >
              Nanti
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => void onReload()}
              className="text-xs"
            >
              Perbarui Sekarang
            </Button>
          </div>
        </Alert>
      ) : (
        <Alert
          variant="default"
          className="border-emerald-500/40 bg-card p-4 shadow-lg ring-1 ring-emerald-500/20"
        >
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            <WifiOffIcon className="size-3.5" />
          </div>
          <div className="flex flex-col gap-1">
            <AlertTitle
              role="heading"
              aria-level={4}
              className="font-heading text-sm font-semibold tracking-tight text-foreground"
            >
              Mode Offline Siap
            </AlertTitle>
            <AlertDescription className="text-xs/relaxed text-muted-foreground">
              Schedovyn telah tersimpan di browser dan siap digunakan tanpa
              koneksi internet.
            </AlertDescription>
          </div>
          <div className="mt-3 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="text-xs"
            >
              Mengerti
            </Button>
          </div>
        </Alert>
      )}
    </aside>
  )
}
