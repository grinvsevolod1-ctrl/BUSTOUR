import { asc, eq, count } from "drizzle-orm"
import { db } from "@/lib/db"
import { busTourTypes, tours } from "@/lib/db/schema"
import { ensureDb } from "@/lib/db/init"
import type { BusTourType } from "@/lib/types"

function mapType(row: typeof busTourTypes.$inferSelect): BusTourType {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder }
}

export async function getBusTourTypes(): Promise<BusTourType[]> {
  await ensureDb()
  const rows = await db
    .select()
    .from(busTourTypes)
    .orderBy(asc(busTourTypes.sortOrder), asc(busTourTypes.id))
  return rows.map(mapType)
}

export async function createBusTourType(name: string) {
  await ensureDb()
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Укажите название типа")
  const existing = await db.select({ sortOrder: busTourTypes.sortOrder }).from(busTourTypes)
  const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
  await db.insert(busTourTypes).values({
    name: trimmed,
    sortOrder: nextOrder,
    createdAt: Date.now(),
  })
}

export async function updateBusTourType(id: number, name: string) {
  await ensureDb()
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Укажите название типа")
  const [row] = await db.select().from(busTourTypes).where(eq(busTourTypes.id, id)).limit(1)
  if (!row) throw new Error("Тип не найден")
  if (row.name === trimmed) return
  await db.update(busTourTypes).set({ name: trimmed }).where(eq(busTourTypes.id, id))
  // Cascade: tours store the type name as free text.
  await db.update(tours).set({ tourType: trimmed }).where(eq(tours.tourType, row.name))
}

export async function deleteBusTourType(id: number) {
  await ensureDb()
  const [row] = await db.select().from(busTourTypes).where(eq(busTourTypes.id, id)).limit(1)
  if (!row) return
  const [{ value: used }] = await db
    .select({ value: count() })
    .from(tours)
    .where(eq(tours.tourType, row.name))
  if (used > 0) {
    throw new Error(`Тип «${row.name}» используется в ${used} тур(ах). Сначала смените тип у туров.`)
  }
  await db.delete(busTourTypes).where(eq(busTourTypes.id, id))
}
