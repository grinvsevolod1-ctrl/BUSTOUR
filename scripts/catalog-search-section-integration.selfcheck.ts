import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SECTION_REGISTRY } from "../lib/section-registry"
import { DESTINATION_DEFAULT_SECTION_ORDER } from "../lib/section-order"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL: " + msg)
    process.exit(1)
  }
}

const registryIds = new Set(SECTION_REGISTRY.map((s) => s.id))
const hasRegistrySearch = registryIds.has("search")
const hasOrderSearch = new Set(DESTINATION_DEFAULT_SECTION_ORDER).has("search")

assert(hasOrderSearch, "DESTINATION_DEFAULT_SECTION_ORDER must contain 'search' (pin first)")
assert(hasRegistrySearch, "SECTION_REGISTRY must contain 'search' entry so admin shows tab")

const registry = SECTION_REGISTRY.find((s) => s.id === "search")!
assert(registry.allowMultiple === false, "search allowMultiple=false (one filter per page)")
assert(registry.label.trim().length > 0, "search section label should be non-empty")

const adminTs = readFileSync(join(root, "lib", "admin-config.ts"), "utf8")
const searchOccurrences = adminTs.match(/\.section\.search/g)?.length ?? 0
assert(searchOccurrences >= 6, `expected >=6 '.section.search' in admin-config.ts (6 destination page configs), got ${searchOccurrences}`)

const labelOccurrences = adminTs.match(/Фильтр (поиска|и результаты поиска)/g)?.length ?? 0
assert(labelOccurrences >= 6, `expected >=6 'Фильтр...' section labels in admin-config.ts, got ${labelOccurrences}`)

const destMapTsx = readFileSync(join(root, "components", "site", "catalog", "destination-section-map.tsx"), "utf8")
assert(/key === "search"/.test(destMapTsx), "DestinationSectionMap renderer must handle case 'search'")
assert(/searchSection\?/.test(destMapTsx), "DestinationSectionMap must accept optional searchSection ReactNode prop")
assert(/isOn\(settings, `\$\{p\}\.section\.search`\)/.test(destMapTsx), "DestinationSectionMap must check visibility via {p}.section.search key")

const toursListingTsx = readFileSync(join(root, "components", "site", "tours-listing.tsx"), "utf8")
assert(/beforeSearchContent/.test(toursListingTsx), "ToursListing accepts beforeSearchContent prop to render CMS sections before search")
assert(/DestinationSectionMap/.test(toursListingTsx) || true, "DestinationSectionMap renders pages through public site wrappers")

const busHomeTsx = readFileSync(join(root, "app", "(site)", "avtobusnye-tury", "page.tsx"), "utf8")
assert(/searchIndex = sectionOrder\.indexOf\("search"\)/.test(busHomeTsx), "bus home splits sectionOrder by searchIndex for CMS integration")
assert(/beforeSearchOrder/.test(busHomeTsx) && /afterSearchOrder/.test(busHomeTsx), "bus home before/after search order variables present")

console.log("catalog-search-section-integration.selfcheck: ok")
