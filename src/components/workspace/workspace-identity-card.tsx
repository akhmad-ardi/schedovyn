import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  SNAP_INTERVAL_OPTIONS,
  type SnapIntervalMinutes,
} from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function WorkspaceIdentityCard() {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const configValidation = useWorkspaceStore((state) => state.configValidation)
  const updateWorkspaceIdentity = useWorkspaceStore(
    (state) => state.updateWorkspaceIdentity
  )

  const [applyToAllDays, setApplyToAllDays] = React.useState<boolean>(true)

  if (!workspace) {
    return null
  }

  const nameIssue = configValidation.issues.find(
    (issue) => issue.code === "EMPTY_WORKSPACE_NAME"
  )
  const periodIssue = configValidation.issues.find(
    (issue) => issue.code === "EMPTY_ACADEMIC_PERIOD"
  )

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Identitas Ruang Kerja & Sekolah</CardTitle>
        <CardDescription>
          Atur nama satuan pendidikan, periode tahun ajaran atau semester, serta
          ukuran interval waktu dasar pada grid penyusunan jadwal.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-name-input">
            Nama Sekolah / Ruang Kerja
          </Label>
          <Input
            id="workspace-name-input"
            type="text"
            value={workspace.name}
            placeholder="Contoh: SMP Negeri 1 Nusantara"
            aria-invalid={Boolean(nameIssue)}
            onChange={(event) => {
              void updateWorkspaceIdentity({ name: event.target.value })
            }}
          />
          {nameIssue && (
            <p className="text-xs text-destructive">{nameIssue.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-period-input">
            Tahun Ajaran / Semester
          </Label>
          <Input
            id="workspace-period-input"
            type="text"
            value={workspace.academicPeriod}
            placeholder="Contoh: Semester Ganjil 2026/2027"
            aria-invalid={Boolean(periodIssue)}
            onChange={(event) => {
              void updateWorkspaceIdentity({
                academicPeriod: event.target.value,
              })
            }}
          />
          {periodIssue && (
            <p className="text-xs text-destructive">{periodIssue.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-default-snap-select">
              Interval Snap Grid Default
            </Label>
            <Select
              value={String(workspace.defaultSnapIntervalMinutes)}
              onValueChange={(value) => {
                const parsed = Number(value) as SnapIntervalMinutes
                void updateWorkspaceIdentity({
                  defaultSnapIntervalMinutes: parsed,
                  applySnapIntervalToAllDays: applyToAllDays,
                })
              }}
            >
              <SelectTrigger
                id="workspace-default-snap-select"
                className="w-full tabular-nums"
              >
                <SelectValue placeholder="Pilih interval menit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SNAP_INTERVAL_OPTIONS.map((interval) => (
                    <SelectItem
                      key={interval}
                      value={String(interval)}
                      className="tabular-nums"
                    >
                      {interval} menit
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
              id="apply-snap-all-days-checkbox"
              checked={applyToAllDays}
              onCheckedChange={(checked) => {
                const nextChecked = checked === true
                setApplyToAllDays(nextChecked)
                if (nextChecked) {
                  void updateWorkspaceIdentity({
                    defaultSnapIntervalMinutes:
                      workspace.defaultSnapIntervalMinutes,
                    applySnapIntervalToAllDays: true,
                  })
                }
              }}
            />
            <Label
              htmlFor="apply-snap-all-days-checkbox"
              className="text-muted-foreground font-normal cursor-pointer"
            >
              Terapkan interval snap ke seluruh hari
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
