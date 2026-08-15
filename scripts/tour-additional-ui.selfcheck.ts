import assert from "node:assert/strict"
import { emptyDatesTable } from "@/lib/dates-table"
import type { DatesTable } from "@/lib/types"
import { buildTourAdditionalUi } from "@/lib/tour-additional-ui"

const attached: DatesTable = {
  note: "",
  noteType: "info",
  currency: "BYN",
  footnotes: [],
  rows: [
    {
      startDate: "2027-06-19",
      endDate: "2027-06-22",
      description: "",
      tags: [],
      rooms: [{ name: "Стандарт", price: 1500, discount: 0 }],
    },
  ],
}

const noTour = buildTourAdditionalUi({ table: emptyDatesTable })
assert.equal(noTour.hasTable, false)
assert.equal(noTour.badge.tone, "amber")
assert.equal(noTour.action, null)
assert.match(noTour.price.placeholder, /Например/)
assert.match(noTour.price.hint, /не прикреплена/)
assert.equal(noTour.priceRequired, true)

const withTourEmpty = buildTourAdditionalUi({ tourId: 7, table: emptyDatesTable })
assert.equal(withTourEmpty.hasTable, false)
assert.deepEqual(withTourEmpty.action, {
  label: "Создать таблицу дат",
  href: "/admin/tour-pricing/7",
})

const withTable = buildTourAdditionalUi({ tourId: 7, table: attached })
assert.equal(withTable.hasTable, true)
assert.equal(withTable.badge.tone, "green")
assert.deepEqual(withTable.action, {
  label: "Редактировать прикреплённую таблицу",
  href: "/admin/tour-pricing/7",
})
assert.equal(withTable.price.placeholder, "Из таблицы: 1500")
assert.equal(withTable.duration.placeholder, "Из таблицы: 4 дня / 3 ночи")
assert.equal(withTable.nights.placeholder, "Из таблицы: 3")
assert.match(withTable.price.hint, /прикреплённой таблицы/)
assert.equal(withTable.priceRequired, false)

const attachedEmptyRooms: DatesTable = {
  ...attached,
  rows: [{ startDate: "2027-06-19", endDate: "2027-06-22", description: "", tags: [], rooms: [] }],
}
const vague = buildTourAdditionalUi({ tourId: 1, table: attachedEmptyRooms })
assert.equal(vague.price.placeholder, "Значение из таблицы…")
assert.equal(vague.duration.placeholder, "Из таблицы: 4 дня / 3 ночи")

console.log("tour-additional-ui.selfcheck: ok")
