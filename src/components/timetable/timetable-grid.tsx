import { useMemo } from "react"
import {
  calculateGridBoundaries,
  PIXELS_PER_MINUTE,
  timeToGridTopPx,
} from "@/domain/timetable/grid-layout"
import { minutesToTime } from "@/domain/time/time-utils"
import { DAY_OF_WEEK_LABELS, type TimetableSession } from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { TimetableDayColumn } from "./timetable-day-column"

export interface TimetableGridProps {
  sessions: TimetableSession[]
}

export function TimetableGrid({ sessions }: TimetableGridProps) {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const selectSession = useWorkspaceStore((state) => state.selectSession)

  const boundaries = useMemo(
    () => calculateGridBoundaries(dayConfigs),
    [dayConfigs]
  )

  const snapIntervalMinutes = workspace?.defaultSnapIntervalMinutes ?? 15

  // Saring hanya hari sekolah aktif (atau semua hari jika tidak ada yang aktif)
  const activeDays = useMemo(() => {
    const schoolDays = dayConfigs.filter((d) => d.isSchoolDay)
    return schoolDays.length > 0 ? schoolDays : dayConfigs
  }, [dayConfigs])

  // Hitung penanda jam linier untuk sumbu vertikal
  const hourMarkers = useMemo(() => {
    const markers: { minutes: number; timeStr: string; topPx: number }[] = []
    const startHour = Math.floor(boundaries.originMinutes / 60)
    const endHour = Math.ceil(boundaries.maxMinutes / 60)

    for (let h = startHour; h <= endHour; h++) {
      const m = h * 60
      if (m >= boundaries.originMinutes && m <= boundaries.maxMinutes) {
        const timeStr = minutesToTime(m)
        const topPx = timeToGridTopPx(timeStr, boundaries.originMinutes, PIXELS_PER_MINUTE)
        markers.push({ minutes: m, timeStr, topPx })
      }
    }
    return markers
  }, [boundaries])

  return (
    <div
      role="region"
      aria-label="Grid Jadwal Mingguan"
      className="flex flex-1 flex-col overflow-hidden border border-border bg-background"
      onClick={() => selectSession(null)}
    >
      {/* Header Kolom Hari */}
      <div className="flex border-b border-border bg-muted/60 select-none">
        {/* Sudut Gutter Sumbu Waktu */}
        <div className="w-14 shrink-0 border-r border-border p-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Waktu
        </div>

        {/* Header Tiap Hari */}
        <div className="flex flex-1 min-w-0">
          {activeDays.map((day) => (
            <div
              key={day.dayOfWeek}
              className="flex min-w-[140px] flex-1 flex-col items-center justify-center border-r border-border px-2 py-2 text-center last:border-r-0"
            >
              <span className="font-heading text-xs font-semibold text-foreground">
                {DAY_OF_WEEK_LABELS[day.dayOfWeek]}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {day.startTime} - {day.endTime}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanvas Waktu & Kolom Hari */}
      <div className="relative flex flex-1 overflow-x-auto overflow-y-auto">
        {/* Sumbu Waktu (Gutter Kiri) */}
        <div
          style={{ height: `${boundaries.totalHeightPx}px` }}
          className="relative w-14 shrink-0 border-r border-border bg-muted/30 select-none"
        >
          {hourMarkers.map((marker) => (
            <div
              key={marker.timeStr}
              style={{ top: `${marker.topPx}px` }}
              className="absolute -mt-2.5 inset-x-0 pr-2 text-right text-[10px] tabular-nums text-muted-foreground"
            >
              {marker.timeStr}
            </div>
          ))}
        </div>

        {/* Kontainer Kolom-Kolom Hari */}
        <div className="relative flex flex-1 min-w-0">
          {/* Garis Horizontal Jam di Latar Belakang */}
          <div
            style={{ height: `${boundaries.totalHeightPx}px` }}
            className="absolute inset-0 pointer-events-none"
          >
            {hourMarkers.map((marker) => (
              <div
                key={`line-${marker.timeStr}`}
                style={{ top: `${marker.topPx}px` }}
                className="absolute inset-x-0 border-b border-border/40"
              />
            ))}
          </div>

          {/* Kolom Hari */}
          {activeDays.map((day) => (
            <TimetableDayColumn
              key={day.dayOfWeek}
              dayConfig={day}
              dayConfigs={dayConfigs}
              sessions={sessions}
              boundaries={boundaries}
              snapIntervalMinutes={snapIntervalMinutes}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
