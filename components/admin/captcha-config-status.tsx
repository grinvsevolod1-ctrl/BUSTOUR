"use client"

import { useState } from "react"
import type { CaptchaWiringStatus } from "@/lib/recaptcha"
import { Button } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

function bypassReasonCopy(r?: CaptchaWiringStatus["bypassReason"]): string {
  switch (r) {
    case "deploy-local":
      return "локальная разработка (BASTUR_DEPLOY_ENV=local / NODE_ENV≠production)"
    case "deploy-dev":
      return "dev-стенд (BASTUR_DEPLOY_ENV=dev)"
    case "env-bypass":
      return "задана переменная BYPASS_RECAPTCHA=1"
    default:
      return "—"
  }
}

export function CaptchaConfigStatusButton({ wiring }: { wiring: CaptchaWiringStatus }) {
  const [open, setOpen] = useState(false)
  const connected = wiring.siteKeySet && wiring.secretSet && !wiring.bypassed

  return (
    <div className="mt-2 space-y-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? "Скрыть статус настройки" : "Статус настройки капчи"}
      </Button>
      {open ? (
        <ul
          className={cn(
            "rounded-md border px-3 py-2 text-xs leading-5",
            wiring.bypassed
              ? "border-sky-200 bg-sky-50 text-sky-900"
              : connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-950",
          )}
          aria-live="polite"
        >
          <li>
            Site key (<code className="text-[11px]">NEXT_PUBLIC_RECAPTCHA_SITE_KEY</code>):{" "}
            {wiring.siteKeySet ? "задан" : "не задан"}
          </li>
          <li>
            Secret (<code className="text-[11px]">RECAPTCHA_SECRET_KEY</code>):{" "}
            {wiring.secretSet ? "задан" : "не задан"}
          </li>
          <li>
            Обход капчи (<code className="text-[11px]">bypassed</code>):{" "}
            <strong>{wiring.bypassed ? "ДА — проверка отключена" : "нет"}</strong>
          </li>
          {wiring.bypassed ? (
            <li className="mt-1">
              Причина обхода: <code className="text-[11px]">{bypassReasonCopy(wiring.bypassReason)}</code>
            </li>
          ) : null}
          <li className="mt-1 font-medium">
            {wiring.bypassed
              ? "Капча пропускается — формы можно тестировать без Google siteverify."
              : connected
                ? "Капча подключена — формы проверяют токен."
                : "Капча не подключена — проверка в модалках отключена."}
          </li>
        </ul>
      ) : null}
    </div>
  )
}
