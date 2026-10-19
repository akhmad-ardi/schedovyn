import {
  ORDERED_DAYS_OF_WEEK,
  type DayOfWeek,
  type DayScheduleConfig,
  type Workspace,
} from "@/domain/types/entities"

export function createDefaultWorkspaceSeed(): {
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
} {
  const nowIso = new Date().toISOString()
  const workspaceId = crypto.randomUUID()

  const workspace: Workspace = {
    id: workspaceId,
    name: "SMP Negeri 1 Nusantara",
    academicPeriod: "Semester Ganjil 2026/2027",
    activeClassId: null,
    defaultSnapIntervalMinutes: 15,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  const dayConfigs: DayScheduleConfig[] = ORDERED_DAYS_OF_WEEK.map(
    (dayOfWeek: DayOfWeek) => {
      if (
        dayOfWeek === "monday" ||
        dayOfWeek === "tuesday" ||
        dayOfWeek === "wednesday" ||
        dayOfWeek === "thursday"
      ) {
        return {
          id: crypto.randomUUID(),
          workspaceId,
          dayOfWeek,
          isSchoolDay: true,
          startTime: "07:00",
          endTime: "15:00",
          snapIntervalMinutes: 15,
          breakIntervals: [
            {
              id: crypto.randomUUID(),
              label: "Istirahat Pertama",
              startTime: "09:30",
              endTime: "10:00",
            },
            {
              id: crypto.randomUUID(),
              label: "Ishoma",
              startTime: "12:00",
              endTime: "12:45",
            },
          ],
        }
      }

      if (dayOfWeek === "friday") {
        return {
          id: crypto.randomUUID(),
          workspaceId,
          dayOfWeek,
          isSchoolDay: true,
          startTime: "07:00",
          endTime: "11:30",
          snapIntervalMinutes: 15,
          breakIntervals: [
            {
              id: crypto.randomUUID(),
              label: "Istirahat",
              startTime: "09:15",
              endTime: "09:45",
            },
          ],
        }
      }

      return {
        id: crypto.randomUUID(),
        workspaceId,
        dayOfWeek,
        isSchoolDay: false,
        startTime: "07:00",
        endTime: "13:00",
        snapIntervalMinutes: 15,
        breakIntervals: [],
      }
    }
  )

  return { workspace, dayConfigs }
}
