"use client"

import { useEffect, useRef, useState } from "react"
import { Wand2 } from "lucide-react"
import { slugify } from "@/lib/slug"
import { Button, Input, Label } from "@/components/admin/ui"

type SlugFieldProps = {
  defaultValue?: string
  nameSourceId: string
  autoFromName?: boolean
  id?: string
  placeholder?: string
  form?: string
}

/** Native input/textarea, or ShortcodeInput hidden (`${id}__value` / sibling). */
export function resolveSlugNameSource(nameSourceId: string): HTMLInputElement | HTMLTextAreaElement | null {
  const direct = document.getElementById(nameSourceId)
  if (direct instanceof HTMLInputElement || direct instanceof HTMLTextAreaElement) return direct

  const byValueId = document.getElementById(`${nameSourceId}__value`)
  if (byValueId instanceof HTMLInputElement) return byValueId

  if (direct) {
    const hidden = direct.closest(".shortcode-input")?.querySelector('input[type="hidden"]')
    if (hidden instanceof HTMLInputElement) return hidden
  }
  return null
}

export function SlugField({
  defaultValue = "",
  nameSourceId,
  autoFromName = false,
  id = "slug",
  placeholder,
  form,
}: SlugFieldProps) {
  const [slug, setSlug] = useState(defaultValue)
  const touchedRef = useRef(false)

  useEffect(() => {
    if (!autoFromName) return

    let nameInput: HTMLInputElement | HTMLTextAreaElement | null = null
    let retries = 0
    let detach: (() => void) | undefined

    const attach = () => {
      nameInput = resolveSlugNameSource(nameSourceId)
      if (!nameInput) {
        // TipTap mounts after first paint
        if (retries++ < 40) {
          const t = window.setTimeout(attach, 50)
          detach = () => window.clearTimeout(t)
        }
        return
      }
      const handleNameInput = () => {
        if (!touchedRef.current && nameInput) setSlug(slugify(nameInput.value))
      }
      nameInput.addEventListener("input", handleNameInput)
      detach = () => nameInput?.removeEventListener("input", handleNameInput)
    }
    attach()
    return () => detach?.()
  }, [autoFromName, nameSourceId])

  const generate = () => {
    const nameInput = resolveSlugNameSource(nameSourceId)
    if (nameInput) setSlug(slugify(nameInput.value))
  }

  return (
    <div>
      <Label htmlFor={id} required>Slug (URL)</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          name="slug"
          form={form}
          value={slug}
          onChange={(event) => {
            touchedRef.current = true
            setSlug(event.target.value)
          }}
          required
          maxLength={120}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" size="sm" onClick={generate} title="Сгенерировать slug">
          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Сгенерировать</span>
        </Button>
      </div>
    </div>
  )
}
