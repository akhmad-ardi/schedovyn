import {
  ORDERED_DAYS_OF_WEEK,
  type DayOfWeek,
  type DayScheduleConfig,
  type SnapIntervalMinutes,
  type TimeString,
  type TimetableSession,
} from "@/domain/types/entities"
import { minutesToTime, timeToMinutes } from "@/domain/time/time-utils"

/** Skala vertikal: 1.6 piksel per menit (15 menit = 24px, 45 menit = 72px, 60 menit = 96px) */
export const PIXELS_PER_MINUTE = 1.6

export interface GridBoundaries {
  originMinutes: number // Menit awal grid (paling pagi di antara hari sekolah aktif)
  maxMinutes: number // Menit akhir grid (paling sore di antara hari sekolah aktif)
  totalMinutes: number
  totalHeightPx: number
}

export interface SessionClusterLayout {
  colIndex: number // Indeks kolom horizontal dalam grup bertumpuk (0 .. colCount - 1)
  colCount: number // Total kolom yang saling beririsan
  widthPercent: number // 100 / colCount
  leftPercent: number // (100 / colCount) * colIndex
}

/**
 * Menghitung batas waktu global (paling awal dan paling akhir) dari hari-hari sekolah yang aktif.
 * Jika tidak ada hari sekolah aktif, gunakan batas default 07:00 (420 menit) hingga 16:00 (960 menit).
 */
export function calculateGridBoundaries(
  dayConfigs: readonly DayScheduleConfig[]
): GridBoundaries {
  const activeDays = dayConfigs.filter((d) => d.isSchoolDay)
  if (activeDays.length === 0) {
    const originMinutes = 420 // 07:00
    const maxMinutes = 960 // 16:00
    const totalMinutes = maxMinutes - originMinutes
    return {
      originMinutes,
      maxMinutes,
      totalMinutes,
      totalHeightPx: totalMinutes * PIXELS_PER_MINUTE,
    }
  }

  let originMinutes = Math.min(
    ...activeDays.map((d) => timeToMinutes(d.startTime))
  )
  let maxMinutes = Math.max(
    ...activeDays.map((d) => timeToMinutes(d.endTime))
  )

  if (originMinutes >= maxMinutes) {
    originMinutes = 420
    maxMinutes = 960
  }

  const totalMinutes = maxMinutes - originMinutes
  return {
    originMinutes,
    maxMinutes,
    totalMinutes,
    totalHeightPx: totalMinutes * PIXELS_PER_MINUTE,
  }
}

/**
 * Mengonversi TimeString ("HH:mm") ke posisi vertikal piksel (top) relatif terhadap originMinutes.
 */
export function timeToGridTopPx(
  time: TimeString,
  originMinutes: number,
  pixelsPerMinute: number = PIXELS_PER_MINUTE
): number {
  return (timeToMinutes(time) - originMinutes) * pixelsPerMinute
}

/**
 * Mengonversi durasi menit ke tinggi piksel (height).
 */
export function durationToGridHeightPx(
  durationMinutes: number,
  pixelsPerMinute: number = PIXELS_PER_MINUTE
): number {
  return durationMinutes * pixelsPerMinute
}

/**
 * Mengonversi offset Y piksel pada kolom hari menjadi menit yang telah di-snap ke interval terdekat.
 */
export function offsetYToSnappedMinutes(
  offsetY: number,
  originMinutes: number,
  snapIntervalMinutes: SnapIntervalMinutes,
  pixelsPerMinute: number = PIXELS_PER_MINUTE
): number {
  const minutes = offsetY / pixelsPerMinute
  const snapped = Math.round(minutes / snapIntervalMinutes) * snapIntervalMinutes
  return originMinutes + snapped
}

/**
 * Memastikan nilai menit tidak melampaui batas jam belajar hari tertentu.
 */
export function clampMinutes(
  minutes: number,
  minMinutes: number,
  maxMinutes: number
): number {
  return Math.min(maxMinutes, Math.max(minMinutes, minutes))
}

/**
 * Mengelompokkan sesi-sesi pada hari yang sama yang saling tumpang tindih interval waktunya
 * untuk menghasilkan layout pembagian lebar kolom (overlap clustering).
 */
