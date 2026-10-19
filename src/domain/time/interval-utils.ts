import type { TimeString } from "@/domain/types/entities"
import { minutesToTime, timeToMinutes } from "@/domain/time/time-utils"

export function doIntervalsOverlap(
  startA: TimeString,
  endA: TimeString,
  startB: TimeString,
  endB: TimeString
): boolean {
  const sA = timeToMinutes(startA)
  const eA = timeToMinutes(endA)
  const sB = timeToMinutes(startB)
  const eB = timeToMinutes(endB)
  return sA < eB && sB < eA
}

export function getOverlapRange(
  startA: TimeString,
  endA: TimeString,
  startB: TimeString,
  endB: TimeString
): { startTime: TimeString; endTime: TimeString } | null {
  if (!doIntervalsOverlap(startA, endA, startB, endB)) {
    return null
  }

  const overlapStart = Math.max(timeToMinutes(startA), timeToMinutes(startB))
  const overlapEnd = Math.min(timeToMinutes(endA), timeToMinutes(endB))

  return {
    startTime: minutesToTime(overlapStart),
    endTime: minutesToTime(overlapEnd),
  }
}

export function isIntervalWithinBounds(
  innerStart: TimeString,
  innerEnd: TimeString,
  outerStart: TimeString,
  outerEnd: TimeString
): boolean {
  const iStart = timeToMinutes(innerStart)
  const iEnd = timeToMinutes(innerEnd)
  const oStart = timeToMinutes(outerStart)
  const oEnd = timeToMinutes(outerEnd)

  return iStart >= oStart && iEnd <= oEnd
}
