import * as React from "react"
import {
  CheckCircle2Icon,
  DatabaseIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function WorkspaceDataManagementCard() {
  const classes = useWorkspaceStore((state) => state.classes)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const subjects = useWorkspaceStore((state) => state.subjects)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const requirements = useWorkspaceStore((state) => state.requirements)
  const sessions = useWorkspaceStore((state) => state.sessions)

  const applyFullDefaultSeed = useWorkspaceStore(
    (state) => state.applyFullDefaultSeed
  )
  const clearAllSeedData = useWorkspaceStore((state) => state.clearAllSeedData)

  const [feedbackMessage, setFeedbackMessage] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleClearAll = async () => {
    setIsProcessing(true)
    setFeedbackMessage(null)
    try {
      const ok = await clearAllSeedData()
      if (ok) {
        setFeedbackMessage({
          type: "success",
          message:
            "Seluruh data kelas, guru, mata pelajaran, ruangan, kebutuhan pembelajaran, dan jadwal berhasil dikosongkan.",
        })
      } else {
        setFeedbackMessage({
          type: "error",
          message: "Gagal mengosongkan data. Silakan coba kembali.",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApplySeed = async () => {
    setIsProcessing(true)
    setFeedbackMessage(null)
    try {
      const ok = await applyFullDefaultSeed()
      if (ok) {
        setFeedbackMessage({
          type: "success",
          message:
            "Data contoh lengkap (SMP Negeri 1 Nusantara: 6 kelas, 10 guru, 10 mapel, 10 ruangan, dan puluhan sesi jadwal) berhasil dimuat.",
        })
      } else {
        setFeedbackMessage({
          type: "error",
          message: "Gagal memuat data contoh. Silakan coba kembali.",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2">
          <DatabaseIcon className="size-4 text-primary" />
          <CardTitle>Pengelolaan Data & Seed Contoh</CardTitle>
        </div>
        <CardDescription>
          Kelola data simulasi dan jadwal lokal di browser Anda. Anda dapat
          memuat kumpulan data contoh lengkap sekolah atau mengosongkan seluruh
          data untuk memulai perencanaan jadwal dari awal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {feedbackMessage && (
          <Alert
            variant={
              feedbackMessage.type === "error" ? "destructive" : "default"
            }
          >
            <CheckCircle2Icon />
            <AlertTitle>
              {feedbackMessage.type === "error" ? "Terjadi Kendala" : "Informasi"}
            </AlertTitle>
            <AlertDescription>{feedbackMessage.message}</AlertDescription>
          </Alert>
        )}

        {/* Ringkasan Data Saat Ini */}
        <div className="grid grid-cols-2 gap-2 rounded-none border border-border/60 bg-muted/20 p-3 sm:grid-cols-3 md:grid-cols-6 text-center">
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold text-foreground">
              {classes.length}
            </span>
            <span className="text-[11px] text-muted-foreground">Kelas</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold text-foreground">
              {subjects.length}
            </span>
            <span className="text-[11px] text-muted-foreground">Mata Pelajaran</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold text-foreground">
              {teachers.length}
            </span>
            <span className="text-[11px] text-muted-foreground">Guru</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold text-foreground">
              {rooms.length}
            </span>
            <span className="text-[11px] text-muted-foreground">Ruangan</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold text-foreground">
              {requirements.length}
            </span>
            <span className="text-[11px] text-muted-foreground">Kebutuhan</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold text-primary">
              {sessions.length}
            </span>
            <span className="text-[11px] text-muted-foreground">Sesi Jadwal</span>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Tombol Muat Ulang Seed */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                disabled={isProcessing}
              >
                <RotateCcwIcon className="size-3.5" />
                Muat Ulang Seed Lengkap
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Muat Ulang Data Seed Lengkap?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini akan menimpa seluruh data jadwal dan data master
                  saat ini dengan kumpulan data contoh lengkap SMP Negeri 1
                  Nusantara (6 kelas, 10 guru, 10 mata pelajaran, 10 ruangan, dan
                  jadwal mingguan siap pakai). Perubahan yang belum disimpan
                  terpisah akan hilang.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleApplySeed}>
                  Muat Ulang Data Contoh
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Tombol Hapus Semua Seed */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={isProcessing}
              >
                <Trash2Icon className="size-3.5" />
                Hapus Semua Seed / Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Semua Data & Jadwal?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini akan mengosongkan seluruh kelas, mata pelajaran,
                  guru, ruangan, kebutuhan pembelajaran, dan seluruh blok sesi
                  jadwal di browser ini. Konfigurasi jam operasional sekolah akan
                  tetap dipertahankan. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleClearAll}
                >
                  Hapus Semua Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
