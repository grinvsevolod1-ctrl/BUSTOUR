import type { CityCategory, CityDestination } from "@/lib/types"
import { ResortCardsCarousel, type ResortCardItem } from "@/components/site/resort-cards-carousel"
import { resolveResortCardsLayout } from "@/lib/resort-cards-settings"
import { expandShortcodes } from "@/lib/shortcodes"

type CityCard = Pick<CityDestination, "slug" | "name"> & { country?: string }

type ResortCardsProps = {
  cities: CityCard[]
  /** Shared prefix before city slug, e.g. `/aviatury/egipet` */
  basePath?: string
  /** Per-city href when cities span countries (home pages). */
  hrefForCity?: (city: CityCard) => string
  category: CityCategory
  settings: Record<string, string>
  /** Settings key prefix, e.g. `hot` or `country:avia:egipet` — for cities.rows / cities.paginate */
  settingsPrefix?: string
  /** Index pages show countries; country pages show cities (default). */
  cardKind?: "city" | "country"
}

function cardImage(
  settings: Record<string, string>,
  category: CityCategory,
  slug: string,
  kind: "city" | "country",
): string | undefined {
  if (kind === "country") {
    return (
      settings[`country:${category}:${slug}.image`] ||
      settings[`country:${category}:${slug}.metaImage`] ||
      undefined
    )
  }
  return (
    settings[`city:${category}:${slug}.image`] ||
    settings[`city:${category}:${slug}.metaImage`] ||
    undefined
  )
}

/** Server wrapper: resolve hrefs/images/layout, then hand plain data to client carousel. */
export async function ResortCards({
  cities,
  basePath,
  hrefForCity,
  category,
  settings,
  settingsPrefix,
  cardKind = "city",
}: ResortCardsProps) {
  const items: ResortCardItem[] = await Promise.all(
    cities.map(async (city) => {
      const image = cardImage(settings, category, city.slug, cardKind)
      const href = hrefForCity?.(city) ?? `${basePath ?? ""}/${city.slug}/`
      const name = await expandShortcodes(city.name)
      return { slug: city.slug, name, href, image }
    }),
  )

  const layout = resolveResortCardsLayout(settings, settingsPrefix)

  return (
    <ResortCardsCarousel items={items} rows={layout.rows} paginate={layout.paginate} />
  )
}
