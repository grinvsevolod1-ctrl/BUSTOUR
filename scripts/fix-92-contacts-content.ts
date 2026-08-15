/**
 * #92 — repair live contacts CMS junk / restore route video.
 *
 * Dry-run: npx tsx scripts/fix-92-contacts-content.ts
 * Apply:   npx tsx scripts/fix-92-contacts-content.ts --apply
 */
import { readFileSync, existsSync } from "node:fs"
import { createClient } from "@libsql/client"
import { defaultSocialLinks } from "@/lib/social-links"

const ROUTE_VIDEO =
  "https://bus-tour.by/wp-content/themes/bustour/videos/IMG_2838.MOV"
const GOOD_EMAIL = "bustourminsk@gmail.com"
const HOURS_NOTE = "сб.: 11:00–16:00, вс. — выходной"

function loadEnvLocal() {
  const path = existsSync(".env.local") ? ".env.local" : null
  if (!path) return
  const raw = readFileSync(path, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    let v = t.slice(i + 1)
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    process.env[t.slice(0, i)] ??= v
  }
}

async function main() {
  loadEnvLocal()
  const apply = process.argv.includes("--apply")
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN
  if (!url || !authToken) {
    console.error("missing DATABASE_URL or DATABASE_AUTH_TOKEN")
    process.exit(1)
  }

  const c = createClient({ url, authToken })
  const keys = [
    "site.email",
    "site.emails",
    "site.routeVideo",
    "site.routeVideoPoster",
    "site.hoursNote",
    "social.youtube",
    "social.links",
  ]
  const before = await c.execute(
    `SELECT key, value FROM settings WHERE key IN (${keys.map(() => "?").join(",")})`,
    keys,
  )
  const map = Object.fromEntries(before.rows.map((r) => [String(r.key), String(r.value ?? "")]))

  const socials = defaultSocialLinks()
    .filter((s) => s.icon !== "youtube")
    .map((s) => {
      if (s.icon === "instagram") return { ...s, url: "https://www.instagram.com/bus_tour.by" }
      if (s.icon === "telegram") return { ...s, url: "https://t.me/basturminsk" }
      if (s.icon === "viber") return { ...s, url: "viber://chat?number=375293446835" }
      return s
    })
    .filter((s) => s.url && !/^https?:\/\/(www\.)?(youtube|instagram)\.com\/?$/i.test(s.url))

  const desired: Record<string, string> = {
    "site.email": GOOD_EMAIL,
    "site.emails": GOOD_EMAIL,
    "site.routeVideo": ROUTE_VIDEO,
    "site.routeVideoPoster": "",
    "site.hoursNote": HOURS_NOTE,
    "social.youtube": "",
    "social.links": JSON.stringify(socials),
  }

  console.log("mode:", apply ? "APPLY" : "dry-run")
  for (const [key, next] of Object.entries(desired)) {
    const prev = map[key] ?? "(missing)"
    if (prev === next) {
      console.log("ok", key)
      continue
    }
    console.log("change", key)
    console.log("  from:", JSON.stringify(prev).slice(0, 180))
    console.log("  to:  ", JSON.stringify(next).slice(0, 180))
    if (apply) {
      await c.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, next],
      )
    }
  }

  if (!apply) {
    console.log("dry-run only; re-run with --apply to write")
    return
  }
  console.log("fix-92-contacts-content: applied")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
