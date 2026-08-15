/**
 * #46 Manual up/down sort for bus fleet.
 * Run: npx tsx scripts/bus-sort.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { readQueriesSource } from "./lib/read-queries-source"
import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

const root = process.cwd()

function src(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function mustHave(rel: string, needles: string[]) {
  // lib/queries.ts is a barrel — inspect it together with lib/queries/* modules
  const body = rel === "lib/queries.ts" ? readQueriesSource(root) : src(rel)
  for (const needle of needles) {
    assert.ok(body.includes(needle), `${rel} missing «${needle}»`)
  }
}

mustHave("lib/queries.ts", ["export async function moveBus", "orderBy(asc(buses.sortOrder)"])
mustHave("app/admin/actions.ts", ["moveBusAction", "bus_move"])
mustHave("components/admin/sort-order-buttons.tsx", ["SortOrderButtons", "Выше", "Ниже"])
mustHave("app/admin/(protected)/buses/page.tsx", ["SortOrderButtons", "moveBusAction"])
mustHave("app/(site)/bus-rental/page.tsx", ["getBuses"])

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-bus-sort-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { eq } = await import("drizzle-orm")
  const { db } = await import("../lib/db")
  const { buses } = await import("../lib/db/schema")
  const { createBus, getBuses, moveBus, purgeBus } = await import("../lib/queries")

  await ensureDb()

  const stamp = Date.now()
  const ids: number[] = []

  const blank = {
    image: "",
    gallery: [] as [],
    year: "",
    seats: "",
    busClass: "",
    phone: "",
    documents: [] as [],
  }

  try {
    const a = await createBus({
      slug: `bus-sort-a-${stamp}`,
      title: `BusSort A ${stamp}`,
      ...blank,
    })
    const b = await createBus({
      slug: `bus-sort-b-${stamp}`,
      title: `BusSort B ${stamp}`,
      ...blank,
    })
    ids.push(a, b)

    const max = (await getBuses()).reduce((m, bus) => Math.max(m, bus.sortOrder), -1)
    await db.update(buses).set({ sortOrder: max + 1 }).where(eq(buses.id, a))
    await db.update(buses).set({ sortOrder: max + 2 }).where(eq(buses.id, b))

    let list = (await getBuses()).filter((bus) => ids.includes(bus.id))
    assert.deepEqual(list.map((bus) => bus.id), [a, b], "buses initial order A then B")

    await moveBus(b, "up")
    list = (await getBuses()).filter((bus) => ids.includes(bus.id))
    assert.deepEqual(list.map((bus) => bus.id), [b, a], "moveBus up swaps B before A")

    await moveBus(b, "down")
    list = (await getBuses()).filter((bus) => ids.includes(bus.id))
    assert.deepEqual(list.map((bus) => bus.id), [a, b], "moveBus down restores A then B")
  } finally {
    for (const id of ids) {
      try {
        await purgeBus(id)
      } catch {
        /* ignore */
      }
    }
    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
  }

  console.log("ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("bus-sort.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
