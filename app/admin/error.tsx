"use client"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-ink">Ошибка в панели управления</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {error.message || "Произошла непредвиденная ошибка."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-dark"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
