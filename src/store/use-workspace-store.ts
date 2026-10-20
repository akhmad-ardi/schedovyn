import { create } from "zustand"
import * as workspaceRepo from "@/db/workspace-repository"
import type {
  BreakInterval,
  ClassGroup,
  DayOfWeek,
  DayScheduleConfig,
  Room,
  SnapIntervalMinutes,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
  Workspace,
} from "@/domain/types/entities"
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

const LOCAL_SAVE_ERROR_MESSAGE =
  "Gagal menyimpan ke penyimpanan lokal browser. Periksa ruang penyimpanan browser Anda lalu klik Coba Simpan Ulang."

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
    input: TeachingRequirementInput
  ) => Promise<MasterDataMutationOutcome<TeachingRequirement>>
  deleteTeachingRequirement: (requirementId: string) => Promise<boolean>
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
    classes: [],
    subjects: [],
    teachers: [],
    rooms: [],
    requirements: [],
    sessions: [],
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
        const bundle = await workspaceRepo.loadOrSeedWorkspace()
        const configValidation = validateWorkspaceConfig(
          bundle.workspace,
          bundle.dayConfigs
        )

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
          configValidation,
          saveStatus: "saved",
          lastSavedAt: bundle.workspace.updatedAt,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveClassGroup(
          workspace,
          newClassGroup
        )
        set((state) => ({
          workspace: updatedWorkspace,
          classes: [...state.classes, newClassGroup],
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: newClassGroup, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveClassGroup(
          workspace,
          updatedClassGroup
        )
        set((state) => ({
          workspace: updatedWorkspace,
          classes: state.classes.map((cls) =>
            cls.id === classId ? updatedClassGroup : cls
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: updatedClassGroup, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
        return { ok: false }
      }
    },

    deleteClassGroup: async (classId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const { updatedWorkspace, remainingClasses } =
          await workspaceRepo.deleteClassGroupCascade(workspace, classId)
        set((state) => ({
          workspace: updatedWorkspace,
          classes: remainingClasses,
          requirements: state.requirements.filter(
            (req) => req.classId !== classId
          ),
          sessions: state.sessions.filter((ses) => ses.classId !== classId),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return true
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveSubject(
          workspace,
          newSubject
        )
        set((state) => ({
          workspace: updatedWorkspace,
          subjects: [...state.subjects, newSubject],
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: newSubject, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveSubject(
          workspace,
          updatedSubject
        )
        set((state) => ({
          workspace: updatedWorkspace,
          subjects: state.subjects.map((sub) =>
            sub.id === subjectId ? updatedSubject : sub
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: updatedSubject, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
        return { ok: false }
      }
    },

    deleteSubject: async (subjectId, options) => {
      const { workspace } = get()
      if (!workspace) {
        return { ok: false }
      }

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const result = await workspaceRepo.deleteSubjectWithCheck(
          workspace,
          subjectId,
          options
        )

        if (!result.deleted) {
          set({ saveStatus: "saved", saveErrorMessage: null })
          return {
            ok: false,
            requiresConfirmation: result.requiresConfirmation,
            dependentRequirementsCount: result.dependentRequirementsCount,
            dependentSessionsCount: result.dependentSessionsCount,
          }
        }

        const updatedWorkspace = result.updatedWorkspace ?? workspace
        set((state) => ({
          workspace: updatedWorkspace,
          subjects: state.subjects.filter((sub) => sub.id !== subjectId),
          requirements: state.requirements.filter(
            (req) => req.subjectId !== subjectId
          ),
          sessions: state.sessions.filter((ses) => ses.subjectId !== subjectId),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))

        return {
          ok: true,
          requiresConfirmation: false,
          dependentRequirementsCount: result.dependentRequirementsCount,
          dependentSessionsCount: result.dependentSessionsCount,
        }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeacher(
          workspace,
          newTeacher
        )
        set((state) => ({
          workspace: updatedWorkspace,
          teachers: [...state.teachers, newTeacher],
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: newTeacher, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeacher(
          workspace,
          updatedTeacher
        )
        set((state) => ({
          workspace: updatedWorkspace,
          teachers: state.teachers.map((tch) =>
            tch.id === teacherId ? updatedTeacher : tch
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: updatedTeacher, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
        return { ok: false }
      }
    },

    deleteTeacher: async (teacherId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.deleteTeacherAndUnassign(
          workspace,
          teacherId
        )
        set((state) => ({
          workspace: updatedWorkspace,
          teachers: state.teachers.filter((tch) => tch.id !== teacherId),
          requirements: state.requirements.map((req) =>
            req.defaultTeacherId === teacherId
              ? { ...req, defaultTeacherId: null }
              : req
          ),
          sessions: state.sessions.map((ses) =>
            ses.teacherId === teacherId ? { ...ses, teacherId: null } : ses
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return true
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveRoom(
          workspace,
          newRoom
        )
        set((state) => ({
          workspace: updatedWorkspace,
          rooms: [...state.rooms, newRoom],
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: newRoom, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveRoom(
          workspace,
          updatedRoom
        )
        set((state) => ({
          workspace: updatedWorkspace,
          rooms: state.rooms.map((rm) =>
            rm.id === roomId ? updatedRoom : rm
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: updatedRoom, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
        return { ok: false }
      }
    },

    deleteRoom: async (roomId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.deleteRoomAndUnassign(
          workspace,
          roomId
        )
        set((state) => ({
          workspace: updatedWorkspace,
          rooms: state.rooms.filter((rm) => rm.id !== roomId),
          requirements: state.requirements.map((req) =>
            req.defaultRoomId === roomId
              ? { ...req, defaultRoomId: null }
              : req
          ),
          sessions: state.sessions.map((ses) =>
            ses.roomId === roomId ? { ...ses, roomId: null } : ses
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return true
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeachingRequirement(
          workspace,
          newReq
        )
        set((state) => ({
          workspace: updatedWorkspace,
          requirements: [...state.requirements, newReq],
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: newReq, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
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

      const validation = validateTeachingRequirementInput(
        input,
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
        classId: input.classId,
        subjectId: input.subjectId,
        defaultTeacherId: input.defaultTeacherId,
        defaultRoomId: input.defaultRoomId,
        sessionsPerWeek: input.sessionsPerWeek,
        durationMinutes: input.durationMinutes,
        roomRequired: input.roomRequired,
        notes: input.notes?.trim() ? input.notes.trim() : undefined,
      }

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace = await workspaceRepo.saveTeachingRequirement(
          workspace,
          updatedReq
        )
        set((state) => ({
          workspace: updatedWorkspace,
          requirements: state.requirements.map((req) =>
            req.id === requirementId ? updatedReq : req
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return { ok: true, data: updatedReq, validation }
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
        return { ok: false }
      }
    },

    deleteTeachingRequirement: async (requirementId) => {
      const { workspace } = get()
      if (!workspace) {
        return false
      }

      set({ saveStatus: "saving", saveErrorMessage: null })
      try {
        const updatedWorkspace =
          await workspaceRepo.deleteTeachingRequirementCascade(
            workspace,
            requirementId
          )
        set((state) => ({
          workspace: updatedWorkspace,
          requirements: state.requirements.filter(
            (req) => req.id !== requirementId
          ),
          sessions: state.sessions.filter(
            (ses) => ses.requirementId !== requirementId
          ),
          saveStatus: "saved",
          lastSavedAt: updatedWorkspace.updatedAt,
          saveErrorMessage: null,
        }))
        return true
      } catch {
        set({
          saveStatus: "error",
          saveErrorMessage: LOCAL_SAVE_ERROR_MESSAGE,
        })
        return false
      }
    },
  }
})
