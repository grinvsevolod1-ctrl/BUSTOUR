/**
 * Баррель-модуль слоя запросов к БД.
 *
 * Исторически это был монолит на ~1600 строк. Код разнесён по доменным модулям
 * в lib/queries/, а этот файл сохраняет обратную совместимость: все существующие
 * импорты `@/lib/queries` продолжают работать без изменений.
 *
 * Новый код может импортировать доменные модули напрямую:
 *   import { getTours } from "@/lib/queries/tours"
 */
export { assembleDatesTables } from "./queries/_shared"
export * from "./queries/buses"
export * from "./queries/transfers"
export * from "./queries/tours"
export * from "./queries/reviews"
export * from "./queries/articles"
export * from "./queries/leads"
export * from "./queries/staff"
export * from "./queries/certs"
export * from "./queries/misc"
