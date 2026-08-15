"use server"

import { redirect } from "next/navigation"
import { withAdminAction } from "@/lib/admin-action"
import {
  createCertSection,
  updateCertSection,
  deleteCertSection,
  moveCertSection,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  moveCertificate,
  type CertSectionInput,
  type CertificateInput,
} from "@/lib/queries"

const REVALIDATE = ["/admin/licenses", "/company/licenses"] as const

/* ---------- Sections ---------- */

export async function saveCertSectionAction(_prev: unknown, formData: FormData) {
  const input: CertSectionInput = {
    title: String(formData.get("title") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0),
  }
  if (!input.title) return { error: "Введите название раздела" }

  const id = Number(formData.get("id") || 0)
  const outcome = await withAdminAction(
    { errorMessage: "Не удалось сохранить раздел", revalidate: REVALIDATE },
    async () => {
      if (id) await updateCertSection(id, input)
      else await createCertSection(input)
      return {
        audit: {
          action: id ? "cert_section_update" : "cert_section_create",
          entityType: "cert_section",
          entityId: id || undefined,
          summary: `${id ? "Обновлён" : "Создан"} раздел «${input.title}»`,
          after: id ? { id, ...input } : input,
        },
      }
    },
  )
  if ("error" in outcome) return outcome
  redirect("/admin/licenses")
}

export async function deleteCertSectionAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  const outcome = await withAdminAction(
    { errorMessage: "Не удалось удалить раздел", revalidate: REVALIDATE },
    async () => {
      if (id) await deleteCertSection(id)
      return {
        audit: {
          action: "cert_section_delete",
          entityType: "cert_section",
          entityId: id,
          summary: `Удалён раздел #${id}`,
        },
      }
    },
  )
  if ("error" in outcome) {
    redirect(`/admin/licenses?error=${encodeURIComponent(outcome.error)}`)
  }
}

export async function moveCertSectionAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  await withAdminAction(
    { errorMessage: "Не удалось переместить раздел", revalidate: REVALIDATE },
    async () => {
      if (id) await moveCertSection(id, direction)
      return {
        audit: {
          action: "cert_section_move",
          entityType: "cert_section",
          entityId: id,
          summary: `Перемещён раздел #${id} (${direction})`,
          after: { direction },
        },
      }
    },
  )
}

/* ---------- Certificates ---------- */

export async function saveCertificateAction(_prev: unknown, formData: FormData) {
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
  const outcome = await withAdminAction(
    { errorMessage: "Не удалось сохранить документ", revalidate: REVALIDATE },
    async () => {
      if (id) await updateCertificate(id, input)
      else await createCertificate(input)
      return {
        audit: {
          action: id ? "certificate_update" : "certificate_create",
          entityType: "certificate",
          entityId: id || undefined,
          summary: `${id ? "Обновлён" : "Создан"} документ «${input.name}»`,
          after: id ? { id, ...input } : input,
        },
      }
    },
  )
  if ("error" in outcome) return outcome
  redirect("/admin/licenses")
}

export async function moveCertificateAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  await withAdminAction(
    { errorMessage: "Не удалось переместить документ", revalidate: REVALIDATE },
    async () => {
      if (id) await moveCertificate(id, direction)
      return {
        audit: {
          action: "certificate_move",
          entityType: "certificate",
          entityId: id,
          summary: `Перемещён документ #${id} (${direction})`,
          after: { direction },
        },
      }
    },
  )
}

export async function deleteCertificateAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  await withAdminAction(
    { errorMessage: "Не удалось удалить документ", revalidate: REVALIDATE },
    async () => {
      if (id) await deleteCertificate(id)
      return {
        audit: {
          action: "certificate_delete",
          entityType: "certificate",
          entityId: id,
          summary: `Удалён документ #${id}`,
        },
      }
    },
  )
}
