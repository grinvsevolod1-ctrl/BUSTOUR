/** Pure FAQPage JSON-LD builders (Google rich results). */

export type FaqSchemaItem = {
  question: string
  answer: string
}

export type FaqPageJsonLd = {
  "@context": "https://schema.org"
  "@type": "FAQPage"
  mainEntity: Array<{
    "@type": "Question"
    name: string
    acceptedAnswer: {
      "@type": "Answer"
      text: string
    }
  }>
}

/** Strip HTML/scripts so schema text matches visible Q&A without markup. */
export function stripFaqHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeFaqSchemaItems(items: FaqSchemaItem[]): FaqSchemaItem[] {
  return items
    .map((item) => ({
      question: stripFaqHtml(item.question),
      answer: stripFaqHtml(item.answer),
    }))
    .filter((item) => item.question && item.answer)
}

/** Build FAQPage object. Returns null when no valid Q&A pairs. */
export function buildFaqPageJsonLd(items: FaqSchemaItem[]): FaqPageJsonLd | null {
  const entity = normalizeFaqSchemaItems(items)
  if (!entity.length) return null

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entity.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

/** Safe for inline <script type="application/ld+json"> (escape </script>). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
