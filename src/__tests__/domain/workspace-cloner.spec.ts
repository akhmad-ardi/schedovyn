import { describe, expect, it } from "vitest"
import type {
  ClassGroup,
  CreateWorkspaceInput,
  DayScheduleConfig,
  DuplicateWorkspaceInput,
  Room,
  Subject,
  Teacher,
  TeachingRequirement,
  TimetableSession,
  Workspace,
} from "@/domain/types/entities"
import {
  cloneWorkspaceSnapshot,
  createBlankWorkspaceBundle,
  validateWorkspaceMetaInput,
  type WorkspaceEntityBundle,
} from "@/domain/workspace/workspace-cloner"

describe("FR-13 & AC-14: Domain Workspace Cloner & Initializer (workspace-cloner)", () => {
  describe("validateWorkspaceMetaInput", () => {
    it("mengembalikan valid: true saat input metadata lengkap dan benar", () => {
      const result = validateWorkspaceMetaInput({
        name: "SMA Harapan Bangsa",
        academicPeriod: "Semester Genap 2026/2027",
        defaultSnapIntervalMinutes: 15,
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it("menolak nama ruang kerja yang kosong atau hanya berisi spasi", () => {
      const result = validateWorkspaceMetaInput({
        name: "   ",
        academicPeriod: "Semester Genap 2026/2027",
        defaultSnapIntervalMinutes: 30,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Nama ruang kerja tidak boleh kosong.")
    })

    it("menolak periode akademik yang kosong atau hanya berisi spasi", () => {
      const result = validateWorkspaceMetaInput({
        name: "SMP Negeri 1 Nusantara",
        academicPeriod: "  \t  ",
        defaultSnapIntervalMinutes: 30,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Periode akademik tidak boleh kosong.")
    })

    it("menolak interval snap default di luar opsi yang diizinkan (5, 10, 15, 30, 60)", () => {
      const result = validateWorkspaceMetaInput({
        name: "SMP Negeri 1 Nusantara",
        academicPeriod: "Semester Ganjil 2026/2027",
        defaultSnapIntervalMinutes: 25,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "Interval snap default harus bernilai 5, 10, 15, 30, atau 60 menit."
      )
    })

    it("mengumpulkan seluruh kesalahan validasi saat beberapa bidang tidak valid", () => {
      const result = validateWorkspaceMetaInput({
        name: "",
        academicPeriod: "",
        defaultSnapIntervalMinutes: 40,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
    })
  })

  describe("createBlankWorkspaceBundle (AC-14.1)", () => {
    it("menghasilkan bundel ruang kerja kosong dengan 7 konfigurasi hari dan data master kosong", () => {
      const input: CreateWorkspaceInput = {
        name: "  SMA Harapan Bangsa  ",
        academicPeriod: "  Semester Genap 2026/2027  ",
        defaultSnapIntervalMinutes: 15,
        initMode: "BLANK",
      }

      let idCounter = 1
      const fakeGenerateId = () => `id-${idCounter++}`
      const fixedIso = "2026-11-14T10:00:00.000Z"

      const bundle = createBlankWorkspaceBundle({
        input,
        generateId: fakeGenerateId,
        nowIso: fixedIso,
      })

      // 1. Verifikasi metadata Workspace
      expect(bundle.workspace.id).toBe("id-1")
      expect(bundle.workspace.name).toBe("SMA Harapan Bangsa")
      expect(bundle.workspace.academicPeriod).toBe("Semester Genap 2026/2027")
      expect(bundle.workspace.activeClassId).toBeNull()
      expect(bundle.workspace.defaultSnapIntervalMinutes).toBe(15)
      expect(bundle.workspace.createdAt).toBe(fixedIso)
      expect(bundle.workspace.updatedAt).toBe(fixedIso)

      // 2. Verifikasi 7 Konfigurasi Hari
      expect(bundle.dayConfigs).toHaveLength(7)
      const dayMap = new Map(bundle.dayConfigs.map((d) => [d.dayOfWeek, d]))

      const monday = dayMap.get("monday")!
      expect(monday.isSchoolDay).toBe(true)
      expect(monday.startTime).toBe("07:00")
      expect(monday.endTime).toBe("14:00")
      expect(monday.snapIntervalMinutes).toBe(15)
      expect(monday.breakIntervals).toHaveLength(1)
      expect(monday.breakIntervals[0].startTime).toBe("09:45")
      expect(monday.breakIntervals[0].endTime).toBe("10:15")
      expect(monday.breakIntervals[0].label).toBe("Istirahat Pagi")

      const friday = dayMap.get("friday")!
      expect(friday.isSchoolDay).toBe(true)
      expect(friday.startTime).toBe("07:00")
      expect(friday.endTime).toBe("11:30")
      expect(friday.breakIntervals).toHaveLength(1)

      const saturday = dayMap.get("saturday")!
      expect(saturday.isSchoolDay).toBe(false)
      expect(saturday.breakIntervals).toHaveLength(0)

      const sunday = dayMap.get("sunday")!
      expect(sunday.isSchoolDay).toBe(false)
      expect(sunday.breakIntervals).toHaveLength(0)

      // 3. Seluruh relasi data master dan sesi wajib kosong
      expect(bundle.classes).toEqual([])
      expect(bundle.teachers).toEqual([])
      expect(bundle.subjects).toEqual([])
      expect(bundle.rooms).toEqual([])
      expect(bundle.requirements).toEqual([])
      expect(bundle.sessions).toEqual([])
    })
  })

  describe("cloneWorkspaceSnapshot (AC-14.3 & AC-14.4)", () => {
    function createSourceFixture(): WorkspaceEntityBundle {
      const workspace: Workspace = {
        id: "ws-source-1",
        name: "SMPN 1 Nusantara",
        academicPeriod: "Semester Ganjil 2026/2027",
        activeClassId: "cls-7a",
        defaultSnapIntervalMinutes: 30,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      }

      const dayConfigs: DayScheduleConfig[] = [
        {
          id: "cfg-mon",
          workspaceId: "ws-source-1",
          dayOfWeek: "monday",
          isSchoolDay: true,
          startTime: "07:00",
          endTime: "14:00",
          snapIntervalMinutes: 30,
          breakIntervals: [
            {
              id: "brk-mon-1",
              startTime: "09:45",
              endTime: "10:15",
              label: "Istirahat Pagi",
            },
          ],
        },
      ]

      const classes: ClassGroup[] = [
        {
          id: "cls-7a",
          workspaceId: "ws-source-1",
          name: "VII-A",
          grade: "VII",
        },
        {
          id: "cls-7b",
          workspaceId: "ws-source-1",
          name: "VII-B",
          grade: "VII",
        },
      ]

      const teachers: Teacher[] = [
        {
          id: "tch-budi",
          workspaceId: "ws-source-1",
          name: "Budi Santoso",
          unavailableIntervals: [
            {
              id: "unavail-1",
              dayOfWeek: "friday",
              startTime: "07:00",
              endTime: "11:30",
              label: "Khotbah Jumat",
            },
          ],
        },
      ]

      const subjects: Subject[] = [
        {
          id: "sbj-math",
          workspaceId: "ws-source-1",
          name: "Matematika",
          colorKey: "blue",
        },
      ]

      const rooms: Room[] = [
        {
          id: "rm-lab-komp",
          workspaceId: "ws-source-1",
          name: "Lab Komputer",
          type: "laboratory",
          unavailableIntervals: [
            {
              id: "unavail-rm-1",
              dayOfWeek: "monday",
              startTime: "12:00",
              endTime: "14:00",
              label: "Perawatan Server",
            },
          ],
        },
      ]

      const requirements: TeachingRequirement[] = [
        {
          id: "req-math-7a",
          workspaceId: "ws-source-1",
          classId: "cls-7a",
          subjectId: "sbj-math",
          defaultTeacherId: "tch-budi",
          defaultRoomId: "rm-lab-komp",
          sessionsPerWeek: 4,
          durationMinutes: 40,
          roomRequired: true,
        },
      ]

      const sessions: TimetableSession[] = [
        {
          id: "sess-1",
          workspaceId: "ws-source-1",
          requirementId: "req-math-7a",
          classId: "cls-7a",
          subjectId: "sbj-math",
          teacherId: "tch-budi",
          roomId: "rm-lab-komp",
          dayOfWeek: "monday",
          startTime: "07:00",
          endTime: "08:20",
          durationMinutes: 80,
          notes: "Sesi Matematika Sesi 1",
        },
      ]

      return {
        workspace,
        dayConfigs,
        classes,
        teachers,
        subjects,
        rooms,
        requirements,
        sessions,
      }
    }

    it("AC-14.3: menduplikasi dengan mode MASTER_DATA_ONLY memetakan relasi ke ID baru dan mengosongkan sessions", () => {
      const source = createSourceFixture()
      const input: DuplicateWorkspaceInput = {
        sourceWorkspaceId: "ws-source-1",
        name: "SMPN 1 Nusantara (Semester Genap)",
        academicPeriod: "Semester Genap 2026/2027",
        mode: "MASTER_DATA_ONLY",
      }

      let idCounter = 100
      const fakeGenerateId = () => `new-id-${idCounter++}`
      const fixedIso = "2026-11-14T11:00:00.000Z"

      const cloned = cloneWorkspaceSnapshot({
        source,
        input,
        generateId: fakeGenerateId,
        nowIso: fixedIso,
      })

      // 1. Verifikasi ruang kerja baru
      expect(cloned.workspace.id).toBe("new-id-100")
      expect(cloned.workspace.name).toBe("SMPN 1 Nusantara (Semester Genap)")
      expect(cloned.workspace.academicPeriod).toBe("Semester Genap 2026/2027")
      expect(cloned.workspace.defaultSnapIntervalMinutes).toBe(30)
      expect(cloned.workspace.createdAt).toBe(fixedIso)

      // 2. activeClassId harus terpetakan ke kelas VII-A baru
      const newClass7A = cloned.classes.find((c) => c.name === "VII-A")!
      expect(newClass7A).toBeDefined()
      expect(newClass7A.id).not.toBe("cls-7a")
      expect(newClass7A.workspaceId).toBe(cloned.workspace.id)
      expect(cloned.workspace.activeClassId).toBe(newClass7A.id)

      // 3. Verifikasi pemetaan Teacher & unavailableIntervals
      const newTeacher = cloned.teachers[0]
      expect(newTeacher.id).not.toBe("tch-budi")
      expect(newTeacher.workspaceId).toBe(cloned.workspace.id)
      expect(newTeacher.unavailableIntervals[0].id).not.toBe("unavail-1")

      // 4. Verifikasi pemetaan Subject
      const newSubject = cloned.subjects[0]
      expect(newSubject.id).not.toBe("sbj-math")
      expect(newSubject.workspaceId).toBe(cloned.workspace.id)

      // 5. Verifikasi pemetaan Room & unavailableIntervals
      const newRoom = cloned.rooms[0]
      expect(newRoom.id).not.toBe("rm-lab-komp")
      expect(newRoom.workspaceId).toBe(cloned.workspace.id)
      expect(newRoom.unavailableIntervals[0].id).not.toBe("unavail-rm-1")

      // 6. Verifikasi pemetaan Foreign Key pada Requirement
      const newReq = cloned.requirements[0]
      expect(newReq.id).not.toBe("req-math-7a")
      expect(newReq.workspaceId).toBe(cloned.workspace.id)
      expect(newReq.classId).toBe(newClass7A.id)
      expect(newReq.subjectId).toBe(newSubject.id)
      expect(newReq.defaultTeacherId).toBe(newTeacher.id)
      expect(newReq.defaultRoomId).toBe(newRoom.id)

      // 7. Sesi WAJIB KOSONG pada MASTER_DATA_ONLY
      expect(cloned.sessions).toEqual([])
    })

    it("AC-14.4: menduplikasi dengan mode FULL_COPY menyalin seluruh sesi dan memetakan referensi ke ID baru", () => {
      const source = createSourceFixture()
      const input: DuplicateWorkspaceInput = {
        sourceWorkspaceId: "ws-source-1",
        name: "SMPN 1 Nusantara (Simulasi)",
        academicPeriod: "Semester Ganjil 2026/2027",
        mode: "FULL_COPY",
      }

      let idCounter = 500
      const fakeGenerateId = () => `copy-id-${idCounter++}`

      const cloned = cloneWorkspaceSnapshot({
        source,
        input,
        generateId: fakeGenerateId,
      })

      // Sesi harus ikut tersalin
      expect(cloned.sessions).toHaveLength(1)
      const newSession = cloned.sessions[0]

      expect(newSession.id).not.toBe("sess-1")
      expect(newSession.workspaceId).toBe(cloned.workspace.id)
      expect(newSession.dayOfWeek).toBe("monday")
      expect(newSession.startTime).toBe("07:00")
      expect(newSession.endTime).toBe("08:20")
      expect(newSession.durationMinutes).toBe(80)

      // Seluruh relasi foreign key pada sesi harus menunjuk ke ID baru yang bersesuaian
      const newReq = cloned.requirements[0]
      const newClass7A = cloned.classes.find((c) => c.name === "VII-A")!
      const newSubject = cloned.subjects[0]
      const newTeacher = cloned.teachers[0]
      const newRoom = cloned.rooms[0]

      expect(newSession.requirementId).toBe(newReq.id)
      expect(newSession.classId).toBe(newClass7A.id)
      expect(newSession.subjectId).toBe(newSubject.id)
      expect(newSession.teacherId).toBe(newTeacher.id)
      expect(newSession.roomId).toBe(newRoom.id)
    })
  })
})