export function computeDaySessionClusters(
  sessionsOnDay: readonly TimetableSession[]
): Map<string, SessionClusterLayout> {
  const layoutMap = new Map<string, SessionClusterLayout>()
  if (sessionsOnDay.length === 0) {
    return layoutMap
  }

  // Urutkan berdasarkan waktu mulai menaik, lalu durasi menurun
  const sorted = [...sessionsOnDay].sort((a, b) => {
    const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    if (startDiff !== 0) return startDiff
    return b.durationMinutes - a.durationMinutes
  })

  // Kelompokkan sesi yang saling tumpang tindih (startA < endB && startB < endA)
  const clusters: TimetableSession[][] = []
  let currentCluster: TimetableSession[] = []
  let currentClusterEnd = -1

  for (const session of sorted) {
    const startM = timeToMinutes(session.startTime)
    const endM = timeToMinutes(session.endTime)

    if (currentCluster.length === 0) {
      currentCluster.push(session)
      currentClusterEnd = endM
    } else {
      if (startM < currentClusterEnd) {
        currentCluster.push(session)
        currentClusterEnd = Math.max(currentClusterEnd, endM)
      } else {
        clusters.push(currentCluster)
        currentCluster = [session]
        currentClusterEnd = endM
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  // Tentukan kolom untuk setiap sesi di dalam cluster (greedy column assignment)
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      layoutMap.set(cluster[0].id, {
        colIndex: 0,
        colCount: 1,
        widthPercent: 100,
        leftPercent: 0,
      })
      continue
    }

    const columnEndTimes: number[] = []
    const sessionAssignments = new Map<string, number>()

    for (const session of cluster) {
      const startM = timeToMinutes(session.startTime)
      const endM = timeToMinutes(session.endTime)

      let placedCol = -1
      for (let i = 0; i < columnEndTimes.length; i++) {
        if (columnEndTimes[i] <= startM) {
          placedCol = i
          columnEndTimes[i] = endM
          break
        }
      }

      if (placedCol === -1) {
        placedCol = columnEndTimes.length
        columnEndTimes.push(endM)
      }

      sessionAssignments.set(session.id, placedCol)
    }

    const colCount = columnEndTimes.length
    const widthPercent = 100 / colCount

    for (const session of cluster) {
      const colIndex = sessionAssignments.get(session.id) ?? 0
      layoutMap.set(session.id, {
        colIndex,
        colCount,
        widthPercent,
        leftPercent: widthPercent * colIndex,
      })
    }
  }

  return layoutMap
}

/**
 * Menghitung pergeseran waktu sesi untuk pintasan keyboard (Alt + ArrowUp / ArrowDown).
 */
export function calculateKeyboardTimeShift(
  currentStartTime: TimeString,
  durationMinutes: number,
  deltaMinutes: number,
  dayConfig: DayScheduleConfig
): { nextStartTime: TimeString; nextEndTime: TimeString } {
  const currentStartM = timeToMinutes(currentStartTime)
  const minM = timeToMinutes(dayConfig.startTime)
  const maxM = timeToMinutes(dayConfig.endTime)

  let targetStartM = currentStartM + deltaMinutes

  if (targetStartM < minM) {
    targetStartM = minM
  }
  if (targetStartM + durationMinutes > maxM) {
    targetStartM = maxM - durationMinutes
  }
  if (targetStartM < minM) {
    targetStartM = minM
  }

  const nextStartTime = minutesToTime(targetStartM)
  const nextEndTime = minutesToTime(targetStartM + durationMinutes)

  return { nextStartTime, nextEndTime }
}

/**
 * Mencari hari sekolah aktif berikutnya atau sebelumnya untuk pintasan keyboard (Alt + ArrowLeft / ArrowRight).
 */
export function getAdjacentSchoolDay(
  currentDay: DayOfWeek,
  dayConfigs: readonly DayScheduleConfig[],
  direction: "next" | "prev"
): DayOfWeek {
  const activeDays = ORDERED_DAYS_OF_WEEK.filter((d) =>
    dayConfigs.some((dc) => dc.dayOfWeek === d && dc.isSchoolDay)
  )

  if (activeDays.length === 0) {
    return currentDay
  }

  let currentIndex = activeDays.indexOf(currentDay)
  if (currentIndex === -1) {
    const allIndex = ORDERED_DAYS_OF_WEEK.indexOf(currentDay)
    currentIndex = 0
    for (let i = 0; i < activeDays.length; i++) {
      if (ORDERED_DAYS_OF_WEEK.indexOf(activeDays[i]) > allIndex) {
        currentIndex = i
        break
      }
    }
  }

  const delta = direction === "next" ? 1 : -1
  const nextIndex =
    (currentIndex + delta + activeDays.length) % activeDays.length

  return activeDays[nextIndex]
}
