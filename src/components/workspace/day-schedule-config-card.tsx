import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import {
  DAY_OF_WEEK_LABELS,
  SNAP_INTERVAL_OPTIONS,
  type DayScheduleConfig,
  type SnapIntervalMinutes,
  type TimeString,
} from "@/domain/types/entities"
import { getDurationMinutes, isValidTimeString } from "@/domain/time/time-utils"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function DayScheduleConfigCard() {
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const configValidation = useWorkspaceStore((state) => state.configValidation)
  const updateDayConfig = useWorkspaceStore((state) => state.updateDayConfig)
  const addBreakInterval = useWorkspaceStore((state) => state.addBreakInterval)
  const updateBreakInterval = useWorkspaceStore(
    (state) => state.updateBreakInterval
  )
  const removeBreakInterval = useWorkspaceStore(
    (state) => state.removeBreakInterval
  )

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Konfigurasi Hari & Jam Operasional Pembelajaran</CardTitle>
        <CardDescription>
          Tentukan hari aktif sekolah (termasuk opsi hari Sabtu), rentang jam
          mulai dan selesai belajar per hari dalam format 24 jam, serta periode
          waktu istirahat harian.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {dayConfigs.map((dayConfig: DayScheduleConfig) => {
          const dayLabel = DAY_OF_WEEK_LABELS[dayConfig.dayOfWeek]
          const dayIssues = configValidation.issues.filter(
            (issue) => issue.dayOfWeek === dayConfig.dayOfWeek
          )
          const durationMinutes =
            isValidTimeString(dayConfig.startTime) &&
            isValidTimeString(dayConfig.endTime)
              ? getDurationMinutes(dayConfig.startTime, dayConfig.endTime)
              : 0

          return (
            <div
              key={dayConfig.id}
              data-testid={`day-config-row-${dayConfig.dayOfWeek}`}
              className="flex flex-col gap-3 border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2.5">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`switch-school-day-${dayConfig.dayOfWeek}`}
                    checked={dayConfig.isSchoolDay}
                    onCheckedChange={(checked) => {
                      void updateDayConfig(dayConfig.dayOfWeek, {
                        isSchoolDay: checked,
                      })
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`switch-school-day-${dayConfig.dayOfWeek}`}
                      className="font-heading text-sm font-medium cursor-pointer"
                    >
                      {dayLabel}
                    </Label>
                    <span
                      className={
                        dayConfig.isSchoolDay
                          ? "border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                          : "border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      }
                    >
                      {dayConfig.isSchoolDay
                        ? "Hari Sekolah Aktif"
                        : "Libur / Nonaktif"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor={`start-time-${dayConfig.dayOfWeek}`}
                      className="text-muted-foreground"
                    >
                      Mulai
                    </Label>
                    <Input
                      id={`start-time-${dayConfig.dayOfWeek}`}
                      type="text"
                      value={dayConfig.startTime}
                      placeholder="07:00"
                      className="w-20 tabular-nums"
                      aria-label={`Jam mulai ${dayLabel}`}
                      onChange={(event) => {
                        void updateDayConfig(dayConfig.dayOfWeek, {
                          startTime: event.target.value as TimeString,
                        })
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor={`end-time-${dayConfig.dayOfWeek}`}
                      className="text-muted-foreground"
                    >
                      Selesai
                    </Label>
                    <Input
                      id={`end-time-${dayConfig.dayOfWeek}`}
                      type="text"
                      value={dayConfig.endTime}
                      placeholder="15:00"
                      className="w-20 tabular-nums"
                      aria-label={`Jam selesai ${dayLabel}`}
                      onChange={(event) => {
                        void updateDayConfig(dayConfig.dayOfWeek, {
                          endTime: event.target.value as TimeString,
                        })
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor={`snap-interval-${dayConfig.dayOfWeek}`}
                      className="text-muted-foreground"
                    >
                      Snap Grid
                    </Label>
                    <Select
                      value={String(dayConfig.snapIntervalMinutes)}
                      onValueChange={(value) => {
                        void updateDayConfig(dayConfig.dayOfWeek, {
                          snapIntervalMinutes: Number(
                            value
                          ) as SnapIntervalMinutes,
                        })
                      }}
                    >
                      <SelectTrigger
                        id={`snap-interval-${dayConfig.dayOfWeek}`}
                        size="sm"
                        className="w-24 tabular-nums"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {SNAP_INTERVAL_OPTIONS.map((interval) => (
                            <SelectItem
                              key={interval}
                              value={String(interval)}
                              className="tabular-nums"
                            >
                              {interval} mnt
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {durationMinutes > 0 && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Total: {durationMinutes} mnt
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Periode Waktu Istirahat ({dayConfig.breakIntervals.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      const existingCount = dayConfig.breakIntervals.length
                      const defaultStart: TimeString =
                        existingCount === 0 ? "09:30" : "10:00"
                      const defaultEnd: TimeString =
                        existingCount === 0 ? "10:00" : "10:15"
                      void addBreakInterval(dayConfig.dayOfWeek, {
                        label: `Istirahat ${existingCount + 1}`,
                        startTime: defaultStart,
                        endTime: defaultEnd,
                      })
                    }}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Tambah Waktu Istirahat
                  </Button>
                </div>

                {dayConfig.breakIntervals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada waktu istirahat pada hari {dayLabel}. Klik tombol
                    Tambah Waktu Istirahat jika hari ini memiliki jeda istirahat
                    atau ishoma.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayConfig.breakIntervals.map((breakItem) => (
                      <div
                        key={breakItem.id}
                        className="flex flex-wrap items-center gap-2 border border-border bg-muted/30 p-2"
                      >
                        <div className="flex flex-1 min-w-44 items-center gap-1.5">
                          <Label
                            htmlFor={`break-label-${breakItem.id}`}
                            className="sr-only"
                          >
                            Label Istirahat {dayLabel}
                          </Label>
                          <Input
                            id={`break-label-${breakItem.id}`}
                            type="text"
                            value={breakItem.label}
                            placeholder="Contoh: Istirahat Pertama"
                            onChange={(event) => {
                              void updateBreakInterval(
                                dayConfig.dayOfWeek,
                                breakItem.id,
                                {
                                  label: event.target.value,
                                }
                              )
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Label
                            htmlFor={`break-start-${breakItem.id}`}
                            className="text-muted-foreground"
                          >
                            Mulai
                          </Label>
                          <Input
                            id={`break-start-${breakItem.id}`}
                            type="text"
                            value={breakItem.startTime}
                            placeholder="09:30"
                            className="w-20 tabular-nums"
                            onChange={(event) => {
                              void updateBreakInterval(
                                dayConfig.dayOfWeek,
                                breakItem.id,
                                {
                                  startTime: event.target.value as TimeString,
                                }
                              )
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Label
                            htmlFor={`break-end-${breakItem.id}`}
                            className="text-muted-foreground"
                          >
                            Selesai
                          </Label>
                          <Input
                            id={`break-end-${breakItem.id}`}
                            type="text"
                            value={breakItem.endTime}
                            placeholder="10:00"
                            className="w-20 tabular-nums"
                            onChange={(event) => {
                              void updateBreakInterval(
                                dayConfig.dayOfWeek,
                                breakItem.id,
                                {
                                  endTime: event.target.value as TimeString,
                                }
                              )
                            }}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          size="xs"
                          aria-label={`Hapus istirahat ${breakItem.label} pada hari ${dayLabel}`}
                          onClick={() => {
                            void removeBreakInterval(
                              dayConfig.dayOfWeek,
                              breakItem.id
                            )
                          }}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Hapus
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {dayIssues.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-destructive/30 pt-2">
                  {dayIssues.map((issue, idx) => (
                    <p
                      key={`${issue.code}-${issue.breakId ?? idx}`}
                      className="text-xs font-medium text-destructive"
                    >
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
