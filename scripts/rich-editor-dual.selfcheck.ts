/**
 * Dual rich editor (classic / blocks) switch.
 * Run: npx tsx scripts/rich-editor-dual.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const editor = readFileSync(join(process.cwd(), "components/admin/rich-editor.tsx"), "utf8")
assert.match(editor, /Редактор 1/)
assert.match(editor, /Редактор 2/)
assert.match(editor, /RichEditorVariant/)
assert.match(editor, /SlashCommands/)
assert.match(editor, /BubbleMenu/)
assert.match(editor, /BLOCKS_BUBBLE_OPTIONS/)
assert.match(editor, /docChanged/)
assert.match(editor, /selectionSet/)
assert.match(editor, /createRichEditorExtensions/)
assert.match(editor, /writeRichEditorVariant/)

const pref = readFileSync(
  join(process.cwd(), "components/admin/editor/rich-editor-preference.ts"),
  "utf8",
)
assert.match(pref, /bustour\.richEditor\.variant:/)

const slash = readFileSync(join(process.cwd(), "components/admin/editor/slash-command.tsx"), "utf8")
assert.match(slash, /char:\s*"\/"/)
assert.match(slash, /Сетка/)
assert.match(slash, /resolveSlashItems/)
assert.match(slash, /keywords/)
assert.match(slash, /getAllShortcodesAction/)

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  dependencies: Record<string, string>
}
assert.ok(pkg.dependencies["@tiptap/extension-placeholder"])
assert.ok(pkg.dependencies["@tiptap/suggestion"])
assert.ok(pkg.dependencies["tippy.js"])

console.log("rich-editor dual variant checks passed")
