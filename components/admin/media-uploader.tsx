"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, ChevronUp, FolderOpen, GripVertical, LoaderCircle, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Alert, IconButton, Label } from "@/components/admin/ui"
import { MediaThumbnail } from "@/components/admin/media-thumbnail"
import { detectType, extToType, extensionsByType, formatBytes, mimeTypesByType, MAX_MEDIA_SIZE_MB } from "@/lib/media-utils"
import { cn } from "@/lib/utils"
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog"
import { MediaAltField } from "@/components/admin/media-alt-field"
import { InstanceAltField } from "@/components/admin/instance-alt-field"
import { moveMediaAt, patchMediaAt, removeMediaAt } from "@/lib/media-list"
import { sha256HexFromBlob } from "@/lib/media-checksum"
import { encodeImageFileToWebp } from "@/lib/browser-webp"
import type { MediaItem, UploadedFile } from "@/lib/media-types"
import { isMediaReady, toUploadedFile } from "@/lib/media-types"

export type MediaType = UploadedFile["type"]
export type { MediaItem, UploadedFile } from "@/lib/media-types"
export { detectType, extToType, formatBytes } from "@/lib/media-utils"

export function uploadedFileFromUrl(url: string): UploadedFile {
  const cleanUrl = url.split(/[?#]/, 1)[0]
  const rawName = cleanUrl.slice(cleanUrl.lastIndexOf("/") + 1)
  let name = rawName || "Медиа"

  try {
    name = decodeURIComponent(name)
  } catch {
    // Keep the raw basename when the URL contains malformed encoding.
  }

  return {
    id: url,
    url,
    name,
    size: "",
    type: extToType(cleanUrl) ?? "image",
  }
}

type MediaUploaderBaseProps = {
  accept?: MediaType[]
  maxSizeMB?: number
  label?: string
  className?: string
  uploadFn?: (file: File, onProgress?: (ratio: number) => void) => Promise<UploadedFile | MediaItem>
  showLibraryButton?: boolean
  /** library = PATCH defaultAlt; instance = local customAlt; none = hide. */
  altMode?: "library" | "instance" | "none"
  /** Fires when upload queue becomes busy / idle (page banners, beforeunload helpers). */
  onBusyChange?: (busy: boolean) => void
  /** Assign new uploads to this flat folder (ignored when custom uploadFn is set). */
  folderId?: string | null
  /** Fires when server has accepted the file into media library, even if processing is still running. */
  onUploadAccepted?: (item: MediaItem) => void
}

type SingleMediaUploaderProps = MediaUploaderBaseProps & {
  mode?: "single"
  value: UploadedFile | null
  onChange: (next: UploadedFile | null) => void
}

type MultipleMediaUploaderProps = MediaUploaderBaseProps & {
  mode: "multiple"
  value: UploadedFile[]
  onChange: (next: UploadedFile[]) => void
}

export type MediaUploaderProps = SingleMediaUploaderProps | MultipleMediaUploaderProps

const allTypes: MediaType[] = ["image", "video", "document"]

type PendingUpload = {
  id: string
  name: string
  sizeLabel: string
  /** 0–100; -1 = indeterminate until first progress event */
  progress: number
  /** Shown while progress is indeterminate or as status prefix */
  stage: "prepare" | "compress" | "upload" | "process"
}

async function waitForReadyMedia(id: string, timeoutMs = 10 * 60_000): Promise<UploadedFile> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`/api/media/${encodeURIComponent(id)}`, {
      credentials: "same-origin",
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error ?? "Не удалось дождаться обработки файла.")
    }
    const payload = (await response.json().catch(() => null)) as MediaItem | null
    if (!payload) throw new Error("Файл не найден.")
    if (payload.status === "ready") return toUploadedFile(payload)
    if (payload.status === "failed") {
      throw new Error(payload.errorMessage || "Не удалось обработать файл.")
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }

  throw new Error("Сервер слишком долго обрабатывает файл. Проверьте медиатеку позже.")
}

