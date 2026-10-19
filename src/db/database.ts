import Dexie, { type EntityTable } from "dexie"
import type {
  ClassGroup,
  DayScheduleConfig,
  Room,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
  Workspace,
} from "@/domain/types/entities"

export class SchedovynDatabase extends Dexie {
  workspaces!: EntityTable<Workspace, "id">
  dayConfigs!: EntityTable<DayScheduleConfig, "id">
  classes!: EntityTable<ClassGroup, "id">
  teachers!: EntityTable<Teacher, "id">
  subjects!: EntityTable<Subject, "id">
  rooms!: EntityTable<Room, "id">
  requirements!: EntityTable<TeachingRequirement, "id">
  sessions!: EntityTable<TimetableSession, "id">

  constructor() {
    super("schedovyn_local_db")
    this.version(1).stores({
      workspaces: "id, updatedAt",
      dayConfigs: "id, workspaceId, [workspaceId+dayOfWeek]",
      classes: "id, workspaceId, name",
      teachers: "id, workspaceId, name",
      subjects: "id, workspaceId, name",
      rooms: "id, workspaceId, name, type",
      requirements: "id, workspaceId, classId, [workspaceId+classId], subjectId",
      sessions:
        "id, workspaceId, classId, requirementId, [workspaceId+classId], [workspaceId+dayOfWeek], [workspaceId+teacherId], [workspaceId+roomId]",
    })
  }
}

export const db = new SchedovynDatabase()
