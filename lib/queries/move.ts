/**
 * Общая логика reorder-стрелок админки.
 *
 * Все разделы (автобусы, трансферы, сотрудники, валюты, лицензии) двигают
 * записи одинаково: меняют местами с соседом по списку и нормализуют
 * sortOrder в плотную последовательность 0..N-1 (лечит дубли, возникшие
 * до внедрения сортировки). Утилита не знает про drizzle: она принимает
 * уже отсортированный список соседей и колбэк записи — так одна функция
 * обслуживает и разные таблицы, и разные способы доступа к БД
 * (lib/queries/* и lib/currencies-server с его ленивым контекстом).
 */

export type MoveDirection = "up" | "down"

export type Sortable = { id: number; sortOrder: number }

/** Парсит направление из FormData server actions ("down" | всё остальное → "up"). */
export function parseMoveDirection(raw: unknown): MoveDirection {
  return String(raw ?? "up") === "down" ? "down" : "up"
}

/**
 * Возвращает список обновлений `{ id, sortOrder }`, которые нужно записать,
 * чтобы запись `id` поменялась местами с соседом. Пустой массив — двигать
 * некуда (запись первая/последняя или не найдена) либо порядок уже плотный
 * и совпадает.
 */
export function computeSwapUpdates<T extends Sortable>(
  siblings: readonly T[],
  id: number,
  direction: MoveDirection,
): Array<{ id: number; sortOrder: number }> {
  const index = siblings.findIndex((row) => row.id === id)
  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) return []
  const ordered = [...siblings]
  ;[ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]]
  const updates: Array<{ id: number; sortOrder: number }> = []
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].sortOrder !== i) updates.push({ id: ordered[i].id, sortOrder: i })
  }
  return updates
}

/**
 * Свап с соседом + нормализация через колбэк записи.
 * `write` вызывается для каждой строки, чей sortOrder изменился.
 */
export async function moveSortable<T extends Sortable>(
  siblings: readonly T[],
  id: number,
  direction: MoveDirection,
  write: (id: number, sortOrder: number) => Promise<void>,
): Promise<boolean> {
  const updates = computeSwapUpdates(siblings, id, direction)
  for (const u of updates) await write(u.id, u.sortOrder)
  return updates.length > 0
}
