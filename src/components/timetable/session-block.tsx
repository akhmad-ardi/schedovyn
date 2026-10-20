import * as React from "react"
import { useDraggable } from "@dnd-kit/react"
import { GripVerticalIcon } from "lucide-react"
import {
  calculateKeyboardTimeShift,
  durationToGridHeightPx,
  getAdjacentSchoolDay,
  PIXELS_PER_MINUTE,
  timeToGridTopPx,
  type SessionClusterLayout,
} from "@/domain/timetable/grid-layout"
import type {
  DayScheduleConfig,
  SnapIntervalMinutes,
  Subject,
  Teacher,
  Room,
  TimetableSession,
} from "@/domain/types/entities"
import { getSubjectColorStyle } from "@/lib/subject-colors"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface SessionBlockProps {
  session: TimetableSession
  subject?: Subject
  teacher?: Teacher
  room?: Room
  dayConfig: DayScheduleConfig
  dayConfigs: readonly DayScheduleConfig[]
  originMinutes: number
  snapIntervalMinutes: SnapIntervalMinutes
  clusterLayout?: SessionClusterLayout
}

export function SessionBlock({
  session,
  subject,
  teacher,
  room,
  dayConfig,
  dayConfigs,
  originMinutes,
  snapIntervalMinutes,
  clusterLayout,
}: SessionBlockProps) {
  const selectedSessionId = useWorkspaceStore((state) => state.selectedSessionId)
  const selectSession = useWorkspaceStore((state) => state.selectSession)
  const moveSession = useWorkspaceStore((state) => state.moveSession)
  const removeSession = useWorkspaceStore((state) => state.removeSession)

  const isSelected = selectedSessionId === session.id

  const { ref, isDragging, handleRef } = useDraggable({
    id: session.id,
    data: {
      type: "scheduled-session",
      session,
    },
  })

  const topPx = timeToGridTopPx(session.startTime, originMinutes, PIXELS_PER_MINUTE)
  const heightPx = durationToGridHeightPx(session.durationMinutes, PIXELS_PER_MINUTE)

  const leftPercent = clusterLayout?.leftPercent ?? 0
  const widthPercent = clusterLayout?.widthPercent ?? 100

  const colorStyle = getSubjectColorStyle(subject?.colorKey ?? "blue")

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      selectSession(session.id)
      return
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      void removeSession(session.id)
      return
    }

    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault()
      const { nextStartTime } = calculateKeyboardTimeShift(
        session.startTime,
        session.durationMinutes,
        -snapIntervalMinutes,
        dayConfig
      )
      void moveSession({
        sessionId: session.id,
        dayOfWeek: session.dayOfWeek,
        startTime: nextStartTime,
      })
      return
    }

    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault()
      const { nextStartTime } = calculateKeyboardTimeShift(
        session.startTime,
        session.durationMinutes,
        snapIntervalMinutes,
        dayConfig
      )
      void moveSession({
        sessionId: session.id,
        dayOfWeek: session.dayOfWeek,
        startTime: nextStartTime,
      })
      return
    }

    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault()
      const prevDay = getAdjacentSchoolDay(session.dayOfWeek, dayConfigs, "prev")
      if (prevDay !== session.dayOfWeek) {
        void moveSession({
          sessionId: session.id,
          dayOfWeek: prevDay,
          startTime: session.startTime,
        })
      }
      return
    }

    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault()
      const nextDay = getAdjacentSchoolDay(session.dayOfWeek, dayConfigs, "next")
      if (nextDay !== session.dayOfWeek) {
        void moveSession({
          sessionId: session.id,
          dayOfWeek: nextDay,
          startTime: session.startTime,
        })
      }
      return
    }
  }

  const subjectName = subject?.name ?? "Mata Pelajaran"
  const ariaLabel = `Blok Sesi ${subjectName}: ${session.startTime} - ${session.endTime} (${session.durationMinutes} menit)`

  return (
    <div
      ref={ref}
      role="article"
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        selectSession(session.id)
      }}
      onKeyDown={handleKeyDown}
      style={{
        top: `${topPx}px`,
        height: `${heightPx}px`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
      className={`absolute box-border overflow-hidden border p-1.5 transition-shadow select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-30 ${
        colorStyle.blockClassName
      } ${
        isSelected
          ? "ring-2 ring-primary z-20 shadow-md"
          : "z-10 hover:shadow-sm"
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex h-full flex-col justify-between overflow-hidden">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight text-foreground">
              {subjectName}
            </p>
            <p className="truncate text-[10px] tabular-nums text-muted-foreground">
              {session.startTime} - {session.endTime}
            </p>
          </div>
          <button
            ref={handleRef}
            type="button"
            aria-label="Pindahkan Sesi"
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing p-0.5"
            tabIndex={-1}
          >
            <GripVerticalIcon className="size-3" />
          </button>
        </div>

        {heightPx >= 48 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground truncate">
            {teacher && (
              <span className="truncate max-w-full font-medium">
                {teacher.name}
              </span>
            )}
            {room && (
              <span className="truncate border border-border/50 bg-background/50 px-1 py-0.2">
                {room.name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
