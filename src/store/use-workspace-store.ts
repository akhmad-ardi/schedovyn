import {
  cloneClassSchedule,
  type CopyScheduleOptions,
} from "@/domain/timetable/schedule-copier"
import {
  diagnoseStorageError,
  type StorageErrorInfo,
} from "@/domain/storage/storage-diagnostics"
import { create } from "zustand"
import { minutesToTime, timeToMinutes } from "@/domain/time/time-utils"
import * as workspaceRepo from "@/db/workspace-repository"
import {
  type CompletenessWarning,
  type ScheduleConflict,
  type ScopeValidationSummary,
  type WorkspaceValidationReport,
  type ClassValidationMatrixItem,
  VALIDATION_STATUS_LABELS,
} from "@/domain/types/validation"
import { evaluateWorkspaceValidation } from "@/domain/validation/workspace-validator"
import {
  calculateUnscheduledSessions,
  type ClassUnscheduledSummary,
} from "@/domain/timetable/unscheduled-sessions"

import {
  DAY_OF_WEEK_LABELS,
  type BreakInterval,
  type ClassGroup,
  type DayOfWeek,
  type DayScheduleConfig,
  type Room,
  type SnapIntervalMinutes,
  type Subject,
  type Teacher,
  type TeachingRequirement,
  type TimeString,
  type TimetableSession,
  type Workspace,
} from "@/domain/types/entities"
import {
  type ScheduleHistorySnapshot,
  formatScheduleActionLabel,
  performHistoryRedo,
  performHistoryUndo,
  recordHistoryStep,
} from "@/domain/history/schedule-history"
import {
  validateClassGroupInput,
  validateRoomInput,
  validateSubjectInput,
  validateTeacherInput,
  validateTeachingRequirementInput,
  type ClassGroupInput,
  type MasterDataValidationResult,
  type RoomInput,
  type SubjectInput,
  type TeacherInput,
  type TeachingRequirementInput,
} from "@/domain/validation/master-data-validator"
import {
  validateWorkspaceConfig,
  type WorkspaceConfigValidationResult,
} from "@/domain/validation/workspace-config-validator"

export type SaveStatus = "idle" | "saving" | "saved" | "error"
export interface CopyScheduleOutcome {
  ok: boolean
  copiedCount: number
  replacedCount: number
  newConflictsCount: number
  targetClassId: string
  unmatchedSubjectIds: string[]
  error?: string
}



export type { ScheduleHistorySnapshot }

export interface MasterDataMutationOutcome<T = void> {
  ok: boolean
  data?: T
  validation?: MasterDataValidationResult
  requiresConfirmation?: boolean
  dependentRequirementsCount?: number
  dependentSessionsCount?: number
}

