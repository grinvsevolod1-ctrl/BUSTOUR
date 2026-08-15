export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 md:gap-6">
      <span className="hidden h-px flex-1 bg-line sm:block" aria-hidden />
      <h2 className="text-balance text-center text-xl font-semibold text-ink md:text-2xl">
        {children}
      </h2>
      <span className="hidden h-px flex-1 bg-line sm:block" aria-hidden />
    </div>
  )
}
