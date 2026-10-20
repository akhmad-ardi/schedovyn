import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { db } from "@/db/database"
import { useWorkspaceStore } from "@/store/use-workspace-store"
import { AppShell } from "@/components/layout/app-shell"
import { MasterDataPage } from "@/pages/master-data-page"

function renderMasterDataWithShell() {
  return render(
    <MemoryRouter initialEntries={["/master-data"]}>
      <AppShell>
        <MasterDataPage />
      </AppShell>
    </MemoryRouter>
  )
}

describe("FR-02: Halaman Pengelolaan Data Master (MasterDataPage)", () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useWorkspaceStore.setState({
      isHydrated: false,
      isHydrating: false,
      workspace: null,
      dayConfigs: [],
      classes: [],
      subjects: [],
      teachers: [],
      rooms: [],
      requirements: [],
      sessions: [],
      configValidation: { isValid: true, issues: [] },
      saveStatus: "idle",
      lastSavedAt: null,
      saveErrorMessage: null,
    })
  })

  it("merender 5 tab Data Master (Kelas, Mata Pelajaran, Guru, Ruangan, Kebutuhan Pembelajaran)", async () => {
    renderMasterDataWithShell()

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Kelas/i })).toBeInTheDocument()
    })

    expect(
      screen.getByRole("tab", { name: /Mata Pelajaran/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Guru/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Ruangan/i })).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: /Kebutuhan Pembelajaran/i })
    ).toBeInTheDocument()
  })

  it("menambahkan Kelas, Mata Pelajaran, Guru, Ruangan, dan menampilkan pesan error Bahasa Indonesia saat duplikat/kosong", async () => {
    const user = userEvent.setup()
    renderMasterDataWithShell()

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Kelas/i })).toBeInTheDocument()
    })

    // 1. Tambah Kelas VII-A
    const classNameInput = screen.getByPlaceholderText(/Contoh: VII-A/i)
    const classGradeInput = screen.getByPlaceholderText(/Contoh: VII$/i)
    await user.type(classNameInput, "VII-A")
    await user.type(classGradeInput, "VII")
    await user.click(screen.getByRole("button", { name: /Tambah Kelas/i }))

    await waitFor(() => {
      expect(screen.getByText("VII-A")).toBeInTheDocument()
    })

    // Coba tambah kelas duplikat untuk memicu Alert validasi Bahasa Indonesia
    await user.type(screen.getByPlaceholderText(/Contoh: VII-A/i), "vii-a")
    await user.type(screen.getByPlaceholderText(/Contoh: VII$/i), "VII")
    await user.click(screen.getByRole("button", { name: /Tambah Kelas/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })

    // 2. Pindah ke tab Mata Pelajaran dan tambah Matematika
    await user.click(screen.getByRole("tab", { name: /Mata Pelajaran/i }))
    const subjectNameInput = await screen.findByPlaceholderText(
      /Contoh: Matematika/i
    )
    await user.type(subjectNameInput, "Matematika")
    await user.click(
      screen.getByRole("button", { name: /Tambah Mata Pelajaran/i })
    )

    await waitFor(() => {
      expect(screen.getByText("Matematika")).toBeInTheDocument()
    })

    // 3. Pindah ke tab Guru dan tambah Budi Santoso
    await user.click(screen.getByRole("tab", { name: /Guru/i }))
    const teacherNameInput = await screen.findByPlaceholderText(
      /Contoh: Budi Santoso/i
    )
    await user.type(teacherNameInput, "Budi Santoso")
    await user.click(screen.getByRole("button", { name: /Tambah Guru/i }))

    await waitFor(() => {
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument()
    })

    // 4. Pindah ke tab Ruangan dan tambah Lab IPA 1
    await user.click(screen.getByRole("tab", { name: /Ruangan/i }))
    const roomNameInput = await screen.findByPlaceholderText(
      /Contoh: Lab IPA 1/i
    )
    await user.type(roomNameInput, "Lab IPA 1")
    await user.click(screen.getByRole("button", { name: /Tambah Ruangan/i }))

    await waitFor(() => {
      expect(screen.getByText("Lab IPA 1")).toBeInTheDocument()
    })

    // 5. Pindah ke tab Kebutuhan Pembelajaran dan simpan kebutuhan VII-A + Matematika
    await user.click(
      screen.getByRole("tab", { name: /Kebutuhan Pembelajaran/i })
    )
    const addReqBtn = await screen.findByRole("button", {
      name: /Tambah Kebutuhan/i,
    })
    await user.click(addReqBtn)

    await waitFor(() => {
      expect(useWorkspaceStore.getState().requirements.length).toBeGreaterThan(
        0
      )
    })
  })
})
