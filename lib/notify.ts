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

/** Hard timeout for outbound notification calls — a hung API must never stall the app. */
const NOTIFY_TIMEOUT_MS = 5_000

/** Notification channel config: admin settings (DB) override env vars. */
export type NotifyChannelConfig = {
  emailEnabled: boolean
  emailTo: string[]
  emailFrom: string
  telegramEnabled: boolean
  telegramChatId: string
}

function parseEmailList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
}

async function loadNotifyConfig(): Promise<NotifyChannelConfig> {
  let settings: Record<string, string> = {}
  try {
    const { getSettings } = await import("@/lib/cms")
    settings = await getSettings()
  } catch (err) {
    console.error("[notify] settings load failed, falling back to env:", (err as Error).message)
  }
  const emailToSetting = parseEmailList(settings["notify.emailTo"] ?? "")
  const emailToEnv = parseEmailList(process.env.LEAD_EMAIL_TO ?? "")
  return {
    emailEnabled: (settings["notify.emailEnabled"] ?? "true") !== "false",
    emailTo: emailToSetting.length ? emailToSetting : emailToEnv.length ? emailToEnv : ["info@bastur.by"],
    emailFrom:
      settings["notify.emailFrom"]?.trim() || process.env.LEAD_EMAIL_FROM || "БасТур <onboarding@resend.dev>",
    telegramEnabled: (settings["notify.telegramEnabled"] ?? "true") !== "false",
    telegramChatId: settings["notify.telegramChatId"]?.trim() || process.env.TELEGRAM_CHAT_ID || "",
  }
}

async function sendEmail(data: LeadData, lines: string[], config: NotifyChannelConfig) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !config.emailEnabled || config.emailTo.length === 0) return
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.emailFrom,
        to: config.emailTo,
        subject: `${typeLabel(data.type)} — БасТур`,
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
    })
  } catch (err) {
    console.error("[notify] lead email notify failed:", (err as Error).message)
  }
}

async function sendTelegram(lines: string[], config: NotifyChannelConfig) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = config.telegramChatId
  if (!token || !chatId || !config.telegramEnabled) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🔔 Новая заявка с сайта БасТур\n\n" + lines.join("\n"),
      }),
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
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
  const config = await loadNotifyConfig()
  await Promise.allSettled([sendEmail(data, lines, config), sendTelegram(lines, config)])
}
