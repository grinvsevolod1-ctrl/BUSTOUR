import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const read = (p: string) => readFileSync(join(root, p), "utf8")

const cmsActions = read("app/admin/cms-actions.ts")
assert.match(cmsActions, /bustours\.intro[\s\S]{0,300}minLength:\s*12/, "bus intro must be server-validated")
assert.match(cmsActions, /collection === "resort"[\s\S]{0,500}columns[\s\S]{0,500}rows/, "resort shape must be validated server-side")
assert.match(cmsActions, /return \{ ok: true[\s\S]{0,100}id:/, "embedded resort save returns structured result")
assert.doesNotMatch(cmsActions, /if \(returnTo\)[\s\S]{0,150}redirect\(returnTo\)/, "embedded resort save must not redirect")

const config = read("lib/admin-config.ts")
assert.doesNotMatch(config, /pageSlug.*Переопределить URL slug/, "country slug override must leave editor")

for (const path of ["app/admin/country-actions.ts", "app/admin/city-actions.ts"]) {
  const src = read(path)
  assert.match(src, /\.visible`\]: "0"/, `${path}: new destination explicitly hidden`)
}

for (const path of ["components/admin/country-form.tsx", "components/admin/city-form.tsx"]) {
  const src = read(path)
  for (const field of ["metaTitle", "metaDescription", "metaShortDesc", "metaImage", "h1", "intro"]) {
    assert.ok(src.includes(field), `${path}: create exposes ${field}`)
  }
}
for (const path of ["app/admin/country-actions.ts", "app/admin/city-actions.ts"]) {
  const src = read(path)
  assert.match(src, /destinationPageSettingsSchema\.safeParse/, `${path}: server validates destination settings`)
  assert.match(src, /redirect\(`\/admin\/(?:countries|cities)\/\$\{newId\}`\)/, `${path}: create redirects to editor`)
}
const validation = read("lib/validations/admin.ts")
assert.match(validation, /destinationPageSettingsSchema/, "shared destination page validation exists")
assert.match(validation, /metaTitle[\s\S]{0,150}metaDescription[\s\S]{0,150}metaShortDesc[\s\S]{0,150}metaImage[\s\S]{0,150}h1[\s\S]{0,150}intro/, "full SEO/header fields validated")

const resortBuilder = read("components/admin/resort-table-builder.tsx")
assert.match(resortBuilder, /state\?\.ok|saveCurrentTable\(\)\.ok|res\?\.ok|if \(r\?\.ok\)/, "table editor only closes after structured success (state.ok or awaited saveCurrentTable result)")
assert.doesNotMatch(resortBuilder, /requestAnimationFrame\(/, "table submit has no deferred fire-and-forget")

const pageSettingsForm = read("components/admin/page-settings-form.tsx")
assert.match(pageSettingsForm, /PageSettingsFormContextValue[\s\S]*registerDraft[\s\S]*requestSave[\s\S]*saving/, "page settings uses new draft coordinator contract")
assert.match(pageSettingsForm, /DraftContributor/, "page settings imports DraftContributor")
assert.doesNotMatch(pageSettingsForm, /registerStandaloneForm|standaloneSubmits|StandaloneSaveResult/, "old fire-and-forget API is removed")
assert.match(pageSettingsForm, /AdminSaveResult/, "page settings uses AdminSaveResult")
assert.match(pageSettingsForm, /savePromise\.current[\s\S]*partial:[\s\S]*commitBaseline/, "pipeline locks, reports partial saves, and commits baselines")
assert.match(pageSettingsForm, /const submitted = new FormData\(form\)[\s\S]*append\?\.\(submitted\)/, "aggregate append contributors contribute to unified FormData")
assert.match(pageSettingsForm, /for \(const contributor of contributors\)[\s\S]*await contributor\.save\(\)/, "independent child saves are awaited sequentially and stop on error")

for (const path of ["app/admin/(protected)/countries/[id]/page.tsx", "app/admin/(protected)/cities/[id]/page.tsx"]) {
  const src = read(path)
  assert.doesNotMatch(src, /extraFormIds=\{\["(?:country|city)-base-form"/, `${path}: base form is not fire-and-forget`)
}
const cityBase = read("components/admin/city-base-form.tsx")
assert.doesNotMatch(cityBase, /registerStandaloneForm|saveCityBaseAction/, "city base fields must not mutate before aggregate save")
assert.match(cityBase, /form=\{FORM_ID\}/, "city base fields attach to the aggregate form")
const cityPage = read("app/admin/(protected)/cities/[id]/page.tsx")
assert.match(cityPage, /saveAction=\{saveCityPageAction\}/, "city editor uses one atomic action")
const cityActions = read("app/admin/city-actions.ts")
assert.match(cityActions, /saveCityPageAction[\s\S]*saveCityAggregate/, "city page action commits through aggregate transaction")
assert.match(cityActions, /Описание страницы[\s\S]*fieldErrors/, "city errors identify the visible field without raw CMS-only copy")
const integrity = read("scripts/postgres-destination-integrity.selfcheck.ts")
assert.match(integrity, /LEFT JOIN/i)
assert.match(integrity, /read.only|read-only|transaction_read_only|READ ONLY/i)
assert.doesNotMatch(integrity, /ALTER TABLE|ADD CONSTRAINT|UPDATE |DELETE FROM/i)

console.log("destination-editor-contracts.selfcheck: ok")
