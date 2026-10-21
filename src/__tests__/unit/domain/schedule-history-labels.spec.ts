import { beforeAll, describe, expect, it } from "vitest"
import type * as ScheduleHistoryDomain from "@/domain/history/schedule-history"

describe("QA-02 & FR-07: Action Label Formatter (formatScheduleActionLabel)", () => {
  let domain: typeof ScheduleHistoryDomain | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/domain/history/schedule-history"
      domain = await import(/* @vite-ignore */ modulePath)
    } catch {
      domain = null
    }
  })

  it("1. format label penempatan sesi (type: 'place')", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const label = domain.formatScheduleActionLabel({
      type: "place",
      subjectName: "Matematika",
      dayLabel: "Senin",
      timeRange: "07:30",
    })
    expect(label).toBe("Tempatkan Matematika ke Senin 07:30")
  })

  it("2. format label pemindahan sesi (type: 'move')", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const label = domain.formatScheduleActionLabel({
      type: "move",
      subjectName: "IPA",
      dayLabel: "Selasa",
      timeRange: "09:00",
    })
    expect(label).toBe("Pindahkan IPA ke Selasa 09:00")
  })

  it("3. format label ubah jam/waktu sesi (type: 'update_time')", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const label = domain.formatScheduleActionLabel({
      type: "update_time",
      subjectName: "Bahasa Inggris",
      timeRange: "08:00 - 09:30",
    })
    expect(label).toBe("Ubah jam Bahasa Inggris menjadi 08:00 - 09:30")
  })

  it("4. format label ubah detail guru atau ruangan (type: 'update_details')", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const label = domain.formatScheduleActionLabel({
      type: "update_details",
      subjectName: "Matematika",
      extraDetail: "Guru: Budi Santoso",
    })
    expect(label).toBe("Ubah detail Matematika (Guru: Budi Santoso)")
  })

  it("5. format label pelepasan sesi dari grid (type: 'remove')", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    const label = domain.formatScheduleActionLabel({
      type: "remove",
      subjectName: "Seni Budaya",
    })
    expect(label).toBe("Lepas sesi Seni Budaya dari grid")
  })

  it("6. penanganan fallback jika parameter deskriptif tidak lengkap atau kosong", () => {
    expect(domain).not.toBeNull()
    if (!domain) return

    expect(
      domain.formatScheduleActionLabel({
        type: "place",
      })
    ).toMatch(/tempatkan/i)

    expect(
      domain.formatScheduleActionLabel({
        type: "move",
      })
    ).toMatch(/pindahkan/i)

    expect(
      domain.formatScheduleActionLabel({
        type: "update_time",
      })
    ).toMatch(/ubah.*waktu|ubah.*jam/i)

    expect(
      domain.formatScheduleActionLabel({
        type: "update_details",
      })
    ).toMatch(/ubah.*detail/i)

    expect(
      domain.formatScheduleActionLabel({
        type: "remove",
      })
    ).toMatch(/lepas.*sesi/i)
  })
})
