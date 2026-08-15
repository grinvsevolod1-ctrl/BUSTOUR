"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { clientIpFromHeaders, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit"
import { login, logout, requireAdmin, requireCapability } from "@/lib/auth"
import { writeAudit, auditTourSnapshot } from "@/lib/admin-audit"
import { safeInternalNext } from "@/lib/safe-next"
import { isRedirectError, mutateThenRedirect } from "@/lib/admin-redirect"
import { reviewInputSchema } from "@/lib/review-schema"
import { sanitizeReviewShowOn } from "@/lib/review-admin"
import {
  createTour,
  updateTour,
  deleteTour,
  restoreTour,
  purgeTour,
  moveTour,
  reorderTours,
  createReview,
  updateReview,
  deleteReview,
  restoreReview,
  purgeReview,
  approveReview,
  setReviewShowOn,
  getReviewById,
  createArticle,
  updateArticleBase,
  deleteArticle,
  restoreArticle,
  purgeArticle,
  updateLeadStatus,
  deleteLead,
  restoreLead,
  purgeLead,
  type TourInput,
  type ReviewInput,
  type ArticleInput,
  saveTourDatesTable,
  getTourById,
  findTourIdBySlug,
  getArticleById,
  findArticleIdBySlug,
  createBus,
  updateBus,
  moveBus,
  moveTransfer,
  deleteBus,
  restoreBus,
  purgeBus,
  getBusById,
  getBus,
  type BusInput,
  createTransfer,
  updateTransfer,
  deleteTransfer,
  restoreTransfer,
  purgeTransfer,
  getTransferById,
  getTransfer,
  replaceTransferSchedules,
  normalizeTransferScheduleRows,
  type TransferInput,
} from "@/lib/queries"
import { getCountries } from "@/lib/countries"
import { getCityDestinations } from "@/lib/cities"
import { resolveBusTourDestinationIds } from "@/lib/tour-destinations"
import { getCurrencies } from "@/lib/currencies-server"
import { getBaseCurrency, formatMoney } from "@/lib/currencies"
import { isArticleCategory } from "@/lib/types"
import { parseAlertKind } from "@/lib/alert-kind"
import { coerceMediaNodeList, type MediaNode } from "@/lib/media/node"
import { replacePageFaqs, saveSettings } from "@/lib/cms"
import { parseFaqGroups } from "@/lib/faq-form"
import { rekeyPageScopedContent } from "@/lib/page-rekey"
import { slugify } from "@/lib/slug"
import type { Lead, IncludedGroup, DatesTable } from "@/lib/types"
import { mapDbError } from "@/lib/db-errors"
import { db } from "@/lib/db"
import {
  tourSaveSchema,
  busSaveSchema,
  articleSaveSchema,
  staffSaveSchema,
  transferSaveSchema,
  transferSchedulesSaveSchema,
  zodFirstError,
} from "@/lib/validations/admin"

/* ---------------- Auth ---------------- */

const LOGIN_RATE_WINDOW = 15 * 60_000 // 15 minutes
const LOGIN_RATE_MAX = 10 // attempts per IP in window

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim()
  const password = String(formData.get("password") || "")
  if (!username || !password) {
    return { error: "Введите логин и пароль" }
  }

  // Brute-force protection: limit attempts per IP; counter resets on success.
  const ip = clientIpFromHeaders(await headers())
  const rate = consumeRateLimit("login", ip, LOGIN_RATE_MAX, LOGIN_RATE_WINDOW)
  if (!rate.ok) {
    return { error: `Слишком много попыток входа. Повторите через ${Math.ceil(rate.retryAfterSec / 60)} мин.` }
  }

  try {
    const ok = await login(username, password)
    if (!ok) {
      return { error: "Неверный логин или пароль" }
    }
    resetRateLimit("login", ip)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("AUTH_SECRET")) {
      return { error: "Сервер не настроен (AUTH_SECRET). Обратитесь к администратору." }
    }
    throw err
  }
  redirect(safeInternalNext(String(formData.get("next") || "")) || "/admin")
}

export async function logoutAction() {
  await logout()
  redirect("/admin/login")
}

/* ---------------- Helpers ---------------- */

function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T): T {
  try {
    const parsed = JSON.parse(String(value || ""))
    return (parsed ?? fallback) as T
  } catch {
    return fallback
  }
}

function parseGallery(value: FormDataEntryValue | null): MediaNode[] {
  return coerceMediaNodeList(parseJsonField<unknown[]>(value, []))
}

function parseDocuments(value: FormDataEntryValue | null): TourInput["documents"] {
  const raw = parseJsonField<Record<string, unknown>[]>(value, [])
  if (!Array.isArray(raw)) return []
  return raw
    .map((d) => ({
      title: String(d?.title ?? "").trim(),
      href: String(d?.href ?? "").trim(),
      size: String(d?.size ?? "").trim(),
    }))
    .filter((d) => d.title || d.href)
}

const layoutKeys = new Set(["dates", "callus", "program", "included", "gallery", "seo", "documents", "faq", "reviews"])

