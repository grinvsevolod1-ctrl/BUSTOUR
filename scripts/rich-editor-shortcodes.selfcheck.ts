/**
 * Rich editor toolbar: shortcodes picker, no link button.
 * Run: npx tsx scripts/rich-editor-shortcodes.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const editor = readFileSync(join(root, "components/admin/rich-editor.tsx"), "utf8")
const picker = readFileSync(join(root, "components/admin/shortcode-picker-dialog.tsx"), "utf8")
const actions = readFileSync(join(root, "app/admin/shortcode-actions.ts"), "utf8")

// Rich toolbar must have Ссылка button
assert.match(editor, /label=["']Ссылка["']/, "toolbar must expose Ссылка button")
assert.match(editor, /<Link/, "Link icon present in toolbar")

// Shortcodes on toolbar
assert.match(editor, /label=["']Шорткоды["']/)
assert.match(editor, /ShortcodePickerDialog/)
assert.match(editor, /insertContent\(token\)/)

// Picker shows name, description, value; inserts token
assert.match(picker, /description/)
assert.match(picker, /getAllShortcodesAction/)
assert.match(picker, /aria-label/)
assert.match(picker, /const token = `\[\$\{row\.name\}\]`/)

// Any logged-in admin can list (managers use RichEditor)
const listFn = actions.match(/export async function getAllShortcodesAction\(\) \{[\s\S]*?\n\}/)?.[0] ?? ""
assert.match(listFn, /requireAdmin\(/)
assert.doesNotMatch(listFn, /requireCapability/)

console.log("rich-editor-shortcodes.selfcheck: ok")
