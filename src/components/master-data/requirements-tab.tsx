import * as React from "react"
import {
  AlertTriangleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TeachingRequirement } from "@/domain/types/entities"
import type { MasterDataValidationIssue } from "@/domain/validation/master-data-validator"
import { getSubjectColorStyle } from "@/lib/subject-colors"
import { useWorkspaceStore } from "@/store/use-workspace-store"

const NONE_VALUE = "__NONE__"

interface RequirementsTabProps {
  onNavigateTab?: (tab: "classes" | "subjects") => void
}

export function RequirementsTab({ onNavigateTab }: RequirementsTabProps) {
  const classes = useWorkspaceStore((state) => state.classes)
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const requirements = useWorkspaceStore((state) => state.requirements)
  const createTeachingRequirement = useWorkspaceStore(
    (state) => state.createTeachingRequirement
  )
  const updateTeachingRequirement = useWorkspaceStore(
    (state) => state.updateTeachingRequirement
  )
  const deleteTeachingRequirement = useWorkspaceStore(
    (state) => state.deleteTeachingRequirement
  )

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string>(classes[0]?.id ?? "")
  const [subjectId, setSubjectId] = React.useState<string>(
    subjects[0]?.id ?? ""
  )
  const [defaultTeacherId, setDefaultTeacherId] = React.useState<string | null>(
    teachers[0]?.id ?? null
  )
  const [defaultRoomId, setDefaultRoomId] = React.useState<string | null>(
    rooms[0]?.id ?? null
  )
  const [sessionsPerWeek, setSessionsPerWeek] = React.useState<string>("2")
  const [durationMinutes, setDurationMinutes] = React.useState<string>("45")
  const [roomRequired, setRoomRequired] = React.useState<boolean>(false)
  const [notes, setNotes] = React.useState<string>("")
  const [filterClassId, setFilterClassId] = React.useState<string>("ALL")
  const [issues, setIssues] = React.useState<MasterDataValidationIssue[]>([])

  const resolvedClassId =
    classId && classes.some((cls) => cls.id === classId)
      ? classId
      : (classes[0]?.id ?? "")

  const resolvedSubjectId =
    subjectId && subjects.some((sub) => sub.id === subjectId)
      ? subjectId
      : (subjects[0]?.id ?? "")

  const resetForm = () => {
    setEditingId(null)
    setClassId(classes[0]?.id ?? "")
    setSubjectId(subjects[0]?.id ?? "")
    setDefaultTeacherId(teachers[0]?.id ?? null)
    setDefaultRoomId(rooms[0]?.id ?? null)
    setSessionsPerWeek("2")
    setDurationMinutes("45")
    setRoomRequired(false)
    setNotes("")
    setIssues([])
  }

  const handleStartEdit = (req: TeachingRequirement) => {
    setEditingId(req.id)
    setClassId(req.classId)
    setSubjectId(req.subjectId)
    setDefaultTeacherId(req.defaultTeacherId)
    setDefaultRoomId(req.defaultRoomId)
    setSessionsPerWeek(String(req.sessionsPerWeek))
    setDurationMinutes(String(req.durationMinutes))
    setRoomRequired(req.roomRequired)
    setNotes(req.notes ?? "")
    setIssues([])
  }

  const handleSubmit = async () => {
    const payload = {
      classId: resolvedClassId,
      subjectId: resolvedSubjectId,
      defaultTeacherId,
      defaultRoomId,
      sessionsPerWeek: Number(sessionsPerWeek),
      durationMinutes: Number(durationMinutes),
      roomRequired,
      notes,
    }

    const outcome = editingId
      ? await updateTeachingRequirement(editingId, payload)
      : await createTeachingRequirement(payload)

    if (!outcome.ok) {
      setIssues(outcome.validation?.issues ?? [])
      return
    }

    resetForm()
  }

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Prasyarat Kebutuhan Pembelajaran Belum Lengkap</CardTitle>
          <CardDescription>
            Kebutuhan pembelajaran menghubungkan Kelas dengan Mata Pelajaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-xs/relaxed text-muted-foreground">
            Tambahkan minimal 1 Kelas dan 1 Mata Pelajaran terlebih dahulu
            sebelum memetakan jumlah sesi mingguan.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {classes.length === 0 && (
              <Button
                type="button"
                variant="default"
                onClick={() => onNavigateTab?.("classes")}
              >
                Buka Tab Kelas
              </Button>
            )}
            {subjects.length === 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigateTab?.("subjects")}
              >
                Buka Tab Mata Pelajaran
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredRequirements =
    filterClassId === "ALL"
      ? requirements
      : requirements.filter((req) => req.classId === filterClassId)

  const totalWeeklySessions = filteredRequirements.reduce(
    (sum, req) => sum + req.sessionsPerWeek,
    0
  )
  const totalWeeklyMinutes = filteredRequirements.reduce(
    (sum, req) => sum + req.sessionsPerWeek * req.durationMinutes,
    0
  )

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>
            {editingId
              ? "Perbarui Kebutuhan Pembelajaran"
              : "Tambah Kebutuhan Pembelajaran"}
          </CardTitle>
          <CardDescription>
            Tentukan berapa kali suatu mata pelajaran diajarkan pada suatu kelas
            dalam seminggu beserta durasi menit per sesinya.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Gagal menyimpan kebutuhan pembelajaran</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {issues.map((issue, idx) => (
                    <li key={`${issue.code}-${idx}`}>{issue.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="req-class-select">Kelas</Label>
                <Select value={resolvedClassId} onValueChange={setClassId}>
                  <SelectTrigger id="req-class-select" className="w-full">
                    <SelectValue placeholder="Pilih kelas" />
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="req-subject-select">Mata Pelajaran</Label>
                <Select value={resolvedSubjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="req-subject-select" className="w-full">
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="req-sessions-input">
                  Jumlah Sesi per Minggu
                </Label>
                <Input
                  id="req-sessions-input"
                  type="number"
                  min={1}
                  max={30}
                  value={sessionsPerWeek}
                  className="tabular-nums"
                  onChange={(event) => setSessionsPerWeek(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="req-duration-input">
                  Durasi per Sesi (Menit)
                </Label>
                <Input
                  id="req-duration-input"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={durationMinutes}
                  className="tabular-nums"
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 md:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="req-teacher-select">
                  Guru Default (Opsional)
                </Label>
                <Select
                  value={defaultTeacherId ?? NONE_VALUE}
                  onValueChange={(value) =>
                    setDefaultTeacherId(value === NONE_VALUE ? null : value)
                  }
                >
                  <SelectTrigger id="req-teacher-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NONE_VALUE}>
                        Belum Ditentukan
                      </SelectItem>
                      {teachers.map((tch) => (
                        <SelectItem key={tch.id} value={tch.id}>
                          {tch.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="req-room-select">
                  Ruangan Default (Opsional)
                </Label>
                <Select
                  value={defaultRoomId ?? NONE_VALUE}
                  onValueChange={(value) =>
                    setDefaultRoomId(value === NONE_VALUE ? null : value)
                  }
                >
                  <SelectTrigger id="req-room-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NONE_VALUE}>
                        Tanpa Ruangan Khusus
                      </SelectItem>
                      {rooms.map((rm) => (
                        <SelectItem key={rm.id} value={rm.id}>
                          {rm.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pb-1.5">
                <Switch
                  id="req-room-required-switch"
                  checked={roomRequired}
                  onCheckedChange={setRoomRequired}
                />
                <Label
                  htmlFor="req-room-required-switch"
                  className="cursor-pointer"
                >
                  Wajib Menggunakan Ruangan
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  void handleSubmit()
                }}
              >
                <PlusIcon data-icon="inline-start" />
                {editingId ? "Simpan Perubahan" : "Tambah Kebutuhan"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <XIcon data-icon="inline-start" />
                  Batal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>
                Daftar Kebutuhan Pembelajaran ({filteredRequirements.length})
              </CardTitle>
              <CardDescription className="tabular-nums">
                Total beban: {totalWeeklySessions} sesi/minggu (
                {totalWeeklyMinutes} menit/minggu).
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Label
                htmlFor="filter-req-class-select"
                className="text-muted-foreground"
              >
                Filter Kelas
              </Label>
              <Select value={filterClassId} onValueChange={setFilterClassId}>
                <SelectTrigger
                  id="filter-req-class-select"
                  size="sm"
                  className="w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequirements.length === 0 ? (
            <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Belum ada kebutuhan pembelajaran pada filter kelas ini.
              </p>
              <p>
                Gunakan formulir di atas untuk memetakan mata pelajaran ke kelas
                beserta jumlah sesi dan durasinya.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Beban Mingguan</TableHead>
                  <TableHead>Guru Default</TableHead>
                  <TableHead>Ruangan Default</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map((req) => {
                  const cls = classes.find((c) => c.id === req.classId)
                  const sub = subjects.find((s) => s.id === req.subjectId)
                  const tch = teachers.find((t) => t.id === req.defaultTeacherId)
                  const rm = rooms.find((r) => r.id === req.defaultRoomId)
                  const subStyle = sub
                    ? getSubjectColorStyle(sub.colorKey)
                    : null

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-foreground">
                        {cls?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          {subStyle && (
                            <span
                              className={`inline-block size-2.5 shrink-0 ${subStyle.swatchClassName}`}
                            />
                          )}
                          <span className="font-medium text-foreground">
                            {sub?.name ?? "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {req.sessionsPerWeek} sesi x {req.durationMinutes} mnt
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tch?.name ?? "Belum Ditentukan"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rm?.name ?? "-"}
                        {req.roomRequired ? " (Wajib)" : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleStartEdit(req)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => {
                              void deleteTeachingRequirement(req.id)
                              if (editingId === req.id) {
                                resetForm()
                              }
                            }}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
