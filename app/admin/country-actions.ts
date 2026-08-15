"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin, requireCapability } from "@/lib/auth"
import { changedSettings, pickSettingsSubset, writeAudit } from "@/lib/admin-audit"
import {
  createCountry,
  updateCountry,
  deleteCountry,
  restoreCountry,
  purgeCountry,
  moveCountry,
  reorderCountries,
  getCountryById,
  COUNTRY_ARCHIVE_BLOCKED_BY_TOURS,
  type CountryInput,
} from "@/lib/countries"
import { getSettings, replacePageFaqs, saveSettings } from "@/lib/cms"
import { parseFaqGroups, parseNamespacedFaqsFromAggregate, type NamespacedFaq } from "@/lib/faq-form"
import { aviaCountryPageGroups } from "@/lib/admin-config"
import { mapDbError } from "@/lib/db-errors"
import { countrySaveSchema, destinationPageSettingsSchema, zodFirstError } from "@/lib/validations/admin"
import { rekeyPageScopedContent } from "@/lib/page-rekey"
import { saveCountryAggregate } from "@/lib/destination-aggregate"

function countryFromForm(formData: FormData): CountryInput {
  const rawCategory = String(formData.get("category") || "").trim()
  return {
    slug: String(formData.get("slug") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    category: rawCategory === "avia" ? "avia" : rawCategory === "hot" ? "hot" : "bus",
    intro: String(formData.get("intro") || "").trim(),
    seoHtml: String(formData.get("seoHtml") || "").trim(),
  }
}

function parseOrderedIds(formData: FormData): number[] {
  try {
    const parsed = JSON.parse(String(formData.get("orderedIds") || "[]"))
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

export async function saveCountryAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const input = countryFromForm(formData)
  const validated = countrySaveSchema.safeParse(input)
  if (!validated.success) return { error: zodFirstError(validated.error) }
  const id = Number(formData.get("id") || 0)
  const existing = id ? await getCountryById(id) : undefined
  if (id && !existing) return { error: "Страна не найдена" }
  if (existing) input.category = existing.category
  const checked = destinationPageSettingsSchema.safeParse({ metaTitle: formData.get("metaTitle"), metaDescription: formData.get("metaDescription"), metaShortDesc: formData.get("metaShortDesc"), metaImage: formData.get("metaImage"), h1: formData.get("h1"), intro: formData.get("intro") })
  if (!checked.success) return { error: zodFirstError(checked.error) }
  const pageKey = `country:${input.category}:${input.slug}`
  const CREATE_SLUG_PLACEHOLDER = "__COUNTRY_NEW__"
  const legacyPlaceholderPrefix = `country:${input.category}:${CREATE_SLUG_PLACEHOLDER}.`
  for (const [rawKey, value] of Array.from(formData.entries())) {
    if (typeof rawKey !== "string" || typeof value !== "string") continue
    if (!rawKey.startsWith(legacyPlaceholderPrefix)) continue
    const suffix = rawKey.slice(legacyPlaceholderPrefix.length)
    formData.delete(rawKey)
    formData.append(`${pageKey}.${suffix}`, value)
  }
  const richSettings: Record<string, string> = {}
  for (const group of aviaCountryPageGroups(input.slug, input.category)) for (const field of group.fields) { const value = formData.get(field.key); if (value !== null) richSettings[field.key] = String(value) }
  const settingsPatch = { ...(id ? {} : { [`${pageKey}.visible`]: "0", [`${pageKey}.section.callus`]: "0" }), ...Object.fromEntries(Object.entries(checked.data).map(([key, value]) => [`${pageKey}.${key}`, value])), ...richSettings }
  const namespacedFaqsCreateCountry: NamespacedFaq[] = parseNamespacedFaqsFromAggregate(formData)
  let newId: number
  try { newId = await saveCountryAggregate(input, { id: id || undefined, oldPageKey: existing ? `country:${existing.category}:${existing.slug}` : undefined, settings: settingsPatch, faqs: parseFaqGroups(formData), faqsByStorage: namespacedFaqsCreateCountry }) }
  catch (err) { return { error: mapDbError(err, id ? "Не удалось сохранить страну целиком" : "Не удалось создать страну целиком") } }
  await writeAudit({ admin, action: id ? "country_update" : "country_create", entityType: "country", entityId: newId, summary: `${id ? "Обновлена" : "Создана"} страна «${input.name}»`, after: { id: newId, slug: input.slug, name: input.name, category: input.category } })
  revalidatePath("/admin/countries")
  if (!id) redirect(`/admin/countries/${newId}`)
  redirect(`/admin/countries?category=${input.category}`)
}
/**
 * Saves only the base fields (name, slug) of a country without redirecting.
 * Used by CountryBaseForm on the edit page alongside PageSettingsForm.
 */
export async function saveCountryPageAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const existing = id ? await getCountryById(id) : undefined
  if (!existing) return { error: "Страна не найдена" }
  const input = countryFromForm(formData); input.category = existing.category
  const validated = countrySaveSchema.safeParse(input)
  if (!validated.success) return { error: zodFirstError(validated.error) }
  const oldPageKey = `country:${existing.category}:${existing.slug}`
  const checked = destinationPageSettingsSchema.safeParse(Object.fromEntries(["metaTitle", "metaDescription", "metaShortDesc", "metaImage", "h1", "intro"].map((field) => [field, formData.get(`${oldPageKey}.${field}`)])))
  if (!checked.success) {
    const issue = checked.error.issues[0]; const field = String(issue?.path[0] ?? "")
    const labels: Record<string, string> = { intro: "Описание страницы", h1: "Заголовок H1", metaTitle: "Title (SEO)", metaDescription: "Описание для поиска", metaShortDesc: "Превью-описание", metaImage: "Превью-изображение" }
    const fullField = `${oldPageKey}.${field}`
    const tabHash = "#settings-content" as const
    return {
      error: `Проверьте поле «${labels[field] ?? "Основные данные"}»: ${issue?.message ?? "исправьте значение"}`,
      fieldErrors: { [fullField]: issue?.message ?? "Исправьте значение" },
      firstError: {
        field,
        message: issue?.message ?? "Исправьте значение",
        focusId: `sf-${fullField}`,
        tabHash,
      },
    }
  }
  const newPageKey = `country:${existing.category}:${input.slug}`
  const settingsPatch: Record<string, string> = {}
  const rawSectionOrder = formData.get("__sectionOrder")
  if (typeof rawSectionOrder === "string" && rawSectionOrder) {
    settingsPatch[`${newPageKey}.sections.order`] = rawSectionOrder
  }
  const rawSectionVisibility = formData.get("__sectionVisibility")
  if (typeof rawSectionVisibility === "string" && rawSectionVisibility) {
    try {
      const parsed = JSON.parse(rawSectionVisibility) as Record<string, boolean>
      for (const [key, on] of Object.entries(parsed)) {
        const migrated = key.startsWith(`${oldPageKey}.`) ? `${newPageKey}.${key.slice(oldPageKey.length + 1)}` : key
        settingsPatch[migrated] = on ? "1" : "0"
      }
    } catch {
      // ignore malformed visibility JSON
    }
  }
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("__") || ["id", "name", "slug", "category"].includes(key)) continue
    settingsPatch[key.startsWith(`${oldPageKey}.`) ? `${newPageKey}.${key.slice(oldPageKey.length + 1)}` : key] = value
  }
  const namespacedFaqsPage: NamespacedFaq[] = parseNamespacedFaqsFromAggregate(formData)
  try { await saveCountryAggregate(input, { id, oldPageKey, settings: settingsPatch, faqs: parseFaqGroups(formData), faqsByStorage: namespacedFaqsPage }) }
  catch (error) { return { error: mapDbError(error, "Не удалось сохранить страну целиком") } }
  await writeAudit({ admin, action: "country_update", entityType: "country", entityId: id, summary: `Обновлена страна «${input.name}»`, before: { slug: existing.slug, name: existing.name }, after: { slug: input.slug, name: input.name } })
  revalidatePath(`/admin/countries/${id}`)
  return { ok: true }
}
export async function saveCountryBaseAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (!id) return { error: "ID не указан" }
  const name = String(formData.get("name") || "").trim()
  const slug = String(formData.get("slug") || "").trim()
  const check = countrySaveSchema.safeParse({ slug, name, category: "bus" })
  if (!check.success) return { error: zodFirstError(check.error) }
  const existing = await getCountryById(id)
  if (!existing) return { error: "Страна не найдена" }
  // Category is fixed after creation — URLs and settings are scoped by it.
  try {
    if (existing.slug !== slug) {
      await rekeyPageScopedContent(
        `country:${existing.category}:${existing.slug}`,
        `country:${existing.category}:${slug}`,
      )
    }
    await updateCountry(id, {
      slug,
      name,
      category: existing.category,
      intro: existing.intro ?? "",
      seoHtml: existing.seoHtml ?? "",
    })
    await writeAudit({
      admin,
      action: "country_update",
      entityType: "country",
      entityId: id,
      summary: `Обновлена страна «${name}» (база)`,
      before: { slug: existing.slug, name: existing.name },
      after: { slug, name },
    })
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить страну") }
  }
  revalidatePath("/admin/countries")
  revalidatePath(`/admin/countries/${id}`)
  revalidatePath(`/aviatory/${slug}/`)
  revalidatePath(`/avtobusnye-tury/${slug}/`)
  revalidatePath(`/hot/${slug}`)
  return { ok: true }
}

