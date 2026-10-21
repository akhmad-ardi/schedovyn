import type { TimetableSession } from "@/domain/types/entities"

/** Batas maksimal langkah riwayat yang disimpan di memori */
export const MAX_HISTORY_STEPS = 50

export interface ScheduleHistorySnapshot {
  actionLabel: string // Contoh: "Tempatkan Matematika ke Senin 07:30"
  timestamp: number
  sessions: TimetableSession[]
}

export interface ScheduleHistoryState {
  past: ScheduleHistorySnapshot[]
  future: ScheduleHistorySnapshot[]
}

/**
 * Membuat state riwayat jadwal awal yang bersih.
 */
export function createInitialHistoryState(): ScheduleHistoryState {
  return {
    past: [],
    future: [],
  }
}

/**
 * Mencatat langkah baru ke dalam riwayat:
 * 1. Mendorong salinan imutabel sessions saat ini ke bagian akhir tumpukan past.
 * 2. Membatasi panjang tumpukan past maksimal MAX_HISTORY_STEPS (membuang entri tertua jika melebihi batas).
 * 3. Mengosongkan tumpukan future (pemotongan cabang masa depan).
 */
export function recordHistoryStep(
  history: ScheduleHistoryState,
  currentSessions: readonly TimetableSession[],
  actionLabel: string
): ScheduleHistoryState {
  const snapshot: ScheduleHistorySnapshot = {
    actionLabel,
    timestamp: Date.now(),
    sessions: structuredClone(currentSessions) as TimetableSession[],
  }

  const nextPast = [...history.past.slice(-(MAX_HISTORY_STEPS - 1)), snapshot]

  return {
    past: nextPast,
    future: [],
  }
}

/**
 * Menjalankan operasi Undo:
 * 1. Mengambil snapshot terakhir dari past.
 * 2. Mendorong state sessions saat ini ke bagian depan future.
 * 3. Mengembalikan state history baru dan array sessions yang dipulihkan.
 * Mengembalikan null jika tumpukan past kosong.
 */
export function performHistoryUndo(
  history: ScheduleHistoryState,
  currentSessions: readonly TimetableSession[],
  currentActionLabel?: string
): {
  nextHistory: ScheduleHistoryState
  restoredSessions: TimetableSession[]
  restoredActionLabel: string
} | null {
  if (history.past.length === 0) {
    return null
  }

  const previousSnapshot = history.past[history.past.length - 1]
  const actionLabelForFuture = currentActionLabel ?? previousSnapshot.actionLabel
  const currentSnapshot: ScheduleHistorySnapshot = {
    actionLabel: actionLabelForFuture,
    timestamp: Date.now(),
    sessions: structuredClone(currentSessions) as TimetableSession[],
  }

  const nextPast = history.past.slice(0, -1)
  const nextFuture = [currentSnapshot, ...history.future].slice(
    0,
    MAX_HISTORY_STEPS
  )

  return {
    nextHistory: {
      past: nextPast,
      future: nextFuture,
    },
    restoredSessions: structuredClone(
      previousSnapshot.sessions
    ) as TimetableSession[],
    restoredActionLabel: previousSnapshot.actionLabel,
  }
}

/**
 * Menjalankan operasi Redo:
 * 1. Mengambil snapshot pertama dari future.
 * 2. Mendorong state sessions saat ini ke bagian akhir past.
 * 3. Mengembalikan state history baru dan array sessions yang dipulihkan.
 * Mengembalikan null jika tumpukan future kosong.
 */
export function performHistoryRedo(
  history: ScheduleHistoryState,
  currentSessions: readonly TimetableSession[],
  currentActionLabel?: string
): {
  nextHistory: ScheduleHistoryState
  restoredSessions: TimetableSession[]
  restoredActionLabel: string
} | null {
  if (history.future.length === 0) {
    return null
  }

  const nextSnapshot = history.future[0]
  const actionLabelForPast = currentActionLabel ?? nextSnapshot.actionLabel
  const currentSnapshot: ScheduleHistorySnapshot = {
    actionLabel: actionLabelForPast,
    timestamp: Date.now(),
    sessions: structuredClone(currentSessions) as TimetableSession[],
  }

  const nextFuture = history.future.slice(1)
  const nextPast = [...history.past.slice(-(MAX_HISTORY_STEPS - 1)), currentSnapshot]

  return {
    nextHistory: {
      past: nextPast,
      future: nextFuture,
    },
    restoredSessions: structuredClone(
      nextSnapshot.sessions
    ) as TimetableSession[],
    restoredActionLabel: nextSnapshot.actionLabel,
  }
}

/**
 * Parameter untuk membentuk label tindakan riwayat.
 */
export interface ActionLabelParams {
  type: "place" | "move" | "update_details" | "update_time" | "remove"
  subjectName?: string
  dayLabel?: string
  timeRange?: string
  extraDetail?: string
}

/**
 * Membentuk label tindakan Bahasa Indonesia yang deskriptif untuk berbagai jenis mutasi jadwal.
 */
export function formatScheduleActionLabel(params: ActionLabelParams): string {
  const { type, subjectName, dayLabel, timeRange, extraDetail } = params

  switch (type) {
    case "place":
      if (subjectName && dayLabel && timeRange) {
        return `Tempatkan ${subjectName} ke ${dayLabel} ${timeRange}`
      }
      if (subjectName && dayLabel) {
        return `Tempatkan ${subjectName} ke ${dayLabel}`
      }
      if (subjectName) {
        return `Tempatkan ${subjectName} ke grid`
      }
      return "Tempatkan sesi ke grid"

    case "move":
      if (subjectName && dayLabel && timeRange) {
        return `Pindahkan ${subjectName} ke ${dayLabel} ${timeRange}`
      }
      if (subjectName && dayLabel) {
        return `Pindahkan ${subjectName} ke ${dayLabel}`
      }
      if (subjectName) {
        return `Pindahkan ${subjectName}`
      }
      return "Pindahkan sesi jadwal"

    case "update_time":
      if (subjectName && timeRange) {
        return `Ubah jam ${subjectName} menjadi ${timeRange}`
      }
      if (subjectName) {
        return `Ubah jam ${subjectName}`
      }
      return "Ubah waktu sesi"

    case "update_details":
      if (subjectName && extraDetail) {
        return `Ubah detail ${subjectName} (${extraDetail})`
      }
      if (subjectName) {
        return `Ubah detail ${subjectName}`
      }
      return "Ubah detail sesi"

    case "remove":
      if (subjectName) {
        return `Lepas sesi ${subjectName} dari grid`
      }
      return "Lepas sesi dari grid"
  }
}
