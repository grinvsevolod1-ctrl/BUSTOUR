import path from "node:path"
import { spawn } from "node:child_process"
import process from "node:process"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"

const connectionString = (process.env.DATABASE_URL || "").trim()
if (!connectionString) {
  console.error("[startup] DATABASE_URL is required")
  process.exit(1)
}

async function main() {
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECT_MS || 10000),
  })

  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    })
  } finally {
    await pool.end()
  }

  const child = spawn(
    process.execPath,
    ["./node_modules/next/dist/bin/next", "start", "-p", process.env.PORT || "3000", "-H", process.env.HOSTNAME || "0.0.0.0"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
  )

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })

  child.on("error", (error) => {
    console.error("[startup] failed to launch Next.js", error)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error("[startup] database migration failed", error)
  process.exit(1)
})
