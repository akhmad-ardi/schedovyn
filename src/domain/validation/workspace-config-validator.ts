import {
  DAY_OF_WEEK_LABELS,
  type DayOfWeek,
  type DayScheduleConfig,
  type Workspace,
} from "@/domain/types/entities"
import {
  doIntervalsOverlap,
  isIntervalWithinBounds,
} from "@/domain/time/interval-utils"
import { isValidTimeString, timeToMinutes } from "@/domain/time/time-utils"

export type WorkspaceConfigErrorCode =
  | "EMPTY_WORKSPACE_NAME"
  | "EMPTY_ACADEMIC_PERIOD"
  | "NO_ACTIVE_SCHOOL_DAY"
  | "INVALID_TIME_FORMAT"
  | "OPERATING_HOURS_END_BEFORE_START"
  | "EMPTY_BREAK_LABEL"
  | "BREAK_END_BEFORE_START"
  | "BREAK_OUTSIDE_OPERATING_HOURS"
  | "BREAK_INTERVAL_OVERLAP"

export interface WorkspaceConfigValidationIssue {
  code: WorkspaceConfigErrorCode
  dayOfWeek?: DayOfWeek
  breakId?: string
  field: string
  message: string
}

export interface WorkspaceConfigValidationResult {
  isValid: boolean
  issues: WorkspaceConfigValidationIssue[]
}

