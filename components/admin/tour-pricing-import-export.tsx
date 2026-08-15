"use client"

import { useActionState, useRef, useState } from "react"
import { Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react"
import { toast } from "sonner"
import { Alert, Button, Card, CardBody, CardHeader, CardTitle } from "@/components/admin/ui"
import { exportTourPricingAction, importTourPricingAction, type ImportPricingState } from "@/app/admin/tour-pricing-io-actions"

function downloadBase64(base64: string, filename: string) {
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function TourPricingImportExport() {
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState<ImportPricingState, FormData>(importTourPricingAction, null)

  async function handleExport() {
    setExporting(true)
    try {
      const result = await exportTourPricingAction()
      if (result.success) {
        downloadBase64(result.base64, result.filename)
        toast.success("Файл сформирован")
      } else {
        toast.error(result.error)
      }
    } finally {
      setExporting(false)
    }
  }

  function handleImportSubmit() {
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <CardTitle>Массовое редактирование цен через Excel</CardTitle>
        </div>
        <p className="mt-1 text-xs text-admin-fg-muted">
          Скачайте текущие цены всех автобусных туров в один файл (лист на тур), отредактируйте в Excel и загрузите
          обратно — обновятся сразу все туры. Не меняйте «#ID» в начале названия листа и заголовки колонок.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Скачать Excel
          </Button>

          <form
            action={formAction}
            onSubmit={handleImportSubmit}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".xlsx"
              required
              className="text-sm text-admin-fg-muted file:mr-3 file:rounded-md file:border file:border-admin-border file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-admin-fg hover:file:bg-admin-muted"
            />
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {pending ? "Загрузка…" : "Загрузить Excel"}
            </Button>
          </form>
        </div>

        {state?.updatedCount ? (
          <Alert tone="info" title={`Обновлено туров: ${state.updatedCount}`}>
            <p className="text-sm">{state.updatedTitles?.join(", ")}</p>
          </Alert>
        ) : null}

        {state?.error && !state.updatedCount ? (
          <Alert tone="danger" title="Импорт не выполнен">
            <p className="text-sm">{state.error}</p>
          </Alert>
        ) : null}

        {state?.errors?.length ? (
          <Alert tone="warning" title={`Пропущено строк/листов: ${state.errors.length}`}>
            <ul className="mt-1 space-y-1 text-sm">
              {state.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  <span className="font-medium">{e.sheet}</span>
                  {e.row ? `, строка ${e.row}` : ""}: {e.message}
                </li>
              ))}
              {state.errors.length > 20 ? <li>… и ещё {state.errors.length - 20}</li> : null}
            </ul>
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  )
}
