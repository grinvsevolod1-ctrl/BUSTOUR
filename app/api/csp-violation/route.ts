import { NextResponse } from "next/server"
import { clientIpFromHeaders, consumeRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * Collector for CSP violation reports (`report-uri` / `Report-To` in next.config).
 * Раньше директива указывала сюда, а роута не было — браузеры получали 404.
 * Логируем компактно, с rate-limit, чтобы отчётами нельзя было зафлудить логи.
 */
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers)
  // Max 20 reports/minute per IP — enough for real debugging, blocks log flooding.
  if (!consumeRateLimit("csp-report", ip, 20, 60_000).ok) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const text = await request.text()
    if (text.length > 16_384) return new NextResponse(null, { status: 204 })
    const body = JSON.parse(text) as Record<string, unknown>
    // Supports both legacy `{"csp-report": {...}}` and Reporting API `[{...}]` shapes.
    const report = (body["csp-report"] ?? body) as Record<string, unknown>
    console.warn(
      "[csp] violation: blocked=%s directive=%s document=%s",
      String(report["blocked-uri"] ?? report["blockedURL"] ?? "?").slice(0, 200),
      String(report["violated-directive"] ?? report["effectiveDirective"] ?? "?").slice(0, 100),
      String(report["document-uri"] ?? report["documentURL"] ?? "?").slice(0, 200),
    )
  } catch {
    // Malformed report — ignore silently.
  }

  return new NextResponse(null, { status: 204 })
}
