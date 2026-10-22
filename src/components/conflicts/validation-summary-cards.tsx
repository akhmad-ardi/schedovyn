import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  InfoIcon,
} from "lucide-react"
import { cn } from "cn"
import type { ScopeValidationSummary, ValidationStatus } from "@/domain/types/validation"

export interface ValidationSummaryCardsProps {
  summary: ScopeValidationSummary
  scopeTitle: string
  scopeDescription?: string
  className?: string
}

function getStatusBadgeConfig(status: ValidationStatus) {
  switch (status) {
    case "CONFLICT_DETECTED":
      return {
        icon: <AlertCircleIcon className="size-4 shrink-0 text-destructive" />,
        badgeClass:
          "border-destructive/40 bg-destructive/10 text-destructive",
        containerClass: "border-destructive/30 bg-destructive/5",
        description: "Terdapat bentrokan jadwal yang perlu diselesaikan.",
      }
    case "INCOMPLETE":
      return {
        icon: (
          <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ),
        badgeClass:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
        containerClass: "border-amber-500/30 bg-amber-500/5",
        description: "Masih ada sesi atau alokasi jam mengajar yang belum terpenuhi.",
      }
    case "NO_CONFLICT_CURRENT_DATA":
      return {
        icon: <InfoIcon className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />,
        badgeClass:
          "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-300",
        containerClass: "border-blue-500/30 bg-blue-500/5",
        description: "Data cakupan ini bebas konflik, menunggu kelengkapan kelas lain.",
      }
    case "COMPLETE_AND_VALID":
      return {
        icon: (
          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ),
        badgeClass:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        containerClass: "border-emerald-500/30 bg-emerald-500/5",
        description: "Seluruh kebutuhan pembelajaran terpenuhi tanpa konflik.",
      }
  }
}

export function ValidationSummaryCards({
  summary,
  scopeTitle,
  scopeDescription,
  className,
}: ValidationSummaryCardsProps) {
  const statusConfig = getStatusBadgeConfig(summary.status)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Kartu Status Validasi Utama */}
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border p-3",
          statusConfig.containerClass
        )}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xs font-bold tracking-tight text-foreground">
              {scopeTitle}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-semibold",
                statusConfig.badgeClass
              )}
            >
              {statusConfig.icon}
              <span>{summary.statusLabel}</span>
            </span>
          </div>
          {scopeDescription && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
              {scopeDescription}
            </p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground sm:text-right">
          {statusConfig.description}
        </p>
      </div>

      {/* Grid 4 Metrik Kuantitatif */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Metrik 1: Sesi Terjadwal */}
        <div className="flex flex-col border border-border bg-card p-2.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">Sesi Terjadwal</span>
            <CalendarCheckIcon className="size-3.5 text-muted-foreground" />
          </div>
          <span className="mt-1 font-heading text-lg font-bold tabular-nums text-foreground">
            {summary.scheduledSessionsCount}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Sesi pada grid jadwal
          </span>
        </div>

        {/* Metrik 2: Sesi Belum Ditempatkan */}
        <div className="flex flex-col border border-border bg-card p-2.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">Belum Ditempatkan</span>
            <ClockIcon className="size-3.5 text-amber-500" />
          </div>
          <span
            className={cn(
              "mt-1 font-heading text-lg font-bold tabular-nums",
              summary.unscheduledSessionsCount > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground"
            )}
          >
            {summary.unscheduledSessionsCount}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Sisa kebutuhan mingguan
          </span>
        </div>

        {/* Metrik 3: Konflik Aktif */}
        <div className="flex flex-col border border-border bg-card p-2.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">Konflik Aktif</span>
            <AlertCircleIcon className="size-3.5 text-destructive" />
          </div>
          <span
            className={cn(
              "mt-1 font-heading text-lg font-bold tabular-nums",
              summary.activeConflictsCount > 0
                ? "text-destructive"
                : "text-foreground"
            )}
          >
            {summary.activeConflictsCount}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Bentrokan waktu nyata
          </span>
        </div>

        {/* Metrik 4: Peringatan Kelengkapan */}
        <div className="flex flex-col border border-border bg-card p-2.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium">Peringatan Kelengkapan</span>
            <AlertTriangleIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span
            className={cn(
              "mt-1 font-heading text-lg font-bold tabular-nums",
              summary.completenessWarningsCount > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground"
            )}
          >
            {summary.completenessWarningsCount}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Catatan pemenuhan jadwal
          </span>
        </div>
      </div>
    </div>
  )
}
