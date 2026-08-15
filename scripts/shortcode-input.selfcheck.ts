import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const input = readFileSync(join(root, "components/admin/shortcode-input.tsx"), "utf8")
const grid = readFileSync(join(root, "components/admin/section-fields-form.tsx"), "utf8")
const config = readFileSync(join(root, "lib/admin-config.ts"), "utf8")
const css = readFileSync(join(root, "app/globals.css"), "utf8")

assert.match(input, /editor\.getText\(\{ blockSeparator: "\\n" \}\)/)
assert.doesNotMatch(input, /getHTML/)
assert.match(input, /event\.key === "Enter"/)
assert.match(input, /text\.replace\(\/\[\\r\\n\]\+\/g, " "\)/)
assert.match(input, /type="hidden"/)
assert.match(input, /shortcode-input--single/)
assert.match(input, /max-h-10/)
assert.match(input, /export function ShortcodeTextareaMultiline/)
assert.match(input, /multiline=\{false\}/)

assert.match(grid, /shortcode-textarea-multiline/)
assert.match(grid, /isShortcodeMultiline/)
assert.match(grid, /ShortcodeInput/)
assert.match(grid, /multiline=\{isShortcodeMultiline\}/)

assert.match(config, /type: "shortcode-textarea-multiline"/)
assert.match(config, /type: "shortcode-input"/)
assert.match(config, /alertText[\s\S]*?shortcode-textarea-multiline/)
assert.match(config, /label: "Заголовок", type: "shortcode-input"/)

assert.match(input, /__value/)
assert.match(input, /dispatchEvent\(new Event\("input"/)

const slug = readFileSync(join(root, "components/admin/slug-field.tsx"), "utf8")
assert.match(slug, /resolveSlugNameSource/)
assert.match(slug, /__value/)
assert.match(slug, /shortcode-input/)

const tourForm = readFileSync(join(root, "components/admin/tour-form.tsx"), "utf8")
assert.match(tourForm, /ShortcodeInput id="tour-title"/)

const articleForm = readFileSync(join(root, "components/admin/article-form.tsx"), "utf8")
assert.match(articleForm, /ShortcodeInput id=\{titleId\}/)

console.log("shortcode-input.selfcheck: ok")
