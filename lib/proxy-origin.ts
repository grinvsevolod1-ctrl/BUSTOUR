/**
 * Хелперы для работы с origin за reverse-proxy (nginx на проде).
 *
 * За прокси Next standalone нормализует `request.nextUrl` в
 * `https://localhost:3000`: схема берётся из X-Forwarded-Proto, хост —
 * локальный. Из-за этого:
 * - fetch/rewrite на `nextUrl.origin` заставляет Next говорить TLS
 *   со своим же plain-HTTP портом → EPROTO и 500;
 * - redirect на `nextUrl.origin` отдаёт клиенту Location с localhost.
 *
 * Правило: внутрь процесса ходим через INTERNAL_ORIGIN, наружу (Location,
 * canonical, ссылки) — через publicOrigin() из форвард-заголовков.
 */

/** Loopback-origin текущего Node-процесса (plain HTTP). */
export const INTERNAL_ORIGIN = `http://127.0.0.1:${process.env.PORT || 3000}`

/**
 * Публичный origin запроса, восстановленный из заголовков прокси
 * (nginx выставляет Host и X-Forwarded-Proto).
 */
export function publicOrigin(headers: Headers, fallbackHost: string): string {
  const host = headers.get("host") ?? fallbackHost
  const proto = headers.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}
