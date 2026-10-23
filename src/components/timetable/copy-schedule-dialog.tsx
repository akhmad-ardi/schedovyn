import * as React from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type CopyConflictResolution,
  type CopyScheduleOptions,
  type RoomCopyStrategy,
  type TeacherCopyStrategy,
} from "@/domain/timetable/schedule-copier"
import {
  useWorkspaceStore,
  type CopyScheduleOutcome,
} from "@/store/use-workspace-store"

export interface CopyScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CopyScheduleDialog({
  open,
  onOpenChange,
}: CopyScheduleDialogProps) {
  const classes = useWorkspaceStore((state) => state.classes)
  const sessions = useWorkspaceStore((state) => state.sessions)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const copyClassSchedule = useWorkspaceStore((state) => state.copyClassSchedule)
  const setActiveClass = useWorkspaceStore((state) => state.setActiveClass)

  const activeClassId = workspace?.activeClassId ?? ""
  const defaultSourceId =
    activeClassId || (classes.length > 0 ? classes[0].id : "")

  const [sourceClassId, setSourceClassId] = React.useState<string>(defaultSourceId)
  const [targetClassId, setTargetClassId] = React.useState<string>("")
  const [conflictResolution, setConflictResolution] =
    React.useState<CopyConflictResolution>("replace")
  const [teacherStrategy, setTeacherStrategy] =
    React.useState<TeacherCopyStrategy>("use-target-default")
  const [roomStrategy, setRoomStrategy] =
    React.useState<RoomCopyStrategy>("use-target-default")

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [outcome, setOutcome] = React.useState<CopyScheduleOutcome | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTargetClassId("")
      setOutcome(null)
      setErrorMessage(null)
      setIsSubmitting(false)
    } else {
      const initialSource = activeClassId || (classes.length > 0 ? classes[0].id : "")
      setSourceClassId(initialSource)
    }
    onOpenChange(nextOpen)
  }

  const effectiveSourceId = sourceClassId || defaultSourceId
  const sourceSessionsCount = sessions.filter(
    (s) => s.classId === effectiveSourceId
  ).length

  const targetClass = classes.find((c) => c.id === targetClassId)
  const sourceClass = classes.find((c) => c.id === effectiveSourceId)

  const isSameClass = Boolean(
    effectiveSourceId && targetClassId && effectiveSourceId === targetClassId
  )
  const isTargetEmpty = !targetClassId
  const isSourceEmpty = sourceSessionsCount === 0

  const isSubmitDisabled =
    isTargetEmpty || isSameClass || isSourceEmpty || isSubmitting

  const handleCopy = async () => {
    if (isSubmitDisabled) return

    setIsSubmitting(true)
    setErrorMessage(null)

    const options: CopyScheduleOptions = {
      sourceClassId: effectiveSourceId,
      targetClassId,
      conflictResolution,
      teacherStrategy,
      roomStrategy,
    }

    try {
      const res = await copyClassSchedule(options)
      if (res.ok) {
        setOutcome(res)
      } else {
        setErrorMessage(res.error ?? "Gagal menyalin jadwal kelas.")
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyalin jadwal."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  const handleGoToTarget = async () => {
    if (outcome?.targetClassId) {
      await setActiveClass(outcome.targetClassId)
    }
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl! overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CopyIcon className="size-5 text-primary" />
            <DialogTitle>Salin Jadwal Pembelajaran Antar Kelas</DialogTitle>
          </div>
          <DialogDescription>
            Duplikasi seluruh susunan jadwal pembelajaran ke kelas paralel lain secara praktis.
          </DialogDescription>
        </DialogHeader>

        {outcome ? (
          // Layar Hasil Pasca-Penyalinan
          <div className="flex flex-col gap-4 py-2">
            <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100">
              <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="text-sm font-semibold">
                Jadwal Berhasil Disalin!
              </AlertTitle>
              <AlertDescription className="text-xs">
                Susunan pembelajaran dari kelas {sourceClass?.name} telah diduplikasi ke kelas{" "}
                {targetClass?.name}.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="border border-border bg-card p-3 text-center">
                <span className="text-[11px] text-muted-foreground">Sesi Disalin</span>
                <p className="font-heading text-lg font-bold tabular-nums text-foreground">
                  {outcome.copiedCount}
                </p>
              </div>
              <div className="border border-border bg-card p-3 text-center">
                <span className="text-[11px] text-muted-foreground">Sesi Lama Dihapus</span>
                <p className="font-heading text-lg font-bold tabular-nums text-muted-foreground">
                  {outcome.replacedCount}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 border border-border bg-card p-3 text-center">
                <span className="text-[11px] text-muted-foreground">Konflik Baru</span>
                <p
                  className={`font-heading text-lg font-bold tabular-nums ${
                    outcome.newConflictsCount > 0
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {outcome.newConflictsCount}
                </p>
              </div>
            </div>

            {outcome.newConflictsCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangleIcon className="size-4" />
                <AlertTitle className="text-xs font-semibold">
                  Bentrokan Jadwal Ditemukan
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Ditemukan {outcome.newConflictsCount} bentrokan waktu pada kelas sasaran.
                  Silakan periksa penugasan guru atau ruangan pada jadwal kelas tersebut.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Tutup
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleGoToTarget}
                className="gap-1.5"
              >
                <ExternalLinkIcon className="size-3.5" />
                <span>Buka Jadwal Kelas Sasaran</span>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Layar Formulir Opsi Penyalinan
          <div className="flex flex-col gap-4 py-2">
            {/* Kotak Peringatan Resmi PRD FR-12 */}
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100">
              <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold">
                Perhatian Sebelum Menyalin
              </AlertTitle>
              <AlertDescription className="text-xs">
                Periksa guru dan ruangan pada kelas penerima. Menyalin jadwal berpotensi memicu
                bentrokan waktu jika jadwal bertabrakan dengan kelas lain. Sistem akan
                menjalankan ulang pendeteksian konflik secara otomatis.
              </AlertDescription>
            </Alert>

            {/* Pemilih Kelas Sumber & Kelas Tujuan */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="source-class-select"
                  className="text-xs font-medium text-foreground"
                >
                  Kelas Sumber
                </label>
                <Select
                  value={effectiveSourceId}
                  onValueChange={(val) => val && setSourceClassId(val)}
                >
                  <SelectTrigger
                    id="source-class-select"
                    aria-label="Kelas Sumber"
                    className="w-full"
                  >
                    <SelectValue placeholder="Pilih kelas awal" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  {sourceSessionsCount} sesi terjadwal
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="target-class-select"
                  className="text-xs font-medium text-foreground"
                >
                  Kelas Tujuan
                </label>
                <Select
                  value={targetClassId}
                  onValueChange={(val) => val && setTargetClassId(val)}
                >
                  <SelectTrigger
                    id="target-class-select"
                    aria-label="Kelas Tujuan"
                    className="w-full"
                  >
                    <SelectValue placeholder="Pilih kelas penerima" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter((cls) => cls.id !== effectiveSourceId)
                      .map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {isSameClass && (
                  <span className="text-[11px] font-medium text-destructive">
                    Pilihan kelas sasaran tidak boleh sama dengan sumber
                  </span>
                )}
                {isTargetEmpty && (
                  <span className="text-[11px] text-muted-foreground">
                    Pilih kelas penerima salinan jadwal
                  </span>
                )}
              </div>
            </div>

            {/* Opsi Mode Penanganan: Timpa vs Gabung */}
            <div className="flex flex-col gap-2 border border-border bg-card p-3">
              <span className="text-xs font-semibold text-foreground">
                Mode Penanganan Sesi Jadwal Sasaran
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setConflictResolution("replace")}
                  className={`flex flex-col items-start gap-1 border p-2.5 text-left transition-colors cursor-pointer ${
                    conflictResolution === "replace"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    Timpa Jadwal Lama (Replace)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Hapus seluruh sesi yang sudah ada di kelas sasaran sebelum menyalin.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConflictResolution("merge")}
                  className={`flex flex-col items-start gap-1 border p-2.5 text-left transition-colors cursor-pointer ${
                    conflictResolution === "merge"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    Gabung dengan Jadwal Lama (Merge)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Tambahkan sesi baru ke jadwal kelas sasaran tanpa menghapus sesi lama.
                  </span>
                </button>
              </div>
            </div>

            {/* Opsi Penugasan Guru & Ruangan */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 border border-border bg-card p-3">
                <label
                  htmlFor="teacher-strategy-select"
                  className="text-xs font-semibold text-foreground"
                >
                  Penugasan Guru
                </label>
                <Select
                  value={teacherStrategy}
                  onValueChange={(val) =>
                    val && setTeacherStrategy(val as TeacherCopyStrategy)
                  }
                >
                  <SelectTrigger
                    id="teacher-strategy-select"
                    aria-label="Penugasan Guru"
                    className="w-full text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="use-target-default">
                      Gunakan Guru Default Sasaran
                    </SelectItem>
                    <SelectItem value="keep-source">
                      Salin Guru dari Sumber (Bisa Bentrok)
                    </SelectItem>
                    <SelectItem value="clear">Kosongkan Guru (Atur Nanti)</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  Strategi penentuan guru pada sesi baru.
                </span>
              </div>

              <div className="flex flex-col gap-1.5 border border-border bg-card p-3">
                <label
                  htmlFor="room-strategy-select"
                  className="text-xs font-semibold text-foreground"
                >
                  Penugasan Ruangan
                </label>
                <Select
                  value={roomStrategy}
                  onValueChange={(val) =>
                    val && setRoomStrategy(val as RoomCopyStrategy)
                  }
                >
                  <SelectTrigger
                    id="room-strategy-select"
                    aria-label="Penugasan Ruangan"
                    className="w-full text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="use-target-default">
                      Gunakan Ruangan Default Sasaran
                    </SelectItem>
                    <SelectItem value="keep-source">
                      Salin Ruangan dari Sumber
                    </SelectItem>
                    <SelectItem value="clear">
                      Kosongkan Ruangan (Tanpa Ruang)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  Strategi penentuan ruangan pada sesi baru.
                </span>
              </div>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangleIcon className="size-4" />
                <AlertTitle className="text-xs font-semibold">Gagal Menyalin</AlertTitle>
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCopy}
                disabled={isSubmitDisabled}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    <span>Menyalin...</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" />
                    <span>Salin Jadwal Sekarang</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
