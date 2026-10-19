import { Link } from "react-router"
import { SlidersHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function MainPage() {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const dayConfigs = useWorkspaceStore((state) => state.dayConfigs)
  const activeDaysCount = dayConfigs.filter((d) => d.isSchoolDay).length

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
            Belum ada kelas di ruang kerja ini. Atur jam operasional sekolah
            terlebih dahulu atau tambahkan kelas di menu Data Master sebelum
            menyusun jadwal.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="default">
              <Link to="/settings">
                <SlidersHorizontalIcon data-icon="inline-start" />
                Buka Pengaturan Jam & Ruang Kerja
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/master-data">Buka Data Master</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
