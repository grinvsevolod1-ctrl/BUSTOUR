"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin, requireCapability } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { mutateThenRedirect } from "@/lib/admin-redirect"
import {
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  restoreStaffMember,
  purgeStaffMember,
  moveStaffMember,
  getStaffMember,
  type StaffInput,
} from "@/lib/queries"
import { mapDbError } from "@/lib/db-errors"
import { staffSaveSchema, zodFirstError } from "@/lib/validations/admin"

export async function saveStaffAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()

  const raw = {
    name: String(formData.get("name") || "").trim(),
    position: String(formData.get("position") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    photo: String(formData.get("photo") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0),
  }
  const validated = staffSaveSchema.safeParse(raw)
  if (!validated.success) return { error: zodFirstError(validated.error) }

  const input: StaffInput = {
    name: validated.data.name,
    position: validated.data.position,
    email: validated.data.email,
    phone: validated.data.phone,
    photo: validated.data.photo,
    sortOrder: validated.data.sortOrder,
  }

  const id = Number(formData.get("id") || 0)
  try {
    if (id) {
      await updateStaffMember(id, input)
      await writeAudit({
        admin,
        action: "staff_update",
        entityType: "staff",
        entityId: id,
        summary: `Обновлён сотрудник «${input.name}»`,
        after: { id, ...input },
      })
    } else {
      await createStaffMember(input)
      await writeAudit({
        admin,
        action: "staff_create",
        entityType: "staff",
        summary: `Создан сотрудник «${input.name}»`,
        after: input,
      })
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить сотрудника") }
  }

  revalidatePath("/admin/staff")
  revalidatePath("/company/staff")
  redirect("/admin/staff")
}

export async function moveStaffAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  if (id) await moveStaffMember(id, direction)
  const member = id ? await getStaffMember(id) : undefined
  await writeAudit({
    admin,
    action: "staff_move",
    entityType: "staff",
    entityId: id,
    summary: member
      ? `Перемещён сотрудник «${member.name}» (${direction})`
      : `Перемещён сотрудник #${id} (${direction})`,
    after: { direction },
  })
  revalidatePath("/admin/staff")
  revalidatePath("/company/staff")
}

export async function deleteStaffAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await deleteStaffMember(id)
      await writeAudit({
        admin,
        action: "staff_archive",
        entityType: "staff",
        entityId: id,
        summary: `В архив сотрудник #${id}`,
      })
      revalidatePath("/admin/staff")
      revalidatePath("/admin/archive")
      revalidatePath("/company/staff")
    },
    "/admin/staff?notice=archived",
    "/admin/staff",
  )
}

export async function restoreStaffAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await restoreStaffMember(id)
      await writeAudit({
        admin,
        action: "staff_restore",
        entityType: "staff",
        entityId: id,
        summary: `Восстановлен сотрудник #${id}`,
      })
      revalidatePath("/admin/staff")
      revalidatePath("/admin/archive")
      revalidatePath("/company/staff")
    },
    "/admin/archive?notice=restored",
    "/admin/archive",
  )
}

export async function purgeStaffAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await purgeStaffMember(id)
      await writeAudit({
        admin,
        action: "staff_purge",
        entityType: "staff",
        entityId: id,
        summary: `Удалён сотрудник #${id}`,
      })
      revalidatePath("/admin/staff")
      revalidatePath("/admin/archive")
      revalidatePath("/company/staff")
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}
