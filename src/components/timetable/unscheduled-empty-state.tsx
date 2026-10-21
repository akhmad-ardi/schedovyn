import { CheckCircle2Icon, LayersIcon, SearchXIcon } from "lucide-react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

export interface UnscheduledEmptyStateProps {
  type: "no_requirements" | "completed" | "no_search_results"
  searchQuery?: string
  onResetSearch?: () => void
}

export function UnscheduledEmptyState({
  type,
  searchQuery,
  onResetSearch,
}: UnscheduledEmptyStateProps) {
  const navigate = useNavigate()

  if (type === "no_requirements") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
        <LayersIcon className="mb-2.5 size-8 text-muted-foreground/50" />
        <p className="font-heading font-semibold text-foreground text-sm">
          Belum Memiliki Kebutuhan Pembelajaran
        </p>
        <p className="mt-1 text-xs/relaxed text-muted-foreground max-w-xs">
          Kelas ini belum memiliki konfigurasi kebutuhan mata pelajaran. Tambahkan
          kebutuhan pembelajaran terlebih dahulu di Data Master.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => navigate("/master-data")}
          >
            Kelola Kebutuhan Pembelajaran
          </Button>
        </div>
      </div>
    )
  }

  if (type === "completed") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
        <CheckCircle2Icon className="mb-2.5 size-8 text-emerald-600 dark:text-emerald-400" />
        <p className="font-heading font-semibold text-foreground text-sm">
          Seluruh Sesi Telah Terjadwal!
        </p>
        <p className="mt-1 text-xs/relaxed text-muted-foreground max-w-xs">
          Semua kebutuhan pembelajaran untuk kelas aktif telah berhasil
          ditempatkan ke dalam grid jadwal mingguan secara lengkap.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
      <SearchXIcon className="mb-2 size-7 text-muted-foreground/50" />
      <p className="font-medium text-foreground">
        Tidak ada mata pelajaran yang cocok
      </p>
      {searchQuery && (
        <p className="mt-1">
          Tidak ditemukan hasil untuk kata kunci &ldquo;{searchQuery}&rdquo;.
        </p>
      )}
      {onResetSearch && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onResetSearch}
          className="mt-3 text-xs"
        >
          Bersihkan Pencarian
        </Button>
      )}
    </div>
  )
}
