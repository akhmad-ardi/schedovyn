import { useDraggable } from "@dnd-kit/react"
import { GripVerticalIcon, MapPinIcon, UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Subject, Teacher, Room } from "@/domain/types/entities"
import type { UnscheduledSessionItem } from "@/domain/timetable/unscheduled-sessions"
import { getSubjectColorStyle } from "@/lib/subject-colors"

interface UnscheduledSessionCardProps {
  item: UnscheduledSessionItem
  subject?: Subject
  teacher?: Teacher
  room?: Room
  onQuickPlace: (item: UnscheduledSessionItem) => void
}

export function UnscheduledSessionCard({
  item,
  subject,
  teacher,
  room,
  onQuickPlace,
}: UnscheduledSessionCardProps) {
  const isFulfilled = item.remainingCount === 0

  const { ref, isDragging, handleRef } = useDraggable({
    id: item.virtualId,
    disabled: isFulfilled,
    data: {
      type: "unscheduled-item",
      item,
    },
  })

  const colorStyle = subject
    ? getSubjectColorStyle(subject.colorKey)
    : getSubjectColorStyle("blue")

  return (
    <div
      ref={ref}
      className={`group relative flex flex-col gap-2 border bg-card p-2.5 transition-all ${
        isDragging
          ? "opacity-40 border-dashed border-primary"
          : isFulfilled
          ? "border-border/60 bg-muted/20 opacity-75"
          : "border-border hover:border-foreground/30 shadow-xs"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block size-2.5 shrink-0 ${colorStyle.swatchClassName}`}
          />
          <span className="font-heading text-xs font-semibold text-foreground truncate">
            {subject?.name ?? "Mata Pelajaran"}
          </span>
        </div>

        {!isFulfilled && (
          <button
            ref={handleRef}
            type="button"
            aria-label="Tarik kartu sesi"
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing p-0.5"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {isFulfilled ? (
          <span className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 tabular-nums font-medium">
            Selesai ({item.totalRequiredCount}/{item.totalRequiredCount} sesi)
          </span>
        ) : (
          <span className="border border-border bg-muted/60 px-1.5 py-0.5 tabular-nums text-foreground font-medium">
            {item.remainingCount} sesi tersisa
          </span>
        )}
        <span className="border border-border bg-muted/60 px-1.5 py-0.5 tabular-nums text-foreground">
          {item.durationMinutes} menit
        </span>
        {!isFulfilled && (
          <span className="border border-border bg-muted/60 px-1.5 py-0.5 tabular-nums text-muted-foreground">
            Sesi {item.slotIndex + 1} dari {item.totalRequiredCount}
          </span>
        )}
      </div>

      {(teacher || room) && (
        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          {teacher && (
            <div className="flex items-center gap-1.5 truncate">
              <UserIcon className="size-3 shrink-0" />
              <span className="truncate">{teacher.name}</span>
            </div>
          )}
          {room && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPinIcon className="size-3 shrink-0" />
              <span className="truncate">
                {room.name}
                {item.roomRequired ? " (Wajib)" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="pt-1">
        {isFulfilled ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled
            className="w-full text-xs text-muted-foreground"
          >
            Alokasi Terpenuhi
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="w-full text-xs"
            aria-label="Tempatkan ke Jadwal"
            onClick={() => onQuickPlace(item)}
          >
            Tempatkan ke Jadwal
          </Button>
        )}
      </div>
    </div>
  )
}
