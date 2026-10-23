import * as React from "react"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ExternalLinkIcon,
  LayersIcon,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DAY_OF_WEEK_LABELS } from "@/domain/types/entities"
import {
  VALIDATION_STATUS_LABELS,
  type ScheduleConflict,
  type ScopeValidationSummary,
} from "@/domain/types/validation"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { ValidationSummaryCards } from "@/components/conflicts/validation-summary-cards"

export interface ConflictListPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FilterTab = "all" | "classes" | "conflicts" | "warnings"
type ScopeKey = "active-class" | "workspace"

const fallbackSummary: ScopeValidationSummary = {
  status: "INCOMPLETE",
  statusLabel: VALIDATION_STATUS_LABELS.INCOMPLETE,
  scheduledSessionsCount: 0,
  unscheduledSessionsCount: 0,
  activeConflictsCount: 0,
  completenessWarningsCount: 0,
  conflicts: [],
  warnings: [],
}

export function ConflictListPanel({
  open,
  onOpenChange,
}: ConflictListPanelProps) {
  const [scope, setScope] = React.useState<ScopeKey>("workspace")
  const [userSelectedFilter, setUserSelectedFilter] =
    React.useState<FilterTab | null>(null)

  const classes = useWorkspaceStore((state) => state.classes)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const setActiveClass = useWorkspaceStore((state) => state.setActiveClass)
  const selectSession = useWorkspaceStore((state) => state.selectSession)
  const getWorkspaceSummary = useWorkspaceStore(
    (state) => state.getWorkspaceValidationSummary
  )
  const getActiveClassSummary = useWorkspaceStore(
    (state) => state.getActiveClassValidationSummary
  )
  const getAllClassesSummaries = useWorkspaceStore(
    (state) => state.getAllClassesValidationSummaries
  )

  const activeClassId = workspace?.activeClassId ?? null
  const activeClass = classes.find((c) => c.id === activeClassId)

  const workspaceSummary = getWorkspaceSummary() ?? fallbackSummary
  const activeClassSummary = getActiveClassSummary() ?? fallbackSummary
  const classSummaries = getAllClassesSummaries()

  const currentSummary =
    scope === "active-class" ? activeClassSummary : workspaceSummary

  const conflicts = workspaceSummary.conflicts
  const warnings = workspaceSummary.warnings

  const filter: FilterTab =
    userSelectedFilter ?? (conflicts.length > 0 ? "conflicts" : "classes")

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

  const handleOpenClass = async (targetClassId: string) => {
    await setActiveClass(targetClassId)
    onOpenChange(false)
  }

  const showClasses = filter === "all" || filter === "classes"
  const showConflicts = filter === "all" || filter === "conflicts"
  const showWarnings = filter === "all" || filter === "warnings"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl! flex-col gap-0 p-0 overflow-hidden">
        {/* Header Dialog */}
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Ringkasan Validasi: Daftar Konflik dan Peringatan</DialogTitle>
          <DialogDescription>
            Ringkasan kelayakan jadwal pembelajaran untuk kelas aktif dan seluruh ruang
            kerja sekolah.
          </DialogDescription>
        </DialogHeader>

        {/* Pemilih Cakupan (Scope Selector) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Cakupan Ringkasan:
          </span>
          <div className="inline-flex border border-border bg-muted/40 p-0.5">
            <Button
              type="button"
              variant={scope === "active-class" ? "default" : "ghost"}
              size="xs"
              onClick={() => setScope("active-class")}
              className="h-6 px-2.5 text-xs font-medium"
            >
              Kelas Aktif{activeClass ? `: ${activeClass.name}` : ""}
            </Button>
            <Button
              type="button"
              variant={scope === "workspace" ? "default" : "ghost"}
              size="xs"
              onClick={() => setScope("workspace")}
              className="h-6 px-2.5 text-xs font-medium"
            >
              Seluruh Ruang Kerja
            </Button>
          </div>
        </div>

        {/* 5 Metrik Ringkasan Validasi */}
        <div className="border-b border-border bg-card p-4">
          <ValidationSummaryCards
            summary={currentSummary}
            scopeTitle={
              scope === "active-class"
                ? `Kelas Aktif: ${activeClass?.name ?? "-"}`
                : "Seluruh Ruang Kerja"
            }
            scopeDescription={
              scope === "active-class"
                ? "Evaluasi validasi pembelajaran untuk kelas aktif saat ini"
                : "Evaluasi validasi global mencakup seluruh kelas di ruang kerja"
            }
          />
        </div>

        {/* Bilah Tab Filter */}
        <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-4 py-2 text-xs">
          <Button
            type="button"
            variant={filter === "classes" ? "default" : "ghost"}
            size="xs"
            onClick={() => setUserSelectedFilter("classes")}
          >
            Matriks Kelas ({classSummaries.length})
          </Button>
          <Button
            type="button"
            variant={filter === "conflicts" ? "default" : "ghost"}
            size="xs"
            onClick={() => setUserSelectedFilter("conflicts")}
            className={conflicts.length > 0 ? "text-destructive" : ""}
          >
            Bentrokan Waktu ({conflicts.length})
          </Button>
          <Button
            type="button"
            variant={filter === "warnings" ? "default" : "ghost"}
            size="xs"
            onClick={() => setUserSelectedFilter("warnings")}
          >
            Peringatan Kelengkapan ({warnings.length})
          </Button>
          <Button
            type="button"
            variant={filter === "all" ? "default" : "ghost"}
            size="xs"
            onClick={() => setUserSelectedFilter("all")}
          >
            Semua ({conflicts.length + warnings.length})
          </Button>
        </div>

        {/* Konten Daftar Item */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* Matriks Status Seluruh Kelas */}
          {showClasses && (
            <div className="flex flex-col gap-2 border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-bold text-foreground">
                  Matriks Status Seluruh Kelas
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Klik &quot;Buka Jadwal&quot; untuk beralih kelas
                </span>
              </div>

              {classSummaries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center text-xs text-muted-foreground">
                  <p>Belum ada data kelas yang terdaftar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-2">Kelas</th>
                        <th className="p-2">Tingkat</th>
                        <th className="p-2 text-center">Terjadwal</th>
                        <th className="p-2 text-center">Belum Selesai</th>
                        <th className="p-2 text-center">Konflik</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {classSummaries.map((item) => {
                        const isCurrentActive = item.classGroup.id === activeClassId
                        return (
                          <tr
                            key={item.classGroup.id}
                            className={cn(
                              "hover:bg-muted/30 transition-colors",
                              isCurrentActive && "bg-primary/5"
                            )}
                          >
                            <td className="p-2 font-medium text-foreground">
                              {item.classGroup.name}
                              {isCurrentActive && (
                                <span className="ml-1.5 text-[10px] text-primary font-normal">
                                  (Aktif)
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {item.classGroup.grade}
                            </td>
                            <td className="p-2 text-center font-mono tabular-nums">
                              {item.summary.scheduledSessionsCount}
                            </td>
                            <td className="p-2 text-center font-mono tabular-nums">
                              <span
                                className={
                                  item.summary.unscheduledSessionsCount > 0
                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                    : "text-muted-foreground"
                                }
                              >
                                {item.summary.unscheduledSessionsCount}
                              </span>
                            </td>
                            <td className="p-2 text-center font-mono tabular-nums">
                              <span
                                className={
                                  item.summary.activeConflictsCount > 0
                                    ? "text-destructive font-bold"
                                    : "text-muted-foreground"
                                }
                              >
                                {item.summary.activeConflictsCount}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className="text-[11px] font-medium">
                                {item.summary.statusLabel}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => void handleOpenClass(item.classGroup.id)}
                                className="h-6 px-2 text-xs"
                              >
                                Buka Jadwal
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {conflicts.length === 0 && warnings.length === 0 && !showClasses && (
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
