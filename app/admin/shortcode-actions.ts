"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shortcodes } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import { requireAdmin, requireCapability } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import { shortcodeSaveSchema, zodFirstError } from "@/lib/validations/admin"
import { listShortcodes } from "@/lib/shortcodes"

/** List for editor insert — any logged-in admin (managers edit tours). */
export async function getAllShortcodesAction() {
  await requireAdmin()
  return listShortcodes()
}

export async function saveShortcodeAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  let admin
  try {
    admin = await requireCapability("manage_settings")
  } catch {
    return { error: "Недостаточно прав" }
  }

  const idRaw = String(formData.get("id") || "").trim()
  const parsed = shortcodeSaveSchema.safeParse({
    name: formData.get("name"),
    value: formData.get("value"),
    description: String(formData.get("description") || "").trim() || null,
  })
  if (!parsed.success) return { error: zodFirstError(parsed.error) }

  await ensureDb()
  const { name, value, description } = parsed.data

  try {
    if (idRaw) {
      const id = Number(idRaw)
      if (!Number.isFinite(id)) return { error: "Некорректный id" }
      await db
        .update(shortcodes)
        .set({ name, value, description: description ?? null })
        .where(eq(shortcodes.id, id))
      await writeAudit({
        admin,
        action: "shortcode_update",
        entityType: "shortcode",
        entityId: id,
        summary: `Обновлён шорткод «${name}»`,
        after: { id, name, value, description },
      })
    } else {
      await db.insert(shortcodes).values({
        name,
        value,
        description: description ?? null,
      })
      await writeAudit({
        admin,
        action: "shortcode_create",
        entityType: "shortcode",
        entityId: name,
        summary: `Создан шорткод «${name}»`,
        after: { name, value, description },
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { error: "Шорткод с таким именем уже существует" }
    }
    throw e
  }

  revalidatePath("/admin/shortcodes")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteShortcodeAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("manage_settings")
  const id = Number(formData.get("id"))
  if (!Number.isFinite(id)) return
  await ensureDb()
  await db.delete(shortcodes).where(eq(shortcodes.id, id))
  await writeAudit({
    admin,
    action: "shortcode_delete",
    entityType: "shortcode",
    entityId: id,
    summary: `Удалён шорткод #${id}`,
  })
  revalidatePath("/admin/shortcodes")
  revalidatePath("/")
}

/**
 * Aliases matching the requested CRUD naming convention.
 * All aliases are `use server` actions — they require an authenticated
 * admin session with `manage_settings` capability; never call them from
 * library code that runs outside the admin request context (use direct
 * Drizzle `db.insert(shortcodes)` instead).
 */
export const createShortcode = saveShortcodeAction
export const updateShortcode = saveShortcodeAction
export const deleteShortcode = deleteShortcodeAction
export const getAllShortcodes = getAllShortcodesAction
