import { describe, expect, it } from "vitest"
import {
  ROOM_TYPE_LABELS,
  ROOM_TYPE_OPTIONS,
  SUBJECT_COLOR_LABELS,
  SUBJECT_COLOR_OPTIONS,
  type ClassGroup,
  type Room,
  type RoomType,
  type Subject,
  type SubjectColorKey,
  type Teacher,
  type TeachingRequirement,
} from "@/domain/types/entities"
import {
  validateClassGroupInput,
  validateRoomInput,
  validateSubjectInput,
  validateTeacherInput,
  validateTeachingRequirementInput,
} from "@/domain/validation/master-data-validator"

const existingClasses: ClassGroup[] = [
  {
    id: "cls-1",
    workspaceId: "ws-1",
    name: "VII-A",
    grade: "VII",
    notes: "Lantai 1",
  },
  {
    id: "cls-2",
    workspaceId: "ws-1",
    name: "VIII-B",
    grade: "VIII",
  },
]

const existingSubjects: Subject[] = [
  {
    id: "sub-1",
    workspaceId: "ws-1",
    name: "Matematika",
    colorKey: "blue",
  },
  {
    id: "sub-2",
    workspaceId: "ws-1",
    name: "Bahasa Indonesia",
    colorKey: "emerald",
  },
]

const existingTeachers: Teacher[] = [
  {
    id: "tch-1",
    workspaceId: "ws-1",
    name: "Budi Santoso",
    unavailableIntervals: [],
  },
]

const existingRooms: Room[] = [
  {
    id: "rm-1",
    workspaceId: "ws-1",
    name: "Lab IPA 1",
    type: "laboratory",
    unavailableIntervals: [],
  },
]

const existingRequirements: TeachingRequirement[] = [
  {
    id: "req-1",
    workspaceId: "ws-1",
    classId: "cls-1",
    subjectId: "sub-1",
    defaultTeacherId: "tch-1",
    defaultRoomId: "rm-1",
    sessionsPerWeek: 3,
    durationMinutes: 90,
    roomRequired: true,
  },
]

