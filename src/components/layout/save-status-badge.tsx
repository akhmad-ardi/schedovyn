import { AlertTriangleIcon, CheckIcon, DatabaseIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useWorkspaceStore } from "@/store/use-workspace-store"

function formatSavedTime(isoString: string | null): string {
  if (!isoString) return "-"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  } catch {
    return isoString
  }
}

export function SaveStatusBadge() {
  const saveStatus = useWorkspaceStore((state) => state.saveStatus)
  const lastSavedAt = useWorkspaceStore((state) => state.lastSavedAt)
  const retryPendingStorageSync = useWorkspaceStore(
    (state) => state.retryPendingStorageSync
  )

  if (saveStatus === "saving") {
    return (
      <div
        aria-live="polite"
        className="inline-flex h-7 items-center gap-1.5 border border-border bg-muted/50 px-2.5 text-xs text-muted-foreground"
      >
        <Spinner className="size-3.5" />
        <span>Menyimpan...</span>
      </div>
    )
  }

  if (saveStatus === "error") {
    return (
      <div
        role="status"
        aria-live="assertive"
        className="inline-flex items-center gap-1.5"
      >
        <div className="inline-flex h-7 items-center gap-1.5 border border-destructive/50 bg-destructive/10 px-2.5 text-xs font-medium text-destructive">
          <AlertTriangleIcon className="size-3.5" />
          <span>Gagal menyimpan lokal</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void retryPendingStorageSync()
          }}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Coba Simpan Ulang
        </Button>
      </div>
    )
  }

  if (saveStatus === "saved") {
    const timeDisplay = formatSavedTime(lastSavedAt)

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="status"
            aria-live="polite"
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <CheckIcon className="size-3.5" />
            <span>Tersimpan di browser</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3 text-xs">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground">Status Penyimpanan</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="size-3" />
                Sinkron
              </span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <DatabaseIcon className="size-3 text-muted-foreground" />
                  Media:
                </span>
                <span className="font-medium text-foreground">IndexedDB (Lokal)</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Stempel Waktu:</span>
                <span className="font-mono tabular-nums text-foreground">
                  {timeDisplay}
                </span>
              </div>
            </div>

            <div className="border border-border bg-muted/50 p-2 text-[11px] leading-relaxed text-muted-foreground">
              Penyimpanan ini berada di browser perangkat ini. Selalu ekspor ke PDF atau Excel secara berkala sebagai salinan cadangan.
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return null
}
