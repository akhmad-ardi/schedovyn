import * as React from "react"
import { AlertCircleIcon, CopyIcon } from "lucide-react"
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
  type DuplicateWorkspaceMode,
  type Workspace,
} from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface DuplicateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceWorkspace: Workspace | null
  onSuccess?: () => void
}

export function DuplicateWorkspaceDialog({
  open,
  onOpenChange,
  sourceWorkspace,
  onSuccess,
}: DuplicateWorkspaceDialogProps) {
  const duplicateWorkspace = useWorkspaceStore(
    (state) => state.duplicateWorkspace
  )

  const [name, setName] = React.useState("")
  const [academicPeriod, setAcademicPeriod] = React.useState("")
  const [mode, setMode] =
    React.useState<DuplicateWorkspaceMode>("MASTER_DATA_ONLY")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const resetForm = () => {
    setName("")
    setAcademicPeriod("")
    setMode("MASTER_DATA_ONLY")
    setErrorMessage(null)
    setIsSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const effectivePeriod = academicPeriod || (sourceWorkspace?.academicPeriod ?? "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceWorkspace) return

    if (!name.trim()) {
      setErrorMessage("Nama ruang kerja baru tidak boleh kosong.")
      return
    }
    const finalPeriod = effectivePeriod.trim()
    if (!finalPeriod) {
      setErrorMessage("Periode akademik tidak boleh kosong.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await duplicateWorkspace({
      sourceWorkspaceId: sourceWorkspace.id,
      name: name.trim(),
      academicPeriod: finalPeriod,
      mode,
    })

    setIsSubmitting(false)

    if (result.ok) {
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } else {
      setErrorMessage(result.error ?? "Gagal menduplikasi ruang kerja.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CopyIcon className="size-4 text-primary" />
              Duplikasi Ruang Kerja
            </DialogTitle>
            <DialogDescription>
              Salin konfigurasi dari &ldquo;{sourceWorkspace?.name}&rdquo; untuk semester baru atau simulasi jadwal.
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
              <Label htmlFor="dup-ws-name">Nama Ruang Kerja Baru</Label>
              <Input
                id="dup-ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Contoh: ${sourceWorkspace?.name ?? ""} (Salinan)`}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="dup-ws-period">Periode Akademik</Label>
              <Input
                id="dup-ws-period"
                value={effectivePeriod}
                onChange={(e) => setAcademicPeriod(e.target.value)}
                placeholder="Contoh: Semester Genap 2026/2027"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label>Pilihan Mode Duplikasi</Label>
              <div className="grid grid-cols-1 gap-2">
                <label
                  htmlFor="dup-mode-master"
                  className={`flex flex-col gap-1 border p-3 cursor-pointer transition-colors ${
                    mode === "MASTER_DATA_ONLY"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="dup-mode-master"
                      name="dupMode"
                      value="MASTER_DATA_ONLY"
                      checked={mode === "MASTER_DATA_ONLY"}
                      onChange={() => setMode("MASTER_DATA_ONLY")}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Konfigurasi & Data Master Saja
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-5.5">
                    Ideal untuk semester baru: menyalin kelas, guru, mapel, ruangan,
                    dan beban mengajar, namun mengosongkan seluruh sesi jadwal.
                  </span>
                </label>

                <label
                  htmlFor="dup-mode-full"
                  className={`flex flex-col gap-1 border p-3 cursor-pointer transition-colors ${
                    mode === "FULL_COPY"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="dup-mode-full"
                      name="dupMode"
                      value="FULL_COPY"
                      checked={mode === "FULL_COPY"}
                      onChange={() => setMode("FULL_COPY")}
                      className="size-3.5 text-primary"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Salin Penuh Beserta Jadwal
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-5.5">
                    Ideal untuk simulasi: menduplikasi seluruh konfigurasi, master
                    data, dan seluruh sesi jadwal aktif ke ruang kerja baru.
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
              {isSubmitting ? "Menduplikasi..." : "Duplikasi Sekarang"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
