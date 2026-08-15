import { desc, and, eq, gte, lte, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { adminAuditLog } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { pageKeyFromSettingKey } from "@/lib/orphan-cms-cleanup"

export type AuditActor = { id: number; username: string } | null | undefined

/** Default retention window for admin_audit_log (2 months). */
export const DEFAULT_AUDIT_RETENTION_DAYS = 60
export const AUDIT_RETENTION_SETTING_KEY = "admin.auditRetentionDays"
export const AUDIT_LAST_PURGE_SETTING_KEY = "admin.auditLastPurgeAt"

const DAY_MS = 86_400_000
const PURGE_COOLDOWN_MS = DAY_MS
let lastPurgeAttemptAt = 0

export function resolveAuditRetentionDays(raw?: string | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_AUDIT_RETENTION_DAYS
  return Math.min(Math.floor(n), 3650)
}

export function auditRetentionCutoffMs(days: number, now = Date.now()): number {
  return now - resolveAuditRetentionDays(String(days)) * DAY_MS
}

function safeJson(value: unknown): string {
  if (value == null) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return ""
  }
}

export function pickSettingsSubset(
  all: Record<string, string>,
  keys: string[],
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of keys) out[key] = all[key] ?? ""
  return out
}

/** Only keys whose values actually changed. */
export function changedSettings(
  before: Record<string, string>,
  after: Record<string, string>,
): { before: Record<string, string>; after: Record<string, string> } {
  const b: Record<string, string> = {}
  const a: Record<string, string> = {}
  for (const key of Object.keys(after)) {
    const prev = before[key] ?? ""
    const next = after[key] ?? ""
    if (prev !== next) {
      b[key] = prev
      a[key] = next
    }
  }
  return { before: b, after: a }
}

export function settingsAuditEntity(keys: string[]): {
  entityType: "page" | "settings"
  entityId: string
  pageKey: string
} {
  const pages = new Set<string>()
  for (const key of keys) {
    const pageKey = pageKeyFromSettingKey(key)
    if (pageKey) pages.add(pageKey)
  }
  if (pages.size === 1) {
    const pageKey = [...pages][0]!
    // `site.*` keys are global settings, not a CMS page slug.
    if (pageKey === "site") {
      return { entityType: "settings", entityId: "site", pageKey: "site" }
    }
    return { entityType: "page", entityId: pageKey, pageKey }
  }
  if (pages.size > 1) {
    return { entityType: "settings", entityId: "multi", pageKey: "multi" }
  }
  return { entityType: "settings", entityId: "site", pageKey: "site" }
}

export async function writeAudit(input: {
  admin?: AuditActor
  username?: string
  action: string
  entityType?: string
  entityId?: string | number | null
  summary: string
  before?: unknown
  after?: unknown
  meta?: unknown
}): Promise<void> {
  try {
    await ensureDb()
    const username = (input.admin?.username || input.username || "").trim()
    await db.insert(adminAuditLog).values({
      adminId: input.admin?.id ?? null,
      username,
      action: input.action,
      entityType: input.entityType || "",
      entityId: input.entityId == null ? "" : String(input.entityId),
      summary: input.summary,
      beforeJson: safeJson(input.before),
      afterJson: safeJson(input.after),
      metaJson: safeJson(input.meta),
      createdAt: Date.now(),
    })
    void maybePurgeExpiredAuditLogs()
  } catch (err) {
    // Audit must not break mutations
    console.error("writeAudit failed", err)
  }
}

export type AuditLogFilters = {
  adminId?: number
  entityType?: string
  action?: string
  from?: number
  to?: number
  limit?: number
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  await ensureDb()
  void maybePurgeExpiredAuditLogs()
  const conditions = []
  if (filters.adminId) conditions.push(eq(adminAuditLog.adminId, filters.adminId))
  if (filters.entityType) conditions.push(eq(adminAuditLog.entityType, filters.entityType))
  if (filters.action) conditions.push(eq(adminAuditLog.action, filters.action))
  if (filters.from) conditions.push(gte(adminAuditLog.createdAt, filters.from))
  if (filters.to) conditions.push(lte(adminAuditLog.createdAt, filters.to))

  const q = db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(filters.limit ?? 200)
  if (!conditions.length) return q
  return db
    .select()
    .from(adminAuditLog)
    .where(and(...conditions))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(filters.limit ?? 200)
}

export async function getAuditLogById(id: number) {
  await ensureDb()
  const [row] = await db.select().from(adminAuditLog).where(eq(adminAuditLog.id, id)).limit(1)
  return row ?? null
}

export async function distinctAuditActions(): Promise<string[]> {
  await ensureDb()
  const rows = await db
    .selectDistinct({ action: adminAuditLog.action })
    .from(adminAuditLog)
    .orderBy(adminAuditLog.action)
  return rows.map((r) => r.action).filter(Boolean)
}

export async function distinctAuditEntityTypes(): Promise<string[]> {
  await ensureDb()
  const rows = await db
    .selectDistinct({ entityType: adminAuditLog.entityType })
    .from(adminAuditLog)
    .orderBy(adminAuditLog.entityType)
  return rows.map((r) => r.entityType).filter(Boolean)
}

/** Compact tour fields for before/after audit payloads. */
export function auditTourSnapshot(tour: {
  id?: number
  slug?: string
  title?: string
  category?: string
  archived?: boolean
  price?: string
  arrivalCityId?: number
}): Record<string, unknown> {
  return {
    id: tour.id,
    slug: tour.slug,
    title: tour.title,
    category: tour.category,
    archived: tour.archived,
    price: tour.price,
    arrivalCityId: tour.arrivalCityId,
  }
}

export async function getAuditRetentionDays(): Promise<number> {
  const { getSettings } = await import("@/lib/cms")
  const site = await getSettings()
  return resolveAuditRetentionDays(site[AUDIT_RETENTION_SETTING_KEY])
}

/** Hard-delete audit rows older than `days`. Returns deleted count. */
export async function purgeExpiredAuditLogs(days?: number): Promise<number> {
  await ensureDb()
  const retention = days ?? (await getAuditRetentionDays())
  const cutoff = auditRetentionCutoffMs(retention)
  const removed = await db
    .delete(adminAuditLog)
    .where(lt(adminAuditLog.createdAt, cutoff))
    .returning({ id: adminAuditLog.id })
  return removed.length
}

/**
 * At most once per day (memory + settings). Safe to call from list/write paths.
 * Returns deleted count, or null if skipped by throttle.
 */
export async function maybePurgeExpiredAuditLogs(): Promise<number | null> {
  const now = Date.now()
  if (now - lastPurgeAttemptAt < 60_000) return null
  lastPurgeAttemptAt = now

  try {
    const { getSettings, saveSettings } = await import("@/lib/cms")
    const site = await getSettings()
    const last = Number(site[AUDIT_LAST_PURGE_SETTING_KEY] || 0)
    if (Number.isFinite(last) && last > 0 && now - last < PURGE_COOLDOWN_MS) return null

    const days = resolveAuditRetentionDays(site[AUDIT_RETENTION_SETTING_KEY])
    const deleted = await purgeExpiredAuditLogs(days)
    await saveSettings({ [AUDIT_LAST_PURGE_SETTING_KEY]: String(now) })
    return deleted
  } catch (err) {
    console.error("maybePurgeExpiredAuditLogs failed", err)
    return null
  }
}
