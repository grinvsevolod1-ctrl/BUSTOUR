"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { createBusTourType, updateBusTourType, deleteBusTourType } from "@/lib/bus-tour-types"

type ActionState = { ok?: boolean; error?: string }

export async function saveBusTourTypeAction(_prev: unknown, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const name = String(formData.get("name") || "").trim()
  if (!name) return { error: "Укажите название типа тура" }
  const id = Number(formData.get("id") || 0)
  try {
    if (id) {
      await updateBusTourType(id, name)
      await writeAudit({
        admin,
        action: "bus_tour_type_update",
        entityType: "bus_tour_type",
        entityId: id,
        summary: `Обновлён тип тура «${name}»`,
        after: { id, name },
      })
    } else {
      await createBusTourType(name)
      await writeAudit({
        admin,
        action: "bus_tour_type_create",
        entityType: "bus_tour_type",
        summary: `Создан тип тура «${name}»`,
        after: { name },
      })
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" }
  }
  revalidatePath("/admin/tours")
  revalidatePath("/avtobusnye-tury", "layout")
  return { ok: true }
}

export async function deleteBusTourTypeAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (!id) return
  try {
    await deleteBusTourType(id)
    await writeAudit({
      admin,
      action: "bus_tour_type_delete",
      entityType: "bus_tour_type",
      entityId: id,
      summary: `Удалён тип тура #${id}`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не удалось удалить"
    redirect(`/admin/tours?error=${encodeURIComponent(msg)}`)
  }
  revalidatePath("/admin/tours")
  revalidatePath("/avtobusnye-tury", "layout")
}
