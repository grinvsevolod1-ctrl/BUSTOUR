import { getPublicSettings, getFaqs, isOn } from "@/lib/cms"
import { expandContentBlocks, expandPlainText } from "@/lib/expand-content-blocks"
import { groupFaqBlocks } from "@/lib/faq-form"
import { isCallusSectionKey } from "@/lib/multipliable-sections"
import { CallUs } from "./call-us"
import { Faq } from "./faq"
import { FaqJsonLd } from "./faq-json-ld"

type Band = { type: "callus"; slot: string } | { type: "faq" }

function parseSectionOrder(settings: Record<string, string>, sectionPrefix?: string): string[] | null {
  if (!sectionPrefix) return null
  try {
    const raw = settings[`${sectionPrefix}.sections.order`]
    if (raw) return JSON.parse(raw) as string[]
  } catch {}
  return null
}

// Shared "Есть вопросы?" + FAQ band. Several ЧаВо blocks (subtitle = group title).
// When `${sectionPrefix}.sections.order` exists, callus/faq follow that order.
export async function PageExtras({
  pageKey,
  faqScope,
  showCallUs: allowCallUs = true,
  showFaq: allowFaq = true,
  sectionPrefix,
  callusSlots,
  bare = false,
}: {
  pageKey: string
  faqScope?: string
  showCallUs?: boolean
  showFaq?: boolean
  sectionPrefix?: string
  /** Explicit slots from section order (`callus`, `callus2`, …). */
  callusSlots?: string[]
  /** If true, skip outer section wrapper (px/max-w). Use when inside already-padded containers. */
  bare?: boolean
}) {
  const [settings, faqsRaw] = await Promise.all([
    getPublicSettings(),
    faqScope ? getFaqs(faqScope) : Promise.resolve([]),
  ])
  const faqs = await expandContentBlocks(faqsRaw)

  const slots =
    callusSlots?.filter(isCallusSectionKey) ??
    (allowCallUs ? (["callus"] as string[]) : [])

  const visibleCallus = slots.filter((slot) => {
    if (!allowCallUs) return false
    if (sectionPrefix) {
      return isOn(settings, `${sectionPrefix}.section.${slot}`)
    }
    const pageKeyToggle = `page.${pageKey}.${slot === "callus" ? "callus" : slot}`
    const legacyCallus = slot === "callus" ? isOn(settings, "section.callus") : true
    return legacyCallus && isOn(settings, pageKeyToggle)
  })

  const faqKey = sectionPrefix ? `${sectionPrefix}.section.faq` : `page.${pageKey}.faq`
  const defaultFaqTitle = settings["title.faq"] || "Частые вопросы"
  const groups = groupFaqBlocks(faqs, defaultFaqTitle)
  const showFaq =
    allowFaq &&
    isOn(settings, sectionPrefix ? faqKey : "section.faq") &&
    isOn(settings, faqKey) &&
    groups.some((g) => g.items.length > 0)

  if (!visibleCallus.length && !showFaq) return null

  const schemaItems = groups.flatMap((g) =>
    g.items.map((item) => ({ question: item.title, answer: item.body })),
  )
  const titles = await Promise.all(groups.map((g) => expandPlainText(g.title)))

  const order = parseSectionOrder(settings, sectionPrefix)
  const bands: Band[] = []
  if (order) {
    const seenFaq = new Set<string>()
    for (const key of order) {
      if (isCallusSectionKey(key) && visibleCallus.includes(key)) {
        bands.push({ type: "callus", slot: key })
      } else if ((key === "faq" || /^faq\d+$/.test(key)) && showFaq && !seenFaq.has("faq")) {
        seenFaq.add("faq")
        bands.push({ type: "faq" })
      }
    }
  }
  if (!bands.length) {
    for (const slot of visibleCallus) bands.push({ type: "callus", slot })
    if (showFaq) bands.push({ type: "faq" })
  }

  const faqNode = showFaq ? (
    <>
      <FaqJsonLd items={schemaItems} />
      {groups.map((g, i) => (
        <Faq key={`${g.title}-${i}`} items={g.items} title={titles[i] ?? g.title} bare />
      ))}
    </>
  ) : null

  const bandsContent = (
    <>
      {bands.map((band) =>
        band.type === "callus" ? (
          <CallUs
            key={band.slot}
            title={settings["callus.title"]}
            subtitle={settings["callus.subtitle"]}
            button={settings["callus.button"]}
          />
        ) : (
          <div key="faq">{faqNode}</div>
        ),
      )}
    </>
  )

  if (bare) return bandsContent

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
      {bandsContent}
    </section>
  )
}
