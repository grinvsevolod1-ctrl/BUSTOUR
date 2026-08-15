import type { MetadataRoute } from "next"
import { getVisibleTours, getArticles, getSlugMaps, getBuses } from "@/lib/queries"
import { getCountries } from "@/lib/countries"
import { getCityDestinations } from "@/lib/cities"
import { getSettings } from "@/lib/cms"
import { resolveAviaSlug } from "@/lib/avia-slug"
import { tourUrl } from "@/lib/tour-url"
import { articleUrl } from "@/lib/article-url"
import { LEGAL_SLUGS, legalPages } from "@/lib/legal-pages"
import { absoluteUrl, sitemapCountryPaths } from "@/lib/seo-metadata"
import { getCanonicalOrigin } from "@/lib/canonical-origin"
import {
  filterCitiesForSitemap,
  filterCountriesForSitemap,
} from "@/lib/sitemap-visibility"

const CANONICAL_BASE_URL = getCanonicalOrigin()
export const dynamic = "force-dynamic"

function staticSitemapEntries(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.BUSTOUR_SKIP_DB_BUILD === "1") {
    return staticSitemapEntries()
  }
  const [tours, articles, slugMaps, countriesRaw, busCitiesRaw, aviaCitiesRaw, hotCitiesRaw, buses, settings] =
    await Promise.all([
      getVisibleTours(),
      getArticles(),
      getSlugMaps(),
      getCountries(),
      getCityDestinations("bus"),
      getCityDestinations("avia"),
      getCityDestinations("hot"),
      getBuses(),
      getSettings(),
    ])

  const countries = filterCountriesForSitemap(countriesRaw, settings)
  const busCities = filterCitiesForSitemap(busCitiesRaw, settings)
  const aviaCities = filterCitiesForSitemap(aviaCitiesRaw, settings)
  const hotCities = filterCitiesForSitemap(hotCitiesRaw, settings)

  const aviaSlugRaw = settings["aviatory.slug"]
  const aviaPrefix = `/${resolveAviaSlug(aviaSlugRaw)}`

  const staticRoutes = [
    "",
    "/avtobusnye-tury/",
    `${aviaPrefix}/`,
    "/hot/",
    "/bus-rental",
    "/company",
    "/company/staff",
    "/company/licenses",
    "/info",
    "/info/transfers",
    "/info/dictionary",
    "/contacts",
    "/testimonials",
    ...LEGAL_SLUGS.map((slug) => legalPages[slug].path),
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route || "/"),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }))

  const countryEntries: MetadataRoute.Sitemap = sitemapCountryPaths(countries, aviaSlugRaw).map(
    (path) => ({
      url: absoluteUrl(path),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }),
  )

  const busCityEntries: MetadataRoute.Sitemap = busCities.flatMap((city) => {
    const countrySlug = slugMaps.countrySlugById[city.countryId]
    if (!countrySlug) return []
    return [
      {
        url: absoluteUrl(`/avtobusnye-tury/${countrySlug}/${city.slug}/`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ]
  })

  const aviaCityEntries: MetadataRoute.Sitemap = aviaCities.flatMap((city) => {
    const countrySlug = slugMaps.countrySlugById[city.countryId]
    if (!countrySlug) return []
    return [
      {
        url: absoluteUrl(`${aviaPrefix}/${countrySlug}/${city.slug}/`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ]
  })

  const hotCityEntries: MetadataRoute.Sitemap = hotCities.flatMap((city) => {
    const countrySlug = slugMaps.countrySlugById[city.countryId]
    if (!countrySlug) return []
    return [
      {
        url: absoluteUrl(`/hot/${countrySlug}/${city.slug}/`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ]
  })

  const tourEntries: MetadataRoute.Sitemap = tours.flatMap((t) => {
    const path = tourUrl({
      tourSlug: t.slug,
      countrySlug: slugMaps.countrySlugById[t.countryId],
      citySlug: slugMaps.citySlugById[t.arrivalCityId],
    })
    if (!path) return []
    return [
      {
        url: `${CANONICAL_BASE_URL}${path}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ]
  })

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: absoluteUrl(articleUrl(a)),
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  const busEntries: MetadataRoute.Sitemap = buses.map((bus) => ({
    url: absoluteUrl(`/bus-rental/${bus.slug}`),
    changeFrequency: "weekly",
    priority: 0.65,
  }))

  return [
    ...staticEntries,
    ...countryEntries,
    ...busCityEntries,
    ...aviaCityEntries,
    ...hotCityEntries,
    ...tourEntries,
    ...articleEntries,
    ...busEntries,
  ]
}
