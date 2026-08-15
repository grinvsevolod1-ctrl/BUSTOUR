export type FaqPair = { question: string; answer: string }
export type FaqGroupInput = { title: string; items: FaqPair[] }

export type NamespacedFaq = { storage: string; groups: FaqGroupInput[] }

export function parseNamespacedFaqsFromAggregate(aggregateFd: FormData): NamespacedFaq[] {
  const result: NamespacedFaq[] = []
  for (const [key, value] of aggregateFd.entries()) {
    if (typeof value !== "string" || !key.startsWith("__faqData:")) continue
    const storage = key.slice("__faqData:".length)
    try {
      const entries = JSON.parse(value) as [string, FormDataEntryValue][]
      const tmp = new FormData()
      for (const [name, entry] of entries) tmp.append(name, entry)
      const groups = parseFaqGroups(tmp)
      if (groups.length) result.push({ storage, groups })
    } catch {
      // ignore malformed FAQ JSON
    }
  }
  return result
}

/** Flat Q/A pairs (legacy single ЧаВо block). */
export function parseFaqPairs(formData: FormData): FaqPair[] {
  const questions = formData.getAll("faqQuestion").map((v) => String(v))
  const answers = formData.getAll("faqAnswer").map((v) => String(v))
  return questions
    .map((q, i) => ({ question: q.trim(), answer: (answers[i] || "").trim() }))
    .filter((p) => p.question && p.answer)
}

/**
 * Several FAQ blocks per page.
 * Form fields: faqGroupTitle[] + faqQuestion[]/faqAnswer[]/faqGroup[] (group index).
 * Without faqGroupTitle → one untitled group from parseFaqPairs (compat).
 */
export function parseFaqGroups(formData: FormData): FaqGroupInput[] {
  const titles = formData.getAll("faqGroupTitle").map((v) => String(v).trim())
  if (!titles.length) {
    const items = parseFaqPairs(formData)
    return items.length ? [{ title: "", items }] : []
  }

  const questions = formData.getAll("faqQuestion").map((v) => String(v))
  const answers = formData.getAll("faqAnswer").map((v) => String(v))
  const indices = formData.getAll("faqGroup").map((v) => Number(v))

  return titles
    .map((title, gi) => ({
      title,
      items: questions
        .map((q, i) => ({
          question: q.trim(),
          answer: (answers[i] || "").trim(),
          gi: Number.isFinite(indices[i]) ? indices[i]! : 0,
        }))
        .filter((p) => p.gi === gi && p.question && p.answer)
        .map(({ question, answer }) => ({ question, answer })),
    }))
    .filter((g) => g.items.length > 0)
}

export type FaqBlockLike = {
  id?: number
  title: string
  body: string
  subtitle?: string
  extra?: Record<string, unknown>
  visible?: boolean
}

export type FaqGroupBlocks<T extends FaqBlockLike = FaqBlockLike> = {
  title: string
  items: T[]
}

/** Group FAQ content_blocks by subtitle; empty subtitle → defaultTitle. Order = first seen. */
export function groupFaqBlocks<T extends FaqBlockLike>(
  blocks: T[],
  defaultTitle = "Частые вопросы",
): FaqGroupBlocks<T>[] {
  const order: string[] = []
  const map = new Map<string, T[]>()
  for (const b of blocks) {
    const key = (b.subtitle || "").trim()
    if (!map.has(key)) {
      order.push(key)
      map.set(key, [])
    }
    map.get(key)!.push(b)
  }
  return order.map((key) => ({
    title: key || defaultTitle,
    items: map.get(key)!,
  }))
}
