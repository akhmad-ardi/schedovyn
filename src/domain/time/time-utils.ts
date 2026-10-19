import type { SnapIntervalMinutes, TimeString } from "@/domain/types/entities"

const TIME_STRING_REGEX = /^(\d{2}):(\d{2})$/

export function isValidTimeString(value: string): value is TimeString {
  const match = TIME_STRING_REGEX.exec(value)
  if (!match) {
    return false
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return false
  }

  if (hours === 24 && minutes === 0) {
    return true
  }

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

export function timeToMinutes(time: TimeString): number {
  const [hoursStr, minutesStr] = time.split(":")
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number): TimeString {
  const clamped = Math.max(0, Math.min(1440, Math.round(totalMinutes)))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` as TimeString
}

export function addMinutesToTime(
  time: TimeString,
  deltaMinutes: number
): TimeString {
  return minutesToTime(timeToMinutes(time) + deltaMinutes)
}

export function getDurationMinutes(
  startTime: TimeString,
  endTime: TimeString
): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime)
}

export function snapMinutesToGrid(
  rawMinutes: number,
  originMinutes: number,
  snapInterval: SnapIntervalMinutes
): number {
  const offset = rawMinutes - originMinutes
  const snappedOffset = Math.round(offset / snapInterval) * snapInterval
  return originMinutes + snappedOffset
}
