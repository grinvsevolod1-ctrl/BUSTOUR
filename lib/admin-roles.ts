/** Admin RBAC: superadmin | admin | manager. */

export type AdminRole = "superadmin" | "admin" | "manager"

export type AdminCapability =
  | "manage_users"
  | "manage_roles"
  | "manage_settings"
  | "manage_currencies"
  | "manage_content"
  | "view_audit"
  | "purge"

const ALL_CAPS: readonly AdminCapability[] = [
  "manage_users",
  "manage_roles",
  "manage_settings",
  "manage_currencies",
  "manage_content",
  "view_audit",
  "purge",
] as const

/** Caps for plain admin (no role catalog). */
const ADMIN_CAPS: readonly AdminCapability[] = ALL_CAPS.filter((c) => c !== "manage_roles")

export const SYSTEM_ADMIN_ROLES: readonly AdminRole[] = ["superadmin", "admin", "manager"] as const

/** Higher number = higher privilege. */
export function roleTier(role: AdminRole): number {
  if (role === "superadmin") return 3
  if (role === "admin") return 2
  return 1
}

export function isAdminRole(value: string): value is AdminRole {
  return value === "superadmin" || value === "admin" || value === "manager"
}

export function parseAdminRole(value: unknown): AdminRole {
  const s = String(value ?? "").trim()
  return isAdminRole(s) ? s : "admin"
}

export function roleHasCapability(role: AdminRole, cap: AdminCapability): boolean {
  if (role === "superadmin") return ALL_CAPS.includes(cap)
  if (role === "admin") return ADMIN_CAPS.includes(cap)
  return false
}

export function roleLabel(role: AdminRole): string {
  if (role === "superadmin") return "Суперадмин"
  if (role === "admin") return "Админ"
  return "Менеджер"
}

/** Roles that count as “full admin” for last-admin safety checks. */
export function isPrivilegedAdminRole(role: AdminRole): boolean {
  return role === "superadmin" || role === "admin"
}

/** Roles an actor may assign (never above own tier). */
export function assignableRolesFor(actorRole: AdminRole): AdminRole[] {
  const tier = roleTier(actorRole)
  return SYSTEM_ADMIN_ROLES.filter((r) => roleTier(r) <= tier)
}

/** Actor may grant this role to someone else. */
export function canAssignRole(actorRole: AdminRole, role: AdminRole): boolean {
  return roleTier(role) <= roleTier(actorRole)
}

/**
 * Actor may change the role of a user who currently has `targetRole`.
 * Superadmin: anyone. Others: only strictly lower tier.
 */
export function canManageTargetRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
  if (actorRole === "superadmin") return true
  return roleTier(targetRole) < roleTier(actorRole)
}
