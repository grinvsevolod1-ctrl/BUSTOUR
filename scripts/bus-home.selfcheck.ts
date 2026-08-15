import assert from "node:assert/strict"
import { busHomePageConfig } from "../lib/admin-config"

const page = busHomePageConfig()
assert.equal(page.url, "/avtobusnye-tury/")
assert.ok(page.sections?.every((s) => s.key.startsWith("bustours.")))
assert.ok(page.groups.some((g) => g.heading === "SEO и мета"))
assert.ok(page.groups.some((g) => g.heading === "Шапка страницы"))
assert.ok(!page.groups.some((g) => g.heading === "Основные данные"))
assert.ok(!JSON.stringify(page).includes("Slug (URL)"))
console.log("bus-home.selfcheck ok")
