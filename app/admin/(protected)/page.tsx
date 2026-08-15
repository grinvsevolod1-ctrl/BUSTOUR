import { Map, Inbox, Star, Newspaper, ArrowUpRight, Plus } from "lucide-react"
import { getStats, getLeads } from "@/lib/queries"
import { Card, CardHeader, CardTitle, CardBody, Badge, ButtonLink, PageHeader, EmptyState } from "@/components/admin/ui"

const statusTone: Record<string, "blue" | "amber" | "green"> = {
  new: "blue",
  in_progress: "amber",
  done: "green",
}
const statusLabels: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Завершена",
}

export default async function AdminDashboard() {
  const [stats, leads] = await Promise.all([getStats(), getLeads()])
  const recentLeads = leads.slice(0, 6)

  const cards = [
    { label: "Туры", value: stats.tours, icon: Map, href: "/admin/tours" },
    { label: "Заявки", value: stats.leads, icon: Inbox, href: "/admin/leads", badge: stats.newLeads },
    { label: "Отзывы", value: stats.reviews, icon: Star, href: "/admin/reviews" },
    { label: "Статьи", value: stats.articles, icon: Newspaper, href: "/admin/articles" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Дашборд" description="Обзор контента и заявок вашего сайта.">
        <ButtonLink href="/admin/tours/new" size="sm">
          <Plus className="h-4 w-4" /> Новый тур
        </ButtonLink>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <ButtonLink
              key={card.label}
              href={card.href}
              variant="secondary"
              className="group h-auto flex-col items-start gap-0 p-5 text-left hover:border-admin-ring"
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-admin-muted text-admin-fg">
                  <Icon className="h-4 w-4" />
                </span>
                {card.badge ? <Badge tone="blue">+{card.badge} новых</Badge> : (
                  <ArrowUpRight className="h-4 w-4 text-admin-fg-subtle transition-colors group-hover:text-admin-fg" />
                )}
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-admin-fg">{card.value}</div>
              <div className="text-sm text-admin-fg-muted">{card.label}</div>
            </ButtonLink>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Последние заявки</CardTitle>
          <ButtonLink href="/admin/leads" variant="ghost" size="sm">
            Все заявки <ArrowUpRight className="h-4 w-4" />
          </ButtonLink>
        </CardHeader>
        {recentLeads.length === 0 ? (
          <CardBody>
            <EmptyState title="Заявок пока нет" description="Новые заявки с форм сайта появятся здесь." />
          </CardBody>
        ) : (
          <ul className="divide-y divide-admin-border">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-admin-fg">{lead.name}</div>
                  <div className="truncate text-sm text-admin-fg-muted">
                    {lead.phone}
                    {lead.tour ? ` · ${lead.tour}` : ""}
                  </div>
                </div>
                <Badge tone={statusTone[lead.status] || "neutral"}>
                  {statusLabels[lead.status] || lead.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
