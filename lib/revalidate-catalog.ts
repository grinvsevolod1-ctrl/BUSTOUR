import { revalidatePath } from "next/cache"

type CatalogCategory = "bus" | "avia" | "hot"

/** Live public catalog base path (not legacy /tours/*). */
export function catalogBasePath(category: CatalogCategory, aviaPrefix = "/aviatory"): string {
  if (category === "bus") return "/avtobusnye-tury"
  if (category === "hot") return "/hot"
  return (aviaPrefix.replace(/\/$/, "") || "/aviatory")
}

/** Invalidate home + optional country/city URLs for a catalog destination. */
export function revalidateCatalogDestination(opts: {
  category: CatalogCategory
  countrySlug?: string | null
  citySlug?: string | null
  aviaPrefix?: string
}) {
  const base = catalogBasePath(opts.category, opts.aviaPrefix)
  revalidatePath(base)
  revalidatePath(`${base}/`)
  if (opts.countrySlug) {
    revalidatePath(`${base}/${opts.countrySlug}`)
    revalidatePath(`${base}/${opts.countrySlug}/`)
  }
  if (opts.countrySlug && opts.citySlug) {
    revalidatePath(`${base}/${opts.countrySlug}/${opts.citySlug}`)
    revalidatePath(`${base}/${opts.countrySlug}/${opts.citySlug}/`)
  }
}
