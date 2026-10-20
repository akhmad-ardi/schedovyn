import { describe, expect, it } from "vitest"
import {
  PIXELS_PER_MINUTE,
  calculateGridBoundaries,
  calculateKeyboardTimeShift,
  clampMinutes,
  computeDaySessionClusters,
  durationToGridHeightPx,
  getAdjacentSchoolDay,
  offsetYToSnappedMinutes,
  timeToGridTopPx,
} from "@/domain/timetable/grid-layout"
import type { DayScheduleConfig, TimetableSession } from "@/domain/types/entities"

describe("FR-04.B & TDD 6.2/6.3: grid-layout", () => {
  const dayConfigs: DayScheduleConfig[] = [
    {
      id: "day-mon",
      workspaceId: "ws-1",
      dayOfWeek: "monday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "15:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-tue",
      workspaceId: "ws-1",
      dayOfWeek: "tuesday",
      isSchoolDay: true,
      startTime: "07:30",
      endTime: "14:30",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-wed",
      workspaceId: "ws-1",
      dayOfWeek: "wednesday",
      isSchoolDay: true,
      startTime: "07:00",
      endTime: "16:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
    {
      id: "day-sun",
      workspaceId: "ws-1",
      dayOfWeek: "sunday",
      isSchoolDay: false,
      startTime: "08:00",
      endTime: "12:00",
      snapIntervalMinutes: 15,
      breakIntervals: [],
    },
  ]

  describe("1. calculateGridBoundaries", () => {
    it("menghitung batas paling awal (originMinutes) dan paling akhir (maxMinutes) dari hari aktif", () => {
      const bounds = calculateGridBoundaries(dayConfigs)
      // paling pagi = 07:00 (420 menit), paling sore = 16:00 (960 menit)
      expect(bounds.originMinutes).toBe(420)
      expect(bounds.maxMinutes).toBe(960)
      expect(bounds.totalMinutes).toBe(540)
      expect(bounds.totalHeightPx).toBe(540 * PIXELS_PER_MINUTE)
    })

    it("menggunakan batas default 07:00-16:00 jika tidak ada hari sekolah aktif", () => {
      const inactiveDays = dayConfigs.map((d) => ({ ...d, isSchoolDay: false }))
      const bounds = calculateGridBoundaries(inactiveDays)
      expect(bounds.originMinutes).toBe(420) // 07:00
      expect(bounds.maxMinutes).toBe(960) // 16:00
      expect(bounds.totalMinutes).toBe(540)
    })
  })

  describe("2. timeToGridTopPx & durationToGridHeightPx", () => {
    it("menghitung posisi top piksel berdasarkan originMinutes dan skala PIXELS_PER_MINUTE", () => {
      const origin = 420 // 07:00
      expect(timeToGridTopPx("07:00", origin)).toBe(0)
      expect(timeToGridTopPx("07:30", origin)).toBe(30 * PIXELS_PER_MINUTE) // 48px
      expect(timeToGridTopPx("08:00", origin)).toBe(60 * PIXELS_PER_MINUTE) // 96px
    })

    it("menghitung tinggi piksel proporsional durasi (FR-04.4, FR-04.9)", () => {
      expect(durationToGridHeightPx(15)).toBe(15 * 1.6) // 24px
      expect(durationToGridHeightPx(45)).toBe(45 * 1.6) // 72px
      expect(durationToGridHeightPx(90)).toBe(90 * 1.6) // 144px
      // Sesi 90 menit tepat 2x tinggi sesi 45 menit
      expect(durationToGridHeightPx(90)).toBe(durationToGridHeightPx(45) * 2)
    })
  })

  describe("3. offsetYToSnappedMinutes & clampMinutes", () => {
    it("mengonversi offsetY piksel ke menit ter-snap pada kelipatan snap interval", () => {
      const origin = 420 // 07:00
      // 0px -> 07:00 (420)
      expect(offsetYToSnappedMinutes(0, origin, 15)).toBe(420)
      // 30px -> 30 / 1.6 = 18.75 menit -> snap 15 menit terdekat adalah 15 -> 420 + 15 = 435 (07:15)
      expect(offsetYToSnappedMinutes(30, origin, 15)).toBe(435)
      // 40px -> 40 / 1.6 = 25 menit -> snap 15 menit terdekat adalah 30 -> 420 + 30 = 450 (07:30)
      expect(offsetYToSnappedMinutes(40, origin, 15)).toBe(450)
      // Snap 30 menit: 25 menit -> snap ke 30 menit -> 420 + 30 = 450
      expect(offsetYToSnappedMinutes(40, origin, 30)).toBe(450)
      // Snap 5 menit: 18.75 menit -> snap ke 20 menit -> 420 + 20 = 440
      expect(offsetYToSnappedMinutes(30, origin, 5)).toBe(440)
    })

    it("clampMinutes membatasi nilai menit di dalam batas min dan max", () => {
      expect(clampMinutes(400, 420, 900)).toBe(420)
      expect(clampMinutes(950, 420, 900)).toBe(900)
      expect(clampMinutes(500, 420, 900)).toBe(500)
    })
  })

  describe("4. computeDaySessionClusters (Overlap Clustering - TDD 6.3)", () => {
    it("dua sesi berurutan tepat (08:00-09:00 dan 09:00-10:00) tidak bertumpuk dan mendapat lebar 100%", () => {
      const sessions: TimetableSession[] = [
        {
          id: "ses-1",
          workspaceId: "ws-1",
          requirementId: "req-1",
          classId: "cls-7a",
          subjectId: "sub-1",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "08:00",
          endTime: "09:00",
          durationMinutes: 60,
        },
        {
          id: "ses-2",
          workspaceId: "ws-1",
          requirementId: "req-2",
          classId: "cls-7a",
          subjectId: "sub-2",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "09:00",
          endTime: "10:00",
          durationMinutes: 60,
        },
      ]

      const layoutMap = computeDaySessionClusters(sessions)
      expect(layoutMap.get("ses-1")).toEqual({
        colIndex: 0,
        colCount: 1,
        widthPercent: 100,
        leftPercent: 0,
      })
      expect(layoutMap.get("ses-2")).toEqual({
        colIndex: 0,
        colCount: 1,
        widthPercent: 100,
        leftPercent: 0,
      })
    })

    it("dua sesi tumpang tindih (08:00-09:30 dan 08:30-09:30) masing-masing mendapat lebar 50% (AC-FR04-04)", () => {
      const sessions: TimetableSession[] = [
        {
          id: "ses-a",
          workspaceId: "ws-1",
          requirementId: "req-1",
          classId: "cls-7a",
          subjectId: "sub-1",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "08:00",
          endTime: "09:30",
          durationMinutes: 90,
        },
        {
          id: "ses-b",
          workspaceId: "ws-1",
          requirementId: "req-2",
          classId: "cls-7a",
          subjectId: "sub-2",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "08:30",
          endTime: "09:30",
          durationMinutes: 60,
        },
      ]

      const layoutMap = computeDaySessionClusters(sessions)
      expect(layoutMap.get("ses-a")).toEqual({
        colIndex: 0,
        colCount: 2,
        widthPercent: 50,
        leftPercent: 0,
      })
      expect(layoutMap.get("ses-b")).toEqual({
        colIndex: 1,
        colCount: 2,
        widthPercent: 50,
        leftPercent: 50,
      })
    })

    it("tiga sesi tumpang tindih simultan masing-masing mendapat lebar 33.33%", () => {
      const sessions: TimetableSession[] = [
        {
          id: "s1",
          workspaceId: "ws-1",
          requirementId: "r1",
          classId: "cls-7a",
          subjectId: "sub-1",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "08:00",
          endTime: "10:00",
          durationMinutes: 120,
        },
        {
          id: "s2",
          workspaceId: "ws-1",
          requirementId: "r2",
          classId: "cls-7a",
          subjectId: "sub-2",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "08:15",
          endTime: "09:15",
          durationMinutes: 60,
        },
        {
          id: "s3",
          workspaceId: "ws-1",
          requirementId: "r3",
          classId: "cls-7a",
          subjectId: "sub-3",
          teacherId: null,
          roomId: null,
          dayOfWeek: "monday",
          startTime: "08:30",
          endTime: "09:30",
          durationMinutes: 60,
        },
      ]

      const layoutMap = computeDaySessionClusters(sessions)
      expect(layoutMap.get("s1")?.colCount).toBe(3)
      expect(layoutMap.get("s2")?.colCount).toBe(3)
      expect(layoutMap.get("s3")?.colCount).toBe(3)
      expect(layoutMap.get("s1")?.widthPercent).toBeCloseTo(33.33, 1)
    })
  })

  describe("5. calculateKeyboardTimeShift & getAdjacentSchoolDay (Aksesibilitas Keyboard)", () => {
    const mondayConfig = dayConfigs[0] // 07:00 - 15:00

    it("menggeser waktu maju dan mundur sebesar deltaMinutes", () => {
      const shiftedForward = calculateKeyboardTimeShift("08:00", 60, 15, mondayConfig)
      expect(shiftedForward).toEqual({
        nextStartTime: "08:15",
        nextEndTime: "09:15",
      })

      const shiftedBackward = calculateKeyboardTimeShift("08:00", 60, -15, mondayConfig)
      expect(shiftedBackward).toEqual({
        nextStartTime: "07:45",
        nextEndTime: "08:45",
      })
    })

    it("tidak menggeser waktu melampaui batas awal atau akhir jam belajar hari terkait", () => {
      // 07:00 mundur 15 menit tetap di 07:00
      const clampedStart = calculateKeyboardTimeShift("07:00", 60, -15, mondayConfig)
      expect(clampedStart.nextStartTime).toBe("07:00")
      expect(clampedStart.nextEndTime).toBe("08:00")

      // 14:15 durasi 60 menit selesai 15:15 -> harus di-clamp agar tidak melebihi 15:00
      const clampedEnd = calculateKeyboardTimeShift("14:15", 60, 15, mondayConfig)
      expect(clampedEnd.nextStartTime).toBe("14:00")
      expect(clampedEnd.nextEndTime).toBe("15:00")
    })

    it("getAdjacentSchoolDay mencari hari aktif berikutnya/sebelumnya dan melompati hari libur", () => {
      // monday -> tuesday -> wednesday (hari aktif)
      expect(getAdjacentSchoolDay("monday", dayConfigs, "next")).toBe("tuesday")
      expect(getAdjacentSchoolDay("tuesday", dayConfigs, "next")).toBe("wednesday")
      // wednesday next melompati hari non-aktif hingga kembali ke monday (wrap around)
      expect(getAdjacentSchoolDay("wednesday", dayConfigs, "next")).toBe("monday")

      // monday prev melompati hari non-aktif hingga ke wednesday
      expect(getAdjacentSchoolDay("monday", dayConfigs, "prev")).toBe("wednesday")
    })
  })
})
