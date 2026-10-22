import { useState, type ReactElement } from "react"
import {
  AlertTriangleIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
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
import { buildExcelExportPayload } from "@/services/export/excel-data-mapper"
import { generateTimetableExcel } from "@/services/export/excel-exporter"
import type { ExcelExportOptions } from "@/services/export/excel-types"
import type { ExportScope } from "@/services/export/export-types"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface ExportExcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportExcelDialog({
  open,
  onOpenChange,
}: ExportExcelDialogProps): ReactElement | null {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const classes = useWorkspaceStore((state) => state.classes)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const sessions = useWorkspaceStore((state) => state.sessions)
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const validationReport = useWorkspaceStore((state) => state.validationReport)

  const activeClassId = workspace?.activeClassId ?? null
  const activeClass =
    classes.find((c) => c.id === activeClassId) ?? classes[0] ?? null

  const [scope, setScope] = useState<ExportScope>("ACTIVE_CLASS")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Ambil ringkasan validasi berdasarkan cakupan terpilih
  const activeClassSummary =
    activeClassId && validationReport?.byClassId
      ? validationReport.byClassId[activeClassId] ?? null
      : null

  const currentSummary =
    scope === "ACTIVE_CLASS"
      ? activeClassSummary
      : (validationReport?.workspaceSummary ?? null)

  const currentConflicts = currentSummary?.conflicts ?? []
  const hasConflicts =
    (currentSummary?.activeConflictsCount ?? 0) > 0 ||
    currentConflicts.length > 0

  const handleExport = async () => {
    if (!workspace) return

    try {
      setIsGenerating(true)
      setErrorMessage(null)

      const payload = buildExcelExportPayload({
        scope,
        workspace,
        activeClassId,
        classes,
        dayConfigs,
        sessions,
        subjects,
        teachers,
        rooms,
        conflicts:
          validationReport?.workspaceSummary.conflicts ?? currentConflicts,
        validationSummary: currentSummary,
      })

      const options: ExcelExportOptions = {
        scope,
        includeSummaries: scope === "ENTIRE_WORKSPACE",
      }

      await generateTimetableExcel(payload, options)

      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses ekspor Excel."
      setErrorMessage(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-none bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <FileSpreadsheetIcon className="size-4" />
            </div>
            <div>
              <DialogTitle
                aria-label="Ekspor Jadwal ke Excel"
                className="text-base font-semibold"
              >
                Ekspor ke Excel (.xlsx)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Unduh berkas spreadsheet .xlsx dengan format tabel rapi dan
                AutoFilter siap analisis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Peringatan Pra-Ekspor Bentrokan Waktu (AC-11) */}
          {hasConflicts && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20"
            >
              <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
              <div>
                <AlertTitle className="text-xs font-semibold">
                  Peringatan Waktu
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs text-destructive/90">
                  Terdapat {currentConflicts.length} bentrokan waktu aktif pada
                  sesi pembelajaran yang akan diekspor.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Peringatan Sesi Belum Lengkap */}
          {!hasConflicts &&
            currentSummary?.status === "INCOMPLETE" &&
            (currentSummary.unscheduledSessionsCount ?? 0) > 0 && (
              <Alert className="border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <AlertTitle className="text-xs font-semibold">
                    Status Alokasi Sesi
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                    Masih ada {currentSummary.unscheduledSessionsCount} sesi
                    pembelajaran yang belum terjadwal ke grid.
                  </AlertDescription>
                </div>
              </Alert>
            )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertTitle className="text-xs font-semibold">
                Gagal Mengekspor
              </AlertTitle>
              <AlertDescription className="text-xs">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Pemilihan Cakupan Ekspor */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              Cakupan Ekspor
            </legend>
            <div className="space-y-2 rounded-none border border-border p-3 bg-muted/20">
              <label
                htmlFor="excel-scope-active"
                className="flex items-center gap-2.5 cursor-pointer text-xs"
              >
                <input
                  type="radio"
                  id="excel-scope-active"
                  name="excel-export-scope"
                  value="ACTIVE_CLASS"
                  checked={scope === "ACTIVE_CLASS"}
                  onChange={() => setScope("ACTIVE_CLASS")}
                  className="size-4 accent-primary"
                />
                <div>
                  <span className="font-medium text-foreground">
                    Kelas Aktif
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({activeClass?.name ?? "Tidak ada kelas"})
                  </span>
                </div>
              </label>

              <label
                htmlFor="excel-scope-workspace"
                className="flex items-center gap-2.5 cursor-pointer text-xs"
              >
                <input
                  type="radio"
                  id="excel-scope-workspace"
                  name="excel-export-scope"
                  value="ENTIRE_WORKSPACE"
                  checked={scope === "ENTIRE_WORKSPACE"}
                  onChange={() => setScope("ENTIRE_WORKSPACE")}
                  className="size-4 accent-primary"
                />
                <div>
                  <span className="font-medium text-foreground">
                    Seluruh Kelas
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({classes.length} Kelas terdaftar)
                  </span>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Ringkasan Worksheet yang Akan Dibuat */}
          <div className="rounded-none border border-border p-3 bg-muted/10 space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              Lembar Kerja (Worksheet) yang Akan Dihasilkan:
            </span>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
              <li>
                <span className="font-medium text-foreground">Jadwal</span> —
                Data sesi pembelajaran{" "}
                {scope === "ACTIVE_CLASS"
                  ? `kelas ${activeClass?.name ?? ""}`
                  : "seluruh kelas"}{" "}
                dengan AutoFilter aktif
              </li>
              {scope === "ENTIRE_WORKSPACE" && (
                <>
                  <li>
                    <span className="font-medium text-foreground">
                      Rekap Guru
                    </span>{" "}
                    — Rekapitulasi jam mengajar mingguan dan sebaran kelas per
                    guru
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Rekap Ruangan
                    </span>{" "}
                    — Rekapitulasi total durasi pemakaian fasilitas ruangan
                  </li>
                </>
              )}
              {hasConflicts && (
                <li>
                  <span className="font-medium text-destructive">
                    Rincian Kendala
                  </span>{" "}
                  — Lembar rincian permasalahan waktu aktif yang perlu ditinjau
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGenerating}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>

          <Button
            type="button"
            variant={hasConflicts ? "destructive" : "default"}
            size="sm"
            disabled={isGenerating}
            aria-label={
              hasConflicts
                ? "Tetap Ekspor Excel dengan Peringatan Konflik"
                : "Unduh Berkas Excel (.xlsx)"
            }
            onClick={() => void handleExport()}
            className="gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                <span>Menyiapkan Berkas Excel...</span>
              </>
            ) : hasConflicts ? (
              <>
                <AlertTriangleIcon className="size-3.5" />
                <span>Tetap Ekspor dengan Peringatan</span>
              </>
            ) : (
              <>
                <DownloadIcon className="size-3.5" />
                <span>Unduh Berkas Excel (.xlsx)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
