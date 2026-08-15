/**
 * Expand shortcodes in content blocks (FAQ / resort tables).
 * Run: npx tsx scripts/expand-content-blocks.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseShortcodes } from "../lib/shortcodes"

const dict = { Y: "2026" }
assert.equal(parseShortcodes("Год [Y]", dict), "Год 2026")
assert.equal(parseShortcodes("<p>[Y]</p>", dict), "<p>2026</p>")

const expand = readFileSync(join(process.cwd(), "lib/expand-content-blocks.ts"), "utf8")
assert.match(expand, /expandContentBlocks/)
assert.match(expand, /expandSettingsValues/)
assert.match(expand, /extra/)

const faq = readFileSync(join(process.cwd(), "components/site/ordered-faq-section.tsx"), "utf8")
assert.match(faq, /expandContentBlocks/)
assert.match(faq, /OrderedFaqSection/)
assert.match(faq, /FaqJsonLd/)

const cmsLib = readFileSync(join(process.cwd(), "lib/cms.ts"), "utf8")
assert.match(cmsLib, /getPublicSettings/)


const extras = readFileSync(join(process.cwd(), "components/site/page-extras.tsx"), "utf8")
assert.match(extras, /expandContentBlocks/)
assert.match(extras, /FaqJsonLd/)

const wrapper = readFileSync(join(process.cwd(), "components/site/resort-comparison-blocks.tsx"), "utf8")
assert.match(wrapper, /expandContentBlocks/)

const schemaUi = readFileSync(join(process.cwd(), "components/site/faq-json-ld.tsx"), "utf8")
assert.match(schemaUi, /buildFaqPageJsonLd/)
assert.match(schemaUi, /application\/ld\+json/)

const schemaLib = readFileSync(join(process.cwd(), "lib/faq-schema.ts"), "utf8")
assert.match(schemaLib, /FAQPage/)
assert.match(schemaLib, /acceptedAnswer/)

const media = readFileSync(join(process.cwd(), "components/admin/media-explorer.tsx"), "utf8")
assert.match(media, /event\.target !== event\.currentTarget/)

const grid = readFileSync(join(process.cwd(), "components/admin/editor/media-grid-extension.tsx"), "utf8")
assert.match(grid, /isolating:\s*false/)
assert.match(grid, /createGapCursor:\s*true/)
assert.match(grid, /extendNodeSchema/)

const cmsActions = readFileSync(join(process.cwd(), "app/admin/cms-actions.ts"), "utf8")
assert.match(cmsActions, /media-upload/)
assert.match(cmsActions, /typeof value !== "string"/)

const editor = readFileSync(join(process.cwd(), "components/admin/rich-editor.tsx"), "utf8")
assert.match(editor, /Загрузка редактора[\s\S]*name=\{name\}/)
assert.match(editor, /onCreate/)

console.log("expand-content-blocks.selfcheck: ok")