/** XHR upload so we can show real byte progress (fetch has no upload progress). */
export function startUploadFileApi(
  file: File,
  onProgress?: (ratio: number) => void,
  opts?: { folderId?: string | null },
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/media/upload")
    xhr.withCredentials = true
    xhr.responseType = "json"
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(event.loaded / event.total)
      }
    }
    xhr.onload = () => {
      const payload = xhr.response as MediaItem | { error?: string } | null
      if (xhr.status >= 200 && xhr.status < 300 && payload && "id" in payload) {
        onProgress?.(1)
        resolve(payload)
        return
      }
      const message =
        payload && typeof payload === "object" && "error" in payload && payload.error
          ? payload.error
          : "Не удалось загрузить файл."
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error("Сеть недоступна. Проверьте соединение и попробуйте снова."))
    xhr.onabort = () => reject(new Error("Загрузка отменена."))
    const formData = new FormData()
    formData.append("file", file)
    if (opts?.folderId) formData.append("folderId", opts.folderId)
    xhr.send(formData)
  })
}

export async function uploadFileApi(
  file: File,
  onProgress?: (ratio: number) => void,
  opts?: { folderId?: string | null },
): Promise<UploadedFile> {
  const item = await startUploadFileApi(file, onProgress, opts)
  if (item.status === "ready") return toUploadedFile(item)
  return waitForReadyMedia(item.id)
}

function revokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url)
}

function fileAcceptValue(types: MediaType[]) {
  return types
    .flatMap((type) => [...extensionsByType[type], ...mimeTypesByType[type]])
    .join(",")
}

