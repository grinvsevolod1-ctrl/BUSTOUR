import { asc, eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { adminRoles, admins } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import {
  SYSTEM_ADMIN_ROLES,
  isAdminRole,
  roleLabel,
  type AdminRole,
} from "@/lib/admin-roles"

export type AdminRoleCatalogRow = {
  slug: string
  label: string
  isSystem: boolean
  hidden: boolean
  createdAt: number
  userCount: number
}

const SYSTEM_SEED: { slug: AdminRole; label: string }[] = [
  { slug: "superadmin", label: "Суперадмин" },
  { slug: "admin", label: "Админ" },
  { slug: "manager", label: "Менеджер" },
]

export async function ensureAdminRoleCatalog(): Promise<void> {
  await ensureDb()
  const now = Date.now()
  for (const row of SYSTEM_SEED) {
    const existing = await db.select({ slug: adminRoles.slug }).from(adminRoles).where(eq(adminRoles.slug, row.slug)).limit(1)
    if (existing.length) continue
    await db.insert(adminRoles).values({
      slug: row.slug,
      label: row.label,
      isSystem: true,
      hidden: false,
      createdAt: now,
    })
  }
}

async function countUsersWithRole(slug: string): Promise<number> {
  const rows = await db.select({ id: admins.id }).from(admins).where(eq(admins.role, slug))
  return rows.length
}

function mapRow(
  row: typeof adminRoles.$inferSelect,
  userCount: number,
): AdminRoleCatalogRow {
  return {
    slug: row.slug,
    label: row.label || (isAdminRole(row.slug) ? roleLabel(row.slug) : row.slug),
    isSystem: !!row.isSystem,
    hidden: !!row.hidden,
    createdAt: row.createdAt,
    userCount,
  }
}

export async function listAdminRoleCatalog(opts?: {
  includeHidden?: boolean
}): Promise<AdminRoleCatalogRow[]> {
  await ensureAdminRoleCatalog()
  const rows = opts?.includeHidden
    ? await db.select().from(adminRoles).orderBy(asc(adminRoles.createdAt))
    : await db.select().from(adminRoles).where(eq(adminRoles.hidden, false)).orderBy(asc(adminRoles.createdAt))

  const out: AdminRoleCatalogRow[] = []
  for (const row of rows) {
    out.push(mapRow(row, await countUsersWithRole(row.slug)))
  }
  return out
}

export async function listAssignableRoleSlugs(): Promise<AdminRole[]> {
  const rows = await listAdminRoleCatalog({ includeHidden: false })
  return rows.map((r) => r.slug).filter(isAdminRole)
}

export async function hideAdminRole(slug: string): Promise<AdminRoleCatalogRow> {
  await ensureAdminRoleCatalog()
  if (slug === "superadmin") throw new Error("Нельзя скрыть роль суперадмина")
  const [row] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1)
  if (!row) throw new Error("Роль не найдена")
  if (row.hidden) return mapRow(row, await countUsersWithRole(slug))
  await db.update(adminRoles).set({ hidden: true }).where(eq(adminRoles.slug, slug))
  const [updated] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1)
  return mapRow(updated!, await countUsersWithRole(slug))
}

export async function restoreAdminRole(slug: string): Promise<AdminRoleCatalogRow> {
  await ensureAdminRoleCatalog()
  const [row] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1)
  if (!row) throw new Error("Роль не найдена")
  if (!row.hidden) return mapRow(row, await countUsersWithRole(slug))
  await db.update(adminRoles).set({ hidden: false }).where(eq(adminRoles.slug, slug))
  const [updated] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1)
  return mapRow(updated!, await countUsersWithRole(slug))
}

/** Permanent delete — only non-system hidden roles with no users. */
export async function purgeAdminRole(slug: string): Promise<void> {
  await ensureAdminRoleCatalog()
  const [row] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1)
  if (!row) throw new Error("Роль не найдена")
  if (row.isSystem || SYSTEM_ADMIN_ROLES.includes(slug as AdminRole)) {
    throw new Error("Системную роль нельзя удалить навсегда — только скрыть")
  }
  if (!row.hidden) throw new Error("Сначала скрытите роль")
  const users = await countUsersWithRole(slug)
  if (users > 0) throw new Error("У роли ещё есть пользователи")
  await db.delete(adminRoles).where(and(eq(adminRoles.slug, slug), eq(adminRoles.hidden, true)))
}

export async function createCustomAdminRole(input: {
  slug: string
  label: string
}): Promise<AdminRoleCatalogRow> {
  await ensureAdminRoleCatalog()
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_")
  const label = input.label.trim()
  if (!slug || slug.length < 2) throw new Error("Укажите slug роли")
  if (!label) throw new Error("Укажите название")
  if (isAdminRole(slug) || SYSTEM_ADMIN_ROLES.includes(slug as AdminRole)) {
    throw new Error("Этот slug занят системной ролью")
  }
  const existing = await db.select({ slug: adminRoles.slug }).from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1)
  if (existing.length) throw new Error("Роль уже существует")
  const now = Date.now()
  await db.insert(adminRoles).values({
    slug,
    label,
    isSystem: false,
    hidden: false,
    createdAt: now,
  })
  return mapRow(
    { slug, label, isSystem: false, hidden: false, createdAt: now },
    0,
  )
}
