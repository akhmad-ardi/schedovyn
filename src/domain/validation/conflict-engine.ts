import { minutesToTime, timeToMinutes } from "@/domain/time/time-utils"
import {
  DAY_OF_WEEK_LABELS,
  type ClassGroup,
  type DayScheduleConfig,
  type Room,
  type Subject,
  type Teacher,
  type TimetableSession,
} from "@/domain/types/entities"
import type { ScheduleConflict } from "@/domain/types/validation"

export interface ConflictEvaluationParams {
  dayConfigs: readonly DayScheduleConfig[]
  classes: readonly ClassGroup[]
  teachers: readonly Teacher[]
  rooms: readonly Room[]
  subjects: readonly Subject[]
  sessions: readonly TimetableSession[]
}

interface ProcessedSession {
  session: TimetableSession
  startMinutes: number
  endMinutes: number
}

/**
 * Mendeteksi seluruh bentrokan waktu (konflik nyata) di seluruh ruang kerja.
 * Menggunakan pendekatan partisi harian dan algoritma Sort-and-Sweep dengan
 * early termination untuk menjamin performa tinggi (< 300 ms untuk 1.000 sesi).
 */
export function detectScheduleConflicts(
  params: ConflictEvaluationParams
): ScheduleConflict[] {
  const { dayConfigs, classes, teachers, rooms, subjects, sessions } = params

  if (sessions.length === 0) {
    return []
  }

  // Bangun lookup map untuk akses O(1)
  const classMap = new Map<string, ClassGroup>()
  for (const c of classes) {
    classMap.set(c.id, c)
  }

  const teacherMap = new Map<string, Teacher>()
  for (const t of teachers) {
    teacherMap.set(t.id, t)
  }

  const roomMap = new Map<string, Room>()
  for (const r of rooms) {
    roomMap.set(r.id, r)
  }

  const subjectMap = new Map<string, Subject>()
  for (const s of subjects) {
    subjectMap.set(s.id, s)
  }

  const dayConfigMap = new Map<string, DayScheduleConfig>()
  for (const d of dayConfigs) {
    dayConfigMap.set(d.dayOfWeek, d)
  }

  const conflicts: ScheduleConflict[] = []

  // 1. Partisi sesi berdasarkan hari
  const sessionsByDay = new Map<string, ProcessedSession[]>()
  for (const ses of sessions) {
    let dayList = sessionsByDay.get(ses.dayOfWeek)
    if (!dayList) {
      dayList = []
      sessionsByDay.set(ses.dayOfWeek, dayList)
    }
    dayList.push({
      session: ses,
      startMinutes: timeToMinutes(ses.startTime),
      endMinutes: timeToMinutes(ses.endTime),
    })
  }

  // 2. Evaluasi per hari
  for (const [dayOfWeek, daySessions] of sessionsByDay.entries()) {
    const dayConfig = dayConfigMap.get(dayOfWeek)
    const dayLabel = DAY_OF_WEEK_LABELS[dayOfWeek as keyof typeof DAY_OF_WEEK_LABELS] ?? dayOfWeek

    const dayStartMinutes = dayConfig ? timeToMinutes(dayConfig.startTime) : 420 // 07:00
    const dayEndMinutes = dayConfig ? timeToMinutes(dayConfig.endTime) : 960 // 16:00
    const isSchoolDay = dayConfig ? dayConfig.isSchoolDay : false

    // A. Evaluasi Sesi Tunggal (Jam Operasional, Waktu Istirahat, dan Ketersediaan)
    for (const item of daySessions) {
      const ses = item.session
      const sub = subjectMap.get(ses.subjectId)
      const subjectName = sub?.name ?? "Mata Pelajaran"
      const cls = classMap.get(ses.classId)
      const className = cls?.name ?? "Kelas"

      // A.1 Jam Operasional & Hari Libur
      if (!isSchoolDay) {
        conflicts.push({
          id: `OUTSIDE_OPERATING_HOURS::${ses.id}`,
          conflictType: "OUTSIDE_OPERATING_HOURS",
          severity: "error",
          dayOfWeek: ses.dayOfWeek,
          startTime: ses.startTime,
          endTime: ses.endTime,
          affectedSessionIds: [ses.id],
          affectedClassIds: [ses.classId],
          title: "Sesi di Luar Jam Belajar",
          description: `Sesi ${subjectName} pada kelas ${className} dijadwalkan pada hari libur (${dayLabel}).`,
        })
      } else if (
        item.startMinutes < dayStartMinutes ||
        item.endMinutes > dayEndMinutes
      ) {
        conflicts.push({
          id: `OUTSIDE_OPERATING_HOURS::${ses.id}`,
          conflictType: "OUTSIDE_OPERATING_HOURS",
          severity: "error",
          dayOfWeek: ses.dayOfWeek,
          startTime: ses.startTime,
          endTime: ses.endTime,
          affectedSessionIds: [ses.id],
          affectedClassIds: [ses.classId],
          title: "Sesi di Luar Jam Belajar",
          description: `Sesi ${subjectName} berada di luar jam operasional pembelajaran hari ${dayLabel} (${dayConfig?.startTime ?? "07:00"} - ${dayConfig?.endTime ?? "16:00"}).`,
        })
      }

      // A.2 Waktu Istirahat
      if (isSchoolDay && dayConfig?.breakIntervals) {
        for (const brk of dayConfig.breakIntervals) {
          const brkStartM = timeToMinutes(brk.startTime)
          const brkEndM = timeToMinutes(brk.endTime)

          if (item.startMinutes < brkEndM && brkStartM < item.endMinutes) {
            const overlapStartM = Math.max(item.startMinutes, brkStartM)
            const overlapEndM = Math.min(item.endMinutes, brkEndM)

            conflicts.push({
              id: `BREAK_TIME_OVERLAP::${ses.id}::${brk.id}`,
              conflictType: "BREAK_TIME_OVERLAP",
              severity: "error",
              dayOfWeek: ses.dayOfWeek,
              startTime: minutesToTime(overlapStartM),
              endTime: minutesToTime(overlapEndM),
              affectedSessionIds: [ses.id],
              affectedClassIds: [ses.classId],
              title: "Sesi Beririsan dengan Waktu Istirahat",
              description: `Sesi ${subjectName} beririsan dengan ${brk.label || "waktu istirahat"} (${brk.startTime} - ${brk.endTime}).`,
            })
          }
        }
      }

      // A.3 Ketersediaan Guru
      if (ses.teacherId) {
        const teacher = teacherMap.get(ses.teacherId)
        if (teacher?.unavailableIntervals) {
          for (const unv of teacher.unavailableIntervals) {
            if (unv.dayOfWeek === ses.dayOfWeek) {
              const unvStartM = timeToMinutes(unv.startTime)
              const unvEndM = timeToMinutes(unv.endTime)

              if (item.startMinutes < unvEndM && unvStartM < item.endMinutes) {
                const overlapStartM = Math.max(item.startMinutes, unvStartM)
                const overlapEndM = Math.min(item.endMinutes, unvEndM)

                conflicts.push({
                  id: `TEACHER_UNAVAILABLE::${ses.id}::${unv.id}`,
                  conflictType: "TEACHER_UNAVAILABLE",
                  severity: "error",
                  dayOfWeek: ses.dayOfWeek,
                  startTime: minutesToTime(overlapStartM),
                  endTime: minutesToTime(overlapEndM),
                  affectedSessionIds: [ses.id],
                  affectedClassIds: [ses.classId],
                  teacherId: teacher.id,
                  title: "Guru Tidak Bersedia",
                  description: `Guru ${teacher.name} tidak bersedia mengajar pada hari ${dayLabel}, ${unv.startTime} - ${unv.endTime}${unv.label ? ` (${unv.label})` : ""}.`,
                })
              }
            }
          }
        }
      }

      // A.4 Ketersediaan Ruangan
      if (ses.roomId) {
        const room = roomMap.get(ses.roomId)
        if (room?.unavailableIntervals) {
          for (const unv of room.unavailableIntervals) {
            if (unv.dayOfWeek === ses.dayOfWeek) {
              const unvStartM = timeToMinutes(unv.startTime)
              const unvEndM = timeToMinutes(unv.endTime)

              if (item.startMinutes < unvEndM && unvStartM < item.endMinutes) {
                const overlapStartM = Math.max(item.startMinutes, unvStartM)
                const overlapEndM = Math.min(item.endMinutes, unvEndM)

                conflicts.push({
                  id: `ROOM_UNAVAILABLE::${ses.id}::${unv.id}`,
                  conflictType: "ROOM_UNAVAILABLE",
                  severity: "error",
                  dayOfWeek: ses.dayOfWeek,
                  startTime: minutesToTime(overlapStartM),
                  endTime: minutesToTime(overlapEndM),
                  affectedSessionIds: [ses.id],
                  affectedClassIds: [ses.classId],
                  roomId: room.id,
                  title: "Ruangan Tidak Tersedia",
                  description: `Ruangan ${room.name} tidak tersedia pada hari ${dayLabel}, ${unv.startTime} - ${unv.endTime}${unv.label ? ` (${unv.label})` : ""}.`,
                })
              }
            }
          }
        }
      }
    }

    // B. Evaluasi Pasangan Sesi (Sort-and-Sweep)
    // Urutkan sesi pada hari tersebut berdasarkan startTime ASC
    daySessions.sort((a, b) => a.startMinutes - b.startMinutes)

    const count = daySessions.length
    for (let i = 0; i < count; i++) {
      const a = daySessions[i]
      const sesA = a.session

      for (let j = i + 1; j < count; j++) {
        const b = daySessions[j]
        const sesB = b.session

        // Early termination: karena daySessions sudah diurutkan berdasarkan startTime,
        // jika waktu mulai sesi B >= waktu selesai sesi A, maka semua sesi berikutnya
        // pasti juga tidak akan bertumpuk dengan sesi A.
        if (b.startMinutes >= a.endMinutes) {
          break
        }

        // Cek overlap: startA < endB && startB < endA
        if (a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes) {
          const overlapStartM = Math.max(a.startMinutes, b.startMinutes)
          const overlapEndM = Math.min(a.endMinutes, b.endMinutes)
          const overlapStartTime = minutesToTime(overlapStartM)
          const overlapEndTime = minutesToTime(overlapEndM)

          const affectedSessionIds = [sesA.id, sesB.id].sort()
          const affectedClassIds = Array.from(new Set([sesA.classId, sesB.classId]))

          const classA = classMap.get(sesA.classId)
          const classB = classMap.get(sesB.classId)
          const classNameA = classA?.name ?? "Kelas A"
          const classNameB = classB?.name ?? "Kelas B"

          // B.1 Bentrokan Kelas (CLASS_OVERLAP)
          if (sesA.classId === sesB.classId) {
            conflicts.push({
              id: `CLASS_OVERLAP::${affectedSessionIds.join("::")}`,
              conflictType: "CLASS_OVERLAP",
              severity: "error",
              dayOfWeek: sesA.dayOfWeek,
              startTime: overlapStartTime,
              endTime: overlapEndTime,
              affectedSessionIds,
              affectedClassIds,
              title: "Jadwal Kelas Tumpang Tindih",
              description: `Kelas ${classNameA} memiliki dua sesi pembelajaran bersamaan pada hari ${dayLabel}, ${overlapStartTime} - ${overlapEndTime}.`,
            })
          }

          // B.2 Bentrokan Guru (TEACHER_OVERLAP) - Lintas Kelas
          if (sesA.teacherId && sesB.teacherId && sesA.teacherId === sesB.teacherId) {
            const teacher = teacherMap.get(sesA.teacherId)
            const teacherName = teacher?.name ?? "Guru"

            const desc =
              sesA.classId !== sesB.classId
                ? `Guru ${teacherName} dijadwalkan mengajar kelas ${classNameA} dan kelas ${classNameB} secara bersamaan pada hari ${dayLabel}, ${overlapStartTime} - ${overlapEndTime}.`
                : `Guru ${teacherName} memiliki dua jadwal mengajar di kelas ${classNameA} secara bersamaan pada hari ${dayLabel}, ${overlapStartTime} - ${overlapEndTime}.`

            conflicts.push({
              id: `TEACHER_OVERLAP::${affectedSessionIds.join("::")}`,
              conflictType: "TEACHER_OVERLAP",
              severity: "error",
              dayOfWeek: sesA.dayOfWeek,
              startTime: overlapStartTime,
              endTime: overlapEndTime,
              affectedSessionIds,
              affectedClassIds,
              teacherId: sesA.teacherId,
              title: "Bentrokan Jadwal Guru",
              description: desc,
            })
          }

          // B.3 Bentrokan Ruangan (ROOM_OVERLAP) - Lintas Kelas
          if (sesA.roomId && sesB.roomId && sesA.roomId === sesB.roomId) {
            const room = roomMap.get(sesA.roomId)
            const roomName = room?.name ?? "Ruangan"

            const desc =
              sesA.classId !== sesB.classId
                ? `Ruangan ${roomName} digunakan oleh kelas ${classNameA} dan kelas ${classNameB} pada hari ${dayLabel}, ${overlapStartTime} - ${overlapEndTime}.`
                : `Ruangan ${roomName} digunakan secara bersamaan oleh dua sesi di kelas ${classNameA} pada hari ${dayLabel}, ${overlapStartTime} - ${overlapEndTime}.`

            conflicts.push({
              id: `ROOM_OVERLAP::${affectedSessionIds.join("::")}`,
              conflictType: "ROOM_OVERLAP",
              severity: "error",
              dayOfWeek: sesA.dayOfWeek,
              startTime: overlapStartTime,
              endTime: overlapEndTime,
              affectedSessionIds,
              affectedClassIds,
              roomId: sesA.roomId,
              title: "Bentrokan Pemakaian Ruangan",
              description: desc,
            })
          }
        }
      }
    }
  }

  return conflicts
}
