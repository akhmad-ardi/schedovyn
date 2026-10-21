import { describe, expect, it } from "vitest"
import { detectScheduleConflicts } from "@/domain/validation/conflict-engine"
import type {
  ClassGroup,
  DayScheduleConfig,
  Room,
  Subject,
  Teacher,
  TimeString,
  TimetableSession,
} from "@/domain/types/entities"

describe("FR-05 & AC-03 s.d. AC-06, NFR-01: detectScheduleConflicts", () => {
  const dayConfigs: DayScheduleConfig[] = [
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
          label: "Istirahat Pagi",
          startTime: "09:30",
          endTime: "10:00",
        },
      ],
    },
    {
      id: "day-fri",
      workspaceId: "ws-1",
      dayOfWeek: "friday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "11:30",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-sun",
      workspaceId: "ws-1",
      dayOfWeek: "sunday",
      isSchoolDay: false,
      startTime: "07:00",
      endTime: "12:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
  ]

  const classes: ClassGroup[] = [
    { id: "cls-7a", workspaceId: "ws-1", name: "VII-A", grade: "VII" },
    { id: "cls-8a", workspaceId: "ws-1", name: "VIII-A", grade: "VIII" },
  ]

  const teachers: Teacher[] = [
    {
      id: "tch-budi",
      workspaceId: "ws-1",
      name: "Budi Santoso",
      unavailableIntervals: [
        {
          id: "unv-budi-1",
          dayOfWeek: "monday",
          startTime: "13:00",
          endTime: "15:00",
          label: "Rapat MGMP",
        },
      ],
    },
    {
      id: "tch-siti",
      workspaceId: "ws-1",
      name: "Siti Aminah",
      unavailableIntervals: [],
    },
  ]

  const rooms: Room[] = [
    {
      id: "rm-lab",
      workspaceId: "ws-1",
      name: "Lab Komputer",
      type: "laboratory",
      unavailableIntervals: [
        {
          id: "unv-lab-1",
          dayOfWeek: "monday",
          startTime: "11:00",
          endTime: "12:30",
          label: "Pemeliharaan Perangkat",
        },
      ],
    },
  ]

  const subjects: Subject[] = [
    { id: "sub-math", workspaceId: "ws-1", name: "Matematika", colorKey: "blue" },
    { id: "sub-eng", workspaceId: "ws-1", name: "Bahasa Inggris", colorKey: "emerald" },
  ]

  it("1. mendeteksi CLASS_OVERLAP saat kelas sama memiliki dua sesi tumpang tindih waktu", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-1",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-budi",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "08:30",
        durationMinutes: 60,
      },
      {
        id: "ses-2",
        workspaceId: "ws-1",
        requirementId: "req-2",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-siti",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "08:00",
        endTime: "09:00",
        durationMinutes: 60,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions,
    })

    const classConflict = conflicts.find((c) => c.conflictType === "CLASS_OVERLAP")
    expect(classConflict).toBeDefined()
    expect(classConflict?.affectedClassIds).toContain("cls-7a")
    expect(classConflict?.affectedSessionIds).toEqual(expect.arrayContaining(["ses-1", "ses-2"]))
    expect(classConflict?.startTime).toBe("08:00")
    expect(classConflict?.endTime).toBe("08:30")
    expect(classConflict?.title).toBe("Jadwal Kelas Tumpang Tindih")
  })

  it("2. mendeteksi TEACHER_OVERLAP lintas kelas saat guru sama mengajar pada waktu tumpang tindih (AC-03)", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-8a",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-8a",
        subjectId: "sub-math",
        teacherId: "tch-budi",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "08:00",
        endTime: "09:00",
        durationMinutes: 60,
      },
      {
        id: "ses-7a",
        workspaceId: "ws-1",
        requirementId: "req-2",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-budi",
        roomId: null,
        dayOfWeek: "monday",
        startTime: "08:30",
        endTime: "09:30",
        durationMinutes: 60,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions,
    })

    const teacherConflict = conflicts.find((c) => c.conflictType === "TEACHER_OVERLAP")
    expect(teacherConflict).toBeDefined()
    expect(teacherConflict?.affectedClassIds).toEqual(expect.arrayContaining(["cls-7a", "cls-8a"]))
    expect(teacherConflict?.teacherId).toBe("tch-budi")
    expect(teacherConflict?.startTime).toBe("08:30")
    expect(teacherConflict?.endTime).toBe("09:00")
    expect(teacherConflict?.title).toBe("Bentrokan Jadwal Guru")
    expect(teacherConflict?.description).toContain("Budi Santoso")
    expect(teacherConflict?.description).toContain("VII-A")
    expect(teacherConflict?.description).toContain("VIII-A")
  })

  it("3. mendeteksi ROOM_OVERLAP saat ruangan sama digunakan bersamaan dan mengabaikan jika roomId null (AC-06)", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-room-1",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-siti",
        roomId: "rm-lab",
        dayOfWeek: "monday",
        startTime: "07:30",
        endTime: "09:00",
        durationMinutes: 90,
      },
      {
        id: "ses-room-2",
        workspaceId: "ws-1",
        requirementId: "req-2",
        classId: "cls-8a",
        subjectId: "sub-eng",
        teacherId: "tch-budi",
        roomId: "rm-lab",
        dayOfWeek: "monday",
        startTime: "08:30",
        endTime: "09:30",
        durationMinutes: 60,
      },
      // Sesi ketiga pada waktu yang sama namun roomId: null -> tidak boleh berkonflik ruangan
      {
        id: "ses-no-room",
        workspaceId: "ws-1",
        requirementId: "req-3",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: null,
        roomId: null,
        dayOfWeek: "monday",
        startTime: "08:30",
        endTime: "09:30",
        durationMinutes: 60,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions,
    })

    const roomConflicts = conflicts.filter((c) => c.conflictType === "ROOM_OVERLAP")
    expect(roomConflicts).toHaveLength(1)
    expect(roomConflicts[0].roomId).toBe("rm-lab")
    expect(roomConflicts[0].affectedSessionIds).toEqual(
      expect.arrayContaining(["ses-room-1", "ses-room-2"])
    )
    expect(roomConflicts[0].startTime).toBe("08:30")
    expect(roomConflicts[0].endTime).toBe("09:00")
  })

  it("4. mendeteksi TEACHER_UNAVAILABLE & ROOM_UNAVAILABLE saat sesi jatuh pada interval ketidaksediaan (AC-04)", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-unv-tch",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-budi", // Tidak bersedia Senin 13:00 - 15:00
        roomId: null,
        dayOfWeek: "monday",
        startTime: "13:30",
        endTime: "14:30",
        durationMinutes: 60,
      },
      {
        id: "ses-unv-rm",
        workspaceId: "ws-1",
        requirementId: "req-2",
        classId: "cls-8a",
        subjectId: "sub-eng",
        teacherId: "tch-siti",
        roomId: "rm-lab", // Lab maintenance Senin 11:00 - 12:30
        dayOfWeek: "monday",
        startTime: "11:30",
        endTime: "13:00",
        durationMinutes: 90,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions,
    })

    const tchConflict = conflicts.find((c) => c.conflictType === "TEACHER_UNAVAILABLE")
    expect(tchConflict).toBeDefined()
    expect(tchConflict?.teacherId).toBe("tch-budi")
    expect(tchConflict?.startTime).toBe("13:30")
    expect(tchConflict?.endTime).toBe("14:30")

    const rmConflict = conflicts.find((c) => c.conflictType === "ROOM_UNAVAILABLE")
    expect(rmConflict).toBeDefined()
    expect(rmConflict?.roomId).toBe("rm-lab")
    expect(rmConflict?.startTime).toBe("11:30")
    expect(rmConflict?.endTime).toBe("12:30") // Beririsan sampai jam 12:30
  })

  it("5. sesi yang berbatasan persis (08:00-09:00 dan 09:00-10:00) TIDAK boleh dianggap berkonflik (AC-05)", () => {
    const consecutiveSessions: TimetableSession[] = [
      {
        id: "ses-adj-1",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: "tch-budi",
        roomId: "rm-lab",
        dayOfWeek: "friday",
        startTime: "08:00",
        endTime: "09:00",
        durationMinutes: 60,
      },
      {
        id: "ses-adj-2",
        workspaceId: "ws-1",
        requirementId: "req-2",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: "tch-budi",
        roomId: "rm-lab",
        dayOfWeek: "friday",
        startTime: "09:00",
        endTime: "10:00",
        durationMinutes: 60,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions: consecutiveSessions,
    })

    // Tidak boleh ada bentrokan guru, bentrokan kelas, atau bentrokan ruangan
    expect(conflicts).toHaveLength(0)
  })

  it("6. mendeteksi OUTSIDE_OPERATING_HOURS jika sesi berada di luar jam operasional atau pada hari libur", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-early",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: null,
        roomId: null,
        dayOfWeek: "monday",
        startTime: "06:30", // Mulai sebelum jam buka 07:00
        endTime: "07:30",
        durationMinutes: 60,
      },
      {
        id: "ses-late",
        workspaceId: "ws-1",
        requirementId: "req-2",
        classId: "cls-7a",
        subjectId: "sub-eng",
        teacherId: null,
        roomId: null,
        dayOfWeek: "friday",
        startTime: "11:00",
        endTime: "12:00", // Melewati batas jam tutup Jumat 11:30
        durationMinutes: 60,
      },
      {
        id: "ses-holiday",
        workspaceId: "ws-1",
        requirementId: "req-3",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: null,
        roomId: null,
        dayOfWeek: "sunday", // Hari Minggu libur (isSchoolDay: false)
        startTime: "08:00",
        endTime: "09:00",
        durationMinutes: 60,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions,
    })

    const outsideConflicts = conflicts.filter(
      (c) => c.conflictType === "OUTSIDE_OPERATING_HOURS"
    )
    expect(outsideConflicts).toHaveLength(3)
  })

  it("7. mendeteksi BREAK_TIME_OVERLAP saat sesi ditempatkan menabrak interval waktu istirahat", () => {
    const sessions: TimetableSession[] = [
      {
        id: "ses-break-clash",
        workspaceId: "ws-1",
        requirementId: "req-1",
        classId: "cls-7a",
        subjectId: "sub-math",
        teacherId: null,
        roomId: null,
        dayOfWeek: "monday",
        startTime: "09:15", // Istirahat Senin: 09:30 - 10:00
        endTime: "10:15",
        durationMinutes: 60,
      },
    ]

    const conflicts = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions,
    })

    const breakConflict = conflicts.find((c) => c.conflictType === "BREAK_TIME_OVERLAP")
    expect(breakConflict).toBeDefined()
    expect(breakConflict?.startTime).toBe("09:30")
    expect(breakConflict?.endTime).toBe("10:00")
  })

  it("8. id konflik bersifat deterministik dan mengabaikan urutan sesi", () => {
    const sesA: TimetableSession = {
      id: "ses-alpha",
      workspaceId: "ws-1",
      requirementId: "req-1",
      classId: "cls-7a",
      subjectId: "sub-math",
      teacherId: "tch-budi",
      roomId: null,
      dayOfWeek: "monday",
      startTime: "08:00",
      endTime: "09:00",
      durationMinutes: 60,
    }

    const sesB: TimetableSession = {
      id: "ses-beta",
      workspaceId: "ws-1",
      requirementId: "req-2",
      classId: "cls-8a",
      subjectId: "sub-eng",
      teacherId: "tch-budi",
      roomId: null,
      dayOfWeek: "monday",
      startTime: "08:00",
      endTime: "09:00",
      durationMinutes: 60,
    }

    // Urutan A lalu B
    const conflictsAB = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions: [sesA, sesB],
    })

    // Urutan B lalu A
    const conflictsBA = detectScheduleConflicts({
      dayConfigs,
      classes,
      teachers,
      rooms,
      subjects,
      sessions: [sesB, sesA],
    })

    expect(conflictsAB[0].id).toBe(conflictsBA[0].id)
    expect(conflictsAB[0].id).toBe("TEACHER_OVERLAP::ses-alpha::ses-beta")
  })

  it("9. [NFR-01 Benchmark] mendeteksi konflik pada 1.000 sesi dalam waktu < 300 ms", () => {
    // Bangun 1.000 sesi buatan tersebar pada 20 kelas dan 30 guru
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const
    const benchConfigs: DayScheduleConfig[] = days.map((d, idx) => ({
      id: `bench-day-${idx}`,
      workspaceId: "ws-1",
      dayOfWeek: d,
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "16:00",
      snapIntervalMinutes: 15,
      breakIntervals: [
        {
          id: `brk-${d}`,
          label: "Istirahat",
          startTime: "12:00",
          endTime: "12:45",
        },
      ],
    }))

    const bulkSessions: TimetableSession[] = []
    let currentId = 0

    // Buat 1.000 sesi
    for (let c = 0; c < 20; c++) {
      for (let s = 0; s < 50; s++) {
        const day = days[s % 5]
        const hour = 7 + (s % 7)
        const startTime = `${String(hour).padStart(2, "0")}:00` as TimeString
        const endTime = `${String(hour).padStart(2, "0")}:45` as TimeString
        const teacherId = `tch-bench-${(c + s) % 30}`

        bulkSessions.push({
          id: `ses-bench-${currentId++}`,
          workspaceId: "ws-1",
          requirementId: `req-${c}-${s}`,
          classId: `cls-bench-${c}`,
          subjectId: "sub-math",
          teacherId,
          roomId: null,
          dayOfWeek: day,
          startTime,
          endTime,
          durationMinutes: 45,
        })
      }
    }

    const startPerf = performance.now()
    const conflicts = detectScheduleConflicts({
      dayConfigs: benchConfigs,
      classes: [],
      teachers: [],
      rooms: [],
      subjects: [],
      sessions: bulkSessions,
    })
    const durationMs = performance.now() - startPerf

    expect(durationMs).toBeLessThan(300)
    expect(conflicts.length).toBeGreaterThan(0)
  })
})
