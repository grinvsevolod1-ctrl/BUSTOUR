/**
 * Shortcode UI wiring: TipTap highlight + RichContent parse.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const editor = readFileSync(join(process.cwd(), "components/admin/rich-editor.tsx"), "utf8")
assert.match(editor, /createRichEditorExtensions/)
assert.match(editor, /ShortcodePickerDialog/)
assert.match(editor, /label=["']Шорткоды["']/)
assert.match(editor, /label=["']Ссылка["']/, "link tool still present alongside shortcodes")

const shared = readFileSync(join(process.cwd(), "components/admin/editor/shared-extensions.ts"), "utf8")
assert.match(shared, /ShortcodeHighlight/)

const ext = readFileSync(join(process.cwd(), "components/admin/editor/shortcode-highlight.ts"), "utf8")
assert.match(ext, /shortcode-token/)
assert.match(ext, /\[a-zA-Z0-9\]\+/)

const rich = readFileSync(join(process.cwd(), "components/site/rich-content.tsx"), "utf8")
assert.match(rich, /parseShortcodes/)
assert.match(rich, /getShortcodesDict/)

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
assert.match(css, /\.shortcode-token/)

console.log("shortcodes-ui.selfcheck: ok")
