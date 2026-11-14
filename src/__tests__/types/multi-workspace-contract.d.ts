import type {
  CreateWorkspaceInput,
  DuplicateWorkspaceInput,
  Workspace,
} from "@/domain/types/entities"

declare module "@/store/use-workspace-store" {
  interface WorkspaceStoreState {
    workspaces: Workspace[]
    switchWorkspace: (
      workspaceId: string
    ) => Promise<{ ok: boolean; error?: string }>
    createWorkspace: (
      input: CreateWorkspaceInput
    ) => Promise<{ ok: boolean; error?: string }>
    duplicateWorkspace: (
      input: DuplicateWorkspaceInput
    ) => Promise<{ ok: boolean; error?: string }>
    deleteWorkspace: (
      workspaceId: string
    ) => Promise<{ ok: boolean; error?: string }>
  }
}
