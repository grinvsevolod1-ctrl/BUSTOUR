import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const sectionCard = readFileSync(join(process.cwd(), "components/admin/page-section-card.tsx"), "utf8")
const settingsForm = readFileSync(join(process.cwd(), "components/admin/settings-form.tsx"), "utf8")

assert.ok(sectionCard.includes("aria-expanded={!collapsed}"), "page section card has disclosure aria-expanded")
assert.ok(sectionCard.includes("aria-controls={`sec-${sectionId}-body`}"), "page section card wires body id")
assert.ok(sectionCard.includes("setCollapsed"), "page section card can collapse without changing visibility")
assert.ok(settingsForm.includes("CollapsibleSettingsGroup"), "settings groups render as collapsible cards")
assert.ok(settingsForm.includes("window.sessionStorage.setItem"), "settings group collapse state is persisted per session")
assert.ok(settingsForm.includes("aria-expanded={open}"), "settings group disclosure has aria-expanded")

console.log("admin-collapsible-sections.selfcheck: ok")