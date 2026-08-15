"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireCapability } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import {
  canAssignRole,
  canManageTargetRole,
  isAdminRole,
  isPrivilegedAdminRole,
  parseAdminRole,
  type AdminRole,
} from "@/lib/admin-roles"
import {
  countActiveAdmins,
  createAdminUser,
  getAdminById,
  softDeleteAdminUser,
  updateAdminUser,
} from "@/lib/admins"
import { adminUserCreateSchema, adminUserUpdateSchema, zodFirstError } from "@/lib/validations/admin"
import { mapDbError } from "@/lib/db-errors"

function usersError(message: string): never {
  redirect("/admin/users?error=" + encodeURIComponent(message))
}

export async function createAdminUserAction(formData: FormData) {
  const actor = await requireCapability("manage_users")
  const raw = {
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "manager"),
    active: String(formData.get("active") || "true"),
  }
  const validated = adminUserCreateSchema.safeParse(raw)
  if (!validated.success) {
    usersError(zodFirstError(validated.error))
  }
  const role: AdminRole = isAdminRole(validated.data.role) ? validated.data.role : "manager"

  if (!canAssignRole(actor.role, role)) {
    usersError("Нельзя назначить роль выше своей")
  }

  try {
    const user = await createAdminUser({
      username: validated.data.username,
      password: validated.data.password,
      role,
    })
    await writeAudit({
      admin: actor,
      action: "user_create",
      entityType: "admin",
      entityId: user.id,
      summary: `Создан пользователь ${user.username} (${user.role})`,
      after: { id: user.id, username: user.username, role: user.role, active: user.active },
    })
  } catch (err) {
    const msg = mapDbError(err, "Не удалось создать пользователя")
    redirect(`/admin/users?error=${encodeURIComponent(msg)}`)
  }
  revalidatePath("/admin/users")
  redirect("/admin/users?notice=created")
}

export async function updateAdminUserAction(formData: FormData) {
  const actor = await requireCapability("manage_users")
  const id = Number(formData.get("id"))
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/users?error=bad_id")

  const before = await getAdminById(id)
  if (!before) redirect("/admin/users?error=not_found")
  if (!before.active) usersError("Пользователь удалён")

  const rawPwd = String(formData.get("password") || "")
  const roleRaw = formData.get("role")
  const wantsRole = roleRaw != null && String(roleRaw).trim() !== ""
  const updValidated = adminUserUpdateSchema.safeParse({
    password: rawPwd,
    role: wantsRole ? String(roleRaw).trim() : undefined,
  })
  if (!updValidated.success) {
    usersError(zodFirstError(updValidated.error))
  }
  const password = updValidated.data.password ?? ""
  const role = wantsRole && updValidated.data.role ? parseAdminRole(updValidated.data.role) : before.role

  // Never change own role (blocks manager→admin self-elevation via crafted POST).
  if (actor.id === id && wantsRole && role !== before.role) {
    usersError("Нельзя менять свою роль")
  }

  // Tier: cannot edit users at equal/higher tier (except self password).
  if (actor.id !== id && !canManageTargetRole(actor.role, before.role)) {
    usersError("Нельзя менять пользователя с равным или более высоким тиром")
  }

  if (wantsRole && role !== before.role) {
    if (!canAssignRole(actor.role, role)) {
      usersError("Нельзя назначить роль выше своей")
    }
  }

  if (isPrivilegedAdminRole(before.role) && !isPrivilegedAdminRole(role) && before.active) {
    const remaining = await countActiveAdmins(id)
    if (remaining < 1) {
      usersError("Нельзя снять роль с последнего админа")
    }
  }

  try {
    const after = await updateAdminUser(id, {
      ...(actor.id === id ? {} : wantsRole ? { role } : {}),
      password: password || undefined,
    })
    await writeAudit({
      admin: actor,
      action: password ? "user_update_password" : "user_update",
      entityType: "admin",
      entityId: id,
      summary: `Обновлён ${after.username}`,
      before: { username: before.username, role: before.role, active: before.active },
      after: { username: after.username, role: after.role, active: after.active, passwordChanged: !!password },
    })
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message : "Ошибка")
    redirect(`/admin/users?error=${msg}`)
  }
  revalidatePath("/admin/users")
  redirect("/admin/users?notice=saved")
}

export async function deleteAdminUserAction(formData: FormData) {
  const actor = await requireCapability("manage_users")
  const id = Number(formData.get("id"))
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/users?error=bad_id")

  const before = await getAdminById(id)
  if (!before) redirect("/admin/users?error=not_found")
  if (!before.active) {
    revalidatePath("/admin/users")
    redirect("/admin/users?notice=deleted")
  }
  if (actor.id === id) {
    usersError("Нельзя удалить себя")
  }
  if (!canManageTargetRole(actor.role, before.role)) {
    usersError("Нельзя удалить пользователя с равным или более высоким тиром")
  }
  if (isPrivilegedAdminRole(before.role)) {
    const remaining = await countActiveAdmins(id)
    if (remaining < 1) {
      usersError("Нельзя удалить последнего активного админа")
    }
  }

  try {
    const after = await softDeleteAdminUser(id)
    await writeAudit({
      admin: actor,
      action: "user_delete",
      entityType: "admin",
      entityId: id,
      summary: `Удалён пользователь ${before.username}`,
      before: { username: before.username, role: before.role, active: before.active },
      after: { username: after.username, role: after.role, active: after.active },
    })
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message : "Ошибка")
    redirect(`/admin/users?error=${msg}`)
  }
  revalidatePath("/admin/users")
  revalidatePath("/admin/audit")
  redirect("/admin/users?notice=deleted")
}
