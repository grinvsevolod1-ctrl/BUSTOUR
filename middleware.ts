import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, hasValidAdminSessionToken } from "@/lib/admin-session"
import { PREVIEW_QUERY, verifyPreviewToken } from "@/lib/preview-token"
import { DEFAULT_AVIA_SLUG } from "@/lib/avia-slug"
import { INTERNAL_ORIGIN, publicOrigin } from "@/lib/proxy-origin"

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

/**
 * Marks the self-proxied avia rewrite so the second middleware pass
 * (Next standalone proxies the rewrite as a real HTTP request behind
 * nginx) serves /aviatory directly instead of 301-ing back — otherwise
 * /aviatury → /aviatury loops forever.
 */
const AVIA_REWRITE_HEADER = "x-bastur-avia-rewrite"

export async function middleware(request: NextRequest) {
  const previewGate = gatePreviewQuery(request)
  if (previewGate) return previewGate

  const { pathname } = request.nextUrl

  // Second pass of a self-proxied avia rewrite: serve /aviatory as-is.
  if (request.headers.get(AVIA_REWRITE_HEADER) === "1") {
    return NextResponse.next()
  }

  const aviaSlug = await getAviaSlug()

  // 1. Requests to /{aviaSlug}... → rewrite to /aviatory/...
  if (pathname === `/${aviaSlug}` || pathname.startsWith(`/${aviaSlug}/`)) {
    const rewritten = pathname.replace(`/${aviaSlug}`, "/aviatory")
    // Rewrite на loopback по HTTP: за nginx nextUrl нормализуется в
    // https://localhost:3000, и same-origin rewrite всё равно проксируется
    // самому себе по TLS на HTTP-порт (EPROTO → 500). Заголовок-маркер
    // прерывает петлю на втором проходе middleware.
    const url = new URL(rewritten || "/aviatory/", INTERNAL_ORIGIN)
    url.search = request.nextUrl.search
    const headers = new Headers(request.headers)
    headers.set(AVIA_REWRITE_HEADER, "1")
    return NextResponse.rewrite(url, { request: { headers } })
  }

  // 2. Requests to /aviatory/... → 301 redirect to /{aviaSlug}/...
  if (pathname === "/aviatory" || pathname.startsWith("/aviatory/")) {
    const redirected = pathname.replace("/aviatory", `/${aviaSlug}`)
    // Location должен нести ПУБЛИЧНЫЙ origin (nextUrl.origin за прокси —
    // localhost), поэтому восстанавливаем его из форвард-заголовков.
    const url = new URL(redirected || `/${aviaSlug}/`, publicOrigin(request.headers, request.nextUrl.host))
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