export interface WorkspaceStoreState {
  isHydrated: boolean
  isHydrating: boolean
  workspace: Workspace | null
  dayConfigs: DayScheduleConfig[]
  classes: ClassGroup[]
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]
  configValidation: WorkspaceConfigValidationResult
  saveStatus: SaveStatus
  lastSavedAt: string | null
  saveErrorMessage: string | null
  saveErrorInfo: StorageErrorInfo | null
  bootError: StorageErrorInfo | null
  selectedSessionId: string | null
  historyPast: ScheduleHistorySnapshot[]
  historyFuture: ScheduleHistorySnapshot[]
  validationReport: WorkspaceValidationReport | null

  revalidateWorkspace: () => void
  getWorkspaceValidationSummary: () => ScopeValidationSummary | null
  getActiveClassValidationSummary: () => ScopeValidationSummary | null
  getAllClassesValidationSummaries: () => ClassValidationMatrixItem[]
  getSessionConflicts: (sessionId: string) => ScheduleConflict[]
  getSessionWarnings: (sessionId: string) => CompletenessWarning[]
  getActiveClassUnscheduledSummary: () => ClassUnscheduledSummary
  getWorkspaceUnscheduledSummary: () => {
    totalRequiredSessions: number
    totalScheduledSessions: number
    totalRemainingSessions: number
    overallCompletionPercentage: number
    byClassId: Record<string, ClassUnscheduledSummary>
  }

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
  retryPendingStorageSync: () => Promise<boolean>
  retrySaveWorkspaceSettings: () => Promise<boolean>

  // Actions FR-02: Kelas
  createClassGroup: (
    input: ClassGroupInput
  ) => Promise<MasterDataMutationOutcome<ClassGroup>>
  updateClassGroup: (
    classId: string,
    input: ClassGroupInput
  ) => Promise<MasterDataMutationOutcome<ClassGroup>>
  deleteClassGroup: (classId: string) => Promise<boolean>

  // Actions FR-02: Mata Pelajaran
  createSubject: (
    input: SubjectInput
  ) => Promise<MasterDataMutationOutcome<Subject>>
  updateSubject: (
    subjectId: string,
    input: SubjectInput
  ) => Promise<MasterDataMutationOutcome<Subject>>
  deleteSubject: (
    subjectId: string,
    options?: { cascade?: boolean }
  ) => Promise<MasterDataMutationOutcome>

  // Actions FR-02: Guru
  createTeacher: (
    input: TeacherInput
  ) => Promise<MasterDataMutationOutcome<Teacher>>
  updateTeacher: (
    teacherId: string,
    input: TeacherInput
  ) => Promise<MasterDataMutationOutcome<Teacher>>
  deleteTeacher: (teacherId: string) => Promise<boolean>

  // Actions FR-02: Ruangan
  createRoom: (input: RoomInput) => Promise<MasterDataMutationOutcome<Room>>
  updateRoom: (
    roomId: string,
    input: RoomInput
  ) => Promise<MasterDataMutationOutcome<Room>>
  deleteRoom: (roomId: string) => Promise<boolean>

  // Actions FR-02: Kebutuhan Pembelajaran
  createTeachingRequirement: (
    input: TeachingRequirementInput
  ) => Promise<MasterDataMutationOutcome<TeachingRequirement>>
  updateTeachingRequirement: (
    requirementId: string,
    input: Partial<TeachingRequirementInput>
  ) => Promise<MasterDataMutationOutcome<TeachingRequirement>>
  deleteTeachingRequirement: (requirementId: string) => Promise<boolean>

  // Action FR-03: Pemilihan Kelas Aktif
  setActiveClass: (classId: string | null) => Promise<boolean>

  // Actions FR-04: Editor Jadwal & Riwayat
  selectSession: (sessionId: string | null) => void
  placeUnscheduledSession: (params: {
    requirementId: string
    dayOfWeek: DayOfWeek
    startTime: TimeString
  }) => Promise<boolean>
  moveSession: (params: {
    sessionId: string
    dayOfWeek: DayOfWeek
    startTime: TimeString
  }) => Promise<boolean>
  updateSessionDetails: (params: {
    sessionId: string
    patch: Partial<
      Pick<
        TimetableSession,
        | "teacherId"
        | "roomId"
        | "dayOfWeek"
        | "startTime"
        | "durationMinutes"
        | "notes"
      >
    >
  }) => Promise<boolean>
  removeSession: (sessionId: string) => Promise<boolean>
  undo: () => Promise<boolean>
  redo: () => Promise<boolean>
  canUndo: () => boolean
  canRedo: () => boolean
  getUndoActionLabel: () => string | null
  getRedoActionLabel: () => string | null
  copyClassSchedule: (
    options: CopyScheduleOptions
  ) => Promise<CopyScheduleOutcome>
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => {
  let mutationSequence = 0

  const runValidation = (
    overrideState?: Partial<{
      dayConfigs: DayScheduleConfig[]
      classes: ClassGroup[]
      teachers: Teacher[]
      rooms: Room[]
      subjects: Subject[]
      requirements: TeachingRequirement[]
      sessions: TimetableSession[]
      workspace: Workspace | null
    }>
  ): WorkspaceValidationReport => {
    const currentState = get()
    const dayConfigs = overrideState?.dayConfigs ?? currentState.dayConfigs
    const classes = overrideState?.classes ?? currentState.classes
    const teachers = overrideState?.teachers ?? currentState.teachers
    const rooms = overrideState?.rooms ?? currentState.rooms
    const subjects = overrideState?.subjects ?? currentState.subjects
    const requirements = overrideState?.requirements ?? currentState.requirements
    const sessions = overrideState?.sessions ?? currentState.sessions
    const workspace = overrideState?.workspace !== undefined ? overrideState.workspace : currentState.workspace

    return evaluateWorkspaceValidation({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      requirements,
      sessions,
      activeClassId: workspace?.activeClassId ?? null,
    })
  }


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
          saveErrorInfo: null,
    bootError: null,
    })

    try {
      const savedWorkspace = await workspaceRepo.saveWorkspaceAndDayConfigs(
        nextWorkspace,
        nextDayConfigs
      )

      if (currentSequence === mutationSequence) {
        set((state) => {
          const ws = state.workspace
            ? {
                ...state.workspace,
                updatedAt: savedWorkspace.updatedAt,
              }
            : savedWorkspace
          return {
            workspace: ws,
            validationReport: runValidation({ workspace: ws, dayConfigs: nextDayConfigs }),
            saveStatus: "saved",
            lastSavedAt: savedWorkspace.updatedAt,
            saveErrorMessage: null,
            saveErrorInfo: null,
          }
        })
      }
      return true
    } catch (error) {
      if (currentSequence === mutationSequence) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
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
    classes: [],
    subjects: [],
    teachers: [],
    rooms: [],
    requirements: [],
    sessions: [],
    selectedSessionId: null,
    historyPast: [],
    historyFuture: [],
    validationReport: null,
    configValidation: { isValid: true, issues: [] },
    saveStatus: "idle",
    lastSavedAt: null,
    saveErrorMessage: null,
    saveErrorInfo: null,
    bootError: null,

    bootWorkspace: async () => {
      if (get().isHydrating) {
        return
      }
      set({ isHydrating: true, saveErrorMessage: null,
          saveErrorInfo: null, bootError: null })

      try {
        const bundle = await workspaceRepo.loadOrSeedWorkspace()
        const configValidation = validateWorkspaceConfig(
          bundle.workspace,
          bundle.dayConfigs
        )

        const validationReport = evaluateWorkspaceValidation({
          dayConfigs: bundle.dayConfigs,
          classes: bundle.classes ?? [],
          teachers: bundle.teachers ?? [],
          rooms: bundle.rooms ?? [],
          subjects: bundle.subjects ?? [],
          requirements: bundle.requirements ?? [],
          sessions: bundle.sessions ?? [],
          activeClassId: bundle.workspace.activeClassId ?? null,
        })

        set({
          isHydrated: true,
          isHydrating: false,
          workspace: bundle.workspace,
          dayConfigs: bundle.dayConfigs,
          classes: bundle.classes ?? [],
          subjects: bundle.subjects ?? [],
          teachers: bundle.teachers ?? [],
          rooms: bundle.rooms ?? [],
          requirements: bundle.requirements ?? [],
          sessions: bundle.sessions ?? [],
          validationReport,
          configValidation,
          saveStatus: "saved",
          lastSavedAt: bundle.workspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
          bootError: null,
        })
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          isHydrated: true,
          isHydrating: false,
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
          bootError: errorInfo,
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

    retryPendingStorageSync: async () => {
      const state = get()
      if (!state.workspace) {
        return false
      }

      const currentSequence = ++mutationSequence
      set({
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const updatedWorkspace =
          await workspaceRepo.persistFullWorkspaceSnapshot({
            workspace: state.workspace,
            dayConfigs: state.dayConfigs,
            classes: state.classes,
            subjects: state.subjects,
            teachers: state.teachers,
            rooms: state.rooms,
            requirements: state.requirements,
            sessions: state.sessions,
          })

        if (currentSequence === mutationSequence) {
          set({
            workspace: updatedWorkspace,
            saveStatus: "saved",
            lastSavedAt: updatedWorkspace.updatedAt,
            saveErrorMessage: null,
          saveErrorInfo: null,
          })
        }
        return true
      } catch (error) {
        if (currentSequence === mutationSequence) {
          const errorInfo = diagnoseStorageError(error)
          set({
            saveStatus: "error",
            saveErrorMessage: errorInfo.message,
            saveErrorInfo: errorInfo,
          })
        }
        return false
      }
    },

    retrySaveWorkspaceSettings: async () => {
      return get().retryPendingStorageSync()
    },

    createClassGroup: async (input) => {
      const { workspace, classes } = get()
      if (!workspace) {
        return { ok: false }
      }

      const validation = validateClassGroupInput(input, classes)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const newClassGroup: ClassGroup = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        name: input.name.trim(),
        grade: input.grade.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveClassGroup(
          workspace,
          newClassGroup
        )
        const nextClasses = [...get().classes, newClassGroup]
        set({
          workspace: updatedWorkspace,
          classes: nextClasses,
          validationReport: runValidation({ classes: nextClasses }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: newClassGroup, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    updateClassGroup: async (classId, input) => {
      const { workspace, classes } = get()
      if (!workspace) {
        return { ok: false }
      }

      const existing = classes.find((cls) => cls.id === classId)
      if (!existing) {
        return { ok: false }
      }

      const validation = validateClassGroupInput(input, classes, classId)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const updatedClassGroup: ClassGroup = {
        ...existing,
        name: input.name.trim(),
        grade: input.grade.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveClassGroup(
          workspace,
          updatedClassGroup
        )
        const nextClasses = get().classes.map((cls) =>
          cls.id === classId ? updatedClassGroup : cls
        )
        set({
          workspace: updatedWorkspace,
          classes: nextClasses,
          validationReport: runValidation({ classes: nextClasses }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: updatedClassGroup, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    deleteClassGroup: async (classId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const { updatedWorkspace, remainingClasses } =
          await workspaceRepo.deleteClassGroupCascade(workspace, classId)
        const nextReqs = get().requirements.filter((req) => req.classId !== classId)
        const nextSessions = get().sessions.filter((ses) => ses.classId !== classId)
        set({
          workspace: updatedWorkspace,
          classes: remainingClasses,
          requirements: nextReqs,
          sessions: nextSessions,
          validationReport: runValidation({
            classes: remainingClasses,
            requirements: nextReqs,
            sessions: nextSessions,
          }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    createSubject: async (input) => {
      const { workspace, subjects } = get()
      if (!workspace) {
        return { ok: false }
      }

      const validation = validateSubjectInput(input, subjects)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const newSubject: Subject = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        name: input.name.trim(),
        colorKey: input.colorKey,
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveSubject(
          workspace,
          newSubject
        )
        const nextSubjects = [...get().subjects, newSubject]
        set({
          workspace: updatedWorkspace,
          subjects: nextSubjects,
          validationReport: runValidation({ subjects: nextSubjects }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: newSubject, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    updateSubject: async (subjectId, input) => {
      const { workspace, subjects } = get()
      if (!workspace) {
        return { ok: false }
      }

      const existing = subjects.find((sub) => sub.id === subjectId)
      if (!existing) {
        return { ok: false }
      }

      const validation = validateSubjectInput(input, subjects, subjectId)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const updatedSubject: Subject = {
        ...existing,
        name: input.name.trim(),
        colorKey: input.colorKey,
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveSubject(
          workspace,
          updatedSubject
        )
        const nextSubjects = get().subjects.map((sub) =>
          sub.id === subjectId ? updatedSubject : sub
        )
        set({
          workspace: updatedWorkspace,
          subjects: nextSubjects,
          validationReport: runValidation({ subjects: nextSubjects }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: updatedSubject, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    deleteSubject: async (subjectId, options) => {
      const { workspace } = get()
      if (!workspace) {
        return { ok: false }
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const result = await workspaceRepo.deleteSubjectWithCheck(
          workspace,
          subjectId,
          options
        )

        if (!result.deleted) {
          set({ saveStatus: "saved", saveErrorMessage: null, saveErrorInfo: null })
          return {
            ok: false,
            requiresConfirmation: result.requiresConfirmation,
            dependentRequirementsCount: result.dependentRequirementsCount,
            dependentSessionsCount: result.dependentSessionsCount,
          }
        }

        const updatedWorkspace = result.updatedWorkspace ?? workspace
        const nextSubjects = get().subjects.filter((sub) => sub.id !== subjectId)
        const nextReqs = get().requirements.filter((req) => req.subjectId !== subjectId)
        const nextSessions = get().sessions.filter((ses) => ses.subjectId !== subjectId)
        set({
          workspace: updatedWorkspace,
          subjects: nextSubjects,
          requirements: nextReqs,
          sessions: nextSessions,
          validationReport: runValidation({
            subjects: nextSubjects,
            requirements: nextReqs,
            sessions: nextSessions,
          }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })

        return {
          ok: true,
          requiresConfirmation: false,
          dependentRequirementsCount: result.dependentRequirementsCount,
          dependentSessionsCount: result.dependentSessionsCount,
        }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    createTeacher: async (input) => {
      const { workspace, teachers } = get()
      if (!workspace) {
        return { ok: false }
      }

      const validation = validateTeacherInput(input, teachers)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const newTeacher: Teacher = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        name: input.name.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
        unavailableIntervals: input.unavailableIntervals ?? [],
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })

      try {
        const updatedWorkspace = await workspaceRepo.saveTeacher(
          workspace,
          newTeacher
        )
        const nextTeachers = [...get().teachers, newTeacher]
        set({
          workspace: updatedWorkspace,
          teachers: nextTeachers,
          validationReport: runValidation({ teachers: nextTeachers }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: newTeacher, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    updateTeacher: async (teacherId, input) => {
      const { workspace, teachers } = get()
      if (!workspace) {
        return { ok: false }
      }

      const existing = teachers.find((tch) => tch.id === teacherId)
      if (!existing) {
        return { ok: false }
      }

      const validation = validateTeacherInput(input, teachers, teacherId)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const updatedTeacher: Teacher = {
        ...existing,
        name: input.name.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
        unavailableIntervals:
          input.unavailableIntervals ?? existing.unavailableIntervals,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeacher(
          workspace,
          updatedTeacher
        )
        const nextTeachers = get().teachers.map((tch) =>
          tch.id === teacherId ? updatedTeacher : tch
        )
        set({
          workspace: updatedWorkspace,
          teachers: nextTeachers,
          validationReport: runValidation({ teachers: nextTeachers }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: updatedTeacher, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    deleteTeacher: async (teacherId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.deleteTeacherAndUnassign(
          workspace,
          teacherId
        )
        const nextTeachers = get().teachers.filter((tch) => tch.id !== teacherId)
        const nextReqs = get().requirements.map((req) =>
          req.defaultTeacherId === teacherId ? { ...req, defaultTeacherId: null } : req
        )
        const nextSessions = get().sessions.map((ses) =>
          ses.teacherId === teacherId ? { ...ses, teacherId: null } : ses
        )
        set({
          workspace: updatedWorkspace,
          teachers: nextTeachers,
          requirements: nextReqs,
          sessions: nextSessions,
          validationReport: runValidation({
            teachers: nextTeachers,
            requirements: nextReqs,
            sessions: nextSessions,
          }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    createRoom: async (input) => {
      const { workspace, rooms } = get()
      if (!workspace) {
        return { ok: false }
      }

      const validation = validateRoomInput(input, rooms)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const newRoom: Room = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        name: input.name.trim(),
        type: input.type,
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
        unavailableIntervals: input.unavailableIntervals ?? [],
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveRoom(
          workspace,
          newRoom
        )
        const nextRooms = [...get().rooms, newRoom]
        set({
          workspace: updatedWorkspace,
          rooms: nextRooms,
          validationReport: runValidation({ rooms: nextRooms }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: newRoom, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    updateRoom: async (roomId, input) => {
      const { workspace, rooms } = get()
      if (!workspace) {
        return { ok: false }
      }

      const existing = rooms.find((rm) => rm.id === roomId)
      if (!existing) {
        return { ok: false }
      }

      const validation = validateRoomInput(input, rooms, roomId)
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const updatedRoom: Room = {
        ...existing,
        name: input.name.trim(),
        type: input.type,
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
        unavailableIntervals:
          input.unavailableIntervals ?? existing.unavailableIntervals,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveRoom(
          workspace,
          updatedRoom
        )
        const nextRooms = get().rooms.map((rm) =>
          rm.id === roomId ? updatedRoom : rm
        )
        set({
          workspace: updatedWorkspace,
          rooms: nextRooms,
          validationReport: runValidation({ rooms: nextRooms }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: updatedRoom, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    deleteRoom: async (roomId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.deleteRoomAndUnassign(
          workspace,
          roomId
        )
        const nextRooms = get().rooms.filter((rm) => rm.id !== roomId)
        const nextReqs = get().requirements.map((req) =>
          req.defaultRoomId === roomId ? { ...req, defaultRoomId: null } : req
        )
        const nextSessions = get().sessions.map((ses) =>
          ses.roomId === roomId ? { ...ses, roomId: null } : ses
        )
        set({
          workspace: updatedWorkspace,
          rooms: nextRooms,
          requirements: nextReqs,
          sessions: nextSessions,
          validationReport: runValidation({
            rooms: nextRooms,
            requirements: nextReqs,
            sessions: nextSessions,
          }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    createTeachingRequirement: async (input) => {
      const { workspace, classes, subjects, teachers, rooms, requirements } =
        get()
      if (!workspace) {
        return { ok: false }
      }

      const validation = validateTeachingRequirementInput(input, {
        classes,
        subjects,
        teachers,
        rooms,
        existingRequirements: requirements,
      })
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const newReq: TeachingRequirement = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        classId: input.classId,
        subjectId: input.subjectId,
        defaultTeacherId: input.defaultTeacherId,
        defaultRoomId: input.defaultRoomId,
        sessionsPerWeek: input.sessionsPerWeek,
        durationMinutes: input.durationMinutes,
        roomRequired: input.roomRequired,
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeachingRequirement(
          workspace,
          newReq
        )
        const nextReqs = [...get().requirements, newReq]
        set({
          workspace: updatedWorkspace,
          requirements: nextReqs,
          validationReport: runValidation({ requirements: nextReqs }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: newReq, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    updateTeachingRequirement: async (requirementId, input) => {
      const { workspace, classes, subjects, teachers, rooms, requirements } =
        get()
      if (!workspace) {
        return { ok: false }
      }

      const existing = requirements.find((req) => req.id === requirementId)
      if (!existing) {
        return { ok: false }
      }

      const mergedInput: TeachingRequirementInput = {
        classId: input.classId ?? existing.classId,
        subjectId: input.subjectId ?? existing.subjectId,
        defaultTeacherId:
          input.defaultTeacherId !== undefined
            ? input.defaultTeacherId
            : existing.defaultTeacherId,
        defaultRoomId:
          input.defaultRoomId !== undefined
            ? input.defaultRoomId
            : existing.defaultRoomId,
        sessionsPerWeek:
          input.sessionsPerWeek !== undefined
            ? input.sessionsPerWeek
            : existing.sessionsPerWeek,
        durationMinutes:
          input.durationMinutes !== undefined
            ? input.durationMinutes
            : existing.durationMinutes,
        roomRequired:
          input.roomRequired !== undefined
            ? input.roomRequired
            : existing.roomRequired,
        notes: input.notes !== undefined ? input.notes : existing.notes,
      }

      const validation = validateTeachingRequirementInput(
        mergedInput,
        {
          classes,
          subjects,
          teachers,
          rooms,
          existingRequirements: requirements,
        },
        requirementId
      )
      if (!validation.isValid) {
        return { ok: false, validation }
      }

      const updatedReq: TeachingRequirement = {
        ...existing,
        ...mergedInput,
        notes: mergedInput.notes?.trim() ? mergedInput.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeachingRequirement(
          workspace,
          updatedReq
        )
        const nextReqs = get().requirements.map((req) =>
          req.id === requirementId ? updatedReq : req
        )
        set({
          workspace: updatedWorkspace,
          requirements: nextReqs,
          validationReport: runValidation({ requirements: nextReqs }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return { ok: true, data: updatedReq, validation }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return { ok: false }
      }
    },

    deleteTeachingRequirement: async (requirementId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null, saveErrorInfo: null })
      try {
        const updatedWorkspace =
          await workspaceRepo.deleteTeachingRequirementCascade(
            workspace,
            requirementId
          )
        const nextReqs = get().requirements.filter((req) => req.id !== requirementId)
        const nextSessions = get().sessions.filter((ses) => ses.requirementId !== requirementId)
        set({
          workspace: updatedWorkspace,
          requirements: nextReqs,
          sessions: nextSessions,
          validationReport: runValidation({
            requirements: nextReqs,
            sessions: nextSessions,
          }),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    setActiveClass: async (classId: string | null) => {
      const { workspace, classes } = get()
      if (!workspace) {
        return false
      }

      if (classId !== null && !classes.some((cls) => cls.id === classId)) {
        return false
      }

      if (workspace.activeClassId === classId && get().saveStatus !== "error") {
        return true
      }

      const nextWorkspace: Workspace = {
        ...workspace,
        activeClassId: classId,
      }

      set({
        workspace: nextWorkspace,
        validationReport: runValidation({ workspace: nextWorkspace }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.setActiveClassInWorkspace(
          nextWorkspace,
          classId
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        console.error("Gagal menyimpan pilihan kelas aktif lokal:", error)
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    selectSession: (sessionId) => {
      set({ selectedSessionId: sessionId })
    },

    placeUnscheduledSession: async ({ requirementId, dayOfWeek, startTime }) => {
      const { workspace, requirements, subjects, sessions, historyPast, historyFuture } = get()
      if (!workspace) return false
      const req = requirements.find((r) => r.id === requirementId)
      if (!req) return false

      const startM = timeToMinutes(startTime)
      const endM = startM + req.durationMinutes
      const endTime = minutesToTime(endM)

      const subject = subjects.find((s) => s.id === req.subjectId)
      const dayLabel = DAY_OF_WEEK_LABELS[dayOfWeek]
      const timeRange = `${startTime} - ${endTime}`
      const actionLabel = formatScheduleActionLabel({
        type: "place",
        subjectName: subject?.name,
        dayLabel,
        timeRange,
      })

      const newSession: TimetableSession = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        requirementId: req.id,
        classId: req.classId,
        subjectId: req.subjectId,
        teacherId: req.defaultTeacherId,
        roomId: req.defaultRoomId,
        dayOfWeek,
        startTime,
        endTime,
        durationMinutes: req.durationMinutes,
      }

      const nextHistory = recordHistoryStep(
        { past: historyPast, future: historyFuture },
        sessions,
        actionLabel
      )

      const nextSessions = [...sessions, newSession]
      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: nextSessions,
        selectedSessionId: newSession.id,
        validationReport: runValidation({ sessions: nextSessions }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.saveTimetableSession(
          workspace,
          newSession
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    moveSession: async ({ sessionId, dayOfWeek, startTime }) => {
      const { workspace, subjects, sessions, historyPast, historyFuture } = get()
      if (!workspace) return false
      const existing = sessions.find((s) => s.id === sessionId)
      if (!existing) return false

      const startM = timeToMinutes(startTime)
      const endM = startM + existing.durationMinutes
      const endTime = minutesToTime(endM)

      const subject = subjects.find((s) => s.id === existing.subjectId)
      const dayLabel = DAY_OF_WEEK_LABELS[dayOfWeek]
      const timeRange = `${startTime} - ${endTime}`
      const actionLabel = formatScheduleActionLabel({
        type: "move",
        subjectName: subject?.name,
        dayLabel,
        timeRange,
      })

      const updatedSession: TimetableSession = {
        ...existing,
        dayOfWeek,
        startTime,
        endTime,
      }

      const nextHistory = recordHistoryStep(
        { past: historyPast, future: historyFuture },
        sessions,
        actionLabel
      )

      const nextSessions = sessions.map((s) =>
        s.id === sessionId ? updatedSession : s
      )
      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: nextSessions,
        validationReport: runValidation({ sessions: nextSessions }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.saveTimetableSession(
          workspace,
          updatedSession
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    updateSessionDetails: async ({ sessionId, patch }) => {
      const { workspace, subjects, teachers, rooms, sessions, historyPast, historyFuture } = get()
      if (!workspace) return false
      const existing = sessions.find((s) => s.id === sessionId)
      if (!existing) return false

      const startTime = patch.startTime ?? existing.startTime
      const durationMinutes = patch.durationMinutes ?? existing.durationMinutes
      const startM = timeToMinutes(startTime)
      const endTime = minutesToTime(startM + durationMinutes)

      const subject = subjects.find((s) => s.id === existing.subjectId)
      const isTimeChanged =
        (patch.startTime !== undefined && patch.startTime !== existing.startTime) ||
        (patch.durationMinutes !== undefined && patch.durationMinutes !== existing.durationMinutes) ||
        (patch.dayOfWeek !== undefined && patch.dayOfWeek !== existing.dayOfWeek)

      let actionLabel: string
      if (isTimeChanged) {
        const dayOfWeek = patch.dayOfWeek ?? existing.dayOfWeek
        const dayLabel = DAY_OF_WEEK_LABELS[dayOfWeek]
        const timeRange = `${startTime} - ${endTime}`
        actionLabel = formatScheduleActionLabel({
          type: "update_time",
          subjectName: subject?.name,
          dayLabel,
          timeRange,
        })
      } else {
        let extraDetail: string | undefined
        if (patch.teacherId !== undefined && patch.teacherId !== existing.teacherId) {
          const teacher = teachers.find((t) => t.id === patch.teacherId)
          extraDetail = teacher?.name
        } else if (patch.roomId !== undefined && patch.roomId !== existing.roomId) {
          const room = rooms.find((r) => r.id === patch.roomId)
          extraDetail = room?.name
        }
        actionLabel = formatScheduleActionLabel({
          type: "update_details",
          subjectName: subject?.name,
          extraDetail,
        })
      }

      const updatedSession: TimetableSession = {
        ...existing,
        ...patch,
        startTime,
        durationMinutes,
        endTime,
      }

      const nextHistory = recordHistoryStep(
        { past: historyPast, future: historyFuture },
        sessions,
        actionLabel
      )

      const nextSessions = sessions.map((s) =>
        s.id === sessionId ? updatedSession : s
      )
      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: nextSessions,
        validationReport: runValidation({ sessions: nextSessions }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.saveTimetableSession(
          workspace,
          updatedSession
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    removeSession: async (sessionId) => {
      const { workspace, subjects, sessions, historyPast, historyFuture, selectedSessionId } = get()
      if (!workspace) return false
      const existing = sessions.find((s) => s.id === sessionId)
      if (!existing) return false

      const subject = subjects.find((s) => s.id === existing.subjectId)
      const actionLabel = formatScheduleActionLabel({
        type: "remove",
        subjectName: subject?.name,
      })

      const nextHistory = recordHistoryStep(
        { past: historyPast, future: historyFuture },
        sessions,
        actionLabel
      )

      const nextSessions = sessions.filter((s) => s.id !== sessionId)
      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: nextSessions,
        selectedSessionId:
          selectedSessionId === sessionId ? null : selectedSessionId,
        validationReport: runValidation({ sessions: nextSessions }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.deleteTimetableSession(
          workspace,
          sessionId
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    revalidateWorkspace: () => {
      set({ validationReport: runValidation() })
    },

    getWorkspaceValidationSummary: () => {
      const { validationReport } = get()
      return validationReport?.workspaceSummary ?? null
    },

    getActiveClassValidationSummary: () => {
      const { validationReport, workspace } = get()
      if (!validationReport || !workspace?.activeClassId) return null
      return validationReport.byClassId[workspace.activeClassId] ?? null
    },

    getAllClassesValidationSummaries: () => {
      const { validationReport, classes } = get()
      if (!validationReport) return []
      return classes.map((classGroup) => ({
        classGroup,
        summary: validationReport.byClassId[classGroup.id] ?? {
          status: "INCOMPLETE",
          statusLabel: VALIDATION_STATUS_LABELS.INCOMPLETE,
          scheduledSessionsCount: 0,
          unscheduledSessionsCount: 0,
          activeConflictsCount: 0,
          completenessWarningsCount: 0,
          conflicts: [],
          warnings: [],
        },
      }))
    },

    getSessionConflicts: (sessionId: string) => {
      const { validationReport } = get()
      if (!validationReport) return []
      return validationReport.conflictsBySessionId[sessionId] ?? []
    },

    getSessionWarnings: (sessionId: string) => {
      const { validationReport } = get()
      if (!validationReport) return []
      return validationReport.warningsBySessionId[sessionId] ?? []
    },

    getActiveClassUnscheduledSummary: () => {
      const { requirements, sessions, workspace } = get()
      const activeClassId = workspace?.activeClassId ?? ""
      return calculateUnscheduledSessions(requirements, sessions, activeClassId)
    },

    getWorkspaceUnscheduledSummary: () => {
      const { classes, requirements, sessions } = get()
      const byClassId: Record<string, ClassUnscheduledSummary> = {}
      let totalRequiredSessions = 0
      let totalScheduledSessions = 0
      let totalRemainingSessions = 0

      for (const cls of classes) {
        const summary = calculateUnscheduledSessions(
          requirements,
          sessions,
          cls.id
        )
        byClassId[cls.id] = summary
        totalRequiredSessions += summary.totalRequiredSessions
        totalScheduledSessions += summary.totalScheduledSessions
        totalRemainingSessions += summary.totalRemainingSessions
      }

      const overallCompletionPercentage =
        totalRequiredSessions > 0
          ? Math.min(
              100,
              Math.round((totalScheduledSessions / totalRequiredSessions) * 100)
            )
          : 100

      return {
        totalRequiredSessions,
        totalScheduledSessions,
        totalRemainingSessions,
        overallCompletionPercentage,
        byClassId,
      }
    },

    canUndo: () => get().historyPast.length > 0,
    canRedo: () => get().historyFuture.length > 0,

    getUndoActionLabel: () => {
      const { historyPast } = get()
      return historyPast.length > 0
        ? historyPast[historyPast.length - 1].actionLabel
        : null
    },

    getRedoActionLabel: () => {
      const { historyFuture } = get()
      return historyFuture.length > 0 ? historyFuture[0].actionLabel : null
    },

    undo: async () => {
      const { historyPast, historyFuture, sessions, workspace, selectedSessionId } = get()
      if (historyPast.length === 0 || !workspace) return false

      const undoResult = performHistoryUndo(
        { past: historyPast, future: historyFuture },
        sessions
      )
      if (!undoResult) return false

      const { nextHistory, restoredSessions } = undoResult
      const nextSelectedSessionId = restoredSessions.some(
        (s) => s.id === selectedSessionId
      )
        ? selectedSessionId
        : null

      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: restoredSessions,
        selectedSessionId: nextSelectedSessionId,
        validationReport: runValidation({ sessions: restoredSessions }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.batchSaveTimetableSessions(
          workspace,
          restoredSessions
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    redo: async () => {
      const { historyPast, historyFuture, sessions, workspace, selectedSessionId } = get()
      if (historyFuture.length === 0 || !workspace) return false

      const redoResult = performHistoryRedo(
        { past: historyPast, future: historyFuture },
        sessions
      )
      if (!redoResult) return false

      const { nextHistory, restoredSessions } = redoResult
      const nextSelectedSessionId = restoredSessions.some(
        (s) => s.id === selectedSessionId
      )
        ? selectedSessionId
        : null

      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: restoredSessions,
        selectedSessionId: nextSelectedSessionId,
        validationReport: runValidation({ sessions: restoredSessions }),
        saveStatus: "saving",
        saveErrorMessage: null,
          saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.batchSaveTimetableSessions(
          workspace,
          restoredSessions
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })
        return true
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return false
      }
    },

    copyClassSchedule: async (options) => {
      const {
        workspace,
        classes,
        requirements,
        sessions,
        historyPast,
        historyFuture,
      } = get()

      if (!workspace) {
        return {
          ok: false,
          copiedCount: 0,
          replacedCount: 0,
          newConflictsCount: 0,
          targetClassId: options.targetClassId,
          unmatchedSubjectIds: [],
          error: "Ruang kerja belum siap.",
        }
      }

      const sourceClass = classes.find((c) => c.id === options.sourceClassId)
      const targetClass = classes.find((c) => c.id === options.targetClassId)

      if (!sourceClass || !targetClass) {
        return {
          ok: false,
          copiedCount: 0,
          replacedCount: 0,
          newConflictsCount: 0,
          targetClassId: options.targetClassId,
          unmatchedSubjectIds: [],
          error: "Kelas sumber atau kelas tujuan tidak ditemukan.",
        }
      }

      const cloneResult = cloneClassSchedule({
        sourceSessions: sessions,
        targetRequirements: requirements,
        options,
      })

      if (!cloneResult.ok) {
        return {
          ok: false,
          copiedCount: 0,
          replacedCount: 0,
          newConflictsCount: 0,
          targetClassId: options.targetClassId,
          unmatchedSubjectIds: cloneResult.unmatchedSubjectIds,
          error: cloneResult.error,
        }
      }

      let nextSessions: TimetableSession[]
      let replacedCount: number

      if (options.conflictResolution === "replace") {
        const oldTargetSessions = sessions.filter(
          (s) => s.classId === options.targetClassId
        )
        replacedCount = oldTargetSessions.length
        nextSessions = [
          ...sessions.filter((s) => s.classId !== options.targetClassId),
          ...cloneResult.copiedSessions,
        ]
      } else {
        replacedCount = 0
        nextSessions = [...sessions, ...cloneResult.copiedSessions]
      }

      const actionLabel = formatScheduleActionLabel({
        type: "copy_class",
        sourceClassName: sourceClass.name,
        targetClassName: targetClass.name,
      })

      const nextHistory = recordHistoryStep(
        { past: historyPast, future: historyFuture },
        sessions,
        actionLabel
      )

      const newValidationReport = runValidation({ sessions: nextSessions })
      const targetSummary = newValidationReport.byClassId[options.targetClassId]
      const newConflictsCount = targetSummary?.activeConflictsCount ?? 0

      set({
        historyPast: nextHistory.past,
        historyFuture: nextHistory.future,
        sessions: nextSessions,
        validationReport: newValidationReport,
        saveStatus: "saving",
        saveErrorMessage: null,
        saveErrorInfo: null,
      })

      try {
        const savedWorkspace = await workspaceRepo.batchSaveTimetableSessions(
          workspace,
          nextSessions
        )
        set({
          workspace: savedWorkspace,
          saveStatus: "saved",
          lastSavedAt: savedWorkspace.updatedAt,
          saveErrorMessage: null,
          saveErrorInfo: null,
        })

        return {
          ok: true,
          copiedCount: cloneResult.copiedSessions.length,
          replacedCount,
          newConflictsCount,
          targetClassId: options.targetClassId,
          unmatchedSubjectIds: cloneResult.unmatchedSubjectIds,
        }
      } catch (error) {
        const errorInfo = diagnoseStorageError(error)
        set({
          saveStatus: "error",
          saveErrorMessage: errorInfo.message,
          saveErrorInfo: errorInfo,
        })
        return {
          ok: false,
          copiedCount: cloneResult.copiedSessions.length,
          replacedCount,
          newConflictsCount,
          targetClassId: options.targetClassId,
          unmatchedSubjectIds: cloneResult.unmatchedSubjectIds,
          error: errorInfo.message,
        }
      }
    },
  }
})
