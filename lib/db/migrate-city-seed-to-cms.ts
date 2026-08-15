/**
 * One-shot: copy city_destinations / countries seed body into CMS settings, then clear entity columns.
 * Public pages read CMS only (#15–#17).
 * Uses db directly (no getSettings/saveSettings) — called from inside ensureDb.
 */
import { eq } from "drizzle-orm"
import { db } from "./index"
import { cityDestinations, countries, settings } from "./schema"
import {
  flattenCitySectionsToHtml,
  parseCitySectionsJson,
} from "../catalog-cms-content"

const FLAG = "migration.citySeedContentToCms"

async function loadSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

async function upsertSettings(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
  }
}

export async function migrateCitySeedContentToCms() {
  const flag = await db.select().from(settings).where(eq(settings.key, FLAG)).limit(1)
  if (flag[0]?.value === "1") return

  const site = await loadSettingsMap()
  const updates: Record<string, string> = {}

  const cities = await db.select().from(cityDestinations)
  for (const city of cities) {
    const p = `city:${city.category}:${city.slug}`
    if (!String(site[`${p}.intro`] ?? "").trim() && city.intro?.trim()) {
      updates[`${p}.intro`] = city.intro
    }
    if (!String(site[`${p}.seoHtml`] ?? "").trim()) {
      if (city.seoHtml?.trim()) {
        updates[`${p}.seoHtml`] = city.seoHtml
      } else {
        const sections = parseCitySectionsJson(city.sections)
        if (sections.length) {
          updates[`${p}.seoHtml`] = flattenCitySectionsToHtml(sections)
          if (!String(site[`${p}.seoTitle`] ?? "").trim() && sections[0]?.title?.trim()) {
            updates[`${p}.seoTitle`] = sections[0].title.trim()
          }
        }
      }
    }
  }

  const countryRows = await db.select().from(countries)
  for (const country of countryRows) {
    const p = `country:${country.category}:${country.slug}`
    if (!String(site[`${p}.intro`] ?? "").trim() && country.intro?.trim()) {
      updates[`${p}.intro`] = country.intro
    }
    if (!String(site[`${p}.seoHtml`] ?? "").trim() && country.seoHtml?.trim()) {
      updates[`${p}.seoHtml`] = country.seoHtml
    }
  }

  if (Object.keys(updates).length) {
    await upsertSettings(updates)
  }

  for (const city of cities) {
    if (!city.intro && city.sections === "[]" && !city.seoHtml) continue
    await db
      .update(cityDestinations)
      .set({ intro: "", sections: "[]", seoHtml: "" })
      .where(eq(cityDestinations.id, city.id))
  }
  for (const country of countryRows) {
    if (!country.intro && !country.seoHtml) continue
    await db
      .update(countries)
      .set({ intro: "", seoHtml: "" })
      .where(eq(countries.id, country.id))
  }

  await upsertSettings({ [FLAG]: "1" })
}
