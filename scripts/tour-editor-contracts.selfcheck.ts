import assert from "node:assert/strict"
import { defaultTourSections, resolveTourLayout } from "@/lib/tour-sections"
import { resolveBusTourDestinationIds } from "@/lib/tour-destinations"
import { readFileSync } from "node:fs"

assert.ok(defaultTourSections.some((s) => s.key === "gallery"))
assert.ok(defaultTourSections.some((s) => s.key === "faq"))
assert.deepEqual(resolveTourLayout(undefined).map((s) => s.key), defaultTourSections.map((s) => s.key))
assert.deepEqual(resolveTourLayout([]), [], "explicit empty layout must remain empty")
const renamed = resolveTourLayout([{ key: "dates", label: "График выездов", visible: false }])
assert.deepEqual(renamed, [{ key: "dates", label: "График выездов", visible: false }])

const countries = [{ id: 1, name: "Россия", slug: "rossiya", category: "bus" as const, intro: "", seoHtml: "", sortOrder: 0, archived: false }]
const cities = [{ id: 10, name: "Москва", slug: "moskva", category: "bus" as const, country: "Россия", countryId: 1, intro: "", sections: [], seoHtml: "", sortOrder: 0, archived: false }]
assert.deepEqual(resolveBusTourDestinationIds("1", "10", countries, cities), { countryId: 1, arrivalCityId: 10 })
assert.match(resolveBusTourDestinationIds("1", "", countries, cities).error ?? "", /город/i)
assert.match(resolveBusTourDestinationIds("1", "999", countries, cities).error ?? "", /город/i)
const types = readFileSync("lib/types.ts", "utf8")
const actions = readFileSync("app/admin/actions.ts", "utf8")
const form = readFileSync("components/admin/tour-form.tsx", "utf8")
assert.match(types, /program:\s*\{\s*day:\s*string;\s*text:\s*string;\s*dayStart\?:\s*number;\s*dayEnd\?:\s*number\s*\}\[\]/)
assert.match(actions, /return \{ day, text, dayStart, dayEnd \}/)
assert.match(form, /value=\{day\.dayStart\s*\?\?\s*""\}/)
assert.match(form, /value=\{day\.dayEnd\s*\?\?\s*""\}/)
assert.match(form, /onChange=\{\(event\)\s*=>\s*updateProgram/)
assert.doesNotMatch(form, /name="programDayStart"[\s\S]{0,160}defaultValue=/)
console.log("tour-editor-contracts.selfcheck: ok")
