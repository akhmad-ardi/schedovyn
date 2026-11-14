import * as React from "react"
import {
  Building2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace)

  const [open, setOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  const activeWorkspaceName = workspace?.name ?? "Pilih Ruang Kerja"
  const activePeriod = workspace?.academicPeriod ?? ""

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId !== workspace?.id) {
      await switchWorkspace(workspaceId)
    }
    setOpen(false)
  }

  const handleOpenCreateDialog = () => {
    setOpen(false)
    setCreateDialogOpen(true)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            role="combobox"
            aria-expanded={open}
            aria-label="Pilih Ruang Kerja"
            data-testid="workspace-switcher-trigger"
            className="h-8 max-w-[280px] sm:max-w-[360px] justify-between gap-1.5 px-2 text-left text-xs font-normal border border-border/60 hover:bg-muted/70 hover:border-border"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground truncate">
                Ruang: {activeWorkspaceName}
              </span>
              {activePeriod && (
                <>
                  <span className="text-muted-foreground/60 hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-muted-foreground hidden sm:inline truncate">
                    {activePeriod}
                  </span>
                </>
              )}
            </div>
            <ChevronsUpDownIcon className="size-3 shrink-0 text-muted-foreground/80 ml-1" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[280px] sm:w-[320px] p-1 text-xs"
        >
          <div className="px-2 py-1.5 font-semibold text-[11px] text-muted-foreground tracking-wider uppercase">
            Ruang Kerja
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {workspaces.map((ws) => {
              const isActive = ws.id === workspace?.id
              return (
                <button
                  key={ws.id}
                  type="button"
                  data-testid={`workspace-switch-item-${ws.id}`}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-2 text-left transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/70"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{ws.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {ws.academicPeriod}
                    </span>
                  </div>
                  {isActive && (
                    <CheckIcon className="size-3.5 shrink-0 text-primary" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              data-testid="open-create-workspace-dialog"
              onClick={handleOpenCreateDialog}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <PlusIcon className="size-3.5" />
              <span>Buat Ruang Kerja</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}
