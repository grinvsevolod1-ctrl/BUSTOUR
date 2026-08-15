/**
 * #26 sticky-save wipe guards (static).
 * Run: npx tsx scripts/city-wipe-sticky-save.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const cms = readFileSync(join(root, "app/admin/cms-actions.ts"), "utf8")
const editor = readFileSync(join(root, "components/admin/rich-editor.tsx"), "utf8")
const section = readFileSync(join(root, "components/admin/section-fields-form.tsx"), "utf8")
const pageForm = readFileSync(join(root, "components/admin/page-settings-form.tsx"), "utf8")
const mediaField = readFileSync(join(root, "components/admin/setting-media-field.tsx"), "utf8")
const uploader = readFileSync(join(root, "components/admin/media-uploader.tsx"), "utf8")

assert.match(cms, /media-upload/)
assert.match(cms, /typeof value !== "string"/)
assert.ok(cms.includes("delete entries[key]"), "delete empty richtext keys")
assert.match(cms, /seoHtml\\d\*\|intro/)
assert.doesNotMatch(cms, /Заполните SEO-текст/)

assert.match(editor, /don't wipe FormData/)
assert.match(editor, /if \(!next && defaultValue\) return/)

assert.match(pageForm, /PageSettingsFormContextValue/)
assert.match(pageForm, /formId/)
assert.match(section, /form=\{pageForm\.formId\}/)
assert.match(section, /form=\{form\}/)
assert.match(mediaField, /form\?: string/)
assert.doesNotMatch(uploader, /name=["']media-upload["']/)

console.log("city-wipe-sticky-save.selfcheck: ok")
