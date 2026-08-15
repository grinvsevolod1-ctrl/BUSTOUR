"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { withAdminAction } from "@/lib/admin-action"
import { changedSettings, pickSettingsSubset, writeAudit } from "@/lib/admin-audit"
import {
  createCity,
  updateCity,
  deleteCity,
  restoreCity,
  purgeCity,
  moveCity,
  reorderCities,
  getCityById,
  getCityDestination,
  CITY_ARCHIVE_BLOCKED_BY_TOURS,
  type CityInput,
} from "@/lib/cities"
import { ensureCountry } from "@/lib/countries"
import { getSettings, replacePageFaqs, saveSettings } from "@/lib/cms"
import { parseFaqGroups, parseNamespacedFaqsFromAggregate, type NamespacedFaq } from "@/lib/faq-form"
import { mapDbError } from "@/lib/db-errors"
import { citySaveSchema, destinationPageSettingsSchema, zodFirstError } from "@/lib/validations/admin"
import { rekeyPageScopedContent } from "@/lib/page-rekey"
import { saveCityAggregate } from "@/lib/destination-aggregate"
import { revalidateCatalogDestination } from "@/lib/revalidate-catalog"
import { getCountryById } from "@/lib/countries"

// Slugs are unique per category — the same slug may exist in bus/avia/hot
// because URLs are namespaced by the category prefix (/hot/..., /aviatory/...).
async function resolveSlugConflict(input: CityInput, id: number): Promise<string | null> {
  const conflict = await getCityDestination(input.slug, input.category)
  if (!conflict || conflict.id === id) return null
  return `Город со slug «${input.slug}» уже существует в этом разделе — укажите другой slug`
}