function parseLayout(value: FormDataEntryValue | null): TourInput["layout"] {
  const raw = parseJsonField<Record<string, unknown>[]>(value, [])
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => layoutKeys.has(String(s?.key)))
    .map((s) => ({
      key: String(s.key) as TourInput["layout"][number]["key"],
      label: String(s?.label ?? "").trim(),
      visible: !!s?.visible,
    }))
}

function parseWhatIncluded(value: FormDataEntryValue | null): IncludedGroup[] {
  try {
    const parsed = JSON.parse(String(value || "[]")) as IncludedGroup[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((g) => ({
        title: String(g.title || "").trim(),
        marker: g.marker || "check",
        items: (Array.isArray(g.items) ? g.items : []).map((i) => String(i).trim()).filter(Boolean),
      }))
      .filter((g) => g.title || g.items.length)
  } catch {
    return []
  }
}

async function tourFromForm(formData: FormData): Promise<TourInput | { error: string }> {
  // — Program parsing (new rich multi-block format + backward compat with legacy) —
  const dayStarts = formData.getAll("programDayStart")
  const dayEnds = formData.getAll("programDayEnd")
  const customTitles = formData.getAll("programCustomTitle")
  const texts = formData.getAll("programText")
  const legacyTitles = formData.getAll("programTitle")

  function clampDay(v: unknown): number | undefined {
    const n = typeof v === "number" ? v : Number(String(v ?? "").trim())
    if (!Number.isFinite(n) || n < 1 || n > 400) return undefined
    return Math.trunc(n)
  }

  let program: { day: string; text: string; dayStart?: number; dayEnd?: number }[]
  if (dayStarts.length || customTitles.length || (legacyTitles.length === 0 && texts.length > 0)) {
    const count = Math.max(dayStarts.length, customTitles.length, texts.length)
    program = Array.from({ length: count }, (_, i) => {
      const dayStart = clampDay(dayStarts[i])
      const dayEnd = clampDay(dayEnds[i])
      const customTitle = String(customTitles[i] ?? "").trim()
      const text = String(texts[i] ?? "").trim()

      let day = ""
      if (customTitle) {
        day = customTitle
      } else if (dayStart != null && dayEnd != null && dayStart !== dayEnd) {
        const [a, b] = dayStart < dayEnd ? [dayStart, dayEnd] : [dayEnd, dayStart]
        day = `Дни ${a}–${b}`
      } else if (dayStart != null) {
        day = `День ${dayStart}`
      } else {
        day = `Блок ${i + 1}`
      }
      return { day, text, dayStart, dayEnd }
    }).filter((p) => p.text || p.day.startsWith("День") || p.day.startsWith("Дни") || p.day.startsWith("Блок"))
  } else {
    // Legacy fallback — old programTitle / programText arrays
    const programTextsLegacy = formData.getAll("programText").map((v) => String(v))
    program = legacyTitles
      .map((title, i) => ({
        day: String(title).trim() || `День ${i + 1}`,
        text: (programTextsLegacy[i] || "").trim(),
      }))
      .filter((p) => p.text || p.day)
  }

  const whatIncluded = parseWhatIncluded(formData.get("whatIncluded"))
  // Keep the flat included/excluded arrays in sync for backward compatibility.
  const included = whatIncluded[0]?.items ?? []
  const excluded = whatIncluded[1]?.items ?? []

  // Resolve country and arrival city against existing bus destinations only.
  const countryId = String(formData.get("countryId") || "").trim()
  const arrivalCityId = String(formData.get("arrivalCityId") || "").trim()
  const [busCountries, busCities] = await Promise.all([getCountries("bus"), getCityDestinations("bus")])
  const destination = resolveBusTourDestinationIds(countryId, arrivalCityId, busCountries, busCities)
  if (destination.error) return { error: destination.error }
  const country = busCountries.find((candidate) => candidate.id === destination.countryId)
  const city = busCities.find((candidate) => candidate.id === destination.arrivalCityId)
  if (!country || !city) return { error: "Выберите существующие автобусные страну и город." }

  // Price is entered in the chosen dates/base currency; validate both currencies against the admin list.
  const priceAmount = Number(formData.get("priceAmount") || 0) || 0
  const extraPriceAmount = Number(formData.get("extraPriceAmount") || 0) || 0
  const extraPriceCurrencyRaw = String(formData.get("extraPriceCurrency") || "").trim().toUpperCase()
  const datesCurrencyRaw = String(formData.get("datesCurrency") || "").trim().toUpperCase()
  const currencies = await getCurrencies()
  const base = getBaseCurrency(currencies)
  // Whitelist validation: only allow currency codes defined in admin currencies table (fallback to base).
  const datesCurrency = currencies.some((c) => c.code.toUpperCase() === datesCurrencyRaw)
    ? datesCurrencyRaw
    : (base?.code || "BYN")
  const extraPriceCurrency = currencies.some((c) => c.code.toUpperCase() === extraPriceCurrencyRaw)
    ? extraPriceCurrencyRaw
    : currencies.some((c) => c.code === "USD") ? "USD" : (base?.code || "BYN")
  const price = formatMoney(priceAmount, datesCurrency)

  return {
    slug: String(formData.get("slug") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    price,
    priceAmount,
    extraPriceAmount,
    extraPriceCurrency,
    datesCurrency,
    image: String(formData.get("image") || "").trim(),
    tourType: String(formData.get("tourType") || "").trim(),
    duration: String(formData.get("duration") || "").trim(),
    departure: String(formData.get("departure") || "").trim(),
    country: country.name,
    countryId: country.id,
    arrivalCityId: city.id,
    nights: Number(formData.get("nights") || 0),
    featured: formData.get("featured") === "on",
    program,
    included,
    excluded,
    whatIncluded,
    seoHtml: String(formData.get("seoHtml") || "").trim(),
    seoTitle: String(formData.get("seoTitle") || "").trim(),
    alertText: String(formData.get("alertText") || "").trim(),
    alertType: parseAlertKind(String(formData.get("alertType") || "")),
    gallery: parseGallery(formData.get("gallery")),
    documents: parseDocuments(formData.get("documents")),
    layout: parseLayout(formData.get("layout")),
  }
}

/* ---------------- Tours ---------------- */

type TourActionState = { error?: string; success?: boolean }

export async function saveTourAction(_prev: unknown, formData: FormData): Promise<TourActionState> {
  const admin = await requireAdmin()
  const parsed = await tourFromForm(formData)
  if ("error" in parsed) return parsed
  const input = parsed
  const validated = tourSaveSchema.safeParse({
    slug: input.slug,
    title: input.title,
    description: input.description,
    priceAmount: input.priceAmount,
    image: input.image,
    seoTitle: input.seoTitle,
    seoHtml: input.seoHtml,
  })
  if (!validated.success) return { error: zodFirstError(validated.error) }
  if (!String(formData.get("priceAmount") ?? "").trim()) return { error: "Заполните цену" }
  const id = Number(formData.get("id") || 0)
  const slugOwner = await findTourIdBySlug(input.slug)
  if (slugOwner && slugOwner !== id) {
    return { error: `Тур со slug «${input.slug}» уже существует — укажите другой slug` }
  }
  const before = id ? await getTourById(id) : null
  let newId = 0
  try {
    if (id) {
      if (before && before.slug !== input.slug) {
        await rekeyPageScopedContent(`tour:${before.slug}`, `tour:${input.slug}`)
      }
      await updateTour(id, input)
    } else {
      newId = await createTour(input)
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить тур") }
  }
  const savedTourId = id || newId
  await writeAudit({
    admin,
    action: id ? "tour_update" : "tour_create",
    entityType: "tour",
    entityId: savedTourId,
    summary: id ? `Обновлён тур «${input.title}»` : `Создан тур «${input.title}»`,
    before: before ? auditTourSnapshot(before) : undefined,
    after: auditTourSnapshot({ id: savedTourId, ...input }),
  })
  await saveSettings({
    [`tour:${savedTourId}.metaTitle`]: String(formData.get("metaTitle") || "").trim(),
    [`tour:${savedTourId}.metaDescription`]: String(formData.get("metaDescription") || "").trim(),
    [`tour:${savedTourId}.metaShortDesc`]: String(formData.get("metaShortDesc") || "").trim(),
    [`tour:${savedTourId}.metaImage`]: String(formData.get("metaImage") || "").trim(),
    [`tour:${savedTourId}.metaImageAlt`]: String(formData.get("metaImageAlt") || "").trim(),
  })
  await replacePageFaqs(`tour:${input.slug}`, parseFaqGroups(formData))
  revalidatePath("/admin/tours")
  revalidatePath(`/admin/tours/${savedTourId}`)
  revalidatePath("/")
  revalidatePath("/avtobusnye-tury/")
  revalidatePath("/aviatory/")
  revalidatePath("/hot/")
  if (id) return { success: true }
  redirect(`/admin/tours/${newId}?notice=${encodeURIComponent("Тур создан")}`)
}

export async function saveTourDatesTableAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const tourId = Number(formData.get("tourId") || 0)
  if (!tourId) return { error: "Не указан тур" }
  let table: DatesTable
  try {
    table = JSON.parse(String(formData.get("table") || "{}")) as DatesTable
  } catch {
    return { error: "Не удалось прочитать данные дат" }
  }
  const tour = await getTourById(tourId)
  if (!tour) return { error: "Автобусный тур не найден" }
  try {
    await saveTourDatesTable(tourId, table)
    await writeAudit({
      admin,
      action: "tour_dates_update",
      entityType: "tour",
      entityId: tourId,
      summary: tour.title ? `Обновлены даты тура «${tour.title}»` : `Обновлены даты тура #${tourId}`,
    })
    revalidatePath("/admin/tour-pricing")
    revalidatePath(`/admin/tour-pricing/${tourId}`)
    revalidatePath("/avtobusnye-tury")
    if (tour.countrySlug && tour.citySlug) revalidatePath(`/avtobusnye-tury/${tour.countrySlug}/${tour.citySlug}/${tour.slug}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : ""
    return { error: message || "Не удалось сохранить даты и цены" }
  }
}

export async function deleteTourAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const before = id ? await getTourById(id) : null
  return mutateThenRedirect(
    async () => {
      if (id) await deleteTour(id)
      await writeAudit({
        admin,
        action: "tour_archive",
        entityType: "tour",
        entityId: id,
        summary: before ? `В архив: «${before.title}»` : `В архив тур #${id}`,
        before: before ? auditTourSnapshot(before) : undefined,
      })
      revalidatePath("/admin/tours")
      revalidatePath("/admin/archive")
      revalidatePath("/")
    },
    "/admin/tours?notice=archived",
    "/admin/tours",
  )
}

