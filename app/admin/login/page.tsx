import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth"
import { safeInternalNext } from "@/lib/safe-next"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Вход — Админ БасТур",
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) ?? {}
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next
  const next = safeInternalNext(nextRaw)

  const admin = await getAdmin()
  if (admin) redirect(next || "/admin")

  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-bg px-4">
      <LoginForm next={next} />
    </main>
  )
}
