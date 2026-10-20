import * as React from "react"
import {
  AlertTriangleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import type { ClassGroup } from "@/domain/types/entities"
import type { MasterDataValidationIssue } from "@/domain/validation/master-data-validator"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function ClassesTab() {
  const classes = useWorkspaceStore((state) => state.classes)
  const requirements = useWorkspaceStore((state) => state.requirements)
  const createClassGroup = useWorkspaceStore((state) => state.createClassGroup)
  const updateClassGroup = useWorkspaceStore((state) => state.updateClassGroup)
  const deleteClassGroup = useWorkspaceStore((state) => state.deleteClassGroup)

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [grade, setGrade] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [issues, setIssues] = React.useState<MasterDataValidationIssue[]>([])
  const [deletingClass, setDeletingClass] = React.useState<ClassGroup | null>(
    null
  )

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setGrade("")
    setNotes("")
    setIssues([])
  }

  const handleStartEdit = (cls: ClassGroup) => {
    setEditingId(cls.id)
    setName(cls.name)
    setGrade(cls.grade)
    setNotes(cls.notes ?? "")
    setIssues([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const outcome = editingId
      ? await updateClassGroup(editingId, { name, grade, notes })
      : await createClassGroup({ name, grade, notes })

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
            {editingId ? "Perbarui Data Kelas" : "Tambah Kelas Baru"}
          </CardTitle>
          <CardDescription>
            Daftarkan rombongan belajar atau kelas yang akan disusun jadwal
            mingguannya.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Gagal menyimpan data kelas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {issues.map((issue, idx) => (
                    <li key={`${issue.code}-${idx}`}>{issue.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={(event) => {
              void handleSubmit(event)
            }}
            className="grid gap-3 md:grid-cols-[1fr_160px_1fr_auto] md:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="class-name-input">Nama Kelas</Label>
              <Input
                id="class-name-input"
                type="text"
                value={name}
                placeholder="Contoh: VII-A"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="class-grade-input">Tingkat Kelas</Label>
              <Input
                id="class-grade-input"
                type="text"
                value={grade}
                placeholder="Contoh: VII"
                onChange={(event) => setGrade(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="class-notes-input">Keterangan (Opsional)</Label>
              <Input
                id="class-notes-input"
                type="text"
                value={notes}
                placeholder="Contoh: Ruang lantai 2"
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">
                <PlusIcon data-icon="inline-start" />
                {editingId ? "Simpan Perubahan" : "Tambah Kelas"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <XIcon data-icon="inline-start" />
                  Batal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Daftar Kelas ({classes.length})</CardTitle>
          <CardDescription>
            Setiap kelas memiliki jadwal mingguan tersendiri dan divalidasi
            terhadap bentrokan lintas kelas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Belum ada kelas di ruang kerja ini.
              </p>
              <p>
                Tambahkan kelas pertama Anda menggunakan formulir di atas
                (contoh: VII-A, VIII-B, atau X-1) untuk mulai memetakan
                kebutuhan pembelajaran.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Kebutuhan Mapel</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => {
                  const classReqs = requirements.filter(
                    (req) => req.classId === cls.id
                  )
                  const totalSessions = classReqs.reduce(
                    (sum, req) => sum + req.sessionsPerWeek,
                    0
                  )

                  return (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium text-foreground">
                        {cls.name}
                      </TableCell>
                      <TableCell>{cls.grade}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {classReqs.length} mapel ({totalSessions} sesi/minggu)
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cls.notes ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleStartEdit(cls)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => setDeletingClass(cls)}
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

      <AlertDialog
        open={Boolean(deletingClass)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingClass(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus Kelas {deletingClass?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Menghapus kelas ini akan ikut menghapus seluruh kebutuhan
              pembelajaran dan sesi terjadwal milik kelas {deletingClass?.name}{" "}
              secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingClass) {
                  void deleteClassGroup(deletingClass.id)
                  if (editingId === deletingClass.id) {
                    resetForm()
                  }
                  setDeletingClass(null)
                }
              }}
            >
              Hapus Kelas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