export async function moveTourAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  if (id) await moveTour(id, direction)
  const tour = id ? await getTourById(id) : undefined
  await writeAudit({
    admin,
    action: "tour_move",
    entityType: "tour",
    entityId: id,
    summary: tour
      ? `Перемещён тур «${tour.title}» (${direction})`
      : `Перемещён тур #${id} (${direction})`,
    after: { direction, country: tour?.country },
  })
  revalidatePath("/admin/tours")
  revalidatePath("/", "layout")
}

export async function reorderToursAction(formData: FormData) {
  const admin = await requireAdmin()
  let orderedIds: number[] = []
  try {
    const parsed = JSON.parse(String(formData.get("orderedIds") || "[]"))
    orderedIds = Array.isArray(parsed)
      ? parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : []
  } catch {
    orderedIds = []
  }
  if (orderedIds.length < 2) return
  await reorderTours(orderedIds)
  const first = await getTourById(orderedIds[0])
  await writeAudit({
    admin,
    action: "tour_reorder",
    entityType: "tour",
    entityId: orderedIds[0],
    summary: "Обновлён порядок туров перетаскиванием",
    after: { orderedIds, country: first?.country },
  })
  revalidatePath("/admin/tours")
  revalidatePath("/", "layout")
}

export async function restoreTourAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const before = id ? await getTourById(id) : null
  return mutateThenRedirect(
    async () => {
      if (id) await restoreTour(id)
      const after = id ? await getTourById(id) : null
      await writeAudit({
        admin,
        action: "tour_restore",
        entityType: "tour",
        entityId: id,
        summary: before ? `Восстановлен: «${before.title}»` : `Восстановлен тур #${id}`,
        before: before ? auditTourSnapshot(before) : undefined,
        after: after ? auditTourSnapshot(after) : undefined,
      })
      revalidatePath("/admin/tours")
      revalidatePath("/admin/archive")
      revalidatePath("/")
      if (after?.countrySlug && after.citySlug && after.slug) {
        revalidatePath(`/avtobusnye-tury/${after.countrySlug}/${after.citySlug}/${after.slug}`)
      }
    },
    // Land on active list so restored row is visible immediately (and page is dynamic via searchParams).
    "/admin/tours?notice=restored",
    "/admin/archive",
  )
}

