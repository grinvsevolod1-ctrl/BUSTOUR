// T1: Все страны/города с visible=true в CMS (bus) показываются в sidebar + filter dropdown БЕЗ фильтра "только с активными турами".
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const listing = readFileSync("components/site/tours-listing.tsx", "utf8")

// RED assertion #1: countryOptions в tours-listing НЕ должен содержать fromTours filter intersect.
// Старый код: const ordered = visibleCountryNames.filter((name) => fromTours.has(name))
// Ожидается: visibleCountryNames используется как есть (порядок CMS) без fromTours intersect.
const hasBadFromToursIntersect = /visibleCountryNames\.filter\(\(name\) => fromTours\.has\(name\)\)/.test(listing)
assert.ok(!hasBadFromToursIntersect, "FAIL T1a: countryOptions всё ещё скрывает visible страны с 0 турами через fromTours intersect")

// RED assertion #2: countryOptions должен возвращать visibleCountryNames как базу (порядок CMS), fromTours можно добавить только как append если нет в visible
const usesVisibleBaseOnly = /ordered = \[...visibleCountryNames\]/.test(listing) || /const ordered = visibleCountryNames/.test(listing)
assert.ok(usesVisibleBaseOnly, "FAIL T1b: countryOptions берёт visibleCountryNames как первичную базу (без скрытия отфильтрованных by fromTours)")

// RED assertion #3: dropdown destinationOptions содержит visible страны даже если нет туров (filter bar Куда)
const optionsIsCountry = /destinationOptions = useMemo\(\s*\(\) => \[ALL_DESTINATIONS, \.\.\.countryOptions\]/.test(listing)
assert.ok(optionsIsCountry, "FAIL T1c: destinationOptions в filter bar = [ALL, ...countryOptions]")

// RED assertion #4: sidebar ToursSidebar получает тот же countryOptions (без fromTours filter) для отображения
const sidebarPropsCorrect = /<ToursSidebar[\s\S]{0,400}options=\{countryOptions\}/.test(listing)
assert.ok(sidebarPropsCorrect, "FAIL T1d: ToursSidebar получает options={countryOptions} без hidden по fromTours")

console.log("PASS T1 catalog-empty-show: sidebar + filter показывают все visible страны из CMS независимо от количества активных туров")
