import { redirect } from "next/navigation"
import { PageHeader } from "@/components/admin/ui"
import { ShortcodeManager } from "@/components/admin/shortcode-manager"
import { requireCapability } from "@/lib/auth"
import { listShortcodes } from "@/lib/shortcodes"

export default async function AdminShortcodesPage() {
  try {
    await requireCapability("manage_settings")
  } catch {
    redirect("/admin?error=forbidden")
  }

  const items = await listShortcodes()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Шорткоды"
        description="Глобальные переменные: в тексте пишите [Имя], на сайте подставится значение"
      />
      <ShortcodeManager items={items} />
    </div>
  )
}
