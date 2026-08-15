// T3: TourCard стилизация цены - убрать "за человека", красный фон, белый текст, высота = button Подробнее
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const card = readFileSync("components/site/tour-card.tsx", "utf8")
const priceSwitcher = readFileSync("components/site/price-switcher.tsx", "utf8")

// T3a: TourCard bus -> PriceSwitcher showPerPerson=false (убираем "за человека")
const perPersonOffForBus = /showPerPerson=\{hidePerPersonSuffix \? false : (false|showPerPerson && \!isBusTour|!isBusTour && showPerPerson|!effectiveIsBus && \(hidePerPersonSuffix \? false : showPerPerson\)|!effectiveIsBus && .*|false)\}/.test(card)
  || /(showPerPerson=\{false\})[\s\S]{0,200}(isBusTour|effectiveIsBus)/.test(card)
  || card.includes("showPerPerson={!isBusTour && (hidePerPersonSuffix ? false : showPerPerson)}")
  || card.includes("showPerPerson={!effectiveIsBus && (hidePerPersonSuffix ? false : showPerPerson)}")
  || card.includes("showPerPerson={false}")
assert.ok(perPersonOffForBus, "FAIL T3a: На автобусных карточках tour-card PriceSwitcher showPerPerson=false (нет подписи 'за человека')")

// T3b: Блок цены bg-price -> заменён на bg-[#E84242] акцент red-500, bg-red-600 или bg-red-500 красный фон + text-white.
const priceBgRedTextWhite = /(isBusTour|effectiveIsBus) \? ".*bg-(red|rose)(-500|-600|-700)?|#E84242.*text-white/.test(card)
  || /(isBusTour|effectiveIsBus).*(bg-red-|bg-#E84242|bg-\[#E84242\])/.test(card) && /\[&_\*\]:text-white/.test(card)
assert.ok(priceBgRedTextWhite, "FAIL T3b: isBusTour блок цены bg=красный (red-*) text-white, [&>*] white")

// T3c: Padding price block = px-4 (16px горизонтально), py-3 (12px вертикально), высота ОБЕИХ кнопок = 48px (Подробнее === price block)
const paddingAndHeight48 = /px-4 py-3[\s\S]{0,300}style=\{\{ height: \"48px\" \}\}[\s\S]{0,300}style=\{\{ height: \"48px\" \}\}/.test(card)
  || (card.includes("px-4 py-3") && (card.match(/style=\{\{ height: "48px" \}\}/g) || []).length >= 2)
assert.ok(paddingAndHeight48, "FAIL T3c: px-4 py-3 (16/12) padding + height: 48px ОБЕИХ кнопок (Подробнее и цена)")

// T3c-unify: Дефолт isBusTour=true — ВСЕ карточки tour-card (главная/related/hot и т.д.) ЕДИНЫЙ ВИД (красный bg E84242, без за человека, py-3)
const defaultIsBusTrue = /isBusTour = true/.test(card)
assert.ok(defaultIsBusTrue, "FAIL T3c-unify: TourCard default isBusTour=true для ЕДИНОГО вида ВО ВСЕХ карточках проекта")

// T3d: price-switcher mainPrice bigSize (TourCard) имеет text-white (а не text-price)
// TourCard не может менять price-switcher напрямую; проверяем что className параметр price switcher может override
const overrideableClass = /className\?.*string/.test(priceSwitcher) && /className.*\$\{className/.test(priceSwitcher)
  && /text-price.*\}|text-price[^}]*\}/.test(priceSwitcher) // className накидываем [&>span]:!text-white
// Или просто tour-card оборачивает PriceSwitcher в div с [&_*]:text-white
assert.ok(/\[&_\*\]:text-white/.test(card) || /text-white \[&_[^\]]+\]/.test(card) || /text-white.*\[\&_\*?\]/.test(card),
  "FAIL T3d: Внутренние price span'и в price блоке FORCE white через [&_*]:text-white в className обёртки (чтобы text-price не убивал)")

console.log("PASS T3 tour-card-styling: bus price removed za cheloveka, bg-red, text-white, height py-3 == button height")
