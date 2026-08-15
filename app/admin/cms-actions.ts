"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin, requireCapability } from "@/lib/auth"
import {
  writeAudit,
  pickSettingsSubset,
  changedSettings,
  settingsAuditEntity,
} from "@/lib/admin-audit"
import {
  getSettings,
  saveSettings,
  createBlock,
  updateBlock,
  deleteBlock,
  setBlockVisibility,
  moveBlock,
  reorderBlocks,
  replacePageFaqs,
  type BlockInput,
} from "@/lib/cms"
import { parseFaqGroups, parseNamespacedFaqsFromAggregate, type NamespacedFaq } from "@/lib/faq-form"
import { getCollection } from "@/lib/admin-config"
import { isUsablePublicCmsText } from "@/lib/cms-public-text"
import type { BlockCollection } from "@/lib/types"
import {
  MEMOS_PAGE_CMS_KEY,
  MEMOS_TABS_ORDER_KEY,
  isMemoSectionKey,
  listMemoSlotsFromOrder,
  moveMemoInOrder,
  nextMemoSlotKey,
  resolveMemosTabsOrder,
  shortKeyFromMemoSlotId,
} from "@/lib/memos-page-cms"
import {
  DICTIONARY_PAGE_CMS_KEY,
  DICTIONARY_TABS_ORDER_KEY,
  isDictionarySectionKey,
  listDictionarySlotsFromOrder,
  moveDictionaryInOrder,
  nextDictionarySlotKey,
  resolveDictionaryTabsOrder,
  shortKeyFromDictionarySlotId,
} from "@/lib/dictionary-page-cms"

// Revalidate all public surfaces that depend on CMS content.
function revalidateSite() {
  revalidatePath("/", "layout")
  revalidatePath("/")
  revalidatePath("/contacts")
  revalidatePath("/testimonials")
}

function revalidateCollectionAdmin(collection: string) {
  revalidatePath(`/admin/content/${collection}`)
  const listPath = getCollection(collection)?.listPath
  if (listPath) revalidatePath(listPath)
}

function parseOrderedIds(formData: FormData): number[] {
  try {
    const parsed = JSON.parse(String(formData.get("orderedIds") || "[]"))
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

/* ---------------- Settings ---------------- */

function settingsValidationError(formData: FormData): { error: string; fieldErrors: Record<string, string> } | null {
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || !/\.intro$/.test(key) || !value.trim()) continue
    if (!/^(country|city|bus|transfer|article|staff|license):/.test(key) && !["aviatory.intro", "bustours.intro", "hot.intro", "staff.intro", "licenses.intro", "dictionary.intro", "memos.intro"].includes(key)) continue
    if (isUsablePublicCmsText(value, { minLength: 12 })) continue
    const message = "Описание страницы должно содержать минимум 12 значимых символов"
    return { error: `Проверьте поле «Описание страницы»: ${message}`, fieldErrors: { [key]: message } }
  }
  return null
}

export async function validateSettingsAction(formData: FormData) {
  await requireAdmin()
  return settingsValidationError(formData) ?? { ok: true as const }
}

