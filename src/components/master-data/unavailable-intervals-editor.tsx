import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  DAY_OF_WEEK_LABELS,
  ORDERED_DAYS_OF_WEEK,
  type DayOfWeek,
  type TimeInterval,
  type TimeString,
} from "@/domain/types/entities"

interface UnavailableIntervalsEditorProps {
  intervals: TimeInterval[]
  onChange: (nextIntervals: TimeInterval[]) => void
  idPrefix?: string
}

export function UnavailableIntervalsEditor({
  intervals,
  onChange,
  idPrefix = "unv",
}: UnavailableIntervalsEditorProps) {
  const handleAddInterval = () => {
    const newInterval: TimeInterval = {
      id: crypto.randomUUID(),
      dayOfWeek: "monday",
      startTime: "08:00",
      endTime: "09:30",
      label: "",
    }
    onChange([...intervals, newInterval])
  }

  const handleUpdateInterval = (
    intervalId: string,
    patch: Partial<Omit<TimeInterval, "id">>
  ) => {
    onChange(
      intervals.map((item) =>
        item.id === intervalId ? { ...item, ...patch } : item
      )
    )
  }

  const handleRemoveInterval = (intervalId: string) => {
    onChange(intervals.filter((item) => item.id !== intervalId))
  }

  return (
    <div className="flex flex-col gap-2 border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">
            Waktu Tidak Tersedia ({intervals.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Tentukan hari dan rentang jam ketika entitas ini tidak dapat
            dijadwalkan (misalnya rapat MGMP atau pemeliharaan ruangan).
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleAddInterval}
        >
          <PlusIcon data-icon="inline-start" />
          Tambah Rentang Waktu
        </Button>
      </div>

      {intervals.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Tersedia sepanjang jam operasional sekolah.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {intervals.map((item, idx) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-2 border border-border bg-background p-2"
            >
              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor={`${idPrefix}-day-${item.id}`}
                  className="text-muted-foreground"
                >
                  Hari
                </Label>
                <Select
                  value={item.dayOfWeek}
                  onValueChange={(value) => {
                    handleUpdateInterval(item.id, {
                      dayOfWeek: value as DayOfWeek,
                    })
                  }}
                >
                  <SelectTrigger
                    id={`${idPrefix}-day-${item.id}`}
                    size="sm"
                    className="w-28"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ORDERED_DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>
                          {DAY_OF_WEEK_LABELS[day]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor={`${idPrefix}-start-${item.id}`}
                  className="text-muted-foreground"
                >
                  Mulai
                </Label>
                <Input
                  id={`${idPrefix}-start-${item.id}`}
                  type="text"
                  value={item.startTime}
                  placeholder="08:00"
                  aria-label={`Jam mulai tidak tersedia ${idx + 1}`}
                  className="w-20 tabular-nums"
                  onChange={(event) => {
                    handleUpdateInterval(item.id, {
                      startTime: event.target.value as TimeString,
                    })
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor={`${idPrefix}-end-${item.id}`}
                  className="text-muted-foreground"
                >
                  Selesai
                </Label>
                <Input
                  id={`${idPrefix}-end-${item.id}`}
                  type="text"
                  value={item.endTime}
                  placeholder="09:30"
                  aria-label={`Jam selesai tidak tersedia ${idx + 1}`}
                  className="w-20 tabular-nums"
                  onChange={(event) => {
                    handleUpdateInterval(item.id, {
                      endTime: event.target.value as TimeString,
                    })
                  }}
                />
              </div>

              <div className="flex flex-1 min-w-40 items-center gap-1.5">
                <Label
                  htmlFor={`${idPrefix}-label-${item.id}`}
                  className="sr-only"
                >
                  Keterangan Waktu Tidak Tersedia {idx + 1}
                </Label>
                <Input
                  id={`${idPrefix}-label-${item.id}`}
                  type="text"
                  value={item.label ?? ""}
                  placeholder="Contoh: MGMP Kabupaten"
                  onChange={(event) => {
                    handleUpdateInterval(item.id, {
                      label: event.target.value,
                    })
                  }}
                />
              </div>

              <Button
                type="button"
                variant="destructive"
                size="xs"
                aria-label={`Hapus rentang waktu ${idx + 1}`}
                onClick={() => handleRemoveInterval(item.id)}
              >
                <Trash2Icon data-icon="inline-start" />
                Hapus
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
