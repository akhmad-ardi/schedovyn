import * as React from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  LayersIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
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
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog"
import { DuplicateWorkspaceDialog } from "@/components/workspace/duplicate-workspace-dialog"
import { type Workspace } from "@/domain/types/entities"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function WorkspaceManagementCard() {
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeWorkspace = useWorkspaceStore((state) => state.workspace)
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace)
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace)

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [duplicateTarget, setDuplicateTarget] = React.useState<Workspace | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = React.useState<Workspace | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [feedbackMessage, setFeedbackMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const handleActivate = async (workspaceId: string) => {
    setFeedbackMessage(null)
    const res = await switchWorkspace(workspaceId)
    if (!res.ok) {
      setFeedbackMessage({
        type: "error",
        text: res.error ?? "Gagal berpindah ruang kerja.",
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    setFeedbackMessage(null)
    const res = await deleteWorkspace(deleteTarget.id)
    setIsDeleting(false)

    if (res.ok) {
      setDeleteTarget(null)
    } else {
      setFeedbackMessage({
        type: "error",
        text: res.error ?? "Gagal menghapus ruang kerja.",
      })
      setDeleteTarget(null)
    }
  }

  const canDeleteWorkspaces = workspaces.length > 1

  return (
    <>
      <Card className="rounded-none border border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <LayersIcon className="size-4 text-primary" />
              Pengelolaan Ruang Kerja
            </CardTitle>
            <CardDescription className="text-xs">
              Kelola beberapa ruang kerja untuk tahun ajaran terpisah atau buat
              salinan simulasi jadwal tanpa mengganggu data utama.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            data-testid="create-workspace-button"
            onClick={() => setCreateDialogOpen(true)}
            className="self-start sm:self-auto gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            <span>Buat Ruang Kerja</span>
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {feedbackMessage && (
            <div
              className={`p-3 text-xs border ${
                feedbackMessage.type === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-primary/40 bg-primary/10 text-primary"
              }`}
            >
              {feedbackMessage.text}
            </div>
          )}

          <div className="divide-y divide-border border border-border">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspace?.id
              return (
                <div
                  key={ws.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 transition-colors ${
                    isActive ? "bg-muted/40" : "hover:bg-muted/20"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {ws.name}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-primary/15 text-primary border border-primary/30">
                          <CheckCircle2Icon className="size-3" />
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{ws.academicPeriod}</span>
                      <span>·</span>
                      <span>Interval {ws.defaultSnapIntervalMinutes} menit</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {!isActive && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid={`activate-workspace-${ws.id}`}
                        onClick={() => handleActivate(ws.id)}
                        className="h-8 text-xs"
                      >
                        Aktifkan
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`duplicate-workspace-${ws.id}`}
                      onClick={() => setDuplicateTarget(ws)}
                      className="h-8 text-xs gap-1"
                    >
                      <CopyIcon className="size-3" />
                      <span>Duplikasi</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`delete-workspace-${ws.id}`}
                      disabled={!canDeleteWorkspaces}
                      onClick={() => setDeleteTarget(ws)}
                      title={
                        !canDeleteWorkspaces
                          ? "Tidak dapat menghapus satu-satunya ruang kerja yang tersisa."
                          : "Hapus ruang kerja ini"
                      }
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border disabled:opacity-40"
                    >
                      <Trash2Icon className="size-3" />
                      <span className="sr-only">Hapus {ws.name}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <DuplicateWorkspaceDialog
        open={duplicateTarget !== null}
        onOpenChange={(open) => !open && setDuplicateTarget(null)}
        sourceWorkspace={duplicateTarget}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon className="size-4" />
              Hapus Ruang Kerja
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus ruang kerja &ldquo;
              {deleteTarget?.name}&rdquo;? Seluruh data master dan jadwal pada
              ruang kerja ini akan dihapus secara permanen dari perangkat lokal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              Hapus Ruang Kerja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