export async function purgeTourAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  const before = id ? await getTourById(id) : null
  return mutateThenRedirect(
    async () => {
      if (id) await purgeTour(id)
      await writeAudit({
        admin,
        action: "tour_purge",
        entityType: "tour",
        entityId: id,
        summary: before ? `Удалён тур «${before.title}»` : `Удалён тур #${id}`,
        before: before ? auditTourSnapshot(before) : undefined,
      })
      revalidatePath("/admin/tours")
      revalidatePath("/admin/archive")
      revalidatePath("/")
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}

/* ---------------- Buses ---------------- */

function busFromForm(formData: FormData): BusInput {
  return {
    slug: String(formData.get("slug") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    image: String(formData.get("image") || "").trim(),
    gallery: parseGallery(formData.get("gallery")),
    year: String(formData.get("year") || "").trim(),
    seats: String(formData.get("seats") || "").trim(),
    busClass: String(formData.get("busClass") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    documents: parseDocuments(formData.get("documents")),
    seating: parseDocuments(formData.get("seating")),
  }
}

export async function saveBusAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const input = busFromForm(formData)
  const validated = busSaveSchema.safeParse(input)
  if (!validated.success) return { error: zodFirstError(validated.error) }

  const id = Number(formData.get("id") || 0)
  const existing = id ? await getBusById(id) : undefined
  if (id && !existing) return { error: "Автобус не найден" }

  const conflict = await getBus(input.slug)
  if (conflict && conflict.id !== id) {
    return { error: `Автобус со slug «${input.slug}» уже существует — укажите другой slug` }
  }
  let newId = 0
  try {
    if (id) {
      await db.transaction(async (tx) => {
        if (existing && existing.slug !== input.slug) {
          await rekeyPageScopedContent(`bus:${existing.slug}`, `bus:${input.slug}`, tx)
        }
        await updateBus(id, input, tx)
      })
      await writeAudit({
        admin,
        action: "bus_update",
        entityType: "bus",
        entityId: id,
        summary: `Обновлён автобус «${input.title}»`,
        after: { id, ...input },
      })
    } else {
      newId = await db.transaction(async (tx) => {
        const created = await createBus(input, tx)
        await saveSettings(
          {
            [`bus:${input.slug}.visible`]: "0",
            [`bus:${input.slug}.section.callus`]: "0",
          },
          tx,
        )
        return created
      })
      await writeAudit({
        admin,
        action: "bus_create",
        entityType: "bus",
        entityId: newId,
        summary: `Создан автобус «${input.title}»`,
        after: { id: newId, ...input },
      })
    }
  } catch (err) {
    if (isRedirectError(err)) throw err
    return { error: mapDbError(err, "Не удалось сохранить автобус") }
  }

  revalidatePath("/admin/buses")
  revalidatePath("/bus-rental")
  revalidatePath(`/bus-rental/${input.slug}`)
  if (existing && existing.slug !== input.slug) {
    revalidatePath(`/bus-rental/${existing.slug}`)
  }
  // redirect() throws — must stay outside try/catch (same as tours / #55 reviews)
  if (!id) redirect(`/admin/buses/${newId}`)
  return { success: true }
}

export async function moveBusAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  if (id) await moveBus(id, direction)
  const bus = id ? await getBusById(id) : undefined
  await writeAudit({
    admin,
    action: "bus_move",
    entityType: "bus",
    entityId: id,
    summary: bus
      ? `Перемещён автобус «${bus.title}» (${direction})`
      : `Перемещён автобус #${id} (${direction})`,
    after: { direction },
  })
  revalidatePath("/admin/buses")
  revalidatePath("/bus-rental")
}

export async function moveTransferAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") === "down" ? "down" : "up"
  if (id) await moveTransfer(id, direction)
  const transfer = id ? await getTransferById(id) : undefined
  await writeAudit({
    admin,
    action: "transfer_move",
    entityType: "transfer",
    entityId: id,
    summary: transfer
      ? `Перемещён трансфер «${transfer.title}» (${direction})`
      : `Перемещён трансфер #${id} (${direction})`,
    after: { direction },
  })
  revalidatePath("/admin/transfers")
  revalidatePath("/info/transfers")
}

