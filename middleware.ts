import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, hasValidAdminSessionToken } from "@/lib/admin-session"
import { PREVIEW_QUERY, verifyPreviewToken } from "@/lib/preview-token"
import { DEFAULT_AVIA_SLUG } from "@/lib/avia-slug"

export const runtime = "nodejs"

/**
 * The middleware never talks to Postgres directly — it would open a
 * dedicated connection per instance just for one settings row. Instead
 * it asks a lightweight internal route (which uses the app's shared DB
 * client) and caches the result in memory.
 */
let cachedAviaSlug: string | null = null
let cacheTs = 0
const CACHE_TTL_MS = 60_000 // 1 minute

/**
 * Internal (loopback) origin of this very Node process.
 *
 * Behind nginx `request.nextUrl.origin` becomes `https://localhost:3000`
 * (scheme from X-Forwarded-Proto, host normalized by Next standalone) —
 * fetching or rewriting to it makes Next talk TLS to its own plain-HTTP
 * port and every request 500s with EPROTO. Loopback over http avoids that.
 */
const INTERNAL_ORIGIN = `http://127.0.0.1:${process.env.PORT || 3000}`

async function getAviaSlug(): Promise<string> {
  const now = Date.now()
  if (cachedAviaSlug !== null && now - cacheTs < CACHE_TTL_MS) {
    return cachedAviaSlug
  }

  try {
    const res = await fetch(`${INTERNAL_ORIGIN}/api/internal/avia-slug`, {
      signal: AbortSignal.timeout(2_000),
    })
    if (!res.ok) throw new Error(`avia-slug route responded ${res.status}`)
    const data = (await res.json()) as { slug?: string }
    const slug = typeof data.slug === "string" && data.slug ? data.slug : DEFAULT_AVIA_SLUG
    cachedAviaSlug = slug
    cacheTs = now
    return slug
  } catch {
    // On failure serve the stale value if we ever had one, else the default.
    return cachedAviaSlug ?? DEFAULT_AVIA_SLUG
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

  // 1. Requests to /{aviaSlug}... → rewrite to /aviatory/...
  if (pathname === `/${aviaSlug}` || pathname.startsWith(`/${aviaSlug}/`)) {
    const rewritten = pathname.replace(`/${aviaSlug}`, "/aviatory")
    // ВАЖНО: rewrite строго на том же origin запроса (nextUrl.clone) —
    // тогда Next обрабатывает его внутренне, без нового HTTP-запроса.
    // Rewrite на 127.0.0.1 превращается в self-proxy: запрос снова проходит
    // через middleware уже с /aviatory и ветка 2 отвечает 301 → бесконечный
    // цикл редиректов /aviatury → /aviatury.
    const url = request.nextUrl.clone()
    url.pathname = rewritten || "/aviatory/"
    return NextResponse.rewrite(url)
  }

  // 2. Requests to /aviatory/... → 301 redirect to /{aviaSlug}/...
  if (pathname === "/aviatory" || pathname.startsWith("/aviatory/")) {
    const redirected = pathname.replace("/aviatory", `/${aviaSlug}`)
    // The Location header must carry the PUBLIC origin. nextUrl.origin is
    // normalized to localhost behind a proxy, so rebuild it from the
    // forwarded headers (nginx sets Host + X-Forwarded-Proto).
    const host = request.headers.get("host") ?? request.nextUrl.host
    const proto = request.headers.get("x-forwarded-proto") ?? "https"
    const url = new URL(redirected || `/${aviaSlug}/`, `${proto}://${host}`)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match /aviatory/... and /{any-slug}/... but skip Next.js internals, static
    // files and runtime uploads (images/videos don't need the avia-slug DB lookup).
    "/((?!_next/static|_next/image|favicon|api/|admin|uploads/).*)",
  ],
}
