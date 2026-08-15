"use client"

import { useState } from "react"
import { ModalBusOrder } from "@/components/site/modals"

export function BusOrderButton({ busTitle, phone }: { busTitle: string; phone: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [phoneVisible, setPhoneVisible] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-12 items-center justify-center rounded bg-brand px-6 text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
        >
          Заказать автобус
        </button>
        {phone ? (
          <div className="flex flex-col items-end text-right">
            <span className="text-sm text-ink-muted">Или по телефону</span>
            {phoneVisible ? (
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-xl font-semibold text-ink hover:underline">
                {phone}
              </a>
            ) : (
              <span className="text-xl font-semibold text-ink">{phone.replace(/\d/g, "•")}</span>
            )}
            {!phoneVisible ? (
              <button
                type="button"
                onClick={() => setPhoneVisible(true)}
                className="text-sm text-cyan-accent underline underline-offset-2 hover:text-cyan-dark"
              >
                Показать
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ModalBusOrder open={isOpen} onClose={() => setIsOpen(false)} busTitle={busTitle} />
    </>
  )
}