export async function deleteBusAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (!id) return
      const before = await getBusById(id)
      await deleteBus(id)
      await writeAudit({
        admin,
        action: "bus_archive",
        entityType: "bus",
        entityId: id,
        summary: before ? `В архив: автобус «${before.title}»` : `В архив автобус #${id}`,
      })
      revalidatePath("/admin/buses")
      revalidatePath("/admin/archive")
      revalidatePath("/bus-rental")
    },
    "/admin/buses?notice=archived",
    "/admin/buses",
  )
}

export async function restoreBusAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await restoreBus(id)
      await writeAudit({
        admin,
        action: "bus_restore",
        entityType: "bus",
        entityId: id,
        summary: `Восстановлен автобус #${id}`,
      })
      revalidatePath("/admin/buses")
      revalidatePath("/admin/archive")
      revalidatePath("/bus-rental")
    },
    "/admin/archive?notice=restored",
    "/admin/archive",
  )
}

export async function purgeBusAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await purgeBus(id)
      await writeAudit({
        admin,
        action: "bus_purge",
        entityType: "bus",
        entityId: id,
        summary: `Удалён автобус #${id}`,
      })
      revalidatePath("/admin/buses")
      revalidatePath("/admin/archive")
      revalidatePath("/bus-rental")
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}

function transferFromForm(formData: FormData) {
  const category = String(formData.get("category") || "")
  return {
    slug: String(formData.get("slug") || "").trim(),
    category: category === "individual" ? "individual" : "airport",
    title: String(formData.get("title") || "").trim(),
    intro: String(formData.get("intro") || ""),
    priceRoundTrip: Number(formData.get("priceRoundTrip") || 0),
    priceOneWay: Number(formData.get("priceOneWay") || 0),
    image: String(formData.get("image") || "").trim(),
  }
}

