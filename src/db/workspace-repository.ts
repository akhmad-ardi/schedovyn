import { db as defaultDb, type SchedovynDatabase } from "@/db/database"
import { createDefaultWorkspaceSeed } from "@/db/seed-default"
import {
  ORDERED_DAYS_OF_WEEK,
  type DayScheduleConfig,
  type Workspace,
} from "@/domain/types/entities"

function sortDayConfigs(dayConfigs: DayScheduleConfig[]): DayScheduleConfig[] {
  return [...dayConfigs].sort(
    (a, b) =>
      ORDERED_DAYS_OF_WEEK.indexOf(a.dayOfWeek) -
      ORDERED_DAYS_OF_WEEK.indexOf(b.dayOfWeek)
  )
}

export async function loadOrSeedWorkspace(
  database: SchedovynDatabase = defaultDb
): Promise<{
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
}> {
  return database.transaction(
    "rw",
    database.workspaces,
    database.dayConfigs,
    async () => {
      const existingWorkspaces = await database.workspaces.toArray()
      if (existingWorkspaces.length > 0) {
        const workspace = existingWorkspaces[0]
        const rawDays = await database.dayConfigs
          .where("workspaceId")
          .equals(workspace.id)
          .toArray()
        return {
          workspace,
          dayConfigs: sortDayConfigs(rawDays),
        }
      }

      const seeded = createDefaultWorkspaceSeed()
      await database.workspaces.put(seeded.workspace)
      await database.dayConfigs.bulkPut(seeded.dayConfigs)

      return {
        workspace: seeded.workspace,
        dayConfigs: sortDayConfigs(seeded.dayConfigs),
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
