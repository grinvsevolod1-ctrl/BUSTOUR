import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const currencies = readFileSync(join(process.cwd(), "app/admin/currency-actions.ts"), "utf8")
const countries = readFileSync(join(process.cwd(), "app/admin/country-actions.ts"), "utf8")
const cities = readFileSync(join(process.cwd(), "app/admin/city-actions.ts"), "utf8")

assert.match(currencies, /currency_refresh_nbrb/)
assert.match(countries, /country_(?:create|update)/)
assert.match(cities, /city_(?:create|update)/)

console.log("settings-direct-audit.selfcheck: ok")
