import { useState, type ReactElement } from "react"
import { AlertTriangleIcon, DownloadIcon, FileTextIcon, Loader2Icon } from "lucide-react"
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
  mapClassScheduleForExport,
  mapWorkspaceScheduleForExport,
} from "@/services/export/export-data-mapper"
import { generateTimetablePdf } from "@/services/export/pdf-exporter"
import type {
  ExportClassPayload,
  ExportScope,
  PdfExportMetadata,
  PdfExportOptions,
} from "@/services/export/export-types"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export interface ExportPdfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportPdfDialog({
  open,
  onOpenChange,
}: ExportPdfDialogProps): ReactElement | null {
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
  const [userAppendixSetting, setUserAppendixSetting] = useState<
    boolean | null
  >(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Ambil summary validasi sesuai cakupan yang dipilih
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

  // Derived state: saat konflik, default true. Jika user mengatur manual, gunakan setting user.
  const includeAppendix =
    userAppendixSetting !== null ? userAppendixSetting : hasConflicts || true

  const handleExport = async () => {
    if (!workspace) return

    try {
      setIsGenerating(true)
      setErrorMessage(null)

      const allConflicts =
        validationReport?.workspaceSummary.conflicts ?? currentConflicts

      const formattedDate = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date())

      const metadata: PdfExportMetadata = {
        workspaceName: workspace.name,
        academicPeriod: workspace.academicPeriod,
        exportedAt: formattedDate,
        scope,
      }

      const options: PdfExportOptions = {
        scope,
        includeConflictAppendix: includeAppendix,
      }

      let payloads: ExportClassPayload[] = []

      if (scope === "ACTIVE_CLASS") {
        if (!activeClass) {
          throw new Error("Tidak ada kelas aktif yang dipilih.")
        }
        const singlePayload = mapClassScheduleForExport({
          classGroup: activeClass,
          workspace,
          dayConfigs,
          sessions,
          subjects,
          teachers,
          rooms,
          conflicts: allConflicts,
          validationSummary: activeClassSummary,
          classes,
        })
        payloads = [singlePayload]
      } else {
        payloads = mapWorkspaceScheduleForExport({
          classes,
          workspace,
          dayConfigs,
          sessions,
          subjects,
          teachers,
          rooms,
          conflicts: allConflicts,
          validationSummaryByClass: validationReport?.byClassId,
        })
      }

      await generateTimetablePdf({
        payloads,
        options,
        metadata,
      })

      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses ekspor PDF."
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
            <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
              <FileTextIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Ekspor Jadwal ke PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Unduh salinan jadwal pembelajaran dalam format A4 Landscape siap
                cetak.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Peringatan Pra-Ekspor Real-Time (AC-11) */}
          {hasConflicts && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20"
            >
              <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
              <div>
                <AlertTitle className="text-xs font-semibold">
                  Jadwal Mengandung Bentrokan Waktu
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs text-destructive/90 space-y-1">
                  <p>
                    Terdapat {currentConflicts.length} bentrokan waktu aktif
                    pada jadwal yang akan diekspor:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs">
                    {currentConflicts.slice(0, 3).map((conflict) => (
                      <li key={conflict.id}>
                        <span className="font-semibold">{conflict.title}</span>
                        : {conflict.description}
                      </li>
                    ))}
                    {currentConflicts.length > 3 && (
                      <li className="italic">
                        ...dan {currentConflicts.length - 3} bentrokan lainnya.
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {!hasConflicts &&
            currentSummary?.status === "INCOMPLETE" &&
            (currentSummary.unscheduledSessionsCount ?? 0) > 0 && (
              <Alert className="border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <AlertTitle className="text-xs font-semibold">
                    Alokasi Sesi Belum Lengkap
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                    Masih ada {currentSummary.unscheduledSessionsCount} sesi
                    pembelajaran yang belum ditempatkan ke grid jadwal.
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
                htmlFor="scope-active"
                className="flex items-center gap-2.5 cursor-pointer text-xs"
              >
                <input
                  type="radio"
                  id="scope-active"
                  name="export-scope"
                  value="ACTIVE_CLASS"
                  checked={scope === "ACTIVE_CLASS"}
                  onChange={() => {
                    setScope("ACTIVE_CLASS")
                    setUserAppendixSetting(null)
                  }}
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
                htmlFor="scope-workspace"
                className="flex items-center gap-2.5 cursor-pointer text-xs"
              >
                <input
                  type="radio"
                  id="scope-workspace"
                  name="export-scope"
                  value="ENTIRE_WORKSPACE"
                  checked={scope === "ENTIRE_WORKSPACE"}
                  onChange={() => {
                    setScope("ENTIRE_WORKSPACE")
                    setUserAppendixSetting(null)
                  }}
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

          {/* Opsi Tambahan Lampiran Konflik */}
          <div className="rounded-none border border-border p-3 bg-muted/10">
            <label
              htmlFor="include-appendix"
              className="flex items-center gap-2.5 cursor-pointer text-xs"
            >
              <input
                type="checkbox"
                id="include-appendix"
                checked={includeAppendix}
                onChange={(e) => setUserAppendixSetting(e.target.checked)}
                className="size-4 rounded-none border-input accent-primary"
              />
              <span className="text-foreground">
                Sertakan lampiran rincian konflik pada dokumen
              </span>
            </label>
            <p className="mt-1 pl-6.5 text-[11px] text-muted-foreground">
              Menambahkan lembar rincian bentrokan dan pihak yang terlibat di
              bagian akhir dokumen.
            </p>
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
            onClick={() => void handleExport()}
            className="gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                <span>Menyiapkan Dokumen PDF...</span>
              </>
            ) : hasConflicts ? (
              <>
                <AlertTriangleIcon className="size-3.5" />
                <span>Tetap Ekspor PDF dengan Peringatan Konflik</span>
              </>
            ) : (
              <>
                <DownloadIcon className="size-3.5" />
                <span>Unduh Dokumen PDF</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
