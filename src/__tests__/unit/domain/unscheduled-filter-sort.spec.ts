import { describe, expect, it } from "vitest"
import * as unscheduledDomain from "@/domain/timetable/unscheduled-sessions"
import type { UnscheduledSessionItem } from "@/domain/timetable/unscheduled-sessions"

export interface UnscheduledFilterOptions {
  searchQuery?: string
  subjectId?: string | null
  statusFilter?: "all" | "unfulfilled_only" | "fulfilled_only"
  sortBy?: "subject_name_asc" | "remaining_desc" | "duration_desc"
}

type FilterAndSortFn = (
  items: readonly UnscheduledSessionItem[],
  subjectNameMap: ReadonlyMap<string, string>,
  options: UnscheduledFilterOptions
) => UnscheduledSessionItem[]

const filterAndSort = (
  unscheduledDomain as { filterAndSortUnscheduledItems?: FilterAndSortFn }
).filterAndSortUnscheduledItems

describe("QA-02 & FR-06.3: Filter & Sort Utilitas (filterAndSortUnscheduledItems)", () => {
  const subjectNameMap = new Map<string, string>([
    ["sub-math", "Matematika"],
    ["sub-ipa", "Ilmu Pengetahuan Alam"],
    ["sub-ips", "Ilmu Pengetahuan Sosial"],
    ["sub-eng", "Bahasa Inggris"],
    ["sub-pjok", "Pendidikan Jasmani"],
  ])

  const itemMath1: UnscheduledSessionItem = {
    virtualId: "req-math::slot-0",
    requirementId: "req-math",
    classId: "cls-7a",
    subjectId: "sub-math",
    defaultTeacherId: "tch-1",
    defaultRoomId: "rm-1",
    durationMinutes: 45,
    roomRequired: true,
    slotIndex: 0,
    remainingCount: 3,
    totalRequiredCount: 3,
  }

  const itemIpa1: UnscheduledSessionItem = {
    virtualId: "req-ipa::slot-0",
    requirementId: "req-ipa",
    classId: "cls-7a",
    subjectId: "sub-ipa",
    defaultTeacherId: "tch-2",
    defaultRoomId: null,
    durationMinutes: 90,
    roomRequired: false,
    slotIndex: 0,
    remainingCount: 1,
    totalRequiredCount: 2,
  }

  const itemIps1: UnscheduledSessionItem = {
    virtualId: "req-ips::slot-0",
    requirementId: "req-ips",
    classId: "cls-7a",
    subjectId: "sub-ips",
    defaultTeacherId: "tch-3",
    defaultRoomId: null,
    durationMinutes: 40,
    roomRequired: false,
    slotIndex: 0,
    remainingCount: 2,
    totalRequiredCount: 2,
  }

  const itemEngFulfilled: UnscheduledSessionItem = {
    virtualId: "req-eng::slot-0",
    requirementId: "req-eng",
    classId: "cls-7a",
    subjectId: "sub-eng",
    defaultTeacherId: "tch-4",
    defaultRoomId: null,
    durationMinutes: 60,
    roomRequired: false,
    slotIndex: 0,
    remainingCount: 0,
    totalRequiredCount: 2,
  }

  const allItems: UnscheduledSessionItem[] = [
    itemMath1,
    itemIpa1,
    itemIps1,
    itemEngFulfilled,
  ]

  it("1. pencarian teks nama mata pelajaran bersifat case-insensitive dan mengabaikan spasi berlebih", () => {
    expect(typeof filterAndSort).toBe("function")
    if (!filterAndSort) return

    // Mencari kata "pengetahuan" dengan spasi ekstra dan huruf besar-kecil campuran
    const result = filterAndSort(allItems, subjectNameMap, {
      searchQuery: "   pEnGeTaHuAn   ",
    })
    expect(result).toHaveLength(2)
    expect(result.map((it) => it.subjectId)).toEqual(["sub-ipa", "sub-ips"])

    // Query kosong atau hanya whitespace mengembalikan seluruh item
    const emptyResult = filterAndSort(allItems, subjectNameMap, {
      searchQuery: "   ",
    })
    expect(emptyResult).toHaveLength(4)

    // Query yang tidak cocok menghasilkan array kosong
    const noMatch = filterAndSort(allItems, subjectNameMap, {
      searchQuery: "Biologi Modern",
    })
    expect(noMatch).toHaveLength(0)
  })

  it("2. filter berdasarkan subjectId tertentu hanya mengembalikan kartu mata pelajaran tersebut", () => {
    expect(typeof filterAndSort).toBe("function")
    if (!filterAndSort) return

    const result = filterAndSort(allItems, subjectNameMap, {
      subjectId: "sub-math",
    })
    expect(result).toHaveLength(1)
    expect(result[0].subjectId).toBe("sub-math")

    const allResult = filterAndSort(allItems, subjectNameMap, {
      subjectId: null,
    })
    expect(allResult).toHaveLength(4)
  })

  it("3. filter status pemenuhan unfulfilled_only, fulfilled_only, dan all", () => {
    expect(typeof filterAndSort).toBe("function")
    if (!filterAndSort) return

    // unfulfilled_only: hanya yang remainingCount > 0
    const unfulfilled = filterAndSort(allItems, subjectNameMap, {
      statusFilter: "unfulfilled_only",
    })
    expect(unfulfilled).toHaveLength(3)
    expect(unfulfilled.every((it) => it.remainingCount > 0)).toBe(true)
    expect(unfulfilled.some((it) => it.subjectId === "sub-eng")).toBe(false)

    // fulfilled_only: hanya yang remainingCount === 0
    const fulfilled = filterAndSort(allItems, subjectNameMap, {
      statusFilter: "fulfilled_only",
    })
    expect(fulfilled).toHaveLength(1)
    expect(fulfilled[0].subjectId).toBe("sub-eng")
    expect(fulfilled[0].remainingCount).toBe(0)

    // all: semua item
    const all = filterAndSort(allItems, subjectNameMap, {
      statusFilter: "all",
    })
    expect(all).toHaveLength(4)
  })

  it("4. pengurutan kartu: subject_name_asc (A ke Z)", () => {
    expect(typeof filterAndSort).toBe("function")
    if (!filterAndSort) return

    const result = filterAndSort(allItems, subjectNameMap, {
      sortBy: "subject_name_asc",
    })
    expect(result).toHaveLength(4)
    // Urutan alfabetis nama:
    // Bahasa Inggris (sub-eng), Ilmu Pengetahuan Alam (sub-ipa), Ilmu Pengetahuan Sosial (sub-ips), Matematika (sub-math)
    expect(result.map((it) => it.subjectId)).toEqual([
      "sub-eng",
      "sub-ipa",
      "sub-ips",
      "sub-math",
    ])
  })

  it("5. pengurutan kartu: remaining_desc (sisa sesi terbanyak di posisi teratas)", () => {
    expect(typeof filterAndSort).toBe("function")
    if (!filterAndSort) return

    const result = filterAndSort(allItems, subjectNameMap, {
      sortBy: "remaining_desc",
    })
    expect(result).toHaveLength(4)
    // Sisa sesi: Math (3), IPS (2), IPA (1), Eng (0)
    expect(result.map((it) => it.remainingCount)).toEqual([3, 2, 1, 0])
    expect(result[0].subjectId).toBe("sub-math")
    expect(result[3].subjectId).toBe("sub-eng")
  })

  it("6. pengurutan kartu: duration_desc (durasi terpanjang di posisi teratas)", () => {
    expect(typeof filterAndSort).toBe("function")
    if (!filterAndSort) return

    const result = filterAndSort(allItems, subjectNameMap, {
      sortBy: "duration_desc",
    })
    expect(result).toHaveLength(4)
    // Durasi: IPA (90), Eng (60), Math (45), IPS (40)
    expect(result.map((it) => it.durationMinutes)).toEqual([90, 60, 45, 40])
    expect(result[0].subjectId).toBe("sub-ipa")
    expect(result[3].subjectId).toBe("sub-ips")
  })
})