export async function moveCountryAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  if (id) await moveCountry(id, direction)
  const country = id ? await getCountryById(id) : undefined
  await writeAudit({
    admin,
    action: "country_move",
    entityType: "country",
    entityId: id,
    summary: country
      ? `Перемещена страна «${country.name}» (${direction})`
      : `Перемещена страна #${id} (${direction})`,
    after: { direction, category: country?.category },
  })
  revalidatePath("/admin/countries")
  revalidatePath("/", "layout")
  revalidatePath("/avtobusnye-tury")
  revalidatePath("/aviatory")
  revalidatePath("/hot")
}

export async function reorderCountriesAction(formData: FormData) {
  const admin = await requireAdmin()
  const orderedIds = parseOrderedIds(formData)
  if (orderedIds.length < 2) return
  await reorderCountries(orderedIds)
  await writeAudit({
    admin,
    action: "country_reorder",
    entityType: "country",
    entityId: orderedIds[0],
    summary: "Обновлён порядок стран перетаскиванием",
    after: { orderedIds },
  })
  revalidatePath("/admin/countries")
  revalidatePath("/", "layout")
  revalidatePath("/avtobusnye-tury")
  revalidatePath("/aviatory")
  revalidatePath("/hot")
}

export async function deleteCountryAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (!id) redirect("/admin/countries")
  const country = await getCountryById(id)
  const category = country?.category ?? "bus"
  try {
    await deleteCountry(id)
    await writeAudit({
      admin,
      action: "country_archive",
      entityType: "country",
      entityId: id,
      summary: country ? `В архив: страна «${country.name}»` : `В архив страна #${id}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === COUNTRY_ARCHIVE_BLOCKED_BY_TOURS) {
      redirect(`/admin/countries?category=${category}&error=${encodeURIComponent(msg)}`)
    }
    throw err
  }
  revalidatePath("/admin/countries")
  revalidatePath("/admin/archive")
  redirect(`/admin/countries?category=${category}&notice=archived`)
}

export async function restoreCountryAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (id) await restoreCountry(id)
  await writeAudit({
    admin,
    action: "country_restore",
    entityType: "country",
    entityId: id,
    summary: `Восстановлена страна #${id}`,
  })
  revalidatePath("/admin/countries")
  revalidatePath("/admin/archive")
  redirect("/admin/archive?notice=restored")
}

export async function purgeCountryAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  try {
    if (id) await purgeCountry(id)
    await writeAudit({
      admin,
      action: "country_purge",
      entityType: "country",
      entityId: id,
      summary: `Удалена страна #${id}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Не удалось удалить"
    redirect(`/admin/archive?error=${encodeURIComponent(msg)}`)
  }
  revalidatePath("/admin/countries")
  revalidatePath("/admin/archive")
  redirect("/admin/archive?notice=purged")
}