describe("FR-02: Konstanta Tipe & Validator Data Master", () => {
  describe("Konstanta Opsi & Label Bahasa Indonesia", () => {
    it("menyediakan ROOM_TYPE_OPTIONS, ROOM_TYPE_LABELS, SUBJECT_COLOR_OPTIONS, dan SUBJECT_COLOR_LABELS", () => {
      expect(ROOM_TYPE_OPTIONS).toEqual([
        "classroom",
        "laboratory",
        "sports",
        "hall",
        "other",
      ])
      expect(ROOM_TYPE_LABELS.laboratory).toBe("Laboratorium")

      expect(SUBJECT_COLOR_OPTIONS).toContain("blue")
      expect(SUBJECT_COLOR_OPTIONS).toContain("emerald")
      expect(SUBJECT_COLOR_OPTIONS).toHaveLength(10)
      expect(SUBJECT_COLOR_LABELS.blue).toBe("Biru")
    })
  })

  describe("validateClassGroupInput (FR-02.A)", () => {
    it("menerima input kelas yang valid dan unik", () => {
      const result = validateClassGroupInput(
        { name: "VII-B", grade: "VII", notes: "Kelas Baru" },
        existingClasses
      )
      expect(result.isValid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it("menolak nama kelas kosong atau tingkat kosong", () => {
      const result = validateClassGroupInput(
        { name: "   ", grade: "" },
        existingClasses
      )
      expect(result.isValid).toBe(false)
      expect(result.issues.map((i) => i.code)).toContain("EMPTY_CLASS_NAME")
      expect(result.issues.map((i) => i.code)).toContain("EMPTY_CLASS_GRADE")
    })

    it("AC-FR02-02: menolak duplikasi nama kelas secara case-insensitive tetapi mengizinkan editingId yang sama", () => {
      const duplicate = validateClassGroupInput(
        { name: "  vii-a ", grade: "VII" },
        existingClasses
      )
      expect(duplicate.isValid).toBe(false)
      expect(duplicate.issues.map((i) => i.code)).toContain(
        "DUPLICATE_CLASS_NAME"
      )

      const selfEdit = validateClassGroupInput(
        { name: "VII-A", grade: "VII", notes: "Diperbarui" },
        existingClasses,
        "cls-1"
      )
      expect(selfEdit.isValid).toBe(true)
    })
  })

  describe("validateSubjectInput (FR-02.C)", () => {
    it("menerima input mata pelajaran yang valid", () => {
      const result = validateSubjectInput(
        { name: "Fisika", colorKey: "violet" },
        existingSubjects
      )
      expect(result.isValid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it("menolak nama kosong, duplikasi nama case-insensitive, dan colorKey tidak valid", () => {
      const emptyResult = validateSubjectInput(
        { name: "  ", colorKey: "blue" },
        existingSubjects
      )
      expect(emptyResult.isValid).toBe(false)
      expect(emptyResult.issues.map((i) => i.code)).toContain(
        "EMPTY_SUBJECT_NAME"
      )

      const dupResult = validateSubjectInput(
        { name: "matematika", colorKey: "amber" },
        existingSubjects
      )
      expect(dupResult.isValid).toBe(false)
      expect(dupResult.issues.map((i) => i.code)).toContain(
        "DUPLICATE_SUBJECT_NAME"
      )

      const invalidColorResult = validateSubjectInput(
        { name: "Kimia", colorKey: "pink" as unknown as SubjectColorKey },
        existingSubjects
      )
      expect(invalidColorResult.isValid).toBe(false)
      expect(invalidColorResult.issues.map((i) => i.code)).toContain(
        "INVALID_SUBJECT_COLOR"
      )
    })
  })

  describe("validateTeacherInput & validateRoomInput (FR-02.B, FR-02.D, AC-05)", () => {
    it("menolak nama guru kosong dan nama ruangan kosong/duplikat/jenis tidak valid", () => {
      const teacherRes = validateTeacherInput({ name: " " }, existingTeachers)
      expect(teacherRes.isValid).toBe(false)
      expect(teacherRes.issues.map((i) => i.code)).toContain(
        "EMPTY_TEACHER_NAME"
      )

      const roomEmptyRes = validateRoomInput(
        { name: "", type: "classroom" },
        existingRooms
      )
      expect(roomEmptyRes.isValid).toBe(false)
      expect(roomEmptyRes.issues.map((i) => i.code)).toContain(
        "EMPTY_ROOM_NAME"
      )

      const roomDupRes = validateRoomInput(
        { name: "lab ipa 1", type: "laboratory" },
        existingRooms
      )
      expect(roomDupRes.isValid).toBe(false)
      expect(roomDupRes.issues.map((i) => i.code)).toContain(
        "DUPLICATE_ROOM_NAME"
      )

      const roomInvalidTypeRes = validateRoomInput(
        { name: "Aula Utama", type: "auditorium" as unknown as RoomType },
        existingRooms
      )
      expect(roomInvalidTypeRes.isValid).toBe(false)
      expect(roomInvalidTypeRes.issues.map((i) => i.code)).toContain(
        "INVALID_ROOM_TYPE"
      )
    })

    it("AC-FR02-03 & AC-05: menerima dua unavailableIntervals berurutan yang berbatasan tepat (08:00-09:30 dan 09:30-11:00)", () => {
      const result = validateTeacherInput({
        name: "Siti Aminah",
        unavailableIntervals: [
          {
            id: "unv-1",
            dayOfWeek: "monday",
            startTime: "08:00",
            endTime: "09:30",
            label: "MGMP Pagi",
          },
          {
            id: "unv-2",
            dayOfWeek: "monday",
            startTime: "09:30",
            endTime: "11:00",
            label: "Dinas Luar",
          },
        ],
      })

      expect(result.isValid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it("AC-FR02-03: menolak unavailableIntervals yang beririsan pada hari yang sama atau startTime >= endTime", () => {
      const overlapRes = validateRoomInput(
        {
          name: "Lapangan Utama",
          type: "sports",
          unavailableIntervals: [
            {
              id: "unv-a",
              dayOfWeek: "monday",
              startTime: "08:00",
              endTime: "09:30",
            },
            {
              id: "unv-b",
              dayOfWeek: "monday",
              startTime: "09:00",
              endTime: "10:00",
            },
          ],
        },
        existingRooms
      )
      expect(overlapRes.isValid).toBe(false)
      expect(overlapRes.issues.map((i) => i.code)).toContain(
        "UNAVAILABLE_INTERVAL_OVERLAP"
      )

      const reversedRes = validateTeacherInput({
        name: "Ahmad Dahlan",
        unavailableIntervals: [
          {
            id: "unv-rev",
            dayOfWeek: "friday",
            startTime: "10:00",
            endTime: "08:00",
          },
        ],
      })
      expect(reversedRes.isValid).toBe(false)
      expect(reversedRes.issues.map((i) => i.code)).toContain(
        "UNAVAILABLE_END_BEFORE_START"
      )
    })
  })

  describe("validateTeachingRequirementInput (FR-02.E)", () => {
    const context = {
      classes: existingClasses,
      subjects: existingSubjects,
      teachers: existingTeachers,
      rooms: existingRooms,
      existingRequirements,
    }

    it("menerima kebutuhan pembelajaran baru yang valid", () => {
      const result = validateTeachingRequirementInput(
        {
          classId: "cls-1",
          subjectId: "sub-2",
          defaultTeacherId: "tch-1",
          defaultRoomId: null,
          sessionsPerWeek: 2,
          durationMinutes: 45,
          roomRequired: false,
        },
        context
      )
      expect(result.isValid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it("AC-FR02-02: menolak duplikasi pasangan (classId, subjectId) kecuali untuk editingId yang sama", () => {
      const dupRes = validateTeachingRequirementInput(
        {
          classId: "cls-1",
          subjectId: "sub-1",
          defaultTeacherId: null,
          defaultRoomId: null,
          sessionsPerWeek: 2,
          durationMinutes: 45,
          roomRequired: false,
        },
        context
      )
      expect(dupRes.isValid).toBe(false)
      expect(dupRes.issues.map((i) => i.code)).toContain(
        "REQUIREMENT_DUPLICATE_CLASS_SUBJECT"
      )

      const editRes = validateTeachingRequirementInput(
        {
          classId: "cls-1",
          subjectId: "sub-1",
          defaultTeacherId: "tch-1",
          defaultRoomId: "rm-1",
          sessionsPerWeek: 4,
          durationMinutes: 90,
          roomRequired: true,
        },
        context,
        "req-1"
      )
      expect(editRes.isValid).toBe(true)
    })

    it("AC-FR02-02: menolak referensi ID tidak valid serta nilai sessionsPerWeek atau durationMinutes di luar batas", () => {
      const invalidRes = validateTeachingRequirementInput(
        {
          classId: "cls-missing",
          subjectId: "sub-missing",
          defaultTeacherId: "tch-missing",
          defaultRoomId: "rm-missing",
          sessionsPerWeek: 0,
          durationMinutes: 3,
          roomRequired: true,
        },
        context
      )
      expect(invalidRes.isValid).toBe(false)
      const codes = invalidRes.issues.map((i) => i.code)
      expect(codes).toContain("REQUIREMENT_INVALID_CLASS")
      expect(codes).toContain("REQUIREMENT_INVALID_SUBJECT")
      expect(codes).toContain("REQUIREMENT_INVALID_TEACHER")
      expect(codes).toContain("REQUIREMENT_INVALID_ROOM")
      expect(codes).toContain("REQUIREMENT_INVALID_SESSIONS_PER_WEEK")
      expect(codes).toContain("REQUIREMENT_INVALID_DURATION")
    })
  })
})
