import { PageHeader } from "@/components/admin/ui"
import { MediaExplorer } from "@/components/admin/media-explorer"

export default function AdminMediaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Сайт Медиа" description="Изображения, видео и документы для страниц сайта" />
      <MediaExplorer />
    </div>
  )
}
