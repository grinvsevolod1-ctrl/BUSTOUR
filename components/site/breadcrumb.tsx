import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { expandShortcodes } from "@/lib/shortcodes"
import { getPublicSettings, getSiteOrigin } from "@/lib/cms"
import { serializeJsonLd } from "@/lib/faq-schema"

export async function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const settings = await getPublicSettings()
  const baseUrl = getSiteOrigin(settings)
  const resolved = await Promise.all(
    items.map(async (item) => ({
      ...item,
      label: await expandShortcodes(item.label),
    })),
  )

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: resolved.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  }

  return (
    <nav aria-label="Хлебные крошки" className="mb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {resolved.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.href ? (
              <Link href={item.href} className="hover:text-cyan-accent">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink">{item.label}</span>
            )}
            {i < resolved.length - 1 && <ChevronRight className="h-4 w-4" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  )
}
