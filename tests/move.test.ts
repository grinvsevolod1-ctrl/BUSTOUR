import { describe, it, expect } from "vitest"
import { computeSwapUpdates, moveSortable, parseMoveDirection } from "@/lib/queries/move"

const rows = (orders: number[]) => orders.map((sortOrder, i) => ({ id: i + 1, sortOrder }))

describe("parseMoveDirection", () => {
  it("парсит down", () => expect(parseMoveDirection("down")).toBe("down"))
  it("всё остальное → up", () => {
    expect(parseMoveDirection("up")).toBe("up")
    expect(parseMoveDirection(null)).toBe("up")
    expect(parseMoveDirection(undefined)).toBe("up")
    expect(parseMoveDirection("DROP TABLE")).toBe("up")
  })
})

describe("computeSwapUpdates", () => {
  it("свап вверх меняет местами с предыдущим соседом", () => {
    // порядок плотный: [1,2,3] с sortOrder [0,1,2]; двигаем id=2 вверх
    const updates = computeSwapUpdates(rows([0, 1, 2]), 2, "up")
    expect(updates).toEqual([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ])
  })

  it("свап вниз меняет местами со следующим соседом", () => {
    const updates = computeSwapUpdates(rows([0, 1, 2]), 2, "down")
    expect(updates).toEqual([
      { id: 3, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ])
  })

  it("первый элемент вверх — двигать некуда", () => {
    expect(computeSwapUpdates(rows([0, 1, 2]), 1, "up")).toEqual([])
  })

  it("последний элемент вниз — двигать некуда", () => {
    expect(computeSwapUpdates(rows([0, 1, 2]), 3, "down")).toEqual([])
  })

  it("несуществующий id — пустой результат", () => {
    expect(computeSwapUpdates(rows([0, 1, 2]), 99, "up")).toEqual([])
  })

  it("пустой список — пустой результат", () => {
    expect(computeSwapUpdates([], 1, "up")).toEqual([])
  })

  it("нормализует дублирующиеся sortOrder в плотную последовательность", () => {
    // Дубли из легаси-данных: все sortOrder = 0
    const updates = computeSwapUpdates(rows([0, 0, 0]), 2, "down")
    // id=2 и id=3 меняются местами → порядок [1,3,2] → sortOrder 0,1,2
    expect(updates).toEqual([
      { id: 3, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ])
  })

  it("нормализует разреженные sortOrder (10,20,30)", () => {
    const updates = computeSwapUpdates(rows([10, 20, 30]), 1, "down")
    // порядок [2,1,3] → все получают плотные 0,1,2
    expect(updates).toEqual([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
      { id: 3, sortOrder: 2 },
    ])
  })
})

describe("moveSortable", () => {
  it("вызывает write для каждой изменённой строки и возвращает true", async () => {
    const written: Array<{ id: number; sortOrder: number }> = []
    const moved = await moveSortable(rows([0, 1]), 2, "up", async (id, sortOrder) => {
      written.push({ id, sortOrder })
    })
    expect(moved).toBe(true)
    expect(written).toEqual([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ])
  })

  it("возвращает false, когда двигать некуда", async () => {
    const moved = await moveSortable(rows([0, 1]), 1, "up", async () => {
      throw new Error("не должен вызываться")
    })
    expect(moved).toBe(false)
  })
})
