"use client"

import { InfoTabsContent, type InfoTab } from "@/components/site/info-tabs-content"

export type DictionaryEntry = {
  id: string
  label: string
  heading: string
  body: string
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function plainBodyToHtml(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")
}

/** Same chip tabs + panel as /info/memos (InfoTabsContent). */
export function DictionaryContent({ entries }: { entries: DictionaryEntry[] }) {
  const tabs: InfoTab[] = entries.map((e) => ({
    id: e.id,
    label: e.label,
    heading: e.heading || e.label,
    bodyHtml: plainBodyToHtml(e.body),
  }))
  return <InfoTabsContent tabs={tabs} />
}
