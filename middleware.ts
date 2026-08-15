import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, hasValidAdminSessionToken } from "@/lib/admin-session"
import { PREVIEW_QUERY, verifyPreviewToken } from "@/lib/preview-token"
import { DEFAULT_AVIA_SLUG, resolveAviaSlug } from "@/lib/avia-slug"
import { client } from "@/lib/db"

export const runtime = "nodejs"

/** Read aviatory.slug once per cold-start, cache in memory. */
let cachedAviaSlug: string | null = null
let cacheTs = 0
const CACHE_TTL_MS = 60_000 // 1 minute

async function getAviaSlug(): Promise<string> {
  const now = Date.now()
  if (cachedAviaSlug !== null && now - cacheTs < CACHE_TTL_MS) {
    return cachedAviaSlug
  }

  try {
    const result = await client.execute({
      sql: "SELECT value FROM settings WHERE key = 'aviatory.slug' LIMIT 1",
      args: [],
    })
    const value = result.rows[0]?.value
    const slug = resolveAviaSlug(typeof value === "string" ? value : undefined)
    cachedAviaSlug = slug
    cacheTs = now
    return slug
  } catch {
    return DEFAULT_AVIA_SLUG
  }
}

function gatePreviewQuery(request: NextRequest): NextResponse | null {
  const token = request.nextUrl.searchParams.get(PREVIEW_QUERY)
  if (!token) return null

  if (!verifyPreviewToken(token)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  if (!hasValidAdminSessionToken(session)) {
    const login = new URL("/admin/login", request.url)
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }

  return null
}

export async function middleware(request: NextRequest) {
  const previewGate = gatePreviewQuery(request)
  if (previewGate) return previewGate

  const { pathname } = request.nextUrl
  const aviaSlug = await getAviaSlug()

  // Nothing to do if slug is the default internal folder name
  if (aviaSlug === "aviatory") return NextResponse.next()

  // 1. Requests to /{aviaSlug}... → rewrite to /aviatory/...
  if (pathname === `/${aviaSlug}` || pathname.startsWith(`/${aviaSlug}/`)) {
    const rewritten = pathname.replace(`/${aviaSlug}`, "/aviatory")
    const url = request.nextUrl.clone()
    url.pathname = rewritten || "/aviatory/"
    return NextResponse.rewrite(url)
  }

  // 2. Requests to /aviatory/... → 301 redirect to /{aviaSlug}/...
  if (pathname === "/aviatory" || pathname.startsWith("/aviatory/")) {
    const redirected = pathname.replace("/aviatory", `/${aviaSlug}`)
    const url = request.nextUrl.clone()
    url.pathname = redirected || `/${aviaSlug}/`
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match /aviatory/... and /{any-slug}/... but skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon|api/|admin).*)",
  ],
}
