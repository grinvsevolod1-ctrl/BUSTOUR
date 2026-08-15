import { eq, desc, and, ne } from "drizzle-orm"
import { db } from "./db"
import { admins } from "./db/schema"
import { ensureDb } from "./db/init"
import { hashPassword } from "./password"
import { parseAdminRole, isPrivilegedAdminRole, type AdminRole } from "./admin-roles"

export type AdminUserRow = {
  id: number
  username: string
  role: AdminRole
  active: boolean
  createdAt: number
}

function mapAdmin(row: typeof admins.$inferSelect): AdminUserRow {
  return {
    id: row.id,
    username: row.username,
    role: parseAdminRole(row.role),
    active: !!row.active,
    createdAt: row.createdAt,
  }
}

/** Active users for /admin/users. Pass includeInactive for audit filters. */
export async function listAdmins(opts?: { includeInactive?: boolean }): Promise<AdminUserRow[]> {
  await ensureDb()
  const rows = opts?.includeInactive
    ? await db.select().from(admins).orderBy(desc(admins.id))
    : await db.select().from(admins).where(eq(admins.active, true)).orderBy(desc(admins.id))
  return rows.map(mapAdmin)
}

export async function getAdminById(id: number): Promise<AdminUserRow | null> {
  await ensureDb()
  const [row] = await db.select().from(admins).where(eq(admins.id, id)).limit(1)
  return row ? mapAdmin(row) : null
}

export async function createAdminUser(input: {
  username: string
  password: string
  role: AdminRole
}): Promise<AdminUserRow> {
  await ensureDb()
  const username = input.username.trim()
  if (!username) throw new Error("Укажите логин")
  if (input.password.length < 6) throw new Error("Пароль не короче 6 символов")
  const now = Date.now()
  const result = await db
    .insert(admins)
    .values({
      username,
      passwordHash: hashPassword(input.password),
      role: input.role,
      active: true,
      createdAt: now,
    })
    .returning()
  return mapAdmin(result[0]!)
}

export async function updateAdminUser(
  id: number,
  patch: { role?: AdminRole; active?: boolean; password?: string },
): Promise<AdminUserRow> {
  await ensureDb()
  const existing = await getAdminById(id)
  if (!existing) throw new Error("Пользователь не найден")
  const next: Partial<typeof admins.$inferInsert> = {}
  if (patch.role) next.role = patch.role
  if (typeof patch.active === "boolean") next.active = patch.active
  if (patch.password) {
    if (patch.password.length < 6) throw new Error("Пароль не короче 6 символов")
    next.passwordHash = hashPassword(patch.password)
  }
  if (!Object.keys(next).length) return existing
  await db.update(admins).set(next).where(eq(admins.id, id))
  const updated = await getAdminById(id)
  if (!updated) throw new Error("Пользователь не найден")
  return updated
}

/** Soft-delete: hide from list + block login (active=false). */
export async function softDeleteAdminUser(id: number): Promise<AdminUserRow> {
  return updateAdminUser(id, { active: false })
}

export async function restoreAdminUser(id: number): Promise<AdminUserRow> {
  return updateAdminUser(id, { active: true })
}

/** Permanent delete from DB. */
export async function purgeAdminUser(id: number): Promise<void> {
  await ensureDb()
  const existing = await getAdminById(id)
  if (!existing) throw new Error("Пользователь не найден")
  if (existing.active) throw new Error("Сначала удалите (скройте) пользователя")
  await db.delete(admins).where(eq(admins.id, id))
}

export async function listInactiveAdmins(): Promise<AdminUserRow[]> {
  await ensureDb()
  const rows = await db.select().from(admins).where(eq(admins.active, false)).orderBy(desc(admins.id))
  return rows.map(mapAdmin)
}

/** Prevent deactivating the last active privileged admin (admin|superadmin). */
export async function countActiveAdmins(excludeId?: number): Promise<number> {
  await ensureDb()
  const rows = await db
    .select({ id: admins.id, role: admins.role })
    .from(admins)
    .where(excludeId != null ? and(eq(admins.active, true), ne(admins.id, excludeId)) : eq(admins.active, true))
  return rows.filter((r) => isPrivilegedAdminRole(parseAdminRole(r.role))).length
}
