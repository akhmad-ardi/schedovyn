import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UnscheduledEmptyState } from "@/components/timetable/unscheduled-empty-state"
import { UnscheduledProgressHeader } from "@/components/timetable/unscheduled-progress-header"
import { UnscheduledSessionCard } from "@/components/timetable/unscheduled-session-card"
import {
  filterAndSortUnscheduledItems,
  type UnscheduledSessionItem,
} from "@/domain/timetable/unscheduled-sessions"
import {
  DAY_OF_WEEK_LABELS,
  ORDERED_DAYS_OF_WEEK,
  type DayOfWeek,
  type TimeString,
} from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function UnscheduledPanel() {
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const placeUnscheduledSession = useWorkspaceStore(
    (state) => state.placeUnscheduledSession
  )
  const getActiveClassUnscheduledSummary = useWorkspaceStore(
    (state) => state.getActiveClassUnscheduledSummary
  )

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<
    "unfulfilled_only" | "all"
  >("unfulfilled_only")
  const [sortBy] = React.useState<
    "subject_name_asc" | "remaining_desc" | "duration_desc"
  >("subject_name_asc")

  const [selectedItemForDialog, setSelectedItemForDialog] =
    React.useState<UnscheduledSessionItem | null>(null)
  const [dialogDay, setDialogDay] = React.useState<DayOfWeek>("monday")
  const [dialogStartTime, setDialogStartTime] =
    React.useState<TimeString>("07:30")

  const summary = getActiveClassUnscheduledSummary()

  const activeDays = React.useMemo(() => {
    return ORDERED_DAYS_OF_WEEK.filter((d) =>
      dayConfigs.some((dc) => dc.dayOfWeek === d && dc.isSchoolDay)
    )
  }, [dayConfigs])

  const subjectNameMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const s of subjects) {
      map.set(s.id, s.name)
    }
    return map
  }, [subjects])

  // Bangun daftar kartu unik per kebutuhan mata pelajaran
  const baseItems = React.useMemo(() => {
    return summary.bySubject.map((sub) => ({
      virtualId: `${sub.requirementId}::slot-0`,
      requirementId: sub.requirementId,
      classId: sub.classId,
      subjectId: sub.subjectId,
      defaultTeacherId: sub.defaultTeacherId,
      defaultRoomId: sub.defaultRoomId,
      durationMinutes: sub.durationMinutes,
      roomRequired: sub.roomRequired,
      notes: sub.notes,
      slotIndex: 0,
      remainingCount: sub.remainingSessions,
      totalRequiredCount: sub.requiredSessions,
    }))
  }, [summary.bySubject])

  // Filter & sort
  const filteredItems = React.useMemo(() => {
    return filterAndSortUnscheduledItems(baseItems, subjectNameMap, {
      searchQuery,
      statusFilter,
      sortBy,
    })
  }, [baseItems, subjectNameMap, searchQuery, statusFilter, sortBy])

  const handleOpenDialog = (item: UnscheduledSessionItem) => {
    setSelectedItemForDialog(item)
    const initialDay = activeDays[0] ?? "monday"
    setDialogDay(initialDay)
    const dayCfg = dayConfigs.find((dc) => dc.dayOfWeek === initialDay)
    setDialogStartTime((dayCfg?.startTime as TimeString) ?? "07:30")
  }

  const handleConfirmPlacement = async () => {
    if (!selectedItemForDialog) return
    const ok = await placeUnscheduledSession({
      requirementId: selectedItemForDialog.requirementId,
      dayOfWeek: dialogDay,
      startTime: dialogStartTime,
    })
    if (ok) {
      setSelectedItemForDialog(null)
    }
  }

  const targetSubject = selectedItemForDialog
    ? subjects.find((s) => s.id === selectedItemForDialog.subjectId)
    : null

  // Kondisi 1: Kelas belum memiliki kebutuhan pembelajaran
  if (summary.totalRequiredSessions === 0) {
    return (
      <section
        role="region"
        aria-label="Sesi Belum Terjadwal"
        className="flex w-72 shrink-0 flex-col border-r border-border bg-card"
      >
        <UnscheduledProgressHeader
          totalRequired={0}
          totalScheduled={0}
          totalRemaining={0}
          percentage={100}
        />
        <UnscheduledEmptyState type="no_requirements" />
      </section>
    )
  }

  // Kondisi 2: Seluruh sesi telah terjadwal 100%
  if (summary.isFullyScheduled) {
    return (
      <section
        role="region"
        aria-label="Sesi Belum Terjadwal"
        className="flex w-72 shrink-0 flex-col border-r border-border bg-card"
      >
        <UnscheduledProgressHeader
          totalRequired={summary.totalRequiredSessions}
          totalScheduled={summary.totalScheduledSessions}
          totalRemaining={0}
          percentage={100}
        />
        <UnscheduledEmptyState type="completed" />
      </section>
    )
  }

  return (
    <section
      role="region"
      aria-label="Sesi Belum Terjadwal"
      className="flex w-72 shrink-0 flex-col border-r border-border bg-card"
    >
      <UnscheduledProgressHeader
        totalRequired={summary.totalRequiredSessions}
        totalScheduled={summary.totalScheduledSessions}
        totalRemaining={summary.totalRemainingSessions}
        percentage={summary.overallCompletionPercentage}
      />

      {/* Kontrol Pencarian & Filter */}
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Hapus kata kunci pencarian"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={statusFilter === "unfulfilled_only" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("unfulfilled_only")}
          >
            Belum Selesai
          </Button>
          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("all")}
          >
            Semua
          </Button>
        </div>
      </div>

      {/* Daftar Kartu Sesi */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        {filteredItems.length === 0 ? (
          <UnscheduledEmptyState
            type="no_search_results"
            searchQuery={searchQuery}
            onResetSearch={() => {
              setSearchQuery("")
              setStatusFilter("all")
            }}
          />
        ) : (
          filteredItems.map((item) => {
            const subject = subjects.find((s) => s.id === item.subjectId)
            const teacher = teachers.find((t) => t.id === item.defaultTeacherId)
            const room = rooms.find((r) => r.id === item.defaultRoomId)

            return (
              <UnscheduledSessionCard
                key={item.virtualId}
                item={item}
                subject={subject}
                teacher={teacher}
                room={room}
                onQuickPlace={handleOpenDialog}
              />
            )
          })
        )}
      </div>

      {/* Dialog Penempatan Cepat via Keyboard/Button */}
      <Dialog
        open={Boolean(selectedItemForDialog)}
        onOpenChange={(open) => {
          if (!open) setSelectedItemForDialog(null)
        }}
      >
        <DialogContent
          aria-label="Tempatkan Sesi ke Jadwal"
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Tempatkan Sesi ke Jadwal</DialogTitle>
            <DialogDescription>
              Tentukan hari dan jam mulai untuk menempatkan sesi{" "}
              <strong className="text-foreground">
                {targetSubject?.name ?? "Mata Pelajaran"}
              </strong>{" "}
              (durasi {selectedItemForDialog?.durationMinutes ?? 45} menit).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-place-day">Hari Belajar</Label>
              <Select
                value={dialogDay}
                onValueChange={(val) => setDialogDay(val as DayOfWeek)}
              >
                <SelectTrigger id="quick-place-day" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {activeDays.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DAY_OF_WEEK_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-place-time">Jam Mulai (HH:mm)</Label>
              <Input
                id="quick-place-time"
                type="text"
                value={dialogStartTime}
                onChange={(e) =>
                  setDialogStartTime(e.target.value as TimeString)
                }
                placeholder="07:30"
                className="tabular-nums"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedItemForDialog(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => {
                void handleConfirmPlacement()
              }}
            >
              Simpan ke Grid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
