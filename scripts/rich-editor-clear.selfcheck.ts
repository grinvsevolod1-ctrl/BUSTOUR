import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const editor = read("components/admin/rich-editor.tsx")
const action = read("app/admin/cms-actions.ts")

assert.match(editor, /__rich_dirty:\$\{name\}/, "RichEditor marks intentional changes")
assert.match(action, /formData\.get\(`__rich_dirty:\$\{key\}`\) === "1"/, "server accepts intentional clears")
assert.match(action, /delete entries\[key\]/, "server still ignores unchanged empty rich text")

console.log("rich-editor-clear.selfcheck: ok")