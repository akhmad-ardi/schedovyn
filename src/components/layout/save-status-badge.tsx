import { AlertTriangleIcon, CheckIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function SaveStatusBadge() {
  const saveStatus = useWorkspaceStore((state) => state.saveStatus)
  const retrySaveWorkspaceSettings = useWorkspaceStore(
    (state) => state.retrySaveWorkspaceSettings
  )

  if (saveStatus === "saving") {
    return (
      <div
        role="status"
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
            void retrySaveWorkspaceSettings()
          }}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Coba Simpan Ulang
        </Button>
      </div>
    )
  }

  if (saveStatus === "saved") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex h-7 items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
      >
        <CheckIcon className="size-3.5" />
        <span>Tersimpan di browser</span>
      </div>
    )
  }

  return null
}
