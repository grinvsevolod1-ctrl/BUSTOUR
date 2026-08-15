import { NextResponse } from "next/server"
import { ensureDb, pingDb } from "@/lib/db/init"

export async function GET() {
  try {
    await ensureDb()
    await pingDb()
    return NextResponse.json({ ok: true })
  } catch (error) {
    // Log details server-side only — DB error messages can leak host/user info.
    console.error("[health] check failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
