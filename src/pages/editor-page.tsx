import { Link } from "react-router"
import {
  BookOpenIcon,
  CalendarCheck2Icon,
  ClockIcon,
  GraduationCapIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react"
import { ClassSelectorBar } from "@/components/layout/class-selector-bar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getActiveClassRequirements,
  getActiveClassSessions,
  resolveActiveClass,
} from "@/domain/timetable/active-class-context"
import { DAY_OF_WEEK_LABELS } from "@/domain/types/entities"
import { getSubjectColorStyle } from "@/lib/subject-colors"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function EditorPage() {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const classes = useWorkspaceStore((state) => state.classes)
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const requirements = useWorkspaceStore((state) => state.requirements)
  const sessions = useWorkspaceStore((state) => state.sessions)
  const setActiveClass = useWorkspaceStore((state) => state.setActiveClass)

  const activeClassId = workspace?.activeClassId ?? null
  const activeClass = resolveActiveClass(classes, activeClassId)
  const activeDaysCount = dayConfigs.filter((d) => d.isSchoolDay).length

  // Kondisi 1: Belum ada kelas di ruang kerja
  if (classes.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Editor Jadwal Mingguan</CardTitle>
            <CardDescription>
              Ruang kerja aktif:{" "}
              <span className="font-medium text-foreground">
                {workspace?.name ?? "SMP Negeri 1 Nusantara"}
              </span>{" "}
              ({workspace?.academicPeriod ?? "Semester Ganjil 2026/2027"}) dengan{" "}
              <span className="tabular-nums font-medium text-foreground">
                {activeDaysCount}
              </span>{" "}
              hari sekolah aktif dan interval snap{" "}
              <span className="tabular-nums font-medium text-foreground">
                {workspace?.defaultSnapIntervalMinutes ?? 15} menit
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-xs/relaxed text-muted-foreground">
              Belum ada kelas di ruang kerja ini. Tambahkan kelas terlebih
              dahulu di menu Data Master sebelum menyusun jadwal.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="default">
                <Link to="/master-data">
                  <PlusIcon data-icon="inline-start" />
                  Buka Data Master Kelas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Kondisi 2: Ada kelas namun belum ada kelas aktif yang dipilih
  if (!activeClass) {
    return (
      <div className="flex flex-col">
        <ClassSelectorBar />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>Pilih Kelas untuk Mulai Menyunting Jadwal</CardTitle>
              <CardDescription>
                Pilih salah satu kelas di bawah ini untuk melihat kebutuhan
                pembelajaran dan menyusun jadwal mingguan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {classes.map((cls) => (
                  <Button
                    key={cls.id}
                    type="button"
                    variant="outline"
                    className="h-auto flex flex-col items-start p-4 text-left justify-start"
                    onClick={() => {
                      void setActiveClass(cls.id)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCapIcon className="size-4 text-muted-foreground" />
                      <span className="font-heading font-semibold text-base text-foreground">
                        {cls.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Tingkat {cls.grade}
                    </span>
                    {cls.notes && (
                      <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {cls.notes}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Kondisi 3: Kelas aktif terpilih
  const activeClassRequirements = getActiveClassRequirements(
    requirements,
    activeClass.id
  )
  const activeClassSessions = getActiveClassSessions(sessions, activeClass.id)

  return (
    <div className="flex flex-col">
      <ClassSelectorBar />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
        {/* Header Konteks Kelas Aktif */}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Kelas {activeClass.name}
              </h1>
              <span className="border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Tingkat {activeClass.grade}
              </span>
            </div>
            {activeClass.notes && (
              <p className="text-xs text-muted-foreground">
                {activeClass.notes}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 border border-border bg-background px-2.5 py-1">
              <ClockIcon className="size-3.5" />
              <span className="tabular-nums">{activeDaysCount}</span> hari
              sekolah aktif
            </span>
            <span className="inline-flex items-center gap-1.5 border border-border bg-background px-2.5 py-1">
              <SparklesIcon className="size-3.5" />
              Snap{" "}
              <span className="tabular-nums">
                {workspace?.defaultSnapIntervalMinutes ?? 15}
              </span>{" "}
              menit
            </span>
          </div>
        </div>

        {/* Kartu 1: Kebutuhan Pembelajaran Kelas Aktif */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="size-4 text-primary" />
                  <CardTitle>
                    Kebutuhan Pembelajaran Kelas {activeClass.name}
                  </CardTitle>
                </div>
                <CardDescription>
                  Daftar alokasi mata pelajaran dan jumlah sesi mingguan khusus
                  untuk kelas ini.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="xs">
                <Link to="/master-data">Atur di Data Master</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeClassRequirements.length === 0 ? (
              <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Belum ada kebutuhan pembelajaran untuk kelas ini.
                </p>
                <p>
                  Petakan mata pelajaran dan jumlah sesi mingguan di menu Data
                  Master agar kartu sesi dapat dijadwalkan pada kelas ini.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Beban Mingguan</TableHead>
                    <TableHead>Guru Default</TableHead>
                    <TableHead>Ruangan Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeClassRequirements.map((req) => {
                    const sub = subjects.find((s) => s.id === req.subjectId)
                    const tch = teachers.find(
                      (t) => t.id === req.defaultTeacherId
                    )
                    const rm = rooms.find((r) => r.id === req.defaultRoomId)
                    const subStyle = sub
                      ? getSubjectColorStyle(sub.colorKey)
                      : null

                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="inline-flex items-center gap-2">
                            {subStyle && (
                              <span
                                className={`inline-block size-2.5 shrink-0 ${subStyle.swatchClassName}`}
                              />
                            )}
                            <span className="font-medium text-foreground">
                              {sub?.name ?? "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {req.sessionsPerWeek} sesi x {req.durationMinutes} mnt
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tch?.name ?? "Belum Ditentukan"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rm?.name ?? "Tanpa Ruangan Khusus"}
                          {req.roomRequired ? " (Wajib)" : ""}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Kartu 2: Sesi Terjadwal Kelas Aktif */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarCheck2Icon className="size-4 text-primary" />
              <div className="flex flex-col gap-1">
                <CardTitle>
                  Sesi Terjadwal Kelas {activeClass.name} (
                  <span className="tabular-nums">
                    {activeClassSessions.length}
                  </span>
                  )
                </CardTitle>
                <CardDescription>
                  Sesi pembelajaran yang telah ditempatkan pada grid waktu
                  mingguan kelas ini.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeClassSessions.length === 0 ? (
              <div className="flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Belum ada sesi terjadwal untuk kelas ini.
                </p>
                <p>
                  Sesi pembelajaran dapat ditempatkan melalui editor grid pada
                  tahap berikutnya (FR-04). Jadwal kelas lain tetap tersimpan
                  aman di ruang kerja.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hari</TableHead>
                    <TableHead>Waktu Belajar</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Guru Pengajar</TableHead>
                    <TableHead>Ruangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeClassSessions.map((ses) => {
                    const sub = subjects.find((s) => s.id === ses.subjectId)
                    const tch = teachers.find((t) => t.id === ses.teacherId)
                    const rm = rooms.find((r) => r.id === ses.roomId)
                    const subStyle = sub
                      ? getSubjectColorStyle(sub.colorKey)
                      : null

                    return (
                      <TableRow key={ses.id}>
                        <TableCell className="font-medium text-foreground">
                          {DAY_OF_WEEK_LABELS[ses.dayOfWeek]}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {ses.startTime} - {ses.endTime}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {ses.durationMinutes} menit
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2">
                            {subStyle && (
                              <span
                                className={`inline-block size-2.5 shrink-0 ${subStyle.swatchClassName}`}
                              />
                            )}
                            <span className="font-medium text-foreground">
                              {sub?.name ?? "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tch?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rm?.name ?? "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
