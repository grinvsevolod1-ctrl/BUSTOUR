import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

type DbGlobals = {
  __bustourPgPool?: Pool
  __bustourDrizzle?: ReturnType<typeof drizzle>
}

const g = globalThis as typeof globalThis & DbGlobals

export type SqlExecuteInput =
  | string
  | { sql: string; args?: readonly unknown[] }

type SqlExecuteRow = Record<string, unknown>
export type SqlExecuteResult = {
  rows: SqlExecuteRow[]
  rowsAffected: number
  lastInsertRowid: undefined
  columns: string[]
}

function normalizeInput(input: SqlExecuteInput): { sql: string; args: readonly unknown[] } {
  if (typeof input === "string") return { sql: input, args: [] }
  return { sql: input.sql, args: input.args ?? [] }
}

function rewritePositionalParams(sqlText: string): string {
  let index = 0
  return sqlText.replace(/\?/g, () => `$${++index}`)
}

export function resolveDatabaseUrl(): string {
  const raw = (process.env.DATABASE_URL || "").trim()
  if (!raw) {
    throw new Error("[db] DATABASE_URL is required and must point to PostgreSQL.")
  }
  if (!/^postgres(ql)?:\/\//i.test(raw)) {
    throw new Error(`[db] DATABASE_URL must be a PostgreSQL URL. Got: ${raw.slice(0, 24)}…`)
  }
  return raw
}

function getPool(): Pool {
  if (!g.__bustourPgPool) {
    const statementTimeout = process.env.PG_STATEMENT_TIMEOUT_MS || "15000"
    const lockTimeout = process.env.PG_LOCK_TIMEOUT_MS || "3000"
    const idleTxTimeout = process.env.PG_IDLE_IN_TX_SESSION_TIMEOUT_MS || "20000"

    const pool = new Pool({
      connectionString: resolveDatabaseUrl(),
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 30000),
      connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECT_MS || 10000),
      allowExitOnIdle: false,
      options: [
        `-c statement_timeout=${Number(statementTimeout) || 15000}`,
        `-c lock_timeout=${Number(lockTimeout) || 3000}`,
        `-c idle_in_transaction_session_timeout=${Number(idleTxTimeout) || 20000}`,
      ].join(" "),
    })

    g.__bustourPgPool = pool
  }
  return g.__bustourPgPool
}

export async function readyClient(): Promise<Pool> {
  const pool = getPool()
  const conn = await pool.connect()
  conn.release()
  return pool
}

export function getDb() {
  if (!g.__bustourDrizzle) {
    g.__bustourDrizzle = drizzle(getPool(), { schema })
  }
  return g.__bustourDrizzle
}

export type DbExecutor = ReturnType<typeof drizzle> | Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0]

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

export type BustourClient = Pool & {
  execute(input: SqlExecuteInput): Promise<SqlExecuteResult>
}

const clientProxy = new Proxy({} as BustourClient, {
  get(_target, prop) {
    const pool = getPool()

    if (prop === "execute") {
      return async (input: SqlExecuteInput): Promise<SqlExecuteResult> => {
        const { sql, args } = normalizeInput(input)
        const query = await pool.query({
          text: rewritePositionalParams(sql),
          values: Array.from(args),
        })
        return {
          rows: query.rows as SqlExecuteRow[],
          rowsAffected: query.rowCount ?? 0,
          lastInsertRowid: undefined,
          columns: query.fields.map((field) => field.name),
        }
      }
    }

    const value = Reflect.get(pool, prop)
    if (typeof value === "function") return value.bind(pool)
    return value
  },
})

export const client: BustourClient = clientProxy

export async function closeDbPool(): Promise<void> {
  if (!g.__bustourPgPool) return
  const pool = g.__bustourPgPool
  g.__bustourPgPool = undefined
  g.__bustourDrizzle = undefined
  await pool.end()
}