export async function saveSettingsAction(_prev: unknown, formData: FormData) {
  // Site-wide settings page only (managers may still save page-scoped settings elsewhere).
  const admin =
    String(formData.get("__siteSettings") || "") === "1"
      ? await requireCapability("manage_settings")
      : await requireAdmin()
  const validationError = settingsValidationError(formData)
  if (validationError) return validationError
  const entries: Record<string, string> = {}
  const rawSectionOrder = formData.get("__sectionOrder")
  const rawPageKey = String(formData.get("__pageKey") || "").trim()
  if (typeof rawSectionOrder === "string" && rawSectionOrder && rawPageKey) {
    entries[`${rawPageKey}.sections.order`] = rawSectionOrder
  }
  const rawSectionVisibility = formData.get("__sectionVisibility")
  if (typeof rawSectionVisibility === "string" && rawSectionVisibility) {
    try {
      const parsed = JSON.parse(rawSectionVisibility) as Record<string, boolean>
      for (const [key, on] of Object.entries(parsed)) {
        entries[key] = on ? "1" : "0"
      }
    } catch {
      // ignore malformed visibility JSON
    }
  }
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("__")) continue
    if (key === "media-upload") continue
    if (typeof value !== "string") continue
    entries[key] = value
  }
  // Checkboxes only submit when checked — normalise known toggles to "1"/"0".
  const __togglesFromForm = String(formData.get("__toggles") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  // Fallback toggles: any current setting key that looks like a visibility toggle
  // (*.visible, *.section.*, *.callus, *.faq) is added to toggleKeys so an
  // unchecked checkbox still lands in entries as "0". Fixes the "user unchecked
  // visibility but save silently left old '1' in DB" bug.
  const currentBefore = await getSettings()
  const toggleKeysFromCurrent = Object.keys(currentBefore).filter((k) =>
    /(^section\.)|(\.visible$)|(\.section\.[^.]+$)|(\.callus$)|(\.faq$)/.test(k),
  )
  const toggleKeys = Array.from(new Set([...__togglesFromForm, ...toggleKeysFromCurrent]))
  for (const key of toggleKeys) {
    entries[key] = formData.get(key) ? "1" : "0"
  }
  // Unchanged RichEditor / hidden-tab fields can submit "". Keep an intentional
  // clear only when the editor reports a user change.
  for (const key of Object.keys(entries)) {
    if (!/\.(seoHtml\d*|intro)$/.test(key)) continue
    if (entries[key]!.trim()) continue
    if (formData.get(`__rich_dirty:${key}`) === "1") continue
    delete entries[key]
  }
  for (const [key, value] of Object.entries(entries)) {
    if (
      /\.(metaTitle|h1)$/.test(key) &&
      value.trim() &&
      !isUsablePublicCmsText(value, { minLength: 3 })
    ) {
      return {
        error:
          "Title / H1 слишком короткий или похож на служебный якорь админки (например page#s-seo-meta)",
      }
    }
  }
  const keys = Object.keys(entries)
  const current = currentBefore
  const beforeFull = pickSettingsSubset(current, keys)
  const namespacedFaqs: NamespacedFaq[] = parseNamespacedFaqsFromAggregate(formData)
  await saveSettings(entries)
  for (const entry of namespacedFaqs) {
    await replacePageFaqs(entry.storage, entry.groups)
    await writeAudit({
      admin,
      action: "page_faqs_update",
      entityType: "page",
      entityId: entry.storage,
      summary: `Обновлены FAQ «${entry.storage}» (${entry.groups.length} групп)`,
      after: { groups: entry.groups.length },
    })
  }
  const diff = changedSettings(beforeFull, entries)
  const changedKeys = Object.keys(diff.after)
  if (changedKeys.length) {
    const entity = settingsAuditEntity(changedKeys)
    await writeAudit({
      admin,
      action: "settings_update",
      entityType: entity.entityType,
      entityId: entity.entityId,
      summary:
        entity.entityType === "page"
          ? `Обновлена страница «${entity.pageKey}» (${changedKeys.length} полей)`
          : `Обновлены настройки (${changedKeys.length} полей)`,
      before: diff.before,
      after: diff.after,
    })
  }
  revalidateSite()
  revalidatePath("/admin/settings")
  revalidatePath("/admin/pages", "layout")
  revalidatePath("/admin/audit")
  return { ok: true }
}

/* ---------------- Blocks ---------------- */

function blockFromForm(formData: FormData): { collection: BlockCollection; input: BlockInput; tableParseError?: string } {
  const collection = String(formData.get("collection") || "") as BlockCollection

  const extra: Record<string, unknown> = {}
  if (collection === "hero") {
    extra.buttonText = String(formData.get("buttonText") || "").trim()
  }
  if (collection === "faq") {
    extra.defaultOpen = formData.get("defaultOpen") === "on"
  }
  // Resort table: grid in tableJson (or legacy body JSON); body = «Текст под таблицей».
  let _tableParseError: string | undefined
  if (collection === "resort") {
    const tableRaw = String(formData.get("tableJson") || "").trim()
    const bodyRaw = String(formData.get("body") || "").trim()
    const pack = tableRaw.startsWith("{") ? tableRaw : bodyRaw.startsWith("{") ? bodyRaw : ""
    if (pack) {
      try {
        const parsed = JSON.parse(pack) as {
          columns?: unknown
          rows?: unknown
          colWidths?: unknown
        }
        if (Array.isArray(parsed.columns)) extra.columns = parsed.columns
        if (Array.isArray(parsed.rows)) extra.rows = parsed.rows
        if (
          parsed.colWidths &&
          typeof parsed.colWidths === "object" &&
          !Array.isArray(parsed.colWidths)
        ) {
          extra.colWidths = parsed.colWidths
        }
        if (!tableRaw && bodyRaw.startsWith("{")) {
          // Legacy submit: JSON lived in body — clear so footer slot stays free
          formData.set("body", "")
        }
      } catch (e) {
        _tableParseError =
          "Некорректный формат JSON таблицы: " +
          (e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200))
      }
    }
  }

  const page = String(formData.get("page") || "").trim()

  return {
    collection,
    input: {
      collection,
      ...(page ? { page } : {}),
      title: String(formData.get("title") || "").trim(),
      subtitle: String(formData.get("subtitle") || "").trim(),
      body: String(formData.get("body") || "").trim(),
      image: String(formData.get("image") || "").trim(),
      icon: String(formData.get("icon") || "").trim(),
      href: String(formData.get("href") || "").trim(),
      extra,
      visible: formData.get("visible") != null,
    },
    tableParseError: _tableParseError,
  }
}

