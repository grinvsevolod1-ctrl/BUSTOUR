/**
 * Групповой экспорт/импорт цен на автобусные туры через Excel (.xlsx).
 *
 * Формат листа (один лист = один тур, имя листа начинается с "#ID"):
 *   строка 1 — информационная (валюта тура, справочно, при импорте игнорируется)
 *   строка 2 — заголовки колонок
 *   строка 3+ — данные, "длинный" формат: одна строка = один выезд × одна категория номера.
 *   Несколько строк с одинаковыми датами отправления/прибытия объединяются в один выезд.
 *
 * Даты — строго текст в формате YYYY-MM-DD (без автоформата Excel, чтобы избежать
 * искажений из-за локали/часового пояса при повторном сохранении файла в Excel).
 */
import ExcelJS from "exceljs"
import type { DatesTable, DatesTableRow, DatesTableTag, Tour } from "@/lib/types"
import { TAG_ICONS, isDateRangeOrdered, isIsoDate } from "@/lib/dates-table"

const SHEET_NAME_MAX = 31
const INSTRUCTIONS_SHEET = "Инструкция"

const HEADERS = [
  "Дата отправления",
  "Дата прибытия",
  "Описание выезда",
  "Теги (icon:label; icon:label)",
  "Наценка, сумма",
  "Наценка, валюта",
  "Категория номера",
  "Цена номера",
  "Скидка, %",
  "Итог (справочно)",
] as const

/** Excel запрещает \ / ? * [ ] : в имени листа и ограничивает длину 31 символом. */
function sheetNameForTour(tour: Tour): string {
  const prefix = `#${tour.id} `
  const safeTitle = (tour.title || `Тур ${tour.id}`).replace(/[\\/?*[\]:]/g, " ").trim()
  const maxTitleLen = Math.max(0, SHEET_NAME_MAX - prefix.length)
  return (prefix + safeTitle).slice(0, prefix.length + maxTitleLen) || `#${tour.id}`
}

function tagsToText(tags: DatesTableTag[] | undefined | null): string {
  if (!Array.isArray(tags)) return ""
  return tags
    .filter((t) => t.label?.trim())
    .map((t) => `${t.icon}:${t.label.trim()}`)
    .join("; ")
}

function parseTagsText(raw: string): DatesTableTag[] {
  return raw
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const idx = chunk.indexOf(":")
      const icon = idx === -1 ? "flag" : chunk.slice(0, idx).trim()
      const label = idx === -1 ? chunk : chunk.slice(idx + 1).trim()
      return { icon: (TAG_ICONS as readonly string[]).includes(icon) ? icon : "flag", label }
    })
    .filter((t) => t.label)
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    const obj = value as unknown as Record<string, unknown>
    if ("text" in obj) return String(obj.text ?? "")
    if ("result" in obj) return String(obj.result ?? "")
  }
  return String(value)
}

