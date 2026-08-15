import assert from "node:assert/strict"
import {
  aviaCityPageConfig,
  aviaCountryPageConfig,
  aviaHomePageConfig,
  hotCityPageConfig,
  hotCountryPageConfig,
  hotHomePageConfig,
  pageHeaderFields,
  pageSettingsGroups,
} from "../lib/admin-config"

const header = pageHeaderFields("demo")
assert.deepEqual(
  header.map((f) => f.label),
  ["Заголовок", "Вводный абзац"],
)
assert.equal(header.find((f) => f.label === "Заголовок")?.type, "shortcode-input")
assert.equal(header.find((f) => f.label === "Вводный абзац")?.type, "richtext")

const configs = [
  aviaHomePageConfig(),
  aviaCountryPageConfig("turciya", "Турция"),
  aviaCityPageConfig("antalya", "Анталья"),
  hotHomePageConfig(),
  hotCountryPageConfig("egipet", "Египет"),
  hotCityPageConfig("hurgada", "Хургада"),
  pageSettingsGroups.rental,
]

for (const page of configs) {
  const group = page.groups.find((g) => g.heading === "Шапка страницы")
  assert.ok(group, `missing Шапка in ${page.heading}`)
  assert.deepEqual(
    group!.fields.map((f) => f.label),
    ["Заголовок", "Вводный абзац"],
    page.heading,
  )
  assert.ok(
    !group!.fields.some((f) => f.type === "media" || f.key.endsWith(".image") || f.key.endsWith(".imageAlt")),
    `image fields still in ${page.heading}`,
  )
  assert.equal(
    group!.fields.find((f) => f.label === "Вводный абзац")?.type,
    "richtext",
    page.heading,
  )
}

console.log("page-header-admin.selfcheck: ok")
