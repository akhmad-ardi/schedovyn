import * as React from "react"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ExternalLinkIcon,
  LayersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DAY_OF_WEEK_LABELS } from "@/domain/types/entities"
import type { ScheduleConflict } from "@/domain/types/validation"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface ConflictListPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FilterTab = "all" | "conflicts" | "warnings"

export function ConflictListPanel({
  open,
  onOpenChange,
}: ConflictListPanelProps) {
  const [filter, setFilter] = React.useState<FilterTab>("all")

  const validationReport = useWorkspaceStore((state) => state.validationReport)
  const classes = useWorkspaceStore((state) => state.classes)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const setActiveClass = useWorkspaceStore((state) => state.setActiveClass)
  const selectSession = useWorkspaceStore((state) => state.selectSession)

  const activeClassId = workspace?.activeClassId ?? null
  const conflicts = validationReport?.workspaceSummary.conflicts ?? []
  const warnings = validationReport?.workspaceSummary.warnings ?? []

  const handleNavigateClass = async (
    targetClassId: string,
    conflict: ScheduleConflict
  ) => {
    await setActiveClass(targetClassId)
    if (conflict.affectedSessionIds.length > 0) {
      selectSession(conflict.affectedSessionIds[0])
    }
    onOpenChange(false)
  }

  const showConflicts = filter === "all" || filter === "conflicts"
  const showWarnings = filter === "all" || filter === "warnings"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Daftar Konflik dan Peringatan</DialogTitle>
          <DialogDescription>
            Ringkasan bentrokan waktu antar-kelas dan catatan kelengkapan jadwal
            pembelajaran di seluruh ruang kerja.
          </DialogDescription>
        </DialogHeader>

        {/* Bilah Tab Filter */}
        <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-4 py-2 text-xs">
          <Button
            type="button"
            variant={filter === "all" ? "default" : "ghost"}
            size="xs"
            onClick={() => setFilter("all")}
          >
            Semua ({conflicts.length + warnings.length})
          </Button>
          <Button
            type="button"
            variant={filter === "conflicts" ? "default" : "ghost"}
            size="xs"
            onClick={() => setFilter("conflicts")}
            className={conflicts.length > 0 ? "text-destructive" : ""}
          >
            Bentrokan Waktu ({conflicts.length})
          </Button>
          <Button
            type="button"
            variant={filter === "warnings" ? "default" : "ghost"}
            size="xs"
            onClick={() => setFilter("warnings")}
          >
            Peringatan Kelengkapan ({warnings.length})
          </Button>
        </div>

        {/* Konten Daftar Item */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {conflicts.length === 0 && warnings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
              <LayersIcon className="mb-2 size-8 text-muted-foreground/50" />
              <p className="font-medium text-foreground">
                Tidak ada konflik atau peringatan aktif
              </p>
              <p className="mt-1">
                Seluruh sesi pembelajaran saat ini bebas dari bentrokan waktu.
              </p>
            </div>
          )}

          {/* Daftar Bentrokan Waktu (ERROR) */}
          {showConflicts &&
            conflicts.map((c) => {
              const dayLabel = DAY_OF_WEEK_LABELS[c.dayOfWeek] ?? c.dayOfWeek
              const navClassIds = c.affectedClassIds.filter(
                (cid) => cid !== activeClassId
              )
              const displayNavClassIds =
                navClassIds.length > 0 ? navClassIds : c.affectedClassIds

              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 border border-destructive/40 bg-destructive/5 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
                      <span className="font-heading text-xs font-bold text-destructive">
                        {c.title}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      <ClockIcon className="size-3" />
                      <span>
                        {dayLabel}, {c.startTime} - {c.endTime}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs/relaxed text-foreground">
                    {c.description}
                  </p>

                  {/* Tombol Aksi Navigasi Lintas Kelas */}
                  {displayNavClassIds.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 pt-2 border-t border-destructive/20">
                      <span className="text-[10px] text-muted-foreground">
                        Navigasi Cepat:
                      </span>
                      {displayNavClassIds.map((cid) => {
                        const cls = classes.find((cl) => cl.id === cid)
                        const className = cls?.name ?? cid

                        return (
                          <Button
                            key={`nav-${c.id}-${cid}`}
                            type="button"
                            variant="outline"
                            size="xs"
                            aria-label={`Lihat di Kelas ${className}`}
                            onClick={() => void handleNavigateClass(cid, c)}
                            className="text-xs h-6 px-2 gap-1"
                          >
                            <ExternalLinkIcon className="size-3" />
                            <span>Lihat di Jadwal</span>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

          {/* Daftar Peringatan Kelengkapan (WARNING) */}
          {showWarnings &&
            warnings.map((w) => {
              const cls = classes.find((cl) => cl.id === w.classId)
              const className = cls?.name ?? w.classId

              return (
                <div
                  key={w.id}
                  className="flex flex-col gap-1.5 border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="font-heading text-xs font-semibold text-foreground">
                        {w.title}
                      </span>
                    </div>
                    <span className="border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Kelas {className}
                    </span>
                  </div>
                  <p className="text-xs/relaxed text-muted-foreground">
                    {w.description}
                  </p>
                </div>
              )
            })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
