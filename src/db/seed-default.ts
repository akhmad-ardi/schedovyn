import { addMinutesToTime } from "@/domain/time/time-utils"
import {
  ORDERED_DAYS_OF_WEEK,
  type ClassGroup,
  type DayOfWeek,
  type DayScheduleConfig,
  type Room,
  type Subject,
  type Teacher,
  type TeachingRequirement,
  type TimetableSession,
  type Workspace,
} from "@/domain/types/entities"

export interface DefaultWorkspaceSeedData {
  workspace: Workspace
  dayConfigs: DayScheduleConfig[]
  classes: ClassGroup[]
  subjects: Subject[]
  teachers: Teacher[]
  rooms: Room[]
  requirements: TeachingRequirement[]
  sessions: TimetableSession[]
}

/**
 * Membuat kumpulan data seed contoh yang lengkap dan realistis untuk SMP Negeri 1 Nusantara.
 * Seluruh 8 entitas didefinisikan dengan tipe TypeScript ketat sesuai antarmuka entitas domain:
 * Workspace, DayConfigs, Classes, Subjects, Teachers, Rooms, Requirements, dan Sessions.
 */
export function createDefaultWorkspaceSeed(): DefaultWorkspaceSeedData {
  const nowIso = new Date().toISOString()
  const workspaceId = "ws-smpn1-nusantara"

  // 1. Workspace
  const workspace: Workspace = {
    id: workspaceId,
    name: "SMP Negeri 1 Nusantara",
    academicPeriod: "Semester Ganjil 2026/2027",
    activeClassId: null,
    defaultSnapIntervalMinutes: 15,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  // 2. Day Schedule Configs (Senin - Minggu)
  const dayConfigs: DayScheduleConfig[] = ORDERED_DAYS_OF_WEEK.map(
    (dayOfWeek: DayOfWeek) => {
      if (
        dayOfWeek === "monday" ||
        dayOfWeek === "tuesday" ||
        dayOfWeek === "wednesday" ||
        dayOfWeek === "thursday"
      ) {
        return {
          id: `seed-day-${dayOfWeek}`,
          workspaceId,
          dayOfWeek,
          isSchoolDay: true,
          startTime: "07:00",
          endTime: "15:00",
          snapIntervalMinutes: 15,
          breakIntervals: [
            {
              id: `seed-brk-1-${dayOfWeek}`,
              label: "Istirahat Pertama",
              startTime: "09:30",
              endTime: "10:00",
            },
            {
              id: `seed-brk-2-${dayOfWeek}`,
              label: "Istirahat Kedua",
              startTime: "12:00",
              endTime: "12:45",
            },
          ],
        }
      }

      if (dayOfWeek === "friday") {
        return {
          id: `seed-day-${dayOfWeek}`,
          workspaceId,
          dayOfWeek,
          isSchoolDay: true,
          startTime: "07:00",
          endTime: "11:30",
          snapIntervalMinutes: 15,
          breakIntervals: [
            {
              id: `seed-brk-1-${dayOfWeek}`,
              label: "Istirahat Shalat Jumat",
              startTime: "09:30",
              endTime: "10:00",
            },
          ],
        }
      }

      // Sabtu & Minggu libur
      return {
        id: `seed-day-${dayOfWeek}`,
        workspaceId,
        dayOfWeek,
        isSchoolDay: false,
        startTime: "07:00",
        endTime: "15:00",
        snapIntervalMinutes: 15,
        breakIntervals: [],
      }
    }
  )

  // 3. Classes (Tingkat VII, VIII, IX)
  const classes: ClassGroup[] = [
    {
      id: "seed-cls-7a",
      workspaceId,
      name: "VII-A",
      grade: "VII",
      notes: "Kelas Unggulan Sains",
    },
    {
      id: "seed-cls-7b",
      workspaceId,
      name: "VII-B",
      grade: "VII",
      notes: "Kelas Reguler A",
    },
    {
      id: "seed-cls-8a",
      workspaceId,
      name: "VIII-A",
      grade: "VIII",
      notes: "Kelas Unggulan Bahasa",
    },
    {
      id: "seed-cls-8b",
      workspaceId,
      name: "VIII-B",
      grade: "VIII",
      notes: "Kelas Reguler B",
    },
    {
      id: "seed-cls-9a",
      workspaceId,
      name: "IX-A",
      grade: "IX",
      notes: "Kelas Persiapan Ujian 1",
    },
    {
      id: "seed-cls-9b",
      workspaceId,
      name: "IX-B",
      grade: "IX",
      notes: "Kelas Persiapan Ujian 2",
    },
  ]

  // 4. Subjects (10 Mata Pelajaran)
  const subjects: Subject[] = [
    {
      id: "seed-sbj-mtk",
      workspaceId,
      name: "Matematika",
      colorKey: "blue",
      notes: "Mata Pelajaran Wajib IPA",
    },
    {
      id: "seed-sbj-ipa",
      workspaceId,
      name: "Ilmu Pengetahuan Alam",
      colorKey: "emerald",
      notes: "Fisika & Biologi Terpadu",
    },
    {
      id: "seed-sbj-ips",
      workspaceId,
      name: "Ilmu Pengetahuan Sosial",
      colorKey: "amber",
      notes: "Sejarah & Geografi",
    },
    {
      id: "seed-sbj-ind",
      workspaceId,
      name: "Bahasa Indonesia",
      colorKey: "violet",
      notes: "Tata Bahasa & Sastra",
    },
    {
      id: "seed-sbj-ing",
      workspaceId,
      name: "Bahasa Inggris",
      colorKey: "rose",
      notes: "English Communication",
    },
    {
      id: "seed-sbj-pai",
      workspaceId,
      name: "Pendidikan Agama Islam",
      colorKey: "teal",
      notes: "Pendidikan Budi Pekerti",
    },
    {
      id: "seed-sbj-ppkn",
      workspaceId,
      name: "PPKn",
      colorKey: "cyan",
      notes: "Pancasila dan Kewarganegaraan",
    },
    {
      id: "seed-sbj-pjk",
      workspaceId,
      name: "PJOK",
      colorKey: "orange",
      notes: "Pendidikan Jasmani dan Kesehatan",
    },
    {
      id: "seed-sbj-snk",
      workspaceId,
      name: "Seni Budaya",
      colorKey: "indigo",
      notes: "Seni Rupa & Musik",
    },
    {
      id: "seed-sbj-inf",
      workspaceId,
      name: "Informatika",
      colorKey: "slate",
      notes: "Teknologi Informasi & Algoritma",
    },
  ]

  // 5. Teachers (10 Guru)
  const teachers: Teacher[] = [
    {
      id: "seed-tch-budi",
      workspaceId,
      name: "Drs. Budi Santoso, M.Pd.",
      notes: "Guru Senior Matematika",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-siti",
      workspaceId,
      name: "Siti Rahmawati, S.Pd.",
      notes: "Guru IPA Terpadu",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-ahmad",
      workspaceId,
      name: "Ahmad Fauzi, M.Si.",
      notes: "Guru IPS Terpadu",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-dewi",
      workspaceId,
      name: "Dewi Lestari, S.Pd.",
      notes: "Guru Bahasa Indonesia",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-hendra",
      workspaceId,
      name: "Hendra Wijaya, M.Hum.",
      notes: "Guru Bahasa Inggris",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-hasan",
      workspaceId,
      name: "H. Muhammad Hasan, S.Ag.",
      notes: "Guru Pendidikan Agama Islam",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-anita",
      workspaceId,
      name: "Anita Kusuma, S.Pd.",
      notes: "Guru PPKn",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-rudi",
      workspaceId,
      name: "Rudi Hermawan, S.Pd.Jas.",
      notes: "Guru Penjasorkes",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-rini",
      workspaceId,
      name: "Rini Astuti, S.Sn.",
      notes: "Guru Seni Budaya",
      unavailableIntervals: [],
    },
    {
      id: "seed-tch-fajar",
      workspaceId,
      name: "Fajar Nugraha, S.Kom.",
      notes: "Guru Informatika & TIK",
      unavailableIntervals: [],
    },
  ]

  // 6. Rooms (10 Ruangan)
  const rooms: Room[] = [
    {
      id: "seed-rom-7a",
      workspaceId,
      name: "Ruang Kelas VII-A",
      type: "classroom",
      notes: "Gedung A Lantai 1",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-7b",
      workspaceId,
      name: "Ruang Kelas VII-B",
      type: "classroom",
      notes: "Gedung A Lantai 1",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-8a",
      workspaceId,
      name: "Ruang Kelas VIII-A",
      type: "classroom",
      notes: "Gedung B Lantai 1",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-8b",
      workspaceId,
      name: "Ruang Kelas VIII-B",
      type: "classroom",
      notes: "Gedung B Lantai 1",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-9a",
      workspaceId,
      name: "Ruang Kelas IX-A",
      type: "classroom",
      notes: "Gedung C Lantai 2",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-9b",
      workspaceId,
      name: "Ruang Kelas IX-B",
      type: "classroom",
      notes: "Gedung C Lantai 2",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-ipa",
      workspaceId,
      name: "Laboratorium IPA",
      type: "laboratory",
      notes: "Kapasitas 36 siswa",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-komp",
      workspaceId,
      name: "Laboratorium Komputer",
      type: "laboratory",
      notes: "40 unit komputer klien",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-lap",
      workspaceId,
      name: "Lapangan Olahraga",
      type: "sports",
      notes: "Lapangan luar ruangan multifungsi",
      unavailableIntervals: [],
    },
    {
      id: "seed-rom-seni",
      workspaceId,
      name: "Ruang Seni & Musik",
      type: "other",
      notes: "Peralatan musik dan seni rupa",
      unavailableIntervals: [],
    },
  ]

  // 7. Teaching Requirements (Kebutuhan Pembelajaran Kelas VII-A & VII-B)
  const requirements: TeachingRequirement[] = [
    // --- Kelas VII-A ---
    {
      id: "seed-req-7a-mtk",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-mtk",
      defaultTeacherId: "seed-tch-budi",
      defaultRoomId: "seed-rom-7a",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Matematika VII-A",
    },
    {
      id: "seed-req-7a-ipa",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ipa",
      defaultTeacherId: "seed-tch-siti",
      defaultRoomId: "seed-rom-ipa",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "IPA VII-A di Lab",
    },
    {
      id: "seed-req-7a-ips",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ips",
      defaultTeacherId: "seed-tch-ahmad",
      defaultRoomId: "seed-rom-7a",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "IPS VII-A",
    },
    {
      id: "seed-req-7a-ind",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ind",
      defaultTeacherId: "seed-tch-dewi",
      defaultRoomId: "seed-rom-7a",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Bahasa Indonesia VII-A",
    },
    {
      id: "seed-req-7a-ing",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ing",
      defaultTeacherId: "seed-tch-hendra",
      defaultRoomId: "seed-rom-7a",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Bahasa Inggris VII-A",
    },
    {
      id: "seed-req-7a-pai",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-pai",
      defaultTeacherId: "seed-tch-hasan",
      defaultRoomId: "seed-rom-7a",
      sessionsPerWeek: 1,
      durationMinutes: 90,
      roomRequired: true,
      notes: "PAI VII-A",
    },
    {
      id: "seed-req-7a-ppkn",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ppkn",
      defaultTeacherId: "seed-tch-anita",
      defaultRoomId: "seed-rom-7a",
      sessionsPerWeek: 1,
      durationMinutes: 60,
      roomRequired: true,
      notes: "PPKn VII-A",
    },
    {
      id: "seed-req-7a-pjk",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-pjk",
      defaultTeacherId: "seed-tch-rudi",
      defaultRoomId: "seed-rom-lap",
      sessionsPerWeek: 1,
      durationMinutes: 90,
      roomRequired: true,
      notes: "PJOK Lapangan VII-A",
    },
    {
      id: "seed-req-7a-snk",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-snk",
      defaultTeacherId: "seed-tch-rini",
      defaultRoomId: "seed-rom-seni",
      sessionsPerWeek: 1,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Seni Budaya VII-A",
    },
    {
      id: "seed-req-7a-inf",
      workspaceId,
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-inf",
      defaultTeacherId: "seed-tch-fajar",
      defaultRoomId: "seed-rom-komp",
      sessionsPerWeek: 1,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Informatika Komputer VII-A",
    },

    // --- Kelas VII-B ---
    {
      id: "seed-req-7b-mtk",
      workspaceId,
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-mtk",
      defaultTeacherId: "seed-tch-budi",
      defaultRoomId: "seed-rom-7b",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Matematika VII-B",
    },
    {
      id: "seed-req-7b-ipa",
      workspaceId,
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ipa",
      defaultTeacherId: "seed-tch-siti",
      defaultRoomId: "seed-rom-ipa",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "IPA VII-B",
    },
    {
      id: "seed-req-7b-ips",
      workspaceId,
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ips",
      defaultTeacherId: "seed-tch-ahmad",
      defaultRoomId: "seed-rom-7b",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "IPS VII-B",
    },
    {
      id: "seed-req-7b-ind",
      workspaceId,
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ind",
      defaultTeacherId: "seed-tch-dewi",
      defaultRoomId: "seed-rom-7b",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Bahasa Indonesia VII-B",
    },
    {
      id: "seed-req-7b-ing",
      workspaceId,
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ing",
      defaultTeacherId: "seed-tch-hendra",
      defaultRoomId: "seed-rom-7b",
      sessionsPerWeek: 2,
      durationMinutes: 60,
      roomRequired: true,
      notes: "Bahasa Inggris VII-B",
    },
    {
      id: "seed-req-7b-pjk",
      workspaceId,
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-pjk",
      defaultTeacherId: "seed-tch-rudi",
      defaultRoomId: "seed-rom-lap",
      sessionsPerWeek: 1,
      durationMinutes: 90,
      roomRequired: true,
      notes: "PJOK VII-B",
    },
  ]

  // 8. Timetable Sessions (Jadwal Terjadwal Tanpa Konflik)
  const rawSessions: Array<
    Omit<TimetableSession, "endTime"> & { durationMinutes: number }
  > = [
    // ===== KELAS VII-A =====
    // Senin
    {
      id: "seed-ses-7a-mon-1",
      workspaceId,
      requirementId: "seed-req-7a-mtk",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-mtk",
      teacherId: "seed-tch-budi",
      roomId: "seed-rom-7a",
      dayOfWeek: "monday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Sesi Aljabar Dasar",
    },
    {
      id: "seed-ses-7a-mon-2",
      workspaceId,
      requirementId: "seed-req-7a-ipa",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ipa",
      teacherId: "seed-tch-siti",
      roomId: "seed-rom-ipa",
      dayOfWeek: "monday",
      startTime: "08:30",
      durationMinutes: 60,
      notes: "Pengenalan Mikroskop",
    },
    {
      id: "seed-ses-7a-mon-3",
      workspaceId,
      requirementId: "seed-req-7a-ind",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ind",
      teacherId: "seed-tch-dewi",
      roomId: "seed-rom-7a",
      dayOfWeek: "monday",
      startTime: "10:00",
      durationMinutes: 60,
      notes: "Teks Deskripsi",
    },

    // Selasa
    {
      id: "seed-ses-7a-tue-1",
      workspaceId,
      requirementId: "seed-req-7a-ing",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ing",
      teacherId: "seed-tch-hendra",
      roomId: "seed-rom-7a",
      dayOfWeek: "tuesday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Greetings & Self Introduction",
    },
    {
      id: "seed-ses-7a-tue-2",
      workspaceId,
      requirementId: "seed-req-7a-ips",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ips",
      teacherId: "seed-tch-ahmad",
      roomId: "seed-rom-7a",
      dayOfWeek: "tuesday",
      startTime: "08:30",
      durationMinutes: 60,
      notes: "Letak Geografis Indonesia",
    },
    {
      id: "seed-ses-7a-tue-3",
      workspaceId,
      requirementId: "seed-req-7a-snk",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-snk",
      teacherId: "seed-tch-rini",
      roomId: "seed-rom-seni",
      dayOfWeek: "tuesday",
      startTime: "10:00",
      durationMinutes: 60,
      notes: "Menggambar Flora & Fauna",
    },

    // Rabu
    {
      id: "seed-ses-7a-wed-1",
      workspaceId,
      requirementId: "seed-req-7a-pjk",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-pjk",
      teacherId: "seed-tch-rudi",
      roomId: "seed-rom-lap",
      dayOfWeek: "wednesday",
      startTime: "07:30",
      durationMinutes: 90,
      notes: "Kebugaran Jasmani & Atletik",
    },
    {
      id: "seed-ses-7a-wed-2",
      workspaceId,
      requirementId: "seed-req-7a-pai",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-pai",
      teacherId: "seed-tch-hasan",
      roomId: "seed-rom-7a",
      dayOfWeek: "wednesday",
      startTime: "10:00",
      durationMinutes: 90,
      notes: "Kajian Akhlak Terpuji",
    },

    // Kamis
    {
      id: "seed-ses-7a-thu-1",
      workspaceId,
      requirementId: "seed-req-7a-mtk",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-mtk",
      teacherId: "seed-tch-budi",
      roomId: "seed-rom-7a",
      dayOfWeek: "thursday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Latihan Soal Bilangan Bulat",
    },
    {
      id: "seed-ses-7a-thu-2",
      workspaceId,
      requirementId: "seed-req-7a-ipa",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ipa",
      teacherId: "seed-tch-siti",
      roomId: "seed-rom-ipa",
      dayOfWeek: "thursday",
      startTime: "08:30",
      durationMinutes: 60,
      notes: "Klasifikasi Makhluk Hidup",
    },
    {
      id: "seed-ses-7a-thu-3",
      workspaceId,
      requirementId: "seed-req-7a-inf",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-inf",
      teacherId: "seed-tch-fajar",
      roomId: "seed-rom-komp",
      dayOfWeek: "thursday",
      startTime: "10:00",
      durationMinutes: 60,
      notes: "Pengenalan Komputer",
    },

    // Jumat
    {
      id: "seed-ses-7a-fri-1",
      workspaceId,
      requirementId: "seed-req-7a-ppkn",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ppkn",
      teacherId: "seed-tch-anita",
      roomId: "seed-rom-7a",
      dayOfWeek: "friday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Perumusan Pancasila",
    },
    {
      id: "seed-ses-7a-fri-2",
      workspaceId,
      requirementId: "seed-req-7a-ind",
      classId: "seed-cls-7a",
      subjectId: "seed-sbj-ind",
      teacherId: "seed-tch-dewi",
      roomId: "seed-rom-7a",
      dayOfWeek: "friday",
      startTime: "08:30",
      durationMinutes: 60,
      notes: "Membaca Puisi",
    },

    // ===== KELAS VII-B =====
    // Senin (Guru budi di 7b jam 10:00 tidak bentrok dengan 7a di jam 07:30)
    {
      id: "seed-ses-7b-mon-1",
      workspaceId,
      requirementId: "seed-req-7b-ing",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ing",
      teacherId: "seed-tch-hendra",
      roomId: "seed-rom-7b",
      dayOfWeek: "monday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Unit 1: Introductions",
    },
    {
      id: "seed-ses-7b-mon-2",
      workspaceId,
      requirementId: "seed-req-7b-ips",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ips",
      teacherId: "seed-tch-ahmad",
      roomId: "seed-rom-7b",
      dayOfWeek: "monday",
      startTime: "08:30",
      durationMinutes: 60,
      notes: "Peta & Wilayah",
    },
    {
      id: "seed-ses-7b-mon-3",
      workspaceId,
      requirementId: "seed-req-7b-mtk",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-mtk",
      teacherId: "seed-tch-budi",
      roomId: "seed-rom-7b",
      dayOfWeek: "monday",
      startTime: "10:00",
      durationMinutes: 60,
      notes: "Sistem Bilangan Bulat",
    },

    // Selasa (Guru siti di 7b jam 07:30 tidak bentrok dengan 7a di hari Senin/Kamis)
    {
      id: "seed-ses-7b-tue-1",
      workspaceId,
      requirementId: "seed-req-7b-ipa",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ipa",
      teacherId: "seed-tch-siti",
      roomId: "seed-rom-ipa",
      dayOfWeek: "tuesday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Zat dan Perubahannya",
    },
    {
      id: "seed-ses-7b-tue-2",
      workspaceId,
      requirementId: "seed-req-7b-pjk",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-pjk",
      teacherId: "seed-tch-rudi",
      roomId: "seed-rom-lap",
      dayOfWeek: "tuesday",
      startTime: "08:30",
      durationMinutes: 90,
      notes: "Permainan Bola Besar",
    },

    // Kamis
    {
      id: "seed-ses-7b-thu-1",
      workspaceId,
      requirementId: "seed-req-7b-ind",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ind",
      teacherId: "seed-tch-dewi",
      roomId: "seed-rom-7b",
      dayOfWeek: "thursday",
      startTime: "07:30",
      durationMinutes: 60,
      notes: "Menulis Paragraf Narasi",
    },
    {
      id: "seed-ses-7b-thu-2",
      workspaceId,
      requirementId: "seed-req-7b-mtk",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-mtk",
      teacherId: "seed-tch-budi",
      roomId: "seed-rom-7b",
      dayOfWeek: "thursday",
      startTime: "08:30",
      durationMinutes: 60,
      notes: "Pecahan & Desimal",
    },
    {
      id: "seed-ses-7b-thu-3",
      workspaceId,
      requirementId: "seed-req-7b-ipa",
      classId: "seed-cls-7b",
      subjectId: "seed-sbj-ipa",
      teacherId: "seed-tch-siti",
      roomId: "seed-rom-ipa",
      dayOfWeek: "thursday",
      startTime: "10:00",
      durationMinutes: 60,
      notes: "Suhu dan Pemuaian",
    },
  ]

  const sessions: TimetableSession[] = rawSessions.map((ses) => ({
    ...ses,
    endTime: addMinutesToTime(ses.startTime, ses.durationMinutes),
  }))

  return {
    workspace,
    dayConfigs,
    classes,
    subjects,
    teachers,
    rooms,
    requirements,
    sessions,
  }
}
