import { useEffect } from "react"
import { Link } from "react-router"
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react"
import { GraduationCapIcon, PlusIcon } from "lucide-react"
import { ClassSelectorBar } from "@/components/layout/class-selector-bar"
import { EditorToolbar } from "@/components/timetable/editor-toolbar"
import { SessionDetailPanel } from "@/components/timetable/session-detail-panel"
import { TimetableGrid } from "@/components/timetable/timetable-grid"
import { UnscheduledPanel } from "@/components/timetable/unscheduled-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getActiveClassSessions,
  resolveActiveClass,
} from "@/domain/timetable/active-class-context"
import {
  calculateGridBoundaries,
  clampMinutes,
  offsetYToSnappedMinutes,
  PIXELS_PER_MINUTE,
} from "@/domain/timetable/grid-layout"
import { minutesToTime, timeToMinutes } from "@/domain/time/time-utils"
import type { UnscheduledSessionItem } from "@/domain/timetable/unscheduled-sessions"
import type { DayOfWeek, TimetableSession } from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function EditorPage() {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const classes = useWorkspaceStore((state) => state.classes)
  const sessions = useWorkspaceStore((state) => state.sessions)
  const setActiveClass = useWorkspaceStore((state) => state.setActiveClass)
  const placeUnscheduledSession = useWorkspaceStore(
    (state) => state.placeUnscheduledSession
  )
  const moveSession = useWorkspaceStore((state) => state.moveSession)
  const undo = useWorkspaceStore((state) => state.undo)
  const redo = useWorkspaceStore((state) => state.redo)
  const canUndo = useWorkspaceStore((state) => state.canUndo)
  const canRedo = useWorkspaceStore((state) => state.canRedo)

  // Global Keyboard Shortcuts (Ctrl+Z / Cmd+Z untuk Undo, Ctrl+Y / Ctrl+Shift+Z untuk Redo)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Isolasi Form & Input editable (AC-FR07-09)
      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName ? target.tagName.toUpperCase() : ""
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return
        }
      }

      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (!modifier) return

      const key = event.key.toLowerCase()

      // Redo: Ctrl+Y atau Ctrl+Shift+Z (atau Cmd+Shift+Z pada Mac)
      const isRedo =
        (key === "y" && !event.shiftKey) ||
        (key === "z" && event.shiftKey)

      // Undo: Ctrl+Z atau Cmd+Z (tanpa shift)
      const isUndo = key === "z" && !event.shiftKey

      if (isRedo) {
        event.preventDefault()
        if (canRedo()) {
          void redo()
        }
      } else if (isUndo) {
        event.preventDefault()
        if (canUndo()) {
          void undo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [undo, redo, canUndo, canRedo])

  const activeClassId = workspace?.activeClassId ?? null
  const activeClass = resolveActiveClass(classes, activeClassId)
  const activeDaysCount = dayConfigs.filter((d) => d.isSchoolDay).length

  // Handler untuk penyelesaian drag-and-drop kanvas jadwal
  const handleDragEnd = async (event: DragEndEvent) => {
    const { operation, canceled } = event
    if (canceled || !operation) return

    const source = operation.source
    const target = operation.target
    if (!source || !target) return

    const targetData = target.data as
      | { type: "day-column"; dayOfWeek: DayOfWeek }
      | undefined

    if (targetData?.type === "day-column" && targetData.dayOfWeek) {
      const dayOfWeek = targetData.dayOfWeek
      const dayConfig = dayConfigs.find((d) => d.dayOfWeek === dayOfWeek)
      const boundaries = calculateGridBoundaries(dayConfigs)
      const snapInterval = workspace?.defaultSnapIntervalMinutes ?? 15

      // Hitung koordinat Y drop relatif terhadap kolom hari jika element target tersedia
      let snappedMinutes: number | null = null
      const targetEl = target.element as HTMLElement | undefined
      const currentPos = operation.position?.current
      if (targetEl && currentPos) {
        const rect = targetEl.getBoundingClientRect()
        const offsetY = Math.max(0, currentPos.y - rect.top)
        snappedMinutes = offsetYToSnappedMinutes(
          offsetY,
          boundaries.originMinutes,
          snapInterval,
          PIXELS_PER_MINUTE
        )
      }

      const minM = dayConfig
        ? timeToMinutes(dayConfig.startTime)
        : boundaries.originMinutes
      const maxM = dayConfig
        ? timeToMinutes(dayConfig.endTime)
        : boundaries.maxMinutes

      const sourceData = source.data as
        | { type: "unscheduled-item"; item: UnscheduledSessionItem }
        | { type: "scheduled-session"; session: TimetableSession }
        | undefined

      if (sourceData?.type === "unscheduled-item" && sourceData.item) {
        const duration = sourceData.item.durationMinutes
        const fallbackM = snappedMinutes ?? minM
        const startM = clampMinutes(
          fallbackM,
          minM,
          Math.max(minM, maxM - duration)
        )
        await placeUnscheduledSession({
          requirementId: sourceData.item.requirementId,
          dayOfWeek,
          startTime: minutesToTime(startM),
        })
      } else if (sourceData?.type === "scheduled-session" && sourceData.session) {
        const duration = sourceData.session.durationMinutes
        const fallbackM = snappedMinutes ?? minM
        const startM = clampMinutes(
          fallbackM,
          minM,
          Math.max(minM, maxM - duration)
        )
        await moveSession({
          sessionId: sourceData.session.id,
          dayOfWeek,
          startTime: minutesToTime(startM),
        })
      }
    }
  }

  // Kondisi 1: Belum ada kelas di ruang kerja
  if (classes.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Editor Jadwal Mingguan</CardTitle>
            <CardDescription>
              Ruang kerja aktif:{" "}
              <span className="font-medium text-foreground">
                {workspace?.name ?? "SMP Negeri 1 Nusantara"}
              </span>{" "}
              ({workspace?.academicPeriod ?? "Semester Ganjil 2026/2027"}) dengan{" "}
              <span className="tabular-nums font-medium text-foreground">
                {activeDaysCount}
              </span>{" "}
              hari sekolah aktif dan interval snap{" "}
              <span className="tabular-nums font-medium text-foreground">
                {workspace?.defaultSnapIntervalMinutes ?? 15} menit
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-xs/relaxed text-muted-foreground">
              Belum ada kelas di ruang kerja ini. Tambahkan kelas terlebih
              dahulu di menu Data Master sebelum menyusun jadwal.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="default">
                <Link to="/master-data">
                  <PlusIcon data-icon="inline-start" />
                  Buka Data Master Kelas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Kondisi 2: Ada kelas namun belum ada kelas aktif yang dipilih
  if (!activeClass) {
    return (
      <div className="flex flex-col">
        <ClassSelectorBar />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>Pilih Kelas untuk Mulai Menyunting Jadwal</CardTitle>
              <CardDescription>
                Pilih salah satu kelas di bawah ini untuk melihat kebutuhan
                pembelajaran dan menyusun jadwal mingguan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {classes.map((cls) => (
                  <Button
                    key={cls.id}
                    type="button"
                    variant="outline"
                    className="h-auto flex flex-col items-start p-4 text-left justify-start"
                    onClick={() => {
                      void setActiveClass(cls.id)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCapIcon className="size-4 text-muted-foreground" />
                      <span className="font-heading font-semibold text-base text-foreground">
                        {cls.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Tingkat {cls.grade}
                    </span>
                    {cls.notes && (
                      <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {cls.notes}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Kondisi 3: Kelas aktif terpilih -> Kanvas Editor 3 Panel
  const activeClassSessions = getActiveClassSessions(sessions, activeClass.id)

  return (
    <div className="flex flex-1 flex-col">
      <ClassSelectorBar />
      <EditorToolbar />

      <DragDropProvider onDragEnd={(e) => void handleDragEnd(e)}>
        <div className="flex flex-1 min-h-[calc(100vh-8.5rem)] overflow-hidden">
          <UnscheduledPanel />
          <TimetableGrid sessions={activeClassSessions} />
          <SessionDetailPanel />
        </div>
      </DragDropProvider>
    </div>
  )
}
