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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  SUBJECT_COLOR_LABELS,
  SUBJECT_COLOR_OPTIONS,
  type Subject,
  type SubjectColorKey,
} from "@/domain/types/entities"
import type { MasterDataValidationIssue } from "@/domain/validation/master-data-validator"
import { getSubjectColorStyle } from "@/lib/subject-colors"
import { useWorkspaceStore } from "@/store/use-workspace-store"

interface PendingCascadeSubjectDelete {
  subject: Subject
  dependentRequirementsCount: number
  dependentSessionsCount: number
}

export function SubjectsTab() {
  const subjects = useWorkspaceStore((state) => state.subjects)
  const requirements = useWorkspaceStore((state) => state.requirements)
  const createSubject = useWorkspaceStore((state) => state.createSubject)
  const updateSubject = useWorkspaceStore((state) => state.updateSubject)
  const deleteSubject = useWorkspaceStore((state) => state.deleteSubject)

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [colorKey, setColorKey] = React.useState<SubjectColorKey>("blue")
  const [notes, setNotes] = React.useState("")
  const [issues, setIssues] = React.useState<MasterDataValidationIssue[]>([])
  const [pendingCascadeDelete, setPendingCascadeDelete] =
    React.useState<PendingCascadeSubjectDelete | null>(null)

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setColorKey("blue")
    setNotes("")
    setIssues([])
  }

  const handleStartEdit = (sub: Subject) => {
    setEditingId(sub.id)
    setName(sub.name)
    setColorKey(sub.colorKey)
    setNotes(sub.notes ?? "")
    setIssues([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const outcome = editingId
      ? await updateSubject(editingId, { name, colorKey, notes })
      : await createSubject({ name, colorKey, notes })

    if (!outcome.ok) {
      setIssues(outcome.validation?.issues ?? [])
      return
    }

    resetForm()
  }

  const handleDeleteClick = async (subject: Subject) => {
    const result = await deleteSubject(subject.id, { cascade: false })
    if (!result.ok && result.requiresConfirmation) {
      setPendingCascadeDelete({
        subject,
        dependentRequirementsCount: result.dependentRequirementsCount ?? 0,
        dependentSessionsCount: result.dependentSessionsCount ?? 0,
      })
      return
    }

    if (editingId === subject.id) {
      resetForm()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>
            {editingId
              ? "Perbarui Mata Pelajaran"
              : "Tambah Mata Pelajaran Baru"}
          </CardTitle>
          <CardDescription>
            Tentukan nama mata pelajaran dan warna identitasnya untuk blok sesi
            di dalam grid jadwal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Gagal menyimpan mata pelajaran</AlertTitle>
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
            className="grid gap-3 md:grid-cols-[1fr_200px_1fr_auto] md:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject-name-input">Nama Mata Pelajaran</Label>
              <Input
                id="subject-name-input"
                type="text"
                value={name}
                placeholder="Contoh: Matematika"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject-color-select">Warna Identitas</Label>
              <Select
                value={colorKey}
                onValueChange={(value) => setColorKey(value as SubjectColorKey)}
              >
                <SelectTrigger id="subject-color-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SUBJECT_COLOR_OPTIONS.map((key) => {
                      const style = getSubjectColorStyle(key)
                      return (
                        <SelectItem key={key} value={key}>
                          <span
                            className={`inline-block size-2.5 shrink-0 ${style.swatchClassName}`}
                          />
                          <span>{SUBJECT_COLOR_LABELS[key]}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject-notes-input">Keterangan (Opsional)</Label>
              <Input
                id="subject-notes-input"
                type="text"
                value={notes}
                placeholder="Contoh: Kelompok Wajib"
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">
                <PlusIcon data-icon="inline-start" />
                {editingId ? "Simpan Perubahan" : "Tambah Mata Pelajaran"}
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
          <CardTitle>Daftar Mata Pelajaran ({subjects.length})</CardTitle>
          <CardDescription>
            Warna mata pelajaran digunakan pada blok sesi normal (selama sesi
            tidak mengalami konflik waktu).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Belum ada mata pelajaran yang terdaftar.
              </p>
              <p>
                Tambahkan mata pelajaran seperti Matematika, Bahasa Indonesia,
                atau IPA menggunakan formulir di atas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>Digunakan di Kebutuhan</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((sub) => {
                  const style = getSubjectColorStyle(sub.colorKey)
                  const usedCount = requirements.filter(
                    (req) => req.subjectId === sub.id
                  ).length

                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`inline-block size-3 shrink-0 ${style.swatchClassName}`}
                          />
                          <span className="font-medium text-foreground">
                            {sub.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium ${style.blockClassName}`}
                        >
                          {SUBJECT_COLOR_LABELS[sub.colorKey]}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {usedCount} kelas
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.notes ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleStartEdit(sub)}
                          >
                            <PencilIcon data-icon="inline-start" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => {
                              void handleDeleteClick(sub)
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

      <AlertDialog
        open={Boolean(pendingCascadeDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCascadeDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus Mata Pelajaran {pendingCascadeDelete?.subject.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Mata pelajaran ini masih digunakan pada{" "}
              <span className="tabular-nums font-medium text-foreground">
                {pendingCascadeDelete?.dependentRequirementsCount ?? 0}
              </span>{" "}
              kebutuhan pembelajaran dan{" "}
              <span className="tabular-nums font-medium text-foreground">
                {pendingCascadeDelete?.dependentSessionsCount ?? 0}
              </span>{" "}
              sesi terjadwal. Jika dilanjutkan, seluruh kebutuhan dan sesi
              terkait akan ikut dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingCascadeDelete) {
                  void deleteSubject(pendingCascadeDelete.subject.id, {
                    cascade: true,
                  })
                  if (editingId === pendingCascadeDelete.subject.id) {
                    resetForm()
                  }
                  setPendingCascadeDelete(null)
                }
              }}
            >
              Tetap Hapus Beserta Kebutuhan Terkait
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
