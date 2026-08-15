"use client"

import { useContext, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  Eye, EyeOff, Trash2, Plus, X,
  ChevronUp, ChevronDown, GripVertical, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { saveSettingsAction } from "@/app/admin/cms-actions"
import { savePageSectionsOrderAction } from "@/app/admin/cms-actions"
import { PageSettingsFormContext } from "@/components/admin/page-settings-form"
import type { PageSection } from "@/lib/admin-config"
import { isMultipliableSectionBase, sectionBaseKey } from "@/lib/multipliable-sections"

function sectionSettingKey(prefix: string, key: string) {
  return prefix ? `${prefix}.section.${key}` : `section.${key}`
}

/** `home.section.faq` → `faq`; `section.faq` (global home keys) → `faq` */
function toShortSectionKey(fullOrShortKey: string) {
  const scoped = fullOrShortKey.indexOf(".section.")
  if (scoped >= 0) return fullOrShortKey.slice(scoped + ".section.".length)
  if (fullOrShortKey.startsWith("section.")) return fullOrShortKey.slice("section.".length)
  return fullOrShortKey
}

/* ─────────────────────────────────────────────────────────────
   Shared draft (order + visibility) — content/order views stay in
   sync; DB write only on page Save via PageSettingsFormContext.
───────────────────────────────────────────────────────────── */
type DraftSnap = {
  order: string[]
  visibility: Record<string, boolean>
  rev: number
}

type DraftStore = {
  snap: DraftSnap
  listeners: Set<() => void>
  baseline: string
  baselineOrder: string
  fullBaseline: string
  persistLock: Promise<void> | null
}

const draftStores = new Map<string, DraftStore>()

/** Drop idle store so long admin sessions do not retain every pageKey forever. */
export function releaseDraftStore(storeId: string): boolean {
  const store = draftStores.get(storeId)
  if (!store || store.listeners.size > 0) return false
  draftStores.delete(storeId)
  return true
}

/** @internal selfcheck */
export function draftStoresSizeForTest() {
  return draftStores.size
}

/** @internal selfcheck — seed without React */
export function getDraftStoreForTest(
  storeId: string,
  settingsPrefix = "",
  initialOrder: string[] = [],
  settings: Record<string, string> = {},
) {
  return getDraftStore(storeId, settingsPrefix, initialOrder, [], settings)
}

/** @internal selfcheck — mutate order/visibility without React */
export function patchDraftForTest(
  store: ReturnType<typeof getDraftStoreForTest>,
  patch: Partial<Pick<DraftSnap, "order" | "visibility">>,
) {
  patchDraft(store, patch)
}

function buildVisibility(
  settingsPrefix: string,
  order: string[],
  sections: PageSection[],
  settings: Record<string, string>,
): Record<string, boolean> {
  const vis: Record<string, boolean> = {}
  for (const section of sections) {
    vis[section.key] = (settings[section.key] ?? "1") !== "0"
  }
  for (const shortKey of order) {
    const fullKey = sectionSettingKey(settingsPrefix, shortKey)
    const baseKey = sectionSettingKey(settingsPrefix, shortKey.replace(/\d+$/, ""))
    if (!(fullKey in vis)) {
      vis[fullKey] = (settings[fullKey] ?? settings[baseKey] ?? "1") !== "0"
    }
  }
  return vis
}

function draftBaseline(
  settingsPrefix: string,
  initialOrder: string[],
  sections: PageSection[],
  settings: Record<string, string>,
) {
  const orderPart = JSON.stringify(initialOrder)
  const sectionVis = sections.map((s) => `${s.key}:${settings[s.key] ?? "1"}`).join("|")
  const orderVis = initialOrder
    .map((k) => {
      const fullKey = sectionSettingKey(settingsPrefix, k)
      return `${fullKey}:${settings[fullKey] ?? "1"}`
    })
    .join("|")
  return `${orderPart}::${sectionVis}::${orderVis}`
}

function getDraftStore(
  storeId: string,
  settingsPrefix: string,
  initialOrder: string[],
  sections: PageSection[],
  settings: Record<string, string>,
): DraftStore {
  let store = draftStores.get(storeId)
  const baseline = draftBaseline(settingsPrefix, initialOrder, sections, settings)
  const initialVisibility = buildVisibility(settingsPrefix, initialOrder, sections, settings)
  const fullBaseline = JSON.stringify({ order: initialOrder, visibility: initialVisibility })
  if (!store) {
    store = {
      snap: {
        order: [...initialOrder],
        visibility: initialVisibility,
        rev: 0,
      },
      listeners: new Set(),
      baseline,
      baselineOrder: JSON.stringify(initialOrder),
      fullBaseline,
      persistLock: null,
    }
    draftStores.set(storeId, store)
    return store
  }
  return store
}

function emitDraft(store: DraftStore) {
  store.listeners.forEach((listener) => listener())
}

function patchDraft(store: DraftStore, patch: Partial<Pick<DraftSnap, "order" | "visibility">>) {
  store.snap = {
    order: patch.order ?? store.snap.order,
    visibility: patch.visibility ?? store.snap.visibility,
    rev: store.snap.rev + 1,
  }
  emitDraft(store)
}

function resolveVisible(
  visibility: Record<string, boolean>,
  fullKey: string,
  baseFullKey: string,
): boolean {
  return visibility[fullKey] ?? visibility[baseFullKey] ?? true
}

async function persistDraftStore(
  store: DraftStore,
  pageKey: string,
  router: { refresh: () => void },
) {
  if (store.persistLock) return store.persistLock
  store.persistLock = (async () => {
    while (true) {
      const { order, visibility, rev } = store.snap
      const orderFd = new FormData()
      orderFd.set("__pageKey", pageKey)
      orderFd.set("order", JSON.stringify(order))
      await savePageSectionsOrderAction(orderFd)
      const visFd = new FormData()
      for (const [key, on] of Object.entries(visibility)) visFd.set(key, on ? "1" : "0")
      if ([...visFd.keys()].length > 0) await saveSettingsAction(null, visFd)
      if (store.snap.rev === rev) break
    }
    store.baselineOrder = JSON.stringify(store.snap.order)
    router.refresh()
  })().finally(() => {
    store.persistLock = null
  })
  return store.persistLock
}

function useSectionsDraft(
  pageKey: string,
  settingsPrefix: string,
  initialOrder: string[],
  sections: PageSection[],
  settings: Record<string, string>,
) {
  const storeId = `${pageKey}::${settingsPrefix}`
  const store = getDraftStore(storeId, settingsPrefix, initialOrder, sections, settings)
  const baseline = draftBaseline(settingsPrefix, initialOrder, sections, settings)

  useEffect(() => {
    if (store.baseline === baseline) return
    const newVisibility = buildVisibility(settingsPrefix, initialOrder, sections, settings)
    store.snap = {
      order: [...initialOrder],
      visibility: newVisibility,
      rev: store.snap.rev + 1,
    }
    store.baseline = baseline
    store.baselineOrder = JSON.stringify(initialOrder)
    store.fullBaseline = JSON.stringify({ order: initialOrder, visibility: newVisibility })
    emitDraft(store)
  }, [baseline, initialOrder, sections, settings, settingsPrefix, store])

  const snap = useSyncExternalStore(
    (onChange) => {
      store.listeners.add(onChange)
      return () => {
        store.listeners.delete(onChange)
        // microtask: Strict Mode remount re-subscribes before prune
        queueMicrotask(() => releaseDraftStore(storeId))
      }
    },
    () => store.snap,
    () => store.snap,
  )

  return { storeId, store, order: snap.order, visibility: snap.visibility }
}

/* ─────────────────────────────────────────────────────────────
   Sidebar anchor nav — same visual style as FormAnchorNav in ui.tsx
   but with reorder Up/Down buttons and a status dot.
───────────────────────────────────────────────────────────── */
function SectionsNav({
  pageKey,
  settingsPrefix = pageKey,
  sections,
  order,
  visibleMap,
  onMoveUp,
  onMoveDown,
}: {
  pageKey: string
  settingsPrefix?: string
  sections: PageSection[]
  order: string[]
  visibleMap: Record<string, boolean>
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
}) {
  // Keep short keys in the nav so onMoveUp/onMoveDown receive the correct short key
  const ordered = order
    .map((k) => {
      // Exact match, then base key (seo2 → seo)
      const fullKey = sectionSettingKey(settingsPrefix, k)
      const sec = sections.find((s) => s.key === fullKey)
        ?? sections.find((s) => s.key === sectionSettingKey(settingsPrefix, k.replace(/\d+$/, "")))
      if (!sec) return null
      // Store short key so callers receive it directly, avoiding the split
      return { ...sec, key: k }
    })
    .filter(Boolean) as PageSection[]

  return (
    <nav
      className="sticky top-4 hidden w-48 shrink-0 xl:block"
      aria-label="Разделы страницы"
    >
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-admin-fg-muted">
        Разделы
      </p>
      <ul className="space-y-0.5">
        {ordered.map((sec, idx) => {
          const shortKey = toShortSectionKey(sec.key)
          const isVisible = visibleMap[sec.key] !== false
          return (
            <li key={sec.key} className="group flex items-center gap-1">
              {/* Up / Down */}
              <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onMoveUp(sec.key)}
                  disabled={idx === 0}
                  title="Переместить вверх"
                  className="grid h-4 w-4 place-items-center rounded text-admin-fg-muted hover:text-admin-fg disabled:opacity-20"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown(sec.key)}
                  disabled={idx === ordered.length - 1}
                  title="Переместить вниз"
                  className="grid h-4 w-4 place-items-center rounded text-admin-fg-muted hover:text-admin-fg disabled:opacity-20"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {/* Anchor link */}
              <a
                href={`#sec-${shortKey}`}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-admin-muted hover:text-admin-fg",
                  isVisible ? "text-admin-fg-muted" : "text-admin-fg-muted/50 line-through",
                )}
              >
                {/* Visibility dot */}
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    isVisible ? "bg-green-500" : "bg-admin-border",
                  )}
                  aria-hidden
                />
                <span className="truncate">{sec.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────
   Mini SVG mockups (one per section key or short key).
   Lookup order: full key → short key (last segment after ".section.")
───────────────────────────────────────────────────────────── */
const MOCKUPS: Record<string, React.ReactNode> = {
  "egipet.section.why": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="60" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
      {[30,37,44,51].map((y) => (
        <g key={y}>
          <circle cx="11" cy={y+1.5} r="2" fill="currentColor" opacity="0.5" />
          <rect x="16" y={y} width="72" height="3" rx="1" fill="currentColor" opacity="0.2" />
        </g>
      ))}
      <rect x="8" y="60" width="104" height="6" rx="2" fill="currentColor" opacity="0.12" />
    </svg>
  ),
  "egipet.section.resorts": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="55" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="90" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="44" width="50" height="22" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="62" y="44" width="50" height="22" rx="2" fill="currentColor" opacity="0.12" />
    </svg>
  ),
  "egipet.section.when": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="50" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="60" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
  "egipet.section.included": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="58" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="90" height="3" rx="1" fill="currentColor" opacity="0.2" />
      {[24,31,38,45,52,59].map((y) => (
        <g key={y}>
          <circle cx="11" cy={y+1.5} r="2" fill="currentColor" opacity="0.5" />
          <rect x="16" y={y} width="68" height="3" rx="1" fill="currentColor" opacity="0.2" />
        </g>
      ))}
    </svg>
  ),
  "egipet.section.how": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="44" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="28" width="72" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
  "egipet.section.cities": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="52" height="5" rx="2" fill="currentColor" opacity="0.5" />
      {[[8,16],[44,16],[80,16],[8,34],[44,34],[80,34]].map(([x,y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="32" height="14" rx="2" fill="currentColor" opacity="0.15" />
      ))}
    </svg>
  ),
  "egipet.section.compare": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="56" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="8" rx="2" fill="currentColor" opacity="0.35" />
      {[28,39,50,61].map((y,i) => (
        <rect key={y} x="8" y={y} width="104" height="8" rx="1" fill="currentColor" opacity={i%2===0 ? 0.1 : 0.05} />
      ))}
    </svg>
  ),
  "egipet.section.season": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="48" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="38" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="44" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
  /* SEO-текст (расширенный) — rich editor blocks */
  "egipet.section.seo": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="70" height="5" rx="2" fill="currentColor" opacity="0.5" />
      {/* Toolbar strip */}
      <rect x="8" y="16" width="104" height="8" rx="2" fill="currentColor" opacity="0.12" />
      {[4,4,4,4,4].map((_, i) => (
        <rect key={i} x={12 + i * 10} y="18" width="6" height="4" rx="1" fill="currentColor" opacity="0.3" />
      ))}
      {/* Text body */}
      <rect x="8" y="28" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="34" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="40" width="100" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="46" width="80" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="52" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="58" width="72" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
  /* Частые вопросы — accordion rows */
  "egipet.section.faq": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="56" height="5" rx="2" fill="currentColor" opacity="0.5" />
      {[18, 31, 44, 57].map((y) => (
        <g key={y}>
          <rect x="8" y={y} width="104" height="9" rx="2" fill="currentColor" opacity="0.1" />
          <rect x="12" y={y + 3} width="72" height="3" rx="1" fill="currentColor" opacity="0.3" />
          {/* chevron indicator */}
          <rect x="104" y={y + 3} width="5" height="3" rx="1" fill="currentColor" opacity="0.25" />
        </g>
      ))}
    </svg>
  ),
  /* Алерт страницы — colored banner bar */
  "egipet.section.alert": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="52" height="5" rx="2" fill="currentColor" opacity="0.5" />
      {/* Alert banner */}
      <rect x="8" y="20" width="104" height="22" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="14" y="26" width="6" height="10" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="26" y="27" width="72" height="3" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="26" y="33" width="54" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
  /* Universal short-key aliases — used when pageKey != "egipet" */
  "cities": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="52" height="5" rx="2" fill="currentColor" opacity="0.5" />
      {[[8,16],[44,16],[80,16],[8,34],[44,34],[80,34]].map(([x,y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="32" height="14" rx="2" fill="currentColor" opacity="0.15" />
      ))}
    </svg>
  ),
  "seo": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="70" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="8" rx="2" fill="currentColor" opacity="0.12" />
      {[0,1,2,3,4].map((i) => (
        <rect key={i} x={12 + i * 10} y="18" width="6" height="4" rx="1" fill="currentColor" opacity="0.3" />
      ))}
      <rect x="8" y="28" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="34" width="96" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="40" width="100" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="46" width="80" height="3" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  ),
  "resorts": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="56" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="8" rx="2" fill="currentColor" opacity="0.35" />
      {[28,39,50,61].map((y,i) => (
        <rect key={y} x="8" y={y} width="104" height="8" rx="1" fill="currentColor" opacity={i%2===0 ? 0.1 : 0.05} />
      ))}
    </svg>
  ),
  "faq": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="56" height="5" rx="2" fill="currentColor" opacity="0.5" />
      {[18, 31, 44, 57].map((y) => (
        <g key={y}>
          <rect x="8" y={y} width="104" height="9" rx="2" fill="currentColor" opacity="0.1" />
          <rect x="12" y={y + 3} width="72" height="3" rx="1" fill="currentColor" opacity="0.3" />
          <rect x="104" y={y + 3} width="5" height="3" rx="1" fill="currentColor" opacity="0.25" />
        </g>
      ))}
    </svg>
  ),
  "callus": (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="16" width="104" height="38" rx="3" fill="currentColor" opacity="0.1" />
      <rect x="22" y="24" width="76" height="5" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="30" y="32" width="60" height="3" rx="1" fill="currentColor" opacity="0.25" />
      <rect x="38" y="43" width="44" height="8" rx="3" fill="currentColor" opacity="0.35" />
    </svg>
  ),
}

