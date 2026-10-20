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
  ROOM_TYPE_LABELS,
  ROOM_TYPE_OPTIONS,
  type Room,
  type RoomType,
  type TimeInterval,
} from "@/domain/types/entities"
import type { MasterDataValidationIssue } from "@/domain/validation/master-data-validator"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function RoomsTab() {
  const rooms = useWorkspaceStore((state) => state.rooms)
  const createRoom = useWorkspaceStore((state) => state.createRoom)
  const updateRoom = useWorkspaceStore((state) => state.updateRoom)
  const deleteRoom = useWorkspaceStore((state) => state.deleteRoom)

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<RoomType>("classroom")
  const [notes, setNotes] = React.useState("")
  const [unavailableIntervals, setUnavailableIntervals] = React.useState<
    TimeInterval[]
  >([])
  const [issues, setIssues] = React.useState<MasterDataValidationIssue[]>([])

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setType("classroom")
    setNotes("")
    setUnavailableIntervals([])
    setIssues([])
  }

  const handleStartEdit = (room: Room) => {
    setEditingId(room.id)
    setName(room.name)
    setType(room.type)
    setNotes(room.notes ?? "")
    setUnavailableIntervals(room.unavailableIntervals)
    setIssues([])
  }

  const handleSubmit = async () => {
    const outcome = editingId
      ? await updateRoom(editingId, {
          name,
          type,
          notes,
          unavailableIntervals,
        })
      : await createRoom({
          name,
          type,
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
            {editingId ? "Perbarui Data Ruangan" : "Tambah Ruangan Baru"}
          </CardTitle>
          <CardDescription>
            Daftarkan ruang kelas, laboratorium, lapangan olahraga, atau aula
            untuk mencegah penggunaan satu ruangan oleh dua kelas bersamaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Gagal menyimpan data ruangan</AlertTitle>
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
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="room-name-input">Nama / Nomor Ruangan</Label>
                <Input
                  id="room-name-input"
                  type="text"
                  value={name}
                  placeholder="Contoh: Lab IPA 1"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="room-type-select">Jenis Ruangan</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as RoomType)}
                >
                  <SelectTrigger id="room-type-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROOM_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {ROOM_TYPE_LABELS[opt]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="room-notes-input">Keterangan (Opsional)</Label>
                <Input
                  id="room-notes-input"
                  type="text"
                  value={notes}
                  placeholder="Contoh: Kapasitas 32 siswa"
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>

            <UnavailableIntervalsEditor
              idPrefix="room-unv"
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
                {editingId ? "Simpan Perubahan" : "Tambah Ruangan"}
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
          <CardTitle>Daftar Ruangan ({rooms.length})</CardTitle>
          <CardDescription>
            Menghapus ruangan akan mengosongkan ruangan default pada kebutuhan
            dan sesi terkait tanpa menghapus sesinya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Belum ada ruangan yang terdaftar.
              </p>
              <p>
                Tambahkan ruang kelas atau laboratorium menggunakan formulir di
                atas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Ruangan</TableHead>
                  <TableHead>Jenis Ruangan</TableHead>
                  <TableHead>Waktu Tidak Tersedia</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((rm) => (
                  <TableRow key={rm.id}>
                    <TableCell className="font-medium text-foreground">
                      {rm.name}
                    </TableCell>
                    <TableCell>
                      <span className="border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {ROOM_TYPE_LABELS[rm.type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {rm.unavailableIntervals.length === 0 ? (
                        <span className="text-muted-foreground">
                          Selalu tersedia
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {rm.unavailableIntervals.map((unv) => (
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
                      {rm.notes ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handleStartEdit(rm)}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            void deleteRoom(rm.id)
                            if (editingId === rm.id) {
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
