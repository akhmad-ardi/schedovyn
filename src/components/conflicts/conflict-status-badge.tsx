import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
} from "lucide-react"
import { cn } from "cn"
import { VALIDATION_STATUS_LABELS } from "@/domain/types/validation"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface ConflictStatusBadgeProps {
  scope?: "workspace" | "active-class" | "dual"
  onOpenConflictList?: () => void
  className?: string
}

export function ConflictStatusBadge({
  scope = "workspace",
  onOpenConflictList,
  className,
}: ConflictStatusBadgeProps) {
  const getWorkspaceSummary = useWorkspaceStore(
    (state) => state.getWorkspaceValidationSummary
  )
  const getActiveClassSummary = useWorkspaceStore(
    (state) => state.getActiveClassValidationSummary
  )

  const summary =
    scope === "active-class"
      ? getActiveClassSummary()
      : getWorkspaceSummary()

  const status = summary?.status ?? "INCOMPLETE"
  const statusLabel = summary?.statusLabel ?? VALIDATION_STATUS_LABELS[status]
  const conflictsCount = summary?.activeConflictsCount ?? 0
  const warningsCount = summary?.completenessWarningsCount ?? 0

  const ariaLabel = `Status Validasi: ${statusLabel}`

  const renderBadgeContent = () => {
    switch (status) {
      case "CONFLICT_DETECTED":
        return {
          icon: <AlertCircleIcon className="size-3.5 text-destructive shrink-0" />,
          label: `${conflictsCount} Konflik`,
          style:
            "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        }
      case "INCOMPLETE":
        return {
          icon: (
            <AlertTriangleIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          ),
          label: warningsCount > 0 ? `${warningsCount} Peringatan` : "Belum Lengkap",
          style:
            "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20",
        }
      case "NO_CONFLICT_CURRENT_DATA":
        return {
          icon: <InfoIcon className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />,
          label: "Bebas Konflik",
          style:
            "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200 hover:bg-blue-500/20",
        }
      case "COMPLETE_AND_VALID":
        return {
          icon: (
            <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ),
          label: "Lengkap & Valid",
          style:
            "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20",
        }
    }
  }

  const { icon, label, style } = renderBadgeContent()

  return (
    <button
      type="button"
      role="button"
      aria-label={ariaLabel}
      onClick={onOpenConflictList}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 border px-2.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none",
        style,
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
