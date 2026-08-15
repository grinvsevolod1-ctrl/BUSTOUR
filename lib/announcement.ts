import type { AlertKind, SiteSettings } from "@/lib/types"
import { parseAlertKind } from "@/lib/alert-kind"

export type ActiveAnnouncement = { title: string; text: string; type: AlertKind }

function parseDateOnly(value: string): number | null {
  const v = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const ts = Date.parse(`${v}T00:00:00`)
  return Number.isNaN(ts) ? null : ts
}

/**
 * Решает, показывать ли попап «важное сообщение»:
 * включён в админке, есть текст, и сегодняшняя дата попадает в окно
 * [startDate .. endDate] (обе границы включительно, пустые — без ограничения).
 */
export function getActiveAnnouncement(settings: SiteSettings, now = new Date()): ActiveAnnouncement | null {
  if ((settings["announcement.enabled"] ?? "0") !== "1") return null
  const title = (settings["announcement.title"] ?? "").trim()
  const text = (settings["announcement.text"] ?? "").trim()
  if (!title && !text) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const start = parseDateOnly(settings["announcement.startDate"] ?? "")
  if (start !== null && today < start) return null
  const end = parseDateOnly(settings["announcement.endDate"] ?? "")
  // endDate включительно: сообщение живёт весь указанный день.
  if (end !== null && today > end) return null

  return { title, text, type: parseAlertKind(settings["announcement.type"] ?? "info") }
}
