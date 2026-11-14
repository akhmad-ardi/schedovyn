import * as React from "react"
import { AlertCircleIcon, PlusIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SNAP_INTERVAL_OPTIONS,
  type SnapIntervalMinutes,
} from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)

  const [name, setName] = React.useState("")
  const [academicPeriod, setAcademicPeriod] = React.useState("")
  const [snapInterval, setSnapInterval] = React.useState<SnapIntervalMinutes>(30)
  const [initMode, setInitMode] = React.useState<"BLANK" | "SEED_DEFAULT">("BLANK")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const resetForm = () => {
    setName("")
    setAcademicPeriod("")
    setSnapInterval(30)
    setInitMode("BLANK")
    setErrorMessage(null)
    setIsSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage("Nama ruang kerja tidak boleh kosong.")
      return
    }
    if (!academicPeriod.trim()) {
      setErrorMessage("Periode akademik tidak boleh kosong.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await createWorkspace({
      name: name.trim(),
      academicPeriod: academicPeriod.trim(),
      defaultSnapIntervalMinutes: snapInterval,
      initMode,
    })

    setIsSubmitting(false)

    if (result.ok) {
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } else {
      setErrorMessage(result.error ?? "Gagal membuat ruang kerja baru.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusIcon className="size-4 text-primary" />
              Buat Ruang Kerja Baru
            </DialogTitle>
            <DialogDescription>
              Siapkan ruang kerja terpisah untuk tahun ajaran baru atau perencanaan kurikulum.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMessage && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircleIcon className="size-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="create-ws-name">Nama Ruang Kerja</Label>
              <Input
                id="create-ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: SMA Harapan Bangsa"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="create-ws-period">Periode Akademik</Label>
              <Input
                id="create-ws-period"
                value={academicPeriod}
                onChange={(e) => setAcademicPeriod(e.target.value)}
                placeholder="Contoh: Semester Ganjil 2026/2027"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="create-ws-snap">Interval Waktu Grid (Snap)</Label>
              <Select
                value={String(snapInterval)}
                onValueChange={(val) =>
                  setSnapInterval(Number(val) as SnapIntervalMinutes)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="create-ws-snap" className="h-9">
                  <SelectValue placeholder="Pilih interval waktu" />
                </SelectTrigger>
                <SelectContent>
                  {SNAP_INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt} Menit
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Opsi Data Awal</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  htmlFor="mode-blank"
                  className={`flex flex-col gap-1 border p-3 cursor-pointer transition-colors ${
                    initMode === "BLANK"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="mode-blank"
                      name="initMode"
                      value="BLANK"
                      checked={initMode === "BLANK"}
                      onChange={() => setInitMode("BLANK")}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Ruang Kerja Kosong
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-5.5">
                    Mulai dari nol tanpa data master maupun jadwal.
                  </span>
                </label>

                <label
                  htmlFor="mode-seed"
                  className={`flex flex-col gap-1 border p-3 cursor-pointer transition-colors ${
                    initMode === "SEED_DEFAULT"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="mode-seed"
                      name="initMode"
                      value="SEED_DEFAULT"
                      checked={initMode === "SEED_DEFAULT"}
                      onChange={() => setInitMode("SEED_DEFAULT")}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Dengan Data Contoh
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-5.5">
                    Memuat contoh kelas, guru, mapel, ruangan, dan kebutuhan.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Buat Ruang Kerja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
