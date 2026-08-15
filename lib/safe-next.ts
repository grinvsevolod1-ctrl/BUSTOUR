/** Allow only same-origin relative paths for post-login redirects. */
export function safeInternalNext(next: string | null | undefined): string | null {
  if (!next) return null
  const value = next.trim()
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}
