import { redirect } from "next/navigation"

/** Next.js `redirect()` throws; must not be swallowed by try/catch. */
export function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  )
}

/** Run mutation then redirect; on failure redirect with `?error=` for AdminToaster. */
export async function mutateThenRedirect(
  work: () => Promise<void>,
  successUrl: string,
  errorUrl: string,
): Promise<never> {
  try {
    await work()
  } catch (err) {
    if (isRedirectError(err)) throw err
    const msg = err instanceof Error && err.message.trim() ? err.message : "Операция не удалась"
    const sep = errorUrl.includes("?") ? "&" : "?"
    redirect(`${errorUrl}${sep}error=${encodeURIComponent(msg)}`)
  }
  redirect(successUrl)
}
