import { AlertTriangleIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DayScheduleConfigCard } from "@/components/workspace/day-schedule-config-card"
import { WorkspaceDataManagementCard } from "@/components/workspace/workspace-data-management-card"
import { WorkspaceIdentityCard } from "@/components/workspace/workspace-identity-card"
import { useWorkspaceStore } from "@/store/use-workspace-store"

export function SettingsPage() {
  const configValidation = useWorkspaceStore((state) => state.configValidation)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-base font-semibold tracking-tight text-foreground">
          Pengaturan Ruang Kerja & Jam Belajar
        </h1>
        <p className="text-xs/relaxed text-muted-foreground">
          Konfigurasikan identitas sekolah, hari aktif pembelajaran, jam mulai
          dan selesai per hari, ukuran interval snap grid, serta waktu istirahat.
          Setiap perubahan yang valid disimpan secara otomatis di browser Anda.
        </p>
      </div>

      {!configValidation.isValid && configValidation.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>
            Terdapat {configValidation.issues.length} kesalahan konfigurasi jam
            belajar
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {configValidation.issues.map((issue, idx) => (
                <li key={`${issue.code}-${issue.dayOfWeek ?? "ws"}-${issue.breakId ?? idx}`}>
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <WorkspaceIdentityCard />
      <DayScheduleConfigCard />
      <WorkspaceDataManagementCard />
    </div>
  )
}