export function MediaUploader(props: MediaUploaderProps) {
  const mode = props.mode ?? "single"
  const {
    accept = allTypes,
    maxSizeMB = MAX_MEDIA_SIZE_MB,
    label = "Файлы",
    className,
    uploadFn: uploadFnProp,
    showLibraryButton = true,
    altMode = "instance",
    onBusyChange,
    folderId = null,
    onUploadAccepted,
  } = props
  const uploadFn =
    uploadFnProp ??
    ((file: File, onProgress?: (ratio: number) => void) =>
      uploadFileApi(file, onProgress, { folderId }))
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(props.value)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  // ponytail: native HTML5 DnD by index — same pattern as TourLayoutBuilder
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // ponytail: no confirm modal — auto-reuse so form fields (e.g. tour cover) fill without a click
  const transferBusy = pendingUploads.some((item) => item.stage !== "process")
  const busy = pendingUploads.length > 0

  valueRef.current = props.value

  async function lookupByChecksum(checksum: string): Promise<MediaItem | null> {
    const response = await fetch(`/api/media/by-checksum?checksum=${encodeURIComponent(checksum)}`, {
      credentials: "same-origin",
    })
    if (!response.ok) return null
    const payload = (await response.json().catch(() => null)) as { existing?: MediaItem | null } | null
    return payload?.existing ?? null
  }

  useEffect(() => {
    return () => {
      const current = valueRef.current
      if (Array.isArray(current)) {
        current.forEach((file) => revokeObjectUrl(file.url))
      } else if (current) {
        revokeObjectUrl(current.url)
      }
    }
  }, [])

  useEffect(() => {
    onBusyChange?.(transferBusy)
  }, [transferBusy, onBusyChange])

  useEffect(() => {
    if (!transferBusy) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [transferBusy])

  const files = props.mode === "multiple" ? props.value : props.value ? [props.value] : []

  function removeFile(index: number) {
    // Detach from form only — physical delete is Media Library (explorer) DELETE.
    // Remove by slot index: checksum dedupe returns the same media.id for identical files.
    if (props.mode === "multiple") {
      const file = props.value[index]
      if (file) revokeObjectUrl(file.url)
      props.onChange(removeMediaAt(props.value, index))
    } else {
      if (props.value) revokeObjectUrl(props.value.url)
      props.onChange(null)
    }
  }

  function patchFile(index: number, next: UploadedFile) {
    if (props.mode === "multiple") {
      props.onChange(patchMediaAt(props.value, index, next))
    } else {
      props.onChange(next)
    }
  }

  function reorderFile(from: number, to: number) {
    if (props.mode !== "multiple") return
    props.onChange(moveMediaAt(props.value, from, to))
  }

  function dropAt(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    reorderFile(dragIndex, targetIndex)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  async function handleFiles(selectedFiles: File[]) {
    setError("")
    const filesToUpload = mode === "single" ? selectedFiles.slice(0, 1) : selectedFiles
    const rejected: string[] = []
    const validFiles = filesToUpload.filter((file) => {
      const type = detectType(file)
      if (!type || !accept.includes(type)) {
        rejected.push(`«${file.name}»: неподдерживаемый тип.`)
        return false
      }
      if (maxSizeMB !== undefined && file.size > maxSizeMB * 1024 * 1024) {
        rejected.push(`«${file.name}»: размер больше ${maxSizeMB} МБ.`)
        return false
      }
      return true
    })

    if (rejected.length) {
      const message = rejected.join(" ")
      setError(message)
      toast.error(message)
    }
    if (!validFiles.length) return

    const toastId = toast.loading(
      validFiles.length === 1
        ? `Загрузка «${validFiles[0]!.name}»…`
        : `Загрузка ${validFiles.length} файлов…`,
    )

    const accepted: UploadedFile[] = []
    let reused = 0
    let queued = 0
    let failed: string | null = null

    try {
      for (let index = 0; index < validFiles.length; index++) {
        const file = validFiles[index]!
        const pendingId = `${file.name}-${file.size}-${file.lastModified}-${index}-${Date.now()}`
        setPendingUploads((current) => [
          ...current,
          {
            id: pendingId,
            name: file.name,
            sizeLabel: formatBytes(file.size),
            progress: -1,
            stage: "prepare",
          },
        ])

        try {
          const kind = detectType(file)
          setPendingUploads((current) =>
            current.map((item) =>
              item.id === pendingId ? { ...item, stage: "compress", progress: -1 } : item,
            ),
          )
          // Client WebP+resize when sharp may be skipped on server; video convert is server-side (ffmpeg).
          const prepared = kind === "image" ? await encodeImageFileToWebp(file) : file
          const checksum = await sha256HexFromBlob(prepared)
          const existing = await lookupByChecksum(checksum)
          if (existing) {
            onUploadAccepted?.(existing)
            if (isMediaReady(existing)) {
              accepted.push(toUploadedFile(existing))
              reused += 1
            } else if (!onUploadAccepted) {
              accepted.push(await waitForReadyMedia(existing.id))
            } else {
              queued += 1
            }
            continue
          }

          setPendingUploads((current) =>
            current.map((item) =>
              item.id === pendingId ? { ...item, stage: "upload", progress: 0 } : item,
            ),
          )
          const uploaded = await uploadFn(prepared, (ratio) => {
            const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
            const reachedFinal = ratio >= 1
            setPendingUploads((current) =>
              current.map((item) =>
                item.id === pendingId
                  ? { ...item, stage: reachedFinal ? "process" : "upload", progress: pct }
                  : item,
              ),
            )
          })
          onUploadAccepted?.({
            ...toUploadedFile(uploaded),
            status: "status" in uploaded ? uploaded.status : "ready",
            processingStage: "status" in uploaded ? uploaded.processingStage : "ready",
            errorMessage: "status" in uploaded ? uploaded.errorMessage ?? null : null,
            mimeType: "status" in uploaded ? uploaded.mimeType ?? "" : "",
          })
          if (isMediaReady(uploaded)) accepted.push(toUploadedFile(uploaded))
          else if (!onUploadAccepted) accepted.push(await waitForReadyMedia(uploaded.id))
          else queued += 1
        } catch (error: unknown) {
          failed = error instanceof Error ? error.message : "Не удалось загрузить файл."
          break
        } finally {
          setPendingUploads((current) => current.filter((item) => item.id !== pendingId))
        }
      }

      if (accepted.length) {
        if (props.mode === "multiple") {
          props.onChange([...props.value, ...accepted])
        } else {
          if (props.value) revokeObjectUrl(props.value.url)
          props.onChange(accepted[accepted.length - 1] ?? null)
        }
      }

      if (failed) {
        setError(failed)
        toast.error(failed, { id: toastId })
      } else if (accepted.length === 0 && queued === 0) {
        toast.message("Загрузка отменена", { id: toastId })
      } else if (reused === accepted.length) {
        toast.success(
          accepted.length === 1
            ? `«${accepted[0]!.name}» — из медиатеки`
            : `Из медиатеки: ${accepted.length}`,
          { id: toastId },
        )
      } else if (queued > 0 && accepted.length === 0) {
        toast.success(
          queued === 1
            ? `Файл поставлен в обработку`
            : `Файлов в обработке: ${queued}`,
          { id: toastId },
        )
      } else if (queued > 0) {
        toast.success(`Готово: ${accepted.length}, в обработке: ${queued}`, { id: toastId })
      } else {
        toast.success(
          accepted.length === 1 ? `«${accepted[0]!.name}» готов` : `Готово файлов: ${accepted.length}`,
          { id: toastId },
        )
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить файл."
      setError(message)
      toast.error(message, { id: toastId })
    }
  }

  function handleLibraryPick(file: UploadedFile) {
    if (props.mode === "multiple") {
      props.onChange([...props.value, file])
    } else {
      if (props.value) revokeObjectUrl(props.value.url)
      props.onChange(file)
    }
    setLibraryOpen(false)
  }

  const doneCount = pendingUploads.filter((item) => item.progress >= 100).length
  const overallPct =
    pendingUploads.length === 0
      ? 0
      : Math.round(
          pendingUploads.reduce((sum, item) => sum + Math.max(0, item.progress), 0) /
            pendingUploads.length,
        )

  return (
    <div className={cn("space-y-3", className)}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}

      {transferBusy ? (
        <Alert
          tone="warning"
          title="Идёт загрузка"
          className="sticky top-0 z-30 shadow-sm"
        >
          <div className="space-y-2" aria-live="polite" aria-atomic="true">
            <p>
              {pendingUploads.length === 1
                ? `Файл «${pendingUploads[0]!.name}»…`
                : `${doneCount} из ${pendingUploads.length} файлов…`}{" "}
              <span className="font-medium tabular-nums">{overallPct}%</span>
            </p>
            <p className="text-amber-900/80">
              Не закрывайте вкладку и не уходите со страницы — загрузка прервётся. Можно добавить ещё
              файлы в очередь.
            </p>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-amber-200/80"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPct}
              aria-label="Общий прогресс загрузки"
            >
              <div
                className="h-full rounded-full bg-amber-600 transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </Alert>
      ) : null}

      {pendingUploads.some((item) => item.stage === "process") ? (
        <Alert tone="info" title="Контент в обработке" className="sticky top-0 z-20 shadow-sm">
          <div className="space-y-2" aria-live="polite" aria-atomic="true">
            <p>
              Файл уже загружен на сервер. Можно закрыть страницу или перейти в другой раздел —
              обработка продолжится.
            </p>
            <p className="text-blue-800/80">
              Как только сервер закончит обработку, файл появится в медиатеке или обновится в списке.
            </p>
          </div>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-stretch gap-3">
        <div
          className={cn(
            "min-w-0 flex-1 flex-wrap gap-3",
            files.length || pendingUploads.length ? "flex" : "hidden",
          )}
        >
          {files.map((file, index) => {
            const canReorder = mode === "multiple" && files.length > 1
            return (
              <div
                key={`${file.id}::${index}`}
                draggable={canReorder}
                onDragStart={() => {
                  if (!canReorder) return
                  setDragIndex(index)
                  setDragOverIndex(index)
                }}
                onDragOver={(event) => {
                  if (!canReorder || dragIndex === null) return
                  event.preventDefault()
                  setDragOverIndex(index)
                }}
                onDrop={(event) => {
                  if (!canReorder) return
                  event.preventDefault()
                  dropAt(index)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setDragOverIndex(null)
                }}
                className={cn(
                  "relative w-56 max-w-full overflow-hidden rounded-lg border bg-white",
                  canReorder &&
                    dragOverIndex === index &&
                    dragIndex !== index
                    ? "border-admin-fg bg-admin-muted/40"
                    : "border-admin-border",
                )}
              >
                {canReorder ? (
                  <div className="absolute left-2 top-2 z-10 flex items-center gap-0.5">
                    <span
                      className="cursor-grab rounded bg-white/90 p-1 text-admin-fg-subtle active:cursor-grabbing"
                      aria-label="Перетащить"
                      title="Перетащить"
                    >
                      <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="flex flex-col rounded bg-white/90">
                      <IconButton
                        type="button"
                        className="h-5 w-6"
                        disabled={index === 0}
                        onClick={() => reorderFile(index, index - 1)}
                        aria-label="Выше"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        type="button"
                        className="h-5 w-6"
                        disabled={index === files.length - 1}
                        onClick={() => reorderFile(index, index + 1)}
                        aria-label="Ниже"
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                ) : null}
                <IconButton
                  type="button"
                  tone="danger"
                  className="absolute right-2 top-2 z-10 bg-white/90"
                  onClick={() => removeFile(index)}
                  aria-label={`Удалить ${file.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <MediaThumbnail file={file} />
                {altMode === "library" ? (
                  <MediaAltField file={file} onSaved={(next) => patchFile(index, next)} />
                ) : altMode === "instance" ? (
                  <InstanceAltField file={file} onChange={(next) => patchFile(index, next)} />
                ) : null}
              </div>
            )
          })}

          {pendingUploads.map((pending) => {
            const pct = pending.progress < 0 ? null : pending.progress
            return (
              <div
                key={pending.id}
                className="relative w-56 max-w-full overflow-hidden rounded-lg border border-admin-border bg-white"
                aria-busy="true"
              >
                <div
                  className={cn(
                    "flex h-36 flex-col items-center justify-center gap-2 bg-admin-muted/60 px-3",
                    pct === null && "motion-safe:animate-pulse",
                  )}
                >
                  <LoaderCircle
                    className="h-7 w-7 text-admin-fg motion-safe:animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium tabular-nums text-admin-fg">
                    {pending.stage === "process"
                      ? "Контент в обработке"
                      : pct === null
                        ? pending.stage === "compress"
                          ? "Сжатие…"
                          : pending.stage === "upload"
                            ? "Загрузка…"
                            : "Подготовка…"
                        : `${pct}%`}
                  </span>
                </div>
                <div className="space-y-1.5 border-t border-admin-border p-3">
                  <p className="truncate text-sm font-medium text-admin-fg" title={pending.name}>
                    {pending.name}
                  </p>
                  <p className="text-xs text-admin-fg-subtle">{pending.sizeLabel}</p>
                  <div
                    className="h-1 overflow-hidden rounded-full bg-admin-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct ?? undefined}
                    aria-label={`Прогресс «${pending.name}»`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full bg-admin-fg transition-[width] duration-200 ease-out motion-reduce:transition-none",
                        pct === null && "w-1/3 motion-safe:animate-pulse",
                      )}
                      style={pct === null ? undefined : { width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid min-w-0 flex-1 basis-full grid-cols-1 gap-3 lg:basis-0 lg:grid-cols-2">
          <div
            role="button"
            tabIndex={0}
            aria-busy={busy}
            className={cn(
              "flex min-h-28 w-full min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-2 text-center transition-colors",
              dragging
                ? "border-admin-fg bg-admin-muted"
                : "border-admin-border bg-admin-muted/40 hover:border-admin-fg-muted hover:bg-admin-muted",
              busy && "ring-2 ring-amber-300/60 ring-offset-1",
            )}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void handleFiles(Array.from(event.dataTransfer.files))
            }}
          >
            <Upload className="mb-1 h-4 w-4 text-admin-fg-muted" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-tight text-admin-fg">
              {busy ? "Добавить ещё в очередь…" : "Перетащите файлы сюда или выберите их"}
            </span>
            <span className="mt-1 break-words text-[9px] leading-tight text-admin-fg-subtle">
              {accept.flatMap((type) => extensionsByType[type]).join(", ")}
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              className="sr-only"
              accept={fileAcceptValue(accept)}
              multiple={mode === "multiple"}
              onChange={(event) => {
                void handleFiles(Array.from(event.target.files ?? []))
                event.currentTarget.value = ""
              }}
            />
          </div>

          {showLibraryButton ? (
            <>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                disabled={busy}
                className="flex min-h-28 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-admin-border p-2 text-center text-[10px] leading-tight text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-ring disabled:opacity-50"
              >
                <FolderOpen className="h-5 w-5" aria-hidden="true" />
                Выбрать из загруженных
              </button>
              <MediaPickerDialog
                open={libraryOpen}
                allowedTypes={accept}
                onPick={handleLibraryPick}
                onClose={() => setLibraryOpen(false)}
              />
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-admin-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
