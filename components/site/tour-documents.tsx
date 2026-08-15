import { FileText, Download } from "lucide-react"
import type { TourDocument } from "@/lib/types"

export function TourDocuments({ documents }: { documents: TourDocument[] }) {
  const valid = documents.filter((d) => d.title?.trim() || d.href?.trim())
  if (!valid.length) return null

  return (
    <ul className="space-y-3">
      {valid.map((doc, i) => (
        <li key={doc.href || `${doc.title}-${i}`} className="flex items-center gap-4 rounded-lg border border-line p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-cream text-price">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex-1 text-sm font-medium text-ink">{doc.title || "Документ"}</span>
          <a
            href={doc.href || "#"}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cyan-accent transition-colors hover:text-cyan-dark"
          >
            <Download className="h-4 w-4" aria-hidden />
            {doc.size ? `Скачать: ${doc.size}` : "Скачать"}
          </a>
        </li>
      ))}
    </ul>
  )
}
