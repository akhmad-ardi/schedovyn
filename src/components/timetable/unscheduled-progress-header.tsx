export interface UnscheduledProgressHeaderProps {
  totalRequired: number
  totalScheduled: number
  totalRemaining: number
  percentage: number
}

export function UnscheduledProgressHeader({
  totalRequired,
  totalScheduled,
  totalRemaining,
  percentage,
}: UnscheduledProgressHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-semibold tracking-tight text-foreground">
          Sesi Belum Terjadwal
        </h2>
        <span className="border border-border bg-muted px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-foreground">
          {totalRemaining} sesi tersisa
        </span>
      </div>

      {totalRequired > 0 && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres Alokasi Sesi"
            className="h-1.5 w-full overflow-hidden bg-muted rounded-none"
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>
              {totalScheduled} dari {totalRequired} sesi terjadwal
            </span>
            <span className="font-medium text-foreground">{percentage}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
