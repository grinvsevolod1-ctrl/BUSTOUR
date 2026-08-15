"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Folder, FolderPlus, Images, LoaderCircle, Search, Trash2 } from "lucide-react"
import {
  createMediaFolder,
  deleteMediaFolder,
  fetchMediaFolders,
  fetchMediaItems,
  updateMediaFolder,
  uploadFolderId,
  type MediaFolderScope,
  type MediaSort,
} from "@/lib/media"
import type { MediaFolder } from "@/lib/media/folders"
import type { MediaItem, MediaType, UploadedFile } from "@/components/admin/media-uploader"
import { MediaUploader, startUploadFileApi } from "@/components/admin/media-uploader"
import { MediaThumbnail } from "@/components/admin/media-thumbnail"
import { MediaAltField } from "@/components/admin/media-alt-field"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  EmptyState,
  IconButton,
  Input,
  Select,
} from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { isMediaReady, toUploadedFile } from "@/lib/media/types"

type FilterType = "all" | MediaType

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "image", label: "Изображения" },
  { value: "video", label: "Видео" },
  { value: "document", label: "Документы" },
]

const sortOptions: { value: MediaSort; label: string }[] = [
  { value: "createdAt:desc", label: "Сначала новые" },
  { value: "createdAt:asc", label: "Сначала старые" },
]

function readyMediaItem(file: UploadedFile): MediaItem {
  return {
    ...file,
    status: "ready",
    processingStage: "ready",
    errorMessage: null,
    mimeType: "",
  }
}

function mediaStatusLabel(file: MediaItem): string {
  if (file.status === "ready") return "Готов"
  if (file.status === "failed") return "Ошибка обработки"

  switch (file.processingStage) {
    case "queued":
      return "В очереди"
    case "processing":
      return "Обрабатывается"
    case "converting":
      return "Конвертация"
    case "finalizing":
      return "Завершение"
    default:
      return "В обработке"
  }
}

function mediaStatusHint(file: MediaItem): string {
  if (file.status === "failed") {
    return file.errorMessage || "Обработка завершилась ошибкой."
  }

  switch (file.processingStage) {
    case "queued":
      return "Файл уже загружен и ждёт своей очереди на сервере."
    case "processing":
      return "Сервер принял файл и сейчас подготавливает его к обработке."
    case "converting":
      return "Сервер конвертирует и оптимизирует файл. Это может занять несколько минут."
    case "finalizing":
      return "Сервер завершает обработку и сохраняет итоговый вариант."
    default:
      return "Сервер ещё обрабатывает файл. После статуса «Готов» его можно будет выбрать и отредактировать."
  }
}

