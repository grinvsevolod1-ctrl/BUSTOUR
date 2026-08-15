import { readFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8")
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }

function sectionConfigBody(source: string, functionName: string) {
  const fnStart = source.indexOf(`function ${functionName}`)
  assert(fnStart >= 0, `admin config function not found: ${functionName}`)
  const sectionsStart = source.indexOf("sections: [", fnStart)
  const sectionsEnd = source.indexOf("],", sectionsStart)
  assert(sectionsStart >= 0 && sectionsEnd >= 0, `sections array not found in ${functionName}`)
  return source.slice(sectionsStart, sectionsEnd)
}

const adminConfig = read("lib/admin-config.ts")
const busConfig = sectionConfigBody(adminConfig, "busHomePageConfig")
assert(busConfig.includes(".section.search") && busConfig.includes("Поиск и список туров"), "bus admin order must expose the catalog search section")

for (const rel of [
  "app/(site)/avtobusnye-tury/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/page.tsx",
  "app/(site)/avtobusnye-tury/[countrySlug]/[citySlug]/page.tsx",
]) {
  const source = read(rel)
  assert(source.includes("PublicToursListing"), `${rel} must render the bus catalog filters`)
  assert(source.includes('category="bus"'), `${rel} must scope the catalog to bus tours`)
}

for (const rel of [
  "app/(site)/aviatory/page.tsx",
  "app/(site)/aviatory/[countrySlug]/page.tsx",
  "app/(site)/aviatory/[countrySlug]/[citySlug]/page.tsx",
]) {
  assert(read(rel).includes("AviaTourSearchWidget"), `${rel} must keep the Tourvisor avia search widget`)
}

for (const rel of [
  "app/(site)/hot/page.tsx",
  "app/(site)/hot/[countrySlug]/page.tsx",
  "app/(site)/hot/[countrySlug]/[citySlug]/page.tsx",
]) {
  const source = read(rel)
  assert(source.includes("HotToursWidget") && source.includes("AviaTourSearchWidget"), `${rel} must keep the configured Tourvisor hot/avia widget`)
  assert(source.includes('settings["hot.widget"] === "avia"'), `${rel} must select the configured hot search widget`)
}

console.log("catalog-search-section selfcheck ok")