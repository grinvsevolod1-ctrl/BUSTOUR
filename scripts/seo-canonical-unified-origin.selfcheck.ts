import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const helper = readFileSync(join(root, "lib/canonical-origin.ts"), "utf8")
const seoMd = readFileSync(join(root, "lib/seo-metadata.ts"), "utf8")
const schema = readFileSync(join(root, "lib/site-schema.ts"), "utf8")
const sitemap = readFileSync(join(root, "app/sitemap.ts"), "utf8")

// Helper must have immutable single source of truth
assert.match(helper, /getCanonicalOrigin|canonicalOrigin/i, "canonical-origin helper must expose getCanonicalOrigin or CONSTANT")
assert.match(helper, /NEXT_PUBLIC_SITE_URL|process\.env\.NEXT_PUBLIC_SITE_URL/, "helper must derive origin solely from NEXT_PUBLIC_SITE_URL")
// Detect ACTUAL use (not just comments): never call a CMS/settings accessor to produce origin.
// Remove `// ...` line comments then check for forbidden CMS fallback tokens.
const helperCodeOnly = helper.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
assert.doesNotMatch(helperCodeOnly, /settings\[["']site\.url|getSiteOrigin|from\s*["']@\/lib\/cms/, "canonical-origin helper must never import CMS or read settings['site.url'] — trust boundary")

// seo-metadata, site-schema, sitemap must all import from canonical-origin instead of ad-hoc SITE_URL/CMS site.url
assert.match(seoMd, /from\s*"@\/lib\/canonical-origin"/, "seo-metadata.ts must import canonical origin from helper")
assert.match(sitemap, /from\s*"@\/lib\/canonical-origin"/, "sitemap.ts must import canonical origin from helper")
assert.match(schema, /from\s*"@\/lib\/canonical-origin"/, "site-schema.ts must import canonical origin from helper")

// site-schema must NOT read `site.url` inside JSON-LD @id or url fields
assert.doesNotMatch(
  schema,
  /["'@id["']:.*site\.url|site\.url.*["'@id["']|["'url["']:\s*site\.url/,
  "site-schema JSON-LD must never take url/@id from CMS site.url — trust boundary violation",
)

console.log("seo-canonical-unified-origin checks passed")
