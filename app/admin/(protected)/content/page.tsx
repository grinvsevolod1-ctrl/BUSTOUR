import { ArrowUpRight, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { contentHubCollections } from "@/lib/admin-config"
import { getBlocks } from "@/lib/cms"
import { Card, PageHeader } from "@/components/admin/ui"
import { requireCapability } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function ContentHubPage() {
  try {
    await requireCapability("manage_content")
  } catch {
    redirect("/admin?error=forbidden")
  }
  const counts = await Promise.all(
    contentHubCollections.map(async (c) => {
      const blocks = await getBlocks(c.key)
      return {
        ...c,
        total: blocks.length,
        hidden: blocks.filter((b) => !b.visible).length,
      }
    }),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Контент сайта"
        description="Управляйте блоками, которые отображаются на страницах сайта."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map((c) => (
          <Link key={c.key} href={`/admin/content/${c.key}`}>
            <Card className="group h-full p-5 transition-colors hover:border-admin-ring">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-admin-fg">{c.label}</h3>
                <ArrowUpRight className="h-4 w-4 text-admin-fg-subtle transition-colors group-hover:text-admin-fg" />
              </div>
              <p className="mt-1 text-sm text-admin-fg-muted">{c.description}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-admin-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {c.total - c.hidden} видно
                </span>
                {c.hidden > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="h-3.5 w-3.5" /> {c.hidden} скрыто
                  </span>
                ) : null}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
