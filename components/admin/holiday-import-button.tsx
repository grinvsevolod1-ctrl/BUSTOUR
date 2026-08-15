"use client"

import { useState } from "react"
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

type ImportResult = { imported: number; skipped: number; total: number; error?: string }

export function HolidayImportButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleImport() {
    setState("loading")
    setResult(null)
    try {
      const res = await fetch("/api/admin/parse-holiday-reviews", { method: "POST" })
      const data: ImportResult = await res.json()
      if (data.error && data.imported === undefined) {
        setState("error")
        setResult(data)
      } else {
        setState("done")
        setResult(data)
        // Refresh the page to show new reviews
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch {
      setState("error")
      setResult({ imported: 0, skipped: 0, total: 0, error: "Ошибка сети" })
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleImport}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {state === "loading" ? "Импортирую..." : "Импортировать отзывы"}
      </button>

      {state === "done" && result && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Добавлено: {result.imported} · Пропущено: {result.skipped}
        </div>
      )}
      {state === "error" && result?.error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {result.error}
        </div>
      )}
    </div>
  )
}