export async function saveBlockAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const { collection, input, tableParseError } = blockFromForm(formData)
  if (!collection) return { error: "Не указан тип блока" }
  if (tableParseError) return { error: tableParseError }
  if (collection === "resort") {
    const columns = Array.isArray(input.extra.columns) ? input.extra.columns : []
    const rows = Array.isArray(input.extra.rows) ? input.extra.rows : []
    if (!columns.length || columns.some((column) => !String(column).trim())) return { error: "Заполните заголовки всех столбцов таблицы" }
    if (!rows.length || rows.some((row) => !Array.isArray(row) || row.length !== columns.length)) return { error: "Добавьте хотя бы одну строку с корректным количеством ячеек" }
  }
  if (collection !== "resort" && !input.title && !input.body) {
    return { error: "Заполните хотя бы заголовок или текст" }
  }

  const id = Number(formData.get("id") || 0)
  let savedId = id
  if (id) {
    await updateBlock(id, input)
    await writeAudit({
      admin,
      action: "block_update",
      entityType: "block",
      entityId: id,
      summary: `Обновлён блок ${collection}#${id}`,
      after: { collection, page: input.page || "global", title: input.title },
    })
  } else {
    savedId = await createBlock(input)
    await writeAudit({
      admin,
      action: "block_create",
      entityType: "block",
      entityId: input.page || "global",
      summary: `Создан блок ${collection}`,
      after: { collection, page: input.page || "global", title: input.title },
    })
  }
  revalidateSite()
  revalidatePath("/admin/audit")
  // Return to the originating admin page when provided (e.g. avia country page),
  // otherwise fall back to the collection listing.
  const returnTo = String(formData.get("__returnTo") || "").trim()
  if (returnTo) {
    revalidatePath(returnTo)
    return { ok: true, id: savedId }
  }
  revalidateCollectionAdmin(collection)
  redirect(`/admin/content/${collection}`)
}

export async function deleteBlockAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const collection = String(formData.get("collection") || "")
  if (id) {
    await deleteBlock(id)
    await writeAudit({
      admin,
      action: "block_delete",
      entityType: "block",
      entityId: id,
      summary: `Удалён блок ${collection || "?"}#${id}`,
    })
  }
  revalidateSite()
  revalidateCollectionAdmin(collection)
  revalidatePath("/admin/audit")
}

export async function toggleBlockAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const visible = formData.get("visible") === "1"
  const collection = String(formData.get("collection") || "")
  if (id) await setBlockVisibility(id, visible)
  await writeAudit({
    admin,
    action: "block_toggle",
    entityType: "block",
    entityId: id,
    summary: visible ? `Показан блок ${collection || "?"}#${id}` : `Скрыт блок ${collection || "?"}#${id}`,
    after: { visible, collection },
  })
  revalidateSite()
  revalidateCollectionAdmin(collection)
}

export async function moveBlockAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "up") as "up" | "down"
  const collection = String(formData.get("collection") || "")
  if (id) await moveBlock(id, direction)
  await writeAudit({
    admin,
    action: "block_move",
    entityType: "block",
    entityId: id,
    summary: `Перемещён блок ${collection || "?"}#${id} (${direction})`,
    after: { direction, collection },
  })
  revalidateSite()
  revalidateCollectionAdmin(collection)
}

export async function reorderBlocksAction(formData: FormData) {
  const admin = await requireAdmin()
  const collection = String(formData.get("collection") || "") as BlockCollection
  const orderedIds = parseOrderedIds(formData)
  if (!collection || orderedIds.length < 2) return
  await reorderBlocks(collection, orderedIds)
  await writeAudit({
    admin,
    action: "block_reorder",
    entityType: "block",
    entityId: orderedIds[0],
    summary: `Обновлён порядок блоков ${collection} перетаскиванием`,
    after: { orderedIds, collection },
  })
  revalidateSite()
  revalidateCollectionAdmin(collection)
}

/* ---------------- Page sections order/visibility ---------------- */

/**
 * Persists the ordered list of active section keys for a page.
 * Stored as JSON in settings["{pageKey}.sections.order"].
 * FormData: __pageKey=egipet, order=["why","resorts",...]
 */
