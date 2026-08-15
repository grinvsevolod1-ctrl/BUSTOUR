import { createClient } from "@libsql/client"
import path from "node:path"
import { readFileSync, existsSync } from "node:fs"
import { scryptSync, randomBytes } from "node:crypto"

const envPath = path.join(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "")
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

async function main() {
  const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "app.db")}`
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })

  for (const sql of [
    `ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'`,
    `ALTER TABLE admins ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adminId INTEGER,
    username TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    entityType TEXT NOT NULL DEFAULT '',
    entityId TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    beforeJson TEXT NOT NULL DEFAULT '',
    afterJson TEXT NOT NULL DEFAULT '',
    metaJson TEXT NOT NULL DEFAULT '',
    createdAt INTEGER NOT NULL
  )`,
    `CREATE INDEX IF NOT EXISTS admin_audit_log_admin_created_idx ON admin_audit_log(adminId, createdAt)`,
    `CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx ON admin_audit_log(entityType, entityId)`,
  ]) {
    try {
      await client.execute(sql)
      console.log("ok:", sql.slice(0, 70).replace(/\s+/g, " "))
    } catch (e) {
      console.log("skip:", (e as Error).message.slice(0, 100))
    }
  }

  const now = Date.now()
  for (const u of [
    { username: "test", password: "testtest", role: "admin" },
    { username: "admin2", password: "admin123", role: "admin" },
    { username: "manager", password: "manager123", role: "manager" },
  ]) {
    const found = await client.execute({
      sql: `SELECT id FROM admins WHERE username = ? LIMIT 1`,
      args: [u.username],
    })
    if (found.rows.length) {
      console.log("exists:", u.username)
      continue
    }
    await client.execute({
      sql: `INSERT INTO admins (username, passwordHash, role, active, createdAt) VALUES (?, ?, ?, 1, ?)`,
      args: [u.username, hashPassword(u.password), u.role, now],
    })
    console.log("seeded:", u.username, u.role)
  }

  const cols = await client.execute(`PRAGMA table_info(admins)`)
  console.log("admins cols:", cols.rows.map((r) => r.name).join(", "))
  const admins = await client.execute(`SELECT id, username, role, active FROM admins`)
  for (const r of admins.rows) console.log(r)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
