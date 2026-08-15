/**
 * Одноразовый запуск миграций Drizzle (шаг деплоя, до pm2 reload).
 * Использование: node scripts/migrate.mjs
 * Требует DATABASE_URL в окружении (deploy.sh подхватывает .env / .env.local).
 */
import path from "node:path"
import process from "node:process"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"

const connectionString = (process.env.DATABASE_URL || "").trim()
if (!connectionString) {
  console.error("[migrate] DATABASE_URL is required")
  process.exit(1)
}

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10_000 })

try {
  await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") })
  console.log("[migrate] migrations applied")
} catch (error) {
  console.error("[migrate] failed:", error)
  process.exitCode = 1
} finally {
  await pool.end()
}
