import { beforeAll, describe, expect, it } from "vitest"
import type * as StorageDiagnosticsModule from "@/domain/storage/storage-diagnostics"

describe("QA-10.1 & FR-10: Storage Error Diagnostics (storage-diagnostics)", () => {
  let diagnostics: typeof StorageDiagnosticsModule | null = null

  beforeAll(async () => {
    try {
      const modulePath = "@/domain/storage/storage-diagnostics"
      diagnostics = await import(/* @vite-ignore */ modulePath)
    } catch {
      diagnostics = null
    }
  })

  it("1. mendiagnosis DOMException QuotaExceededError menjadi kode QUOTA_EXCEEDED dan isRetryable true", () => {
    expect(diagnostics).not.toBeNull()
    if (!diagnostics) return

    const quotaError = new DOMException(
      "The quota has been exceeded.",
      "QuotaExceededError"
    )

    const result = diagnostics.diagnoseStorageError(quotaError)

    expect(result.code).toBe("QUOTA_EXCEEDED")
    expect(result.isRetryable).toBe(true)
    expect(result.title).toContain("Penyimpanan")
    expect(result.userActionGuidance).toMatch(/ekspor|data situs/i)
    expect(result.message).not.toContain("—")
  })

  it("2. mendiagnosis error dengan pesan kata 'quota' menjadi QUOTA_EXCEEDED", () => {
    expect(diagnostics).not.toBeNull()
    if (!diagnostics) return

    const error = new Error("Dexie operation failed: Disk quota exceeded")
    const result = diagnostics.diagnoseStorageError(error)

    expect(result.code).toBe("QUOTA_EXCEEDED")
    expect(result.isRetryable).toBe(true)
  })

  it("3. mendiagnosis SecurityError (incognito/privasi ketat) menjadi STORAGE_BLOCKED dan isRetryable false", () => {
    expect(diagnostics).not.toBeNull()
    if (!diagnostics) return

    const securityError = new DOMException(
      "The operation is insecure or blocked by browser settings.",
      "SecurityError"
    )

    const result = diagnostics.diagnoseStorageError(securityError)

    expect(result.code).toBe("STORAGE_BLOCKED")
    expect(result.isRetryable).toBe(false)
    expect(result.title).toMatch(/dibatasi|diblokir/i)
    expect(result.userActionGuidance).toMatch(/reguler|jendela/i)
  })

  it("4. mendiagnosis ketiadaan dukungan IndexedDB menjadi INDEXEDDB_UNSUPPORTED dan isRetryable false", () => {
    expect(diagnostics).not.toBeNull()
    if (!diagnostics) return

    const unsupportedError = new Error("indexeddb is not supported on this client")
    const result = diagnostics.diagnoseStorageError(unsupportedError)

    expect(result.code).toBe("INDEXEDDB_UNSUPPORTED")
    expect(result.isRetryable).toBe(false)
    expect(result.title).toMatch(/tidak didukung/i)
  })

  it("5. mendiagnosis galat transaksi generik menjadi TRANSACTION_FAILURE dan isRetryable true", () => {
    expect(diagnostics).not.toBeNull()
    if (!diagnostics) return

    const genericError = new Error("AbortError: Transaction failed due to locked database")
    const result = diagnostics.diagnoseStorageError(genericError)

    expect(result.code).toBe("TRANSACTION_FAILURE")
    expect(result.isRetryable).toBe(true)
    expect(result.title).toMatch(/gagal menyimpan/i)
    expect(result.userActionGuidance).toMatch(/coba simpan ulang/i)
  })

  it("6. menangani input non-Error seperti string, null, atau undefined dengan aman", () => {
    expect(diagnostics).not.toBeNull()
    if (!diagnostics) return

    const strResult = diagnostics.diagnoseStorageError("Unknown disk write timeout")
    expect(strResult.code).toBe("TRANSACTION_FAILURE")
    expect(strResult.isRetryable).toBe(true)

    const nullResult = diagnostics.diagnoseStorageError(null)
    expect(nullResult.code).toBe("TRANSACTION_FAILURE")
    expect(nullResult.isRetryable).toBe(true)
  })
})
