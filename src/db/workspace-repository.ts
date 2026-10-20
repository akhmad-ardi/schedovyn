import { db as defaultDb, type SchedovynDatabase } from "@/db/database"
import { createDefaultWorkspaceSeed } from "@/db/seed-default"
import {
  ORDERED_DAYS_OF_WEEK,
  type ClassGroup,
  type DayScheduleConfig,
  type Room,
  type Subject,
  type Teacher,
  type TeachingRequirement,
  type TimetableSession,
  type Workspace,
} from "@/domain/types/entities"

export interface HydratedWorkspaceBundle {
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
  classes: ClassGroup[]
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]
}

export interface DeleteSubjectResult {
  deleted: boolean
  requiresConfirmation: boolean
  dependentRequirementsCount: number
  dependentSessionsCount: number
  updatedWorkspace?: Workspace
}

function sortDayConfigs(dayConfigs: DayScheduleConfig[]): DayScheduleConfig[] {
  return [...dayConfigs].sort(
    (a, b) =>
      ORDERED_DAYS_OF_WEEK.indexOf(a.dayOfWeek) -
      ORDERED_DAYS_OF_WEEK.indexOf(b.dayOfWeek)
  )
}

export async function loadOrSeedWorkspace(
  database: SchedovynDatabase = defaultDb
): Promise<HydratedWorkspaceBundle> {
  return database.transaction(
    "rw",
    [
      database.workspaces,
      database.dayConfigs,
      database.classes,
      database.subjects,
      database.teachers,
      database.rooms,
      database.requirements,
      database.sessions,
    ],
    async () => {
      const existingWorkspaces = await database.workspaces.toArray()
      if (existingWorkspaces.length > 0) {
        const workspace = existingWorkspaces[0]
        const [
          rawDays,
          classes,
          subjects,
          teachers,
          rooms,
          requirements,
          sessions,
        ] = await Promise.all([
          database.dayConfigs
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
          database.classes
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
          database.subjects
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
          database.teachers
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
          database.rooms
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
          database.requirements
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
          database.sessions
            .where("workspaceId")
            .equals(workspace.id)
            .toArray(),
        ])

        let resolvedWorkspace = workspace
        const resolvedActiveClassId =
          workspace.activeClassId !== null &&
          classes.some((c) => c.id === workspace.activeClassId)
            ? workspace.activeClassId
            : (classes[0]?.id ?? null)

        if (resolvedActiveClassId !== workspace.activeClassId) {
          resolvedWorkspace = {
            ...workspace,
            activeClassId: resolvedActiveClassId,
            updatedAt: new Date().toISOString(),
          }
          await database.workspaces.put(resolvedWorkspace)
        }

        return {
          workspace: resolvedWorkspace,
          dayConfigs: sortDayConfigs(rawDays),
          classes,
          subjects,
          teachers,
          rooms,
          requirements,
          sessions,
        }
      }

      const seeded = createDefaultWorkspaceSeed()
      await database.workspaces.put(seeded.workspace)
      await database.dayConfigs.bulkPut(seeded.dayConfigs)

      return {
        workspace: seeded.workspace,
        dayConfigs: sortDayConfigs(seeded.dayConfigs),
        classes: [],
        subjects: [],
        teachers: [],
        rooms: [],
        requirements: [],
        sessions: [],
      }
    }
  )
}

export async function saveWorkspaceAndDayConfigs(
  workspace: Workspace,
  dayConfigs: DayScheduleConfig[],
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.dayConfigs,
    async () => {
      await database.workspaces.put(updatedWorkspace)
      await database.dayConfigs.bulkPut(dayConfigs)
    }
  )

  return updatedWorkspace
}

export async function setActiveClassInWorkspace(
  workspace: Workspace,
  activeClassId: string | null,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    activeClassId,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction("rw", database.workspaces, async () => {
    await database.workspaces.put(updatedWorkspace)
  })

  return updatedWorkspace
}

