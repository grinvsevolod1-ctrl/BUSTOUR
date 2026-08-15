import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const archive = readFileSync(join(root, "app", "admin", "(protected)", "archive", "page.tsx"), "utf8")
const modal = readFileSync(join(root, "components", "admin", "preview-modal.tsx"), "utf8")

assert.match(archive, /<ArchivePreviewButton url=\{previewUrl\} label=\{label\} \/>/)
assert.doesNotMatch(archive, /previewUrl \? <ArchivePreviewButton/)
assert.match(modal, /<Eye[^>]*\/>\s*Предпросмотр/)
assert.match(modal, /disabled=\{!url\}/)

console.log("archive-preview-button.selfcheck: ok")
