export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-8 md:px-6">
      <div className="h-4 w-56 animate-pulse rounded bg-line" />
      <div className="h-8 w-80 animate-pulse rounded bg-line" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-80 animate-pulse rounded bg-line/60" />
          <div className="h-40 animate-pulse rounded bg-cream" />
        </div>
        <div className="h-96 animate-pulse rounded bg-cream" />
      </div>
    </main>
  )
}