export async function saveClassGroup(
  workspace: Workspace,
  classGroup: ClassGroup,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    activeClassId:
      workspace.activeClassId === null
        ? classGroup.id
        : workspace.activeClassId,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.classes,
    async () => {
      await database.classes.put(classGroup)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function deleteClassGroupCascade(
  workspace: Workspace,
  classId: string,
  database: SchedovynDatabase = defaultDb
): Promise<{
  updatedWorkspace: Workspace
  remainingClasses: ClassGroup[]
}> {
  return database.transaction(
    "rw",
    database.workspaces,
    database.classes,
    database.requirements,
    database.sessions,
    async () => {
      await database.classes.delete(classId)
      await database.requirements.where("classId").equals(classId).delete()
      await database.sessions.where("classId").equals(classId).delete()

      const remainingClasses = await database.classes
        .where("workspaceId")
        .equals(workspace.id)
        .toArray()

      const nextActiveClassId =
        workspace.activeClassId === classId
          ? (remainingClasses[0]?.id ?? null)
          : workspace.activeClassId

      const updatedWorkspace: Workspace = {
        ...workspace,
        activeClassId: nextActiveClassId,
        updatedAt: new Date().toISOString(),
      }

      await database.workspaces.put(updatedWorkspace)

      return {
        updatedWorkspace,
        remainingClasses,
      }
    }
  )
}

export async function saveSubject(
  workspace: Workspace,
  subject: Subject,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.subjects,
    async () => {
      await database.subjects.put(subject)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function deleteSubjectWithCheck(
  workspace: Workspace,
  subjectId: string,
  options?: { cascade?: boolean },
  database: SchedovynDatabase = defaultDb
): Promise<DeleteSubjectResult> {
  return database.transaction(
    "rw",
    database.workspaces,
    database.subjects,
    database.requirements,
    database.sessions,
    async () => {
      const dependentRequirements = await database.requirements
        .where("subjectId")
        .equals(subjectId)
        .toArray()
      const allSessions = await database.sessions
        .where("workspaceId")
        .equals(workspace.id)
        .toArray()
      const dependentSessions = allSessions.filter(
        (ses) => ses.subjectId === subjectId
      )

      const dependentRequirementsCount = dependentRequirements.length
      const dependentSessionsCount = dependentSessions.length

      if (
        (dependentRequirementsCount > 0 || dependentSessionsCount > 0) &&
        !options?.cascade
      ) {
        return {
          deleted: false,
          requiresConfirmation: true,
          dependentRequirementsCount,
          dependentSessionsCount,
        }
      }

      if (dependentRequirementsCount > 0) {
        await database.requirements
          .where("subjectId")
          .equals(subjectId)
          .delete()
      }

      if (dependentSessionsCount > 0) {
        await database.sessions.bulkDelete(
          dependentSessions.map((ses) => ses.id)
        )
      }

      await database.subjects.delete(subjectId)

      const updatedWorkspace: Workspace = {
        ...workspace,
        updatedAt: new Date().toISOString(),
      }
      await database.workspaces.put(updatedWorkspace)

      return {
        deleted: true,
        requiresConfirmation: false,
        dependentRequirementsCount,
        dependentSessionsCount,
        updatedWorkspace,
      }
    }
  )
}

export async function saveTeacher(
  workspace: Workspace,
  teacher: Teacher,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.teachers,
    async () => {
      await database.teachers.put(teacher)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function deleteTeacherAndUnassign(
  workspace: Workspace,
  teacherId: string,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  return database.transaction(
    "rw",
    database.workspaces,
    database.teachers,
    database.requirements,
    database.sessions,
    async () => {
      await database.teachers.delete(teacherId)

      const allRequirements = await database.requirements
        .where("workspaceId")
        .equals(workspace.id)
        .toArray()
      const affectedReqs = allRequirements
        .filter((req) => req.defaultTeacherId === teacherId)
        .map((req) => ({ ...req, defaultTeacherId: null }))

      if (affectedReqs.length > 0) {
        await database.requirements.bulkPut(affectedReqs)
      }

      const allSessions = await database.sessions
        .where("workspaceId")
        .equals(workspace.id)
        .toArray()
      const affectedSessions = allSessions
        .filter((ses) => ses.teacherId === teacherId)
        .map((ses) => ({ ...ses, teacherId: null }))

      if (affectedSessions.length > 0) {
        await database.sessions.bulkPut(affectedSessions)
      }

      const updatedWorkspace: Workspace = {
        ...workspace,
        updatedAt: new Date().toISOString(),
      }
      await database.workspaces.put(updatedWorkspace)

      return updatedWorkspace
    }
  )
}

export async function saveRoom(
  workspace: Workspace,
  room: Room,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.rooms,
    async () => {
      await database.rooms.put(room)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function deleteRoomAndUnassign(
  workspace: Workspace,
  roomId: string,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  return database.transaction(
    "rw",
    database.workspaces,
    database.rooms,
    database.requirements,
    database.sessions,
    async () => {
      await database.rooms.delete(roomId)

      const allRequirements = await database.requirements
        .where("workspaceId")
        .equals(workspace.id)
        .toArray()
      const affectedReqs = allRequirements
        .filter((req) => req.defaultRoomId === roomId)
        .map((req) => ({ ...req, defaultRoomId: null }))

      if (affectedReqs.length > 0) {
        await database.requirements.bulkPut(affectedReqs)
      }

      const allSessions = await database.sessions
        .where("workspaceId")
        .equals(workspace.id)
        .toArray()
      const affectedSessions = allSessions
        .filter((ses) => ses.roomId === roomId)
        .map((ses) => ({ ...ses, roomId: null }))

      if (affectedSessions.length > 0) {
        await database.sessions.bulkPut(affectedSessions)
      }

      const updatedWorkspace: Workspace = {
        ...workspace,
        updatedAt: new Date().toISOString(),
      }
      await database.workspaces.put(updatedWorkspace)

      return updatedWorkspace
    }
  )
}

export async function saveTeachingRequirement(
  workspace: Workspace,
  requirement: TeachingRequirement,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.requirements,
    async () => {
      await database.requirements.put(requirement)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function deleteTeachingRequirementCascade(
  workspace: Workspace,
  requirementId: string,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  return database.transaction(
    "rw",
    database.workspaces,
    database.requirements,
    database.sessions,
    async () => {
      await database.requirements.delete(requirementId)
      await database.sessions
        .where("requirementId")
        .equals(requirementId)
        .delete()

      const updatedWorkspace: Workspace = {
        ...workspace,
        updatedAt: new Date().toISOString(),
      }
      await database.workspaces.put(updatedWorkspace)

      return updatedWorkspace
    }
  )
}


export async function saveTimetableSession(
  workspace: Workspace,
  session: TimetableSession,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.sessions,
    async () => {
      await database.sessions.put(session)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function batchSaveTimetableSessions(
  workspace: Workspace,
  sessions: TimetableSession[],
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.sessions,
    async () => {
      await database.sessions.where("workspaceId").equals(workspace.id).delete()
      if (sessions.length > 0) {
        await database.sessions.bulkPut(sessions)
      }
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}

export async function deleteTimetableSession(
  workspace: Workspace,
  sessionId: string,
  database: SchedovynDatabase = defaultDb
): Promise<Workspace> {
  const updatedWorkspace: Workspace = {
    ...workspace,
    updatedAt: new Date().toISOString(),
  }

  await database.transaction(
    "rw",
    database.workspaces,
    database.sessions,
    async () => {
      await database.sessions.delete(sessionId)
      await database.workspaces.put(updatedWorkspace)
    }
  )

  return updatedWorkspace
}
