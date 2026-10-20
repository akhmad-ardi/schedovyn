import { Link } from "react-router"
import { DatabaseIcon, SlidersHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getActiveClassSessionStats } from "@/domain/timetable/active-class-context"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function ClassSelectorBar() {
  const classes = useWorkspaceStore((state) => state.classes)
  const activeClassId = useWorkspaceStore(
    (state) => state.workspace?.activeClassId ?? null
  )
  const requirements = useWorkspaceStore((state) => state.requirements)
  const sessions = useWorkspaceStore((state) => state.sessions)
  const setActiveClass = useWorkspaceStore((state) => state.setActiveClass)

  const stats = getActiveClassSessionStats(
    requirements,
    sessions,
    activeClassId
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
      <div className="flex items-center gap-3">
        <Label
          htmlFor="active-class-select"
          className="text-xs font-medium text-muted-foreground whitespace-nowrap cursor-pointer"
        >
          Kelas Aktif
        </Label>
        <Select
          value={activeClassId ?? ""}
          onValueChange={(selectedId) => {
            if (selectedId) {
              void setActiveClass(selectedId)
            }
          }}
        >
          <SelectTrigger
            id="active-class-select"
            aria-label="Pilih Kelas Aktif"
            className="h-8 min-w-44 text-xs"
          >
            <SelectValue placeholder="Pilih Kelas Aktif..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} (Tingkat {cls.grade})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {activeClassId && (
          <div className="flex flex-wrap items-center gap-1.5 border border-border bg-background px-2.5 py-1 text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">
              {`Terjadwal: ${stats.scheduledSessionsCount} / ${stats.requiredSessionsCount} sesi`}
            </span>
            <span aria-hidden="true" className="text-border">
              |
            </span>
            <span className="tabular-nums font-medium text-foreground">
              {`Belum Terjadwal: ${stats.unscheduledSessionsCount} sesi`}
            </span>
          </div>
        )}

        <div className="border border-border bg-background px-2.5 py-1 text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">
            {`Total Sesi Ruang Kerja: ${stats.workspaceTotalSessionsCount} sesi`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pl-1">
          <Button asChild variant="outline" size="xs">
            <Link to="/master-data">
              <DatabaseIcon data-icon="inline-start" />
              Kelola Data Master
            </Link>
          </Button>
          <Button asChild variant="outline" size="xs">
            <Link to="/settings">
              <SlidersHorizontalIcon data-icon="inline-start" />
              Pengaturan Jam
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
