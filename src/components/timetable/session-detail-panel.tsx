import * as React from "react"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  InfoIcon,
  XIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DAY_OF_WEEK_LABELS,
  type DayOfWeek,
  type TimeString,
  type TimetableSession,
} from "@/domain/types/entities"
import { getSubjectColorStyle } from "@/lib/subject-colors"
import { useWorkspaceStore } from "@/store/use-workspace-store"

interface SessionDetailFormProps {
  session: TimetableSession
  onClose: () => void
}

function SessionDetailForm({ session, onClose }: SessionDetailFormProps) {
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const classes = useWorkspaceStore((state) => state.classes)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const updateSessionDetails = useWorkspaceStore(
    (state) => state.updateSessionDetails
  )
  const removeSession = useWorkspaceStore((state) => state.removeSession)
  const getSessionConflicts = useWorkspaceStore(
    (state) => state.getSessionConflicts
  )
  const getSessionWarnings = useWorkspaceStore(
    (state) => state.getSessionWarnings
  )

  const subject = subjects.find((s) => s.id === session.subjectId)
  const classGroup = classes.find((c) => c.id === session.classId)

  const [startTime, setStartTime] = React.useState<string>(session.startTime)
  const [dayOfWeek, setDayOfWeek] = React.useState<DayOfWeek>(session.dayOfWeek)
  const [teacherId, setTeacherId] = React.useState<string | null>(
    session.teacherId
  )
  const [roomId, setRoomId] = React.useState<string | null>(session.roomId)
  const [notes, setNotes] = React.useState<string>(session.notes ?? "")

  const colorStyle = subject ? getSubjectColorStyle(subject.colorKey) : null
  const sessionConflicts = getSessionConflicts(session.id)
  const sessionWarnings = getSessionWarnings(session.id)

  const handleSave = async () => {
    await updateSessionDetails({
      sessionId: session.id,
      patch: {
        startTime: startTime as TimeString,
        dayOfWeek,
        teacherId,
        roomId,
        notes: notes.trim() || undefined,
      },
    })
  }

  const handleStartTimeChange = async (newTime: string) => {
    setStartTime(newTime)
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
      await updateSessionDetails({
        sessionId: session.id,
        patch: {
          startTime: newTime as TimeString,
        },
      })
    }
  }

  const handleDayChange = async (newDay: DayOfWeek) => {
    setDayOfWeek(newDay)
    await updateSessionDetails({
      sessionId: session.id,
      patch: {
        dayOfWeek: newDay,
      },
    })
  }

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
      <div className="flex flex-col gap-4">
        {/* Kartu Ringkasan Mapel & Kelas */}
        <div className="border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            {colorStyle && (
              <span
                className={`inline-block size-3 shrink-0 ${colorStyle.swatchClassName}`}
              />
            )}
            <span className="font-heading text-sm font-semibold text-foreground truncate">
              {subject?.name ?? "Mata Pelajaran"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelas {classGroup?.name ?? "-"} &middot; {session.durationMinutes}{" "}
            menit
          </p>
        </div>

        {/* Notifikasi Konflik Jadwal (Multi-Cue Visual) */}
        {sessionConflicts.map((c) => (
          <Alert key={c.id} variant="destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            <AlertTitle className="text-xs font-bold">{c.title}</AlertTitle>
            <AlertDescription className="text-xs">
              {c.description}
            </AlertDescription>
          </Alert>
        ))}

        {/* Notifikasi Peringatan Kelengkapan */}
        {sessionWarnings.map((w) => (
          <Alert
            key={w.id}
            className="border-amber-500/40 text-amber-800 dark:text-amber-200"
          >
            <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-semibold">{w.title}</AlertTitle>
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
              {w.description}
            </AlertDescription>
          </Alert>
        ))}

        {/* Form Sunting Presisi */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-start-time">Jam Mulai</Label>
            <Input
              id="session-start-time"
              aria-label="Jam Mulai"
              type="time"
              className="tabular-nums"
              value={startTime}
              onChange={(e) => void handleStartTimeChange(e.target.value)}
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              Berakhir pukul {session.endTime} ({session.durationMinutes} menit)
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-day">Hari Belajar</Label>
            <select
              id="session-day"
              aria-label="Hari Belajar"
              className="flex h-8 w-full border border-input bg-background px-2.5 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              value={dayOfWeek}
              onChange={(e) => void handleDayChange(e.target.value as DayOfWeek)}
            >
              {dayConfigs.map((d) => (
                <option key={d.dayOfWeek} value={d.dayOfWeek}>
                  {DAY_OF_WEEK_LABELS[d.dayOfWeek]}{" "}
                  {d.isSchoolDay ? "" : "(Libur)"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-teacher">Guru Pengajar</Label>
            <select
              id="session-teacher"
              aria-label="Guru Pengajar"
              className="flex h-8 w-full border border-input bg-background px-2.5 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              value={teacherId ?? ""}
              onChange={(e) =>
                setTeacherId(e.target.value ? e.target.value : null)
              }
            >
              <option value="">-- Tanpa Guru --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-room">Ruangan</Label>
            <select
              id="session-room"
              aria-label="Ruangan"
              className="flex h-8 w-full border border-input bg-background px-2.5 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              value={roomId ?? ""}
              onChange={(e) =>
                setRoomId(e.target.value ? e.target.value : null)
              }
            >
              <option value="">-- Tanpa Ruangan Khusus --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-notes">Catatan Sesi</Label>
            <Input
              id="session-notes"
              aria-label="Catatan Sesi"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan (opsional)..."
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void handleSave()}
            className="mt-1"
          >
            Terapkan Guru &amp; Ruangan
          </Button>
        </div>
      </div>

      {/* Tombol Aksi Hapus / Lepas Sesi */}
      <div className="mt-4 border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => {
            void removeSession(session.id)
            onClose()
          }}
        >
          Lepas dari Grid
        </Button>
      </div>
    </div>
  )
}

export function SessionDetailPanel() {
  const selectedSessionId = useWorkspaceStore(
    (state) => state.selectedSessionId
  )
  const sessions = useWorkspaceStore((state) => state.sessions)
  const selectSession = useWorkspaceStore((state) => state.selectSession)

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) ?? null

  return (
    <aside
      role="region"
      aria-label="Detail Sesi"
      className="flex w-72 shrink-0 flex-col border-l border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <InfoIcon className="size-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Detail Sesi
          </h2>
        </div>
        {selectedSession && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => selectSession(null)}
            aria-label="Tutup Detail"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {!selectedSession ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
          <ClockIcon className="mb-2 size-8 text-muted-foreground/50" />
          <p className="font-medium text-foreground">
            Tidak ada sesi yang dipilih
          </p>
          <p className="mt-1">
            Klik salah satu blok sesi pada grid untuk melihat informasi lengkap
            atau menyunting waktu, guru, dan ruangan.
          </p>
        </div>
      ) : (
        <SessionDetailForm
          key={selectedSession.id}
          session={selectedSession}
          onClose={() => selectSession(null)}
        />
      )}
    </aside>
  )
}
