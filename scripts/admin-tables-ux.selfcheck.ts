/**
 * Admin tables UX: no orphan «Секция «Таблица»» / resortsTitle fields;
 * title comes from resort block (ResortTableBuilder).
 */
import assert from "node:assert/strict"
import {
  aviaCityPageConfig,
  aviaCountryPageConfig,
  aviaHomePageConfig,
  hotCityPageConfig,
  hotCountryPageConfig,
  hotHomePageConfig,
} from "../lib/admin-config"
import { getBlockLabel } from "../lib/table-label"

const pages = [
  aviaHomePageConfig(),
  hotHomePageConfig(),
  aviaCityPageConfig("test", "Test"),
  aviaCityPageConfig("test", "Test", "bus"),
  hotCityPageConfig("test", "Test"),
  aviaCountryPageConfig("test", "Test", "avia"),
  aviaCountryPageConfig("test", "Test", "bus"),
  hotCountryPageConfig("test", "Test", "hot"),
]

for (const page of pages) {
  for (const group of page.groups) {
    assert.notEqual(
      group.heading,
      "Секция «Таблица»",
      `${page.heading}: orphan FormSection «Секция «Таблица»»`,
    )
    for (const field of group.fields) {
      assert.ok(
        !field.key.endsWith(".resortsTitle"),
        `${page.heading}: resortsTitle field ${field.key} — title from block`,
      )
    }
  }
  assert.ok(
    page.sections.some((s) => s.key.endsWith(".section.resorts")),
    `${page.heading}: resorts section required`,
  )
}

// Title source = block title (same as admin sectionTitles / site H2)
assert.equal(
  getBlockLabel({
    id: 1,
    collection: "resort",
    page: "x",
    title: "Сравнение курортов Египта",
    subtitle: "",
    body: "",
    icon: "",
    image: "",
    href: "",
    extra: { columns: ["A"], rows: [["1"]] },
    sortOrder: 0,
    visible: true,
  }),
  "Сравнение курортов Египта",
)

console.log("admin-tables-ux.selfcheck: ok")
