import { describe, expect, it } from "vitest"
import {
  addMinutesToTime,
  getDurationMinutes,
  isValidTimeString,
  minutesToTime,
  snapMinutesToGrid,
  timeToMinutes,
} from "@/domain/time/time-utils"
import {
  doIntervalsOverlap,
  getOverlapRange,
  isIntervalWithinBounds,
} from "@/domain/time/interval-utils"
import type { SnapIntervalMinutes } from "@/domain/types/entities"

describe("FR-01 & FR-05.7: Matematika Waktu & Utilitas Interval", () => {
  describe("isValidTimeString", () => {
    it("menerima format waktu 24 jam HH:mm yang valid", () => {
      expect(isValidTimeString("00:00")).toBe(true)
      expect(isValidTimeString("07:00")).toBe(true)
      expect(isValidTimeString("07:30")).toBe(true)
      expect(isValidTimeString("13:45")).toBe(true)
      expect(isValidTimeString("23:59")).toBe(true)
      expect(isValidTimeString("24:00")).toBe(true)
    })

    it("menolak format waktu yang tidak valid", () => {
      expect(isValidTimeString("7:30")).toBe(false)
      expect(isValidTimeString("25:00")).toBe(false)
      expect(isValidTimeString("24:01")).toBe(false)
      expect(isValidTimeString("08:60")).toBe(false)
      expect(isValidTimeString("-01:00")).toBe(false)
      expect(isValidTimeString("08:5")).toBe(false)
      expect(isValidTimeString("invalid")).toBe(false)
      expect(isValidTimeString("")).toBe(false)
    })
  })

  describe("timeToMinutes & minutesToTime", () => {
    it("mengonversi TimeString ke menit sejak tengah malam secara akurat", () => {
      expect(timeToMinutes("00:00")).toBe(0)
      expect(timeToMinutes("07:00")).toBe(420)
      expect(timeToMinutes("09:30")).toBe(570)
      expect(timeToMinutes("12:45")).toBe(765)
      expect(timeToMinutes("23:59")).toBe(1439)
      expect(timeToMinutes("24:00")).toBe(1440)
    })

    it("mengonversi menit kembali ke TimeString dan membatasi dalam rentang 0..1440", () => {
      expect(minutesToTime(0)).toBe("00:00")
      expect(minutesToTime(420)).toBe("07:00")
      expect(minutesToTime(570)).toBe("09:30")
      expect(minutesToTime(765)).toBe("12:45")
      expect(minutesToTime(1440)).toBe("24:00")
      expect(minutesToTime(-15)).toBe("00:00")
      expect(minutesToTime(1500)).toBe("24:00")
    })
  })

  describe("addMinutesToTime & getDurationMinutes", () => {
    it("menambahkan menit positif dan negatif pada TimeString", () => {
      expect(addMinutesToTime("07:00", 45)).toBe("07:45")
      expect(addMinutesToTime("09:30", 90)).toBe("11:00")
      expect(addMinutesToTime("10:00", -30)).toBe("09:30")
    })

    it("menghitung durasi menit antara dua waktu", () => {
      expect(getDurationMinutes("07:00", "07:45")).toBe(45)
      expect(getDurationMinutes("07:00", "15:00")).toBe(480)
      expect(getDurationMinutes("09:30", "10:00")).toBe(30)
    })
  })

  describe("snapMinutesToGrid", () => {
    const snapOptions: SnapIntervalMinutes[] = [5, 10, 15, 30, 60]

    it("membulatkan menit ke kelipatan snapIntervalMinutes terdekat dari originMinutes", () => {
      const origin = 420 // 07:00
      expect(snapMinutesToGrid(422, origin, 5)).toBe(420)
      expect(snapMinutesToGrid(423, origin, 5)).toBe(425)
      expect(snapMinutesToGrid(424, origin, 10)).toBe(420)
      expect(snapMinutesToGrid(426, origin, 10)).toBe(430)
      expect(snapMinutesToGrid(427, origin, 15)).toBe(420)
      expect(snapMinutesToGrid(428, origin, 15)).toBe(435)
      expect(snapMinutesToGrid(434, origin, 30)).toBe(420)
      expect(snapMinutesToGrid(436, origin, 30)).toBe(450)
      expect(snapMinutesToGrid(449, origin, 60)).toBe(420)
      expect(snapMinutesToGrid(451, origin, 60)).toBe(480)

      for (const interval of snapOptions) {
        expect(snapMinutesToGrid(origin, origin, interval)).toBe(origin)
      }
    })
  })

  describe("doIntervalsOverlap & getOverlapRange (FR-05.7, AC-05)", () => {
    it("AC-05: dua interval berurutan yang berbatasan tepat TIDAK dianggap bertabrakan", () => {
      expect(doIntervalsOverlap("08:00", "09:00", "09:00", "10:00")).toBe(false)
      expect(doIntervalsOverlap("09:00", "10:00", "08:00", "09:00")).toBe(false)
      expect(doIntervalsOverlap("09:30", "10:00", "10:00", "10:15")).toBe(false)

      expect(getOverlapRange("08:00", "09:00", "09:00", "10:00")).toBeNull()
      expect(getOverlapRange("09:30", "10:00", "10:00", "10:15")).toBeNull()
    })

    it("mendeteksi dua interval yang beririsan sebagian dan mengembalikan rentang irisannya", () => {
      expect(doIntervalsOverlap("08:00", "09:00", "08:30", "09:30")).toBe(true)
      expect(getOverlapRange("08:00", "09:00", "08:30", "09:30")).toEqual({
        startTime: "08:30",
        endTime: "09:00",
      })

      expect(doIntervalsOverlap("08:30", "09:30", "08:00", "09:00")).toBe(true)
      expect(getOverlapRange("08:30", "09:30", "08:00", "09:00")).toEqual({
        startTime: "08:30",
        endTime: "09:00",
      })
    })

    it("mendeteksi satu interval yang berada sepenuhnya di dalam interval lain", () => {
      expect(doIntervalsOverlap("07:00", "15:00", "09:30", "10:00")).toBe(true)
      expect(getOverlapRange("07:00", "15:00", "09:30", "10:00")).toEqual({
        startTime: "09:30",
        endTime: "10:00",
      })
    })

    it("mendeteksi dua interval yang identik sebagai bertabrakan", () => {
      expect(doIntervalsOverlap("09:30", "10:00", "09:30", "10:00")).toBe(true)
      expect(getOverlapRange("09:30", "10:00", "09:30", "10:00")).toEqual({
        startTime: "09:30",
        endTime: "10:00",
      })
    })
  })

  describe("isIntervalWithinBounds", () => {
    it("mengembalikan true jika interval dalam berada di dalam atau tepat pada batas luar", () => {
      expect(isIntervalWithinBounds("09:30", "10:00", "07:00", "15:00")).toBe(true)
      expect(isIntervalWithinBounds("07:00", "15:00", "07:00", "15:00")).toBe(true)
      expect(isIntervalWithinBounds("07:00", "07:30", "07:00", "15:00")).toBe(true)
      expect(isIntervalWithinBounds("14:30", "15:00", "07:00", "15:00")).toBe(true)
    })

    it("mengembalikan false jika interval dalam melewati batas mulai atau selesai jam operasional", () => {
      expect(isIntervalWithinBounds("06:45", "07:15", "07:00", "15:00")).toBe(false)
      expect(isIntervalWithinBounds("14:30", "15:30", "07:00", "15:00")).toBe(false)
      expect(isIntervalWithinBounds("06:30", "15:30", "07:00", "15:00")).toBe(false)
    })
  })
})
