import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { mediaService } from "@/lib/media-service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const ok = await requireAdmin().catch(() => null)
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const sortRaw = url.searchParams.get("sort")
  const sort =
    sortRaw === "createdAt:asc" || sortRaw === "createdAt:desc" ? sortRaw : undefined
  const items = await mediaService.getAllMedia({
    type: url.searchParams.get("type") || undefined,
    search: url.searchParams.get("search") || undefined,
    sort,
    folder: url.searchParams.get("folder") || undefined,
  })
  return NextResponse.json(items)
}
