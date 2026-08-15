/** FAQPage JSON-LD for Google rich results. Answers must already be shortcode-expanded. */

import {
  buildFaqPageJsonLd,
  serializeJsonLd,
  type FaqSchemaItem,
} from "@/lib/faq-schema"

export type { FaqSchemaItem }

export function FaqJsonLd({ items }: { items: FaqSchemaItem[] }) {
  const data = buildFaqPageJsonLd(items)
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
