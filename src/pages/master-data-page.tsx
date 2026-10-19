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

export function MasterDataPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Pengelolaan Data Master</CardTitle>
          <CardDescription>
            Kelola daftar Kelas, Mata Pelajaran, Guru, Ruangan, serta Kebutuhan
            Pembelajaran mingguan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-xs/relaxed text-muted-foreground">
            Pastikan konfigurasi hari aktif dan jam operasional sekolah telah
            sesuai sebelum memetakan kebutuhan jam mengajar per kelas.
          </p>
          <Button asChild variant="outline">
            <Link to="/settings">
              <SlidersHorizontalIcon data-icon="inline-start" />
              Periksa Pengaturan Jam & Ruang Kerja
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
