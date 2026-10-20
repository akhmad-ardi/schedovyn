import { useDroppable } from "@dnd-kit/react"
import {
  computeDaySessionClusters,
  durationToGridHeightPx,
  PIXELS_PER_MINUTE,
  timeToGridTopPx,
  type GridBoundaries,
} from "@/domain/timetable/grid-layout"
import { timeToMinutes } from "@/domain/time/time-utils"
import type {
  DayScheduleConfig,
  SnapIntervalMinutes,
  TimetableSession,
} from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { SessionBlock } from "./session-block"

export interface TimetableDayColumnProps {
  dayConfig: DayScheduleConfig
  dayConfigs: readonly DayScheduleConfig[]
  sessions: TimetableSession[]
  boundaries: GridBoundaries
  snapIntervalMinutes: SnapIntervalMinutes
}

export function TimetableDayColumn({
  dayConfig,
  dayConfigs,
  sessions,
  boundaries,
  snapIntervalMinutes,
}: TimetableDayColumnProps) {
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)

  const { ref, isDropTarget } = useDroppable({
    id: `day-column-${dayConfig.dayOfWeek}`,
    data: {
      type: "day-column",
      dayOfWeek: dayConfig.dayOfWeek,
    },
  })

  // Sesi khusus pada hari ini
  const daySessions = sessions.filter((s) => s.dayOfWeek === dayConfig.dayOfWeek)
  const clusters = computeDaySessionClusters(daySessions)

  const preOperatingHeightPx = Math.max(
    0,
    timeToGridTopPx(dayConfig.startTime, boundaries.originMinutes, PIXELS_PER_MINUTE)
  )

  const postOperatingTopPx = timeToGridTopPx(
    dayConfig.endTime,
    boundaries.originMinutes,
    PIXELS_PER_MINUTE
  )
  const postOperatingHeightPx = Math.max(0, boundaries.totalHeightPx - postOperatingTopPx)

  return (
    <div
      ref={ref}
      style={{ height: `${boundaries.totalHeightPx}px` }}
      className={`relative min-w-[140px] flex-1 border-r border-border transition-colors ${
        isDropTarget ? "bg-primary/5 ring-2 ring-primary/40 ring-inset" : "bg-card/40"
      }`}
    >
      {/* Jika bukan hari sekolah, arsir seluruh kolom */}
      {!dayConfig.isSchoolDay ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 p-2 text-center text-xs text-muted-foreground select-none">
          Bukan Hari Sekolah
        </div>
      ) : (
        <>
          {/* Zona di luar jam belajar: Sebelum jam mulai */}
          {preOperatingHeightPx > 0 && (
            <div
              style={{
                top: 0,
                height: `${preOperatingHeightPx}px`,
              }}
              className="absolute inset-x-0 bg-muted/30 border-b border-dashed border-border/60 pointer-events-none"
            />
          )}

          {/* Zona di luar jam belajar: Setelah jam selesai */}
          {postOperatingHeightPx > 0 && (
            <div
              style={{
                top: `${postOperatingTopPx}px`,
                height: `${postOperatingHeightPx}px`,
              }}
              className="absolute inset-x-0 bg-muted/30 border-t border-dashed border-border/60 pointer-events-none"
            />
          )}

          {/* Zona Istirahat */}
          {dayConfig.breakIntervals.map((brk, idx) => {
            const brkStartM = timeToMinutes(brk.startTime)
            const brkEndM = timeToMinutes(brk.endTime)
            const brkDuration = Math.max(0, brkEndM - brkStartM)
            const brkTopPx = timeToGridTopPx(brk.startTime, boundaries.originMinutes, PIXELS_PER_MINUTE)
            const brkHeightPx = durationToGridHeightPx(brkDuration, PIXELS_PER_MINUTE)

            return (
              <div
                key={`break-${idx}-${brk.startTime}`}
                style={{
                  top: `${brkTopPx}px`,
                  height: `${brkHeightPx}px`,
                }}
                className="absolute inset-x-0 z-0 flex items-center justify-center bg-amber-500/10 dark:bg-amber-400/10 border-y border-dashed border-amber-500/30 text-[10px] font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wider select-none pointer-events-none"
              >
                {brk.label}
              </div>
            )
          })}

          {/* Blok Sesi Terjadwal */}
          {daySessions.map((ses) => {
            const subject = subjects.find((s) => s.id === ses.subjectId)
            const teacher = teachers.find((t) => t.id === ses.teacherId)
            const room = rooms.find((r) => r.id === ses.roomId)
            const clusterLayout = clusters.get(ses.id)

            return (
              <SessionBlock
                key={ses.id}
                session={ses}
                subject={subject}
                teacher={teacher}
                room={room}
                dayConfig={dayConfig}
                dayConfigs={dayConfigs}
                originMinutes={boundaries.originMinutes}
                snapIntervalMinutes={snapIntervalMinutes}
                clusterLayout={clusterLayout}
              />
            )
          })}
        </>
      )}
    </div>
  )
}
