import * as React from "react"
import { NavLink, Outlet } from "react-router"
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  DatabaseIcon,
  MoonIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react"
import { cn } from "cn"
import { useTheme } from "@/components/theme-provider"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SaveStatusBadge } from "@/components/layout/save-status-badge"
import { useWorkspaceStore } from "@/store/use-workspace-store"

interface AppShellProps {
  children?: React.ReactNode
}

const NAV_ITEMS = [
  {
    to: "/",
    label: "Editor Jadwal",
    icon: CalendarClockIcon,
  },
  {
    to: "/master-data",
    label: "Data Master",
    icon: DatabaseIcon,
  },
  {
    to: "/settings",
    label: "Pengaturan Jam & Ruang Kerja",
    icon: SlidersHorizontalIcon,
  },
] as const

export function AppShell({ children }: AppShellProps) {
  const isHydrated = useWorkspaceStore((state) => state.isHydrated)
  const isHydrating = useWorkspaceStore((state) => state.isHydrating)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const saveStatus = useWorkspaceStore((state) => state.saveStatus)
  const saveErrorMessage = useWorkspaceStore((state) => state.saveErrorMessage)
  const bootError = useWorkspaceStore((state) => state.bootError)
  const bootWorkspace = useWorkspaceStore((state) => state.bootWorkspace)
  const retryPendingStorageSync = useWorkspaceStore(
    (state) => state.retryPendingStorageSync
  )

  const [themeControl, setThemeControl] = React.useState<{
    theme: "dark" | "light" | "system"
    setTheme: (next: "dark" | "light" | "system") => void
  } | null>(null)

  React.useEffect(() => {
    if (!isHydrated && !isHydrating) {
      void bootWorkspace()
    }
  }, [isHydrated, isHydrating, bootWorkspace])

  if (bootError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md border border-destructive/40 bg-card p-6 shadow-md">
          <div className="flex items-center gap-2.5 text-destructive mb-3">
            <AlertTriangleIcon className="size-5 shrink-0" />
            <h1 className="font-heading text-base font-semibold tracking-tight">
              {bootError.title}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {bootError.message}
          </p>
          <div className="border border-border bg-muted/50 p-3 text-xs text-foreground mb-6">
            <span className="font-semibold block mb-1">Panduan:</span>
            <p className="text-muted-foreground leading-relaxed">
              {bootError.userActionGuidance}
            </p>
          </div>
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                window.location.reload()
              }}
            >
              Muat Ulang Halaman
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
              Schedovyn
            </span>
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            {workspace ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs min-w-0">
                <span className="font-medium text-foreground truncate">
                  {workspace.name}
                </span>
                <span className="text-muted-foreground" aria-hidden="true">
                  ·
                </span>
                <span className="text-muted-foreground truncate">
                  {workspace.academicPeriod}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Memuat ruang kerja...
              </span>
            )}
          </div>

          <nav
            aria-label="Navigasi Utama"
            className="flex flex-wrap items-center gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
                      isActive
                        ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <SaveStatusBadge />
            <ThemeToggleButton
              themeControl={themeControl}
              onInit={setThemeControl}
            />
          </div>
        </div>
      </header>

      {saveStatus === "error" && saveErrorMessage && (
        <div className="border-b border-border bg-background px-4 py-2">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>Kegagalan Penyimpanan Lokal</AlertTitle>
            <AlertDescription>{saveErrorMessage}</AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  void retryPendingStorageSync()
                }}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Coba Simpan Ulang
              </Button>
            </AlertAction>
          </Alert>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {isHydrating && !isHydrated ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
            <Spinner className="size-5 text-primary" />
            <p>Memuat data ruang kerja dari penyimpanan browser...</p>
          </div>
        ) : (
          children ?? <Outlet />
        )}
      </main>
    </div>
  )
}

function ThemeToggleButton({
  themeControl,
  onInit,
}: {
  themeControl: {
    theme: "dark" | "light" | "system"
    setTheme: (next: "dark" | "light" | "system") => void
  } | null
  onInit: (ctrl: {
    theme: "dark" | "light" | "system"
    setTheme: (next: "dark" | "light" | "system") => void
  }) => void
}) {
  return <SafeThemeButton themeControl={themeControl} onInit={onInit} />
}

function SafeThemeButton(props: {
  themeControl: {
    theme: "dark" | "light" | "system"
    setTheme: (next: "dark" | "light" | "system") => void
  } | null
  onInit: (ctrl: {
    theme: "dark" | "light" | "system"
    setTheme: (next: "dark" | "light" | "system") => void
  }) => void
}) {
  const [fallbackTheme, setFallbackTheme] = React.useState<"light" | "dark">(
    "light"
  )

  let currentTheme: "dark" | "light" | "system" = fallbackTheme
  let updateTheme: (next: "dark" | "light" | "system") => void = (next) => {
    const resolved = next === "dark" ? "dark" : "light"
    setFallbackTheme(resolved)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(resolved)
  }

  try {
    const ctx = useTheme()
    currentTheme = ctx.theme
    updateTheme = ctx.setTheme
  } catch {
    // Fallback when rendered in isolated tests without ThemeProvider
  }

  const isDark = currentTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Ubah tema tampilan (Pintasan: D)"
      title="Ubah tema tampilan (Pintasan: D)"
      onClick={() => {
        updateTheme(isDark ? "light" : "dark")
      }}
      data-theme-active={props.themeControl ? "provider" : "ready"}
    >
      {isDark ? (
        <SunIcon data-icon="inline-start" />
      ) : (
        <MoonIcon data-icon="inline-start" />
      )}
      <span className="hidden sm:inline">{isDark ? "Terang" : "Gelap"}</span>
      <kbd className="border border-border bg-muted px-1 text-[10px] font-mono text-muted-foreground">
        D
      </kbd>
    </Button>
  )
}