export function MediaExplorer({
  onPick,
  lockType,
  allowedTypes,
}: {
  onPick?: (file: UploadedFile) => void
  lockType?: MediaType
  allowedTypes?: MediaType[]
}) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [folderScope, setFolderScope] = useState<MediaFolderScope>("all")
  const [uploaderFiles, setUploaderFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [foldersLoading, setFoldersLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>(lockType ?? "all")
  const [sort, setSort] = useState<MediaSort>("createdAt:desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null)
  const [pendingFolderDelete, setPendingFolderDelete] = useState<MediaFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query.trim())
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)

  const pickerTypes = useMemo(
    () => allowedTypes ?? (lockType ? [lockType] : (["image", "video"] as MediaType[])),
    [allowedTypes, lockType],
  )

  const hasProcessingItems = items.some((item) => item.status === "processing")

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  function itemVisibleInCurrentFolder(file: { folderId?: string | null }) {
    return folderScope === "all"
      ? true
      : folderScope === "root"
        ? !file.folderId
        : file.folderId === folderScope
  }

  function upsertItems(nextItems: MediaItem[]) {
    setItems((current) => {
      const nextVisible = nextItems.filter((item) => itemVisibleInCurrentFolder(item))
      const nextIds = new Set(nextItems.map((item) => item.id))
      const rest = current.filter((item) => !nextIds.has(item.id))
      if (sort === "createdAt:asc") {
        return [...rest, ...nextVisible]
      }
      return [...nextVisible, ...rest]
    })
  }

  useEffect(() => {
    setFilter(lockType ?? "all")
  }, [lockType])

  const loadItems = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (!silent) setLoading(true)

      try {
        const next = await fetchMediaItems({
          type: filter === "all" ? undefined : filter,
          search: deferredQuery || undefined,
          sort,
          folder: folderScope,
        })
        if (!isMountedRef.current || requestId !== requestIdRef.current) return
        setItems(next)
        setLoadError("")
      } catch (error: unknown) {
        if (!isMountedRef.current || requestId !== requestIdRef.current) return
        setLoadError(
          error instanceof Error ? error.message : silent
            ? "Не удалось обновить медиатеку."
            : "Не удалось загрузить медиатеку.",
        )
      } finally {
        if (!silent && isMountedRef.current && requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [deferredQuery, filter, folderScope, sort],
  )

  useEffect(() => {
    let active = true
    setFoldersLoading(true)
    fetchMediaFolders()
      .then((next) => {
        if (active) setFolders(next)
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Не удалось загрузить папки.")
        }
      })
      .finally(() => {
        if (active) setFoldersLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    if (!hasProcessingItems) return

    const timer = window.setInterval(() => {
      void loadItems({ silent: true })
    }, 3000)

    return () => window.clearInterval(timer)
  }, [hasProcessingItems, loadItems])

  function handleUploaderChange(next: UploadedFile[]) {
    if (next.length) {
      upsertItems(next.map((file) => readyMediaItem(file)))
    }
    setUploaderFiles([])
  }

  function handleUploadAccepted(item: MediaItem) {
    setLoadError("")
    upsertItems([item])
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name || creatingFolder) return
    setCreatingFolder(true)
    try {
      const folder = await createMediaFolder(name)
      setFolders((current) =>
        [...current, folder].sort((a, b) => a.name.localeCompare(b.name, "ru")),
      )
      setNewFolderName("")
      setFolderScope(folder.id)
      toast.success(`Папка «${folder.name}» создана`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать папку.")
    } finally {
      setCreatingFolder(false)
    }
  }

  async function handleDeleteFolder(folder: MediaFolder) {
    try {
      await deleteMediaFolder(folder.id)
      setFolders((current) => current.filter((item) => item.id !== folder.id))
      if (folderScope === folder.id) setFolderScope("all")
      toast.success(`Папка «${folder.name}» удалена`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить папку.")
    }
  }

  async function handleMove(file: MediaItem, nextFolderId: string | null) {
    setMovingId(file.id)
    try {
      const updated = await updateMediaFolder(file.id, nextFolderId)
      setItems((current) => {
        if (folderScope === "all") {
          return current.map((item) => (item.id === updated.id ? updated : item))
        }
        const stays =
          folderScope === "root" ? !updated.folderId : updated.folderId === folderScope
        if (!stays) return current.filter((item) => item.id !== updated.id)
        return current.map((item) => (item.id === updated.id ? updated : item))
      })
      toast.success("Файл перемещён")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Не удалось переместить файл.")
    } finally {
      setMovingId(null)
    }
  }

  async function removeItem(file: MediaItem) {
    setDeleteError("")
    setDeletingId(file.id)
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(file.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "Не удалось удалить файл.")
      }
      setItems((current) => current.filter((item) => item.id !== file.id))
      toast.success(`«${file.name}» удалён`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось удалить файл."
      setDeleteError(message)
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  async function copyUrl(file: MediaItem | UploadedFile) {
    try {
      if (!navigator.clipboard?.writeText) return
      await navigator.clipboard.writeText(file.url)
      setCopyError(false)
      setCopiedId(file.id)
      window.setTimeout(() => setCopiedId((current) => (current === file.id ? null : current)), 1500)
    } catch {
      setCopyError(true)
      window.setTimeout(() => setCopyError(false), 1500)
    }
  }

  function patchItem(next: MediaItem) {
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)))
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredItems = useMemo(
    () =>
      items.filter((file) => {
        const matchesQuery = !normalizedQuery || file.name.toLowerCase().includes(normalizedQuery)
        const matchesPickerTypes = !onPick || pickerTypes.includes(file.type)
        const matchesType = (filter === "all" || file.type === filter) && matchesPickerTypes
        return matchesQuery && matchesType
      }),
    [filter, items, normalizedQuery, onPick, pickerTypes],
  )

  const uploadTarget = uploadFolderId(folderScope)

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 space-y-3 lg:w-56">
        <p className="text-xs font-semibold uppercase tracking-wide text-admin-fg-subtle">Папки</p>
        <nav className="space-y-1" aria-label="Папки медиатеки">
          <FolderNavButton
            active={folderScope === "all"}
            onClick={() => setFolderScope("all")}
            label="Все файлы"
          />
          <FolderNavButton
            active={folderScope === "root"}
            onClick={() => setFolderScope("root")}
            label="Без папки"
          />
          {foldersLoading ? (
            <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-admin-fg-muted">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Загрузка…
            </p>
          ) : (
            folders.map((folder) => (
              <div key={folder.id} className="group flex items-center gap-1">
                <FolderNavButton
                  active={folderScope === folder.id}
                  onClick={() => setFolderScope(folder.id)}
                  label={folder.name}
                  className="min-w-0 flex-1"
                />
                <IconButton
                  type="button"
                  tone="danger"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Удалить папку ${folder.name}`}
                  onClick={() => setPendingFolderDelete(folder)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))
          )}
        </nav>
        <div className="flex gap-2">
          <Input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Новая папка"
            aria-label="Название новой папки"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleCreateFolder()
              }
            }}
          />
          <IconButton
            type="button"
            onClick={() => void handleCreateFolder()}
            disabled={creatingFolder || !newFolderName.trim()}
            aria-label="Создать папку"
          >
            {creatingFolder ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4" />
            )}
          </IconButton>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <MediaUploader
          mode="multiple"
          value={uploaderFiles}
          onChange={handleUploaderChange}
          uploadFn={(file, onProgress) => startUploadFileApi(file, onProgress, { folderId: uploadTarget })}
          onUploadAccepted={handleUploadAccepted}
          accept={allowedTypes ?? (lockType ? [lockType] : onPick ? ["image", "video"] : undefined)}
          label="Загрузить медиа"
          showLibraryButton={false}
          altMode="library"
          onBusyChange={setUploadBusy}
          folderId={uploadTarget}
        />

        {uploadBusy ? (
          <p className="sr-only" aria-live="assertive">
            Идёт загрузка файлов. Не закрывайте вкладку.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-fg-subtle" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени файла"
              className="pl-9"
              aria-label="Поиск по имени файла"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {lockType ? (
              <p className="self-center text-sm text-admin-fg-muted">
                Фильтр: {filterOptions.find((option) => option.value === lockType)?.label}
              </p>
            ) : (
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value as FilterType)}
                className="sm:w-44"
                aria-label="Фильтр по типу"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as MediaSort)}
              className="sm:w-44"
              aria-label="Сортировка"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loadError ? (
          <p className="text-sm text-admin-danger" role="alert">
            {loadError}
          </p>
        ) : null}
        {copyError ? (
          <p className="text-sm text-admin-fg-subtle" role="status">
            Не удалось скопировать ссылку.
          </p>
        ) : null}
        {deleteError ? (
          <p className="text-sm text-admin-danger" role="alert">
            {deleteError}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-admin-fg-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Загружаем медиатеку…
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Медиафайлы не найдены"
            description={items.length ? "Измените поиск или фильтр." : "Загрузите первый файл, чтобы он появился здесь."}
          >
            <Images className="mx-auto mt-3 h-8 w-8 text-admin-fg-subtle" />
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((file) => (
              <div
                key={file.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "relative overflow-hidden rounded-lg border border-admin-border bg-white text-left transition-colors",
                  onPick && !isMediaReady(file)
                    ? "cursor-not-allowed opacity-80"
                    : "cursor-pointer hover:border-admin-fg-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-ring",
                )}
                onClick={() => {
                  if (onPick) {
                    if (!isMediaReady(file)) {
                      toast.message(
                        file.status === "failed"
                          ? "Этот файл не готов: обработка завершилась ошибкой."
                          : "Файл ещё обрабатывается и пока недоступен для выбора.",
                      )
                      return
                    }
                    onPick(toUploadedFile(file))
                    return
                  }
                  void copyUrl(file)
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    if (onPick) {
                      if (!isMediaReady(file)) {
                        toast.message(
                          file.status === "failed"
                            ? "Этот файл не готов: обработка завершилась ошибкой."
                            : "Файл ещё обрабатывается и пока недоступен для выбора.",
                        )
                        return
                      }
                      onPick(toUploadedFile(file))
                    } else void copyUrl(file)
                  }
                }}
                title={onPick ? "Выбрать файл" : "Нажмите, чтобы скопировать URL"}
              >
                <div className="absolute left-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-[11px] font-medium text-admin-fg">
                  {mediaStatusLabel(file)}
                </div>
                <IconButton
                  type="button"
                  tone="danger"
                  className="absolute right-2 top-2 z-10 bg-white/90"
                  onClick={(event) => {
                    event.stopPropagation()
                    setPendingDelete(file)
                  }}
                  aria-label={`Удалить ${file.name}`}
                  disabled={deletingId === file.id || Boolean(pendingDelete) || file.status === "processing"}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
                <MediaThumbnail file={file} />
                <div className="space-y-2 border-t border-admin-border px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={file.folderId ?? "root"}
                    disabled={movingId === file.id}
                    aria-label={`Папка для ${file.name}`}
                    onChange={(event) => {
                      const value = event.target.value
                      void handleMove(file, value === "root" ? null : value)
                    }}
                  >
                    <option value="root">Без папки</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {isMediaReady(file) ? <MediaAltField file={file} onSaved={(next) => patchItem(next)} /> : (
                  <div className="border-t border-admin-border px-3 py-2 text-xs text-admin-fg-subtle">
                    {mediaStatusHint(file)}
                  </div>
                )}
                {copiedId === file.id ? (
                  <div className="absolute inset-x-0 bottom-0 bg-admin-fg/85 px-3 py-2 text-center text-xs font-medium text-white">
                    Скопировано
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Удалить файл?"
        message={
          pendingDelete
            ? `«${pendingDelete.name}» будет удалён из медиатеки и с хранилища. Это нельзя отменить.`
            : ""
        }
        confirmLabel="Удалить"
        tone="danger"
        pending={deletingId === pendingDelete?.id}
        onCancel={() => {
          if (!deletingId) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (!pendingDelete) return
          void removeItem(pendingDelete).finally(() => setPendingDelete(null))
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingFolderDelete)}
        title="Удалить папку?"
        message={
          pendingFolderDelete
            ? `«${pendingFolderDelete.name}» будет удалена. Файлы останутся в «Без папки».`
            : ""
        }
        confirmLabel="Удалить"
        tone="danger"
        onCancel={() => setPendingFolderDelete(null)}
        onConfirm={() => {
          if (!pendingFolderDelete) return
          const folder = pendingFolderDelete
          setPendingFolderDelete(null)
          void handleDeleteFolder(folder)
        }}
      />
    </div>
  )
}

function FolderNavButton({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean
  onClick: () => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-admin-muted font-medium text-admin-fg"
          : "text-admin-fg-muted hover:bg-admin-muted/60 hover:text-admin-fg",
        className,
      )}
    >
      <Folder className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}
