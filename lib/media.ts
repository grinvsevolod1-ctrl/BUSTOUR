import type { MediaItem, UploadedFile } from "@/lib/media-types"
import type { MediaFolder } from "@/lib/media-folders"

export type MediaSort = "createdAt:desc" | "createdAt:asc"

/** `all` = no filter; `root` = unfiled; else folder UUID */
export type MediaFolderScope = "all" | "root" | string

export type MediaListQuery = {
  type?: string
  search?: string
  sort?: MediaSort
  folder?: MediaFolderScope
}

export async function fetchMediaItems(filters?: MediaListQuery): Promise<MediaItem[]> {
  const params = new URLSearchParams()
  if (filters?.type) params.set("type", filters.type)
  if (filters?.search) params.set("search", filters.search)
  if (filters?.sort) params.set("sort", filters.sort)
  if (filters?.folder && filters.folder !== "all") params.set("folder", filters.folder)
  const query = params.toString()
  const response = await fetch(`/api/media${query ? `?${query}` : ""}`, {
    credentials: "same-origin",
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? "Не удалось загрузить медиатеку.")
  }
  return (await response.json()) as MediaItem[]
}

export async function fetchMediaItem(id: string): Promise<MediaItem> {
  const response = await fetch(`/api/media/${encodeURIComponent(id)}`, {
    credentials: "same-origin",
  })
  const payload = (await response.json().catch(() => null)) as MediaItem | { error?: string } | null
  if (!response.ok || !payload || !("id" in payload)) {
    throw new Error(payload && "error" in payload ? payload.error : "Не удалось загрузить файл.")
  }
  return payload
}

export async function fetchMediaFolders(): Promise<MediaFolder[]> {
  const response = await fetch("/api/media/folders", { credentials: "same-origin" })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? "Не удалось загрузить папки.")
  }
  return (await response.json()) as MediaFolder[]
}

export async function createMediaFolder(name: string): Promise<MediaFolder> {
  const response = await fetch("/api/media/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "same-origin",
  })
  const payload = (await response.json().catch(() => null)) as MediaFolder | { error?: string } | null
  if (!response.ok || !payload || !("id" in payload)) {
    throw new Error(payload && "error" in payload ? payload.error : "Не удалось создать папку.")
  }
  return payload
}

export async function deleteMediaFolder(id: string): Promise<void> {
  const response = await fetch(`/api/media/folders/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? "Не удалось удалить папку.")
  }
}

/** Persist image alt text for a library file (UUID id). */
export async function updateMediaAlt(id: string, alt: string): Promise<MediaItem> {
  const response = await fetch(`/api/media/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alt }),
    credentials: "same-origin",
  })
  const payload = (await response.json().catch(() => null)) as MediaItem | { error?: string } | null
  if (!response.ok || !payload || !("id" in payload)) {
    throw new Error(payload && "error" in payload ? payload.error : "Не удалось сохранить alt.")
  }
  return payload
}

export async function updateMediaFolder(
  id: string,
  folderId: string | null,
): Promise<MediaItem> {
  const response = await fetch(`/api/media/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId }),
    credentials: "same-origin",
  })
  const payload = (await response.json().catch(() => null)) as MediaItem | { error?: string } | null
  if (!response.ok || !payload || !("id" in payload)) {
    throw new Error(payload && "error" in payload ? payload.error : "Не удалось переместить файл.")
  }
  return payload
}

export function isPersistedMediaId(id: string): boolean {
  return Boolean(id) && !id.includes("/") && !id.startsWith("blob:")
}

/** Upload target folder: concrete UUID, else root. */
export function uploadFolderId(scope: MediaFolderScope): string | null {
  if (scope === "all" || scope === "root") return null
  return scope
}
