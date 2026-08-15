import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const helper = readFileSync(join(root, "lib/sanitize-html.ts"), "utf8")
const rich = readFileSync(join(root, "components/site/rich-content.tsx"), "utf8")
const tabs = readFileSync(join(root, "components/site/info-tabs-content.tsx"), "utf8")
const resort = readFileSync(join(root, "components/site/resort-comparison-table.tsx"), "utf8")
const faq = readFileSync(join(root, "components/site/faq.tsx"), "utf8")

// Helper must exist with allowlist API
assert.match(helper, /export function sanitizeCmsHtml\(/)
// Dangerous patterns stripped in deny-list + allowlist
assert.match(helper, /<script|on\[a-z\]\+\s\*=|javascript:|style/)
// Must inject noopener for safe anchors
assert.match(helper, /noopener noreferrer/, "sanitizeCmsHtml must inject rel=noopener for <a href>")
// All 4 components must wrap their dangerouslySetInnerHTML with sanitizeCmsHtml
assert.match(rich, /sanitizeCmsHtml\(.*\)/, "rich-content.tsx must sanitize CMS HTML")
assert.match(tabs, /sanitizeCmsHtml\(.*\)/, "info-tabs-content.tsx must sanitize CMS HTML")
assert.match(resort, /sanitizeCmsHtml\(.*\)/, "resort-comparison-table.tsx must sanitize CMS HTML")
assert.match(faq, /sanitizeCmsHtml\(.*\)/, "faq.tsx must sanitize CMS HTML")

// Deny: direct raw unsanitized usage
assert.doesNotMatch(
  rich + tabs + resort + faq,
  /dangerouslySetInnerHTML=\{\{__html:\s*[a-z_][a-z0-9_]*\s*\}\}/i,
  "dangerouslySetInnerHTML must NOT pass a raw variable directly; wrap in sanitizeCmsHtml()",
)

console.log("security-xss-allowlist-sanitize checks passed")
