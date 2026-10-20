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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UnavailableIntervalsEditor } from "@/components/master-data/unavailable-intervals-editor"
import {
  DAY_OF_WEEK_LABELS,
  type Teacher,
  type TimeInterval,
} from "@/domain/types/entities"
import type { MasterDataValidationIssue } from "@/domain/validation/master-data-validator"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function TeachersTab() {
  const teachers = useWorkspaceStore((state) => state.teachers)
  const createTeacher = useWorkspaceStore((state) => state.createTeacher)
  const updateTeacher = useWorkspaceStore((state) => state.updateTeacher)
  const deleteTeacher = useWorkspaceStore((state) => state.deleteTeacher)

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [unavailableIntervals, setUnavailableIntervals] = React.useState<
    TimeInterval[]
  >([])
  const [issues, setIssues] = React.useState<MasterDataValidationIssue[]>([])

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setNotes("")
    setUnavailableIntervals([])
    setIssues([])
  }

  const handleStartEdit = (teacher: Teacher) => {
    setEditingId(teacher.id)
    setName(teacher.name)
    setNotes(teacher.notes ?? "")
    setUnavailableIntervals(teacher.unavailableIntervals)
    setIssues([])
  }

  const handleSubmit = async () => {
    const outcome = editingId
      ? await updateTeacher(editingId, {
          name,
          notes,
          unavailableIntervals,
        })
      : await createTeacher({
          name,
          notes,
          unavailableIntervals,
        })

    if (!outcome.ok) {
      setIssues(outcome.validation?.issues ?? [])
      return
    }

    resetForm()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>
            {editingId ? "Perbarui Data Guru" : "Tambah Guru Baru"}
          </CardTitle>
          <CardDescription>
            Catat daftar guru pengajar beserta jadwal ketersediaan mengajarnya
            untuk mencegah bentrokan guru lintas kelas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Gagal menyimpan data guru</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {issues.map((issue, idx) => (
                    <li key={`${issue.code}-${issue.intervalId ?? idx}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teacher-name-input">Nama Guru</Label>
                <Input
                  id="teacher-name-input"
                  type="text"
                  value={name}
                  placeholder="Contoh: Budi Santoso"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teacher-notes-input">
                  Keterangan (Opsional)
                </Label>
                <Input
                  id="teacher-notes-input"
                  type="text"
                  value={notes}
                  placeholder="Contoh: Guru Matematika Senior"
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>

            <UnavailableIntervalsEditor
              idPrefix="teacher-unv"
              intervals={unavailableIntervals}
              onChange={setUnavailableIntervals}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  void handleSubmit()
                }}
              >
                <PlusIcon data-icon="inline-start" />
                {editingId ? "Simpan Perubahan" : "Tambah Guru"}
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
          <CardTitle>Daftar Guru ({teachers.length})</CardTitle>
          <CardDescription>
            Menghapus guru akan mengosongkan penugasan guru pada kebutuhan dan
            sesi terkait tanpa menghapus sesinya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Belum ada guru yang terdaftar.
              </p>
              <p>
                Tambahkan nama guru menggunakan formulir di atas agar dapat
                ditugaskan pada kebutuhan pembelajaran.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>Waktu Tidak Tersedia</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((tch) => (
                  <TableRow key={tch.id}>
                    <TableCell className="font-medium text-foreground">
                      {tch.name}
                    </TableCell>
                    <TableCell>
                      {tch.unavailableIntervals.length === 0 ? (
                        <span className="text-muted-foreground">
                          Selalu tersedia
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tch.unavailableIntervals.map((unv) => (
                            <span
                              key={unv.id}
                              className="border border-border bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-foreground"
                            >
                              {DAY_OF_WEEK_LABELS[unv.dayOfWeek]}:{" "}
                              {unv.startTime}-{unv.endTime}
                              {unv.label ? ` (${unv.label})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tch.notes ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handleStartEdit(tch)}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            void deleteTeacher(tch.id)
                            if (editingId === tch.id) {
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
