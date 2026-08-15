import { articleUrl } from "@/lib/article-url"
import { branchPublicPrefix } from "@/lib/admin-public-href"
import { stripArchivedSuffix } from "@/lib/archive-slug"
import { getCityById } from "@/lib/cities"
import { getSettings } from "@/lib/cms"
import { getCountryById } from "@/lib/countries"
import {
  getArticleById,
  getBusById,
  getTourById,
  getTransferById,
} from "@/lib/queries"
import { tourUrl } from "@/lib/tour-url"
import {
  PREVIEW_QUERY,
  signPreviewToken,
  type PreviewEntityType,
} from "@/lib/preview-token"

function withPreview(path: string, type: PreviewEntityType, id: number): string {
  const token = signPreviewToken({ type, id })
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}${PREVIEW_QUERY}=${encodeURIComponent(token)}`
}

/** Public catalog path for country (and city parent). Avia uses resolved public slug. */
export function previewCountryBasePath(
  category: "bus" | "avia" | "hot",
  countrySlug: string,
  aviaSlugRaw?: string | null,
): string {
  return `/${branchPublicPrefix(category, aviaSlugRaw)}/${countrySlug}/`
}

async function countryBasePath(
  category: "bus" | "avia" | "hot",
  countrySlug: string,
): Promise<string> {
  if (category !== "avia") return previewCountryBasePath(category, countrySlug)
  const settings = await getSettings()
  return previewCountryBasePath(category, countrySlug, settings["aviatory.slug"])
}

/**
 * Build a signed preview URL for an archived (or live) entity.
 * Returns null if the entity is missing.
 */
export async function generatePreviewUrl(
  entityType: PreviewEntityType,
  entityId: number,
): Promise<string | null> {
  switch (entityType) {
    case "tour": {
      const tour = await getTourById(entityId)
      if (!tour) return null
      const path = tourUrl({
        tourSlug: stripArchivedSuffix(tour.slug),
        countrySlug: stripArchivedSuffix(tour.countrySlug),
        citySlug: stripArchivedSuffix(tour.citySlug),
      })
      if (!path) return null
      return withPreview(path, "tour", tour.id)
    }
    case "bus": {
      const bus = await getBusById(entityId)
      if (!bus) return null
      return withPreview(`/bus-rental/${stripArchivedSuffix(bus.slug)}`, "bus", bus.id)
    }
    case "article": {
      const article = await getArticleById(entityId)
      if (!article) return null
      return withPreview(
        articleUrl({ ...article, slug: stripArchivedSuffix(article.slug) }),
        "article",
        article.id,
      )
    }
    case "transfer": {
      const transfer = await getTransferById(entityId)
      if (!transfer) return null
      return withPreview(
        `/info/transfers/${stripArchivedSuffix(transfer.slug)}`,
        "transfer",
        transfer.id,
      )
    }
    case "city": {
      const city = await getCityById(entityId)
      if (!city) return null
      const country = await getCountryById(city.countryId)
      if (!country?.slug) return null
      const countrySlug = stripArchivedSuffix(country.slug)
      const citySlug = stripArchivedSuffix(city.slug)
      if (!countrySlug || !citySlug) return null
      const base = await countryBasePath(city.category, countrySlug)
      return withPreview(`${base}${citySlug}/`, "city", city.id)
    }
    case "country": {
      const country = await getCountryById(entityId)
      if (!country) return null
      return withPreview(
        await countryBasePath(country.category, stripArchivedSuffix(country.slug)),
        "country",
        country.id,
      )
    }
    default:
      return null
  }
}