export function validateWorkspaceConfig(
  workspace: Pick<
    Workspace,
    "name" | "academicPeriod" | "defaultSnapIntervalMinutes"
  >,
  dayConfigs: DayScheduleConfig[]
): WorkspaceConfigValidationResult {
  const issues: WorkspaceConfigValidationIssue[] = []

  if (workspace.name.trim().length === 0) {
    issues.push({
      code: "EMPTY_WORKSPACE_NAME",
      field: "name",
      message: "Nama sekolah atau ruang kerja wajib diisi.",
    })
  }

  if (workspace.academicPeriod.trim().length === 0) {
    issues.push({
      code: "EMPTY_ACADEMIC_PERIOD",
      field: "academicPeriod",
      message: "Label periode akademik atau semester wajib diisi.",
    })
  }

  const hasActiveSchoolDay = dayConfigs.some((day) => day.isSchoolDay)
  if (!hasActiveSchoolDay) {
    issues.push({
      code: "NO_ACTIVE_SCHOOL_DAY",
      field: "dayConfigs",
      message:
        "Minimal satu hari sekolah harus diaktifkan dalam seminggu untuk menyusun jadwal.",
    })
  }

  for (const dayConfig of dayConfigs) {
    const dayLabel = DAY_OF_WEEK_LABELS[dayConfig.dayOfWeek]
    const isStartValid = isValidTimeString(dayConfig.startTime)
    const isEndValid = isValidTimeString(dayConfig.endTime)

    if (!isStartValid || !isEndValid) {
      issues.push({
        code: "INVALID_TIME_FORMAT",
        dayOfWeek: dayConfig.dayOfWeek,
        field: `dayConfigs.${dayConfig.dayOfWeek}.operatingHours`,
        message: `Format jam operasional pada hari ${dayLabel} harus menggunakan format 24 jam (HH:mm).`,
      })
      continue
    }

    if (timeToMinutes(dayConfig.startTime) >= timeToMinutes(dayConfig.endTime)) {
      issues.push({
        code: "OPERATING_HOURS_END_BEFORE_START",
        dayOfWeek: dayConfig.dayOfWeek,
        field: `dayConfigs.${dayConfig.dayOfWeek}.operatingHours`,
        message: `Jam selesai belajar pada hari ${dayLabel} (${dayConfig.endTime}) harus lebih akhir daripada jam mulai (${dayConfig.startTime}).`,
      })
    }

    for (const breakItem of dayConfig.breakIntervals) {
      if (breakItem.label.trim().length === 0) {
        issues.push({
          code: "EMPTY_BREAK_LABEL",
          dayOfWeek: dayConfig.dayOfWeek,
          breakId: breakItem.id,
          field: `dayConfigs.${dayConfig.dayOfWeek}.breakIntervals.${breakItem.id}.label`,
          message: `Label waktu istirahat pada hari ${dayLabel} wajib diisi.`,
        })
      }

      const isBreakStartValid = isValidTimeString(breakItem.startTime)
      const isBreakEndValid = isValidTimeString(breakItem.endTime)

      if (!isBreakStartValid || !isBreakEndValid) {
        issues.push({
          code: "INVALID_TIME_FORMAT",
          dayOfWeek: dayConfig.dayOfWeek,
          breakId: breakItem.id,
          field: `dayConfigs.${dayConfig.dayOfWeek}.breakIntervals.${breakItem.id}.time`,
          message: `Format waktu istirahat pada hari ${dayLabel} harus menggunakan format 24 jam (HH:mm).`,
        })
        continue
      }

      if (
        timeToMinutes(breakItem.startTime) >= timeToMinutes(breakItem.endTime)
      ) {
        issues.push({
          code: "BREAK_END_BEFORE_START",
          dayOfWeek: dayConfig.dayOfWeek,
          breakId: breakItem.id,
          field: `dayConfigs.${dayConfig.dayOfWeek}.breakIntervals.${breakItem.id}.time`,
          message: `Waktu selesai istirahat "${breakItem.label || "Tanpa Nama"}" pada hari ${dayLabel} harus lebih akhir daripada waktu mulai.`,
        })
        continue
      }

      if (
        timeToMinutes(dayConfig.startTime) < timeToMinutes(dayConfig.endTime) &&
        !isIntervalWithinBounds(
          breakItem.startTime,
          breakItem.endTime,
          dayConfig.startTime,
          dayConfig.endTime
        )
      ) {
        issues.push({
          code: "BREAK_OUTSIDE_OPERATING_HOURS",
          dayOfWeek: dayConfig.dayOfWeek,
          breakId: breakItem.id,
          field: `dayConfigs.${dayConfig.dayOfWeek}.breakIntervals.${breakItem.id}.time`,
          message: `Waktu istirahat "${breakItem.label || "Tanpa Nama"}" (${breakItem.startTime} - ${breakItem.endTime}) pada hari ${dayLabel} berada di luar jam operasional (${dayConfig.startTime} - ${dayConfig.endTime}).`,
        })
      }
    }

    for (let i = 0; i < dayConfig.breakIntervals.length; i++) {
      const breakA = dayConfig.breakIntervals[i]
      if (
        !isValidTimeString(breakA.startTime) ||
        !isValidTimeString(breakA.endTime) ||
        timeToMinutes(breakA.startTime) >= timeToMinutes(breakA.endTime)
      ) {
        continue
      }

      for (let j = i + 1; j < dayConfig.breakIntervals.length; j++) {
        const breakB = dayConfig.breakIntervals[j]
        if (
          !isValidTimeString(breakB.startTime) ||
          !isValidTimeString(breakB.endTime) ||
          timeToMinutes(breakB.startTime) >= timeToMinutes(breakB.endTime)
        ) {
          continue
        }

        if (
          doIntervalsOverlap(
            breakA.startTime,
            breakA.endTime,
            breakB.startTime,
            breakB.endTime
          )
        ) {
          issues.push({
            code: "BREAK_INTERVAL_OVERLAP",
            dayOfWeek: dayConfig.dayOfWeek,
            breakId: breakB.id,
            field: `dayConfigs.${dayConfig.dayOfWeek}.breakIntervals.${breakB.id}.time`,
            message: `Waktu istirahat "${breakA.label || "Istirahat 1"}" (${breakA.startTime} - ${breakA.endTime}) dan "${breakB.label || "Istirahat 2"}" (${breakB.startTime} - ${breakB.endTime}) pada hari ${dayLabel} saling bertabrakan.`,
          })
        }
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}