export async function saveTransferAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const validated = transferSaveSchema.safeParse(transferFromForm(formData))
  if (!validated.success) return { error: zodFirstError(validated.error) }
  const input: TransferInput = validated.data
  const id = Number(formData.get("id") || 0)
  try {
    const existing = id ? await getTransferById(id) : undefined
    if (id && !existing) return { error: "Трансфер не найден" }
    const conflict = await getTransfer(input.slug, input.category)
    if (conflict && conflict.id !== id) {
      return { error: `Трансфер со slug «${input.slug}» уже существует в этой категории` }
    }
    if (id) {
      await db.transaction(async (tx) => {
        if (existing && existing.slug !== input.slug) {
          await rekeyPageScopedContent(`transfer:${existing.slug}`, `transfer:${input.slug}`, tx)
        }
        await updateTransfer(id, input, tx)
      })
      await writeAudit({
        admin,
        action: "transfer_update",
        entityType: "transfer",
        entityId: id,
        summary: `Обновлён трансфер «${input.title}»`,
        after: { id, ...input },
      })
    } else {
      let newId = 0
      await db.transaction(async (tx) => {
        newId = await createTransfer(input, tx)
        await saveSettings(
          {
            [`transfer:${input.slug}.visible`]: "0",
            [`transfer:${input.slug}.section.callus`]: "0",
          },
          tx,
        )
      })
      await writeAudit({
        admin,
        action: "transfer_create",
        entityType: "transfer",
        entityId: newId,
        summary: `Создан трансфер «${input.title}»`,
        after: { id: newId, ...input },
      })
      revalidatePath("/admin/transfers")
      redirect(`/admin/transfers/${newId}`)
    }
    revalidatePath("/admin/transfers")
    revalidatePath("/admin/schedules")
    revalidatePath("/info/transfers")
    revalidatePath(`/info/transfers/${input.slug}`)
    if (existing && existing.slug !== input.slug) revalidatePath(`/info/transfers/${existing.slug}`)
    return { success: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    return { error: mapDbError(err, "Не удалось сохранить трансфер") }
  }
}

export async function deleteTransferAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (!id) return
      const transfer = await getTransferById(id)
      await deleteTransfer(id)
      await writeAudit({
        admin,
        action: "transfer_archive",
        entityType: "transfer",
        entityId: id,
        summary: transfer ? `В архив: трансфер «${transfer.title}»` : `В архив трансфер #${id}`,
      })
      revalidatePath("/admin/transfers")
      revalidatePath("/admin/archive")
      revalidatePath("/admin/schedules")
      revalidatePath("/info/transfers")
      if (transfer) revalidatePath(`/info/transfers/${transfer.slug}`)
    },
    "/admin/transfers?notice=archived",
    "/admin/transfers",
  )
}

export async function restoreTransferAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await restoreTransfer(id)
      await writeAudit({
        admin,
        action: "transfer_restore",
        entityType: "transfer",
        entityId: id,
        summary: `Восстановлен трансфер #${id}`,
      })
      revalidatePath("/admin/transfers")
      revalidatePath("/admin/archive")
      revalidatePath("/admin/schedules")
      revalidatePath("/info/transfers")
    },
    "/admin/archive?notice=restored",
    "/admin/archive",
  )
}

export async function purgeTransferAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await purgeTransfer(id)
      await writeAudit({
        admin,
        action: "transfer_purge",
        entityType: "transfer",
        entityId: id,
        summary: `Удалён трансфер #${id}`,
      })
      revalidatePath("/admin/transfers")
      revalidatePath("/admin/archive")
      revalidatePath("/admin/schedules")
      revalidatePath("/info/transfers")
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}

export async function saveTransferSchedulesAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const raw = String(formData.get("rows") || "[]")
  let rows: unknown
  try {
    rows = JSON.parse(raw)
  } catch {
    return { error: "Не удалось прочитать строки расписания" }
  }
  const validated = transferSchedulesSaveSchema.safeParse({
    transferId: formData.get("transferId"),
    direction: formData.get("direction"),
    rows: Array.isArray(rows) ? rows : [],
  })
  if (!validated.success) return { error: zodFirstError(validated.error) }
  const { transferId, direction } = validated.data
  const normalized = normalizeTransferScheduleRows(validated.data.rows)
  try {
    await replaceTransferSchedules(transferId, direction, normalized)
    const transfer = await getTransferById(transferId)
    await writeAudit({
      admin,
      action: "transfer_schedules_update",
      entityType: "transfer",
      entityId: transferId,
      summary: transfer
        ? `Обновлено расписание «${transfer.title}» (${direction})`
        : `Обновлено расписание трансфера #${transferId}`,
      after: { direction, rows: normalized },
    })
    revalidatePath("/admin/schedules")
    revalidatePath(`/admin/transfers/${transferId}`)
    if (transfer) revalidatePath(`/info/transfers/${transfer.slug}`)
    revalidatePath("/info/transfers")
    return { success: true }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить расписание") }
  }
}

/* ---------------- Reviews ---------------- */

function revalidateReviewsPublic() {
  revalidatePath("/admin/reviews")
  revalidatePath("/")
  revalidatePath("/testimonials")
}

