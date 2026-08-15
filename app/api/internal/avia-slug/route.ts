import { NextResponse } from "next/server"
import { client } from "@/lib/db"
import { DEFAULT_AVIA_SLUG, resolveAviaSlug } from "@/lib/avia-slug"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Internal endpoint used by the middleware to resolve the configurable
 * avia-section slug without opening its own Postgres connection.
 * The middleware caches the response in memory (60s TTL), so this route
 * is hit at most ~once a minute per instance.
 */
export async function GET() {
  try {
    const result = await client.execute({
      sql: "SELECT value FROM settings WHERE key = 'aviatory.slug' LIMIT 1",
      args: [],
    })
    const value = result.rows[0]?.value
    const slug = resolveAviaSlug(typeof value === "string" ? value : undefined)
    return NextResponse.json(
      { slug },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    )
  } catch {
    return NextResponse.json({ slug: DEFAULT_AVIA_SLUG })
  }
}