function parseOrderedIds(formData: FormData): number[] {
  try {
    const parsed = JSON.parse(String(formData.get("orderedIds") || "[]"))
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

function cityFromForm(formData: FormData): CityInput {
  const sectionTitles = formData.getAll("sectionTitle").map((v) => String(v))
  const sectionBodies = formData.getAll("sectionBody").map((v) => String(v))
  const sections = sectionTitles
    .map((title, i) => ({
      title: title.trim(),
      body: (sectionBodies[i] || "")
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean),
    }))
    .filter((s) => s.title || s.body.length)

  const rawCat = String(formData.get("category") || "bus").trim()
  const category = (["bus", "avia", "hot"] as const).includes(rawCat as "bus" | "avia" | "hot")
    ? (rawCat as "bus" | "avia" | "hot")
    : "bus"

  return {
    slug: String(formData.get("slug") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    category,
    country: String(formData.get("country") || "").trim(),
    countryId: 0,
    intro: String(formData.get("intro") || "").trim(),
    sections,
    seoHtml: String(formData.get("seoHtml") || "").trim(),
  }
}

export async function saveCityAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const input = cityFromForm(formData)
  const validated = citySaveSchema.safeParse(input)
  if (!validated.success) return { error: zodFirstError(validated.error) }
  const id = Number(formData.get("id") || 0)
  const existing = id ? await getCityById(id) : undefined
  if (id && !existing) return { error: "Город не найден" }
  if (existing) input.category = existing.category
  const linkedCountry = await ensureCountry(input.country, input.category)
  input.countryId = linkedCountry.id; input.country = linkedCountry.name
  const slugError = await resolveSlugConflict(input, id)
  if (slugError) return { error: slugError }
  const checked = destinationPageSettingsSchema.safeParse({ metaTitle: formData.get("metaTitle"), metaDescription: formData.get("metaDescription"), metaShortDesc: formData.get("metaShortDesc"), metaImage: formData.get("metaImage"), h1: formData.get("h1"), intro: formData.get("intro") })
  if (!checked.success) return { error: zodFirstError(checked.error) }
  const pageKey = `city:${input.category}:${input.slug}`
  const CREATE_SLUG_PLACEHOLDER = "__CITY_NEW__"
  const legacyPlaceholderPrefix = `city:${input.category}:${CREATE_SLUG_PLACEHOLDER}.`
  for (const [rawKey, value] of Array.from(formData.entries())) {
    if (typeof rawKey !== "string" || typeof value !== "string") continue
    if (!rawKey.startsWith(legacyPlaceholderPrefix)) continue
    const suffix = rawKey.slice(legacyPlaceholderPrefix.length)
    formData.delete(rawKey)
    formData.append(`${pageKey}.${suffix}`, value)
  }
  const settingsPatch = { ...(id ? {} : { [`${pageKey}.visible`]: "0", [`${pageKey}.section.callus`]: "0" }), ...Object.fromEntries(Object.entries(checked.data).map(([key, value]) => [`${pageKey}.${key}`, value])), [`${pageKey}.citiesTitle`]: String(formData.get("citiesTitle") || "").trim() }
  const namespacedFaqsCreate: NamespacedFaq[] = parseNamespacedFaqsFromAggregate(formData)
  let newId: number
  try { newId = await saveCityAggregate(input, { id: id || undefined, oldPageKey: existing ? `city:${existing.category}:${existing.slug}` : undefined, settings: settingsPatch, faqs: parseFaqGroups(formData), faqsByStorage: namespacedFaqsCreate }) }
  catch (err) { return { error: mapDbError(err, id ? "Не удалось сохранить город целиком" : "Не удалось создать город целиком") } }
  await writeAudit({ admin, action: id ? "city_update" : "city_create", entityType: "city", entityId: newId, summary: `${id ? "Обновлён" : "Создан"} город «${input.name}»`, after: { id: newId, slug: input.slug, name: input.name, category: input.category } })
  revalidatePath("/admin/cities")
  if (!id) redirect(`/admin/cities/${newId}`)
  const countryRow = await getCountryById(input.countryId)
  revalidateCatalogDestination({ category: input.category, countrySlug: countryRow?.slug, citySlug: input.slug })
  redirect("/admin/cities")
}

/** Atomic edit action used by PageSettingsForm: validates every tab before one transaction. */
export async function saveCityPageAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const existing = id ? await getCityById(id) : undefined
  if (!existing) return { error: "Город не найден" }
  const input = cityFromForm(formData)
  input.category = existing.category
  const validated = citySaveSchema.safeParse(input)
  if (!validated.success) return { error: zodFirstError(validated.error) }
  const checked = destinationPageSettingsSchema.safeParse({
    metaTitle: formData.get(`${`city:${existing.category}:${existing.slug}`}.metaTitle`),
    metaDescription: formData.get(`${`city:${existing.category}:${existing.slug}`}.metaDescription`),
    metaShortDesc: formData.get(`${`city:${existing.category}:${existing.slug}`}.metaShortDesc`),
    metaImage: formData.get(`${`city:${existing.category}:${existing.slug}`}.metaImage`),
    h1: formData.get(`${`city:${existing.category}:${existing.slug}`}.h1`),
    intro: formData.get(`${`city:${existing.category}:${existing.slug}`}.intro`),
  })
  if (!checked.success) {
    const issue = checked.error.issues[0]
    const field = String(issue?.path[0] ?? "")
    const labels: Record<string, string> = { intro: "Описание страницы", h1: "Заголовок H1", metaTitle: "Title (SEO)", metaDescription: "Описание для поиска", metaShortDesc: "Превью-описание", metaImage: "Превью-изображение" }
    const pageKey = `city:${existing.category}:${existing.slug}`
    const fullField = `${pageKey}.${field}`
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
  const linkedCountry = await ensureCountry(input.country, input.category)
  input.countryId = linkedCountry.id
  input.country = linkedCountry.name
  const slugError = await resolveSlugConflict(input, id)
  if (slugError) {
    const tabHash = "#settings-base" as const
    return {
      error: slugError,
      fieldErrors: { slug: slugError },
      firstError: {
        field: "slug",
        message: slugError,
        focusId: `sf-slug`,
        tabHash,
      },
    }
  }
  const oldPageKey = `city:${existing.category}:${existing.slug}`
  const newPageKey = `city:${existing.category}:${input.slug}`
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
    if (typeof value !== "string" || key.startsWith("__") || ["id", "name", "slug", "category", "country", "countryId"].includes(key)) continue
    settingsPatch[key.startsWith(`${oldPageKey}.`) ? `${newPageKey}.${key.slice(oldPageKey.length + 1)}` : key] = value
  }
  const namespacedFaqs: NamespacedFaq[] = parseNamespacedFaqsFromAggregate(formData)
  try {
    await saveCityAggregate(input, { id, oldPageKey, settings: settingsPatch, faqs: parseFaqGroups(formData), faqsByStorage: namespacedFaqs })
  } catch (error) {
    return { error: mapDbError(error, "Не удалось сохранить город целиком") }
  }
  await writeAudit({ admin, action: "city_update", entityType: "city", entityId: id, summary: `Обновлён город «${input.name}»`, before: { slug: existing.slug, name: existing.name }, after: { slug: input.slug, name: input.name, countryId: input.countryId } })
  revalidatePath(`/admin/cities/${id}`)
  revalidateCatalogDestination({ category: input.category, citySlug: input.slug })
  return { ok: true }
}
export async function moveCityAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  await withAdminAction(
    { errorMessage: "Не удалось переместить город", revalidate: ["/admin/cities", ["/", "layout"]] },
    async () => {
      if (id) await moveCity(id, direction)
      const city = id ? await getCityById(id) : undefined
      if (city) revalidateCatalogDestination({ category: city.category })
      return {
        audit: {
          action: "city_move",
          entityType: "city",
          entityId: id,
          summary: city ? `Перемещён город «${city.name}» (${direction})` : `Перемещён город #${id} (${direction})`,
          after: { direction, category: city?.category },
        },
      }
    },
  )
}

