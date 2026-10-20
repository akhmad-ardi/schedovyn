import * as React from "react"
import { cn } from "cn"
import { ClassesTab } from "@/components/master-data/classes-tab"
import { RequirementsTab } from "@/components/master-data/requirements-tab"
import { RoomsTab } from "@/components/master-data/rooms-tab"
import { SubjectsTab } from "@/components/master-data/subjects-tab"
import { TeachersTab } from "@/components/master-data/teachers-tab"
import { useWorkspaceStore } from "@/store/use-workspace-store"

type MasterDataTabKey =
  | "classes"
  | "subjects"
  | "teachers"
  | "rooms"
  | "requirements"

export function MasterDataPage() {
  const classes = useWorkspaceStore((state) => state.classes)
  const subjects = useWorkspaceStore((state) => state.subjects)
  const teachers = useWorkspaceStore((state) => state.teachers)
  const rooms = useWorkspaceStore((state) => state.rooms)
  const requirements = useWorkspaceStore((state) => state.requirements)

  const [activeTab, setActiveTab] =
    React.useState<MasterDataTabKey>("classes")

  const tabs: {
    key: MasterDataTabKey
    label: string
    count: number
  }[] = [
    { key: "classes", label: "Kelas", count: classes.length },
    { key: "subjects", label: "Mata Pelajaran", count: subjects.length },
    { key: "teachers", label: "Guru", count: teachers.length },
    { key: "rooms", label: "Ruangan", count: rooms.length },
    {
      key: "requirements",
      label: "Kebutuhan Pembelajaran",
      count: requirements.length,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-base font-semibold tracking-tight text-foreground">
          Pengelolaan Data Master
        </h1>
        <p className="text-xs/relaxed text-muted-foreground tabular-nums">
          Kelola daftar Kelas ({classes.length}), Mata Pelajaran (
          {subjects.length}), Guru ({teachers.length}), Ruangan ({rooms.length}
          ), serta Kebutuhan Pembelajaran ({requirements.length}) yang menjadi
          dasar penyusunan jadwal dan deteksi konflik lintas kelas.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Kategori Data Master"
        className="flex flex-wrap items-center gap-1 border-b border-border pb-2"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex h-8 items-center gap-2 border px-3 text-xs font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
                isActive
                  ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="border border-border bg-muted px-1.5 py-0.2 text-[11px] tabular-nums text-foreground">
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "classes" && <ClassesTab />}
        {activeTab === "subjects" && <SubjectsTab />}
        {activeTab === "teachers" && <TeachersTab />}
        {activeTab === "rooms" && <RoomsTab />}
        {activeTab === "requirements" && (
          <RequirementsTab onNavigateTab={(target) => setActiveTab(target)} />
        )}
      </div>
    </div>
  )
}
