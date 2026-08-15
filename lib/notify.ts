import { createHash } from "node:crypto"
import type { LeadType } from "@/lib/types"

export type LeadData = {
  name: string
  phone: string
  email?: string | null
  message?: string | null
  tour?: string | null
  type: LeadType
}

function typeLabel(type: LeadType) {
  if (type === "booking") return "Бронирование тура"
  if (type === "callback") return "Заказ звонка"
  if (type === "rentbus") return "Аренда автобуса"
  return "Обращение с сайта"
}

/** SHA-256 hex 12 chars — deterministic correlation tag without exposing PII. */
export function phoneCorrelationTag(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, "")
  const hash = createHash("sha256").update(clean, "utf8").digest("hex")
  return hash.slice(0, 12)
}

function buildLines(data: LeadData): string[] {
  return [
    `Тип заявки: ${typeLabel(data.type)}`,
    `Имя: ${data.name}`,
    `Телефон: ${data.phone}`,
    data.email ? `E-mail: ${data.email}` : "",
    data.tour ? `Тур: ${data.tour}` : "",
    data.message ? `Сообщение: ${data.message}` : "",
  ].filter(Boolean) as string[]
}

async function sendEmail(data: LeadData, lines: string[]) {
  void data
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const to = process.env.LEAD_EMAIL_TO || "info@bastur.by"
  const from = process.env.LEAD_EMAIL_FROM || "БасТур <onboarding@resend.dev>"
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `${typeLabel(data.type)} — БасТур`, text: lines.join("\n") }),
    })
  } catch (err) {
    console.error("[notify] lead email notify failed:", (err as Error).message)
  }
}

async function sendTelegram(lines: string[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🔔 Новая заявка с сайта БасТур\n\n" + lines.join("\n"),
      }),
    })
  } catch (err) {
    console.error("[notify] lead telegram notify failed:", (err as Error).message)
  }
}

export function buildSafeMeta(data: LeadData) {
  const correlationId = phoneCorrelationTag(data.phone)
  return {
    type: data.type,
    hasName: Boolean(data.name?.trim()),
    hasEmail: Boolean(data.email?.trim()),
    hasMessage: Boolean(data.message?.trim()),
    hasTour: Boolean(data.tour?.trim()),
    correlationId,
  }
}

// Notifies via all configured channels. Never throws — delivery is best-effort.
export async function notifyLead(data: LeadData) {
  const meta = buildSafeMeta(data)
  console.info(
    "[notify] lead type=%s name=%s email=%s msg=%s tour=%s cid=%s status=pending",
    meta.type,
    meta.hasName,
    meta.hasEmail,
    meta.hasMessage,
    meta.hasTour,
    meta.correlationId,
  )
  const lines = buildLines(data)
  await Promise.allSettled([sendEmail(data, lines), sendTelegram(lines)])
}