function cellNumber(value: ExcelJS.CellValue): number {
  const n = Number.parseFloat(cellText(value).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

export function buildPricingWorkbook(tours: Tour[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Bastour admin"
  workbook.created = new Date()

  const info = workbook.addWorksheet(INSTRUCTIONS_SHEET)
  info.columns = [{ width: 100 }]
  const lines = [
    "Экспорт цен на автобусные туры — по одному листу на тур.",
    "",
    "Формат строки: одна строка = один выезд (даты) × одна категория номера.",
    "Если у выезда несколько категорий номеров — под ним идёт несколько строк с одинаковыми датами.",
    "",
    "Колонки:",
    "  Дата отправления / прибытия — строго ГГГГ-ММ-ДД (например 2025-12-31). Не меняйте формат ячейки на «Дата».",
    "  Описание выезда — текст, одинаковый для всех строк одного выезда.",
    `  Теги — формат "иконка:подпись; иконка:подпись". Доступные иконки: ${TAG_ICONS.join(", ")}.`,
    "  Наценка сумма/валюта — доп. сбор за выезд (одинаковый для всех строк выезда), можно оставить пустым.",
    "  Категория номера / Цена / Скидка % — если категории нет, оставьте эти три ячейки пустыми (выезд без цен).",
    "  Итог — справочная формула, при загрузке файла обратно игнорируется.",
    "",
    "Не удаляйте «#ID» в начале названия листа — по нему определяется, какой тур обновлять.",
    "Не переименовывайте и не удаляйте лист «Инструкция» — он тоже игнорируется при загрузке.",
    "",
    "Примечание к блоку цен, сноски и валюта тура настраиваются в самой админке (карточка тура → Даты и цены)",
    "и не входят в этот файл — импорт их не изменяет.",
  ]
  lines.forEach((line, i) => {
    const row = info.getRow(i + 1)
    row.getCell(1).value = line
    if (i === 0) row.getCell(1).font = { bold: true, size: 13 }
  })

  for (const tour of tours) {
    const sheet = workbook.addWorksheet(sheetNameForTour(tour))
    sheet.columns = [
      { width: 16 }, { width: 16 }, { width: 28 }, { width: 26 },
      { width: 14 }, { width: 12 }, { width: 20 }, { width: 12 }, { width: 10 }, { width: 12 },
    ]
    sheet.getRow(1).getCell(1).value =
      `Валюта цен номеров этого тура: ${tour.datesTable.currency || "BYN"} (менять — в админке, не в этом файле)`
    sheet.getRow(1).getCell(1).font = { italic: true, color: { argb: "FF666666" } }
    sheet.mergeCells(1, 1, 1, HEADERS.length)

    const headerRow = sheet.getRow(2)
    HEADERS.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5233" } }
    })
    sheet.views = [{ state: "frozen", ySplit: 2 }]
    // Текстовый формат для дат/категории — иначе Excel может авто-конвертировать "2025-01-05".
    sheet.getColumn(1).numFmt = "@"
    sheet.getColumn(2).numFmt = "@"

    let r = 3
    for (const row of tour.datesTable.rows ?? []) {
      const tagsText = tagsToText(row.tags)
      const rooms = Array.isArray(row.rooms) ? row.rooms : []
      const lines2 = rooms.length ? rooms : [null]
      for (const room of lines2) {
        const excelRow = sheet.getRow(r++)
        excelRow.getCell(1).value = row.startDate
        excelRow.getCell(2).value = row.endDate
        excelRow.getCell(3).value = row.description
        excelRow.getCell(4).value = tagsText
        excelRow.getCell(5).value = row.extraPriceAmount || ""
        excelRow.getCell(6).value = row.extraPriceCurrency || ""
        if (room) {
          excelRow.getCell(7).value = room.name
          excelRow.getCell(8).value = room.price
          excelRow.getCell(9).value = room.discount
          excelRow.getCell(10).value = { formula: `IF(H${r - 1}="","",ROUND(H${r - 1}*(1-I${r - 1}/100),0))` }
        }
      }
    }
  }

  return workbook
}

export type PricingImportUpdate = { tourId: number; tourTitle: string; table: DatesTable }
export type PricingImportError = { sheet: string; row?: number; message: string }

export function parsePricingWorkbook(
  workbook: ExcelJS.Workbook,
  existingTours: Tour[],
): { updates: PricingImportUpdate[]; errors: PricingImportError[] } {
  const toursById = new Map(existingTours.map((t) => [t.id, t]))
  const updates: PricingImportUpdate[] = []
  const errors: PricingImportError[] = []

  for (const sheet of workbook.worksheets) {
    if (sheet.name === INSTRUCTIONS_SHEET) continue
    const match = sheet.name.match(/^#(\d+)/)
    if (!match) {
      errors.push({ sheet: sheet.name, message: `Не найден "#ID" в начале названия листа — лист пропущен.` })
      continue
    }
    const tourId = Number(match[1])
    const tour = toursById.get(tourId)
    if (!tour) {
      errors.push({ sheet: sheet.name, message: `Тур #${tourId} не найден (возможно, удалён) — лист пропущен.` })
      continue
    }

    type Group = DatesTableRow
    const groups = new Map<string, Group>()
    const lastRow = sheet.actualRowCount || sheet.rowCount
    for (let r = 3; r <= lastRow; r++) {
      const excelRow = sheet.getRow(r)
      if (!excelRow || excelRow.cellCount === 0) continue
      const startDate = cellText(excelRow.getCell(1).value).trim()
      const endDate = cellText(excelRow.getCell(2).value).trim()
      const description = cellText(excelRow.getCell(3).value).trim()
      const tagsText = cellText(excelRow.getCell(4).value).trim()
      const extraAmount = cellNumber(excelRow.getCell(5).value)
      const extraCurrency = cellText(excelRow.getCell(6).value).trim().toUpperCase()
      const roomName = cellText(excelRow.getCell(7).value).trim()
      const roomPrice = cellNumber(excelRow.getCell(8).value)
      const roomDiscount = cellNumber(excelRow.getCell(9).value)

      const isBlankRow = !startDate && !endDate && !description && !roomName && !roomPrice
      if (isBlankRow) continue

      if (!startDate) {
        errors.push({ sheet: sheet.name, row: r, message: "Не указана дата отправления — строка пропущена." })
        continue
      }
      if (!isIsoDate(startDate) || (endDate && !isIsoDate(endDate))) {
        errors.push({
          sheet: sheet.name,
          row: r,
          message: `Некорректная дата ("${startDate}" / "${endDate}"). Формат: ГГГГ-ММ-ДД. Строка пропущена.`,
        })
        continue
      }
      const finalEnd = endDate || startDate
      if (!isDateRangeOrdered(startDate, finalEnd)) {
        errors.push({ sheet: sheet.name, row: r, message: `Дата прибытия раньше отправления — строка пропущена.` })
        continue
      }

      const key = `${startDate}|${finalEnd}`
      let group = groups.get(key)
      if (!group) {
        group = { startDate, endDate: finalEnd, description: "", extraPriceAmount: 0, extraPriceCurrency: "", tags: [], rooms: [] }
        groups.set(key, group)
      }
      if (!group.description && description) group.description = description
      if (!group.extraPriceAmount && extraAmount) group.extraPriceAmount = Math.max(0, extraAmount)
      if (!group.extraPriceCurrency && extraCurrency) group.extraPriceCurrency = extraCurrency
      if (!group.tags.length && tagsText) group.tags = parseTagsText(tagsText)
      if (roomName || roomPrice) {
        group.rooms.push({ name: roomName, price: Math.max(0, Math.round(roomPrice)), discount: Math.min(100, Math.max(0, Math.round(roomDiscount))) })
      }
    }

    updates.push({
      tourId,
      tourTitle: tour.title || `#${tourId}`,
      table: { ...tour.datesTable, rows: [...groups.values()] },
    })
  }

  return { updates, errors }
}
