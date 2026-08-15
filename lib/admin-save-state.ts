export type AdminFieldError = {
  field: string
  message: string
  focusId?: string
  tabHash?: `#${string}`
}

export type AdminSaveResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false
      error: string
      fieldErrors?: Record<string, string>
      firstError?: AdminFieldError
      partial?: { savedSourceIds: string[]; failedSourceId: string }
    }
