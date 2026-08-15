import { NextResponse } from "next/server"
import { ensureDb, pingDb } from "@/lib/db/init"

export async function GET() {
  try {
    await ensureDb()
    await pingDb()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "healthcheck failed"
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
