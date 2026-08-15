import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { admins } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { verifyPassword } from "@/lib/password"
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SEC,
  adminSessionCookieSecure,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-session"
import {
  parseAdminRole,
  roleHasCapability,
  type AdminCapability,
  type AdminRole,
} from "@/lib/admin-roles"
import { writeAudit } from "@/lib/admin-audit"

export { authHmacSecret } from "@/lib/auth-secret"
export {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  hasValidAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-session"

export type SessionAdmin = {
  id: number
  username: string
  role: AdminRole
}

export async function login(username: string, password: string): Promise<boolean> {
  await ensureDb()
  const [admin] = await db.select().from(admins).where(eq(admins.username, username)).limit(1)
  if (!admin) {
    await writeAudit({
      username,
      action: "login_fail",
      entityType: "admin",
      summary: `Неудачный вход: ${username}`,
    })
    return false
  }
  if (!admin.active) {
    await writeAudit({
      admin: { id: admin.id, username: admin.username },
      action: "login_fail",
      entityType: "admin",
      entityId: admin.id,
      summary: `Вход заблокирован (неактивен): ${admin.username}`,
    })
    return false
  }
  if (!(await verifyPassword(password, admin.passwordHash))) {
    await writeAudit({
      admin: { id: admin.id, username: admin.username },
      action: "login_fail",
      entityType: "admin",
      entityId: admin.id,
      summary: `Неверный пароль: ${admin.username}`,
    })
    return false
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE_NAME, createAdminSessionToken(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    // HTTP VPS (http://IP:3000) cannot use Secure cookies — browser drops them.
    secure: adminSessionCookieSecure(),
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SEC,
  })
  await writeAudit({
    admin: { id: admin.id, username: admin.username },
    action: "login",
    entityType: "admin",
    entityId: admin.id,
    summary: `Вход: ${admin.username}`,
    meta: { role: parseAdminRole(admin.role) },
  })
  return true
}

export async function logout() {
  const admin = await getAdmin().catch(() => null)
  const store = await cookies()
  store.delete(ADMIN_COOKIE_NAME)
  if (admin) {
    await writeAudit({
      admin,
      action: "logout",
      entityType: "admin",
      entityId: admin.id,
      summary: `Выход: ${admin.username}`,
    })
  }
}

export async function getAdmin(): Promise<SessionAdmin | null> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE_NAME)?.value
  const verified = verifyAdminSessionToken(token)
  if (!verified) return null
  await ensureDb()
  const [admin] = await db.select().from(admins).where(eq(admins.id, verified.adminId)).limit(1)
  if (!admin || !admin.active) return null
  return {
    id: admin.id,
    username: admin.username,
    role: parseAdminRole(admin.role),
  }
}

export async function requireAdmin(): Promise<SessionAdmin> {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")
  return admin
}

export async function requireRole(role: AdminRole): Promise<SessionAdmin> {
  const admin = await requireAdmin()
  if (admin.role !== role) throw new Error("Forbidden")
  return admin
}

export async function requireCapability(cap: AdminCapability): Promise<SessionAdmin> {
  const admin = await requireAdmin()
  if (!roleHasCapability(admin.role, cap)) throw new Error("Forbidden")
  return admin
}
