"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireCapability } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import {
  createCustomAdminRole,
  hideAdminRole,
  purgeAdminRole,
  restoreAdminRole,
} from "@/lib/admin-role-catalog"
import {
  getAdminById,
  purgeAdminUser,
  restoreAdminUser,
  countActiveAdmins,
} from "@/lib/admins"
import { isPrivilegedAdminRole } from "@/lib/admin-roles"

function rolesRedirect(notice?: string, error?: string): never {
  const q = new URLSearchParams()
  if (notice) q.set("notice", notice)
  if (error) q.set("error", error)
  const s = q.toString()
  redirect(s ? `/admin/roles?${s}` : "/admin/roles")
}

export async function hideRoleAction(formData: FormData) {
  const actor = await requireCapability("manage_roles")
  const slug = String(formData.get("slug") || "").trim()
  try {
    const after = await hideAdminRole(slug)
    await writeAudit({
      admin: actor,
      action: "role_hide",
      entityType: "admin_role",
      entityId: slug,
      summary: `Скрыта роль ${after.label} (${slug})`,
      after: { slug, hidden: true },
    })
  } catch (err) {
    rolesRedirect(undefined, err instanceof Error ? err.message : "Ошибка")
  }
  revalidatePath("/admin/roles")
  revalidatePath("/admin/users")
  rolesRedirect("hidden")
}

export async function restoreRoleAction(formData: FormData) {
  const actor = await requireCapability("manage_roles")
  const slug = String(formData.get("slug") || "").trim()
  try {
    const after = await restoreAdminRole(slug)
    await writeAudit({
      admin: actor,
      action: "role_restore",
      entityType: "admin_role",
      entityId: slug,
      summary: `Восстановлена роль ${after.label} (${slug})`,
      after: { slug, hidden: false },
    })
  } catch (err) {
    rolesRedirect(undefined, err instanceof Error ? err.message : "Ошибка")
  }
  revalidatePath("/admin/roles")
  revalidatePath("/admin/users")
  rolesRedirect("restored")
}

export async function purgeRoleAction(formData: FormData) {
  const actor = await requireCapability("manage_roles")
  const slug = String(formData.get("slug") || "").trim()
  try {
    await purgeAdminRole(slug)
    await writeAudit({
      admin: actor,
      action: "role_purge",
      entityType: "admin_role",
      entityId: slug,
      summary: `Удалена навсегда роль ${slug}`,
    })
  } catch (err) {
    rolesRedirect(undefined, err instanceof Error ? err.message : "Ошибка")
  }
  revalidatePath("/admin/roles")
  rolesRedirect("purged")
}

export async function createRoleAction(formData: FormData) {
  const actor = await requireCapability("manage_roles")
  const slug = String(formData.get("slug") || "").trim()
  const label = String(formData.get("label") || "").trim()
  try {
    const row = await createCustomAdminRole({ slug, label })
    await writeAudit({
      admin: actor,
      action: "role_create",
      entityType: "admin_role",
      entityId: row.slug,
      summary: `Создана роль ${row.label} (${row.slug})`,
      after: row,
    })
  } catch (err) {
    rolesRedirect(undefined, err instanceof Error ? err.message : "Ошибка")
  }
  revalidatePath("/admin/roles")
  rolesRedirect("created")
}

export async function restoreHiddenUserAction(formData: FormData) {
  const actor = await requireCapability("manage_roles")
  const id = Number(formData.get("id"))
  if (!Number.isFinite(id) || id <= 0) rolesRedirect(undefined, "bad_id")
  const before = await getAdminById(id)
  if (!before) rolesRedirect(undefined, "not_found")
  try {
    const after = await restoreAdminUser(id)
    await writeAudit({
      admin: actor,
      action: "user_restore",
      entityType: "admin",
      entityId: id,
      summary: `Восстановлен пользователь ${after.username}`,
      before: { active: before.active },
      after: { active: after.active },
    })
  } catch (err) {
    rolesRedirect(undefined, err instanceof Error ? err.message : "Ошибка")
  }
  revalidatePath("/admin/roles")
  revalidatePath("/admin/users")
  rolesRedirect("user_restored")
}

export async function purgeHiddenUserAction(formData: FormData) {
  const actor = await requireCapability("manage_roles")
  const id = Number(formData.get("id"))
  if (!Number.isFinite(id) || id <= 0) rolesRedirect(undefined, "bad_id")
  const before = await getAdminById(id)
  if (!before) rolesRedirect(undefined, "not_found")
  if (before.active) rolesRedirect(undefined, "Сначала скройте пользователя")
  if (isPrivilegedAdminRole(before.role)) {
    const remaining = await countActiveAdmins()
    if (remaining < 1) {
      rolesRedirect(undefined, "Нельзя удалить последнего админа")
    }
  }
  try {
    await purgeAdminUser(id)
    await writeAudit({
      admin: actor,
      action: "user_purge",
      entityType: "admin",
      entityId: id,
      summary: `Удалён навсегда ${before.username}`,
      before: { username: before.username, role: before.role, active: before.active },
    })
  } catch (err) {
    rolesRedirect(undefined, err instanceof Error ? err.message : "Ошибка")
  }
  revalidatePath("/admin/roles")
  revalidatePath("/admin/users")
  revalidatePath("/admin/audit")
  rolesRedirect("user_purged")
}
