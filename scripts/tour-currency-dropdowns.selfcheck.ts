// T2: Tour edit form - валюты выбираются select/dropdown из админского списка currencies вместо статичных текстовых инпутов.
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const additional = readFileSync("components/admin/tour-additional-block.tsx", "utf8")
const tourForm = readFileSync("components/admin/tour-form.tsx", "utf8")
const actions = readFileSync("app/admin/actions.ts", "utf8")
const queries = readFileSync("lib/queries.ts", "utf8")

// T2a: TourAdditionalBlock принимает currencies проп
assert.ok(/currencies\?.*Currency\[\]/.test(additional) || /props.*currencies.*=/.test(additional) || /currencies=\{currencies\}/.test(tourForm),
  "FAIL T2a: TourAdditionalBlock должен принимать currencies проп (массив админских валют)")

// T2b: Базовая цена рядом - select (dropdown) name="datesCurrency" вместо статичного <span>{currencyCode}</span>
const hasDatesCurrencySelect = /<[Ss]elect[^>]*name=["']datesCurrency["']|<option.*currencies\[\w+\]\.code/.test(additional)
assert.ok(hasDatesCurrencySelect, "FAIL T2b: Рядом с базовой ценой select/dropdown name=datesCurrency вместо статичного спана кода валюты")

// T2c: Валюта доп цены - <Select> или <select> вместо <Input name="extraPriceCurrency"
const extraCurrencyNoInput = !/Input[^>]*name=["']extraPriceCurrency["']/.test(additional)
const extraCurrencySelect = /select[^>]*extraPriceCurrency|Select[^>]*name=["']extraPriceCurrency/.test(additional)
  || /option.*extraPriceCurrency|name=["']extraPriceCurrency["'][\s\S]{0,200}option/.test(additional)
assert.ok(extraCurrencyNoInput && extraCurrencySelect,
  "FAIL T2c: extraPriceCurrency - заменить Input на select/dropdown со списком валют из админки")

// T2d: tour-form передаёт currencies={currencies} + datesCurrency в TourAdditionalBlock
const passesCurrencies = /TourAdditionalBlock[\s\S]{0,300}currencies=\{currencies\}/.test(tourForm)
  || /<TourAdditionalBlock[\s\S]{0,500}currencies=\{/.test(tourForm)
assert.ok(passesCurrencies, "FAIL T2d: TourForm -> TourAdditionalBlock передаёт currencies={currencies} + datesCurrency")

// T2e: saveTourAction/tourFromForm валидирует datesCurrency и extraPriceCurrency в whitelist currencies кодов
const validatesDatesCurrency = /datesCurrency.*currencies\.(find|some)|currencies\.find\([\s\S]*datesCurrency/.test(actions)
  || /(datesCurrency|extraPriceCurrency)\s*=\s*String\(formData\.get\([^)]+\)[\s\S]{0,120}(base\.code|default)/.test(actions)
assert.ok(validatesDatesCurrency, "FAIL T2e: actions.ts tourFromForm валидирует datesCurrency + extraPriceCurrency по whitelist currencies")

// T2f: TourInput в queries.ts содержит datesCurrency (сохраняем в БД tours.datesCurrency)
const tourInputHasDatesCurrency = /(TourInput|serializeTour|createTour|updateTour)[\s\S]{0,400}datesCurrency/.test(queries)
assert.ok(tourInputHasDatesCurrency, "FAIL T2f: TourInput/serialize содержит datesCurrency (чтобы сохранялся в tours.datesCurrency)")

console.log("PASS T2 tour-currencies: datesCurrency + extraPriceCurrency это dropdown-ы с admin-списком, валидация whitelist, save в БД")
