import { create } from "zustand"
import * as workspaceRepo from "@/db/workspace-repository"
import type {
  BreakInterval,
  DayOfWeek,
  DayScheduleConfig,
  SnapIntervalMinutes,
  Workspace,
} from "@/domain/types/entities"
import {
  validateWorkspaceConfig,
  type WorkspaceConfigValidationResult,
} from "@/domain/validation/workspace-config-validator"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

const LOCAL_SAVE_ERROR_MESSAGE =
  "Gagal menyimpan ke penyimpanan lokal browser. Periksa ruang penyimpanan browser Anda lalu klik Coba Simpan Ulang."

export interface WorkspaceStoreState {
  isHydrated: boolean
  isHydrating: boolean
  workspace: Workspace | null
  dayConfigs: DayScheduleConfig[]
  configValidation: WorkspaceConfigValidationResult
  saveStatus: SaveStatus
  lastSavedAt: string | null
  saveErrorMessage: string | null

  bootWorkspace: () => Promise<void>
  updateWorkspaceIdentity: (patch: {
    name?: string
    academicPeriod?: string
    defaultSnapIntervalMinutes?: SnapIntervalMinutes
    applySnapIntervalToAllDays?: boolean
  }) => Promise<boolean>
  updateDayConfig: (
    dayOfWeek: DayOfWeek,
    patch: Partial<
      Pick<
        DayScheduleConfig,
        "isSchoolDay" | "startTime" | "endTime" | "snapIntervalMinutes"
      >
    >
  ) => Promise<boolean>
  addBreakInterval: (
    dayOfWeek: DayOfWeek,
    breakData: Omit<BreakInterval, "id">
  ) => Promise<boolean>
  updateBreakInterval: (
    dayOfWeek: DayOfWeek,
    breakId: string,
    patch: Partial<Omit<BreakInterval, "id">>
  ) => Promise<boolean>
  removeBreakInterval: (
    dayOfWeek: DayOfWeek,
    breakId: string
  ) => Promise<boolean>
  retrySaveWorkspaceSettings: () => Promise<boolean>
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => {
  let mutationSequence = 0

  const applyAndPersistConfig = async (
    nextWorkspace: Workspace,
    nextDayConfigs: DayScheduleConfig[]
  ): Promise<boolean> => {
    const currentSequence = ++mutationSequence
    const configValidation = validateWorkspaceConfig(
      nextWorkspace,
      nextDayConfigs
    )

    if (!configValidation.isValid) {
      set({
        workspace: nextWorkspace,
        dayConfigs: nextDayConfigs,
        configValidation,
      })
      return false
    }

    set({
      workspace: nextWorkspace,
      dayConfigs: nextDayConfigs,
      configValidation,
      saveStatus: "saving",
      saveErrorMessage: null,
    })

    try {
      const savedWorkspace = await workspaceRepo.saveWorkspaceAndDayConfigs(
        nextWorkspace,
        nextDayConfigs
      )

      if (currentSequence === mutationSequence) {
        set((state) => ({
          workspace: state.workspace
            ? {
                ...state.workspace,
                updatedAt: savedWorkspace.updatedAt,
              }
            : savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
      }
      return true
    } catch {
      if (currentSequence === mutationSequence) {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
      }
      return false
    }
  }

  return {
    isHydrated: false,
    isHydrating: false,
    workspace: null,
    dayConfigs: [],
    configValidation: { isValid: true, issues: [] },
    saveStatus: "idle",
    lastSavedAt: null,
    saveErrorMessage: null,

    bootWorkspace: async () => {
      if (get().isHydrating) {
        return
      }
      set({ isHydrating: true, saveErrorMessage: null })

      try {
        const { workspace, dayConfigs } =
          await workspaceRepo.loadOrSeedWorkspace()
        const configValidation = validateWorkspaceConfig(workspace, dayConfigs)

        set({
          isHydrated: true,
          isHydrating: false,
          workspace,
          dayConfigs,
          configValidation,
          saveStatus: "saved",
          lastSavedAt: workspace.updatedAt,
          saveErrorMessage: null,
        })
      } catch {
        set({
          isHydrated: true,
          isHydrating: false,
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
      }
    },

    updateWorkspaceIdentity: async (patch) => {
      const { workspace, dayConfigs } = get()
      if (!workspace) {
        return false
      }

      const nextSnap =
        patch.defaultSnapIntervalMinutes ?? workspace.defaultSnapIntervalMinutes
      const nextWorkspace: Workspace = {
        ...workspace,
        name: patch.name !== undefined ? patch.name : workspace.name,
        academicPeriod:
          patch.academicPeriod !== undefined
            ? patch.academicPeriod
            : workspace.academicPeriod,
        defaultSnapIntervalMinutes: nextSnap,
      }

      const nextDayConfigs = patch.applySnapIntervalToAllDays
        ? dayConfigs.map((day) => ({
            ...day,
            snapIntervalMinutes: nextSnap,
          }))
        : dayConfigs

      return applyAndPersistConfig(nextWorkspace, nextDayConfigs)
    },

    updateDayConfig: async (dayOfWeek, patch) => {
      const { workspace, dayConfigs } = get()
      if (!workspace) {
        return false
      }

      const nextDayConfigs = dayConfigs.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              ...patch,
            }
          : day
      )

      return applyAndPersistConfig(workspace, nextDayConfigs)
    },

    addBreakInterval: async (dayOfWeek, breakData) => {
      const { workspace, dayConfigs } = get()
      if (!workspace) {
        return false
      }

      const newBreak: BreakInterval = {
        id: crypto.randomUUID(),
        label: breakData.label,
        startTime: breakData.startTime,
        endTime: breakData.endTime,
      }

      const nextDayConfigs = dayConfigs.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breakIntervals: [...day.breakIntervals, newBreak],
            }
          : day
      )

      return applyAndPersistConfig(workspace, nextDayConfigs)
    },

    updateBreakInterval: async (dayOfWeek, breakId, patch) => {
      const { workspace, dayConfigs } = get()
      if (!workspace) {
        return false
      }

      const nextDayConfigs = dayConfigs.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breakIntervals: day.breakIntervals.map((brk) =>
                brk.id === breakId
                  ? {
                      ...brk,
                      ...patch,
                    }
                  : brk
              ),
            }
          : day
      )

      return applyAndPersistConfig(workspace, nextDayConfigs)
    },

    removeBreakInterval: async (dayOfWeek, breakId) => {
      const { workspace, dayConfigs } = get()
      if (!workspace) {
        return false
      }

      const nextDayConfigs = dayConfigs.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breakIntervals: day.breakIntervals.filter(
                (brk) => brk.id !== breakId
              ),
            }
          : day
      )

      return applyAndPersistConfig(workspace, nextDayConfigs)
    },

    retrySaveWorkspaceSettings: async () => {
      const { workspace, dayConfigs } = get()
      if (!workspace) {
        return false
      }

      return applyAndPersistConfig(workspace, dayConfigs)
    },
  }
})
