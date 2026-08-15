"use client"

import Link from "next/link"

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto grid min-h-[50vh] w-full max-w-[1440px] place-items-center px-4 py-16">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-ink">Что-то пошло не так</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Произошла ошибка при загрузке страницы. Попробуйте обновить или вернуться на главную.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded bg-brand px-5 py-3 text-base font-medium text-brand-foreground transition-colors hover:bg-brand-dark"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="rounded border border-line px-5 py-3 text-base text-ink transition-colors hover:bg-cream"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  )
}
