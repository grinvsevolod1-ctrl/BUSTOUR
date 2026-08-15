import { getCurrencies, getMarkupPercent } from "@/lib/currencies-server"
import { PageHeader } from "@/components/admin/ui"
import { CurrencyManager } from "@/components/admin/currency-manager"
import { requireCapability } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminCurrenciesPage() {
  try {
    await requireCapability("manage_currencies")
  } catch {
    redirect("/admin?error=forbidden")
  }
  const [currencies, markupPercent] = await Promise.all([getCurrencies(), getMarkupPercent()])

  return (
    <div className="space-y-6">
      <PageHeader title="Валюты" description="Базовая валюта и курсы для пересчёта цен на сайте" />
      <CurrencyManager currencies={currencies} markupPercent={markupPercent} />
    </div>
  )
}