export async function saveReviewAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const videoUrl = String(formData.get("videoUrl") || "").trim()
  // Explicit toggle from the form; fall back to auto-detect for older callers.
  const submittedType = formData.get("type")
  const type = submittedType === "VIDEO" || submittedType === "TEXT" ? submittedType : videoUrl ? "VIDEO" : "TEXT"
  const raw = {
    type,
    name: String(formData.get("name") || ""),
    tour: String(formData.get("tour") || ""),
    text: String(formData.get("text") || ""),
    rating: formData.get("rating") || 5,
    videoUrl,
    thumbnailUrl: String(formData.get("thumbnailUrl") || "").trim(),
  }
  const parsed = reviewInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте заполнение полей" }
  }
  const data = parsed.data
  const input: ReviewInput = {
    type: data.type,
    name: data.name,
    tour: data.tour,
    text: data.text,
    rating: data.rating,
    videoUrl: data.type === "VIDEO" ? data.videoUrl : "",
    thumbnailUrl: data.thumbnailUrl,
  }
  const id = Number(formData.get("id") || 0)
  try {
    if (id) {
      await updateReview(id, input)
      if (!input.tour.trim()) {
        const current = await getReviewById(id)
        if (current?.showOn.includes("tour")) {
          await setReviewShowOn(id, sanitizeReviewShowOn(current.showOn, false))
        }
      }
      await writeAudit({
        admin,
        action: "review_update",
        entityType: "review",
        entityId: id,
        summary: `Обновлён отзыв «${input.name}»`,
        after: { id, ...input },
      })
    } else {
      await createReview(input)
      await writeAudit({
        admin,
        action: "review_create",
        entityType: "review",
        summary: `Создан отзыв «${input.name}»`,
        after: input,
      })
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить отзыв") }
  }
  revalidateReviewsPublic()
  // redirect() throws — must stay outside try/catch (#55)
  if (id) redirect(`/admin/reviews?notice=${encodeURIComponent("Отзыв сохранён")}#reviews-list`)
  return { success: true }
}

export async function deleteReviewAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await deleteReview(id)
      await writeAudit({
        admin,
        action: "review_archive",
        entityType: "review",
        entityId: id,
        summary: `В архив отзыв #${id}`,
      })
      revalidatePath("/admin/archive")
      revalidateReviewsPublic()
    },
    "/admin/reviews?notice=archived",
    "/admin/reviews",
  )
}

export async function restoreReviewAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await restoreReview(id)
      await writeAudit({
        admin,
        action: "review_restore",
        entityType: "review",
        entityId: id,
        summary: `Восстановлен отзыв #${id}`,
      })
      revalidatePath("/admin/archive")
      revalidateReviewsPublic()
    },
    "/admin/archive?notice=restored",
    "/admin/archive",
  )
}

export async function purgeReviewAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await purgeReview(id)
      await writeAudit({
        admin,
        action: "review_purge",
        entityType: "review",
        entityId: id,
        summary: `Удалён отзыв #${id}`,
      })
      revalidatePath("/admin/archive")
      revalidateReviewsPublic()
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}

export async function approveReviewAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const approved = formData.get("approved") === "1"
  if (id) await approveReview(id, approved)
  await writeAudit({
    admin,
    action: "review_approve",
    entityType: "review",
    entityId: id,
    summary: approved ? `Одобрен отзыв #${id}` : `Снято одобрение отзыва #${id}`,
    after: { approved },
  })
  revalidateReviewsPublic()
}

export async function setReviewShowOnAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const raw = String(formData.get("showOn") || "[]")
  let showOn: string[]
  try {
    const parsed = JSON.parse(raw)
    showOn = Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return
  }
  if (!id) return
  const review = await getReviewById(id)
  if (!review) return
  showOn = sanitizeReviewShowOn(showOn, Boolean(review.tour.trim()))
  await setReviewShowOn(id, showOn)
  await writeAudit({
    admin,
    action: "review_show_on",
    entityType: "review",
    entityId: id,
    summary: `Обновлены страницы показа отзыва #${id}`,
    after: { showOn },
  })
  revalidateReviewsPublic()
}

/* ---------------- Articles ---------------- */

