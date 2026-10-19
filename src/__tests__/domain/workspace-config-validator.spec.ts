import { describe, expect, it } from "vitest"
import { validateWorkspaceConfig } from "@/domain/validation/workspace-config-validator"
import type { DayScheduleConfig, Workspace } from "@/domain/types/entities"

function createValidDayConfigs(): DayScheduleConfig[] {
  return [
    {
      id: "day-mon",
      workspaceId: "ws-1",
      dayOfWeek: "monday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [
        {
          id: "brk-1",
          label: "Istirahat Pertama",
          startTime: "09:30",
          endTime: "10:00",
        },
        {
          id: "brk-2",
          label: "Ishoma",
          startTime: "12:00",
          endTime: "12:45",
        },
      ],
    },
    {
      id: "day-tue",
      workspaceId: "ws-1",
      dayOfWeek: "tuesday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-wed",
      workspaceId: "ws-1",
      dayOfWeek: "wednesday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-thu",
      workspaceId: "ws-1",
      dayOfWeek: "thursday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-fri",
      workspaceId: "ws-1",
      dayOfWeek: "friday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "11:30",
      snapIntervalMinutes: 15,
      breakIntervals: [
        {
          id: "brk-fri-1",
          label: "Istirahat",
          startTime: "09:15",
          endTime: "09:45",
        },
      ],
    },
    {
      id: "day-sat",
      workspaceId: "ws-1",
      dayOfWeek: "saturday",
      isSchoolDay: false,
      startTime: "07:00",
      endTime: "13:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-sun",
      workspaceId: "ws-1",
      dayOfWeek: "sunday",
      isSchoolDay: false,
      startTime: "07:00",
      endTime: "13:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
  ]
}

const validWorkspaceIdentity: Pick<
  Workspace,
  "name" | "academicPeriod" | "defaultSnapIntervalMinutes"
> = {
  name: "SMP Negeri 1 Nusantara",
  academicPeriod: "Semester Ganjil 2026/2027",
  defaultSnapIntervalMinutes: 15,
}

describe("FR-01: Validator Konfigurasi Ruang Kerja & Jam Belajar", () => {
  it("menerima konfigurasi default yang valid (isValid: true, issues: [])", () => {
    const result = validateWorkspaceConfig(
      validWorkspaceIdentity,
      createValidDayConfigs()
    )
    expect(result.isValid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it("menolak nama ruang kerja atau periode akademik yang kosong", () => {
    const result = validateWorkspaceConfig(
      {
        ...validWorkspaceIdentity,
        name: "   ",
        academicPeriod: "",
      },
      createValidDayConfigs()
    )

    expect(result.isValid).toBe(false)
    expect(result.issues.map((i) => i.code)).toContain("EMPTY_WORKSPACE_NAME")
    expect(result.issues.map((i) => i.code)).toContain("EMPTY_ACADEMIC_PERIOD")
  })

  it("AC-FR01-04: menolak jika seluruh 7 hari memiliki isSchoolDay === false", () => {
    const allInactive = createValidDayConfigs().map((day) => ({
      ...day,
      isSchoolDay: false,
    }))

    const result = validateWorkspaceConfig(validWorkspaceIdentity, allInactive)
    expect(result.isValid).toBe(false)
    expect(result.issues.some((i) => i.code === "NO_ACTIVE_SCHOOL_DAY")).toBe(
      true
    )
  })

  it("AC-FR01-04: menolak jika startTime >= endTime pada jam operasional hari", () => {
    const days = createValidDayConfigs()
    days[0] = {
      ...days[0],
      startTime: "14:00",
      endTime: "08:00",
      breakIntervals: [],
    }

    const result = validateWorkspaceConfig(validWorkspaceIdentity, days)
    expect(result.isValid).toBe(false)
    expect(
      result.issues.some(
        (i) =>
          i.code === "OPERATING_HOURS_END_BEFORE_START" &&
          i.dayOfWeek === "monday"
      )
    ).toBe(true)
  })

  it("menolak periode istirahat dengan label kosong atau jam mulai >= jam selesai", () => {
    const days = createValidDayConfigs()
    days[0] = {
      ...days[0],
      breakIntervals: [
        {
          id: "brk-empty",
          label: "  ",
          startTime: "09:30",
          endTime: "10:00",
        },
        {
          id: "brk-reversed",
          label: "Istirahat Sore",
          startTime: "13:00",
          endTime: "12:30",
        },
      ],
    }

    const result = validateWorkspaceConfig(validWorkspaceIdentity, days)
    expect(result.isValid).toBe(false)
    expect(
      result.issues.some(
        (i) => i.code === "EMPTY_BREAK_LABEL" && i.breakId === "brk-empty"
      )
    ).toBe(true)
    expect(
      result.issues.some(
        (i) => i.code === "BREAK_END_BEFORE_START" && i.breakId === "brk-reversed"
      )
    ).toBe(true)
  })

  it("AC-FR01-03: menolak jam istirahat yang berada di luar jam operasional hari tersebut", () => {
    const days = createValidDayConfigs()
    days[0] = {
      ...days[0],
      startTime: "07:00",
      endTime: "15:00",
      breakIntervals: [
        {
          id: "brk-outside",
          label: "Istirahat Terlalu Sore",
          startTime: "14:30",
          endTime: "15:30",
        },
      ],
    }

    const result = validateWorkspaceConfig(validWorkspaceIdentity, days)
    expect(result.isValid).toBe(false)
    expect(
      result.issues.some(
        (i) =>
          i.code === "BREAK_OUTSIDE_OPERATING_HOURS" &&
          i.dayOfWeek === "monday" &&
          i.breakId === "brk-outside"
      )
    ).toBe(true)
  })

  it("AC-FR01-03: menolak dua periode istirahat pada hari yang sama yang saling tumpang tindih", () => {
    const days = createValidDayConfigs()
    days[0] = {
      ...days[0],
      breakIntervals: [
        {
          id: "brk-a",
          label: "Istirahat 1",
          startTime: "09:30",
          endTime: "10:00",
        },
        {
          id: "brk-b",
          label: "Istirahat 2 Bentrok",
          startTime: "09:45",
          endTime: "10:15",
        },
      ],
    }

    const result = validateWorkspaceConfig(validWorkspaceIdentity, days)
    expect(result.isValid).toBe(false)
    expect(
      result.issues.some(
        (i) => i.code === "BREAK_INTERVAL_OVERLAP" && i.dayOfWeek === "monday"
      )
    ).toBe(true)
  })

  it("AC-FR01-03 & AC-05: menerima dua periode istirahat yang berbatasan tepat (09:30-10:00 dan 10:00-10:15)", () => {
    const days = createValidDayConfigs()
    days[0] = {
      ...days[0],
      breakIntervals: [
        {
          id: "brk-a",
          label: "Istirahat 1",
          startTime: "09:30",
          endTime: "10:00",
        },
        {
          id: "brk-b",
          label: "Istirahat 2 Berbatasan",
          startTime: "10:00",
          endTime: "10:15",
        },
      ],
    }

    const result = validateWorkspaceConfig(validWorkspaceIdentity, days)
    expect(result.isValid).toBe(true)
    expect(result.issues).toEqual([])
  })
})
