/**
 * #51 — mobile «Заказать автобус» is phone-first; trip fields sm+ only.
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const modal = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/modals/modal-bus-order.tsx"),
  "utf8",
)

assert.match(modal, /function isCompactBusForm/, "compact helper")
assert.match(modal, /min-width: 640px/, "sm breakpoint")
assert.match(modal, /data-bus-order-extended/, "extended block marker")
assert.match(modal, /hidden space-y-3 sm:block/, "extended hidden below sm")
assert.match(modal, /Мобильная заявка/, "compact message")
assert.ok(modal.includes("tour: busTitle"), "bus title in payload")
assert.ok(modal.includes('label="Телефон:"'), "phone field")
assert.ok(modal.includes('label="Ф.И.О:"'), "name required by API")

// Trip / email only inside extended block (after data-bus-order-extended)
const extIdx = modal.indexOf("data-bus-order-extended")
assert.ok(extIdx > 0, "extended marker present")
const before = modal.slice(0, extIdx)
const after = modal.slice(extIdx)
assert.ok(!before.includes('label="E-mail:"'), "email not in mobile-visible section")
assert.ok(after.includes('label="E-mail:"'), "email in extended")
assert.ok(after.includes('label="Откуда:"'), "from in extended")
assert.ok(after.includes('label="Куда:"'), "to in extended")
assert.ok(after.includes('label="Количество пассажиров:"'), "passengers in extended")
assert.ok(after.includes('label="Дата отправления:"'), "departure in extended")

const btn = fs.readFileSync(
  path.join(import.meta.dirname, "../components/site/bus-order-button.tsx"),
  "utf8",
)
assert.ok(btn.includes("ModalBusOrder"), "wired")
assert.ok(btn.includes("busTitle={busTitle}"), "passes bus title")

console.log("bus-order-mobile.selfcheck: ok")
