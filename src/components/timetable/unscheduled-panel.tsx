import * as React from "react"
import { SearchIcon } from "lucide-react"
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
import { UnscheduledSessionCard } from "@/components/timetable/unscheduled-session-card"
import {
  calculateUnscheduledSessions,
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
  const workspace = useWorkspaceStore((state) => state.workspace)
  const requirements = useWorkspaceStore((state) => state.requirements)
  const sessions = useWorkspaceStore((state) => state.sessions)
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const placeUnscheduledSession = useWorkspaceStore(
    (state) => state.placeUnscheduledSession
  )

  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedItemForDialog, setSelectedItemForDialog] =
    React.useState<UnscheduledSessionItem | null>(null)
  const [dialogDay, setDialogDay] = React.useState<DayOfWeek>("monday")
  const [dialogStartTime, setDialogStartTime] = React.useState<TimeString>("07:30")

  const activeClassId = workspace?.activeClassId ?? ""
  const summary = React.useMemo(() => {
    return calculateUnscheduledSessions(requirements, sessions, activeClassId)
  }, [requirements, sessions, activeClassId])

  const activeDays = React.useMemo(() => {
    return ORDERED_DAYS_OF_WEEK.filter((d) =>
      dayConfigs.some((dc) => dc.dayOfWeek === d && dc.isSchoolDay)
    )
  }, [dayConfigs])

  // Filter items by subject name
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return summary.items
    const query = searchQuery.toLowerCase().trim()
    return summary.items.filter((item) => {
      const subject = subjects.find((s) => s.id === item.subjectId)
      return subject?.name.toLowerCase().includes(query)
    })
  }, [summary.items, subjects, searchQuery])

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

  return (
    <section
      role="region"
      aria-label="Sesi Belum Terjadwal"
      className="flex w-72 shrink-0 flex-col border-r border-border bg-card"
    >
      <div className="flex flex-col gap-2.5 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-xs font-semibold tracking-tight text-foreground">
            Sesi Belum Terjadwal
          </h2>
          <span className="border border-border bg-muted px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-foreground">
            {summary.totalRemainingSessions} sesi
          </span>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filteredItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            {searchQuery.trim()
              ? "Tidak ada mata pelajaran yang cocok."
              : "Semua sesi telah terjadwal ke dalam grid!"}
          </div>
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