export async function savePageSectionsOrderAction(formData: FormData) {
  const admin = await requireAdmin()
  const pageKey = String(formData.get("__pageKey") || "")
  const order = String(formData.get("order") || "[]")
  if (!pageKey) return
  const settingKey = `${pageKey}.sections.order`
  const current = await getSettings()
  const beforeFull = pickSettingsSubset(current, [settingKey])
  const entries = { [settingKey]: order }
  await saveSettings(entries)
  const diff = changedSettings(beforeFull, entries)
  if (Object.keys(diff.after).length) {
    await writeAudit({
      admin,
      action: "settings_update",
      entityType: "page",
      entityId: pageKey,
      summary: `Обновлён порядок секций «${pageKey}»`,
      before: diff.before,
      after: diff.after,
    })
  }
  revalidateSite()
  revalidatePath("/admin/audit")
}

/* ---------------- Per-page FAQs ---------------- */

export async function savePageFaqsAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin()
  const page = String(formData.get("__page") || "")
  if (!page) return { error: "Не указана страница" }
  const slot = String(formData.get("__slot") || "faq")
  const storage =
    String(formData.get("__storage") || "").trim() ||
    (slot === "faq" ? page : `${page}::${slot}`)
  const groups = parseFaqGroups(formData)
  await replacePageFaqs(storage, groups)
  await writeAudit({
    admin,
    action: "page_faqs_update",
    entityType: "page",
    entityId: storage,
    summary: `Обновлены FAQ «${storage}» (${groups.length} групп)`,
    after: { groups: groups.length, slot },
  })
  revalidateSite()
  revalidatePath(`/admin/pages/${page}`)
  revalidatePath("/admin/audit")
  return { ok: true as const, groups, savedAt: Date.now() }
}

/* ---------------- Memos tabs (#96) ---------------- */

function revalidateMemosAdmin() {
  revalidateSite()
  revalidatePath("/admin/pages/memos")
  revalidatePath("/admin/audit")
  revalidatePath("/info/memos")
}

export async function createMemoTabAction() {
  const admin = await requireAdmin()
  const settings = await getSettings()
  const order = resolveMemosTabsOrder(settings)
  const shortKey = nextMemoSlotKey(order)
  const nextOrder = [...order.filter((k) => k !== shortKey), shortKey]
  await saveSettings({
    [`${MEMOS_PAGE_CMS_KEY}.section.${shortKey}`]: "1",
    [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
  })
  await writeAudit({
    admin,
    action: "memo_tab_create",
    entityType: "page",
    entityId: shortKey,
    summary: `Добавлена вкладка памятки «${shortKey}»`,
    after: { shortKey, order: nextOrder },
  })
  revalidateMemosAdmin()
  redirect(`/admin/pages/memos/${shortKey}`)
}

export async function deleteMemoTabAction(formData: FormData) {
  const admin = await requireAdmin()
  const shortKey = String(formData.get("slot") || "").trim()
  if (!isMemoSectionKey(shortKey)) return
  const settings = await getSettings()
  const order = resolveMemosTabsOrder(settings)
  const nextOrder = order.filter((k) => k !== shortKey)
  await saveSettings({
    [`${MEMOS_PAGE_CMS_KEY}.section.${shortKey}`]: "0",
    [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
  })
  await writeAudit({
    admin,
    action: "memo_tab_delete",
    entityType: "page",
    entityId: shortKey,
    summary: `Убрана вкладка памятки «${shortKey}» из списка`,
    before: { order },
    after: { order: nextOrder },
  })
  revalidateMemosAdmin()
}

export async function moveMemoTabAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "")
  const shortKey = shortKeyFromMemoSlotId(id)
  if (!shortKey) return
  const dir = direction === "up" ? (-1 as const) : (1 as const)
  const settings = await getSettings()
  const order = resolveMemosTabsOrder(settings)
  if (!listMemoSlotsFromOrder(order).includes(shortKey)) return
  const nextOrder = moveMemoInOrder(order, shortKey, dir)
  if (JSON.stringify(nextOrder) === JSON.stringify(order)) return
  await saveSettings({ [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder) })
  await writeAudit({
    admin,
    action: "memo_tab_move",
    entityType: "page",
    entityId: shortKey,
    summary: `Сдвинута вкладка памятки «${shortKey}» (${dir < 0 ? "вверх" : "вниз"})`,
    before: { order },
    after: { order: nextOrder },
  })
  revalidateMemosAdmin()
}

