import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center gap-6 px-4 py-24 text-center md:px-6">
      <p className="text-7xl font-bold text-brand">404</p>
      <h1 className="text-2xl font-semibold text-ink md:text-3xl">Страница не найдена</h1>
      <p className="max-w-md text-base text-ink-muted">
        Возможно, страница была удалена или вы перешли по неверной ссылке. Вернитесь на главную или
        выберите тур из каталога.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded bg-brand px-6 py-3 text-base font-medium text-brand-foreground transition-colors hover:bg-brand-dark"
        >
          На главную
        </Link>
        <Link
          href="/tours/all"
          className="rounded border border-line px-6 py-3 text-base font-medium text-ink transition-colors hover:bg-cream"
        >
          Все туры
        </Link>
      </div>
    </main>
  )
}
