"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { writeAudit } from "@/lib/admin-audit"
import {
  createCertSection,
  updateCertSection,
  deleteCertSection,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  type CertSectionInput,
  type CertificateInput,
} from "@/lib/queries"
import { mapDbError } from "@/lib/db-errors"

function revalidateAll() {
  revalidatePath("/admin/licenses")
  revalidatePath("/company/licenses")
}

/* ---------- Sections ---------- */

export async function saveCertSectionAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()

  const input: CertSectionInput = {
    title: String(formData.get("title") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0),
  }

  if (!input.title) return { error: "Введите название раздела" }

  const id = Number(formData.get("id") || 0)
  try {
    if (id) {
      await updateCertSection(id, input)
      await writeAudit({
        admin,
        action: "cert_section_update",
        entityType: "cert_section",
        entityId: id,
        summary: `Обновлён раздел «${input.title}»`,
        after: { id, ...input },
      })
    } else {
      await createCertSection(input)
      await writeAudit({
        admin,
        action: "cert_section_create",
        entityType: "cert_section",
        summary: `Создан раздел «${input.title}»`,
        after: input,
      })
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить раздел") }
  }

  revalidateAll()
  redirect("/admin/licenses")
}

export async function deleteCertSectionAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  try {
    if (id) await deleteCertSection(id)
    await writeAudit({
      admin,
      action: "cert_section_delete",
      entityType: "cert_section",
      entityId: id,
      summary: `Удалён раздел #${id}`,
    })
  } catch (err) {
    const msg = mapDbError(err, "Не удалось удалить раздел")
    redirect(`/admin/licenses?error=${encodeURIComponent(msg)}`)
  }
  revalidateAll()
}

/* ---------- Certificates ---------- */

export async function saveCertificateAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()

  const input: CertificateInput = {
    sectionId: Number(formData.get("sectionId") || 0),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    image: String(formData.get("image") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0),
  }

  if (!input.name) return { error: "Введите название документа" }
  if (!input.sectionId || !Number.isFinite(input.sectionId) || input.sectionId <= 0) {
    return { error: "Выберите раздел для документа" }
  }

  const id = Number(formData.get("id") || 0)
  try {
    if (id) {
      await updateCertificate(id, input)
      await writeAudit({
        admin,
        action: "certificate_update",
        entityType: "certificate",
        entityId: id,
        summary: `Обновлён документ «${input.name}»`,
        after: { id, ...input },
      })
    } else {
      await createCertificate(input)
      await writeAudit({
        admin,
        action: "certificate_create",
        entityType: "certificate",
        summary: `Создан документ «${input.name}»`,
        after: input,
      })
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить документ") }
  }

  revalidateAll()
  redirect("/admin/licenses")
}

export async function deleteCertificateAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (id) await deleteCertificate(id)
  await writeAudit({
    admin,
    action: "certificate_delete",
    entityType: "certificate",
    entityId: id,
    summary: `Удалён документ #${id}`,
  })
  revalidateAll()
}