export async function reorderMemoTabsAction(formData: FormData) {
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
  const settings = await getSettings()
  const current = resolveMemosTabsOrder(settings)
  const nextOrder = orderedIds.map(shortKeyFromMemoSlotId).filter(isMemoSectionKey)
  if (nextOrder.length !== orderedIds.length) return
  const currentSet = new Set(current)
  if (nextOrder.length !== current.length || nextOrder.some((k) => !currentSet.has(k))) return
  await saveSettings({ [MEMOS_TABS_ORDER_KEY]: JSON.stringify(nextOrder) })
  await writeAudit({
    admin,
    action: "memo_tab_reorder",
    entityType: "page",
    entityId: MEMOS_PAGE_CMS_KEY,
    summary: "Обновлён порядок вкладок памяток перетаскиванием",
    before: { order: current },
    after: { order: nextOrder },
  })
  revalidateMemosAdmin()
}

/* ---------------- Dictionary tabs (accordion) ---------------- */

function revalidateDictionaryAdmin() {
  revalidateSite()
  revalidatePath("/admin/pages/dictionary")
  revalidatePath("/admin/audit")
  revalidatePath("/info/dictionary")
}

export async function createDictionaryTabAction() {
  const admin = await requireAdmin()
  const settings = await getSettings()
  const order = resolveDictionaryTabsOrder(settings)
  const shortKey = nextDictionarySlotKey(order)
  const nextOrder = [...order.filter((k) => k !== shortKey), shortKey]
  await saveSettings({
    [`${DICTIONARY_PAGE_CMS_KEY}.section.${shortKey}`]: "1",
    [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
  })
  await writeAudit({
    admin,
    action: "dictionary_tab_create",
    entityType: "page",
    entityId: shortKey,
    summary: `Добавлен раздел словаря «${shortKey}»`,
    after: { shortKey, order: nextOrder },
  })
  revalidateDictionaryAdmin()
  redirect(`/admin/pages/dictionary/${shortKey}`)
}

export async function deleteDictionaryTabAction(formData: FormData) {
  const admin = await requireAdmin()
  const shortKey = String(formData.get("slot") || "").trim()
  if (!isDictionarySectionKey(shortKey)) return
  const settings = await getSettings()
  const order = resolveDictionaryTabsOrder(settings)
  const nextOrder = order.filter((k) => k !== shortKey)
  await saveSettings({
    [`${DICTIONARY_PAGE_CMS_KEY}.section.${shortKey}`]: "0",
    [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder),
  })
  await writeAudit({
    admin,
    action: "dictionary_tab_delete",
    entityType: "page",
    entityId: shortKey,
    summary: `Убран раздел словаря «${shortKey}» из списка`,
    before: { order },
    after: { order: nextOrder },
  })
  revalidateDictionaryAdmin()
}

export async function moveDictionaryTabAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = Number(formData.get("id") || 0)
  const direction = String(formData.get("direction") || "")
  const shortKey = shortKeyFromDictionarySlotId(id)
  if (!shortKey) return
  const dir = direction === "up" ? (-1 as const) : (1 as const)
  const settings = await getSettings()
  const order = resolveDictionaryTabsOrder(settings)
  if (!listDictionarySlotsFromOrder(order).includes(shortKey)) return
  const nextOrder = moveDictionaryInOrder(order, shortKey, dir)
  if (JSON.stringify(nextOrder) === JSON.stringify(order)) return
  await saveSettings({ [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder) })
  await writeAudit({
    admin,
    action: "dictionary_tab_move",
    entityType: "page",
    entityId: shortKey,
    summary: `Сдвинут раздел словаря «${shortKey}» (${dir < 0 ? "вверх" : "вниз"})`,
    before: { order },
    after: { order: nextOrder },
  })
  revalidateDictionaryAdmin()
}

export async function reorderDictionaryTabsAction(formData: FormData) {
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
  const settings = await getSettings()
  const current = resolveDictionaryTabsOrder(settings)
  const nextOrder = orderedIds.map(shortKeyFromDictionarySlotId).filter(isDictionarySectionKey)
  if (nextOrder.length !== orderedIds.length) return
  const currentSet = new Set(current)
  if (nextOrder.length !== current.length || nextOrder.some((k) => !currentSet.has(k))) return
  await saveSettings({ [DICTIONARY_TABS_ORDER_KEY]: JSON.stringify(nextOrder) })
  await writeAudit({
    admin,
    action: "dictionary_tab_reorder",
    entityType: "page",
    entityId: DICTIONARY_PAGE_CMS_KEY,
    summary: "Обновлён порядок разделов словаря перетаскиванием",
    before: { order: current },
    after: { order: nextOrder },
  })
  revalidateDictionaryAdmin()
}

