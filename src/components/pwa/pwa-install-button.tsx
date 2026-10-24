import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface PwaInstallButtonProps {
  isInstallable: boolean
  isInstalled: boolean
  onInstall: () => Promise<boolean> | void
  className?: string
}

/**
 * Tombol instalasi native PWA yang disematkan di bilah header aplikasi.
 * Hanya dirender saat browser mendeteksi aplikasi dapat diinstal dan belum terpasang.
 */
export function PwaInstallButton({
  isInstallable,
  isInstalled,
  onInstall,
  className,
}: PwaInstallButtonProps) {
  if (!isInstallable || isInstalled) {
    return null
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={() => void onInstall()}
      className={className}
      aria-label="Pasang Aplikasi Schedovyn ke Perangkat"
    >
      <DownloadIcon className="size-3.5" />
      <span>Pasang Aplikasi</span>
    </Button>
  )
}