export async function reorderCitiesAction(formData: FormData) {
  const orderedIds = parseOrderedIds(formData)
  if (orderedIds.length < 2) return
  await withAdminAction(
    { errorMessage: "Не удалось изменить порядок городов", revalidate: ["/admin/cities", ["/", "layout"]] },
    async () => {
      await reorderCities(orderedIds)
      const firstCity = await getCityById(orderedIds[0])
      if (firstCity) revalidateCatalogDestination({ category: firstCity.category })
      return {
        audit: {
          action: "city_reorder",
          entityType: "city",
          entityId: orderedIds[0],
          summary: "Обновлён порядок городов перетаскиванием",
          after: { orderedIds, category: firstCity?.category },
        },
      }
    },
  )
}

export async function deleteCityAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (!id) redirect("/admin/cities")
  const city = await getCityById(id)
  const category = city?.category ?? "bus"
  try {
    await deleteCity(id)
    await writeAudit({
      admin,
      action: "city_archive",
      entityType: "city",
      entityId: id,
      summary: city ? `В архив: город «${city.name}»` : `В архив город #${id}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === CITY_ARCHIVE_BLOCKED_BY_TOURS) {
      redirect(`/admin/cities?category=${category}&error=${encodeURIComponent(msg)}`)
    }
    throw err
  }
  revalidatePath("/admin/cities")
  revalidatePath("/admin/archive")
  revalidateCatalogDestination({ category })
  redirect(`/admin/cities?category=${category}&notice=archived`)
}

export async function restoreCityAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  await withAdminAction(
    { errorMessage: "Не удалось восстановить город", revalidate: ["/admin/cities", "/admin/archive"] },
    async () => {
      if (id) await restoreCity(id)
      return {
        audit: { action: "city_restore", entityType: "city", entityId: id, summary: `Восстановлен город #${id}` },
      }
    },
  )
  redirect("/admin/archive?notice=restored")
}

export async function purgeCityAction(formData: FormData) {
  const id = Number(formData.get("id") || 0)
  const outcome = await withAdminAction(
    {
      capability: "purge",
      errorMessage: "Не удалось удалить",
      revalidate: ["/admin/cities", "/admin/archive"],
    },
    async () => {
      if (id) await purgeCity(id)
      return {
        audit: { action: "city_purge", entityType: "city", entityId: id, summary: `Удалён город #${id}` },
      }
    },
  )
  if ("error" in outcome) redirect(`/admin/archive?error=${encodeURIComponent(outcome.error)}`)
  redirect("/admin/archive?notice=purged")
}

/**
 * Saves only the base fields (name, slug, category, country, countryId) without redirecting.
 * Used by CityBaseForm on the edit page alongside PageSettingsForm.
 */
export async function saveCityBaseAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  if (!id) return { error: "ID не указан" }
  const name = String(formData.get("name") || "").trim()
  const slug = String(formData.get("slug") || "").trim()
  const baseCheck = citySaveSchema.safeParse({
    slug,
    name,
    category: "bus",
    country: String(formData.get("country") || "").trim() || "x",
  })
  if (!baseCheck.success) return { error: zodFirstError(baseCheck.error) }

  const countryName = String(formData.get("country") || "").trim()
  if (!countryName) {
    return { error: "Укажите страну — по ней город группируется в сайдбаре" }
  }
  const existing = await getCityById(id)
  if (!existing) return { error: "Город не найден" }
  let countryId = Number(formData.get("countryId") || 0)
  let resolvedCountry = countryName
  if (countryName) {
    const countryObj = await ensureCountry(countryName, existing.category)
    countryId = countryObj.id
    resolvedCountry = countryObj.name
  }

  const baseInput: CityInput = {
    slug,
    name,
    // Category is fixed after creation — URLs and settings are scoped by it.
    category: existing.category,
    country: resolvedCountry,
    countryId,
    intro: existing.intro ?? "",
    sections: existing.sections ?? [],
    seoHtml: existing.seoHtml ?? "",
  }
  const slugError = await resolveSlugConflict(baseInput, id)
  if (slugError) return { error: slugError }

  try {
    if (existing.slug !== slug) {
      await rekeyPageScopedContent(
        `city:${existing.category}:${existing.slug}`,
        `city:${existing.category}:${slug}`,
      )
    }
    await updateCity(id, baseInput)
    await writeAudit({
      admin,
      action: "city_update",
      entityType: "city",
      entityId: id,
      summary: `Обновлён город «${name}» (база)`,
      before: { slug: existing.slug, name: existing.name },
      after: { slug, name, countryId },
    })
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить город") }
  }
  revalidatePath("/admin/cities")
  revalidatePath(`/admin/cities/${id}`)
  const country = countryId > 0 ? await getCountryById(countryId) : undefined
  revalidateCatalogDestination({
    category: baseInput.category,
    countrySlug: country?.slug,
    citySlug: baseInput.slug,
  })
  return { ok: true }
}