export async function saveArticleAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const existingArticle = id ? await getArticleById(id) : undefined
  const title = String(formData.get("title") || "").trim()

  function truncateSlug(raw: string, maxLen = 120): string {
    const trimmed = raw.trim()
    if (trimmed.length <= maxLen) return trimmed
    const limited = trimmed.slice(0, maxLen + 1)
    const lastDash = limited.lastIndexOf("-")
    let boundary = maxLen
    if (lastDash >= 2 && lastDash < maxLen + 1) boundary = lastDash
    const next = trimmed.slice(0, boundary).replace(/-+$/, "")
    return next || trimmed.slice(0, maxLen).replace(/-+$/, "")
  }

  const rawSlug = truncateSlug(String(formData.get("slug") || "").trim() || title)
  const input: ArticleInput = {
    slug: slugify(rawSlug),
    title,
    category: (() => {
      const value = String(formData.get("category") || "")
      return isArticleCategory(value) ? value : "news"
    })(),
    excerpt: formData.has("excerpt")
      ? String(formData.get("excerpt") || "").trim()
      : existingArticle?.excerpt || "",
    image:
      String(formData.get("image") || "").trim() ||
      existingArticle?.image ||
      "/images/caucasus.png",
    date: String(formData.get("date") || "").trim(),
    content: String(formData.get("content") || "")
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean),
    contentHtml: String(formData.get("contentHtml") || ""),
    metaTitle: String(formData.get("metaTitle") || "").trim(),
    metaDescription: String(formData.get("metaDescription") || "").trim(),
    metaShortDesc: String(formData.get("metaShortDesc") || "").trim(),
    metaImage: String(formData.get("metaImage") || "").trim(),
    metaImageAlt: String(formData.get("metaImageAlt") || "").trim(),
  }
  if (!input.title) {
    return { error: "Заполните заголовок" }
  }
  const articleCheck = articleSaveSchema.safeParse({
    slug: input.slug,
    title: input.title,
    date: input.date,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    metaShortDesc: input.metaShortDesc,
    metaImage: input.metaImage,
    metaImageAlt: input.metaImageAlt,
  })
  if (!articleCheck.success) return { error: zodFirstError(articleCheck.error) }
  const slugOwner = await findArticleIdBySlug(input.slug)
  if (slugOwner && slugOwner !== id) {
    return { error: `Статья со slug «${input.slug}» уже существует — укажите другой slug` }
  }
  try {
    if (id) {
      if (existingArticle && existingArticle.slug !== input.slug) {
        await rekeyPageScopedContent(`article:${existingArticle.slug}`, `article:${input.slug}`)
      }
      await updateArticleBase(id, input)
      await writeAudit({
        admin,
        action: "article_update",
        entityType: "article",
        entityId: id,
        summary: `Обновлена статья «${input.title}»`,
        after: { id, slug: input.slug, title: input.title, category: input.category },
      })
      revalidatePath("/admin/articles")
      revalidatePath("/info")
      revalidatePath(`/info/${input.slug}`)
      if (existingArticle && existingArticle.slug !== input.slug) {
        revalidatePath(`/info/${existingArticle.slug}`)
      }
      return { success: true }
    } else {
      await createArticle(input)
      await writeAudit({
        admin,
        action: "article_create",
        entityType: "article",
        entityId: input.slug,
        summary: `Создана статья «${input.title}»`,
        after: { slug: input.slug, title: input.title, category: input.category },
      })
    }
  } catch (err) {
    return { error: mapDbError(err, "Не удалось сохранить статью") }
  }
  revalidatePath("/admin/articles")
  revalidatePath("/info")
  revalidatePath(`/info/${input.slug}`)
  redirect("/admin/articles")
}

export async function deleteArticleAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await deleteArticle(id)
      await writeAudit({
        admin,
        action: "article_archive",
        entityType: "article",
        entityId: id,
        summary: `В архив статья #${id}`,
      })
      revalidatePath("/admin/articles")
      revalidatePath("/admin/archive")
      revalidatePath("/info")
    },
    "/admin/articles?notice=archived",
    "/admin/articles",
  )
}

export async function restoreArticleAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await restoreArticle(id)
      await writeAudit({
        admin,
        action: "article_restore",
        entityType: "article",
        entityId: id,
        summary: `Восстановлена статья #${id}`,
      })
      revalidatePath("/admin/articles")
      revalidatePath("/admin/archive")
      revalidatePath("/info")
    },
    "/admin/archive?notice=restored",
    "/admin/archive",
  )
}

export async function purgeArticleAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await purgeArticle(id)
      await writeAudit({
        admin,
        action: "article_purge",
        entityType: "article",
        entityId: id,
        summary: `Удалена статья #${id}`,
      })
      revalidatePath("/admin/articles")
      revalidatePath("/admin/archive")
      revalidatePath("/info")
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}

/* ---------------- Leads ---------------- */

export async function updateLeadStatusAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const status = String(formData.get("status") || "new") as Lead["status"]
  if (id) await updateLeadStatus(id, status)
  await writeAudit({
    admin,
    action: "lead_status_update",
    entityType: "lead",
    entityId: id,
    summary: `Статус заявки #${id}: ${status}`,
    after: { status },
  })
  revalidatePath("/admin/leads")
  revalidatePath("/admin")
}

export async function deleteLeadAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await deleteLead(id)
      await writeAudit({
        admin,
        action: "lead_archive",
        entityType: "lead",
        entityId: id,
        summary: `В архив заявка #${id}`,
      })
      revalidatePath("/admin/leads")
      revalidatePath("/admin/archive")
      revalidatePath("/admin")
    },
    "/admin/leads?notice=archived",
    "/admin/leads",
  )
}

export async function restoreLeadAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await restoreLead(id)
      await writeAudit({
        admin,
        action: "lead_restore",
        entityType: "lead",
        entityId: id,
        summary: `Восстановлена заявка #${id}`,
      })
      revalidatePath("/admin/leads")
      revalidatePath("/admin/archive")
      revalidatePath("/admin")
    },
    "/admin/archive?notice=restored",
    "/admin/archive",
  )
}

export async function purgeLeadAction(formData: FormData) {
  const admin = await requireCapability("purge")
  const id = Number(formData.get("id") || 0)
  return mutateThenRedirect(
    async () => {
      if (id) await purgeLead(id)
      await writeAudit({
        admin,
        action: "lead_purge",
        entityType: "lead",
        entityId: id,
        summary: `Удалена заявка #${id}`,
      })
      revalidatePath("/admin/leads")
      revalidatePath("/admin/archive")
      revalidatePath("/admin")
    },
    "/admin/archive?notice=purged",
    "/admin/archive",
  )
}