function getMockup(fullKey: string): React.ReactNode | undefined {
  if (MOCKUPS[fullKey]) return MOCKUPS[fullKey]
  const shortKey = toShortSectionKey(fullKey).replace(/\d+$/, "") // seo2 → seo
  return shortKey ? MOCKUPS[shortKey] : undefined
}

function DefaultMockup({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <rect x="8" y="6" width="50" height="5" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="8" y="16" width="104" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="8" y="22" width="88" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <text x="8" y="60" fontSize="8" fill="currentColor" opacity="0.4">{label}</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   PageSectionsManager — owns order + renders sidebar + cards
────────────────────────────────────────────────────────────── */
export function PageSectionsManager({
  pageKey,
  settingsPrefix = pageKey,
  sections,
  initialOrder,
  settings,
  toggleKeys: _toggleKeys,
  sectionSlots = {},
  hideSidebar = false,
  hiddenSectionKeys = [],
  view = "content",
  sectionTitles,
}: {
  /** e.g. "egipet" — used as prefix for settings keys */
  pageKey: string
  /** Optional settings-key prefix when visibility keys predate page-scoped sections. */
  settingsPrefix?: string
  /** Full list of available sections from admin-config */
  sections: PageSection[]
  /** Initial ordered array of active section short-keys (e.g. ["why","resorts",...]) */
  initialOrder: string[]
  settings: Record<string, string>
  toggleKeys: string
  /** Pre-rendered content per section short key (including numbered variants seo2, seo3 …) */
  sectionSlots?: Record<string, React.ReactNode>
  /** Presentation-only: hide the internal sidebar when an outer workspace owns navigation. */
  hideSidebar?: boolean
  /** Presentation-only: keep sections in order/persistence, but render them elsewhere. */
  hiddenSectionKeys?: string[]
  /** Render section bodies or only the reorder controls. */
  view?: "content" | "order"
  /** Optional per-instance headings shown only in the order view. */
  sectionTitles?: Record<string, string>
}) {
  void _toggleKeys
  const router = useRouter()
  const pageForm = useContext(PageSettingsFormContext)
  const { store, order, visibility } = useSectionsDraft(
    pageKey,
    settingsPrefix,
    initialOrder,
    sections,
    settings,
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const hiddenKeys = new Set(hiddenSectionKeys)
  const orderDirty = JSON.stringify(order) !== store.baselineOrder
  const persistRef = useRef(() => persistDraftStore(store, pageKey, router))
  persistRef.current = () => persistDraftStore(store, pageKey, router)

  useEffect(() => {
    if (!pageForm) return
    return pageForm.registerDraft({
      id: `sections:${pageKey}`,
      label: "Порядок и видимость секций",
      tabHash: "#settings-order",
      isDirty: () => JSON.stringify({ order: store.snap.order, visibility: store.snap.visibility }) !== store.fullBaseline,
      append(fd) {
        fd.set("__pageKey", pageKey)
        fd.set("__sectionOrder", JSON.stringify(store.snap.order))
        fd.set("__sectionVisibility", JSON.stringify(store.snap.visibility))
      },
      commitBaseline() {
        store.fullBaseline = JSON.stringify({ order: store.snap.order, visibility: store.snap.visibility })
        store.baselineOrder = JSON.stringify(store.snap.order)
      },
      reset() {
        const { order, visibility } = JSON.parse(store.fullBaseline) as { order: string[]; visibility: Record<string, boolean> }
        patchDraft(store, { order, visibility })
      },
    })
  }, [pageForm, pageKey, store])

  function setOrder(next: string[]) {
    patchDraft(store, { order: next })
  }

  function setVisibility(fullKey: string, baseFullKey: string, next: boolean) {
    patchDraft(store, {
      visibility: {
        ...store.snap.visibility,
        [fullKey]: next,
        [baseFullKey]: next,
      },
    })
  }

  function moveUp(key: string) {
    const shortKey = toShortSectionKey(key)
    const idx = order.indexOf(shortKey)
    if (idx <= 0) return
    const next = [...order]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setOrder(next)
  }

  function moveDown(key: string) {
    const shortKey = toShortSectionKey(key)
    const idx = order.indexOf(shortKey)
    if (idx < 0 || idx >= order.length - 1) return
    const next = [...order]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setOrder(next)
  }

  function deleteSection(fullKey: string) {
    const shortKey = toShortSectionKey(fullKey)
    setOrder(order.filter((k) => k !== shortKey))
  }

  function addSection(fullKey: string) {
    const baseShortKey = toShortSectionKey(fullKey)
    let shortKey = baseShortKey
    if (order.includes(shortKey)) {
      let n = 2
      while (order.includes(`${baseShortKey}${n}`)) n++
      shortKey = `${baseShortKey}${n}`
    }
    const visKey = sectionSettingKey(settingsPrefix, shortKey)
    setOrder([...order, shortKey])
    setVisibility(visKey, fullKey, true)
    setPickerOpen(false)
  }

  function dropAt(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...order]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setOrder(next)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function toggleVisibility(fullKey: string, baseFullKey: string, current: boolean) {
    setVisibility(fullKey, baseFullKey, !current)
  }

  // Sections not in order — but always keep allowMultiple registry sections in picker
  const deletedSections = sections.filter((s) => {
    const shortKey = toShortSectionKey(s.key)
    if (isMultipliableSectionBase(shortKey)) return true // always show in picker
    return !order.includes(shortKey)
  })

  if (view === "order") {
    return (
      <div className="rounded-lg border border-admin-border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-admin-fg-muted">Изменения порядка и видимости сохраняются по кнопке «Сохранить» в шапке страницы.</p>
        </div>
        <div className="space-y-1">
          {order.map((shortKey, index) => {
            const fullKey = sectionSettingKey(settingsPrefix, shortKey)
            const baseFullKey = sectionSettingKey(settingsPrefix, shortKey.replace(/\d+$/, ""))
            const sec = sections.find((s) => s.key === fullKey) ?? sections.find((s) => s.key === baseFullKey)
            if (!sec) return null
            const isVisible = resolveVisible(visibility, fullKey, baseFullKey)
            return (
              <div
                key={shortKey}
                draggable
                onDragStart={() => {
                  setDragIndex(index)
                  setDragOverIndex(index)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOverIndex(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  dropAt(index)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setDragOverIndex(null)
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 transition-colors",
                  dragOverIndex === index && dragIndex !== index
                    ? "border-admin-fg bg-admin-muted/60"
                    : "border-admin-border",
                )}
              >
                <span
                  className="cursor-grab text-admin-fg-subtle active:cursor-grabbing"
                  aria-label="Перетащить секцию"
                  title="Перетащить секцию"
                >
                  <GripVertical className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveUp(shortKey)}
                    disabled={index === 0}
                    title="Переместить вверх"
                    className="grid h-5 w-6 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(shortKey)}
                    disabled={index === order.length - 1}
                    title="Переместить вниз"
                    className="grid h-5 w-6 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    {sectionTitles?.[shortKey] ? (
                      <>
                        <span className="block truncate text-sm font-medium text-admin-fg">
                          {sectionTitles[shortKey]}
                        </span>
                        <span className="block text-[11px] text-admin-fg-muted">{sec.label}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-admin-fg">{sec.label}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = `#sec-${shortKey}`
                  }}
                  title="Перейти к редактированию"
                  className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Перейти к редактированию
                </button>
                <button
                  type="button"
                  onClick={() => toggleVisibility(fullKey, baseFullKey, isVisible)}
                  title={isVisible ? "Скрыть секцию на сайте" : "Показать секцию на сайте"}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                    isVisible
                      ? "text-admin-fg-muted hover:bg-amber-50 hover:text-amber-700"
                      : "text-green-700 hover:bg-green-50",
                  )}
                >
                  {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(fullKey)}
                  title="Удалить секцию со страницы"
                  className="rounded px-2 py-1 text-xs text-admin-fg-muted hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
        {deletedSections.length > 0 && (
          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-admin-border px-4 py-3 text-sm text-admin-fg-muted transition-colors hover:border-admin-fg/40 hover:text-admin-fg"
            >
              <Plus className="h-4 w-4" />
              Добавить секцию
              <span className="ml-1 rounded-full bg-admin-muted px-1.5 py-0.5 text-xs font-medium text-admin-fg-muted">
                {deletedSections.length}
              </span>
            </button>
            {pickerOpen && (
              <div className="mt-2 rounded-lg border border-admin-border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
                  <span className="text-sm font-semibold text-admin-fg">
                    Удалённые секции — нажмите, чтобы вернуть
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="grid h-7 w-7 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
                  {deletedSections.map((sec) => (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => addSection(sec.key)}
                      className="group flex flex-col gap-2 rounded-lg border border-admin-border p-3 text-left transition-colors hover:border-brand hover:bg-brand/5"
                    >
                      <div className="rounded bg-admin-muted/60 p-2 text-admin-fg-muted group-hover:text-brand">
                        {getMockup(sec.key) ?? <DefaultMockup label={sec.label} />}
                      </div>
                      <span className="text-xs font-medium leading-snug text-admin-fg">{sec.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Main content column */}
      <div className="min-w-0 flex-1 space-y-4">
        {order.map((shortKey) => {
          if (hiddenKeys.has(shortKey)) return null
          const fullKey = sectionSettingKey(settingsPrefix, shortKey)
          // Numbered keys (e.g. "seo2") fall back to the base section config ("seo")
          const baseFullKey = sectionSettingKey(settingsPrefix, shortKey.replace(/\d+$/, ""))
          const sec = sections.find((s) => s.key === fullKey) ?? sections.find((s) => s.key === baseFullKey)
          if (!sec) return null
          const isVisible = resolveVisible(visibility, fullKey, baseFullKey)

          return (
            <PageSectionCardWrapper
              key={fullKey}
              sectionId={shortKey}
              label={sec.label}
              visible={isVisible}
              onToggle={() => toggleVisibility(fullKey, baseFullKey, isVisible)}
              onDelete={() => deleteSection(fullKey)}
            >
              {/* callus2+ reuse shared note (copy is global); seo/faq/resorts have own slots */}
              {sectionSlots[shortKey] ??
                (sectionBaseKey(shortKey) === "callus" ? sectionSlots.callus : null) ??
                null}
            </PageSectionCardWrapper>
          )
        })}

        {/* Add deleted sections back */}
        {deletedSections.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-admin-border px-4 py-3 text-sm text-admin-fg-muted transition-colors hover:border-admin-fg/40 hover:text-admin-fg"
            >
              <Plus className="h-4 w-4" />
              Добавить секцию
              <span className="ml-1 rounded-full bg-admin-muted px-1.5 py-0.5 text-xs font-medium text-admin-fg-muted">
                {deletedSections.length}
              </span>
            </button>

            {pickerOpen && (
              <div className="mt-2 rounded-lg border border-admin-border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
                  <span className="text-sm font-semibold text-admin-fg">
                    Удалённые секции — нажмите, чтобы вернуть
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="grid h-7 w-7 place-items-center rounded text-admin-fg-muted hover:bg-admin-muted hover:text-admin-fg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
                  {deletedSections.map((sec) => (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => addSection(sec.key)}
                      className="group flex flex-col gap-2 rounded-lg border border-admin-border p-3 text-left transition-colors hover:border-brand hover:bg-brand/5"
                    >
                      <div className="rounded bg-admin-muted/60 p-2 text-admin-fg-muted group-hover:text-brand">
                        {getMockup(sec.key) ?? <DefaultMockup label={sec.label} />}
                      </div>
                      <span className="text-xs font-medium leading-snug text-admin-fg">{sec.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky sidebar nav — pass short keys, SectionsNav builds full keys internally */}
      {!hideSidebar && (
        <SectionsNav
          pageKey={pageKey}
          settingsPrefix={settingsPrefix}
          sections={sections}
          order={order.filter((k) =>
            !hiddenKeys.has(k) &&
            sections.some((s) =>
              s.key === sectionSettingKey(settingsPrefix, k) ||
              s.key === sectionSettingKey(settingsPrefix, k.replace(/\d+$/, "")),
            )
          )}
          visibleMap={visibility}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   PageSectionCardWrapper — local visibility only; DB on Save.
───────────────────────────────────────────────────────────── */
function PageSectionCardWrapper({
  sectionId,
  label,
  visible,
  onToggle,
  onDelete,
  children,
}: {
  sectionId: string
  label: string
  visible: boolean
  onToggle: () => void
  onDelete: () => void
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      id={`sec-${sectionId}`}
      className={cn(
        "scroll-mt-4 rounded-lg border bg-white transition-colors",
        visible ? "border-admin-border" : "border-dashed border-admin-border opacity-70",
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5",
        !collapsed && "border-b border-admin-border",
      )}>
        {/* Collapse toggle + label */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-admin-fg-muted transition-transform",
            collapsed && "-rotate-90",
          )} />
          <span className={cn(
            "text-sm font-semibold",
            visible ? "text-admin-fg" : "text-admin-fg-muted line-through",
          )}>
            {label}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Eye toggle */}
          <button
            type="button"
            onClick={onToggle}
            title={visible ? "Скрыть секцию на сайте (сохранится по кнопке «Сохранить»)" : "Показать секцию на сайте (сохранится по кнопке «Сохранить»)"}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              visible
                ? "text-admin-fg-muted hover:bg-amber-50 hover:text-amber-700"
                : "text-green-700 hover:bg-green-50",
            )}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{visible ? "Скрыть" : "Показать"}</span>
          </button>

          {/* Delete with confirm */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Удалить секцию со страницы"
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-admin-fg-muted transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Удалить</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1">
              <span className="text-xs text-red-700">Удалить?</span>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); onDelete() }}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Да
              </button>
              <span className="text-xs text-red-300">/</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-red-500 hover:underline"
              >
                Нет
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body — keep editor available even when section is off on the site */}
      {!collapsed && (
        <div className="p-4">
          {!visible && (
            <p className="mb-3 text-xs italic text-admin-fg-muted">
              Секция будет скрыта на сайте после «Сохранить». Нажмите <Eye className="inline h-3 w-3" /> чтобы включить.
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
