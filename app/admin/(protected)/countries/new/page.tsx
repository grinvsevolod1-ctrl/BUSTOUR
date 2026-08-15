import { CountryForm } from "@/components/admin/country-form"

const categoryLabels: Record<string, string> = {
  bus: "Автобусные туры",
  avia: "Авиатуры",
  hot: "Горящие туры",
}

export default async function NewCountryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory = category === "avia" ? "avia" : category === "hot" ? "hot" : "bus"

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Новая страна — {categoryLabels[activeCategory]}</h1>
      <p className="text-sm text-admin-fg-muted">
        После создания страны вы сможете заполнить шапку, SEO и FAQ.
      </p>
      <CountryForm category={activeCategory} />
    </div>
  )
}
