import { useState } from "react"
import {
  CopyIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react"
import { ConflictListPanel } from "@/components/conflicts/conflict-list-panel"
import { ConflictStatusBadge } from "@/components/conflicts/conflict-status-badge"
import { CopyScheduleDialog } from "@/components/timetable/copy-schedule-dialog"
import { ExportExcelDialog } from "@/components/export/export-excel-dialog"
import { ExportPdfDialog } from "@/components/export/export-pdf-dialog"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function EditorToolbar() {
  const [conflictListOpen, setConflictListOpen] = useState(false)
  const [copyScheduleOpen, setCopyScheduleOpen] = useState(false)
  const [exportPdfOpen, setExportPdfOpen] = useState(false)
  const [exportExcelOpen, setExportExcelOpen] = useState(false)

  const undo = useWorkspaceStore((state) => state.undo)
  const redo = useWorkspaceStore((state) => state.redo)
  const pastCount = useWorkspaceStore((state) => state.historyPast?.length ?? 0)
  const futureCount = useWorkspaceStore(
    (state) => state.historyFuture?.length ?? 0
  )
  const getUndoActionLabel = useWorkspaceStore(
    (state) => state.getUndoActionLabel
  )
  const getRedoActionLabel = useWorkspaceStore(
    (state) => state.getRedoActionLabel
  )

  const canUndo = pastCount > 0
  const canRedo = futureCount > 0

  const undoActionLabel = getUndoActionLabel()
  const redoActionLabel = getRedoActionLabel()

  const undoTitle =
    canUndo && undoActionLabel
      ? `Batalkan: ${undoActionLabel} (Ctrl+Z)`
      : "Tidak ada perubahan yang dapat dibatalkan"

  const redoTitle =
    canRedo && redoActionLabel
      ? `Ulangi: ${redoActionLabel} (Ctrl+Y)`
      : "Tidak ada perubahan yang dapat diulangi"

  return (
    <>
      <div
        role="toolbar"
        aria-label="Kontrol Editor Jadwal"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2"
      >
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!canUndo}
            aria-label="Batal Perubahan"
            title={undoTitle}
            onClick={() => {
              void undo()
            }}
          >
            <Undo2Icon data-icon="inline-start" className="size-3.5" />
            <span>Batal Perubahan</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!canRedo}
            aria-label="Ulangi Perubahan"
            title={redoTitle}
            onClick={() => {
              void redo()
            }}
          >
            <Redo2Icon data-icon="inline-start" className="size-3.5" />
            <span>Ulangi Perubahan</span>
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label="Salin Jadwal"
            title="Salin Susunan Jadwal ke Kelas Lain"
            onClick={() => setCopyScheduleOpen(true)}
          >
            <CopyIcon data-icon="inline-start" className="size-3.5" />
            <span>Salin Jadwal</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label="Ekspor PDF"
            title="Ekspor Jadwal ke Dokumen PDF"
            onClick={() => setExportPdfOpen(true)}
          >
            <FileDownIcon data-icon="inline-start" className="size-3.5" />
            <span>Ekspor PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label="Ekspor Excel"
            title="Ekspor Jadwal ke Berkas Spreadsheet Excel (.xlsx)"
            onClick={() => setExportExcelOpen(true)}
          >
            <FileSpreadsheetIcon
              data-icon="inline-start"
              className="size-3.5"
            />
            <span>Ekspor Excel</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <ConflictStatusBadge
            onOpenConflictList={() => setConflictListOpen(true)}
          />

          <span className="tabular-nums">
            Riwayat: {pastCount} langkah tersimpan
          </span>
        </div>
      </div>

      <ConflictListPanel
        open={conflictListOpen}
        onOpenChange={setConflictListOpen}
      />

      <CopyScheduleDialog
        open={copyScheduleOpen}
        onOpenChange={setCopyScheduleOpen}
      />

      <ExportPdfDialog
        open={exportPdfOpen}
        onOpenChange={setExportPdfOpen}
      />

      <ExportExcelDialog
        open={exportExcelOpen}
        onOpenChange={setExportExcelOpen}
      />
    </>
  )
}
