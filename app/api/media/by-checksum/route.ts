import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { isSha256Hex } from "@/lib/media/checksum"
import { mediaService } from "@/lib/media/service"

export const runtime = "nodejs"

/** Lookup library file by SHA-256 hex (pre-upload duplicate check). */
export async function GET(request: Request) {
  const ok = await requireAdmin().catch(() => null)
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const checksum = new URL(request.url).searchParams.get("checksum")?.trim() ?? ""
  if (!isSha256Hex(checksum)) {
    return NextResponse.json({ error: "Нужен checksum SHA-256 (64 hex)." }, { status: 400 })
  }

  const existing = await mediaService.findByChecksum(checksum.toLowerCase())
  return NextResponse.json({ existing })
}
